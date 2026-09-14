# BOM grouping — edge cases

Defaults until a dealer overrides by dragging rows after **Group lines**.

| Situation | Treatment |
|-----------|-------------|
| `Kit -` description | **Kit** group (priority 5) — wins over FRU part-prefix rules |
| `FRU -` or part prefix `520` | **FRU** group |
| Description prefix `Cable -` vs `Harness -` | **Cabling** vs **Harness** — harness rules checked after cable |
| Software / license lines | **Software** — description contains `License`, `Software -`, or `Option` |
| `$0.00` / training sample parts | **Training** if description contains `Training`, `Sample`, or `Demo Only` |
| Blank part number, has description | Classify by description only; else **Misc** |
| Blank part and description | **Misc** (bottom) |
| Duplicate part on multiple lines | **Keep separate lines** — GST qty not merged; stable order within group |
| Dealer **Install** / freight lines | **Install** if description contains `Install`, `Labor`, or `Freight` |
| Bracket without `Bracket -` prefix | **Bracket** if description contains `Mount` or `Bracket` |
| No rule matches | **Misc** at bottom |
| After **Group lines** | Manual drag reorder is allowed; grouping does not lock rows |
| Re-click **Group lines** | Re-classifies and sorts again (no per-row override stored) |

## Earthworks BOM validation

| Situation | Treatment |
|-----------|-------------|
| **Earthworks profile** set to Auto | Dozer profile when machine/notes mention dozer or kit `160005-*` is on the BOM |
| **Earthworks profile** set to Dozer | Always run dozer completeness checks (generic blade mount V2.25.x) |
| **Checks off** | Hide BOM checks panel |
| Training/sample SKUs (`990xxx`) | Matched by GST description patterns in `earthworks-parts.js` |
| Third-party tablet (BYOD) | Mention in configuration notes — display requirement waived |
| `160005-502` valve add-on without CI5xx | **Error** — VM510 needs CI510 or CI520 |
| Base kit `160005-500` without platform harness `150603-02` | **Error** |
| TD540 without adapter `150878-002` | **Warn** |
| Dual GNSS / 3D context with one receiver | **Warn** (qty check) |
| No software/license lines | **Info** only — commissioning reminder |
| Partial quote (no base kit, profile not detected) | Panel hidden in Auto mode |
| Warnings | Advisory only — export is never blocked |

Sample fixtures: `samples/earthworks-dozer-complete.txt`, `earthworks-dozer-missing-harness.txt`, `earthworks-dozer-valve-no-ci.txt`.

Maintenance reference: Ideaverse `docs/earthworks-bom-rules.md`.

When unsure during rule tuning: default to **Misc** at bottom and add a row to [`data/group-rules.csv`](data/group-rules.csv).
