from contextlib import closing
import http.client
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from server import connect, create_server, init_db


class ApplicationAPI(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "test.db"
        self.server = create_server(0, self.path)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, method, path="/api/applications", body=None, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        try:
            connection.request(method, path, json.dumps(body) if body is not None else None,
                               headers or {"Content-Type": "application/json"})
            response = connection.getresponse()
            content = response.read()
            return response.status, json.loads(content) if "application/json" in response.getheader("Content-Type", "") else content
        finally:
            connection.close()

    def test_application_lifecycle_and_reopen(self):
        self.assertEqual(self.request("GET"), (200, []))
        payload = {"company": "学生's 公司", "role": "Backend Intern", "notes": "<script>alert(1)</script>", "deadline": "2026-12-01"}
        status, application = self.request("POST", body=payload)
        self.assertEqual(status, 201)
        self.assertEqual(application["status"], "saved")
        item_path = f'/api/applications/{application["id"]}'
        payload["status"] = "interview"
        status, updated = self.request("PUT", item_path, payload)
        self.assertEqual(status, 200)
        self.assertEqual(updated["status"], "interview")
        self.assertEqual(updated["notes"], payload["notes"])
        init_db(self.path)
        with closing(connect(self.path)) as db:
            self.assertEqual(db.execute("SELECT status FROM applications").fetchone()[0], "interview")
        self.assertEqual(self.request("GET")[1][0]["company"], payload["company"])
        self.assertEqual(self.request("DELETE", item_path)[0], 200)
        self.assertEqual(self.request("GET"), (200, []))
        self.assertEqual(self.request("DELETE", item_path)[0], 404)

    def test_reject_invalid_input_without_writing(self):
        invalid = [[], {"company": " ", "role": "Intern"},
                   {"company": "Acme", "role": "Intern", "status": "invalid"},
                   {"company": "Acme", "role": "Intern", "deadline": "2026-02-30"},
                   {"company": "Acme", "role": "Intern", "url": "javascript:alert(1)"},
                   {"company": "Acme", "role": "Intern", "id": 99},
                   {"company": 10, "role": "Intern"}]
        for payload in invalid:
            with self.subTest(payload=payload):
                self.assertEqual(self.request("POST", body=payload)[0], 400)
        self.assertEqual(self.request("GET")[1], [])
        self.assertEqual(self.request("PUT", "/api/applications/999", {"company": "Acme", "role": "Intern"})[0], 404)

    def test_assets_and_request_boundaries(self):
        for asset in ("/", "/app.js", "/styles.css"):
            self.assertEqual(self.request("GET", asset)[0], 200)
        for asset in ("/.git/config", "/data/tracker.db", "/../backend/server.py"):
            self.assertEqual(self.request("GET", asset)[0], 404)
        self.assertEqual(self.request("POST", body={"company": "A", "role": "B"},
                                      headers={"Content-Type": "application/json", "Origin": "https://example.com"})[0], 403)
        self.assertEqual(self.request("POST", body={}, headers={"Content-Type": "text/plain"})[0], 415)


if __name__ == "__main__":
    unittest.main()
