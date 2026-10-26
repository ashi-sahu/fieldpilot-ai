import json
import os
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer

TMP = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(TMP, "test.db")
os.environ["SECRET_KEY"] = "test-secret"
os.environ["OTP_DEMO"] = "1"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app as fp  # noqa: E402
import kb  # noqa: E402

H = {"X-Requested-With": "fp"}


def make_client():
    return fp.app.test_client()


def signup(client, email, name="Test"):
    return client.post("/auth/register", json={"name": name, "email": email, "password": "password123"}, headers=H)


class AuthTests(unittest.TestCase):
    def test_pages_need_login(self):
        c = make_client()
        r = c.get("/")
        self.assertEqual(r.status_code, 302)
        self.assertIn("/login", r.headers["Location"])
        self.assertEqual(c.get("/api/data/crops").status_code, 405)
        self.assertEqual(c.put("/api/data/crops", json={"value": []}, headers=H).status_code, 401)

    def test_register_login_logout(self):
        c = make_client()
        self.assertEqual(signup(c, "a@example.com").status_code, 200)
        self.assertEqual(c.get("/").status_code, 200)
        self.assertEqual(signup(make_client(), "a@example.com").status_code, 409)
        c.post("/auth/logout", headers=H)
        self.assertEqual(c.get("/").status_code, 302)
        bad = make_client().post("/auth/login", json={"email": "a@example.com", "password": "wrongpass1"}, headers=H)
        self.assertEqual(bad.status_code, 401)
        ok = make_client().post("/auth/login", json={"email": "a@example.com", "password": "password123"}, headers=H)
        self.assertEqual(ok.status_code, 200)

    def test_validation(self):
        c = make_client()
        self.assertEqual(c.post("/auth/register", json={"name": "x", "email": "nope", "password": "password123"}, headers=H).status_code, 400)
        self.assertEqual(c.post("/auth/register", json={"name": "x", "email": "b@example.com", "password": "short"}, headers=H).status_code, 400)

    def test_csrf_header_required(self):
        r = make_client().post("/auth/login", json={"email": "a@example.com", "password": "x"})
        self.assertEqual(r.status_code, 403)

    def test_phone_otp_flow(self):
        c = make_client()
        r = c.post("/auth/otp/request", json={"phone": "98765 43210"}, headers=H)
        self.assertEqual(r.status_code, 200)
        code = r.get_json()["demo_code"]
        self.assertEqual(c.post("/auth/otp/verify", json={"phone": "9876543210", "code": "000000" if code != "000000" else "111111"}, headers=H).status_code, 400)
        self.assertEqual(c.post("/auth/otp/verify", json={"phone": "9876543210", "code": code, "name": "Ram"}, headers=H).status_code, 200)
        self.assertEqual(c.get("/").status_code, 200)
        self.assertEqual(c.post("/auth/otp/request", json={"phone": "12345"}, headers=H).status_code, 400)

    def test_google_login_with_mock(self):
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                body = json.dumps({"aud": "cid", "email": "g@example.com", "email_verified": "true", "sub": "123", "name": "Gita"}).encode()
                self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(body)
            def log_message(self, *a): pass
        srv = HTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        os.environ["GOOGLE_CLIENT_ID"] = "cid"
        os.environ["GOOGLE_TOKENINFO_URL"] = "http://127.0.0.1:%d/tokeninfo" % srv.server_port
        try:
            c = make_client()
            self.assertEqual(c.post("/auth/google", json={"credential": "tok"}, headers=H).status_code, 200)
            self.assertEqual(c.get("/").status_code, 200)
            os.environ["GOOGLE_CLIENT_ID"] = "other"
            self.assertEqual(make_client().post("/auth/google", json={"credential": "tok"}, headers=H).status_code, 401)
        finally:
            os.environ.pop("GOOGLE_CLIENT_ID"); os.environ.pop("GOOGLE_TOKENINFO_URL"); srv.shutdown()


class DataTests(unittest.TestCase):
    def test_roundtrip_and_isolation(self):
        a, b = make_client(), make_client()
        signup(a, "d1@example.com"); signup(b, "d2@example.com")
        crops = [{"id": 1, "name": "Wheat", "field": "North", "area": 42, "status": "Growing", "date": "2026-09-15", "color": "x"}]
        self.assertEqual(a.put("/api/data/crops", json={"value": crops}, headers=H).status_code, 200)
        html = a.get("/crops.html").get_data(as_text=True)
        self.assertIn('"Wheat"', html)
        self.assertNotIn('"Wheat"', b.get("/crops.html").get_data(as_text=True))
        self.assertEqual(a.put("/api/data/labour", json={"value": [{"id": 5, "name": "R", "wage": 500, "attendance": {"2026-10-01": "P"}}]}, headers=H).status_code, 200)
        self.assertIn('"2026-10-01"', a.get("/labour.html").get_data(as_text=True))

    def test_empty_list_is_remembered(self):
        c = make_client(); signup(c, "e@example.com")
        self.assertIn('"fp_data"' if False else "window.__FP_DATA__ = {}", c.get("/").get_data(as_text=True))
        c.put("/api/data/tasks", json={"value": []}, headers=H)
        self.assertIn('"tasks": []', c.get("/").get_data(as_text=True))

    def test_bad_data_rejected(self):
        c = make_client(); signup(c, "f@example.com")
        self.assertEqual(c.put("/api/data/crops", json={"value": "nope"}, headers=H).status_code, 400)
        self.assertEqual(c.put("/api/data/crops", json={"value": [1, 2]}, headers=H).status_code, 400)
        self.assertEqual(c.put("/api/data/unknown", json={"value": []}, headers=H).status_code, 404)
        self.assertEqual(c.put("/api/data/crops", json={"value": [{"id": i} for i in range(2001)]}, headers=H).status_code, 400)

    def test_script_injection_is_escaped(self):
        c = make_client(); signup(c, "g@example.com")
        c.put("/api/data/crops", json={"value": [{"id": 1, "name": "</script><script>alert(1)</script>"}]}, headers=H)
        html = c.get("/crops.html").get_data(as_text=True)
        self.assertNotIn("</script><script>alert(1)", html)

    def test_delete_account(self):
        c = make_client(); signup(c, "h@example.com")
        c.put("/api/data/crops", json={"value": [{"id": 1, "name": "X"}]}, headers=H)
        self.assertEqual(c.delete("/api/account", headers=H).status_code, 200)
        self.assertEqual(c.get("/").status_code, 302)
        self.assertEqual(make_client().post("/auth/login", json={"email": "h@example.com", "password": "password123"}, headers=H).status_code, 401)

    def test_all_pages_render(self):
        c = make_client(); signup(c, "p@example.com")
        for p in ["index", "crops", "finance", "inventory", "machinery", "labour", "tasks", "assistant", "settings"]:
            self.assertEqual(c.get("/%s.html" % p).status_code, 200, p)
        self.assertEqual(c.get("/nope.html").status_code, 404)


class AssistantTests(unittest.TestCase):
    def ask(self, c, text):
        return c.post("/api/assistant", json={"message": text}, headers=H)

    def test_requires_login(self):
        self.assertEqual(self.ask(make_client(), "hi").status_code, 401)

    def test_knowledge_base(self):
        c = make_client(); signup(c, "k@example.com")
        r = self.ask(c, "how to grow wheat").get_json()
        self.assertEqual(r["source"], "knowledge-base")
        self.assertIn("Rabi", r["reply"])
        self.assertIn("Nov", self.ask(c, "gehu kab boye").get_json()["reply"])
        self.assertIn("Black soil", self.ask(c, "black soil").get_json()["reply"])
        self.assertIn("Wheat", self.ask(c, "which crop for rabi season in black soil").get_json()["reply"])
        pest = self.ask(c, "spray for aphids").get_json()["reply"]
        self.assertIn("will not guess a pesticide dose", pest)
        self.assertEqual(self.ask(c, "").status_code, 400)

    def test_llm_mode_and_fallback(self):
        seen = {}
        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                n = int(self.headers["Content-Length"]); seen["body"] = json.loads(self.rfile.read(n)); seen["path"] = self.path
                seen["key"] = self.headers.get("x-api-key") or self.headers.get("Authorization")
                if self.path.endswith("/messages"):
                    out = {"content": [{"type": "text", "text": "mock anthropic reply"}]}
                else:
                    out = {"choices": [{"message": {"content": "mock openai reply"}}]}
                b = json.dumps(out).encode(); self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(b)
            def log_message(self, *a): pass
        srv = HTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        base = "http://127.0.0.1:%d" % srv.server_port
        c = make_client(); signup(c, "l@example.com")
        try:
            os.environ.update(ANTHROPIC_API_KEY="k1", ANTHROPIC_MODEL="m1", ANTHROPIC_BASE_URL=base)
            r = self.ask(c, "tell me about wheat").get_json()
            self.assertEqual((r["source"], r["reply"]), ("llm", "mock anthropic reply"))
            self.assertEqual(seen["key"], "k1")
            self.assertIn("Rabi", seen["body"]["system"])  # grounded with crop facts
            for k in ("ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "ANTHROPIC_BASE_URL"):
                os.environ.pop(k)
            os.environ.update(LLM_BASE_URL=base, LLM_API_KEY="k2", LLM_MODEL="m2")
            r = self.ask(c, "hello").get_json()
            self.assertEqual((r["source"], r["reply"]), ("llm", "mock openai reply"))
            os.environ["LLM_BASE_URL"] = "http://127.0.0.1:1"  # unreachable -> falls back
            r = self.ask(c, "how to grow wheat").get_json()
            self.assertEqual(r["source"], "knowledge-base")
        finally:
            for k in ("LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"):
                os.environ.pop(k, None)
            srv.shutdown()


class PwaTests(unittest.TestCase):
    def test_manifest_and_sw(self):
        c = make_client()
        self.assertEqual(c.get("/manifest.webmanifest").get_json()["short_name"], "FieldPilot")
        r = c.get("/sw.js")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers["Service-Worker-Allowed"], "/")
        self.assertEqual(c.get("/static/icons/icon-192.png").status_code, 200)
        self.assertEqual(c.get("/healthz").get_data(as_text=True), "ok")


class KnowledgeBaseTests(unittest.TestCase):
    def test_all_crops_answerable(self):
        for slug, crop in kb.CROPS.items():
            reply, matched = kb.answer("how to grow " + crop["name"].split(" (")[0])
            self.assertTrue(matched, slug)


if __name__ == "__main__":
    unittest.main()
