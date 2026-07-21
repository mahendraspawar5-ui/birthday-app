"""
Happy Birthday Sukhada — a Flask-powered birthday site.

Features beyond a typical "wish board":
  1. Wish board with optional photo + a heart/like counter per wish.
  2. Interactive candle-blowing cake (client-side, see static/js/main.js).
  3. A generated "Happy Birthday" tune (Web Audio oscillators — no audio
     file needed, so nothing to license).
  4. Time Capsule: visitors leave a message that stays sealed until a
     date the sender picks (e.g. next year's birthday). The server
     checks the date on every request and only reveals capsules whose
     unlock date has passed.

Run:
    pip install -r requirements.txt
    python app.py
Then open http://127.0.0.1:5000
"""

import os
import sqlite3
import uuid
from datetime import datetime, date

from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
from werkzeug.utils import secure_filename

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
DB_PATH = os.path.join(BASE_DIR, "birthday.db")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

CELEBRANT_NAME = "Sukhada"          # <-- change this for a different person
NEXT_BIRTHDAY = "2027-07-21"        # <-- used as the default time-capsule unlock date

app = Flask(__name__)
app.config["SECRET_KEY"] = "birthday-secret-key-change-me"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024  # 6 MB per upload

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# --------------------------------------------------------------------------
# Database helpers
# --------------------------------------------------------------------------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS wishes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            message TEXT NOT NULL,
            photo TEXT,
            likes INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS capsules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            message TEXT NOT NULL,
            unlock_date TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
@app.route("/")
def index():
    conn = get_db()
    wishes = conn.execute(
        "SELECT * FROM wishes ORDER BY created_at DESC"
    ).fetchall()

    today = date.today().isoformat()
    unlocked_capsules = conn.execute(
        "SELECT * FROM capsules WHERE unlock_date <= ? ORDER BY unlock_date DESC",
        (today,),
    ).fetchall()
    sealed_count = conn.execute(
        "SELECT COUNT(*) AS c FROM capsules WHERE unlock_date > ?", (today,)
    ).fetchone()["c"]
    conn.close()

    return render_template(
        "index.html",
        celebrant=CELEBRANT_NAME,
        wishes=wishes,
        unlocked_capsules=unlocked_capsules,
        sealed_count=sealed_count,
        default_unlock_date=NEXT_BIRTHDAY,
        today=today,
    )


@app.route("/wish", methods=["POST"])
def add_wish():
    name = request.form.get("name", "").strip() or "Anonymous"
    message = request.form.get("message", "").strip()

    if not message:
        flash("A wish needs a message!", "error")
        return redirect(url_for("index"))

    photo_filename = None
    photo = request.files.get("photo")
    if photo and photo.filename and allowed_file(photo.filename):
        ext = photo.filename.rsplit(".", 1)[1].lower()
        photo_filename = f"{uuid.uuid4().hex}.{ext}"
        photo.save(os.path.join(app.config["UPLOAD_FOLDER"], photo_filename))

    conn = get_db()
    conn.execute(
        "INSERT INTO wishes (name, message, photo, likes, created_at) VALUES (?, ?, ?, 0, ?)",
        (name, message, photo_filename, datetime.now().isoformat(timespec="seconds")),
    )
    conn.commit()
    conn.close()

    flash("Your wish has been added to the board! 🎉", "success")
    return redirect(url_for("index") + "#board")


@app.route("/like/<int:wish_id>", methods=["POST"])
def like_wish(wish_id):
    conn = get_db()
    conn.execute("UPDATE wishes SET likes = likes + 1 WHERE id = ?", (wish_id,))
    row = conn.execute("SELECT likes FROM wishes WHERE id = ?", (wish_id,)).fetchone()
    conn.commit()
    conn.close()
    if row is None:
        return jsonify({"error": "not found"}), 404
    return jsonify({"likes": row["likes"]})


@app.route("/capsule", methods=["POST"])
def add_capsule():
    name = request.form.get("name", "").strip() or "Anonymous"
    message = request.form.get("message", "").strip()
    unlock_date = request.form.get("unlock_date", "").strip() or NEXT_BIRTHDAY

    if not message:
        flash("A time capsule needs a message!", "error")
        return redirect(url_for("index") + "#capsule")

    conn = get_db()
    conn.execute(
        "INSERT INTO capsules (name, message, unlock_date, created_at) VALUES (?, ?, ?, ?)",
        (name, message, unlock_date, datetime.now().isoformat(timespec="seconds")),
    )
    conn.commit()
    conn.close()

    flash("Sealed! It'll unlock automatically on the date you picked. 🔒", "success")
    return redirect(url_for("index") + "#capsule")


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
