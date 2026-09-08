# Host on Cloudflare Pages with Access (@trimble.com)

This guide puts the GST BOM Organizer behind **Cloudflare Zero Trust / Access** so only Trimble staff (or a named allow list) can open the site. The app stays a static page; Access runs at the edge before any file is served.

**Not an official Trimble product** — use an internal URL and keep the repo private or team-only.

---

## What you get

| Piece | Role |
|--------|------|
| **Cloudflare Pages** | Hosts `index.html`, `app.js`, `styles.css`, and `brand/` |
| **Cloudflare Access** | Login gate: `@trimble.com` emails, one-time PIN, or Trimble SSO |
| **Local double-click** | Still works; `index.html` does not require Cloudflare |

Data still lives in each user’s browser (`localStorage`). Access only controls who can load the page.

---

## Prerequisites

1. A **Cloudflare account** (free tier works for Pages; Zero Trust has a free tier for small teams).
2. This folder in **Git** (GitHub, GitLab, or Bitbucket) — or deploy with Wrangler from your machine.
3. Permission to add a **custom domain** in Cloudflare (optional but recommended for internal tools), e.g. `gst-bom.internal.trimble.com` or a subdomain you control.

---

## Step 1 — Push the repo

If the repo is not on GitHub yet:

```bash
git init
git add index.html app.js styles.css brand README.md docs wrangler.toml .gitignore
git commit -m "Add GST BOM Organizer for Cloudflare Pages"
git branch -M main
# Create a private repo on GitHub, then:
git remote add origin https://github.com/YOUR-ORG/gst-bom-organizer.git
git push -u origin main
```

Use a **private** repository. Access protects the live URL, not your source code.

---

## Step 2 — Create a Cloudflare Pages project

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the repository and branch (`main`).
3. Build settings:
   - **Framework preset:** None
   - **Build command:** (leave empty)
   - **Build output directory:** `/` (project root)
4. **Save and deploy**.

After the first deploy, note the URL, e.g. `https://gst-bom-organizer.pages.dev`.

Optional: **Custom domains** → add a hostname on a zone you manage in Cloudflare (orange-cloud proxied).

---

## Step 3 — Turn on Zero Trust (one time per account)

1. Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) (or **Zero Trust** in the left nav).
2. Complete the Zero Trust onboarding if prompted (pick a team name, e.g. `trimble-internal-tools`).

---

## Step 4 — Add an Access application

1. Zero Trust → **Access** → **Applications** → **Add an application**.
2. **Self-hosted**.
3. **Application name:** `GST BOM Organizer` (any label).
4. **Session duration:** e.g. 24 hours (adjust to your policy).
5. **Application domain:**
   - **Subdomain:** `gst-bom-organizer` (or your Pages subdomain)
   - **Domain:** `pages.dev`
   - Or use your **custom domain** hostname exactly as visitors will use it.
6. Leave **Accept all available identity providers** enabled for now (you’ll narrow in Step 5).
7. **Next** → **Add a policy** (or skip and add policy in Step 5).

---

## Step 5 — Policy: allow `@trimble.com`

1. Zero Trust → **Access** → **Policies** → **Add a policy** (or edit the policy on the app).
2. **Policy name:** `Trimble staff`
3. **Action:** Allow
4. **Configure rules** → **Include:**
   - **Selector:** Emails ending in
   - **Value:** `@trimble.com`
5. **Save**.

Attach this policy to the GST BOM Organizer application if it is not already linked.

### Allow specific people only (instead of whole domain)

Use **Include** → **Emails** and list addresses, or **Emails ending in** for `@trimble.com` plus **Exclude** for contractors you want to block.

Example include rule:

| Selector | Value |
|----------|--------|
| Emails ending in | `@trimble.com` |

Example add-on for named non-Trimble emails:

| Selector | Value |
|----------|--------|
| Emails | `partner@dealer.com` |

---

## Step 6 — Login methods

Zero Trust → **Settings** → **Authentication**.

Recommended for internal Trimble use:

| Method | When to use |
|--------|-------------|
| **One-time PIN** | Quick start; user enters `@trimble.com` email, gets a code in inbox |
| **Microsoft / Entra ID** | If Trimble IT allows SAML/OIDC for Cloudflare (best UX for employees) |
| **Google** | Only if Trimble mail is not on Google — usually not primary |

For **One-time PIN**:

1. **Authentication** → **Login methods** → enable **One-time PIN**.
2. Users open the site → enter Trimble email → receive PIN → access granted if policy matches.

For **Trimble SSO (Microsoft)**:

1. **Authentication** → **Login methods** → **Add** → **Microsoft** or **SAML**.
2. Work with Trimble IT for Entra ID app registration and redirect URLs Cloudflare provides.
3. Policy can still require `@trimble.com` on the email returned from IdP.

---

## Step 7 — Verify

1. Open the Pages URL in a **private/incognito** window.
2. You should see **Cloudflare Access** login, not the BOM Organizer immediately.
3. Sign in with a `@trimble.com` address → site loads.
4. Try a personal email → should be **blocked**.

---

## Deploy updates

**Git-connected Pages:** push to `main` → automatic deploy.

**Wrangler from your PC:**

```bash
npx wrangler pages deploy . --project-name=gst-bom-organizer
```

Requires `wrangler login` once.

---

## GitHub Actions (optional)

If you use the workflow in `.github/workflows/cloudflare-pages.yml`, add repository secrets:

| Secret | Where to get it |
|--------|------------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create → **Edit Cloudflare Workers** template (include Account + Pages) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard URL or **Workers & Pages** → right sidebar |

---

## Security notes

- Access protects the **hostname** you configured. Do not publish the same files to a second public host without Access.
- BOM data is **not** stored on Cloudflare; only static assets are hosted.
- Keep sample part numbers fake (`990…`) in demos; do not commit real customer quotes.
- Add an internal disclaimer in communications: unofficial helper tool, not a Trimble product.

---

## Troubleshooting

| Issue | Fix |
|--------|-----|
| Site loads without login | Access app hostname must match URL exactly; DNS must be **proxied** (orange cloud) |
| `@trimble.com` blocked | Check policy is **Allow** and attached to the app; check IdP email attribute |
| 404 on Pages | Build output directory must be `/` (root); `index.html` must be at repo root |
| Logo missing | Ensure `brand/trimble-logo-white.png` is committed and deployed |

---

## Quick checklist

- [ ] Private Git repo with static files at root
- [ ] Cloudflare Pages project deployed
- [ ] Custom domain (optional) proxied through Cloudflare
- [ ] Zero Trust Access application on that hostname
- [ ] Allow policy: `@trimble.com` (or your email list)
- [ ] One-time PIN or Trimble SSO enabled
- [ ] Tested blocked (personal email) and allowed (Trimble email)
