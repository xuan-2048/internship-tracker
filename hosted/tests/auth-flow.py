"""Run against a local preview configured with tests/mock-auth.mjs, never production."""
import http.cookiejar
import json
from urllib.error import HTTPError
from urllib.request import build_opener, HTTPCookieProcessor, Request

BASE = "http://127.0.0.1:5173"


def client():
    jar = http.cookiejar.CookieJar()
    browser = build_opener(HTTPCookieProcessor(jar))
    browser.test_cookiejar = jar
    return browser


def call(browser, path, method="GET", payload=None, origin=None):
    headers = {"Content-Type": "application/json"}
    if origin:
        headers["Origin"] = origin
    request = Request(BASE + path, method=method,
                      data=json.dumps(payload).encode() if payload is not None else None,
                      headers=headers)
    try:
        response = browser.open(request)
    except HTTPError as error:
        response = error
    with response:
        body = response.read().decode()
        return response.status, json.loads(body) if "application/json" in response.headers.get("Content-Type", "") else body


first, second = client(), client()
assert call(first, "/api/applications")[0] == 401
assert call(first, "/api/auth/reset", "POST", {"password": "synthetic-new-password", "confirmPassword": "synthetic-new-password"})[0] == 401
assert call(first, "/api/auth/login", "POST", {"email": "qa1@example.test", "password": "wrong"})[0] == 401
assert call(first, "/api/auth/login", "POST", {"email": "qa1@example.test", "password": "synthetic-test-password"}, "https://other.example")[0] == 403
for number, browser in [(1, first), (2, second)]:
    assert call(browser, "/api/auth/login", "POST", {"email": f"qa{number}@example.test", "password": "synthetic-test-password"})[0] == 200
    assert call(browser, "/api/auth/session")[1]["email"] == f"qa{number}@example.test"
    assert any(cookie.has_nonstandard_attr("HttpOnly") for cookie in browser.test_cookiejar)
status, row = call(first, "/api/applications", "POST", {"company": "Auth flow test", "role": "Intern"})
assert status == 201
record_path = f'/api/applications/{row["id"]}'
assert any(item["id"] == row["id"] for item in call(first, "/api/applications")[1])
assert all(item["id"] != row["id"] for item in call(second, "/api/applications")[1])
assert call(second, record_path, "PUT", {"company": "Unauthorized", "role": "Intern"})[0] == 404
assert call(second, record_path, "DELETE")[0] == 404
assert call(first, record_path, "DELETE")[0] == 200
assert call(first, "/api/auth/forgot", "POST", {"email": "unknown@example.test"})[1]["message_code"] == "reset_sent"
assert call(first, "/api/auth/register", "POST", {"email": "new@example.test", "password": "synthetic-test-password", "confirmPassword": "synthetic-test-password"})[1]["message_code"] == "check_email"
assert call(first, "/api/auth/logout", "POST", {})[0] == 200
assert call(first, "/api/applications")[0] == 401
assert call(first, "/api/auth/session")[0] == 401
assert call(second, "/api/auth/reset", "POST", {"password": "synthetic-new-password", "confirmPassword": "synthetic-new-password"})[0] == 200
assert call(second, "/api/applications")[0] == 401
print("Local auth fixture: login, cookies, signup/reset responses, logout, CSRF, and user isolation passed.")
