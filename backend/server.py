"""Local, single-user internship tracker. Run: python3 backend/server.py."""

import argparse
from contextlib import closing
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import sqlite3
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
STATUSES = ("saved", "applied", "assessment", "interview", "offer", "rejected", "withdrawn")
FIELDS = ("company", "role", "url", "status", "applied_date", "deadline", "next_step", "notes", "next_step_due_date", "next_step_done")
LIMITS = {"company": 160, "role": 200, "url": 2000, "status": 30,
          "applied_date": 10, "deadline": 10, "next_step": 300, "notes": 10000,
          "next_step_due_date": 10}


def connect(path):
    connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def init_db(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(connect(path)) as db, db:
        db.execute("""CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY,
            company TEXT NOT NULL, role TEXT NOT NULL, url TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'saved', applied_date TEXT NOT NULL DEFAULT '',
            deadline TEXT NOT NULL DEFAULT '', next_step TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )""")
        # Upgrade existing personal databases without replacing their records.
        columns = {row["name"] for row in db.execute("PRAGMA table_info(applications)")}
        if "next_step_due_date" not in columns:
            db.execute("ALTER TABLE applications ADD COLUMN next_step_due_date TEXT NOT NULL DEFAULT ''")
        if "next_step_done" not in columns:
            db.execute("ALTER TABLE applications ADD COLUMN next_step_done INTEGER NOT NULL DEFAULT 0")


def validate(payload):
    if not isinstance(payload, dict) or set(payload) - set(FIELDS):
        raise ValueError("Please submit valid application fields.")
    values = {}
    for key in FIELDS:
        if key == "next_step_done":
            value = payload.get(key, False)
            if not isinstance(value, bool):
                raise ValueError("Task completion must be true or false.")
            values[key] = value
            continue
        value = payload.get(key, "saved" if key == "status" else "")
        if not isinstance(value, str) or len(value) > LIMITS[key]:
            raise ValueError(f"The {key} field must be text within the allowed length.")
        values[key] = value.strip()
    if not values["company"] or not values["role"]:
        raise ValueError("Company and role are required.")
    if values["status"] not in STATUSES:
        raise ValueError("Please select a valid application status.")
    for key in ("applied_date", "deadline", "next_step_due_date"):
        if values[key]:
            try:
                if date.fromisoformat(values[key]).isoformat() != values[key]:
                    raise ValueError()
            except ValueError:
                raise ValueError("Dates must be valid and use YYYY-MM-DD format.") from None
    if not values["next_step"] and (values["next_step_due_date"] or values["next_step_done"]):
        raise ValueError("Add a next step before setting its due date or marking it complete.")
    if values["url"]:
        try:
            parsed = urlsplit(values["url"])
            valid = parsed.scheme in ("http", "https") and parsed.hostname
        except ValueError:
            valid = False
        if not valid:
            raise ValueError("The job URL must start with http:// or https:// and include a hostname.")
    return values


def application_json(row):
    result = dict(row)
    result["next_step_done"] = bool(result["next_step_done"])
    return result


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, body):
        data = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/applications":
            with closing(connect(self.server.db_path)) as db:
                rows = db.execute("SELECT * FROM applications ORDER BY created_at DESC, id DESC").fetchall()
            self.send_json(200, [application_json(row) for row in rows])
            return
        # Explicit assets only: never serve the database, Git metadata or source.
        assets = {"/": ("index.html", "text/html; charset=utf-8"),
                  "/app.js": ("app.js", "text/javascript; charset=utf-8"),
                  "/i18n.js": ("i18n.js", "text/javascript; charset=utf-8"),
                  "/tasks.js": ("tasks.js", "text/javascript; charset=utf-8"),
                  "/styles.css": ("styles.css", "text/css; charset=utf-8")}
        if path not in assets:
            self.send_json(404, {"error": "Page not found."})
            return
        filename, content_type = assets[path]
        data = (ROOT / "frontend" / filename).read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(data)

    def mutate(self, method):
        host = self.headers.get("Host", "")
        allowed = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
        origin = self.headers.get("Origin")
        if host not in allowed or (origin and origin != f"http://{host}"):
            self.send_json(403, {"error": "Request origin is not allowed."})
            return
        path = urlsplit(self.path).path
        item_id = None
        if method != "POST":
            parts = path.split("/")
            if len(parts) != 4 or parts[:3] != ["", "api", "applications"] or not parts[3].isascii() or not parts[3].isdigit():
                self.send_json(404, {"error": "Application not found."})
                return
            item_id = int(parts[3])
            if item_id > 9223372036854775807:
                self.send_json(404, {"error": "Application not found."})
                return
        elif path != "/api/applications":
            self.send_json(404, {"error": "Endpoint not found."})
            return
        try:
            if method != "DELETE":
                if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
                    self.send_json(415, {"error": "Content-Type must be application/json."})
                    return
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 65536:
                    raise ValueError("The request body is empty or too large.")
                values = validate(json.loads(self.rfile.read(length)))
            with closing(connect(self.server.db_path)) as db, db:
                if method == "POST":
                    names = ", ".join(FIELDS)
                    marks = ", ".join("?" for _ in FIELDS)
                    cursor = db.execute(f"INSERT INTO applications ({names}) VALUES ({marks})", tuple(values.values()))
                    item_id = cursor.lastrowid
                else:
                    if not db.execute("SELECT id FROM applications WHERE id = ?", (item_id,)).fetchone():
                        self.send_json(404, {"error": "Application not found."})
                        return
                    if method == "DELETE":
                        db.execute("DELETE FROM applications WHERE id = ?", (item_id,))
                    else:
                        assignments = ", ".join(f"{key} = ?" for key in FIELDS)
                        db.execute(f"UPDATE applications SET {assignments}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?", (*values.values(), item_id))
                row = db.execute("SELECT * FROM applications WHERE id = ?", (item_id,)).fetchone()
            self.send_json(201 if method == "POST" else 200, application_json(row) if row else {"deleted": item_id})
        except (ValueError, UnicodeDecodeError) as error:
            self.send_json(400, {"error": str(error) if not isinstance(error, json.JSONDecodeError) else "Invalid JSON."})
        except sqlite3.Error:
            self.send_json(500, {"error": "Could not save changes. Please try again."})

    def do_POST(self):
        self.mutate("POST")

    def do_PUT(self):
        self.mutate("PUT")

    def do_DELETE(self):
        self.mutate("DELETE")


def create_server(port=8000, db_path=None):
    db_path = Path(db_path) if db_path else ROOT / "data" / "tracker.db"
    init_db(db_path)
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    server.db_path = db_path
    server.daemon_threads = True
    return server


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    server = create_server(args.port)
    print(f"Internship Tracker: http://127.0.0.1:{server.server_port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
