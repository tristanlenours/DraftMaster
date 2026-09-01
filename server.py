#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Serveur local pour la WebApp MTG Cube Draft Mastery avec routing SPA et relais Slack Webhook.
Usage: python server.py
"""
import http.server
import socketserver
import webbrowser
import os
import sys
import json
import urllib.request
from pathlib import Path

# Encodage console Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PORT = 8080
DIRECTORY = Path(__file__).resolve().parent

# Chargement du .env pour récupérer SLACK_WEBHOOK_URL_MTG
def load_env():
    search_dirs = [Path.cwd(), Path(__file__).resolve().parent] + list(Path(__file__).resolve().parents)
    for folder in search_dirs:
        env_file = folder / ".env"
        if env_file.is_file():
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip().strip("\"'"))
            return

load_env()

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def do_GET(self):
        # Routing SPA : si le chemin ne pointe pas vers un fichier existant avec extension, servir index.html
        clean_path = self.path.split("?")[0].lstrip("/")
        file_path = DIRECTORY / clean_path

        if clean_path and file_path.is_file():
            return super().do_GET()
        elif any(clean_path.endswith(ext) for ext in [".js", ".css", ".json", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".webp", ".txt", ".csv"]):
            return super().do_GET()
        else:
            # Réécrire vers index.html pour le routing SPA (/draft, /cartes, /deck, /trophees, /records, etc.)
            self.path = "/index.html"
            return super().do_GET()

    def do_POST(self):
        if self.path == "/api/slack":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                data = json.loads(body)
                webhook_url = data.get("webhook_url") or os.getenv("SLACK_WEBHOOK_URL_MTG") or os.getenv("SLACK_WEBHOOK_URL")

                if not webhook_url:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Aucun webhook Slack configuré"}).encode("utf-8"))
                    return

                payload = data.get("payload", {})
                req = urllib.request.Request(
                    webhook_url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json; charset=utf-8"},
                    method="POST"
                )

                with urllib.request.urlopen(req, timeout=10) as resp:
                    resp_body = resp.read().decode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "slack_response": resp_body}).encode("utf-8"))

            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

def main():
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        url = f"http://localhost:{PORT}/cartes"
        print("=" * 60)
        print("🎴 MTG Cube Draft Mastery (SPA Routing & PWA)")
        print(f"👉 Serveur local : {url}")
        print(f"👉 Salon de draft : http://localhost:{PORT}/draft")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nArrêt du serveur.")

if __name__ == "__main__":
    main()
