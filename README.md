# Internship Tracker

A web application for students to organize internship applications, track recruiting stages, and keep their next steps in one place. Includes a local Python/SQLite version and a hosted version with account-based access.

The local version uses **Python, SQLite, and vanilla JavaScript**, with no third-party runtime dependencies. The hosted version adds **TypeScript, Vinext, Cloudflare D1, and Supabase email/password authentication**.

## Hosted Website

[Open Internship Tracker](https://internship-tracker-xuan.cheerfuloriole4.chatgpt.site)

The registration and sign-in pages are publicly accessible; application records require a verified account and are scoped to that account. A ChatGPT account is not required.

**Email delivery limitation:** the current Supabase default sender only delivers verification and recovery messages to project-team addresses. General public registration needs a production SMTP sender. Real mailbox signup, email confirmation, and recovery still need owner-performed verification. See [authentication setup and verification status](hosted/AUTH_SETUP.md).

Hosted records are stored online in D1 and scoped to the authenticated user. Local SQLite records are separate and are not automatically uploaded or synchronized. See [hosted/README.md](hosted/README.md) for the production implementation.

## Features

- **Application management:** create, edit, and delete applications with a confirmation step before deletion.
- **Recruiting stages:** track Saved, Applied, Assessment, Interview, Offer, Rejected, and Withdrawn statuses.
- **Job details:** store the company, role, posting URL, application date, and application deadline.
- **Next steps and notes:** record follow-up actions, task due dates, completion status, resume versions, and interview notes.
- **Next up:** see overdue tasks, tasks due today, or tasks due within the next seven days; complete or reopen a task.
- **Search and filters:** search companies, roles, and notes; filter by status or applications with a next step.
- **Dashboard:** view counts for all opportunities, active applications, interviews, and offers.
- **Persistent storage:** use SQLite locally or Cloudflare D1 in the hosted version.
- **Account access (hosted):** email/password pages, confirmation and recovery callbacks, server-verified sessions, HttpOnly cookies, and per-user API authorization. Mailbox delivery remains subject to the limitation above.
- **Responsive layout:** adapt the interface to narrow screens, with horizontal scrolling for the application table.

Use the language selector to switch between **English** and **Simplified Chinese**. English is the default; your preference is saved in browser local storage. Switching languages preserves application data, filters, and unsaved form values. API errors are translated for display in the selected language.

## Quick Start

### Requirements

- Python 3.10 or newer with SQLite support.
- A modern web browser.
- Git to clone the repository.

```bash
git clone https://github.com/xuan-2048/internship-tracker.git
cd internship-tracker
python3 backend/server.py
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser. Press `Ctrl+C` in the terminal to stop the server.

If port 8000 is in use:

```bash
python3 backend/server.py --port 8001
```

Then open [http://127.0.0.1:8001](http://127.0.0.1:8001).

**macOS shortcut:** double-click `Start Tracker.command` in Finder to start the server and open your default browser. Keep the Terminal window open while using the app. If another copy is already running, stop it with `Control+C` before starting the updated version.

The application starts with an empty list. Add an application, update its status, and refresh the page to confirm that the record is saved.

## Architecture

```text
Browser form
    -> JavaScript fetch request
    -> Python HTTP handler and input validation
    -> SQLite database
    -> JSON response and UI update
```

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | HTML, CSS, JavaScript | Forms, dashboard, search, filters, and API requests |
| Backend | Python standard library | HTTP routing, field validation, and database access |
| Database | SQLite | Local persistent application records |
| Tests | Python unittest | HTTP API integration tests using temporary databases |
| Hosted backend | TypeScript / Vinext on Cloudflare Workers | JSON routes and account authorization |
| Hosted database | Cloudflare D1 / Drizzle | Persistent records scoped to a verified user ID |
| Hosted identity | Supabase Auth / SSR | Email/password sessions and confirmation/recovery flows |

SQL statements use parameterized values. User-provided text is rendered through DOM `textContent`. The server exposes an explicit list of frontend assets rather than serving the project directory.

Search and filtering currently run in the browser after loading application records, keeping the first version simple for a personal application list.

In the hosted version, the server validates the Supabase user before every application request and applies an owner predicate to database reads, updates, and deletes. The browser cannot submit its own owner ID. Passwords are handled by Supabase Auth, not stored in the application database.

## Project Structure

```text
internship-tracker/
├── backend/
│   └── server.py       # HTTP API, validation, and SQLite access
├── frontend/
│   ├── index.html      # Dashboard and application form
│   ├── styles.css      # Styling and responsive layout
│   ├── app.js          # UI interactions and API requests
│   ├── i18n.js         # English / Chinese UI translations
│   └── tasks.js        # Local calendar dates and task filtering
├── tests/
│   ├── test_api.py     # API integration tests
│   └── tasks.test.cjs  # Task date boundary tests
├── hosted/             # TypeScript production server, auth pages, and D1 migrations
├── data/               # Generated local data; excluded from Git
├── .gitignore
└── README.md
```

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/applications` | List all applications |
| `POST` | `/api/applications` | Create an application |
| `PUT` | `/api/applications/{id}` | Replace an application's editable fields |
| `DELETE` | `/api/applications/{id}` | Delete an application |

`POST` and `PUT` accept `application/json`. Example request body:

```json
{
  "company": "Example Company",
  "role": "Software Engineer Intern",
  "url": "https://example.com/careers/intern",
  "status": "applied",
  "applied_date": "2026-11-05",
  "deadline": "2026-12-01",
  "next_step": "Prepare for the technical interview",
  "next_step_due_date": "2026-11-06",
  "next_step_done": false,
  "notes": "Submitted resume version 2."
}
```

- `company` and `role` are required, nonempty strings.
- Valid statuses: `saved`, `applied`, `assessment`, `interview`, `offer`, `rejected`, and `withdrawn`.
- Dates use `YYYY-MM-DD`; optional dates may be empty strings.
- `deadline` is the application deadline; `next_step_due_date` is the separate due date for the next-step task.
- `next_step_done` is a JSON boolean. Setting a task due date or completion status requires a nonempty `next_step`.
- `PUT` is a full replacement: omitted optional fields reset to their defaults.
- `id`, `created_at`, and `updated_at` are generated by the server; timestamps use UTC.

## Testing

Run the API integration tests from the project root:

```bash
python3 -m unittest discover -s tests -v
```

The tests cover the create/read/update/delete lifecycle, reopening the database, invalid input, asset access boundaries, and request-origin restrictions. They use temporary databases and do not modify personal application records.

Optional JavaScript syntax check, if Node.js is installed:

```bash
node --check frontend/app.js
node --check frontend/i18n.js
node --check frontend/tasks.js
TZ=America/New_York node --test tests/tasks.test.cjs
```

Node.js is not required to run the local Python version. The hosted version has its own Node.js dependency lockfile and checks:

```bash
cd hosted
npm run install:ci
node node_modules/typescript/bin/tsc --noEmit
node --test tests/auth-input.test.cjs
npm run build
```

Validation completed: five local API tests, three task-calendar tests, four auth-input/redirect tests, and a hosted production build. A local synthetic-provider integration test verified cookies, login/logout, recovery responses, cross-origin rejection, and per-user isolation. Production smoke checks verified the login/register pages return 200, anonymous data requests return 401, and invalid credentials are rejected. This does not replace real mailbox verification.

## Local Data

The server creates `data/tracker.db` on first launch. The database, Python caches, and environment files are excluded from version control.

To back up your records, stop the server and copy `data/tracker.db` to a separate location. Application data is stored locally; it is not synchronized to GitHub.

## Current Scope

The **local Python version** is a single-user development application bound to `127.0.0.1`; it has no authentication or user isolation and should not be exposed to the internet. The **hosted version** has a public sign-in entrypoint, Supabase-verified sessions, a production Worker, and user-scoped D1 database queries. It retains the email-delivery and verification limitations documented above.

Each application has one next-step task with an optional calendar due date and completion state. The default task view includes overdue tasks and the next seven days, independently of application-list filters. Rejected and withdrawn applications are excluded from pending tasks; completed tasks remain available in the Completed view. Dates follow the browser’s local calendar, including across midnight and daylight-saving changes. There are no email or system notifications yet. Status updates replace the current status; a status-history timeline is not implemented yet.

Existing local databases are automatically upgraded with the new task fields; previous records are retained.

## Roadmap

- [x] English and Simplified Chinese interface with a persistent language preference.
- [x] Task due dates, completion controls, and an upcoming-task view.
- [ ] Application status history.
- [ ] CSV import and export.
- [ ] Browser extension for saving job postings.
- [x] Hosted email/password authentication, per-user API authorization, and deployment.
- [ ] Production SMTP and owner-performed signup/confirmation/recovery verification.

## References

- [Python sqlite3 documentation](https://docs.python.org/3.12/library/sqlite3.html)
- [Python HTTP server documentation and limitations](https://docs.python.org/3/library/http.server.html)
