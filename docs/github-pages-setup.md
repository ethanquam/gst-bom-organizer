# Host on GitHub Pages

Same hosting pattern as **Dynamic Converter**: static files in the repo, GitHub Actions deploys to Pages on every push to `main`.

**Live URL:** https://ethanquam.github.io/gst-bom-organizer/

## How it works

| Piece | Role |
|--------|------|
| Branch `main` | Source of the live site |
| `.github/workflows/deploy-pages.yml` | Builds and publishes on push |
| Email gate | Optional access control — see [access-gate-setup.md](access-gate-setup.md) |

Local double-click of `index.html` still works and skips the gate.

## Deploy updates

```powershell
git checkout main
git merge cursor/gst-bom-organizer-polish   # or commit on main
git push origin main
```

Watch progress: **GitHub → Actions → Deploy to GitHub Pages**.

## Access control

GitHub Pages is public (free tier). Use the **email access gate** so only approved people can run the app:

- Auto-approve `@trimble.com`
- Manual approve everyone else

See **[access-gate-setup.md](access-gate-setup.md)**.

Cloudflare Access remains an option later if IT grants you Zero Trust — see [cloudflare-access-setup.md](cloudflare-access-setup.md).

## Leaving Netlify

If you previously used `gstbomorganizer.netlify.app`:

1. Confirm the GitHub Pages URL works.
2. Update any shared links to the `github.io` URL.
3. In Netlify, delete or disable the site so credits stop being used.
4. If you already set up Apps Script, change `APP_URL` there to the GitHub Pages URL and redeploy the script.
