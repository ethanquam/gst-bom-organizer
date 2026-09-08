# GST BOM Organizer

This is a local web page for cleaning up bill of materials lists copied from Trimble’s Guided Selling Tool (GST). GST is the quoting website dealers use to build machine-control kits.

Nothing leaves your computer when you use the local copy. There is no login on `index.html` opened from your PC.

## Host internally (Cloudflare Pages + Access)

To share with Trimble staff only—not as a public site—use **Cloudflare Pages** with **Cloudflare Access (Zero Trust)**:

- Allow **`@trimble.com`** emails (or a named list)
- One-time PIN or Trimble **Microsoft / Entra** SSO
- Static hosting; no app server

Full setup: **[docs/cloudflare-access-setup.md](docs/cloudflare-access-setup.md)**

This is an unofficial internal helper, not a Trimble product. Use a private repo and an Access-protected hostname.

## Open the page locally

1. In File Explorer, go to this folder: `GST Optimization`.
2. Double-click `index.html`.
3. It should open in Chrome or Edge.
4. Choose **Machines** or **Site Positioning** in the header before you paste or load a sample. The profile updates hints, sample data, and configuration field order.

If it does not open in a browser:

1. Right-click `index.html`.
2. Click **Open with**.
3. Click **Google Chrome** or **Microsoft Edge**.

## Try it with the sample list (no GST needed)

1. On the page, click **Load sample list**. Configuration fields, a fake 7-line parts list, and sample notes appear on the right.
2. Edit configuration fields or part cells if needed. **Line total** and **Grand total** update when **Quantity** and **Price** are visible.
3. Scroll to **5. Copy organized text**. Click **Copy all**, or select all in that box and press Ctrl+C.
4. Click **Export**, then **Word / Docs** or **Excel / Sheets** if you need a file download.
5. Click **Columns**, uncheck **Price**, and confirm the copy box and exports omit prices.
You can also open `sample-paste.txt`, select all (Ctrl+A), copy (Ctrl+C), click in the parts-table box, and paste (Ctrl+V).

## Use it with a real GST list

GST walks through product type, manufacturer, serial/factory fit, machine model, then licensing and receiver options. Notes appear on every step and there is no back button — copy notes as you go.

1. Work through GST. Copy notes from each step into **2. Paste configuration notes** as you see them.
2. On the final screen, copy the configuration summary (right side) into **1. Paste configuration summary**.
3. Select the parts table, copy it, and paste into **3. Paste parts table**.
4. Click **Organize list**. Configuration fields sort into GST order (Application first, then Manufacturer, factory fit, model, options, serial).
5. Edit or remove lines. Use **Add field** or **Add row** for anything GST omitted.
6. Drag any row or column header to reorder the parts table. A gold highlight shows where the item will land.
7. Use **5. Copy organized text** to copy everything into your quoting tool or email. Use **Export** for Excel or Word files.
### Open exports in Microsoft or Google apps

**Excel / Sheets** (`.csv` file — comma-separated values):

- **Microsoft Excel** — double-click the file, or in Excel click **File → Open**.
- **Google Sheets** — go to [sheets.google.com](https://sheets.google.com), click **Blank**, then **File → Import → Upload** and pick the file.

The CSV has an export timestamp, configuration summary lines (`Application: …`, and so on), a blank row, then the parts table when present.

**Word / Docs** (`.doc` file):

- **Microsoft Word** — double-click the file, or in Word click **File → Open**.
- **Google Docs** — go to [docs.google.com](https://docs.google.com), click **Blank**, then **File → Open → Upload** and pick the file.

Configuration summary uses bold labels with values on the same line, matching the GST layout.

### Copy organized text (step 5)

- Lives on the page — no file download.
- Updates as you edit configuration, notes, or parts.
- Includes export time, configuration summary, notes, and a tab-separated parts table (visible columns only).
- Click **Copy all** or select the text and press Ctrl+C.

### File names and timestamps
Every export file name includes local date and 24-hour time, for example `gst-bom-2026-09-01-1534.csv`. Export twice the same day and the times differ.

Inside each file, the **Exported** line uses your browser’s locale date/time format.

The last configuration, list, and notes stay in this browser if you refresh. Click **Clear** to wipe them.

## What the buttons do

- **Machines / Site Positioning** — switches GST workflow profile. Changes paste hints, sample list, and how configuration fields sort on **Organize list**. Your parts table and exports stay the same.
- **Configuration summary** — paste the GST sidebar block (`Application:`, `Manufacturer:`, `Factory Fit Level:`, and so on). **Organize list** sorts fields into GST order.
- **Organize list** — turns configuration paste and parts paste into editable fields and columns.
- **Load sample list** — drops in the fake demo list and sample notes.
- **Clear** — empties paste boxes, notes, configuration fields, and the table.
- **Columns** — GST-style list. Check or uncheck Part Number, Description, Price, Quantity, and Comment. **Show All** brings hidden columns back.
- **Column dropdowns** — in each table header. Use these if auto-import guessed wrong. Picking a name that is already used swaps the two columns.
- **Drag to reorder** — drag any row or column header to move that line or column. Works with mouse or touch. Exports follow the same order.
- **Line total / Grand total** — shown when **Quantity** and **Price** are both visible. Totals display as **$** (USD) or **C$** (CAD), detected from price cells (`C$`, `CAD`, `US$`, `USD`) or a **Currency** configuration field. If both currencies appear, grand total shows each separately.
- **Add row** — adds a blank part line you can type into.
- **Add field** — adds a blank configuration line (label and value).
- **Copy all** — copies step 5 text to the clipboard.
- **Export** — downloads a file:
  - **Excel / Sheets** — `.csv` spreadsheet with export time, configuration lines, then the parts table.
  - **Word / Docs** — `.doc` with export header, configuration summary, notes (links preserved), and parts table.

## Recap

1. Double-click `index.html` to open the page.
2. Paste configuration, notes, and parts from GST (or click **Load sample list**).
3. Click **Organize list**, edit if needed, then copy from step 5 or **Export** to a file.