# Email access gate (Google Apps Script)

This adds an email + 6-digit code gate in front of the GST BOM Organizer on Netlify. Trimble addresses (`@trimble.com`, including subdomains) are auto-approved; other domains email **ethan_quam@trimble.com** for Grant/Deny.

**Local use** (`file://`, `localhost`) skips the gate. On Netlify, the gate turns on after you set `appsScriptUrl` in `access-config.js`.

---

## What you need

- Trimble Google Workspace account (for Apps Script + Gmail)
- Netlify site: `https://gstbomorganizer.netlify.app`
- ~20 minutes

---

## Step 1 — Create the Google Sheet

1. In Google Drive, create a spreadsheet named **GST BOM Organizer Access**.
2. Copy the **Spreadsheet ID** from the URL:  
   `https://docs.google.com/spreadsheets/d/`**`SHEET_ID_HERE`**`/edit`

---

## Step 2 — Add the Apps Script

1. In the spreadsheet: **Extensions → Apps Script**.
2. Delete any default code.
3. Paste the contents of **`scripts/access-gate-apps-script.gs`** from this repo.
4. Edit `CONFIG` at the top:
   - `SPREADSHEET_ID` — your sheet ID
   - `RECIPIENT_EMAIL` — `ethan_quam@trimble.com`
   - `APP_URL` — `https://gstbomorganizer.netlify.app`
5. **Save** the project (name it e.g. `GST BOM Access`).

---

## Step 3 — Deploy the web app

1. **Deploy → New deployment → Web app**
2. **Execute as:** Me  
3. **Who has access:** Anyone  
4. Deploy and copy the **`/exec`** URL (not `/dev`).

---

## Step 4 — Connect the static site

1. Open **`access-config.js`** in this repo.
2. Set `appsScriptUrl` to your `/exec` URL:

```javascript
appsScriptUrl: "https://script.google.com/macros/s/AKfycb.../exec",
```

3. Commit and push — Netlify redeploys automatically.

The gate is **off** until `appsScriptUrl` is set, so you can deploy safely first.

---

## Step 5 — Test

1. Open the Netlify URL in a **private/incognito** window.
2. Enter a `@trimble.com` address → you should receive a 6-digit code within a minute.
3. Enter the code → the BOM tool loads.
4. Test a personal email → you should see “pending approval” and receive a Grant/Deny email at `ethan_quam@trimble.com`.

---

## Sheet tabs (created automatically)

| Tab | Purpose |
|-----|---------|
| `AccessRequests` | Pending manual approvals |
| `ApprovedUsers` | Active grants + `expiresAt` |
| `AccessCodes` | Short-lived login codes |
| `Events` | Audit log |

---

## Config (keep in sync)

| Setting | Client (`access-config.js`) | Server (`CONFIG` in script) |
|---------|----------------------------|-----------------------------|
| App URL | `appUrl` | `APP_URL` |
| Grant length | `accessGrantDays` (28) | `ACCESS_GRANT_DAYS` |
| Code TTL | `accessCodeMinutes` (30) | `ACCESS_CODE_MINUTES` |
| Auto domains | `autoApproveDomains` | `AUTO_APPROVE_DOMAINS` |
| Admin inbox | — | `RECIPIENT_EMAIL` |

---

## Revoke access

Grant/Deny emails include a **revoke** link for each user. You can also delete their row in `ApprovedUsers` on the Sheet.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Gate never appears | Set `appsScriptUrl` in `access-config.js` and redeploy |
| “Could not reach access service” | Redeploy script as **Anyone**; use `/exec` URL |
| No email received | Check spam; confirm MailApp is allowed for your Workspace account |
| Code always invalid | Server/client clock skew is rare; request a new code (30 min TTL) |
| Tool loads without gate locally | Expected — gate is skipped on `file://` and localhost |

---

## Security notes

- Static files remain public; the gate blocks the app from loading until verified.
- This is appropriate for an **internal beta**, not a regulated production system.
- Do not commit real customer quotes. The disclaimer on the page still applies.
