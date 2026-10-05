# Doodle Diary

A daily journal where every entry has a hand-drawn cover, a mood, a story, and a gratitude note. Accounts keep entries available across browsers and devices, voice dictation can turn speech into journal text, and an optional OpenAI feature turns one week of entries into a short, gentle reflection.

## Simple technology

- `templates/index.html` — visible page text and structure
- `app/globals.css` — colors, fonts, layout, and decoration
- `public/app.js` — drawing, searching, voice dictation, editing, saving, and deleting
- `app.py` — Python Flask server and journal API
- Render PostgreSQL — persistent journal storage when deployed
- OpenAI API — creates weekly reflections when the reader requests one

There is no React, Next.js, TypeScript, or Tailwind build process. GitHub stores the code, Render runs the Python website and database, and the OpenAI API creates the optional weekly reflection.

The **Start dictating** button uses the browser’s built-in speech-recognition feature to place spoken words in the story field. It does not require another account, API key, Python package, or paid service. Browser support varies, and the person must allow microphone access when prompted.

## Deploy using GitHub and Render

1. Upload the contents of this folder to a GitHub repository. `render.yaml` must be at the repository root.
2. In Render, choose **New → Blueprint**.
3. Connect the GitHub repository.
4. Keep the Blueprint path set to `render.yaml`.
5. Render asks for `OPENAI_API_KEY`. Paste an API key from your OpenAI Platform project. Never put the real key in GitHub or in `.env.example`.
6. Choose **Deploy Blueprint** or **Apply**.

Render creates the Flask web service, PostgreSQL database, and private database connection automatically.

The Blueprint also creates a private `SECRET_KEY` for signed login cookies. Users create accounts directly on the website, so no separate authentication company or application is required.

The API is billed separately from a ChatGPT subscription. Set a project spending limit in the OpenAI Platform dashboard before sharing the site publicly. The model can be changed through Render’s `OPENAI_MODEL` environment variable; the default is `gpt-5.6-luna`.

## Run locally

Python 3.11 or newer is recommended.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY="your-real-key"
export SECRET_KEY="replace-this-with-a-long-random-value"
python app.py
```

Open `http://localhost:5000`. When `DATABASE_URL` is not set, the app automatically uses a local SQLite file named `journal.db`.

## Editing the website

- Change headings, labels, and instructions in `templates/index.html`.
- Change the appearance in `app/globals.css`.
- Change browser interactions in `public/app.js`.
- Change database or server behavior in `app.py`.

## Privacy model

Each browser receives a random journal ID stored in local browser storage. Visitors can journal without an account and only see entries associated with that browser ID. When they create an account or sign in, existing pages from that browser are moved into the account. Passwords are salted and hashed—plain-text passwords are never stored. The signed login cookie is private, protected from JavaScript, and remains active for 30 days.

When someone clicks **Make my reflection**, the server sends only that week’s entry titles, writing, moods, and gratitude notes to OpenAI. Doodle data is excluded, the request uses `store=False`, and an unchanged weekly result is cached to avoid repeat API charges. Do not use the reflection as medical or mental-health advice.

## Font license

The bundled Little Doodle display font is based on DynaPuff and distributed under the SIL Open Font License. See `public/little-doodle-font-license.txt`.
