# PEDS POS Integration via Tailscale

> **Status:** Testing / Implementation Guide  
> **Last Updated:** 2026-08-01  
> **Purpose:** Connect store-local PEDS POS (`localhost:2010`) to the cloud-hosted IMS backend using Tailscale mesh VPN.

---

## Overview

PEDS POS runs on Windows PCs inside each store and only exposes a REST API on `localhost:2010`. The IMS backend needs to reach this API to:

- Push pre-sales (hold sales) to PEDS
- Check invoice status, payment status, void status
- Receive callback webhooks from PEDS when sales are printed/paid

Since `localhost:2010` is not reachable from the cloud, we use **Tailscale** to create a secure, encrypted WireGuard tunnel between the store PC and the IMS backend server.

| Component | Role |
|-----------|------|
| Store PC (Windows) | Runs PEDS POS + Tailscale client |
| Cloud VPS | Runs IMS Node.js backend + Tailscale client |
| Tailscale Control Plane | Authenticates and routes traffic between devices |

---

## Architecture

```
┌─────────────────┐         Tailscale VPN          ┌─────────────────┐
│   Store PC      │ ◄────────────────────────────► │   Cloud VPS     │
│   Windows       │    Encrypted WireGuard tunnel  │   Ubuntu + IMS  │
│                 │                                │                 │
│  PEDS POS       │                                │  Node.js API    │
│  localhost:2010 │                                │  MongoDB        │
│     ▲           │                                │     │           │
│     │           │                                │     ▼           │
│  Tailscale      │                                │  Calls PEDS     │
│  100.x.y.z      │                                │  via 100.x.y.z  │
└─────────────────┘                                └─────────────────┘
```

- No public IP or port forwarding needed.
- No DNS changes needed.
- Traffic is end-to-end encrypted.

---

## Prerequisites

1. A **Tailscale account** (free tier supports up to 20 devices).
2. Admin access to the store PC (Windows).
3. SSH access to the cloud VPS running IMS.
4. PEDS POS installed and running on the store PC.

---

## Step 1: Install Tailscale on the Store PC

1. Download the installer:
   ```powershell
   Invoke-WebRequest -Uri "https://pkgs.tailscale.com/stable/tailscale-setup-latest.exe" -OutFile "$env:TEMP\tailscale-setup.exe"
   ```

2. Run the installer:
   ```powershell
   Start-Process -FilePath "$env:TEMP\tailscale-setup.exe" -ArgumentList "/S" -Wait
   ```

3. Start Tailscale and authenticate:
   ```powershell
   & "C:\Program Files\Tailscale\tailscale.exe" up
   ```
   A browser window will open — log in with your Tailscale account.

4. Get the Tailscale IP:
   ```powershell
   & "C:\Program Files\Tailscale\tailscale.exe" ip -4
   ```
   Save this IP (e.g., `100.64.23.10`). You will need it for IMS configuration.

---

## Step 2: Install Tailscale on the Cloud VPS

SSH into your Ubuntu/Debian VPS:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Copy the printed link to your browser, log in with the **same Tailscale account**, and authorize the device.

Get the Tailscale IP:
```bash
tailscale ip -4
```

---

## Step 3: Verify Tailscale Connectivity

From the **cloud VPS**, ping the store PC:

```bash
ping <STORE_TAILSCALE_IP>
```

Then test HTTP connectivity to PEDS:

```bash
curl http://<STORE_TAILSCALE_IP>:2010
```

- If PEDS responds (even with a 404 or auth error), the tunnel is working.
- If it times out, check that PEDS is running and Windows Firewall allows port `2010`.

---

## Step 4: Configure IMS Store Document

In MongoDB, update the store document for the store that has PEDS:

```json
{
  "pedsEnabled": true,
  "pedsBaseUrl": "http://<STORE_TAILSCALE_IP>:2010",
  "pedsPosId": "POS-001",
  "pedsMachineId": "AAD0001230",
  "pedsUsername": "<peds_api_username>",
  "pedsPassword": "<peds_api_password>"
}
```

Replace:
- `<STORE_TAILSCALE_IP>` — the Tailscale IP from Step 1.
- `<peds_api_username>` / `<peds_api_password>` — the PEDS API credentials.

---

## Step 5: Test via IMS API

If the IMS backend is running, test the built-in connectivity endpoint:

```bash
curl -X POST http://<IMS_BACKEND_URL>/api/peds/<STORE_ID>/test-connection \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Expected response (success):**
```json
{
  "connected": true,
  "message": "PEDS responded successfully"
}
```

**Expected response (failure):**
```json
{
  "connected": false,
  "message": "Connection timeout"
}
```

---

## Step 6: Run Tailscale as a Windows Service (On-Demand)

Tailscale installs itself as a Windows service by default. To control it manually (temporary tunnel during business hours):

```powershell
# Start Tailscale
Start-Service -Name "Tailscale"

# Stop Tailscale
Stop-Service -Name "Tailscale"

# Check status
Get-Service -Name "Tailscale"
```

To make it start automatically on boot:
```powershell
Set-Service -Name "Tailscale" -StartupType Automatic
```

To disable auto-start (fully manual):
```powershell
Set-Service -Name "Tailscale" -StartupType Manual
```

---

## Optional: Enable MagicDNS

In the [Tailscale admin console](https://login.tailscale.com/admin/dns), enable **MagicDNS**. Each machine gets a hostname like:

```
store-pc.your-email.gmail.com.beta.tailscale.net
```

You can then use the hostname instead of the IP in the IMS `pedsBaseUrl`:

```json
{
  "pedsBaseUrl": "http://store-pc.your-email.gmail.com.beta.tailscale.net:2010"
}
```

---

## Security Notes

- Tailscale traffic is **end-to-end encrypted** with WireGuard. No one (not even Tailscale) can read it.
- **No public exposure** — PEDS is only reachable inside your Tailnet.
- If you want extra restriction, enable **ACLs** in the Tailscale admin console to allow only the IMS VPS to reach the store PC on port `2010`.
- Keep the store PC's Windows Firewall active. Tailscale does not bypass it.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ping` works but `curl` to `:2010` fails | PEDS not running or Windows Firewall blocking port `2010` | Start PEDS. Add Windows Firewall inbound rule for port `2010`. |
| `ping` fails | Tailscale not running on one side | `Start-Service -Name "Tailscale"` on Windows; `sudo tailscale up` on Linux. |
| IMS says `connected: false` | Wrong `pedsBaseUrl` or credentials | Double-check the Tailscale IP and PEDS credentials in MongoDB. |
| `ETIMEDOUT` | Network path blocked or Tailscale ACLs too restrictive | Check ACL rules in Tailscale admin console. |
| `ECONNREFUSED` | PEDS is not listening on `0.0.0.0` | PEDS may only bind to `localhost`. This is fine with Tailscale because Tailscale provides a local interface. Verify PEDS is actually running. |

---

## Files Changed for PEDS Integration

### Backend (`api/`)
- `src/routes/peds.js` — PEDS proxy routes and callback webhooks
- `src/services/peds.js` — PEDS API client
- `src/models/Stores.js` — Added PEDS fields
- `src/models/Sale.js` — Added PEDS fields
- `src/models/Products.js` — Added `pedsItemId` and `taxType`
- `src/routes/sales.js` — Integration with PEDS hold sales
- `src/app.js` — Mounted `/api/peds` routes

### Frontend (`app/`)
- `src/features/stores/` — Added PEDS configuration fields to store form

### Documentation
- `docs/PEDS_TAILSCALE.md` — This file
- `peds_api_notes.txt` — PEDS API field notes
- `peds_rest_api.txt` — PEDS REST API reference

---

## Next Steps

1. [ ] Install Tailscale on store PC and cloud VPS.
2. [ ] Verify `ping` and `curl` between the two devices.
3. [ ] Update store `pedsBaseUrl` in MongoDB.
4. [ ] Run IMS connectivity test endpoint.
5. [ ] Test end-to-end: create a sale in IMS → push to PEDS → complete sale in PEDS → verify callback creates sale in IMS.
6. [ ] Set up Windows Task Scheduler to start/stop Tailscale during business hours (optional).

---

*For questions or issues, check the Tailscale logs:*
```powershell
Get-EventLog -LogName Application -Source "Tailscale"
```
