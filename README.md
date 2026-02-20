this project is writed as a school project, so if have bugs,security bugs, not standard coding , spelling and grammer wrong or need some options but don't have, becuase it's a project for school(only important thing is it works).

developer email:labybaz40@gmail.com


# BranchGuide

BranchGuide is an Express + EJS web app that helps users discover suitable majors based on a test and shows detailed major pages.

## Features

- Major detail page with introduction and related subfields
- Test flow that calculates category scores
- Redirect-based result flow:
  - `POST /test` computes normalized scores
  - redirects to `GET /test_ans` with scores in URL query params
- Suggested majors ranking based on weighted scores

## Tech Stack

- Node.js
- Express
- EJS

## Project Structure

```text
.
├─ index.js               # Express routes and app bootstrap
├─ files_work.js          # Data access and scoring helpers
├─ veiw/                  # EJS templates (kept with current folder name)
├─ datas/                 # JSON datasets used by the app
└─ test.js                # Local utility script
```

## Requirements

- Node.js 18+ (recommended)
- npm

## Installation

```bash
npm install
```

## Run

```bash
node index.js
```

Default port is `3003`. You can change it with:

```bash
PORT=4000 node index.js
```

PowerShell:

```powershell
$env:PORT=4000; node index.js
```

## Main Routes

- `GET /` Home page
- `GET /majors?place=<MajorName>` Major detail page
- `GET /test` Test page
- `POST /test` Score calculation + redirect to `test_ans`
- `GET /test_ans` Result page using query score values

## Data Files

The app relies on these JSON files in `datas/`:

- `subfield_datas.json`
- `test_datas.json`
- `majors_scores.json`

Do not remove or rename these files unless you also update paths in `files_work.js`.

## License

This project is licensed under the MIT License. See `LICENSE`.
