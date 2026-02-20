const path = require("path");
const fs = require("fs").promises;

const subfieldDataPath = path.join(__dirname, "datas", "subfield_datas.json");
const testDataPath = path.join(__dirname, "datas", "test_datas.json");
const majorsScoresPath = path.join(__dirname, "datas", "majors_scores.json");

/**
 * Loads a major by title and builds view-friendly data for `majors.ejs`.
 * @param {string} mainTitle
 * @returns {Promise<{
 *   title?: string,
 *   introduction?: string,
 *   topSubfield?: string | null,
 *   subfields?: Array<{title: string, shortIntroduction: string}>,
 *   success?: boolean,
 *   message?: string,
 *   error?: string
 * }>}
 */
async function getFieldInfo(mainTitle) {
  try {
    const rawSubfieldData = await fs.readFile(subfieldDataPath, "utf8");
    const parsedSubfieldData = JSON.parse(rawSubfieldData);

    const mainItem = parsedSubfieldData.find((item) => item.title === mainTitle);
    if (!mainItem) {
      return { success: false, message: `Title "${mainTitle}" was not found` };
    }

    let topSubfield = null;
    if (Array.isArray(mainItem.way2place) && mainItem.way2place.length > 0) {
      const wayPath = mainItem.way2place;
      // Prefer the parent step in path; if path has one item use the same item.
      topSubfield = wayPath.length >= 2 ? wayPath[wayPath.length - 2] : wayPath[0];
    }

    const subfieldsResult = [];

    if (Array.isArray(mainItem.subfields)) {
      for (const subTitle of mainItem.subfields) {
        const subItem = parsedSubfieldData.find((item) => item.title === subTitle);

        if (subItem) {
          subfieldsResult.push({
            title: subItem.title,
            shortIntroduction: subItem.shortIntroduction || ""
          });
        } else {
          subfieldsResult.push({
            title: subTitle,
            shortIntroduction: "(No information found)"
          });
        }
      }
    }

    return {
      title: mainItem.title,
      introduction: mainItem.introduction || "",
      topSubfield,
      subfields: subfieldsResult
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Error while reading or processing data file",
      error: error.message
    };
  }
}

/**
 * Reads and parses test definition file.
 * @returns {Promise<any>}
 */
const readTestData = async () => {
  const rawTestData = await fs.readFile(testDataPath);
  return JSON.parse(rawTestData);
};

/**
 * Calculates weighted scores for all majors based on user scores.
 * @param {Record<string, number>} userScores
 * @returns {Promise<Array<{major: string, score: number}>>}
 */
async function recommendMajors(userScores) {
  const majorWeights = JSON.parse(await fs.readFile(majorsScoresPath));
  const results = [];

  for (const major in majorWeights) {
    let score = 0;

    for (const metric in userScores) {
      const userValue = userScores[metric] || 0;
      const weightValue = majorWeights[major][metric] || 0;

      score += userValue * weightValue;
    }

    results.push({ major, score });
  }

  results.sort((firstResult, secondResult) => secondResult.score - firstResult.score);

  return results;
}

/**
 * Returns title/description pairs for the provided major titles.
 * @param {string[]} titles
 * @returns {Promise<Array<{title: string, description: string}>>}
 */
const getDescriptions = async (titles) => {
  const subfieldData = JSON.parse(await fs.readFile(subfieldDataPath));

  const descriptions = [];
  for (const title of titles) {
    for (const subfieldItem of subfieldData) {
      if (subfieldItem.title === title) {
        descriptions.push({ "title": subfieldItem.title, "description": subfieldItem.introduction });
        break;
      }
    }
  }

  return descriptions;
};

exports.getFieldInfo = getFieldInfo;
exports.readTestData = readTestData;
exports.recommendMajors = recommendMajors;
exports.getDescriptions = getDescriptions;
