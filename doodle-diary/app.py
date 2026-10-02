import json
import os
from datetime import date, datetime, timezone
from uuid import UUID

from flask import Flask, jsonify, render_template, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Index


BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def database_url():
    """Use Render Postgres in production and a local SQLite file during development."""
    url = os.environ.get("DATABASE_URL", "sqlite:///journal.db")
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


app = Flask(__name__, static_folder="public", static_url_path="")
app.config["SQLALCHEMY_DATABASE_URI"] = database_url()
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}
db = SQLAlchemy(app)


class Entry(db.Model):
    __tablename__ = "entries"

    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.String(64), nullable=False)
    title = db.Column(db.String(80), nullable=False)
    content = db.Column(db.Text, nullable=False)
    entry_date = db.Column(db.Date, nullable=False)
    doodle = db.Column(db.Text, nullable=False, default="[]")
    mood = db.Column(db.String(16), nullable=False, default="okay")
    gratitude = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (Index("entries_owner_date_idx", "owner_id", "entry_date"),)

    def as_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "entryDate": self.entry_date.isoformat(),
            "doodle": self.doodle,
            "mood": self.mood,
            "gratitude": self.gratitude,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }


with app.app_context():
    db.create_all()


def journal_owner():
    value = request.headers.get("x-journal-id", "")
    try:
        return str(UUID(value)) if str(UUID(value)) == value.lower() else None
    except (ValueError, AttributeError):
        return None


def validated_entry_data():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    content = str(data.get("content", "")).strip()
    entry_date_text = str(data.get("entryDate", "")).strip()
    mood = str(data.get("mood", "")).strip()
    gratitude = str(data.get("gratitude", "")).strip()
    doodle_value = data.get("doodle", [])

    if not title or not content or not entry_date_text or not mood:
        raise ValueError("Title, writing, date, and mood are required.")
    if mood not in {"joyful", "good", "okay", "tired", "blue"}:
        raise ValueError("Choose one of the mood options.")
    if len(title) > 80 or len(content) > 5000 or len(gratitude) > 500:
        raise ValueError("This page is a little too full to save.")

    try:
        parsed_date = date.fromisoformat(entry_date_text)
    except ValueError as error:
        raise ValueError("Choose a valid date.") from error

    if isinstance(doodle_value, str):
        try:
            doodle_value = json.loads(doodle_value)
        except json.JSONDecodeError as error:
            raise ValueError("The doodle could not be read.") from error
    if not isinstance(doodle_value, list):
        raise ValueError("The doodle could not be read.")

    doodle = json.dumps(doodle_value, separators=(",", ":"))
    if len(doodle) > 500_000:
        raise ValueError("This doodle is too detailed to save.")

    return {
        "title": title,
        "content": content,
        "entry_date": parsed_date,
        "doodle": doodle,
        "mood": mood,
        "gratitude": gratitude,
    }


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/styles.css")
def styles():
    return send_from_directory(os.path.join(BASE_DIR, "app"), "globals.css", mimetype="text/css")


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.get("/api/entries")
def list_entries():
    owner = journal_owner()
    if not owner:
        return jsonify(error="Journal identity is missing."), 400

    entries = (
        Entry.query.filter_by(owner_id=owner)
        .order_by(Entry.entry_date.desc(), Entry.id.desc())
        .all()
    )
    return jsonify(entries=[entry.as_dict() for entry in entries])


@app.post("/api/entries")
def create_entry():
    owner = journal_owner()
    if not owner:
        return jsonify(error="Journal identity is missing."), 400

    try:
        values = validated_entry_data()
    except ValueError as error:
        return jsonify(error=str(error)), 400

    entry = Entry(owner_id=owner, **values)
    db.session.add(entry)
    db.session.commit()
    return jsonify(entry=entry.as_dict()), 201


@app.put("/api/entries/<int:entry_id>")
def update_entry(entry_id):
    owner = journal_owner()
    if not owner:
        return jsonify(error="Journal identity is missing."), 400

    entry = Entry.query.filter_by(id=entry_id, owner_id=owner).first()
    if not entry:
        return jsonify(error="Entry not found."), 404

    try:
        values = validated_entry_data()
    except ValueError as error:
        return jsonify(error=str(error)), 400

    for key, value in values.items():
        setattr(entry, key, value)
    entry.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(entry=entry.as_dict())


@app.delete("/api/entries/<int:entry_id>")
def delete_entry(entry_id):
    owner = journal_owner()
    if not owner:
        return jsonify(error="Journal identity is missing."), 400

    entry = Entry.query.filter_by(id=entry_id, owner_id=owner).first()
    if not entry:
        return jsonify(error="Entry not found."), 404

    db.session.delete(entry)
    db.session.commit()
    return jsonify(deleted=True)


@app.errorhandler(500)
def server_error(error):
    app.logger.error("Journal server error: %s", error)
    db.session.rollback()
    return jsonify(error="The journal is temporarily unavailable."), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
