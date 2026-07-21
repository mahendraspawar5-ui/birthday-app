# Happy Birthday, Sukhada 🎟️

A Flask birthday site — a step up from a plain wish form:

- **Interactive candle-blowing cake** — click each candle to blow it out; blow all three and confetti fires + a generated "Happy Birthday" tune plays.
- **Generated tune** — played with Web Audio oscillators, so there's no audio file to host or license.
- **Wish board** — name, message, optional photo, and a like (♥) counter per wish, stored in SQLite.
- **Time Capsule** — the one thing most birthday pages don't have: visitors seal a message with an unlock date (e.g. next year's birthday). The server only reveals it once that date has passed, checked automatically on every page load.
- **Party-lights toggle**, floating balloons, and a marquee-ticket visual theme throughout.

## Run locally

```bash
cd birthday_app
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open **http://127.0.0.1:5000**.

The first run creates `birthday.db` (SQLite) automatically — no setup needed.

## Customize

Open `app.py` and change these two lines near the top:

```python
CELEBRANT_NAME = "Sukhada"
NEXT_BIRTHDAY = "2027-07-21"   # default time-capsule unlock date
```

## Deploy (e.g. Render, like the original site)

1. Push this folder to a GitHub repo.
2. On Render: **New → Web Service**, connect the repo.
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn app:app` (add `gunicorn` to `requirements.txt` first)
5. Render's disk is ephemeral by default — for uploaded photos and the SQLite
   database to survive restarts/redeploys, attach a **Render Disk** mounted at
   the project folder, or swap SQLite for a managed Postgres add-on for the
   database part.

## Project structure

```
birthday_app/
├── app.py                  # Flask routes + SQLite models
├── requirements.txt
├── templates/
│   └── index.html          # single-page site
└── static/
    ├── css/style.css       # marquee/ticket visual theme
    ├── js/main.js          # candles, confetti, tune, likes, theme toggle
    └── uploads/             # wish photos land here
```
