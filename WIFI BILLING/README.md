# WiFi Billing — Local Hosting Guide

Quick steps to host this demo on your local network so devices on your Wi‑Fi can access it.

1) Quick local test (Windows, macOS, Linux)

```bash
# from the project folder
# start a simple static server on port 8000
python -m http.server 8000
# open in browser on the same machine:
# http://localhost:8000/index.html
```

2) Host on a Raspberry Pi (recommended for always-on local hosting)

- Copy the project to the Pi (scp, rsync, or clone the repo).
- Install Python (usually preinstalled) or Node if you prefer `serve`.

Systemd service example (runs Python simple server on port 8000):

Create `/home/pi/wifi-billing.service` with:

```
[Unit]
Description=WiFi Billing static server
After=network-online.target

[Service]
WorkingDirectory=/home/pi/WIFI-BILLING
ExecStart=/usr/bin/python3 -m http.server 8000
Restart=on-failure
User=pi

[Install]
WantedBy=multi-user.target
```

Enable & start:

```bash
# copy files to /home/pi/WIFI-BILLING
sudo systemctl daemon-reload
sudo systemctl enable wifi-billing.service
sudo systemctl start wifi-billing.service
sudo journalctl -u wifi-billing.service -f
```

3) Make it reachable on your Wi‑Fi
- Ensure the Pi or server is connected to your Wi‑Fi and get its local IP: `hostname -I` or `ip addr`.
- Optionally reserve a DHCP lease in your router or set a static IP on the Pi (edit `/etc/dhcpcd.conf` or use your router's reservation feature).
- Access from other devices on the same Wi‑Fi: `http://<device-ip>:8000/index.html`.

4) Optional: run on port 80 (root required) or use a reverse proxy (NGINX)
- Running on port 80 requires sudo or a reverse proxy. Example using `npx serve` to run as unprivileged user and reverse-proxy via NGINX if needed.

5) Notes & troubleshooting
- This demo stores data in the browser `localStorage` per browser/profile — data is not shared across clients.
- To allow multiple devices to share data you must add a backend (I can scaffold a Node/Express API to persist data centrally).
- Firewall: ensure port 8000 is allowed on the host.

If you want, I can:
- scaffold a minimal Node/Express JSON backend so multiple devices share the same dataset, or
- create an NGINX reverse-proxy configuration and a secure HTTPS setup for local network use.
