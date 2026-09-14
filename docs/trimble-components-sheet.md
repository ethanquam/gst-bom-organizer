# Trimble Components Sheet — knowledge base

Source: **[Completed] Trimble Components Sheet_2026** (Google Slides, Rev E July 2026).

This deck is image-heavy by design; Google Drive text export is the machine-readable source we parse into the BOM Organizer.

## What was imported

| Artifact | Purpose |
|----------|---------|
| [`data/sources/trimble-components-sheet-2026-rev-e.txt`](data/sources/trimble-components-sheet-2026-rev-e.txt) | Raw text export from Drive |
| [`data/trimble-components-catalog.json`](data/trimble-components-catalog.json) | 260 part + description + section + category rows |
| [`data/trimble-components-catalog.js`](data/trimble-components-catalog.js) | Same data for `file://` and Cloudflare (no fetch) |
| [`scripts/parse-components-sheet.ps1`](scripts/parse-components-sheet.ps1) | Re-parse when the deck is updated |

## How the app uses it

1. **Group lines** — if a part number is in the catalog, use its `category` (software, kit, cabling, etc.) before generic description rules.
2. **BOM checks** — unknown hardware can still match via catalog part lookup when not in [`earthworks-parts.js`](earthworks-parts.js).
3. **Software detection** — `SCS900-*`, `SITEWORKS-*`, `TSV-*`, `IS132309-*` plus catalog rows fix “software part number only” GST lines.

Earthworks-specific roles (EC520, VM510, kit triggers) stay in [`earthworks-parts.js`](earthworks-parts.js) and [`earthworks-profiles.js`](earthworks-profiles.js). The Components Sheet does **not** replace kit explosion — it adds breadth for identification and grouping.

## Kits vs common parts (without every base kit)

The sheet organizes by **product family slides** (Earthworks Common, MS Receivers, Coil Cables, etc.), not by every GST base kit SKU. That matches how we model BOM logic:

- **Roles** (EC520, platform harness, VM510) — one canonical part + aliases in `earthworks-parts.js`
- **Kit triggers** (`160005-500` → expect harness) — in `earthworks-profiles.js`, not full kit BOMs
- **Catalog section** — helps classify loose lines dealers quote beside kits

You do **not** need every specialized base kit in the repo; add kit P/Ns to triggers when a new add-on kit implies new roles.

## Refresh after deck updates

1. Export or let Drive index the updated Slides deck.
2. Run from `scripts/`:

   ```powershell
   powershell -ExecutionPolicy Bypass -File parse-components-sheet.ps1
   ```

3. Spot-check [`data/trimble-components-catalog.json`](data/trimble-components-catalog.json) (software count, new Earthworks slides).
4. Add high-value Earthworks roles manually to `earthworks-parts.js` when dealers rely on them for BOM checks.

## Limitations

- Parser pairs “part line + next description line” — merged cells and slide layout can produce junk rows (e.g. TOC bleed). Review odd entries after re-parse.
- Categories are inferred from section + description — tune `Get-Category` in the PowerShell script for new product lines.
- Not a price or availability source — verify on [store.trimble.com](https://store.trimble.com/).
