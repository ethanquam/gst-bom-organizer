# BOM group order (top to bottom)

Lines are **reordered only** — no section header rows. Adjacent lines in the same group sit together.

| Order | Key | Label | Notes |
|-------|-----|-------|-------|
| 1 | `kit` | Kits / base configuration | Usually first; optional on add-on quotes |
| 2 | `display` | Displays & controls | Tablets, controllers, boxes |
| 3 | `gnss` | GNSS / positioning | Receivers, antennas |
| 4 | `sensor` | Sensors | Slope, body, boom, etc. |
| 5 | `radio` | Radios / communications | UHF, LTE, modems |
| 6 | `cabling` | Cabling | Cables (not harnesses) |
| 7 | `harness` | Harnesses | Valve, machine, display harnesses |
| 8 | `bracket` | Brackets / mounting | Mounts, plates, adapters |
| 9 | `software` | Software / licenses / options | SW keys, option licenses |
| 10 | `fru` | FRU / service parts | Field-replaceable units |
| 11 | `install` | Install / labor / freight | Dealer-added lines |
| 12 | `training` | Training / sample | **Always last** among classified lines |
| 13 | `misc` | Misc | **Always last** — no rule matched |

**Optional groups** (often empty): `radio`, `bracket`, `software`, `install`, `training`.

Edit sort order in [`data/group-data.js`](data/group-data.js) (`categories` array). Rules live in the same file and in [`data/group-rules.csv`](data/group-rules.csv).
