# FieldPilot AI

A free farm management web app with a farming assistant, built with **Flask, SQLAlchemy and plain JavaScript**.
It works in the browser and can be installed on a phone like an app (PWA).

## Features
- Login with email and password, Google, or phone OTP
- Every user has a private farm saved in a database (crops, finance, tasks, inventory, labour, machinery)
- Live dashboard with alerts for overdue tasks, low stock and machines that need service
- **Free farming assistant** that knows 70 crops and 6 Indian soil types: how to grow, sowing and harvest time,
  water, fertiliser, which crop suits a season or soil, compost, irrigation and safe general pest advice.
  It also answers questions about the user's own farm records.
- Optional smarter mode: connect any LLM with an API key and the assistant uses it, with the knowledge base as backup
- Backup and restore, export to CSV, delete account
- Installable on Android and iPhone, works over HTTPS

## Run on your computer
```
python -m venv .venv
.venv\Scripts\activate          (Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
python app.py
```
Open http://127.0.0.1:5000 and create an account. A local SQLite file `fieldpilot.db` is created automatically.

Run the tests: `python -m unittest tests.test_app`

## Settings (environment variables)
| Name | Purpose |
|---|---|
| `SECRET_KEY` | Required in production. Any long random text. Keeps logins valid. |
| `DATABASE_URL` | Optional. Leave empty for SQLite. Use a PostgreSQL URL for data that survives restarts. |
| `GOOGLE_CLIENT_ID` | Optional. Turns on the "Sign in with Google" button. |
| `OTP_DEMO=1` | Optional. Turns on phone login in demo mode (the code is shown on screen). |
| `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` | Optional. Uses Claude for assistant answers. |
| `LLM_BASE_URL` + `LLM_API_KEY` + `LLM_MODEL` | Optional. Any OpenAI-compatible provider. |

## Deploy free on Render
1. Push this folder to a GitHub repository.
2. Render: New + > Web Service > pick the repo.
3. Build command: `pip install -r requirements.txt`   Start command: `gunicorn app:app`
4. Environment: add `SECRET_KEY` (use Generate) and `PYTHON_VERSION` = `3.12.8`.
5. The free plan sleeps after 15 minutes without visits, so the first visit takes about a minute.

**Keeping data on the free plan.** Render's free disk is wiped on restart, so a SQLite file will reset.
Create a free PostgreSQL database (for example on Neon or Supabase) and put its connection URL in `DATABASE_URL`.
The same code runs on both databases.

## Phone login
Real SMS needs a paid SMS provider. `send_sms()` in `app.py` is the one place to connect one (MSG91, Twilio, Fast2SMS).
Until then the Phone tab is hidden. Set `OTP_DEMO=1` only for demos, because it shows the code on screen.

## Project layout
```
app.py        routes: pages, login, data API, assistant API, PWA files
db.py         tables and save/load code (SQLAlchemy Core)
kb.py         free assistant (reads data/crops.txt and data/soils.txt)
llm.py        optional LLM connection
data/         crop and soil knowledge (edit a line to fix or add a crop)
templates/    HTML pages     static/  CSS, JavaScript, icons, service worker
tests/        automated tests
```

## Limits to know
- Assistant answers come from typical values for India. For doses, diseases and local advice, ask a KVK or agriculture officer.
- The knowledge-base assistant answers in English. LLM mode can answer in Hindi or Hinglish.
- Rate limits are kept in memory, so they reset when the server restarts.
