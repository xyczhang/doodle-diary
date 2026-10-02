# Doodle Diary

A daily journal where every entry has a hand-drawn cover, a mood, a story, and a gratitude note.

## Simple technology

- `templates/index.html` — visible page text and structure
- `app/globals.css` — colors, fonts, layout, and decoration
- `public/app.js` — drawing, searching, editing, saving, and deleting
- `app.py` — Python Flask server and journal API
- Render PostgreSQL — persistent journal storage when deployed

There is no React, Next.js, TypeScript, Tailwind build process, or external API. GitHub stores the code and Render runs the Python website and database.

## Deploy using GitHub and Render

1. Upload the contents of this folder to a GitHub repository. `render.yaml` must be at the repository root.
2. In Render, choose **New → Blueprint**.
3. Connect the GitHub repository.
4. Keep the Blueprint path set to `render.yaml`.
5. Choose **Deploy Blueprint** or **Apply**.

Render creates the Flask web service, PostgreSQL database, and private database connection automatically.

## Run locally

Python 3.11 or newer is recommended.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
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

## Font license

The bundled Little Doodle display font is based on DynaPuff and distributed under the SIL Open Font License. See `public/little-doodle-font-license.txt`.
