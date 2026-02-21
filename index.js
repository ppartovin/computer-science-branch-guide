const express = require("express");
const path = require("path");
const filesWork = require(path.join(__dirname, "files_work.js"));

const app = express();
app.use(express.urlencoded({ extended: true }));
const port = process.env.PORT || 3003;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "veiw"));

const SUPPORTED_LANGS = new Set(["en", "fa"]);

const i18n = {
  en: {
    errors: {
      generic: "something went wrong",
      invalidSubmission: "invalid test submission"
    },
    labels: {
      Analytical: "Analytical",
      Data: "Data",
      AI: "AI",
      SoftwareDev: "Software Development",
      Hardware: "Hardware",
      Security: "Security",
      Creative: "Creative"
    }
  },
  fa: {
    errors: {
      generic: "مشکلی پیش آمد",
      invalidSubmission: "ارسال پاسخ‌های آزمون نامعتبر است"
    },
    labels: {
      Analytical: "تحلیلی",
      Data: "داده",
      AI: "هوش مصنوعی",
      SoftwareDev: "توسعه نرم‌افزار",
      Hardware: "سخت‌افزار",
      Security: "امنیت",
      Creative: "خلاقیت"
    }
  }
};

function resolveLang(rawLang) {
  return SUPPORTED_LANGS.has(rawLang) ? rawLang : "en";
}

function appendLangToPath(pathname, query, lang) {
  const params = new URLSearchParams();
  if (query && typeof query === "object") {
    for (const key of Object.keys(query)) {
      if (key === "lang") {
        continue;
      }
      const value = query[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, String(item));
        }
      } else if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
  }
  params.set("lang", lang);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function setupLanguageLocals(req, res) {
  const lang = resolveLang(req.query.lang);
  res.locals.lang = lang;
  res.locals.switchToFaUrl = appendLangToPath(req.path, req.query, "fa");
  res.locals.switchToEnUrl = appendLangToPath(req.path, req.query, "en");
  return lang;
}

function renderByLang(res, lang, baseView, locals = {}) {
  const viewName = lang === "fa" ? `${baseView}_fa` : baseView;
  res.render(viewName, locals);
}

app.get("/", (req, res) => {
  const lang = setupLanguageLocals(req, res);
  renderByLang(res, lang, "index");
});

app.get("/majors", async (req, res) => {
  const lang = setupLanguageLocals(req, res);
  try {
    const title = req.query.place || (lang === "fa" ? "علوم کامپیوتر" : "Computer Science");
    const fieldData = await filesWork.getFieldInfo(title, lang);

    if (fieldData.success === false) {
      return res.status(404).render(lang === "fa" ? "majors_error_fa.ejs" : "majors_error.ejs", {
        title
      });
    }

    renderByLang(res, lang, "majors", { field: fieldData });
  } catch (err) {
    console.error("Majors route error:", err);
    res.status(500).render(lang === "fa" ? "majors_error_fa.ejs" : "majors_error.ejs", {
      title: req.query.place || (lang === "fa" ? "علوم کامپیوتر" : "Computer Science")
    });
  }
});

app.get("/test", async (req, res) => {
  const lang = setupLanguageLocals(req, res);
  try {
    const testData = await filesWork.readTestData();
    renderByLang(res, lang, "test", { test: testData });
  } catch (err) {
    console.error("Test page load error:", err);
    res.status(500).render(lang === "fa" ? "test_error_fa" : "test_error", {
      message: i18n[lang].errors.generic
    });
  }
});

app.post("/test", async (req, res) => {
  const lang = setupLanguageLocals(req, res);
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).render(lang === "fa" ? "test_error_fa" : "test_error", {
        message: i18n[lang].errors.invalidSubmission
      });
    }

    const scores = { "Analytical": 0, "Data": 0, "AI": 0, "SoftwareDev": 0, "Hardware": 0, "Security": 0, "Creative": 0 };
    const baseScores = { "Analytical": 820, "Data": 1000, "AI": 820, "SoftwareDev": 200, "Hardware": 260, "Security": 200, "Creative": 700 };
    const allowedTargets = new Set(Object.keys(scores));

    for (const answer of answers) {
      // Each answer stores encoded tuple: [targetCategory, scoreDelta].
      if (!answer || typeof answer.e !== "string") {
        continue;
      }

      let parsedAnswer;
      try {
        parsedAnswer = JSON.parse(answer.e);
      } catch {
        continue;
      }

      if (!Array.isArray(parsedAnswer) || parsedAnswer.length !== 2) {
        continue;
      }

      const target = parsedAnswer[0];
      const score = Number(parsedAnswer[1]);

      if (!allowedTargets.has(target) || !Number.isFinite(score)) {
        continue;
      }

      scores[target] += score;
    }

    for (const key of Object.keys(scores)) {
      // Convert raw score to percentage using per-category base values.
      scores[key] = Math.round(scores[key] / baseScores[key] * 100);
    }

    // Pass normalized scores to the result route through query string.
    const query = new URLSearchParams();
    for (const key of Object.keys(scores)) {
      query.append(key, scores[key].toString());
    }
    query.append("lang", lang);

    res.redirect(`/test_ans?${query.toString()}`);
  } catch (err) {
    console.error("Test processing error:", err);
    res.render(lang === "fa" ? "test_error_fa" : "test_error", {
      message: i18n[lang].errors.generic
    });
  }
});

app.get("/test_ans", async (req, res) => {
  const lang = setupLanguageLocals(req, res);
  try {
    const keys = ["Analytical", "Data", "AI", "SoftwareDev", "Hardware", "Security", "Creative"];
    const scores = {};

    // Rebuild scores from URL; fallback to 0 for invalid or missing values.
    for (const key of keys) {
      const value = Number(req.query[key]);
      scores[key] = Number.isFinite(value) ? value : 0;
    }

    const suggestedMajorsWithScores = await filesWork.recommendMajors(scores);

    const suggestedMajorTitles = [];
    // Show only top 15 ranked majors on the result page.
    for (let index = 0; index < 15 && index < suggestedMajorsWithScores.length; index++) {
      suggestedMajorTitles.push(suggestedMajorsWithScores[index].major);
    }

    const progressItems = [];
    for (const key of Object.keys(scores)) {
      progressItems.push({ "label": i18n[lang].labels[key] || key, "value": scores[key] });
    }

    const suggestedMajors = await filesWork.getDescriptions(suggestedMajorTitles, lang);

    renderByLang(res, lang, "test_ans", { progressItems, suggestedMajors });
  } catch (err) {
    console.error("Test result processing error:", err);
    res.render(lang === "fa" ? "test_error_fa" : "test_error", {
      message: i18n[lang].errors.generic
    });
  }
});

app.use((req, res) => {
  const lang = resolveLang(req.query.lang);
  if (lang === "fa") {
    return res.redirect("/?lang=fa");
  }
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
