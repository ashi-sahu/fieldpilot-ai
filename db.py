"""Database layer (SQLAlchemy Core). SQLite by default, PostgreSQL if DATABASE_URL is set."""
import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import (Column, DateTime, Float, ForeignKey, Integer, MetaData, String, Table, Text,
                        UniqueConstraint, create_engine, delete, event, insert, select)

BASE = Path(__file__).parent
url = os.environ.get("DATABASE_URL", "sqlite:///" + str(BASE / "fieldpilot.db"))
if url.startswith("postgres://"):
    url = "postgresql://" + url[len("postgres://"):]
engine = create_engine(url, pool_pre_ping=True, future=True)

if engine.dialect.name == "sqlite":
    @event.listens_for(engine, "connect")
    def _fk_on(conn, _):
        conn.execute("PRAGMA foreign_keys=ON")

meta = MetaData()
now = lambda: datetime.now(timezone.utc).replace(tzinfo=None)

users = Table(
    "users", meta,
    Column("id", Integer, primary_key=True),
    Column("name", String(120), nullable=False),
    Column("email", String(255), unique=True),
    Column("phone", String(20), unique=True),
    Column("password_hash", String(255)),
    Column("google_sub", String(64), unique=True),
    Column("created_at", DateTime, default=now),
)

otps = Table(
    "otps", meta,
    Column("phone", String(20), primary_key=True),
    Column("code_hash", String(255), nullable=False),
    Column("expires_at", DateTime, nullable=False),
    Column("attempts", Integer, default=0),
)

# which lists a user has saved (so an intentionally empty list is different from "never saved")
sync_state = Table(
    "sync_state", meta,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("name", String(20), primary_key=True),
    Column("saved_at", DateTime, default=now),
)

settings_t = Table(
    "settings", meta,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("data", Text, nullable=False),
)

# (json key, column name, type). Keys that are not listed go to the "extra" JSON column.
SPECS = {
    "crops": ("crops", [("id", "rid", "str"), ("name", "name", "str"), ("field", "field_name", "str"),
                        ("area", "area", "num"), ("status", "status", "str"), ("date", "sowing_date", "str")]),
    "finance": ("transactions", [("id", "rid", "str"), ("description", "description", "str"),
                                 ("category", "category", "str"), ("type", "tx_type", "str"),
                                 ("amount", "amount", "num"), ("date", "tx_date", "str"), ("notes", "notes", "str")]),
    "tasks": ("tasks", [("id", "rid", "str"), ("title", "title", "str"), ("category", "category", "str"),
                        ("dueDate", "due_date", "str"), ("priority", "priority", "str"),
                        ("location", "location", "str"), ("assignedTo", "assigned_to", "str"),
                        ("notes", "notes", "str"), ("status", "status", "str")]),
    "inventory": ("inventory_items", [("id", "rid", "str"), ("name", "name", "str"), ("category", "category", "str"),
                                      ("quantity", "quantity", "num"), ("unit", "unit", "str"),
                                      ("minimum", "minimum", "num"), ("unitCost", "unit_cost", "num"),
                                      ("supplier", "supplier", "str"), ("location", "location", "str")]),
    "labour": ("workers", [("id", "rid", "str"), ("name", "name", "str"), ("role", "role", "str"),
                           ("wage", "wage", "num"), ("status", "status", "str"), ("phone", "phone", "str"),
                           ("joiningDate", "joining_date", "str"), ("notes", "notes", "str"),
                           ("attendance", "attendance", "json")]),
    "machinery": ("equipment", [("id", "rid", "str"), ("name", "name", "str"), ("type", "equip_type", "str"),
                                ("condition", "condition_status", "str"), ("purchaseDate", "purchase_date", "str"),
                                ("lastService", "last_service", "str"), ("nextService", "next_service", "str"),
                                ("location", "location", "str"), ("notes", "notes", "str")]),
}
LISTS = tuple(SPECS)
MAX_ROWS = 2000

record_tables = {}
for name, (table_name, cols) in SPECS.items():
    columns = [Column("pk", Integer, primary_key=True),
               Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)]
    for _key, col, kind in cols:
        columns.append(Column(col, Float if kind == "num" else (Text if kind == "json" else String(500))))
    columns.append(Column("extra", Text))
    record_tables[name] = Table(table_name, meta, *columns, UniqueConstraint("user_id", "rid", name="uq_%s_rid" % table_name))


def init_db():
    meta.create_all(engine)


def _num(value):
    try:
        if value is None or value == "":
            return None
        v = float(value)
        return v if v == v and abs(v) < 1e15 else None
    except (TypeError, ValueError):
        return None


def _out_num(v):
    if v is None:
        return None
    return int(v) if float(v).is_integer() else float(v)


def _out_id(v):
    return int(v) if isinstance(v, str) and re.fullmatch(r"\d{1,15}", v) else v


def save_list(user_id, name, rows):
    """Replace one user's list in a single transaction."""
    spec = SPECS[name][1]
    known = {k for k, _c, _t in spec}
    table = record_tables[name]
    seen = set()
    values = []
    for row in rows:
        rid = str(row.get("id", ""))[:80]
        if not rid or rid in seen:
            continue
        seen.add(rid)
        item = {"user_id": user_id}
        for key, col, kind in spec:
            v = row.get(key)
            if kind == "num":
                item[col] = _num(v)
            elif kind == "json":
                item[col] = json.dumps(v if isinstance(v, (dict, list)) else {})
            elif key == "id":
                item[col] = rid
            else:
                item[col] = None if v is None else str(v)[:500]
        extra = {k: v for k, v in row.items() if k not in known}
        item["extra"] = json.dumps(extra) if extra else None
        values.append(item)
    with engine.begin() as conn:
        conn.execute(delete(table).where(table.c.user_id == user_id))
        if values:
            conn.execute(insert(table), values)
        conn.execute(delete(sync_state).where(sync_state.c.user_id == user_id, sync_state.c.name == name))
        conn.execute(insert(sync_state).values(user_id=user_id, name=name, saved_at=now()))


def load_list(user_id, name, conn=None):
    spec = SPECS[name][1]
    table = record_tables[name]

    def run(c):
        out = []
        for r in c.execute(select(table).where(table.c.user_id == user_id).order_by(table.c.pk)).mappings():
            row = {}
            for key, col, kind in spec:
                v = r[col]
                if kind == "num":
                    v = _out_num(v)
                elif kind == "json":
                    v = json.loads(v) if v else {}
                elif key == "id":
                    v = _out_id(v)
                elif v is None:
                    v = ""
                row[key] = v
            if r["extra"]:
                row.update(json.loads(r["extra"]))
            out.append(row)
        return out

    if conn is not None:
        return run(conn)
    with engine.connect() as c:
        return run(c)


def save_settings(user_id, data):
    with engine.begin() as conn:
        conn.execute(delete(settings_t).where(settings_t.c.user_id == user_id))
        conn.execute(insert(settings_t).values(user_id=user_id, data=json.dumps(data)))


def load_all(user_id):
    """Everything the page needs on start: only lists the user has saved."""
    out = {}
    with engine.connect() as conn:
        saved = {r[0] for r in conn.execute(select(sync_state.c.name).where(sync_state.c.user_id == user_id))}
        for name in LISTS:
            if name in saved:
                out[name] = load_list(user_id, name, conn)
        s = conn.execute(select(settings_t.c.data).where(settings_t.c.user_id == user_id)).first()
        if s:
            out["settings"] = json.loads(s[0])
    return out


def delete_user(user_id):
    with engine.begin() as conn:
        for table in list(record_tables.values()) + [sync_state, settings_t]:
            conn.execute(delete(table).where(table.c.user_id == user_id))
        conn.execute(delete(users).where(users.c.id == user_id))
