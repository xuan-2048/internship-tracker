# Scheduled deployment handoff

The user requested deployment and the GitHub update on **November 6, 2026, at 9:00 AM America/New_York**, rather than publishing the new changes today. A one-time heartbeat is attached to this chat. Read the latest chat before acting on this plan.

## Current local version

- Python standard-library server, SQLite, static HTML/CSS/JavaScript.
- Run `python3 backend/server.py`, or double-click `Start Tracker.command` on macOS.
- New task fields: `next_step_due_date` (optional YYYY-MM-DD string) and `next_step_done` (JSON boolean).
- Existing SQLite databases gain the new columns automatically without replacing records.
- Pending views include overdue tasks and the next seven calendar days; completed tasks have their own view. Rejected and withdrawn applications are excluded from pending tasks.
- Personal data is under ignored `data/`; never include it in a source upload.

## Hosted version to prepare during the scheduled follow-up

Use the Sites skill and its current instructions. The Python development server is not a production hosting target. Adapt the JSON API to the supported server runtime and durable database, preserving the current data contract, UI translations, and task behavior. Retain the local Python version and its startup instructions.

The website is for the user's personal use. Keep the Site owner-private and protect the API as well as the page. Public GitHub source visibility does not authorize publishing personal application records. Use empty hosted storage initially; obtain explicit authorization before migrating local personal records to cloud storage. Explain that local and hosted databases are separate unless a migration or synchronization feature is implemented.

No Site has been registered or deployed yet. Discover the actual hosting and access setup through the Sites tools. Avoid inventing a URL or implying that the current localhost URL is available from other devices.

## Verification and delivery

1. Run the Python integration tests and JavaScript task-date tests described in README.
2. Verify hosted create/edit/status updates, task completion/reopening, and persistence with disposable demo records.
3. Check English/Chinese switching and local-calendar task boundaries.
4. Ensure another visitor cannot read or modify the user's data.
5. Remove disposable demo records, publish the owner-private Site, and use the returned URL as deployment evidence.
6. Push source and documentation to `xuan-2048/internship-tracker`, excluding local data and credentials.
7. Give the user the working website URL and brief instructions. Report any remaining login or permission step concretely.
