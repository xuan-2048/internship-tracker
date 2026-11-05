#!/bin/zsh
# Double-click this file in Finder to start the local app and open your browser.
cd -- "${0:A:h}" || exit 1
python3 - <<'PY'
from pathlib import Path
import sys
import webbrowser

sys.path.insert(0, str(Path.cwd() / "backend"))
from server import create_server

try:
    server = create_server()
except OSError as error:
    print(f"Could not start the app: {error}")
    print("Port 8000 may already be in use. If the tracker is running, open http://127.0.0.1:8000")
    input("Press Enter to close.")
    raise SystemExit(1)

print("Internship Tracker: http://127.0.0.1:8000", flush=True)
print("Keep this window open while using the app. Press Control+C to stop.", flush=True)
webbrowser.open("http://127.0.0.1:8000")
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
PY
