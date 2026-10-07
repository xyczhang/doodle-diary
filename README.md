# Doodle Diary

Doodle Diary is an online diary where users can document and reflect on their day. The highlight feature is the mini doodles users can draw for the cover of their entry, along with options to have AI summarize their week or sign in to save their passages.

## How to Deploy
1. Clone this "doodle-diary" repository from my Github (make sure the render.yaml is in the repository root)
2. Go to Render and select New Blueprint
3. Connect the cloned Github repository to the Blueprint
4. Keep the Blueprint path set to `render.yaml`.
5. Enter your own OpenAI Key
6. Deploy Blueprint

## How to Run Locally
Run the following commands in your terminal:

python3 -m venv .venv

source .venv/bin/activate

pip install -r requirements.txt

export OPENAI_API_KEY="your-real-key" (Replace with your private API key)

export SECRET_KEY="replace-this-with-a-long-random-value" (Replace with the key that Flask generates for the login cookies)

python app.py

Open `http://localhost:5000`

## How Secrets Are Handled
There are three total secrets: DATABASE_URL, OPENAI_API_KEY, and SECRET_KEY. There is also an OPENAI_MODEL key that does not need to stay private and has the value "gpt-5.6-luna."

The three secrets are stored in Render as Environment Variables. 

Additionally, the .env file containing the keys is listed under my .gitignore file on this repository, so they will not be shared to the public and can remain private.

## How AI Was Used
I used Codex by OpenAI to create most of the code for this project. However, I did edit parts of the UI such as the text shown on the website explaining how it works and some icons that are used.
