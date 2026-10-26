import hashlib
import hmac
import json
import os
import re
import secrets
import time
import urllib.parse
import urllib.request
from collections import defaultdict, deque
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, jsonify, redirect, render_template, request, session, url_for, send_from_directory
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import IntegrityError
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash, generate_password_hash

import db
import kb
import llm

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
app.config.update(
    SECRET_KEY=os.environ.get("SECRET_KEY") or secrets.token_hex(32),
    MAX_CONTENT_LENGTH=1024 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=bool(os.environ.get("RENDER") or os.environ.get("COOKIE_SECURE")),
    PERMANENT_SESSION_LIFETIME=timedelta(days=30),
    TEMPLATES_AUTO_RELOAD=False,
)
if not os.environ.get("SECRET_KEY"):
    print("WARNING: SECRET_KEY is not set. Logins will reset whenever the server restarts.")

db.init_db()
PAGES = {"index", "crops", "finance", "inventory", "machinery", "labour", "tasks", "assistant", "settings"}
DUMMY_HASH = generate_password_hash("not-a-real-password")
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$")


# ---------- small helpers ----------
_hits = defaultdict(deque)


def too_many(key, limit, seconds):
    """Simple in-memory rate limit (per server process)."""
    t = time.time()
    q = _hits[key]
    while q and q[0] < t - seconds:
        q.popleft()
    if len(q) >= limit:
        return True
    q.append(t)
    return False


def client_ip():
    return request.remote_addr or "unknown"


def err(message, status=400):
    return jsonify({"error": message}), status


def current_user():
    uid = session.get("uid")
    if not uid:
        return None
    with db.engine.connect() as c:
        row = c.execute(select(db.users).where(db.users.c.id == uid)).mappings().first()
    return dict(row) if row else None


def login_required(f):
    @wraps(f)
    def wrapper(*a, **kw):
        user = current_user()
        if not user:
            session.clear()
            if request.path.startswith("/api/"):
                return err("Please log in again.", 401)
            return redirect(url_for("login_page", next=request.path))
        request.user = user
        return f(*a, **kw)
    return wrapper


@app.before_request
def csrf_guard():
    # Browsers cannot add a custom header cross-site without a CORS preflight, which we never allow.
    if request.method in ("POST", "PUT", "DELETE") and request.path.startswith(("/api/", "/auth/")):
        if request.headers.get("X-Requested-With") != "fp":
            return err("Bad request.", 403)


@app.after_request
def headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "same-origin"
    if not request.path.startswith("/static/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


def start_session(user_id):
    session.clear()
    session.permanent = True
    session["uid"] = user_id


def public_user(u):
    return {"id": u["id"], "name": u["name"], "email": u["email"], "phone": u["phone"]}


# ---------- pages ----------
@app.route("/login")
def login_page():
    if current_user():
        return redirect("/")
    return render_template("login.html")


@app.route("/")
@app.route("/<page>.html")
@login_required
def page(page="index"):
    if page not in PAGES:
        return render_template("404.html"), 404
    u = request.user
    return render_template(page + ".html", fp_data=db.load_all(u["id"]), fp_user=public_user(u))


@app.route("/manifest.webmanifest")
def manifest():
    data = {
        "name": "FieldPilot AI", "short_name": "FieldPilot", "description": "Free farm management and farming assistant",
        "start_url": "/", "scope": "/", "display": "standalone", "background_color": "#f6f8f5", "theme_color": "#1f7a4d",
        "icons": [{"src": "/static/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
                  {"src": "/static/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                  {"src": "/static/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
    }
    r = jsonify(data)
    r.headers["Content-Type"] = "application/manifest+json"
    return r


@app.route("/sw.js")
def service_worker():
    r = send_from_directory(app.static_folder, "sw.js", mimetype="application/javascript")
    r.headers["Service-Worker-Allowed"] = "/"
    return r


@app.route("/healthz")
def healthz():
    return "ok"


@app.route("/api/config")
def config():
    return jsonify({"google_client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
                    "phone_enabled": os.environ.get("OTP_DEMO") == "1",
                    "assistant": "llm" if llm.configured() else "knowledge-base"})


# ---------- auth ----------
@app.route("/auth/register", methods=["POST"])
def register():
    d = request.get_json(silent=True) or {}
    name = str(d.get("name", "")).strip()[:80]
    email = str(d.get("email", "")).strip().lower()
    password = str(d.get("password", ""))
    if not name:
        return err("Please enter your name.")
    if not EMAIL_RE.match(email):
        return err("Please enter a valid email address.")
    if not 8 <= len(password) <= 128:
        return err("Password must be 8 to 128 characters.")
    if too_many("reg:" + client_ip(), 10, 3600):
        return err("Too many sign-ups from this network. Try again later.", 429)
    try:
        with db.engine.begin() as c:
            res = c.execute(insert(db.users).values(name=name, email=email, password_hash=generate_password_hash(password)))
            uid = res.inserted_primary_key[0]
    except IntegrityError:
        return err("This email is already registered. Please log in.", 409)
    start_session(uid)
    return jsonify({"ok": True})


@app.route("/auth/login", methods=["POST"])
def login():
    d = request.get_json(silent=True) or {}
    email = str(d.get("email", "")).strip().lower()
    password = str(d.get("password", ""))
    if too_many("login:" + client_ip() + email, 8, 900):
        return err("Too many attempts. Please wait 15 minutes and try again.", 429)
    with db.engine.connect() as c:
        row = c.execute(select(db.users).where(db.users.c.email == email)).mappings().first()
    if row and row["password_hash"]:
        ok = check_password_hash(row["password_hash"], password)
    else:
        check_password_hash(DUMMY_HASH, password)  # same work for unknown emails
        ok = False
    if not ok:
        return err("Wrong email or password.", 401)
    start_session(row["id"])
    return jsonify({"ok": True})


@app.route("/auth/google", methods=["POST"])
def google_login():
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    token = str((request.get_json(silent=True) or {}).get("credential", ""))
    if not client_id or not token:
        return err("Google login is not set up.", 400)
    base = os.environ.get("GOOGLE_TOKENINFO_URL", "https://oauth2.googleapis.com/tokeninfo")
    try:
        with urllib.request.urlopen(base + "?id_token=" + urllib.parse.quote(token), timeout=10) as r:
            info = json.loads(r.read().decode())
    except Exception:
        return err("Google could not verify this login.", 401)
    if info.get("aud") != client_id or str(info.get("email_verified")).lower() != "true" or not info.get("sub"):
        return err("Google could not verify this login.", 401)
    sub, email, name = info["sub"], str(info.get("email", "")).lower(), (info.get("name") or "Farmer")[:80]
    with db.engine.begin() as c:
        row = c.execute(select(db.users).where(db.users.c.google_sub == sub)).mappings().first()
        if not row and email:
            row = c.execute(select(db.users).where(db.users.c.email == email)).mappings().first()
            if row:
                c.execute(update(db.users).where(db.users.c.id == row["id"]).values(google_sub=sub))
        if not row:
            uid = c.execute(insert(db.users).values(name=name, email=email or None, google_sub=sub)).inserted_primary_key[0]
        else:
            uid = row["id"]
    start_session(uid)
    return jsonify({"ok": True})


def norm_phone(raw):
    digits = re.sub(r"\D", "", str(raw))
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    digits = digits[-10:] if len(digits) > 10 and digits.startswith("0") else digits
    return "+91" + digits if re.fullmatch(r"[6-9]\d{9}", digits) else None


def code_hash(phone, code):
    return hashlib.sha256((app.config["SECRET_KEY"] + phone + code).encode()).hexdigest()


def send_sms(phone, code):
    """Plug a real SMS provider in here (MSG91, Twilio, Fast2SMS...). Free demo mode shows the code on screen."""
    if os.environ.get("OTP_DEMO") == "1":
        print("DEMO OTP for %s is %s" % (phone, code))
        return True
    raise NotImplementedError("No SMS provider configured")


@app.route("/auth/otp/request", methods=["POST"])
def otp_request():
    phone = norm_phone((request.get_json(silent=True) or {}).get("phone", ""))
    if not phone:
        return err("Enter a valid 10 digit Indian mobile number.")
    if too_many("otp:" + phone, 3, 600) or too_many("otpip:" + client_ip(), 10, 3600):
        return err("Too many OTP requests. Please wait a few minutes.", 429)
    code = "%06d" % secrets.randbelow(1000000)
    try:
        send_sms(phone, code)
    except NotImplementedError:
        return err("Phone login is not available on this server.", 501)
    with db.engine.begin() as c:
        c.execute(delete(db.otps).where(db.otps.c.phone == phone))
        c.execute(insert(db.otps).values(phone=phone, code_hash=code_hash(phone, code),
                                         expires_at=db.now() + timedelta(minutes=5), attempts=0))
    out = {"ok": True}
    if os.environ.get("OTP_DEMO") == "1":
        out["demo_code"] = code
    return jsonify(out)


@app.route("/auth/otp/verify", methods=["POST"])
def otp_verify():
    d = request.get_json(silent=True) or {}
    phone = norm_phone(d.get("phone", ""))
    code = re.sub(r"\D", "", str(d.get("code", "")))
    if not phone or len(code) != 6:
        return err("Enter the 6 digit code.")
    with db.engine.begin() as c:
        row = c.execute(select(db.otps).where(db.otps.c.phone == phone)).mappings().first()
        if not row or row["expires_at"] < db.now() or row["attempts"] >= 5:
            return err("This code has expired. Please request a new one.", 400)
        if not hmac.compare_digest(row["code_hash"], code_hash(phone, code)):
            c.execute(update(db.otps).where(db.otps.c.phone == phone).values(attempts=row["attempts"] + 1))
            return err("Wrong code.", 400)
        c.execute(delete(db.otps).where(db.otps.c.phone == phone))
        user = c.execute(select(db.users).where(db.users.c.phone == phone)).mappings().first()
        if user:
            uid = user["id"]
        else:
            name = str(d.get("name", "")).strip()[:80] or "Farmer"
            uid = c.execute(insert(db.users).values(name=name, phone=phone)).inserted_primary_key[0]
    start_session(uid)
    return jsonify({"ok": True})


@app.route("/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


# ---------- data ----------
def clean_value(v):
    if isinstance(v, str):
        return v[:2000]
    if isinstance(v, (int, float, bool)) or v is None:
        return v
    if isinstance(v, (dict, list)) and len(json.dumps(v)) <= 50000:
        return v
    return None


def clean_row(row):
    return {str(k)[:40]: clean_value(v) for k, v in list(row.items())[:40]}


@app.route("/api/data/<name>", methods=["PUT"])
@login_required
def save_data(name):
    value = (request.get_json(silent=True) or {}).get("value")
    uid = request.user["id"]
    if name == "settings":
        if not isinstance(value, dict):
            return err("Settings must be an object.")
        db.save_settings(uid, {str(k)[:40]: clean_value(v) for k, v in list(value.items())[:40]})
        return jsonify({"ok": True})
    if name not in db.LISTS:
        return err("Unknown data set.", 404)
    if not isinstance(value, list) or len(value) > db.MAX_ROWS or not all(isinstance(r, dict) for r in value):
        return err("Invalid data.")
    db.save_list(uid, name, [clean_row(r) for r in value])
    return jsonify({"ok": True})


@app.route("/api/account", methods=["DELETE"])
@login_required
def delete_account():
    db.delete_user(request.user["id"])
    session.clear()
    return jsonify({"ok": True})


# ---------- assistant ----------
def farm_summary(uid):
    data = db.load_all(uid)
    parts = []
    crops = data.get("crops", [])
    if crops:
        parts.append("Crops: " + "; ".join("%s (%s acres, %s)" % (c.get("name"), c.get("area"), c.get("status")) for c in crops[:10]))
    pending = [t for t in data.get("tasks", []) if t.get("status") != "Completed"]
    if pending:
        parts.append("Pending tasks: %d" % len(pending))
    return "\n".join(parts)


def crop_facts(text):
    out = []
    for slug in kb.find_crops(text):
        c = kb.CROPS[slug]
        out.append("%s: season %s; soil %s; temperature %s C; rainfall %s cm; water need %s; duration %s; sowing %s; harvest %s; NPK %s; yield %s; tip: %s"
                   % (c["name"], c["season"], c["soil"], c["temp"], c["rain"], c["water"], c["duration"], c["sowing"],
                      c["harvest"], c["npk"], c["yield"], c["tip"]))
    return "\n".join(out)


@app.route("/api/assistant", methods=["POST"])
@login_required
def assistant():
    d = request.get_json(silent=True) or {}
    message = str(d.get("message", "")).strip()
    if not message or len(message) > 1000:
        return err("Please type a question (up to 1000 characters).")
    uid = request.user["id"]
    if too_many("ai:%s" % uid, 40, 3600):
        return err("You have asked a lot of questions this hour. Please try again a little later.", 429)
    history = [{"role": "assistant" if h.get("role") in ("bot", "assistant") else "user", "content": str(h.get("text", h.get("content", "")))[:1000]}
               for h in (d.get("history") or [])[-8:] if isinstance(h, dict)]
    if llm.configured():
        try:
            reply = llm.ask(message, history, crop_facts(message), farm_summary(uid))
            if reply:
                return jsonify({"reply": reply, "source": "llm"})
        except Exception as exc:  # network, quota, bad key: fall back to the free knowledge base
            print("LLM failed, using knowledge base:", type(exc).__name__)
    reply, _matched = kb.answer(message)
    return jsonify({"reply": reply, "source": "knowledge-base"})


@app.errorhandler(404)
def not_found(_e):
    if request.path.startswith("/api/"):
        return err("Not found.", 404)
    return render_template("404.html"), 404


@app.errorhandler(413)
def too_big(_e):
    return err("That request is too large.", 413)


if __name__ == "__main__":
    app.run(debug=True)
