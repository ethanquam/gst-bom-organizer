(function () {
  "use strict";

  var STORAGE_KEY = "gst-bom-organizer-v1";

  var SAMPLE_NOTES =
    "Note: If you do not know the serial number, please quote as Generic Base Kit.\n" +
    "You must know your correct factory fit level before proceeding with quote.\n" +
    "Post APU 2021 model: Cat Grade 2D Assist requires 603-3385 Grade Control Indicate System Installation Status SEA option for upgrade to 2D Advanced/3D. Contact your local Cat dealer for activation.\n" +
    "Note: Refer to online SNM941 Certifications for Country Compliance Information to select the correct PN# with your order.\n" +
    "Training sample only — not a real quote.";

  var SAMPLE_CONFIG =
    "Serial Number:\tRAZ\n" +
    "Automatics:\tFALSE\n" +
    "SNM941:\tSNM941 - Connected Site Gateway - No SIM - Americas\n" +
    "Machine Model:\t323\n" +
    "Factory Fit Level:\tCat Grade 2D Assist (Basic 2D)\n" +
    "Manufacturer:\tCaterpillar\n" +
    "Application:\tTrimble Earthworks - Excavator\n" +
    "Build Number:\t07F\n";

  var GST_CONFIG_LABEL_ORDER = [
    "application",
    "manufacturer",
    "factory fit level",
    "mount type",
    "machine model",
    "model",
    "build number",
    "automatics",
  ];

  var SAMPLE_PASTE =
    "Quantity\tPart Number\tDescription\tPrice\tComment\n" +
    "1\t990011-101\tKit - Base, Sample Dozer, Grade Control, Demo Only\t0.00\tTraining sample only\n" +
    "1\t990022-210\tDisplay - Field Tablet, 10 in, Training Unit\t0.00\t\n" +
    "2\t990033-015\tCable - Display, 15 m, Sample\t0.00\t\n" +
    "1\t990044-008\tReceiver - GNSS, Dual Antenna, Not For Sale\t0.00\t\n" +
    "4\t990055-003\tSensor - Slope, Machine Body, Training\t0.00\t\n" +
    "1\t990066-440\tRadio - 450 MHz, Example Region\t0.00\t\n" +
    "1\t990077-012\tHarness - Valve, Generic Sample Machine\t0.00\t";

  var COLUMN_ALIASES = {
    qty: ["quantity", "qty", "qty.", "qnty", "count"],
    part: [
      "part number",
      "part no",
      "part no.",
      "part #",
      "part#",
      "item number",
      "item no",
      "item #",
      "product number",
      "sku",
      "model",
      "item",
      "product",
    ],
    description: [
      "description",
      "desc",
      "item description",
      "product description",
      "product name",
      "name",
    ],
    price: [
      "price",
      "list price",
      "list",
      "unit price",
      "unit list",
      "net price",
      "net",
      "extended",
      "ext price",
      "ext. price",
      "extended price",
      "total price",
      "total",
      "discount",
      "disc",
      "disc %",
      "discount %",
      "disc.",
    ],
    comment: ["comment", "comments", "note", "notes", "remark", "remarks"],
  };

  var GST_ROLES = [
    { key: "part", label: "Part Number", headerLabel: "Part #", className: "col-part" },
    { key: "description", label: "Description", className: "col-desc" },
    { key: "price", label: "Price", className: "col-price" },
    { key: "qty", label: "Quantity", headerLabel: "Qty", className: "col-qty" },
    { key: "comment", label: "Comment", className: "col-comment" },
  ];

  function roleMeta(key) {
    var i;
    for (i = 0; i < GST_ROLES.length; i++) {
      if (GST_ROLES[i].key === key) return GST_ROLES[i];
    }
    return null;
  }

  function toGstRole(key) {
    if (key === "listPrice" || key === "netPrice" || key === "discount") return "price";
    if (roleMeta(key)) return key;
    return "extra";
  }

  var els = {
    configPasteBox: document.getElementById("config-paste-box"),
    pasteBox: document.getElementById("paste-box"),
    notesBox: document.getElementById("notes-box"),
    organize: document.getElementById("btn-organize"),
    sample: document.getElementById("btn-sample"),
    clear: document.getElementById("btn-clear"),
    hidePrices: document.getElementById("hide-prices"),
    columnsBtn: document.getElementById("btn-columns"),
    columnsMenu: document.getElementById("columns-menu"),
    columnsList: document.getElementById("columns-menu-list"),
    showAll: document.getElementById("btn-show-all"),
    addRow: document.getElementById("btn-add-row"),
    exportBtn: document.getElementById("btn-export"),
    exportMenu: document.getElementById("export-menu"),
    configSummary: document.getElementById("config-summary"),
    configBody: document.getElementById("config-body"),
    addConfigField: document.getElementById("btn-add-config-field"),
    copyOutputWrap: document.getElementById("copy-output-wrap"),
    copyOutputBox: document.getElementById("copy-output-box"),
    copyAllBtn: document.getElementById("btn-copy-all"),
    appLayout: document.getElementById("app-layout"),
    panePaste: document.getElementById("pane-paste"),
    pastePanel: document.getElementById("paste-panel"),
    btnHideInputs: document.getElementById("btn-hide-inputs"),
    btnShowInputs: document.getElementById("btn-show-inputs"),
    btnToggleConfigSummary: document.getElementById("btn-toggle-config-summary"),
    configSummaryPreview: document.getElementById("config-summary-preview"),
    btnToggleCopyOutput: document.getElementById("btn-toggle-copy-output"),
    listWorkspace: document.getElementById("list-workspace"),
    btnZoomIn: document.getElementById("btn-zoom-in"),
    btnZoomOut: document.getElementById("btn-zoom-out"),
    btnZoomReset: document.getElementById("btn-zoom-reset"),
    zoomLabel: document.getElementById("zoom-label"),
    table: document.getElementById("bom-table"),
    thead: document.querySelector("#bom-table thead"),
    tbody: document.querySelector("#bom-table tbody"),
    tfoot: document.querySelector("#bom-table tfoot"),
    tableWrap: document.querySelector(".table-wrap"),
    rowCount: document.getElementById("row-count"),
    toast: document.getElementById("toast"),
    saveNote: document.getElementById("save-note"),
  };

  var state = {
    rows: [],
    columns: [],
    extraKeys: [],
    hidePrices: false,
    configFields: [],
    inputHidden: false,
    configSummaryCollapsed: false,
    copyOutputCollapsed: false,
    tableZoom: 100,
  };

  var TABLE_ZOOM_MIN = 60;
  var TABLE_ZOOM_MAX = 140;
  var TABLE_ZOOM_STEP = 10;
  var fitTableColumnsTimer = null;

  var toastTimer = null;
  var nextId = 1;

  function newId() {
    return "r" + nextId++;
  }

  function normalizeHeader(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[:*]/g, "")
      .trim();
  }

  function aliasKey(header) {
    var name = normalizeHeader(header);
    var key;
    for (key in COLUMN_ALIASES) {
      if (COLUMN_ALIASES[key].indexOf(name) !== -1) {
        return key;
      }
    }
    return null;
  }

  function looksLikePartNumber(value) {
    var text = String(value || "").trim();
    if (!text) return false;
    if (/^\d{5,}-\d{2,4}$/.test(text)) return true;
    if (/^\d{3}-\d{4}$/.test(text)) return true;
    if (/^[A-Z]{2,}[A-Z0-9]*-[A-Z0-9]{2,}(?:-[A-Z0-9]+)?$/i.test(text)) return true;
    return false;
  }

  function looksLikeMoney(value) {
    var text = String(value || "").trim();
    if (!text) return false;
    return (
      /^(?:C\$|US\$|CAD|USD)\s*-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?$/i.test(text) ||
      /^(?:C\$|US\$|CAD|USD)\s*-?\d+\.\d{2}$/i.test(text) ||
      /^\$?\s*-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?$/.test(text) ||
      /^\$?\s*-?\d+\.\d{2}$/.test(text) ||
      /^-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:CAD|USD|C\$|US\$)$/i.test(text)
    );
  }

  function looksLikeQty(value) {
    var text = String(value || "").trim();
    if (!/^\d{1,4}(?:\.\d+)?$/.test(text)) return false;
    if (looksLikePartNumber(text)) return false;
    var num = Number(text);
    return num > 0 && num < 10000;
  }

  function isJunkLine(cells) {
    var joined = cells.join(" ").replace(/\s+/g, " ").trim().toLowerCase();
    if (!joined) return true;
    if (/^(subtotal|total|grand total|net total|list total)\b/.test(joined)) return true;
    if (/disclaimer|terms of sale|confidential/.test(joined) && cells.length < 3) return true;
    if (/^[-–—_=]{3,}$/.test(joined)) return true;
    return false;
  }

  function isEmptyOrJunkCell(value) {
    var text = String(value || "").trim();
    if (!text) return true;
    if (/^[⋮×x\u22ee\u00d7\s•·|]+$/i.test(text)) return true;
    if (/^(drag|define|order|move|remove|delete|actions?)$/i.test(text)) return true;
    return false;
  }

  function isHeaderLabelCell(value) {
    var text = String(value || "").trim();
    if (!text) return false;
    if (aliasKey(text)) return true;
    if (/^(define|order|move|not set|column \d+)$/i.test(text)) return true;
    return false;
  }

  function hasUsefulColumnData(value) {
    if (isEmptyOrJunkCell(value)) return false;
    if (isHeaderLabelCell(value)) return false;
    if (looksLikePartNumber(value) || looksLikeMoney(value) || looksLikeQty(value)) return true;
    if (String(value).trim().length >= 4) return true;
    return false;
  }

  function trimJunkColumns(grid) {
    if (!grid || !grid.length) return grid;
    var width = 0;
    var i;
    var r;
    var c;
    var keep;
    for (i = 0; i < grid.length; i++) {
      if (grid[i].length > width) width = grid[i].length;
    }
    if (!width) return grid;
    keep = [];
    for (c = 0; c < width; c++) {
      var useful = false;
      for (r = 0; r < grid.length; r++) {
        if (hasUsefulColumnData(grid[r][c])) {
          useful = true;
          break;
        }
      }
      if (useful) keep.push(c);
    }
    if (keep.length === width) return grid;
    return grid.map(function (row) {
      return keep.map(function (colIndex) {
        return row[colIndex] || "";
      });
    });
  }

  function gridWidth(grid) {
    var width = 0;
    var i;
    for (i = 0; i < grid.length; i++) {
      if (grid[i].length > width) width = grid[i].length;
    }
    return width;
  }

  function splitRow(line, useTabs) {
    if (useTabs) {
      return line.split("\t").map(function (cell) {
        return cell.replace(/\s+/g, " ").trim();
      });
    }
    return line.split(/\s{2,}|\t/).map(function (cell) {
      return cell.replace(/\s+/g, " ").trim();
    });
  }

  function rowsFromHtml(html) {
    if (!html || html.indexOf("<table") === -1) return null;
    var doc = new DOMParser().parseFromString(html, "text/html");
    var table = doc.querySelector("table");
    if (!table) return null;
    var out = [];
    var trs = table.querySelectorAll("tr");
    var i;
    var cells;
    var tds;
    var j;
    for (i = 0; i < trs.length; i++) {
      tds = trs[i].querySelectorAll("th,td");
      if (!tds.length) continue;
      cells = [];
      for (j = 0; j < tds.length; j++) {
        cells.push(tds[j].innerText.replace(/\s+/g, " ").trim());
      }
      out.push(cells);
    }
    return out.length ? out : null;
  }

  function rowsFromPlainText(text) {
    var lines = String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n");
    var nonEmpty = lines.filter(function (line) {
      return line.trim();
    });
    var tabCount = 0;
    var i;
    for (i = 0; i < nonEmpty.length; i++) {
      if (nonEmpty[i].indexOf("\t") !== -1) tabCount += 1;
    }
    var useTabs = nonEmpty.length > 0 && tabCount / nonEmpty.length >= 0.5;
    var rows = [];
    for (i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      rows.push(splitRow(lines[i], useTabs));
    }
    return rows;
  }

  function headerScore(cells) {
    var hits = 0;
    var i;
    for (i = 0; i < cells.length; i++) {
      if (aliasKey(cells[i])) hits += 1;
    }
    return hits;
  }

  function inferMap(grid, startAt) {
    var counts = [];
    var r;
    var c;
    var cell;
    var sample = grid.slice(startAt, startAt + 8);
    var width = 0;
    for (r = 0; r < sample.length; r++) {
      if (sample[r].length > width) width = sample[r].length;
    }
    for (c = 0; c < width; c++) {
      counts[c] = { part: 0, qty: 0, money: 0, text: 0, label: "Column " + (c + 1) };
    }
    for (r = 0; r < sample.length; r++) {
      for (c = 0; c < width; c++) {
        cell = sample[r][c] || "";
        if (!cell) continue;
        if (looksLikePartNumber(cell)) counts[c].part += 1;
        else if (looksLikeQty(cell)) counts[c].qty += 1;
        else if (looksLikeMoney(cell)) counts[c].money += 1;
        else counts[c].text += 1;
      }
    }
    var map = new Array(width);
    var used = {};
    function claim(kind, key) {
      var best = -1;
      var bestScore = 0;
      for (c = 0; c < width; c++) {
        if (map[c]) continue;
        if (counts[c][kind] > bestScore) {
          bestScore = counts[c][kind];
          best = c;
        }
      }
      if (best !== -1 && bestScore > 0) {
        map[best] = key;
        used[key] = true;
      }
    }
    claim("part", "part");
    claim("qty", "qty");
    claim("text", "description");
    var moneyCols = [];
    for (c = 0; c < width; c++) {
      if (!map[c] && counts[c].money > 0) moneyCols.push(c);
    }
    if (moneyCols[0] !== undefined) map[moneyCols[0]] = "price";
    if (moneyCols[1] !== undefined) map[moneyCols[1]] = "price";
    if (moneyCols[2] !== undefined) map[moneyCols[2]] = "price";
    for (c = 0; c < width; c++) {
      if (!map[c]) map[c] = { extra: counts[c].label };
    }
    return map;
  }

  function mapFromHeader(cells) {
    var map = [];
    var extras = 0;
    var i;
    var key;
    var used = {};
    for (i = 0; i < cells.length; i++) {
      key = aliasKey(cells[i]);
      if (key && !used[key]) {
        map[i] = key;
        used[key] = true;
      } else if (cells[i]) {
        extras += 1;
        map[i] = { extra: cells[i] };
      } else {
        extras += 1;
        map[i] = { extra: "Column " + (i + 1) };
      }
    }
    return map;
  }

  function emptyRow() {
    var values = [];
    var i;
    var count = state.columns.length;
    if (!count) {
      ensureDefaultColumns();
      count = state.columns.length;
    }
    for (i = 0; i < count; i++) values.push("");
    return { id: newId(), values: values };
  }

  function ensureDefaultColumns() {
    if (state.columns.length) return;
    var i;
    var meta;
    for (i = 0; i < GST_ROLES.length; i++) {
      meta = GST_ROLES[i];
      state.columns.push({
        id: "c" + i,
        role: meta.key,
        sourceLabel: meta.label,
        hidden: false,
      });
    }
  }

  function columnsFromMap(map, headerCells) {
    var cols = [];
    var i;
    var target;
    var role;
    var label;
    for (i = 0; i < map.length; i++) {
      target = map[i];
      if (typeof target === "string") {
        role = toGstRole(target);
        label = (headerCells && headerCells[i]) || (roleMeta(role) ? roleMeta(role).label : "Column " + (i + 1));
      } else {
        role = "extra";
        label = (target && target.extra) || (headerCells && headerCells[i]) || "Column " + (i + 1);
      }
      cols.push({
        id: "c" + i,
        role: role,
        sourceLabel: label,
        hidden: false,
      });
    }
    return cols;
  }

  function cellsToRow(cells, width) {
    var values = [];
    var i;
    for (i = 0; i < width; i++) {
      values.push(cells[i] || "");
    }
    return { id: newId(), values: values };
  }

  function findHeaderIndex(grid) {
    var best = -1;
    var bestScore = 1;
    var i;
    var score;
    var limit = Math.min(grid.length, 8);
    for (i = 0; i < limit; i++) {
      score = headerScore(grid[i]);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  function looksLikeBom(grid) {
    if (!grid || grid.length < 2) return false;
    if (findHeaderIndex(grid) !== -1) return true;
    var i;
    var j;
    var hits = 0;
    var limit = Math.min(grid.length, 12);
    for (i = 0; i < limit; i++) {
      for (j = 0; j < grid[i].length; j++) {
        if (looksLikePartNumber(grid[i][j])) hits += 1;
      }
    }
    return hits >= 1;
  }

  function parseGrid(grid) {
    grid = trimJunkColumns(grid);
    var cleaned = grid.filter(function (cells) {
      return !isJunkLine(cells);
    });
    if (!cleaned.length) {
      return { rows: [], columns: [] };
    }
    var headerIndex = findHeaderIndex(cleaned);
    var start = 0;
    var map;
    var headerCells = null;
    if (headerIndex !== -1) {
      map = mapFromHeader(cleaned[headerIndex]);
      headerCells = cleaned[headerIndex];
      start = headerIndex + 1;
    } else {
      map = inferMap(cleaned, 0);
    }
    var columns = columnsFromMap(map, headerCells);
    var rows = [];
    var i;
    for (i = start; i < cleaned.length; i++) {
      if (isJunkLine(cleaned[i])) continue;
      rows.push(cellsToRow(cleaned[i], columns.length));
    }
    return ensureDefaultQty({ rows: rows, columns: columns });
  }

  function ensureDefaultQty(parsed) {
    var hasQty = false;
    var i;
    for (i = 0; i < parsed.columns.length; i++) {
      if (parsed.columns[i].role === "qty") hasQty = true;
    }
    if (hasQty || !parsed.rows.length) return parsed;
    parsed.columns.unshift({
      id: "c_qty_default",
      role: "qty",
      sourceLabel: "Quantity",
      hidden: false,
    });
    for (i = 0; i < parsed.rows.length; i++) {
      parsed.rows[i].values.unshift("1");
    }
    return parsed;
  }

  function parsePaste(text, html) {
    var htmlGrid = rowsFromHtml(html);
    var textGrid = rowsFromPlainText(text);
    if (htmlGrid) htmlGrid = trimJunkColumns(htmlGrid);
    if (textGrid) textGrid = trimJunkColumns(textGrid);
    var htmlBom = htmlGrid && looksLikeBom(htmlGrid);
    var textBom = textGrid && looksLikeBom(textGrid);
    if (htmlBom && textBom) {
      var htmlCols = gridWidth(htmlGrid);
      var textCols = gridWidth(textGrid);
      if (textCols < htmlCols && textGrid.length >= htmlGrid.length) {
        return parseGrid(textGrid);
      }
      return parseGrid(htmlGrid);
    }
    if (htmlBom) {
      return parseGrid(htmlGrid);
    }
    return parseGrid(textGrid);
  }

  function visibleColumns() {
    var cols = [];
    var i;
    var col;
    var meta;
    var label;
    for (i = 0; i < state.columns.length; i++) {
      col = state.columns[i];
      if (col.hidden) continue;
      meta = roleMeta(col.role);
      label = meta ? meta.label : col.sourceLabel || "Column " + (i + 1);
      cols.push({
        index: i,
        key: String(i),
        role: col.role,
        label: label,
        className: meta ? meta.className : "col-extra",
      });
    }
    return cols;
  }

  function moveColumn(fromIndex, toIndex) {
    var col;
    var i;
    var row;
    var val;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= state.columns.length || toIndex >= state.columns.length) return;
    col = state.columns.splice(fromIndex, 1)[0];
    state.columns.splice(toIndex, 0, col);
    for (i = 0; i < state.rows.length; i++) {
      row = state.rows[i];
      if (!row.values) row.values = [];
      while (row.values.length < state.columns.length) row.values.push("");
      val = row.values.splice(fromIndex, 1)[0];
      row.values.splice(toIndex, 0, val || "");
    }
  }

  function moveRow(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= state.rows.length || toIndex >= state.rows.length) return;
    var row = state.rows.splice(fromIndex, 1)[0];
    state.rows.splice(toIndex, 0, row);
  }

  function getCellValue(row, colKey) {
    var index = Number(colKey);
    if (!row.values) return "";
    return row.values[index] || "";
  }

  function setCellValue(row, colKey, value) {
    var index = Number(colKey);
    if (!row.values) row.values = [];
    row.values[index] = value;
  }

  function roleSelectHtml(col) {
    var html = '<select class="col-role" data-col-index="' + col.index + '" aria-label="Set column type">';
    html += '<option value="extra"' + (col.role === "extra" ? " selected" : "") + ">Not set</option>";
    var i;
    var role;
    for (i = 0; i < GST_ROLES.length; i++) {
      role = GST_ROLES[i];
      html +=
        '<option value="' +
        role.key +
        '"' +
        (col.role === role.key ? " selected" : "") +
        ">" +
        escapeHtml(role.headerLabel || role.label) +
        "</option>";
    }
    html += '<option value="hide">Hide column</option>';
    html += "</select>";
    return html;
  }

  function setColumnRole(index, newRole) {
    var col = state.columns[index];
    if (!col) return;
    if (newRole === "hide") {
      col.hidden = true;
      return;
    }
    col.hidden = false;
    if (newRole === col.role) return;
    if (newRole !== "extra") {
      var i;
      for (i = 0; i < state.columns.length; i++) {
        if (i !== index && state.columns[i].role === newRole && !state.columns[i].hidden) {
          state.columns[i].role = col.role === "extra" ? "extra" : col.role;
          col.role = newRole;
          return;
        }
      }
    }
    col.role = newRole;
  }

  function migrateRows(rows, payload) {
    if (!rows.length) return [];
    if (rows[0].values) return rows;
    var columns = inferColumnsFromLegacy(payload);
    return rows.map(function (row) {
      var values = [];
      var i;
      var col;
      for (i = 0; i < columns.length; i++) {
        col = columns[i];
        if (col.legacyKey === "extra") {
          values.push((row.extras && row.extras[col.sourceLabel]) || "");
        } else {
          values.push(row[col.legacyKey] || row[col.role] || "");
        }
      }
      return { id: row.id || newId(), values: values };
    });
  }

  function inferColumnsFromLegacy(payload) {
    if (payload.columns && payload.columns.length) return payload.columns;
    var cols = [
      { id: "c0", role: "qty", sourceLabel: "Quantity", hidden: false, legacyKey: "qty" },
      { id: "c1", role: "part", sourceLabel: "Part Number", hidden: false, legacyKey: "part" },
      { id: "c2", role: "description", sourceLabel: "Description", hidden: false, legacyKey: "description" },
      { id: "c3", role: "price", sourceLabel: "List price", hidden: !!payload.hidePrices, legacyKey: "listPrice" },
      { id: "c4", role: "price", sourceLabel: "Net price", hidden: !!payload.hidePrices, legacyKey: "netPrice" },
    ];
    var extras = payload.extraKeys || [];
    var i;
    for (i = 0; i < extras.length; i++) {
      cols.push({
        id: "c" + cols.length,
        role: "extra",
        sourceLabel: extras[i],
        hidden: false,
        legacyKey: "extra",
      });
    }
    return cols;
  }

  function roleIsVisible(role) {
    var i;
    for (i = 0; i < state.columns.length; i++) {
      if (state.columns[i].role === role && !state.columns[i].hidden) return true;
    }
    return false;
  }

  function totalsVisible() {
    return roleIsVisible("qty") && roleIsVisible("price");
  }

  function columnIndexByRole(role) {
    var i;
    for (i = 0; i < state.columns.length; i++) {
      if (state.columns[i].role === role && !state.columns[i].hidden) return i;
    }
    return -1;
  }

  function parseMoneyText(value) {
    var raw = String(value || "").trim();
    if (!raw) return { amount: 0, currency: null };
    var currency = null;
    var text = raw;
    if (/^(?:C\$|CAD)\s*/i.test(text)) {
      currency = "CAD";
      text = text.replace(/^(?:C\$|CAD)\s*/i, "");
    } else if (/^(?:US\$|USD)\s*/i.test(text)) {
      currency = "USD";
      text = text.replace(/^(?:US\$|USD)\s*/i, "");
    } else if (/^\$/.test(text)) {
      currency = "USD";
      text = text.replace(/^\$/, "");
    }
    if (/\s(?:CAD|C\$)\s*$/i.test(text)) {
      currency = "CAD";
      text = text.replace(/\s*(?:CAD|C\$)\s*$/i, "");
    } else if (/\s(?:USD|US\$)\s*$/i.test(text)) {
      currency = "USD";
      text = text.replace(/\s*(?:USD|US\$)\s*$/i, "");
    }
    text = text.replace(/,/g, "").trim();
    var n = Number(text);
    return { amount: isFinite(n) ? n : 0, currency: currency };
  }

  function parseAmount(value) {
    if (typeof value === "number") return isFinite(value) ? value : 0;
    return parseMoneyText(value).amount;
  }

  function currencyFromConfig() {
    var i;
    var label;
    var val;
    for (i = 0; i < state.configFields.length; i++) {
      label = (state.configFields[i].label || "").trim().toLowerCase();
      if (label !== "currency" && label !== "price currency" && label !== "quote currency") continue;
      val = (state.configFields[i].value || "").trim().toUpperCase();
      if (!val) continue;
      if (val === "CAD" || val === "C$" || val.indexOf("CANAD") !== -1) return "CAD";
      if (val === "USD" || val === "US$" || val.indexOf("DOLLAR") !== -1) return "USD";
    }
    return null;
  }

  function detectTableCurrency() {
    var fromConfig = currencyFromConfig();
    if (fromConfig) return fromConfig;
    var counts = { USD: 0, CAD: 0 };
    var priceIdx = columnIndexByRole("price");
    var i;
    var parsed;
    if (priceIdx >= 0) {
      for (i = 0; i < state.rows.length; i++) {
        parsed = parseMoneyText(getCellValue(state.rows[i], String(priceIdx)));
        if (parsed.currency === "USD") counts.USD += 1;
        if (parsed.currency === "CAD") counts.CAD += 1;
      }
    }
    if (counts.CAD > counts.USD) return "CAD";
    if (counts.USD > 0) return "USD";
    return "USD";
  }

  function resolveCurrency(currency) {
    return currency || detectTableCurrency();
  }

  function lineTotalForRow(row) {
    var qtyIdx = columnIndexByRole("qty");
    var priceIdx = columnIndexByRole("price");
    if (qtyIdx < 0 || priceIdx < 0) return { amount: 0, currency: null };
    var price = parseMoneyText(getCellValue(row, String(priceIdx)));
    var qty = parseAmount(getCellValue(row, String(qtyIdx)));
    return {
      amount: qty * price.amount,
      currency: price.currency,
    };
  }

  function sumGrandTotals() {
    var totals = {};
    var defaultCurrency = detectTableCurrency();
    var i;
    var lineTotal;
    var currency;
    for (i = 0; i < state.rows.length; i++) {
      lineTotal = lineTotalForRow(state.rows[i]);
      currency = lineTotal.currency || defaultCurrency;
      totals[currency] = (totals[currency] || 0) + lineTotal.amount;
    }
    return totals;
  }

  function formatMoney(amount, currency) {
    var value = amount;
    var cur = currency;
    if (amount && typeof amount === "object" && amount.amount !== undefined) {
      value = amount.amount;
      cur = amount.currency || currency;
    }
    var n = parseAmount(value);
    cur = resolveCurrency(cur);
    var formatted = n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    if (cur === "CAD") return "C$" + formatted;
    return "$" + formatted;
  }

  function formatGrandTotalHtml(totals) {
    var keys = Object.keys(totals).filter(function (key) {
      return totals[key];
    });
    keys.sort();
    if (!keys.length) {
      return (
        '<span class="grand-total-label">Grand total</span> ' + escapeHtml(formatMoney(0))
      );
    }
    if (keys.length === 1) {
      return (
        '<span class="grand-total-label">Grand total</span> ' +
        escapeHtml(formatMoney(totals[keys[0]], keys[0]))
      );
    }
    return (
      '<span class="grand-total-label">Grand total</span> ' +
      keys
        .map(function (key) {
          return escapeHtml(formatMoney(totals[key], key));
        })
        .join(' <span class="grand-total-sep" aria-hidden="true">·</span> ')
    );
  }

  function truncatePreview(text, max) {
    var trimmed = String(text || "").replace(/\s+/g, " ").trim();
    if (!trimmed) return "";
    if (trimmed.length <= max) return trimmed;
    return trimmed.slice(0, max - 1) + "…";
  }

  function configSummaryPreviewText() {
    var count = 0;
    var i;
    var field;
    var first = "";
    for (i = 0; i < state.configFields.length; i++) {
      field = state.configFields[i];
      if (!(field.label || "").trim() && !(field.value || "").trim()) continue;
      count += 1;
      if (!first) first = (field.label || "").trim() + ": " + (field.value || "").trim();
    }
    if (!count) return "No fields";
    return count + (count === 1 ? " field" : " fields") + " · " + truncatePreview(first, 72);
  }

  function applyConfigSummaryCollapse() {
    if (!els.configSummary) return;
    var collapsed = !!state.configSummaryCollapsed;
    els.configSummary.classList.toggle("is-collapsed", collapsed);
    if (els.btnToggleConfigSummary) {
      els.btnToggleConfigSummary.setAttribute("aria-expanded", collapsed ? "false" : "true");
    }
    if (els.configSummaryPreview) {
      els.configSummaryPreview.textContent = configSummaryPreviewText();
      els.configSummaryPreview.hidden = !collapsed;
    }
  }

  function setConfigSummaryCollapsed(collapsed) {
    state.configSummaryCollapsed = !!collapsed;
    applyConfigSummaryCollapse();
  }

  function toggleConfigSummaryCollapsed() {
    setConfigSummaryCollapsed(!state.configSummaryCollapsed);
    saveState();
  }

  function applyCopyOutputCollapse() {
    if (!els.copyOutputWrap) return;
    els.copyOutputWrap.classList.toggle("is-collapsed", !!state.copyOutputCollapsed);
    if (els.btnToggleCopyOutput) {
      els.btnToggleCopyOutput.setAttribute("aria-expanded", state.copyOutputCollapsed ? "false" : "true");
    }
    resizeCopyOutputBox();
  }

  function setCopyOutputCollapsed(collapsed) {
    state.copyOutputCollapsed = !!collapsed;
    applyCopyOutputCollapse();
  }

  function toggleCopyOutputCollapsed() {
    setCopyOutputCollapsed(!state.copyOutputCollapsed);
    saveState();
  }

  function applyTableZoom() {
    var zoom = state.tableZoom;
    if (zoom < TABLE_ZOOM_MIN) zoom = TABLE_ZOOM_MIN;
    if (zoom > TABLE_ZOOM_MAX) zoom = TABLE_ZOOM_MAX;
    state.tableZoom = zoom;
    if (els.listWorkspace) {
      els.listWorkspace.style.setProperty("--table-zoom", String(zoom / 100));
    }
    if (els.zoomLabel) els.zoomLabel.textContent = zoom + "%";
    if (els.btnZoomOut) els.btnZoomOut.disabled = zoom <= TABLE_ZOOM_MIN;
    if (els.btnZoomIn) els.btnZoomIn.disabled = zoom >= TABLE_ZOOM_MAX;
    scheduleFitTableColumns();
  }

  function columnWidthSpec(role) {
    switch (role) {
      case "part":
        return { min: 88, headerMin: 108, weight: 1.2 };
      case "description":
        return { min: 96, headerMin: 96, weight: 4 };
      case "price":
        return { min: 76, headerMin: 88, weight: 0 };
      case "qty":
        return { min: 52, headerMin: 76, weight: 0 };
      case "comment":
        return { min: 88, headerMin: 88, weight: 1.4 };
      default:
        return { min: 72, headerMin: 88, weight: 1 };
    }
  }

  function scheduleFitTableColumns() {
    if (fitTableColumnsTimer) window.clearTimeout(fitTableColumnsTimer);
    fitTableColumnsTimer = window.setTimeout(fitTableColumns, 40);
  }

  function fitTableColumns() {
    var wrap = els.tableWrap;
    var table = els.table;
    var cols;
    var showTotals;
    var specs;
    var widths;
    var available;
    var zoom;
    var totalMin;
    var totalWeight;
    var remainder;
    var colgroup;
    var html;
    var i;
    var sum;
    var scale;
    if (!wrap || !table) return;
    if (!state.rows.length) {
      colgroup = table.querySelector("colgroup");
      if (colgroup) colgroup.innerHTML = "";
      return;
    }
    zoom = state.tableZoom / 100;
    if (zoom < 0.6) zoom = 0.6;
    available = wrap.clientWidth / zoom;
    if (available < 160) return;

    cols = visibleColumns();
    showTotals = totalsVisible();
    specs = [{ min: 40, headerMin: 40, weight: 0, fixed: true }];
    for (i = 0; i < cols.length; i++) {
      var spec = columnWidthSpec(cols[i].role);
      specs.push({
        min: spec.min,
        headerMin: spec.headerMin || spec.min,
        weight: spec.weight,
        fixed: spec.weight === 0,
      });
    }
    if (showTotals) {
      specs.push({ min: 92, headerMin: 100, weight: 0, fixed: true });
    }

    totalMin = 0;
    totalWeight = 0;
    for (i = 0; i < specs.length; i++) {
      totalMin += specs[i].headerMin;
      if (!specs[i].fixed) totalWeight += specs[i].weight;
    }

    widths = [];
    remainder = Math.max(0, available - totalMin);
    for (i = 0; i < specs.length; i++) {
      var extra = 0;
      if (!specs[i].fixed && totalWeight > 0) {
        extra = remainder * (specs[i].weight / totalWeight);
      }
      widths.push(Math.round(specs[i].headerMin + extra));
    }

    sum = 0;
    for (i = 0; i < widths.length; i++) sum += widths[i];
    if (sum > available && sum > 0) {
      var fixedSum = 0;
      var flexSum = 0;
      var flexIndices = [];
      for (i = 0; i < specs.length; i++) {
        if (specs[i].fixed) {
          fixedSum += widths[i];
        } else {
          flexSum += widths[i];
          flexIndices.push(i);
        }
      }
      var flexAvailable = Math.max(0, available - fixedSum);
      if (flexSum > flexAvailable && flexSum > 0) {
        scale = flexAvailable / flexSum;
        for (i = 0; i < flexIndices.length; i++) {
          var idx = flexIndices[i];
          widths[idx] = Math.max(specs[idx].min, Math.floor(widths[idx] * scale));
        }
      }
    }

    colgroup = table.querySelector("colgroup");
    if (!colgroup) {
      colgroup = document.createElement("colgroup");
      table.insertBefore(colgroup, table.firstChild);
    }
    html = "";
    for (i = 0; i < widths.length; i++) {
      html += '<col style="width:' + widths[i] + 'px">';
    }
    colgroup.innerHTML = html;
  }

  function setTableZoom(zoom) {
    state.tableZoom = zoom;
    applyTableZoom();
    saveState();
  }

  function adjustTableZoom(delta) {
    setTableZoom(state.tableZoom + delta);
  }

  function applyInputsHidden() {
    var hidden = !!state.inputHidden;
    if (els.appLayout) els.appLayout.classList.toggle("inputs-hidden", hidden);
    if (els.panePaste) els.panePaste.hidden = hidden;
    if (els.btnShowInputs) els.btnShowInputs.hidden = !hidden;
    scheduleFitTableColumns();
  }

  function setInputsHidden(hidden) {
    state.inputHidden = !!hidden;
    applyInputsHidden();
  }

  function toggleInputsHidden() {
    setInputsHidden(!state.inputHidden);
    saveState();
  }

  function focusListWorkspace() {
    setInputsHidden(true);
    if (hasConfigFields()) setConfigSummaryCollapsed(true);
    if (exportHasContent() || getNotesPlain().trim()) setCopyOutputCollapsed(true);
    saveState();
  }

  function setupWorkspaceControls() {
    if (els.btnHideInputs) {
      els.btnHideInputs.addEventListener("click", function () {
        setInputsHidden(true);
        saveState();
      });
    }
    if (els.btnShowInputs) {
      els.btnShowInputs.addEventListener("click", function () {
        setInputsHidden(false);
        saveState();
      });
    }
    if (els.btnToggleConfigSummary) {
      els.btnToggleConfigSummary.addEventListener("click", function () {
        toggleConfigSummaryCollapsed();
      });
    }
    if (els.btnToggleCopyOutput) {
      els.btnToggleCopyOutput.addEventListener("click", function () {
        toggleCopyOutputCollapsed();
      });
    }
    if (els.btnZoomIn) {
      els.btnZoomIn.addEventListener("click", function () {
        adjustTableZoom(TABLE_ZOOM_STEP);
      });
    }
    if (els.btnZoomOut) {
      els.btnZoomOut.addEventListener("click", function () {
        adjustTableZoom(-TABLE_ZOOM_STEP);
      });
    }
    if (els.btnZoomReset) {
      els.btnZoomReset.addEventListener("click", function () {
        setTableZoom(100);
      });
    }
    applyTableZoom();
    applyConfigSummaryCollapse();
    applyCopyOutputCollapse();
    applyInputsHidden();
  }


  function parseConfigLine(line) {
    var trimmed = String(line || "").replace(/\u00a0/g, " ").trim();
    var idx;
    var label;
    var value;
    if (!trimmed) return null;
    idx = trimmed.indexOf(":");
    if (idx <= 0) return null;
    label = trimmed.slice(0, idx).trim();
    value = trimmed.slice(idx + 1).replace(/^[\t\s]+/, "").trim();
    if (!label) return null;
    return { label: label, value: value };
  }

  function isLikelyConfigLine(line) {
    var parsed = parseConfigLine(line);
    if (!parsed) return false;
    if (/^(quantity|qty|part number|part no|description|price|comment)$/i.test(parsed.label)) return false;
    return true;
  }

  function splitConfigAndParts(text) {
    var lines = String(text || "").split(/\r?\n/);
    var configLines = [];
    var rest = [];
    var i;
    var line;
    var sawConfig = false;
    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      if (isLikelyConfigLine(line)) {
        configLines.push(line);
        sawConfig = true;
        continue;
      }
      if (!line.trim() && sawConfig && !rest.length) continue;
      rest.push(line);
    }
    return {
      configText: configLines.join("\n"),
      partsText: rest.join("\n"),
    };
  }

  function parseConfigPaste(text) {
    var lines = String(text || "").split(/\r?\n/);
    var fields = [];
    var i;
    var parsed;
    for (i = 0; i < lines.length; i++) {
      parsed = parseConfigLine(lines[i]);
      if (parsed) fields.push(parsed);
    }
    return fields;
  }

  function configFieldsFromParsed(parsed) {
    var fields = [];
    var i;
    for (i = 0; i < parsed.length; i++) {
      fields.push({ id: newId(), label: parsed[i].label, value: parsed[i].value });
    }
    return sortConfigFields(fields);
  }

  function looksLikeGstOptionLabel(label) {
    var text = String(label || "").trim();
    if (/^[A-Z]{2,}\d{2,}$/i.test(text)) return true;
    return looksLikePartNumber(text);
  }

  function configFieldPriority(label) {
    var key = String(label || "").trim().toLowerCase();
    var i;
    for (i = 0; i < GST_CONFIG_LABEL_ORDER.length; i++) {
      if (key === GST_CONFIG_LABEL_ORDER[i]) return (i + 1) * 10;
    }
    if (/^serial(\s*number)?$/i.test(key)) return 95;
    if (looksLikeGstOptionLabel(label)) return 85;
    return 500;
  }

  function sortConfigFields(fields) {
    return fields
      .map(function (field, index) {
        return { field: field, index: index };
      })
      .sort(function (a, b) {
        var pa = configFieldPriority(a.field.label);
        var pb = configFieldPriority(b.field.label);
        if (pa !== pb) return pa - pb;
        return a.index - b.index;
      })
      .map(function (item) {
        return item.field;
      });
  }

  function findConfigField(id) {
    var i;
    for (i = 0; i < state.configFields.length; i++) {
      if (state.configFields[i].id === id) return state.configFields[i];
    }
    return null;
  }

  function hasConfigFields() {
    var i;
    for (i = 0; i < state.configFields.length; i++) {
      if ((state.configFields[i].label || "").trim() || (state.configFields[i].value || "").trim()) return true;
    }
    return false;
  }

  function renderConfigSummary() {
    if (!els.configSummary || !els.configBody) return;
    var hasFields = hasConfigFields();
    els.configSummary.hidden = !hasFields;
    if (!hasFields) {
      els.configBody.innerHTML = "";
      if (els.addConfigField) els.addConfigField.disabled = false;
      return;
    }
    var html = "";
    var i;
    var field;
    for (i = 0; i < state.configFields.length; i++) {
      field = state.configFields[i];
      html +=
        '<div class="config-row" data-config-id="' +
        escapeAttr(field.id) +
        '">' +
        '<input class="config-label-input" data-config-label="' +
        escapeAttr(field.id) +
        '" value="' +
        escapeAttr(field.label || "") +
        '" spellcheck="false" aria-label="Configuration field name" placeholder="Application" />' +
        '<span class="config-colon" aria-hidden="true">:</span>' +
        '<input class="config-value-input" data-config-value="' +
        escapeAttr(field.id) +
        '" value="' +
        escapeAttr(field.value || "") +
        '" spellcheck="false" aria-label="Configuration field value" placeholder="Value" />' +
        '<button type="button" class="btn btn-icon config-delete" data-config-delete="' +
        escapeAttr(field.id) +
        '" title="Remove field" aria-label="Remove field">×</button>' +
        "</div>";
    }
    els.configBody.innerHTML = html;
    if (els.addConfigField) els.addConfigField.disabled = false;
    applyConfigSummaryCollapse();
    updateCopyOutput();
  }

  function addConfigField() {
    state.configFields.push({ id: newId(), label: "", value: "" });
    renderConfigSummary();
    saveState();
  }

  function formatExportDatetime(date) {
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function exportHeaderPlainLines(exportedAt) {
    return ["Exported: " + formatExportDatetime(exportedAt)];
  }

  function exportConfigPlainLines() {
    var lines = [];
    var i;
    var field;
    for (i = 0; i < state.configFields.length; i++) {
      field = state.configFields[i];
      if (!(field.label || "").trim() && !(field.value || "").trim()) continue;
      lines.push((field.label || "").trim() + ": " + (field.value || "").trim());
    }
    return lines;
  }

  function exportConfigHtml() {
    var html = "";
    var i;
    var field;
    for (i = 0; i < state.configFields.length; i++) {
      field = state.configFields[i];
      if (!(field.label || "").trim() && !(field.value || "").trim()) continue;
      html +=
        '<p class="config-export-line"><strong>' +
        escapeHtml((field.label || "").trim()) +
        ":</strong> " +
        escapeHtml((field.value || "").trim()) +
        "</p>";
    }
    return html;
  }

  function exportHeaderHtml(exportedAt) {
    var html = "<div class=\"export-meta\">";
    html += "<p><strong>Exported:</strong> " + escapeHtml(formatExportDatetime(exportedAt)) + "</p>";
    html += "</div>";
    return html;
  }

  function exportHasContent() {
    return state.rows.length > 0 || hasConfigFields();
  }

  function toCopyText() {
    var exportedAt = new Date();
    var cols = exportColumns();
    var lines = exportHeaderPlainLines(exportedAt);
    var configLines = exportConfigPlainLines();
    var notes = getNotesPlain().trim();
    var r;
    var c;
    var values;
    var i;
    if (configLines.length) {
      lines.push("");
      for (i = 0; i < configLines.length; i++) {
        lines.push(configLines[i]);
      }
    }
    if (notes) {
      lines.push("");
      lines.push("Configuration notes:");
      lines.push(notes);
    }
    if (cols.length && state.rows.length) {
      lines.push("");
      lines.push(
        cols
          .map(function (col) {
            return col.label;
          })
          .join("\t")
      );
      for (r = 0; r < state.rows.length; r++) {
        values = [];
        for (c = 0; c < cols.length; c++) {
          values.push(normalizeExportCell(getCellValue(state.rows[r], cols[c].key), cols[c].role));
        }
        lines.push(values.join("\t"));
      }
    }
    return lines.join("\r\n");
  }

  function resizeCopyOutputBox() {
    var box = els.copyOutputBox;
    var wrap = els.copyOutputWrap;
    if (!box) return;
    if (!wrap || wrap.hidden || wrap.classList.contains("is-collapsed") || !box.value) {
      box.style.height = "";
      return;
    }
    box.style.height = "auto";
    var minHeight = 288;
    box.style.height = Math.max(minHeight, box.scrollHeight + 2) + "px";
  }

  function updateCopyOutput() {
    if (!els.copyOutputWrap || !els.copyOutputBox) return;
    var hasContent = exportHasContent() || getNotesPlain().trim();
    els.copyOutputWrap.hidden = !hasContent;
    if (!hasContent) {
      els.copyOutputBox.value = "";
      els.copyOutputBox.style.height = "";
      return;
    }
    els.copyOutputBox.value = toCopyText();
    resizeCopyOutputBox();
  }

  function copyAllToClipboard() {
    var text = toCopyText();
    if (!text.trim()) {
      showToast("Nothing to copy yet.", true);
      return;
    }
    updateCopyOutput();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          showToast("Copied to clipboard.");
        })
        .catch(function () {
          fallbackCopySelect();
        });
      return;
    }
    fallbackCopySelect();
  }

  function fallbackCopySelect() {
    if (!els.copyOutputBox) return;
    els.copyOutputBox.focus();
    els.copyOutputBox.select();
    try {
      if (document.execCommand("copy")) {
        showToast("Copied to clipboard.");
      } else {
        showToast("Select the text and press Ctrl+C to copy.");
      }
    } catch (err) {
      showToast("Select the text and press Ctrl+C to copy.");
    }
  }

  function setRoleHidden(role, hidden) {
    var i;
    var any = false;
    for (i = 0; i < state.columns.length; i++) {
      if (state.columns[i].role === role) {
        state.columns[i].hidden = hidden;
        any = true;
      }
    }
    if (!any && !hidden) {
      state.columns.push({
        id: "c" + state.columns.length,
        role: role,
        sourceLabel: roleMeta(role).label,
        hidden: false,
      });
      for (i = 0; i < state.rows.length; i++) {
        if (!state.rows[i].values) state.rows[i].values = [];
        state.rows[i].values.push("");
      }
    }
  }

  function showAllColumns() {
    var i;
    for (i = 0; i < state.columns.length; i++) {
      state.columns[i].hidden = false;
    }
  }

  function renderColumnsMenu() {
    if (!els.columnsList) return;
    var html = "";
    var i;
    var role;
    var checked;
    for (i = 0; i < GST_ROLES.length; i++) {
      role = GST_ROLES[i];
      checked = roleIsVisible(role.key);
      html +=
        '<label class="columns-item"><input type="checkbox" data-role-toggle="' +
        role.key +
        '"' +
        (checked ? " checked" : "") +
        " /> " +
        escapeHtml(role.label) +
        "</label>";
    }
    els.columnsList.innerHTML = html;
  }

  function renderTable() {
    var cols = visibleColumns();
    var showTotals = totalsVisible();
    var html = "<tr>";
    var i;
    var grandTotals = {};
    var currency;
    html += '<th class="row-actions" aria-label="Row actions"></th>';
    for (i = 0; i < cols.length; i++) {
      html += '<th class="' + cols[i].className + '" data-col-index="' + cols[i].index + '">';
      html += roleSelectHtml(cols[i]);
      html += "</th>";
    }
    if (showTotals) {
      html +=
        '<th class="col-line-total">' +
        '<div class="col-header-main line-total-header">' +
        '<span class="col-legend col-legend-total">Line total</span>' +
        "</div></th>";
    }
    html += "</tr>";
    els.thead.innerHTML = html;

    var body = "";
    var r;
    var row;
    var c;
    var col;
    var lineTotal;
    for (r = 0; r < state.rows.length; r++) {
      row = state.rows[r];
      lineTotal = showTotals ? lineTotalForRow(row) : { amount: 0, currency: null };
      if (showTotals) {
        currency = lineTotal.currency || detectTableCurrency();
        grandTotals[currency] = (grandTotals[currency] || 0) + lineTotal.amount;
      }
      body += '<tr data-id="' + row.id + '" data-row-index="' + r + '">';
      body +=
        '<td class="row-actions">' +
        '<div class="row-actions-inner">' +
        '<button type="button" class="btn btn-icon" data-delete="' +
        row.id +
        '" title="Remove this line" aria-label="Remove this line">×</button></div></td>';
      for (c = 0; c < cols.length; c++) {
        col = cols[c];
        if (col.role === "description") {
          body +=
            '<td class="' +
            col.className +
            '"><textarea rows="2" data-id="' +
            row.id +
            '" data-key="' +
            escapeAttr(col.key) +
            '">' +
            escapeHtml(getCellValue(row, col.key)) +
            "</textarea></td>";
        } else {
          body +=
            '<td class="' +
            col.className +
            '"><input data-id="' +
            row.id +
            '" data-key="' +
            escapeAttr(col.key) +
            '" value="' +
            escapeAttr(getCellValue(row, col.key)) +
            '" /></td>';
        }
      }
      if (showTotals) {
        body += '<td class="col-line-total line-total-cell">' + escapeHtml(formatMoney(lineTotal)) + "</td>";
      }
      body += "</tr>";
    }
    els.tbody.innerHTML = body;

    if (els.tfoot) {
      if (showTotals && state.rows.length) {
        var foot = "<tr class=\"grand-total-row\"><td class=\"row-actions\"></td>";
        for (c = 0; c < cols.length; c++) {
          foot += "<td></td>";
        }
        foot +=
          '<td class="col-line-total grand-total-cell">' +
          formatGrandTotalHtml(grandTotals) +
          "</td></tr>";
        els.tfoot.innerHTML = foot;
      } else {
        els.tfoot.innerHTML = "";
      }
    }

    var hasRows = state.rows.length > 0;
    els.tableWrap.classList.toggle("has-rows", hasRows);
    if (els.columnsBtn) els.columnsBtn.disabled = !state.columns.length;
    renderColumnsMenu();
    els.addRow.disabled = false;
    if (els.exportBtn) els.exportBtn.disabled = !exportHasContent();
    if (!hasRows) {
      els.rowCount.textContent = "No lines yet. Paste a list, then click Organize list.";
    } else if (state.rows.length === 1) {
      els.rowCount.textContent = "1 line";
    } else {
      els.rowCount.textContent = state.rows.length + " lines";
    }
    updateCopyOutput();
    scheduleFitTableColumns();
  }

  function updateTotalsDisplay() {
    if (!totalsVisible() || !els.tfoot) return;
    var rowEls = els.tbody.querySelectorAll("tr[data-row-index]");
    var grandTotals = {};
    var i;
    var rowIdx;
    var lineTotal;
    var rowEl;
    var cell;
    var currency;
    for (i = 0; i < rowEls.length; i++) {
      rowEl = rowEls[i];
      rowIdx = Number(rowEl.getAttribute("data-row-index"));
      if (rowIdx < 0 || rowIdx >= state.rows.length) continue;
      lineTotal = lineTotalForRow(state.rows[rowIdx]);
      currency = lineTotal.currency || detectTableCurrency();
      grandTotals[currency] = (grandTotals[currency] || 0) + lineTotal.amount;
      cell = rowEl.querySelector(".line-total-cell");
      if (cell) cell.textContent = formatMoney(lineTotal);
    }
    cell = els.tfoot.querySelector(".grand-total-cell");
    if (cell) cell.innerHTML = formatGrandTotalHtml(grandTotals);
  }

  function clearDragMarks() {
    var marked = els.table.querySelectorAll(".is-dragging, .drag-over");
    var i;
    for (i = 0; i < marked.length; i++) {
      marked[i].classList.remove("is-dragging");
      marked[i].classList.remove("drag-over");
    }
  }

  function setTableDragging(on) {
    if (els.tableWrap) els.tableWrap.classList.toggle("is-reordering", on);
    document.body.classList.toggle("is-table-dragging", on);
  }

  function applyDragActiveState(active) {
    var th;
    var tr;
    if (!active || !active.handle) return;
    if (active.type === "row") {
      tr = active.handle.closest("tr");
      if (tr) tr.classList.add("is-dragging");
      return;
    }
    th = active.handle.closest("th[data-col-index]");
    if (!th) {
      th = els.thead.querySelector('th[data-col-index="' + active.fromIndex + '"]');
    }
    if (th) th.classList.add("is-dragging");
  }

  function findDropColumn(clientX, clientY) {
    var nodes = document.elementsFromPoint(clientX, clientY);
    var i;
    var th;
    for (i = 0; i < nodes.length; i++) {
      th = nodes[i].closest("th[data-col-index]");
      if (th && els.thead.contains(th)) {
        return Number(th.getAttribute("data-col-index"));
      }
    }
    return null;
  }

  function findDropRow(clientX, clientY) {
    var nodes = document.elementsFromPoint(clientX, clientY);
    var i;
    var tr;
    for (i = 0; i < nodes.length; i++) {
      tr = nodes[i].closest("tbody tr[data-row-index]");
      if (tr) return Number(tr.getAttribute("data-row-index"));
    }
    return null;
  }

  function finishTableDrag(active) {
    var toIndex = active.hoverIndex;
    if (toIndex != null && toIndex !== active.fromIndex) {
      if (active.type === "col") moveColumn(active.fromIndex, toIndex);
      else moveRow(active.fromIndex, toIndex);
      renderTable();
      saveState();
    }
    clearDragMarks();
    setTableDragging(false);
  }

  function setupTableReorder() {
    var active = null;
    var pending = null;
    var DRAG_THRESHOLD = 6;

    function isInteractiveTarget(node) {
      return !!node.closest("input, textarea, button, select, option, a, label");
    }

    function pointerDistance(startX, startY, x, y) {
      var dx = x - startX;
      var dy = y - startY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function armDrag(state, event) {
      active = state;
      pending = null;
      setTableDragging(true);
      applyDragActiveState(active);
      active.handle.setPointerCapture(event.pointerId);
      active.pointerId = event.pointerId;
      event.preventDefault();
    }

    function endDrag() {
      if (!active) return;
      finishTableDrag(active);
      active = null;
    }

    els.table.addEventListener("pointerdown", function (event) {
      var tr = event.target.closest("tbody tr[data-row-index]");
      var th = event.target.closest("th[data-col-index]");
      if (tr && !isInteractiveTarget(event.target)) {
        pending = {
          type: "row",
          fromIndex: Number(tr.getAttribute("data-row-index")),
          hoverIndex: null,
          handle: tr,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
        };
        return;
      }
      if (th && els.thead.contains(th)) {
        pending = {
          type: "col",
          fromIndex: Number(th.getAttribute("data-col-index")),
          hoverIndex: null,
          handle: th,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
        };
      }
    });

    els.table.addEventListener("pointermove", function (event) {
      var target;
      var mark;
      if (pending && event.pointerId === pending.pointerId && !active) {
        if (pointerDistance(pending.startX, pending.startY, event.clientX, event.clientY) >= DRAG_THRESHOLD) {
          armDrag(pending, event);
        } else {
          return;
        }
      }
      if (!active || event.pointerId !== active.pointerId) return;
      clearDragMarks();
      applyDragActiveState(active);
      if (active.type === "col") {
        target = findDropColumn(event.clientX, event.clientY);
        if (target != null) {
          mark = els.thead.querySelector('th[data-col-index="' + target + '"]');
          if (mark) mark.classList.add("drag-over");
        }
      } else {
        target = findDropRow(event.clientX, event.clientY);
        if (target != null) {
          mark = els.tbody.querySelector('tr[data-row-index="' + target + '"]');
          if (mark) mark.classList.add("drag-over");
        }
      }
      active.hoverIndex = target;
    });

    els.table.addEventListener("pointerup", function (event) {
      if (pending && event.pointerId === pending.pointerId) {
        pending = null;
        return;
      }
      if (!active || event.pointerId !== active.pointerId) return;
      endDrag();
    });

    els.table.addEventListener("pointercancel", function (event) {
      if (pending && event.pointerId === pending.pointerId) {
        pending = null;
      }
      if (!active || event.pointerId !== active.pointerId) return;
      clearDragMarks();
      setTableDragging(false);
      active = null;
    });

    els.table.addEventListener("lostpointercapture", function (event) {
      if (!active || event.pointerId !== active.pointerId) return;
      endDrag();
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function safeHref(href) {
    var raw = String(href || "").trim().replace(/\s+/g, "");
    if (/^https:\/\//i.test(raw) || /^http:\/\//i.test(raw)) return raw;
    if (/^mailto:/i.test(raw)) return raw;
    return "";
  }

  function noteLinkHtml(href, inner) {
    var safe = safeHref(href);
    if (!safe) return inner || "";
    return (
      '<a href="' +
      escapeAttr(safe) +
      '" target="_blank" rel="noopener noreferrer">' +
      (inner || escapeHtml(safe)) +
      "</a>"
    );
  }

  function linkifyEscapedText(escaped) {
    return String(escaped || "").replace(/(^|>)([^<]*)/g, function (_, prefix, text) {
      return (
        prefix +
        text.replace(/\bhttps?:\/\/[^\s<&]+/gi, function (url) {
          var trail = "";
          var core = url.replace(/[),.;:]+$/g, function (mark) {
            trail = mark;
            return "";
          });
          return noteLinkHtml(core, core) + trail;
        })
      );
    });
  }

  function serializeNotesNode(node) {
    var out = "";
    var i;
    var child;
    var tag;
    var href;
    var inner;
    if (!node || !node.childNodes) return "";
    for (i = 0; i < node.childNodes.length; i++) {
      child = node.childNodes[i];
      if (child.nodeType === 3) {
        out += escapeHtml(child.nodeValue);
        continue;
      }
      if (child.nodeType !== 1) continue;
      tag = child.tagName.toLowerCase();
      if (tag === "script" || tag === "style" || tag === "meta" || tag === "link" || tag === "head") continue;
      if (tag === "br") {
        out += "<br>";
        continue;
      }
      if (tag === "a") {
        href = safeHref(child.getAttribute("href"));
        inner = serializeNotesNode(child);
        out += href ? noteLinkHtml(href, inner || escapeHtml(href)) : inner;
        continue;
      }
      inner = serializeNotesNode(child);
      if (tag === "p" || tag === "div" || tag === "li" || tag === "tr" || tag === "h1" || tag === "h2" || tag === "h3" || tag === "blockquote") {
        if (out && !/<br>$/.test(out)) out += "<br>";
        out += inner;
        if (inner && !/<br>$/.test(inner)) out += "<br>";
      } else {
        out += inner;
      }
    }
    return out;
  }

  function sanitizeNotesHtml(html) {
    var doc;
    var safe;
    html = String(html || "")
      .replace(/<!--StartFragment-->/gi, "")
      .replace(/<!--EndFragment-->/gi, "");
    if (!html.trim()) return "";
    doc = new DOMParser().parseFromString(html, "text/html");
    safe = serializeNotesNode(doc.body);
    safe = linkifyEscapedText(safe);
    return safe.replace(/^(<br>)+|(<br>)+$/g, "");
  }

  function notesFromClipboard(html, text) {
    var safe;
    if (html && /<[a-z][\s\S]*>/i.test(html)) {
      safe = sanitizeNotesHtml(html);
      if (safe) return safe;
    }
    return linkifyEscapedText(escapeHtml(text || "").replace(/\r\n|\r|\n/g, "<br>"));
  }

  function notesNodeToPlain(node) {
    var parts = [];
    function walk(n) {
      var i;
      var href;
      var label;
      var tag;
      if (!n) return;
      if (n.nodeType === 3) {
        parts.push(n.nodeValue);
        return;
      }
      if (n.nodeType !== 1) return;
      tag = n.tagName.toLowerCase();
      if (tag === "a") {
        href = n.getAttribute("href") || "";
        label = (n.innerText || "").replace(/\s+/g, " ").trim();
        if (href && label && label !== href && label.replace(/^https?:\/\//i, "") !== href.replace(/^https?:\/\//i, "")) {
          parts.push(label + " (" + href + ")");
        } else {
          parts.push(href || label);
        }
        return;
      }
      if (tag === "br") {
        parts.push("\n");
        return;
      }
      if ((tag === "p" || tag === "div" || tag === "li") && parts.length && parts[parts.length - 1] !== "\n") {
        parts.push("\n");
      }
      for (i = 0; i < n.childNodes.length; i++) walk(n.childNodes[i]);
      if (tag === "p" || tag === "div" || tag === "li") parts.push("\n");
    }
    walk(node);
    return parts.join("").replace(/\n{3,}/g, "\n\n").replace(/^\n+|\n+$/g, "");
  }

  function getNotesHtml() {
    if (!els.notesBox) return "";
    return els.notesBox.innerHTML || "";
  }

  function getNotesPlain() {
    if (!els.notesBox) return "";
    return notesNodeToPlain(els.notesBox);
  }

  function notesAreEmpty() {
    var text;
    if (!els.notesBox) return true;
    text = (els.notesBox.innerText || "").replace(/\u00a0/g, " ").trim();
    return !text;
  }

  function syncNotesEmpty() {
    if (!els.notesBox) return;
    els.notesBox.classList.toggle("is-empty", notesAreEmpty());
  }

  function setNotesHtml(html) {
    if (!els.notesBox) return;
    els.notesBox.innerHTML = html || "";
    syncNotesEmpty();
  }

  function setNotesFromText(text) {
    setNotesHtml(notesFromClipboard("", text || ""));
  }

  function insertNotesHtml(html) {
    var sel = window.getSelection();
    var range;
    var frag;
    var last;
    if (!els.notesBox) return;
    els.notesBox.focus();
    if (!sel || !sel.rangeCount) {
      els.notesBox.innerHTML = (els.notesBox.innerHTML || "") + html;
      syncNotesEmpty();
      return;
    }
    range = sel.getRangeAt(0);
    if (!els.notesBox.contains(range.commonAncestorContainer)) {
      els.notesBox.innerHTML = html;
      syncNotesEmpty();
      return;
    }
    range.deleteContents();
    frag = range.createContextualFragment(html);
    last = frag.lastChild;
    range.insertNode(frag);
    if (last) {
      range.setStartAfter(last);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    syncNotesEmpty();
  }

  function findRow(id) {
    var i;
    for (i = 0; i < state.rows.length; i++) {
      if (state.rows[i].id === id) return state.rows[i];
    }
    return null;
  }

  function showToast(message, isError) {
    els.toast.textContent = message;
    els.toast.classList.toggle("error", !!isError);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.textContent = "";
    }, 2500);
  }

  function saveState() {
    var payload = {
      configPaste: els.configPasteBox ? els.configPasteBox.value : "",
      paste: els.pasteBox.value,
      notes: getNotesPlain(),
      notesHtml: getNotesHtml(),
      configFields: state.configFields,
      rows: state.rows,
      columns: state.columns,
      inputHidden: state.inputHidden,
      configSummaryCollapsed: state.configSummaryCollapsed,
      copyOutputCollapsed: state.copyOutputCollapsed,
      tableZoom: state.tableZoom,
      nextId: nextId,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      els.saveNote.hidden = false;
    } catch (err) {
      els.saveNote.hidden = true;
    }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var payload = JSON.parse(raw);
      if (els.configPasteBox) els.configPasteBox.value = payload.configPaste || "";
      els.pasteBox.value = payload.paste || "";
      if (els.notesBox) {
        if (payload.notesHtml) setNotesHtml(sanitizeNotesHtml(payload.notesHtml));
        else setNotesFromText(payload.notes || "");
      }
      state.configFields = payload.configFields || [];
      if (!state.configFields.length && payload.machine) {
        state.configFields = [{ id: newId(), label: "Machine", value: payload.machine }];
      }
      state.rows = migrateRows(payload.rows || [], payload);
      state.columns = payload.columns && payload.columns.length ? payload.columns : inferColumnsFromLegacy(payload);
      state.inputHidden = !!(payload.inputHidden || payload.inputDocked);
      state.configSummaryCollapsed = !!payload.configSummaryCollapsed;
      state.copyOutputCollapsed = !!payload.copyOutputCollapsed;
      state.tableZoom = payload.tableZoom || 100;
      nextId = payload.nextId || state.rows.length + 1;
      if (payload.hidePrices && state.columns.length) {
        setRoleHidden("price", true);
      }
      renderConfigSummary();
      if (state.rows.length) {
        renderTable();
        els.saveNote.hidden = false;
      } else if (hasConfigFields()) {
        if (els.exportBtn) els.exportBtn.disabled = false;
        els.saveNote.hidden = false;
      }
      applyTableZoom();
      applyConfigSummaryCollapse();
      applyCopyOutputCollapse();
      applyInputsHidden();
    } catch (err) {
      // Ignore a damaged save and start clean.
    }
  }

  function organizeConfig(text) {
    var parsed = parseConfigPaste(text);
    if (!parsed.length) return 0;
    state.configFields = configFieldsFromParsed(parsed);
    renderConfigSummary();
    return parsed.length;
  }

  function organizeParts(text, html) {
    var parsed = parsePaste(text, html);
    if (!parsed.rows.length) return 0;
    state.rows = parsed.rows;
    state.columns = parsed.columns;
    renderTable();
    return parsed.rows.length;
  }

  function organizeAll(partsHtml) {
    var configText = els.configPasteBox ? els.configPasteBox.value : "";
    var partsText = els.pasteBox.value;
    var split = splitConfigAndParts(partsText);
    var configCount = 0;
    var partsCount = 0;
    var messages = [];

    if (configText.trim()) {
      configCount = organizeConfig(configText);
      if (!configCount) {
        showToast("Could not read configuration lines. Use Label: Value on each line.", true);
        return;
      }
      messages.push(configCount + (configCount === 1 ? " configuration field" : " configuration fields"));
    } else if (split.configText.trim()) {
      configCount = organizeConfig(split.configText);
      partsText = split.partsText;
      if (configCount) {
        messages.push(configCount + (configCount === 1 ? " configuration field" : " configuration fields"));
      }
    }

    if (partsText.trim()) {
      partsCount = organizeParts(partsText, partsHtml || "");
      if (!partsCount && !configCount) {
        showToast("Nothing to organize. Paste GST configuration or a parts table, then click Organize list.", true);
        return;
      }
      if (partsCount) {
        messages.push(partsCount + (partsCount === 1 ? " part line" : " part lines"));
      }
    }

    if (!configCount && !partsCount) {
      showToast("Nothing to organize. Paste GST configuration or a parts table, then click Organize list.", true);
      return;
    }

    if (!partsCount && configCount) {
      if (els.exportBtn) els.exportBtn.disabled = !exportHasContent();
    }

    if (configCount || partsCount) {
      focusListWorkspace();
    } else {
      saveState();
    }
    showToast("Organized " + messages.join(" and ") + ".");
  }

  function exportColumns() {
    return visibleColumns();
  }

  function csvCell(value) {
    var text = String(value == null ? "" : value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (/[",\n]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function normalizeExportCell(value, role) {
    if (role === "price") {
      var parsed = parseMoneyText(value);
      return formatMoney(parsed.amount, parsed.currency);
    }
    return String(value == null ? "" : value);
  }

  function toCsv(exportedAt) {
    var cols = exportColumns();
    var lines = [];
    var headerLines = exportHeaderPlainLines(exportedAt);
    var configLines = exportConfigPlainLines();
    var i;
    for (i = 0; i < headerLines.length; i++) {
      lines.push(csvCell(headerLines[i]));
    }
    if (configLines.length) {
      lines.push("");
      for (i = 0; i < configLines.length; i++) {
        lines.push(csvCell(configLines[i]));
      }
    }
    if (cols.length && state.rows.length) {
      lines.push("");
      var headers = cols.map(function (col) {
        return csvCell(col.label);
      });
      lines.push(headers.join(","));
      var r;
      var c;
      var values;
      for (r = 0; r < state.rows.length; r++) {
        values = [];
        for (c = 0; c < cols.length; c++) {
          values.push(csvCell(normalizeExportCell(getCellValue(state.rows[r], cols[c].key), cols[c].role)));
        }
        lines.push(values.join(","));
      }
    }
    return lines.join("\r\n");
  }

  function exportFileName(ext) {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1);
    var d = String(now.getDate());
    var h = String(now.getHours());
    var min = String(now.getMinutes());
    if (m.length < 2) m = "0" + m;
    if (d.length < 2) d = "0" + d;
    if (h.length < 2) h = "0" + h;
    if (min.length < 2) min = "0" + min;
    return "gst-bom-" + y + "-" + m + "-" + d + "-" + h + min + "." + ext;
  }

  function downloadFile(contents, filename, mime, okMessage) {
    var blob = new Blob([contents], { type: mime });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(okMessage);
  }

  function downloadExcelSheets() {
    var exportedAt = new Date();
    var filename = exportFileName("csv");
    downloadFile(
      "\uFEFF" + toCsv(exportedAt),
      filename,
      "text/csv;charset=utf-8",
      "Saved " + filename + ". Open in Excel, or upload to Google Sheets (File → Import)."
    );
  }

  function toDocumentHtml(exportedAt) {
    var cols = exportColumns();
    var notesHtml = sanitizeNotesHtml(getNotesHtml());
    var html = "";
    var r;
    var c;
    var value;
    html +=
      "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
      "<title>GST BOM</title>" +
      "<style>" +
      "body{font-family:\"Open Sans\",sans-serif;font-size:11pt;color:#252A2E;margin:1rem;}" +
      "h1{font-size:16pt;font-weight:600;margin:0 0 0.5rem;}" +
      "h2{font-size:13pt;font-weight:600;margin:1.25rem 0 0.5rem;}" +
      "p{margin:0 0 0.75rem;}" +
      ".export-meta{margin:0 0 1rem;padding:0.65rem 0.85rem;background:#F1F1F6;border:1px solid #D5D7DC;border-radius:6px;}" +
      ".export-meta p{margin:0 0 0.35rem;}" +
      ".config-export{margin:0 0 1rem;}" +
      ".config-export-line{margin:0 0 0.45rem;font-size:11pt;line-height:1.35;color:#0063A3;}" +
      ".config-export-line strong{font-weight:600;color:#252A2E;}" +
      "a{color:#0063A3;}" +
      "table{border-collapse:collapse;width:100%;margin-top:0.35rem;}" +
      "th,td{border:1px solid #D5D7DC;padding:0.35rem 0.5rem;text-align:left;vertical-align:top;}" +
      "th{background:#F1F1F6;font-weight:600;}" +
      "</style></head><body>";
    html += "<h1>GST BOM</h1>";
    html += exportHeaderHtml(exportedAt);
    if (hasConfigFields()) {
      html += "<div class=\"config-export\">" + exportConfigHtml() + "</div>";
    }
    if (notesHtml) {
      html += "<h2>Configuration notes</h2><div>" + notesHtml + "</div>";
    }
    if (state.rows.length && cols.length) {
      html += "<h2>Parts list</h2><table><thead><tr>";
      for (c = 0; c < cols.length; c++) {
        html += "<th>" + escapeHtml(cols[c].label) + "</th>";
      }
      html += "</tr></thead><tbody>";
      for (r = 0; r < state.rows.length; r++) {
        html += "<tr>";
        for (c = 0; c < cols.length; c++) {
          value = normalizeExportCell(getCellValue(state.rows[r], cols[c].key), cols[c].role);
          html += "<td>" + escapeHtml(value).replace(/\n/g, "<br>") + "</td>";
        }
        html += "</tr>";
      }
      html += "</tbody></table>";
    }
    html += "</body></html>";
    return html;
  }

  function downloadWordDocs() {
    var exportedAt = new Date();
    var filename = exportFileName("doc");
    downloadFile(
      toDocumentHtml(exportedAt),
      filename,
      "application/msword;charset=utf-8",
      "Saved " + filename + ". Open in Word, or upload to Google Docs (File → Open)."
    );
  }

  function runExport(preset) {
    saveState();
    if (preset === "excel") downloadExcelSheets();
    else if (preset === "word") downloadWordDocs();
  }

  els.organize.addEventListener("click", function () {
    organizeAll("");
  });

  els.sample.addEventListener("click", function () {
    if (els.configPasteBox) els.configPasteBox.value = SAMPLE_CONFIG;
    els.pasteBox.value = SAMPLE_PASTE;
    if (els.notesBox) setNotesFromText(SAMPLE_NOTES);
    organizeAll("");
  });

  els.clear.addEventListener("click", function () {
    if (els.configPasteBox) els.configPasteBox.value = "";
    els.pasteBox.value = "";
    if (els.notesBox) setNotesHtml("");
    state.configFields = [];
    state.rows = [];
    state.columns = [];
    state.inputHidden = false;
    state.configSummaryCollapsed = false;
    state.copyOutputCollapsed = false;
    state.tableZoom = 100;
    applyTableZoom();
    applyConfigSummaryCollapse();
    applyCopyOutputCollapse();
    applyInputsHidden();
    renderConfigSummary();
    renderTable();
    updateCopyOutput();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {}
    els.saveNote.hidden = true;
    showToast("Cleared.");
  });

  function placeExportMenu() {
    var menu = els.exportMenu;
    var btn = els.exportBtn;
    var box;
    var left;
    var pad = 8;
    if (!menu || !btn || menu.hidden) return;
    menu.style.position = "fixed";
    menu.style.right = "auto";
    menu.style.top = Math.round(btn.getBoundingClientRect().bottom + 6) + "px";
    menu.style.left = Math.round(btn.getBoundingClientRect().left) + "px";
    box = menu.getBoundingClientRect();
    left = box.left;
    if (box.right > window.innerWidth - pad) {
      left = window.innerWidth - pad - box.width;
    }
    if (left < pad) left = pad;
    menu.style.left = Math.round(left) + "px";
  }

  function placeColumnsMenu() {
    var menu = els.columnsMenu;
    var btn = els.columnsBtn;
    var box;
    var left;
    var pad = 8;
    if (!menu || !btn || menu.hidden) return;
    menu.style.position = "fixed";
    menu.style.right = "auto";
    menu.style.top = Math.round(btn.getBoundingClientRect().bottom + 6) + "px";
    menu.style.left = Math.round(btn.getBoundingClientRect().left) + "px";
    box = menu.getBoundingClientRect();
    left = box.left;
    if (box.right > window.innerWidth - pad) {
      left = window.innerWidth - pad - box.width;
    }
    if (left < pad) left = pad;
    menu.style.left = Math.round(left) + "px";
  }

  if (els.columnsBtn && els.columnsMenu) {
    els.columnsBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      els.columnsMenu.hidden = !els.columnsMenu.hidden;
      if (els.columnsMenu.hidden) {
        els.columnsMenu.style.position = "";
        els.columnsMenu.style.top = "";
        els.columnsMenu.style.left = "";
      } else {
        placeColumnsMenu();
      }
    });
    document.addEventListener("click", function (event) {
      if (els.columnsMenu.hidden) return;
      if (event.target.closest(".columns-wrap")) return;
      els.columnsMenu.hidden = true;
      els.columnsMenu.style.position = "";
      els.columnsMenu.style.top = "";
      els.columnsMenu.style.left = "";
    });
    window.addEventListener("resize", placeColumnsMenu);
    window.addEventListener("scroll", placeColumnsMenu, true);
  }

  if (els.showAll) {
    els.showAll.addEventListener("click", function () {
      showAllColumns();
      renderTable();
      saveState();
    });
  }

  if (els.columnsList) {
    els.columnsList.addEventListener("change", function (event) {
      var box = event.target;
      if (!box || !box.getAttribute("data-role-toggle")) return;
      setRoleHidden(box.getAttribute("data-role-toggle"), !box.checked);
      renderTable();
      saveState();
    });
  }

  els.thead.addEventListener("change", function (event) {
    var select = event.target;
    if (!select || !select.getAttribute("data-col-index")) return;
    setColumnRole(Number(select.getAttribute("data-col-index")), select.value);
    renderTable();
    saveState();
    showToast("Column updated.");
  });

  els.addRow.addEventListener("click", function () {
    state.rows.push(emptyRow());
    renderTable();
    saveState();
  });

  if (els.addConfigField) {
    els.addConfigField.addEventListener("click", function () {
      addConfigField();
    });
  }

  if (els.configBody) {
    els.configBody.addEventListener("input", function (event) {
      var input = event.target;
      var id;
      var field;
      if (!input || !input.getAttribute) return;
      id = input.getAttribute("data-config-label") || input.getAttribute("data-config-value");
      if (!id) return;
      field = findConfigField(id);
      if (!field) return;
      if (input.getAttribute("data-config-label")) field.label = input.value;
      else field.value = input.value;
      applyConfigSummaryCollapse();
      updateTotalsDisplay();
      updateCopyOutput();
      saveState();
    });
    els.configBody.addEventListener("click", function (event) {
      var button = event.target.closest("[data-config-delete]");
      if (!button) return;
      var deleteId = button.getAttribute("data-config-delete");
      state.configFields = state.configFields.filter(function (field) {
        return field.id !== deleteId;
      });
      renderConfigSummary();
      if (els.exportBtn) els.exportBtn.disabled = !exportHasContent();
      saveState();
    });
  }

  if (els.configPasteBox) {
    els.configPasteBox.addEventListener("input", function () {
      saveState();
    });
  }

  if (els.copyAllBtn) {
    els.copyAllBtn.addEventListener("click", function () {
      copyAllToClipboard();
    });
  }

  if (els.exportBtn && els.exportMenu) {
    els.exportBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      els.exportMenu.hidden = !els.exportMenu.hidden;
      if (els.exportMenu.hidden) {
        els.exportMenu.style.position = "";
        els.exportMenu.style.top = "";
        els.exportMenu.style.left = "";
      } else {
        placeExportMenu();
      }
    });
    els.exportMenu.addEventListener("click", function (event) {
      var option = event.target.closest("[data-export-preset]");
      if (!option) return;
      els.exportMenu.hidden = true;
      els.exportMenu.style.position = "";
      els.exportMenu.style.top = "";
      els.exportMenu.style.left = "";
      runExport(option.getAttribute("data-export-preset"));
    });
    document.addEventListener("click", function (event) {
      if (els.exportMenu.hidden) return;
      if (event.target.closest(".export-wrap")) return;
      els.exportMenu.hidden = true;
      els.exportMenu.style.position = "";
      els.exportMenu.style.top = "";
      els.exportMenu.style.left = "";
    });
    window.addEventListener("resize", placeExportMenu);
    window.addEventListener("scroll", placeExportMenu, true);
  }

  els.pasteBox.addEventListener("paste", function (event) {
    var html = event.clipboardData ? event.clipboardData.getData("text/html") : "";
    var text = event.clipboardData ? event.clipboardData.getData("text/plain") : "";
    window.setTimeout(function () {
      organizeAll(html);
    }, 0);
  });

  els.pasteBox.addEventListener("input", function () {
    saveState();
  });

  if (els.notesBox) {
    syncNotesEmpty();
    els.notesBox.addEventListener("input", function () {
      syncNotesEmpty();
      updateCopyOutput();
      saveState();
    });
    els.notesBox.addEventListener("paste", function (event) {
      var html = event.clipboardData ? event.clipboardData.getData("text/html") : "";
      var text = event.clipboardData ? event.clipboardData.getData("text/plain") : "";
      event.preventDefault();
      insertNotesHtml(notesFromClipboard(html, text));
      updateCopyOutput();
      saveState();
    });
    els.notesBox.addEventListener("copy", function (event) {
      var sel = window.getSelection();
      var holder;
      var html;
      var plain;
      if (!sel || sel.isCollapsed || !event.clipboardData) return;
      holder = document.createElement("div");
      holder.appendChild(sel.getRangeAt(0).cloneContents());
      html = sanitizeNotesHtml(holder.innerHTML);
      plain = notesNodeToPlain(holder);
      if (!html && !plain) return;
      event.preventDefault();
      event.clipboardData.setData("text/html", html);
      event.clipboardData.setData("text/plain", plain);
    });
    els.notesBox.addEventListener("click", function (event) {
      var link = event.target.closest("a");
      if (!link || !els.notesBox.contains(link)) return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        window.open(link.href, "_blank", "noopener,noreferrer");
      }
    });
  }

  els.tbody.addEventListener("input", function (event) {
    var input = event.target;
    if (!input || !input.getAttribute) return;
    var row = findRow(input.getAttribute("data-id"));
    if (!row) return;
    setCellValue(row, input.getAttribute("data-key"), input.value);
    updateTotalsDisplay();
    updateCopyOutput();
    saveState();
  });

  els.tbody.addEventListener("click", function (event) {
    var button = event.target.closest("[data-delete]");
    if (!button) return;
    var id = button.getAttribute("data-delete");
    state.rows = state.rows.filter(function (row) {
      return row.id !== id;
    });
    renderTable();
    saveState();
  });

  setupWorkspaceControls();
  setupTableReorder();
  loadState();
  renderConfigSummary();
  if (!state.rows.length) {
    renderTable();
  }
  window.addEventListener("resize", scheduleFitTableColumns);
  if (els.tableWrap && typeof ResizeObserver !== "undefined") {
    new ResizeObserver(scheduleFitTableColumns).observe(els.tableWrap);
  }
  window.addEventListener("resize", resizeCopyOutputBox);
})();
