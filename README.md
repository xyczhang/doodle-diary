# Doodle Diary

A daily journal where every entry has a hand-drawn cover, a mood, a story, and a gratitude note. An optional OpenAI feature turns one week of entries into a short, gentle reflection.

## Simple technology

- `templates/index.html` — visible page text and structure
- `app/globals.css` — colors, fonts, layout, and decoration
- `public/app.js` — drawing, searching, editing, saving, and deleting
- `app.py` — Python Flask server and journal API
- Render PostgreSQL — persistent journal storage when deployed
- OpenAI API — creates weekly reflections when the reader requests one

There is no React, Next.js, TypeScript, or Tailwind build process. GitHub stores the code, Render runs the Python website and database, and the OpenAI API creates the optional weekly reflection.

## Deploy using GitHub and Render

1. Upload the contents of this folder to a GitHub repository. `render.yaml` must be at the repository root.
2. In Render, choose **New → Blueprint**.
3. Connect the GitHub repository.
4. Keep the Blueprint path set to `render.yaml`.
5. Render asks for `OPENAI_API_KEY`. Paste an API key from your OpenAI Platform project. Never put the real key in GitHub or in `.env.example`.
6. Choose **Deploy Blueprint** or **Apply**.

Render creates the Flask web service, PostgreSQL database, and private database connection automatically.

The API is billed separately from a ChatGPT subscription. Set a project spending limit in the OpenAI Platform dashboard before sharing the site publicly. The model can be changed through Render’s `OPENAI_MODEL` environment variable; the default is `gpt-5.6-luna`.

## Run locally

Python 3.11 or newer is recommended.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY="your-real-key"
python app.py
```

Open `http://localhost:5000`. When `DATABASE_URL` is not set, the app automatically uses a local SQLite file named `journal.db`.

## Editing the website

- Change headings, labels, and instructions in `templates/index.html`.
- Change the appearance in `app/globals.css`.
- Change browser interactions in `public/app.js`.
- Change database or server behavior in `app.py`.

## Privacy model

Each browser receives a random journal ID stored in local browser storage. Visitors see only entries associated with their browser ID. There is no login provider, and entries do not automatically follow a user to another browser or device.

When someone clicks **Make my reflection**, the server sends only that week’s entry titles, writing, moods, and gratitude notes to OpenAI. Doodle data is excluded, the request uses `store=False`, and an unchanged weekly result is cached to avoid repeat API charges. Do not use the reflection as medical or mental-health advice.

## Font license

The bundled Little Doodle display font is based on DynaPuff and distributed under the SIL Open Font License. See `public/little-doodle-font-license.txt`.
