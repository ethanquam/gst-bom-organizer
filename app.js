(function () {
  "use strict";

  var STORAGE_KEY = "gst-bom-organizer-v1";

  var WORKFLOW_PROFILES = {
    machines: {
      id: "machines",
      label: "Machines",
      configLabelOrder: [
        "application",
        "manufacturer",
        "factory fit level",
        "mount type",
        "machine model",
        "model",
        "build number",
        "automatics",
      ],
      configFieldPlaceholder: "Application",
      configPastePlaceholder:
        "Application:\tTrimble Earthworks - Excavator\nManufacturer:\tCaterpillar\nFactory Fit Level:\tCat Grade 2D Assist (Basic 2D)",
      configPasteHint:
        "From the final GST screen, copy the configuration block on the right (application, manufacturer, factory fit, model, serial, options). Each line is <strong>Label:</strong> then the value. Click <strong>Organize list</strong> to sort fields into GST machine order.",
      notesHint:
        "Copy GST notes as you work through each step (serial range, factory fit warnings, licensing, SNM941 compliance, and so on). GST has no back button — if you miss a note, you start over. Web links stay as real addresses. Hold Ctrl- or ⌘-click a link to open it.",
      configSummaryHint: "Edit fields below. Organize list sorts into GST machine order.",
    },
    sitePositioning: {
      id: "sitePositioning",
      label: "Site Positioning",
      configLabelOrder: [
        "product line",
        "data collector type",
        "receiver model",
        "receiver configuration",
        "optical options",
        "total station product type",
        "accessory package option",
        "software option",
        "software maintenance",
        "siteworks machine guidance hardware",
      ],
      configFieldPlaceholder: "Product Line",
      configPastePlaceholder:
        "Product Line:\tGNSS Receiver\nReceiver Model:\tR780\nReceiver Configuration:\t:R780 Model 2 450/900Mhz Radio\nAccessory Package Option:\tNo Accessory Package",
      configPasteHint:
        "From the final GST screen, copy the configuration summary (product line, receiver or collector model, optical or software options, accessory package). Each line is <strong>Label:</strong> then the value. Click <strong>Organize list</strong> to sort fields into GST site-positioning order.",
      notesHint:
        "Copy GST notes as you work through each step. Site Positioning often uses <strong>Next</strong> between steps — capture notes before you advance. GST has no back button. Web links stay as real addresses. Hold Ctrl- or ⌘-click a link to open it.",
      configSummaryHint: "Edit fields below. Organize list sorts into GST site-positioning order.",
    },
  };

  var WORKFLOW_NEUTRAL = {
    configPastePlaceholder:
      "Application:\tTrimble Earthworks - Excavator\nManufacturer:\tCaterpillar\nFactory Fit Level:\tCat Grade 2D Assist (Basic 2D)\n\n—or—\n\nProduct Line:\tGNSS Receiver\nReceiver Model:\tR780\nReceiver Configuration:\t:R780 Model 2 450/900Mhz Radio\nAccessory Package Option:\tNo Accessory Package",
    configPasteHint:
      "From the final GST screen, copy the configuration block on the right. Each line is <strong>Label:</strong> then the value. Click <strong>Organize list</strong> — field order is chosen automatically for Machines or Site Positioning.",
    notesHint:
      "Copy GST notes as you work through each step. GST has no back button — if you miss a note, you start over. Web links stay as real addresses. Hold Ctrl- or ⌘-click a link to open it.",
    configSummaryHint: "Edit fields below. Organize list sorts fields into GST order automatically.",
  };

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
    hidePrices: document.getElementById("hide-prices"),
    columnsBtn: document.getElementById("btn-columns"),
    columnsMenu: document.getElementById("columns-menu"),
    columnsList: document.getElementById("columns-menu-list"),
    showAll: document.getElementById("btn-show-all"),
    addRow: document.getElementById("btn-add-row"),
    autoSort: document.getElementById("btn-auto-sort"),
    addGroupHeader: document.getElementById("btn-add-group-header"),
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
    table: document.getElementById("bom-table"),
    thead: document.querySelector("#bom-table thead"),
    tbody: document.querySelector("#bom-table tbody"),
    tfoot: document.querySelector("#bom-table tfoot"),
    tableWrap: document.querySelector(".table-wrap"),
    rowCount: document.getElementById("row-count"),
    toast: document.getElementById("toast"),
    saveNote: document.getElementById("save-note"),
    configPasteHint: document.getElementById("config-paste-hint"),
    notesPasteHint: document.getElementById("notes-paste-hint"),
    configSummaryHint: document.getElementById("config-summary-hint"),
  };

  var columnsMenuAnchor = null;
  var exportMenuAnchor = null;

  function workflowSignalScore(label, value, workflowId) {
    var key = String(label || "").trim().toLowerCase();
    var text = (key + " " + String(value || "")).toLowerCase();
    var order = WORKFLOW_PROFILES[workflowId].configLabelOrder;
    var score = 0;
    var i;
    for (i = 0; i < order.length; i++) {
      if (key === order[i]) score += 12;
      else if (key.indexOf(order[i]) >= 0) score += 6;
    }
    if (workflowId === "sitePositioning") {
      if (/product line|receiver model|data collector|total station|optical options|accessory package/.test(text)) {
        score += 2;
      }
      if (/\b(r780|r750|da2|tsc710|tsc7|sps|siteworks|gnss receiver|total station)\b/.test(text)) score += 2;
    }
    if (workflowId === "machines") {
      if (/earthworks|accugrade|cat grade|factory fit|machine model|mount type/.test(text)) score += 2;
      if (/\b(dozer|excavator|motor grader|wheel loader|soil compactor)\b/.test(text)) score += 2;
      if (/1600\d{2}-/.test(text)) score += 3;
      if (/\bkit\s*-\s*base\b/.test(text)) score += 1;
    }
    return score;
  }

  function detectWorkflowFromConfigFields(fields) {
    var machines = 0;
    var site = 0;
    var i;
    for (i = 0; i < fields.length; i++) {
      machines += workflowSignalScore(fields[i].label, fields[i].value, "machines");
      site += workflowSignalScore(fields[i].label, fields[i].value, "sitePositioning");
    }
    if (site > machines) return "sitePositioning";
    if (machines > site) return "machines";
    return null;
  }

  function detectWorkflowFromText(text) {
    var machines = 0;
    var site = 0;
    var blob = String(text || "");
    if (!blob.trim()) return null;
    machines += workflowSignalScore("application", blob, "machines");
    machines += workflowSignalScore("factory fit level", blob, "machines");
    machines += workflowSignalScore("machine model", blob, "machines");
    site += workflowSignalScore("product line", blob, "sitePositioning");
    site += workflowSignalScore("receiver model", blob, "sitePositioning");
    site += workflowSignalScore("data collector type", blob, "sitePositioning");
    site += workflowSignalScore("total station product type", blob, "sitePositioning");
    if (site > machines) return "sitePositioning";
    if (machines > site) return "machines";
    return null;
  }

  function detectWorkflowFromRows() {
    var machines = 0;
    var site = 0;
    var i;
    var desc;
    var part;
    for (i = 0; i < state.rows.length; i++) {
      if (isGroupHeaderRow(state.rows[i])) continue;
      desc = rowTextByRole(state.rows[i], "description");
      part = rowTextByRole(state.rows[i], "part");
      machines += workflowSignalScore("", desc + " " + part, "machines");
      site += workflowSignalScore("", desc + " " + part, "sitePositioning");
    }
    if (site > machines) return "sitePositioning";
    if (machines > site) return "machines";
    return null;
  }

  function hasWorkflowSignals() {
    if (detectWorkflowFromConfigFields(state.configFields)) return true;
    if (detectWorkflowFromRows()) return true;
    if (detectWorkflowFromText(els.configPasteBox ? els.configPasteBox.value : "")) return true;
    if (detectWorkflowFromText(els.pasteBox ? els.pasteBox.value : "")) return true;
    return false;
  }

  function resolveWorkflowId() {
    return (
      detectWorkflowFromConfigFields(state.configFields) ||
      detectWorkflowFromRows() ||
      detectWorkflowFromText(els.configPasteBox ? els.configPasteBox.value : "") ||
      detectWorkflowFromText(els.pasteBox ? els.pasteBox.value : "") ||
      "machines"
    );
  }

  function syncWorkflowFromInput() {
    var next = resolveWorkflowId();
    var changed = state.workflow !== next;
    state.workflow = next;
    applyWorkflowProfile();
    return changed;
  }

  function tableActionButtons(action) {
    return document.querySelectorAll('[data-table-action="' + action + '"]');
  }

  function setTableActionDisabled(action, disabled) {
    var buttons = tableActionButtons(action);
    var i;
    for (i = 0; i < buttons.length; i++) {
      buttons[i].disabled = disabled;
    }
  }

  function setShowGstInputsButtonsVisible(visible) {
    var buttons = tableActionButtons("show-inputs");
    var i;
    for (i = 0; i < buttons.length; i++) {
      buttons[i].hidden = !visible;
    }
  }

  var state = {
    rows: [],
    columns: [],
    extraKeys: [],
    hidePrices: false,
    configFields: [],
    workflow: "machines",
    inputHidden: false,
    configSummaryCollapsed: false,
    copyOutputCollapsed: false,
    columnWidths: {},
  };

  var COLUMN_SLOT_ACTIONS = "__actions__";
  var COLUMN_SLOT_LINE_TOTAL = "__lineTotal__";
  var columnResizeTimer = null;

  function tableWrapInnerWidth(wrap) {
    var width = wrap.clientWidth;
    if (width < 160) return width;
    // Stay inside the pane when scrollbars or sub-pixel rounding appear.
    return Math.max(160, width - 2);
  }

  var toastTimer = null;
  var nextId = 1;

  function getWorkflowProfile() {
    return WORKFLOW_PROFILES[state.workflow] || WORKFLOW_PROFILES.machines;
  }

  function applyWorkflowProfile() {
    var profile = getWorkflowProfile();
    var hints = hasWorkflowSignals() ? profile : WORKFLOW_NEUTRAL;
    if (els.configPasteHint) els.configPasteHint.innerHTML = hints.configPasteHint;
    if (els.notesPasteHint) els.notesPasteHint.innerHTML = hints.notesHint;
    if (els.configSummaryHint) els.configSummaryHint.textContent = hints.configSummaryHint;
    if (els.configPasteBox) els.configPasteBox.placeholder = WORKFLOW_NEUTRAL.configPastePlaceholder;
    document.body.classList.toggle("workflow-site-positioning", profile.id === "sitePositioning");
    document.body.classList.toggle("workflow-machines", profile.id === "machines");
  }

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

  function isGroupHeaderRow(row) {
    return !!(row && row.rowType === "groupHeader");
  }

  function groupHeaderRow(label) {
    var row = emptyRow();
    var descIdx = columnIndexByRole("description");
    row.rowType = "groupHeader";
    if (descIdx >= 0) row.values[descIdx] = label || "";
    return row;
  }

  function countDataRows(rows) {
    var total = 0;
    var i;
    for (i = 0; i < rows.length; i++) {
      if (!isGroupHeaderRow(rows[i])) total++;
    }
    return total;
  }

  function autoSortGroupKey(item) {
    if (item.autoGroup) return item.autoGroup;
    return "unknown";
  }

  function autoSortGroupLabel(key) {
    var labels = {
      kits: "Kits",
      gnss_receiver: "GNSS Receiver(s)",
      option_keys: "Receiver options & upgrades",
      gnss_antenna: "GNSS antennas",
      radios_uhf: "Radios & UHF",
      power_charging: "Power & charging",
      cables: "Cables",
      mounts_brackets: "Mounts & brackets",
      data_collector: "Data collectors",
      accessories: "Accessories",
      optical: "Optical / total station",
      sensors: "Sensors",
      components: "Components",
      software: "Software",
      licenses: "Licenses",
      protection_plans: "Protection plans",
      cases_transport: "Cases & transport",
      install: "Install / labor / freight",
      unknown: "Unknown",
    };
    return labels[key] || key;
  }

  function autoGroupSortOrder(groupKey) {
    var order = {
      kits: 5,
      gnss_receiver: 10,
      option_keys: 20,
      gnss_antenna: 30,
      radios_uhf: 40,
      power_charging: 50,
      cables: 60,
      mounts_brackets: 70,
      data_collector: 80,
      accessories: 82,
      optical: 85,
      sensors: 88,
      components: 90,
      software: 100,
      licenses: 105,
      protection_plans: 110,
      cases_transport: 120,
      install: 125,
      unknown: 999,
    };
    return order[groupKey] != null ? order[groupKey] : 999;
  }

  function buildRowsWithGroupHeaders(decorated) {
    var output = [];
    var currentKey = null;
    var i;
    var key;
    for (i = 0; i < decorated.length; i++) {
      key = autoSortGroupKey(decorated[i]);
      if (key !== currentKey) {
        output.push(groupHeaderRow(autoSortGroupLabel(key)));
        currentKey = key;
      }
      output.push(decorated[i].row);
    }
    return output;
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
        colId: col.id || String(i),
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

  function columnIndexByRole(role) {
    var i;
    for (i = 0; i < state.columns.length; i++) {
      if (state.columns[i].role === role) return i;
    }
    return -1;
  }

  function rowTextByRole(row, role) {
    var index = columnIndexByRole(role);
    if (index < 0) return "";
    return String(getCellValue(row, String(index)) || "").trim();
  }

  function bomGroupData() {
    return window.GST_BOM_GROUP || null;
  }

  var trimbleCatalogPartIndex = null;

  function normalizePartForLookup(part) {
    return String(part || "")
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function trimbleCatalogLookupKeys(part) {
    var normalized = normalizePartForLookup(part);
    var keys = [normalized];
    var stripped;
    if (!normalized) return keys;
    stripped = normalized.replace(/(-HH|-GEO|-BLK)+$/i, "");
    if (stripped && stripped !== normalized) keys.push(stripped);
    return keys;
  }

  function ensureTrimbleCatalogIndex() {
    var catalog;
    var entries;
    var i;
    var entry;
    var key;
    if (trimbleCatalogPartIndex) return trimbleCatalogPartIndex;
    trimbleCatalogPartIndex = {};
    catalog = window.TRIMBLE_COMPONENTS_CATALOG;
    if (!catalog || !catalog.entries) return trimbleCatalogPartIndex;
    entries = catalog.entries;
    for (i = 0; i < entries.length; i++) {
      entry = entries[i];
      key = normalizePartForLookup(entry.part);
      if (key && !trimbleCatalogPartIndex[key]) trimbleCatalogPartIndex[key] = entry;
    }
    return trimbleCatalogPartIndex;
  }

  function trimbleCatalogEntryForPart(part) {
    var index;
    var keys;
    var i;
    if (!part) return null;
    index = ensureTrimbleCatalogIndex();
    keys = trimbleCatalogLookupKeys(part);
    for (i = 0; i < keys.length; i++) {
      if (index[keys[i]]) return index[keys[i]];
    }
    return null;
  }

  function catalogCategoryForPart(part) {
    var entry = trimbleCatalogEntryForPart(part);
    return entry && entry.category ? entry.category : null;
  }

  function bomCategorySortOrder(categoryKey) {
    var data = bomGroupData();
    var categories;
    var i;
    if (!data || !data.categories) return 999;
    categories = data.categories;
    for (i = 0; i < categories.length; i++) {
      if (categories[i].key === categoryKey) return categories[i].sortOrder;
    }
    return 999;
  }

  function rowMatchesGroupRule(row, rule) {
    var part = rowTextByRole(row, "part").toUpperCase();
    var desc = rowTextByRole(row, "description");
    var pattern = rule.pattern || "";
    if (rule.matchType === "description_prefix") return desc.indexOf(pattern) === 0;
    if (rule.matchType === "description_contains") return desc.indexOf(pattern) >= 0;
    if (rule.matchType === "part_prefix") return part.indexOf(pattern.toUpperCase()) === 0;
    return false;
  }

  function classifyRowCategory(row) {
    var data = bomGroupData();
    var rules;
    var part = rowTextByRole(row, "part");
    var catalogCategory;
    var i;
    catalogCategory = catalogCategoryForPart(part);
    if (catalogCategory) return catalogCategory;
    if (!data || !data.rules) return "misc";
    rules = data.rules.slice().sort(function (a, b) {
      return a.priority - b.priority;
    });
    for (i = 0; i < rules.length; i++) {
      if (rowMatchesGroupRule(row, rules[i])) return rules[i].category;
    }
    return "misc";
  }

  function isEarthworksLicenseRow(row, category) {
    var part;
    var desc;
    if (category !== "software") return false;
    part = rowTextByRole(row, "part").toUpperCase().replace(/\s+/g, "");
    desc = rowTextByRole(row, "description");
    if (/^160\d{3}-/.test(part)) return true;
    if (/^(Core|Module)\s+(Bundle|License)\b/i.test(desc)) return true;
    if (/License Bundle|Core License/i.test(desc)) return true;
    return false;
  }

  function licenseFamilyKey(part) {
    var normalized = String(part || "").toUpperCase().replace(/\s+/g, "");
    if (/^160\d{3}-/.test(normalized)) return normalized.slice(0, 7);
    return "";
  }

  function licensePartSortKey(part) {
    return String(part || "").toUpperCase().replace(/\s+/g, "");
  }

  function isTripodOrBipodLine(desc) {
    var text = String(desc || "");
    return /\bTripod\b/i.test(text) || /\bBipod\b/i.test(text);
  }

  function isFruGnssReceiverUnit(desc, partUp) {
    var text = String(desc || "");
    if (/FRU\s*-\s*GNSS\s+Receiver/i.test(text)) return true;
    if (/^400(956|976|996)-/i.test(partUp)) return true;
    return false;
  }

  function isMsGnssReceiverReference(desc, partUp) {
    var text = String(desc || "");
    if (/\bMS9\d{2}\b/i.test(text) && /GNSS\s+Receiver|Smart\s+Antenna/i.test(text)) return true;
    if (/\bMS9\d{2}\b/i.test(partUp)) return true;
    return false;
  }

  function isReceiverOptionsLine(desc, partUp) {
    var text = String(desc || "");
    var part = String(partUp || "").toUpperCase().replace(/\s+/g, "");
    if (/^130300-/.test(part)) return true;
    if (/Option\s*(Key|Combo)/i.test(text) && /\bMS9\d{2}\b/i.test(text)) return true;
    if (/^Option\s*-/i.test(text) && /Licensing|Precise Rover|GLN|BeiDou|RTK|Full RTK/i.test(text)) return true;
    return false;
  }

  function isSpsGnssReceiverPart(partUp, desc) {
    var text = String(desc || "");
    if (/CON-R(780|750)/i.test(partUp)) return true;
    if (/CON-R(780|750)/i.test(text)) return true;
    return false;
  }

  function isRadioFrequencyAntenna(desc, partUp) {
    var text = String(desc || "");
    if (isSpsGnssReceiverPart(partUp, text)) return false;
    if (/Smart\s+Antenna/i.test(text)) return false;
    if (!/Antenna/i.test(text)) return false;
    if (/^Antenna\s*-\s*GNSS/i.test(text)) return false;
    if (/Zephyr\s*3/i.test(text) && /GNSS|GPS/i.test(text)) return false;
    return /\bRP\b|TNC|RP-TNC|MHz|GHz|\bMhz\b|\bGhz\b/i.test(text);
  }

  function isGnssReceiverAccessory(desc, partUp) {
    var text = String(desc || "");
    if (isFruGnssReceiverUnit(text, partUp)) return false;
    if (isMsGnssReceiverReference(text, partUp)) return false;
    if (/Battery|Charger|Cable|Case|Pouch|Power Bank|Quicklock|Quick Lock|Adapter Kit|Power supply|Power Cord|Tripod|Monopole|Transport/i.test(text)) {
      return true;
    }
    if (/\bBracket\b/i.test(text) || /\bMount\b/i.test(text)) return true;
    if (/Kit\s*-\s*(Battery|External|Antenna|Mount)/i.test(text)) return true;
    if (/^CON-R/i.test(partUp)) return false;
    if (/Harness|Extender|Splitter|Terminator/i.test(text)) return true;
    return false;
  }

  function isPrimaryGnssReceiver(desc, partUp) {
    var text = String(desc || "");
    if (!text && !partUp) return false;
    if (isReceiverOptionsLine(text, partUp)) return false;
    if (isSpsGnssReceiverPart(partUp, text)) return true;
    if (isFruGnssReceiverUnit(text, partUp)) return true;
    if (isGnssReceiverAccessory(text, partUp)) return false;
    if (/^Antenna\s*-/i.test(text)) return false;
    if (isRadioFrequencyAntenna(text, partUp)) return false;
    if (/^CON-R/i.test(partUp)) return true;
    if (/^109695/i.test(partUp)) return true;
    if (/\bDA2\b/i.test(text) || /\bCatalyst\b/i.test(text)) return true;
    if (/^Receiver\s*-\s*GNSS/i.test(text)) return true;
    if (/GNSS\s+Receiver/i.test(text)) return true;
    if (/Smart\s+Antenna/i.test(text) && !/\bKit\b/i.test(text)) return true;
    if (isMsGnssReceiverReference(text, partUp)) return true;
    if (/^400(956|976|996)-/i.test(partUp)) return true;
    return false;
  }

  function isGnssAntennaLine(desc, partUp) {
    var text = String(desc || "");
    if (isRadioFrequencyAntenna(text, partUp)) return false;
    if (/^Antenna\s*-\s*GNSS/i.test(text)) return true;
    if (/Zephyr\s*3/i.test(text) && /Antenna|GNSS/i.test(text)) return true;
    if (/^Antenna\s*-/i.test(text) && /GNSS|GPS|Zephyr|GA830/i.test(text)) return true;
    if (/^(105000|115000|125000|44830)-/i.test(partUp)) return true;
    if (/\bFRU\b/i.test(text) && /Antenna/i.test(text) && !/Receiver/i.test(text)) return true;
    return false;
  }

  function isOpticalLine(desc, partUp, section) {
    var text = String(desc || "");
    if (section && /optical/i.test(section)) {
      if (/^Instrument\s*-/i.test(text)) return true;
      if (/Prism|Target|Total Station|MultiTrack|Active Track/i.test(text)) return true;
      if (/^SPS\d{3}/i.test(partUp) || /^SX12/i.test(partUp)) return true;
    }
    if (/^Instrument\s*-/i.test(text)) return true;
    if (/^SPS\d{3}/i.test(partUp) || /^SX12/i.test(partUp)) return true;
    if (/Robotic\s+UTS|Total Station/i.test(text) && !/GNSS/i.test(text)) return true;
    if (/^Prism\s*-|^Target\s*-|MultiTrack Target|Active Track 360/i.test(text)) return true;
    return false;
  }

  function isRadiosUhfLine(desc, partUp, category, section) {
    var text = String(desc || "");
    if (isSpsGnssReceiverPart(partUp, text)) return false;
    if (/^TDL\d|^TDL450|^TDL510/i.test(partUp)) return true;
    if (/^EM1[02]\d|^EM940|^EM130/i.test(partUp)) return true;
    if (/^SNM94|^SNR\d|^SNR\d/i.test(partUp)) return true;
    if (category === "radio") return true;
    if (section && /radio|tdl|empower/i.test(section) && /radio|tdl|empower|uhf/i.test(text)) return true;
    if (/^Radio\s*-/i.test(text)) return true;
    if (/\bUHF\b/i.test(text) && /Kit|Antenna|Radio|Coaxial/i.test(text)) return true;
    if (/Kit\s*-\s*.*(UHF|Coaxial|Radio Antenna)/i.test(text)) return true;
    if (/TDL\d|Connected Site Gateway|On-Machine/i.test(text)) return true;
    if (/Antenna.*(900\s*MHz|450\s*MHz|410-470|UHF|Whip)/i.test(text) && !/GNSS|Zephyr|GPS|Smart\s+Antenna/i.test(text)) return true;
    if (isRadioFrequencyAntenna(text, partUp)) return true;
    return false;
  }

  function isPowerChargingLine(desc, partUp) {
    var text = String(desc || "");
    if (/^GNSS-AC-/i.test(partUp)) return true;
    if (/Power supply|Power Cord|Charger|Vehicle Adapter/i.test(text)) return true;
    if (/Dual Slot Battery|Battery Pack|Battery Charger/i.test(text)) return true;
    if (/^10[19]000|^78651|^106090|^101000|^51694|^124395/i.test(partUp)) return true;
    if (/Kit\s*-\s*Battery/i.test(text)) return true;
    if (/USB.*Charg|AC Wall Charger|AC Power/i.test(text)) return true;
    return false;
  }

  function isDataCollectorAccessory(desc, partUp) {
    var text = String(desc || "");
    if (
      /Bracket|Mount|Clamp|Protector|Stylus|Strap|Bumper|Dock|Cover|Film|Charger|Battery|Cable|Case|Accessory|Pole Mount|Quick Release|Cam Lock|Shoulder|Carry|Replacements|Transport Case|Hand Strap|Screen Protector|Office Dock|Power Supply|Charge and Sync|Adapter Plate|Magnetic plate|tether|tips\b/i.test(
        text
      )
    ) {
      return true;
    }
    if (/^132\d{3}|^125\d{3}|^121\d{3}|^140\d{3}|^131\d{3}|^119\d{3}|^133919/i.test(partUp) && !/controller|Tablet/i.test(text)) {
      return true;
    }
    return false;
  }

  function isPrimaryDataCollector(desc, partUp) {
    var text = String(desc || "");
    if (isDataCollectorAccessory(text, partUp)) return false;
    if (/^TSC710-\d|^TSC510-\d|^TSC7-\d/i.test(partUp)) return true;
    if (/^TDC601$/i.test(partUp)) return true;
    if (/^TDC6-/i.test(partUp) && /controller|handheld|Android/i.test(text)) return true;
    if (/^114050/i.test(partUp) && /Tablet/i.test(text)) return true;
    if (/Trimble TSC\d{3} controller/i.test(text)) return true;
    if (/\d+\s*inch controller/i.test(text) && !/Bracket|Mount|Case/i.test(text)) return true;
    if (/T70 Controller/i.test(text) && !/Bracket|Adapter/i.test(text)) return true;
    return false;
  }

  function isCasesTransportLine(desc) {
    var text = String(desc || "");
    if (/Transport Case/i.test(text)) return true;
    if (/^Case\s*-/i.test(text)) return true;
    if (/Carry Case|Hardshell Transportation/i.test(text)) return true;
    return false;
  }

  function isProtectionPlanLine(partUp, desc) {
    var text = String(desc || "");
    if (/^(TPP-|EWHCC-|EW-CC-|ADH-?CC-|ADHCC-)/i.test(partUp)) return true;
    if (/Trimble Protected|TPP\s*-/i.test(text)) return true;
    return false;
  }

  function isOptionKeysLine(partUp, desc) {
    var text = String(desc || "");
    if (/^(PB-|PR-|MAR-)/i.test(partUp)) return true;
    if (/^130300-/i.test(partUp)) return true;
    if (/CCFS/i.test(text)) return true;
    if (/Upgrade\s*-\s*R\d/i.test(text)) return true;
    if (isReceiverOptionsLine(text, partUp)) return true;
    return false;
  }

  function isGnssFamilyAccessory(desc, partUp, section) {
    if (isPrimaryGnssReceiver(desc, partUp)) return false;
    if (isGnssAntennaLine(desc, partUp) || isRadioFrequencyAntenna(desc, partUp)) return false;
    if (isGnssReceiverAccessory(desc, partUp)) return true;
    if (section && /gnss receiver/i.test(section)) return true;
    return false;
  }

  function isDataCollectorFamilyAccessory(desc, partUp, section) {
    if (isPrimaryDataCollector(desc, partUp)) return false;
    if (section && /data collector/i.test(section)) return true;
    if (isDataCollectorAccessory(desc, partUp)) return true;
    if (/^TSC|^TDC|^T110|^T70\b/i.test(partUp) && !isPrimaryDataCollector(desc, partUp)) return true;
    return false;
  }

  function catalogCategoryToAutoGroup(catalogEntry) {
    var category = catalogEntry.category;
    var section = String(catalogEntry.section || "").toLowerCase();
    var desc = String(catalogEntry.description || "");
    var partUp = normalizePartForLookup(catalogEntry.part);
    if (section.indexOf("software") >= 0) return "software";
    if (section.indexOf("optical") >= 0) return "optical";
    if (isPrimaryDataCollector(desc, partUp)) return "data_collector";
    if (isPrimaryGnssReceiver(desc, partUp)) return "gnss_receiver";
    if (isGnssAntennaLine(desc, partUp)) return "gnss_antenna";
    if (isRadioFrequencyAntenna(desc, partUp)) return "radios_uhf";
    if (isRadiosUhfLine(desc, partUp, category, section)) return "radios_uhf";
    if (isPowerChargingLine(desc, partUp)) return "power_charging";
    if (category === "cabling" || category === "harness" || /\bCable\b/i.test(desc) || /\bHarness\b/i.test(desc)) {
      return "cables";
    }
    if (isTripodOrBipodLine(desc)) return "accessories";
    if (category === "bracket" || /\bBracket\b/i.test(desc) || /\bMount\b/i.test(desc)) return "mounts_brackets";
    if (category === "kit" || /\bKit\b/i.test(desc)) return "kits";
    if (isDataCollectorFamilyAccessory(desc, partUp, section)) return "accessories";
    if (isGnssFamilyAccessory(desc, partUp, section)) return "accessories";
    if (category === "radio") return "radios_uhf";
    if (category === "sensor") return "sensors";
    if (category === "fru") return "components";
    if (category === "software") return "software";
    if (category === "display") return "accessories";
    if (category === "gnss") return "accessories";
    return "";
  }

  function bomCategoryToAutoGroup(category, desc, partUp) {
    if (category === "display") {
      if (isPrimaryDataCollector(desc, partUp)) return "data_collector";
      return "accessories";
    }
    if (category === "gnss") {
      if (isPrimaryGnssReceiver(desc, partUp)) return "gnss_receiver";
      if (isGnssAntennaLine(desc, partUp)) return "gnss_antenna";
      return "accessories";
    }
    if (category === "cabling" || category === "harness") return "cables";
    if (category === "bracket") {
      if (isTripodOrBipodLine(desc)) return "accessories";
      return "mounts_brackets";
    }
    if (category === "radio") return "radios_uhf";
    if (category === "kit") return "kits";
    if (category === "sensor") return "sensors";
    if (category === "fru") return "components";
    if (category === "software") return "software";
    if (category === "install") return "install";
    if (category === "training") return "unknown";
    return "";
  }

  function resolveAutoSortGroup(row, category, isLicense) {
    var part = rowTextByRole(row, "part");
    var desc = rowTextByRole(row, "description");
    var partUp = normalizePartForLookup(part);
    var catalogEntry = trimbleCatalogEntryForPart(part);
    var section = catalogEntry && catalogEntry.section ? catalogEntry.section.toLowerCase() : "";
    var fromCatalog;

    if (isLicense) return "licenses";
    if (isProtectionPlanLine(partUp, desc)) return "protection_plans";
    if (isOptionKeysLine(partUp, desc)) return "option_keys";
    if (isCasesTransportLine(desc)) return "cases_transport";
    if (isPrimaryGnssReceiver(desc, partUp)) return "gnss_receiver";
    if (isGnssAntennaLine(desc, partUp)) return "gnss_antenna";
    if (isOpticalLine(desc, partUp, section)) return "optical";
    if (isRadiosUhfLine(desc, partUp, category, section)) return "radios_uhf";
    if (isPowerChargingLine(desc, partUp)) return "power_charging";
    if (isPrimaryDataCollector(desc, partUp)) return "data_collector";
    if (category === "software" || /^SCS900|^SITEWORKS|^TSV-/i.test(partUp)) return "software";
    if (/^Software\s*-/i.test(desc)) return "software";
    if (/\bKit\b/i.test(desc) || category === "kit") return "kits";
    if (/\bCable\b/i.test(desc) || /\bHarness\b/i.test(desc) || category === "cabling" || category === "harness") {
      return "cables";
    }
    if (isTripodOrBipodLine(desc)) return "accessories";
    if (isDataCollectorFamilyAccessory(desc, partUp, section) || isGnssFamilyAccessory(desc, partUp, section)) {
      return "accessories";
    }
    if (
      /\bBracket\b/i.test(desc) ||
      /\bMount\b/i.test(desc) ||
      /\bTribrach\b/i.test(desc) ||
      category === "bracket"
    ) {
      return "mounts_brackets";
    }
    if (/^Sensor\s*-/i.test(desc) || category === "sensor") return "sensors";
    if (/\bFRU\b/i.test(desc) || category === "fru") return "components";
    if (category === "install") return "install";
    if (catalogEntry) {
      fromCatalog = catalogCategoryToAutoGroup(catalogEntry);
      if (fromCatalog) return fromCatalog;
    }
    fromCatalog = bomCategoryToAutoGroup(category, desc, partUp);
    if (fromCatalog) return fromCatalog;
    return "unknown";
  }

  function autoSortCleanList() {
    var decorated;
    var licenseCount;
    var groupedCount;
    var headerCount;
    var dataRows;
    var i;
    dataRows = countDataRows(state.rows);
    if (!dataRows) return { licenseCount: 0, groupedCount: 0, headerCount: 0 };
    decorated = state.rows.filter(function (row) {
      return !isGroupHeaderRow(row);
    }).map(function (row, index) {
      var part = rowTextByRole(row, "part");
      var desc = rowTextByRole(row, "description");
      var category = classifyRowCategory(row);
      var isLicense = isEarthworksLicenseRow(row, category);
      var autoGroup = resolveAutoSortGroup(row, category, isLicense);
      return {
        row: row,
        index: index,
        category: category,
        autoGroup: autoGroup,
        sortOrder: autoGroupSortOrder(autoGroup),
        isLicense: isLicense,
        licenseFamily: licenseFamilyKey(part),
        partKey: licensePartSortKey(part),
        descKey: desc.toLowerCase(),
      };
    });
    decorated.sort(function (a, b) {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      if (a.autoGroup && b.autoGroup && a.autoGroup === b.autoGroup) {
        if (a.descKey !== b.descKey) return a.descKey < b.descKey ? -1 : 1;
        if (a.partKey !== b.partKey) return a.partKey < b.partKey ? -1 : 1;
        return a.index - b.index;
      }
      if (a.isLicense && b.isLicense) {
        if (a.licenseFamily && b.licenseFamily && a.licenseFamily !== b.licenseFamily) {
          return a.licenseFamily < b.licenseFamily ? -1 : 1;
        }
        if (a.partKey !== b.partKey) return a.partKey < b.partKey ? -1 : 1;
        if (a.descKey !== b.descKey) return a.descKey < b.descKey ? -1 : 1;
        return a.index - b.index;
      }
      if (a.autoGroup === "unknown" && b.autoGroup === "unknown") {
        if (bomCategorySortOrder(a.category) !== bomCategorySortOrder(b.category)) {
          return bomCategorySortOrder(a.category) - bomCategorySortOrder(b.category);
        }
        if (a.descKey !== b.descKey) return a.descKey < b.descKey ? -1 : 1;
        if (a.partKey !== b.partKey) return a.partKey < b.partKey ? -1 : 1;
        return a.index - b.index;
      }
      return a.index - b.index;
    });
    licenseCount = 0;
    groupedCount = 0;
    for (i = 0; i < decorated.length; i++) {
      if (decorated[i].isLicense) licenseCount++;
      if (decorated[i].autoGroup && decorated[i].autoGroup !== "unknown") groupedCount++;
    }
    headerCount = 0;
    for (i = 0; i < decorated.length; i++) {
      if (i === 0 || autoSortGroupKey(decorated[i]) !== autoSortGroupKey(decorated[i - 1])) headerCount++;
    }
    state.rows = buildRowsWithGroupHeaders(decorated);
    renderTable();
    saveState();
    return { licenseCount: licenseCount, groupedCount: groupedCount, headerCount: headerCount };
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

  function columnHeaderLabel(col) {
    var meta = roleMeta(col.role);
    var standard;
    if (col.role === "extra") return col.sourceLabel || "Column";
    if (!meta) return col.sourceLabel || "Column";
    standard = meta.headerLabel || meta.label;
    if (col.sourceLabel && col.sourceLabel !== standard && col.sourceLabel !== meta.label) {
      return col.sourceLabel;
    }
    return standard;
  }

  function columnHeaderLabelHtml(col) {
    return '<span class="col-header-label">' + escapeHtml(columnHeaderLabel(col)) + "</span>";
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
        if (isGroupHeaderRow(state.rows[i])) continue;
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
    if (isGroupHeaderRow(row)) {
      return { amount: 0, currency: detectTableCurrency() };
    }
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

  function formatGrandTotalAmount(totals) {
    var keys = Object.keys(totals).filter(function (key) {
      return totals[key];
    });
    keys.sort();
    if (!keys.length) return escapeHtml(formatMoney(0));
    if (keys.length === 1) return escapeHtml(formatMoney(totals[keys[0]], keys[0]));
    return keys
      .map(function (key) {
        return escapeHtml(formatMoney(totals[key], key));
      })
      .join(' <span class="grand-total-sep" aria-hidden="true">·</span> ');
  }

  function formatGrandTotalPlain(totals) {
    var keys = Object.keys(totals).filter(function (key) {
      return totals[key];
    });
    keys.sort();
    if (!keys.length) return formatMoney(0);
    if (keys.length === 1) return formatMoney(totals[keys[0]], keys[0]);
    return keys
      .map(function (key) {
        return formatMoney(totals[key], key);
      })
      .join(" · ");
  }

  function formatGrandTotalHtml(totals) {
    return formatGrandTotalAmount(totals);
  }

  function exportColumnsWithTotals() {
    var cols = exportColumns();
    if (!totalsVisible()) {
      return { cols: cols, hasLineTotal: false };
    }
    return {
      cols: cols.concat([
        {
          index: -1,
          key: "__line_total",
          role: "line_total",
          label: "Line total",
          className: "col-line-total",
        },
      ]),
      hasLineTotal: true,
    };
  }

  function groupHeaderExportLabel(row) {
    var descIdx = columnIndexByRole("description");
    var key = descIdx >= 0 ? String(descIdx) : "0";
    return String(getCellValue(row, key) || "").trim() || "Group";
  }

  function exportDescriptionColumnIndex(cols) {
    var i;
    for (i = 0; i < cols.length; i++) {
      if (cols[i].role === "description") return i;
    }
    return 0;
  }

  function buildExportTableModel() {
    var columnBundle = exportColumnsWithTotals();
    var cols = columnBundle.cols;
    var showTotals = columnBundle.hasLineTotal;
    var entries = [];
    var grandTotals = {};
    var r;
    var row;
    var c;
    var col;
    var cells;
    var lineTotal;
    var currency;
    for (r = 0; r < state.rows.length; r++) {
      row = state.rows[r];
      if (isGroupHeaderRow(row)) {
        entries.push({ type: "group", label: groupHeaderExportLabel(row) });
        continue;
      }
      cells = [];
      for (c = 0; c < cols.length; c++) {
        col = cols[c];
        if (col.role === "line_total") {
          lineTotal = lineTotalForRow(row);
          cells.push(formatMoney(lineTotal.amount, lineTotal.currency));
          if (showTotals) {
            currency = lineTotal.currency || detectTableCurrency();
            grandTotals[currency] = (grandTotals[currency] || 0) + lineTotal.amount;
          }
        } else {
          cells.push(normalizeExportCell(getCellValue(row, col.key), col.role));
        }
      }
      entries.push({ type: "data", cells: cells });
    }
    return { cols: cols, entries: entries, grandTotals: grandTotals, showTotals: showTotals };
  }

  function exportGroupHeaderCells(cols, label) {
    var cells = [];
    var descIdx = exportDescriptionColumnIndex(cols);
    var i;
    for (i = 0; i < cols.length; i++) {
      cells.push(i === descIdx ? "— " + label + " —" : "");
    }
    return cells;
  }

  function exportGrandTotalCells(cols, grandTotals) {
    var cells = [];
    var i;
    var totalText = formatGrandTotalPlain(grandTotals);
    if (cols.length === 1) return [totalText];
    for (i = 0; i < cols.length; i++) {
      if (i === cols.length - 1) cells.push(totalText);
      else if (i === cols.length - 2) cells.push("Grand total");
      else cells.push("");
    }
    return cells;
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

  function columnWidthMin(role) {
    switch (role) {
      case "actions":
        return 36;
      case "part":
        return 72;
      case "description":
        return 96;
      case "price":
        return 64;
      case "qty":
        return 52;
      case "comment":
        return 72;
      case "lineTotal":
        return 88;
      default:
        return 64;
    }
  }

  function columnWidthDefault(role) {
    switch (role) {
      case "actions":
        return 40;
      case "part":
        return 108;
      case "description":
        return 280;
      case "price":
        return 88;
      case "qty":
        return 76;
      case "comment":
        return 120;
      case "lineTotal":
        return 100;
      default:
        return 88;
    }
  }

  function columnWidthSlots() {
    var cols = visibleColumns();
    var showTotals = totalsVisible();
    var slots = [{ key: COLUMN_SLOT_ACTIONS, role: "actions" }];
    var i;
    for (i = 0; i < cols.length; i++) {
      slots.push({ key: cols[i].colId, role: cols[i].role });
    }
    if (showTotals) {
      slots.push({ key: COLUMN_SLOT_LINE_TOTAL, role: "lineTotal" });
    }
    return slots;
  }

  function columnDragGripHtml() {
    return '<span class="col-drag-grip" title="Drag to reorder column" aria-hidden="true"></span>';
  }

  function columnResizeHandleHtml(resizeIndex) {
    return (
      '<span class="col-resize-handle" role="separator" aria-orientation="vertical" aria-label="Resize column" data-resize-index="' +
      resizeIndex +
      '"></span>'
    );
  }

  function ensureColumnWidths(forceFit) {
    var slots = columnWidthSlots();
    var wrap = els.tableWrap;
    var available;
    var specs;
    var widths;
    var totalMin;
    var totalWeight;
    var remainder;
    var i;
    var absorbIdx;
    var others;
    if (!state.columnWidths) state.columnWidths = {};

    for (i = 0; i < slots.length; i++) {
      if (state.columnWidths[slots[i].key] == null) forceFit = true;
    }
    if (!forceFit || !wrap || !state.rows.length) return;

    available = tableWrapInnerWidth(wrap);
    if (available < 160) return;

    specs = [];
    for (i = 0; i < slots.length; i++) {
      var role = slots[i].role;
      var isFlex = role === "description" || role === "comment" || role === "extra";
      specs.push({
        key: slots[i].key,
        min: columnWidthMin(role),
        headerMin: columnWidthDefault(role),
        weight: role === "description" ? 4 : role === "comment" ? 1.4 : 0,
        fixed: !isFlex,
      });
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

    absorbIdx = -1;
    for (i = 0; i < slots.length; i++) {
      if (slots[i].role === "description") {
        absorbIdx = i;
        break;
      }
    }
    if (absorbIdx < 0) {
      for (i = 0; i < specs.length; i++) {
        if (!specs[i].fixed) {
          absorbIdx = i;
          break;
        }
      }
    }
    if (absorbIdx >= 0) {
      others = 0;
      for (i = 0; i < widths.length; i++) {
        if (i !== absorbIdx) others += widths[i];
      }
      widths[absorbIdx] = Math.max(specs[absorbIdx].min, available - others);
    }

    for (i = 0; i < specs.length; i++) {
      state.columnWidths[specs[i].key] = widths[i];
    }
  }

  function applyColumnWidths() {
    var table = els.table;
    var wrap = els.tableWrap;
    var slots = columnWidthSlots();
    var colgroup;
    var html = "";
    var widths = [];
    var sum = 0;
    var i;
    var slot;
    var width;
    if (!table || !wrap) return;
    if (!state.rows.length) {
      colgroup = table.querySelector("colgroup");
      if (colgroup) colgroup.innerHTML = "";
      table.style.width = "";
      table.style.minWidth = "";
      return;
    }

    ensureColumnWidths(false);
    for (i = 0; i < slots.length; i++) {
      slot = slots[i];
      width = Math.round(
        state.columnWidths[slot.key] != null
          ? state.columnWidths[slot.key]
          : columnWidthDefault(slot.role)
      );
      width = Math.max(columnWidthMin(slot.role), width);
      state.columnWidths[slot.key] = width;
      widths.push(width);
      sum += width;
    }

    colgroup = table.querySelector("colgroup");
    if (!colgroup) {
      colgroup = document.createElement("colgroup");
      table.insertBefore(colgroup, table.firstChild);
    }
    for (i = 0; i < widths.length; i++) {
      html += '<col style="width:' + widths[i] + 'px">';
    }
    colgroup.innerHTML = html;
    table.style.width = Math.max(wrap.clientWidth, sum) + "px";
    table.style.minWidth = sum + "px";
  }

  function scheduleApplyColumnWidths() {
    if (columnResizeTimer) window.clearTimeout(columnResizeTimer);
    columnResizeTimer = window.setTimeout(applyColumnWidths, 40);
  }

  function setupColumnResize() {
    var active = null;

    function endResize(event) {
      if (!active) return;
      if (event && event.pointerId !== active.pointerId) return;
      if (active.handle && active.handle.releasePointerCapture) {
        try {
          active.handle.releasePointerCapture(active.pointerId);
        } catch (err) {}
      }
      active = null;
      if (els.tableWrap) els.tableWrap.classList.remove("is-resizing-cols");
      saveState();
    }

    els.table.addEventListener("pointerdown", function (event) {
      var handle = event.target.closest(".col-resize-handle");
      var slots;
      var slot;
      var width;
      if (!handle) return;
      slots = columnWidthSlots();
      slot = slots[Number(handle.getAttribute("data-resize-index"))];
      if (!slot) return;
      ensureColumnWidths(false);
      width =
        state.columnWidths[slot.key] != null
          ? state.columnWidths[slot.key]
          : columnWidthDefault(slot.role);
      active = {
        slotKey: slot.key,
        min: columnWidthMin(slot.role),
        startX: event.clientX,
        startWidth: width,
        pointerId: event.pointerId,
        handle: handle,
      };
      if (els.tableWrap) els.tableWrap.classList.add("is-resizing-cols");
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    });

    els.table.addEventListener("pointermove", function (event) {
      var next;
      if (!active || event.pointerId !== active.pointerId) return;
      next = Math.round(active.startWidth + (event.clientX - active.startX));
      next = Math.max(active.min, next);
      state.columnWidths[active.slotKey] = next;
      applyColumnWidths();
      event.preventDefault();
    });

    els.table.addEventListener("pointerup", endResize);
    els.table.addEventListener("pointercancel", endResize);
  }

  function applyInputsHidden() {
    var hidden = !!state.inputHidden;
    if (els.appLayout) els.appLayout.classList.toggle("inputs-hidden", hidden);
    if (els.panePaste) els.panePaste.hidden = hidden;
    setShowGstInputsButtonsVisible(hidden);
    scheduleApplyColumnWidths();
  }

  function setInputsHidden(hidden) {
    state.inputHidden = !!hidden;
    if (hidden) syncConfigFromPasteBox();
    applyInputsHidden();
  }

  function toggleInputsHidden() {
    setInputsHidden(!state.inputHidden);
    saveState();
  }

  function syncConfigFromPasteBox() {
    if (!els.configPasteBox) return false;
    var text = els.configPasteBox.value;
    if (!text.trim()) return false;
    return organizeConfig(text) > 0;
  }

  function focusListWorkspace() {
    setInputsHidden(true);
    if (!hasConfigFields()) syncConfigFromPasteBox();
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
    tableActionButtons("show-inputs").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setInputsHidden(false);
        saveState();
      });
    });
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
    return fields;
  }

  function looksLikeGstOptionLabel(label) {
    var text = String(label || "").trim();
    if (/^[A-Z]{2,}\d{2,}$/i.test(text)) return true;
    return looksLikePartNumber(text);
  }

  function configFieldPriority(label) {
    var key = String(label || "").trim().toLowerCase();
    var order = getWorkflowProfile().configLabelOrder;
    var i;
    for (i = 0; i < order.length; i++) {
      if (key === order[i]) return (i + 1) * 10;
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
    var fieldPlaceholder = getWorkflowProfile().configFieldPlaceholder;
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
        '" spellcheck="false" aria-label="Configuration field name" placeholder="' +
        escapeAttr(fieldPlaceholder) +
        '" />' +
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
    return countDataRows(state.rows) > 0 || hasConfigFields();
  }

  function toCopyText() {
    var exportedAt = new Date();
    var lines = exportHeaderPlainLines(exportedAt);
    var configLines = exportConfigPlainLines();
    var notes = getNotesPlain().trim();
    var i;
    var tableModel;
    var exportCols;
    var e;
    var entry;
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
    if (exportColumns().length && state.rows.length) {
      tableModel = buildExportTableModel();
      exportCols = tableModel.cols;
      lines.push("");
      lines.push(
        exportCols
          .map(function (col) {
            return col.label;
          })
          .join("\t")
      );
      for (e = 0; e < tableModel.entries.length; e++) {
        entry = tableModel.entries[e];
        if (entry.type === "group") {
          lines.push(exportGroupHeaderCells(exportCols, entry.label).join("\t"));
        } else {
          lines.push(entry.cells.join("\t"));
        }
      }
      if (tableModel.showTotals && tableModel.entries.length) {
        lines.push(exportGrandTotalCells(exportCols, tableModel.grandTotals).join("\t"));
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
        showToast("Select the text and press Ctrl+C or ⌘C to copy.");
      }
    } catch (err) {
      showToast("Select the text and press Ctrl+C or ⌘C to copy.");
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
    var resizeIndex = 0;
    var i;
    var grandTotals = {};
    var currency;
    html +=
      '<th class="row-actions" aria-label="Row actions">' +
      columnResizeHandleHtml(resizeIndex++) +
      "</th>";
    for (i = 0; i < cols.length; i++) {
      html += '<th class="' + cols[i].className + '" data-col-index="' + cols[i].index + '">';
      html += '<div class="col-header-main">';
      html += columnDragGripHtml();
      html += columnHeaderLabelHtml(cols[i]);
      html += columnResizeHandleHtml(resizeIndex++);
      html += "</div></th>";
    }
    if (showTotals) {
      html +=
        '<th class="col-line-total">' +
        '<div class="col-header-main line-total-header">' +
        '<span class="col-header-label col-header-label-total">Line total</span>' +
        columnResizeHandleHtml(resizeIndex++) +
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
      var isHeader = isGroupHeaderRow(row);
      lineTotal = showTotals ? lineTotalForRow(row) : { amount: 0, currency: null };
      if (showTotals && !isHeader) {
        currency = lineTotal.currency || detectTableCurrency();
        grandTotals[currency] = (grandTotals[currency] || 0) + lineTotal.amount;
      }
      body += '<tr class="' + (isHeader ? "is-group-header" : "") + '" data-id="' + row.id + '" data-row-index="' + r + '"' + (isHeader ? ' data-row-type="groupHeader"' : "") + ">";
      if (isHeader) {
        var descColKey = columnIndexByRole("description");
        descColKey = descColKey >= 0 ? String(descColKey) : cols.length ? cols[0].key : "0";
        body +=
          '<td class="row-actions">' +
          '<div class="row-actions-inner">' +
          '<button type="button" class="btn btn-icon" data-delete="' +
          row.id +
          '" title="Remove this group header" aria-label="Remove this group header">×</button>' +
          "</div></td>";
        body +=
          '<td class="group-header-label-cell" colspan="' +
          cols.length +
          '"><input class="group-header-label" data-id="' +
          row.id +
          '" data-key="' +
          escapeAttr(descColKey) +
          '" value="' +
          escapeAttr(getCellValue(row, descColKey)) +
          '" placeholder="Group name" aria-label="Group name" /></td>';
        if (showTotals) {
          body += '<td class="col-line-total group-header-total" aria-hidden="true"></td>';
        }
        body += "</tr>";
        continue;
      }
      body +=
        '<td class="row-actions">' +
        '<div class="row-actions-inner">' +
        '<button type="button" class="btn btn-icon" data-delete="' +
        row.id +
        '" title="Remove this line" aria-label="Remove this line">×</button>' +
        '<span class="row-drag-grip" title="Drag to reorder" aria-hidden="true"></span>' +
        "</div></td>";
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
        if (cols.length) {
          foot +=
            '<td class="grand-total-label-cell" colspan="' +
            cols.length +
            '"><div class="grand-total-label-wrap">' +
            '<span class="grand-total-verify hint">Verify total matches GST pricing total.</span>' +
            '<span class="grand-total-label">Grand total</span></div></td>';
        }
        foot +=
          '<td class="col-line-total grand-total-cell">' +
          formatGrandTotalAmount(grandTotals) +
          "</td></tr>";
        els.tfoot.innerHTML = foot;
      } else {
        els.tfoot.innerHTML = "";
      }
    }

    var hasRows = state.rows.length > 0;
    var dataRowTotal = countDataRows(state.rows);
    var groupHeaderTotal = state.rows.length - dataRowTotal;
    els.tableWrap.classList.toggle("has-rows", hasRows);
    setTableActionDisabled("columns", !state.columns.length);
    renderColumnsMenu();
    setTableActionDisabled("add-row", false);
    setTableActionDisabled("auto-group", !dataRowTotal);
    setTableActionDisabled("add-group-header", !state.columns.length);
    setTableActionDisabled("export", !exportHasContent());
    if (!hasRows) {
      els.rowCount.textContent = "No lines yet. Paste a list, then click Organize list.";
    } else if (dataRowTotal === 1) {
      els.rowCount.textContent = groupHeaderTotal ? "1 line in 1 group" : "1 line";
    } else if (groupHeaderTotal) {
      els.rowCount.textContent = dataRowTotal + " lines in " + groupHeaderTotal + " groups";
    } else {
      els.rowCount.textContent = dataRowTotal + " lines";
    }
    updateCopyOutput();
    ensureColumnWidths(false);
    applyColumnWidths();
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
      if (isGroupHeaderRow(state.rows[rowIdx])) continue;
      lineTotal = lineTotalForRow(state.rows[rowIdx]);
      currency = lineTotal.currency || detectTableCurrency();
      grandTotals[currency] = (grandTotals[currency] || 0) + lineTotal.amount;
      cell = rowEl.querySelector(".line-total-cell");
      if (cell) cell.textContent = formatMoney(lineTotal);
    }
    cell = els.tfoot.querySelector(".grand-total-cell");
    if (cell) cell.innerHTML = formatGrandTotalAmount(grandTotals);
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

  function applyGroupDragVisual(headerIndex) {
    var block = groupBlockRange(headerIndex);
    var i;
    var tr;
    if (!block) return;
    for (i = block.start; i <= block.end; i++) {
      tr = els.tbody.querySelector('tr[data-row-index="' + i + '"]');
      if (tr) tr.classList.add("is-dragging");
    }
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
    var moved = false;
    if (toIndex != null) {
      if (active.type === "col" && toIndex !== active.fromIndex) {
        moveColumn(active.fromIndex, toIndex);
        moved = true;
      } else if (active.type === "row" && toIndex !== active.fromIndex) {
        moveRow(active.fromIndex, toIndex);
        moved = true;
      }
    }
    if (moved) {
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
      return !!node.closest("input, textarea, button, select, option, a, label, .col-resize-handle");
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
      if (tr && !tr.classList.contains("is-group-header") && !isInteractiveTarget(event.target)) {
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
      } else if (active.type === "row") {
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
      columnWidths: state.columnWidths,
      workflow: state.workflow,
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
      state.columnWidths = payload.columnWidths || {};
      state.workflow =
        payload.workflow && WORKFLOW_PROFILES[payload.workflow] ? payload.workflow : "machines";
      nextId = payload.nextId || state.rows.length + 1;
      if (payload.hidePrices && state.columns.length) {
        setRoleHidden("price", true);
      }
      renderConfigSummary();
      if (state.rows.length) {
        renderTable();
        els.saveNote.hidden = false;
      } else if (hasConfigFields()) {
        if (els.exportBtn) setTableActionDisabled("export", !exportHasContent());
        els.saveNote.hidden = false;
      }
      if (!hasConfigFields()) syncConfigFromPasteBox();
      syncWorkflowFromInput();
      if (state.configFields.length) {
        state.configFields = sortConfigFields(state.configFields);
      }
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
    syncWorkflowFromInput();
    state.configFields = sortConfigFields(state.configFields);
    setConfigSummaryCollapsed(false);
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
      setTableActionDisabled("export", !exportHasContent());
    }

    if (configCount || partsCount) {
      syncWorkflowFromInput();
      if (state.configFields.length) {
        state.configFields = sortConfigFields(state.configFields);
        renderConfigSummary();
      }
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
    var lines = [];
    var headerLines = exportHeaderPlainLines(exportedAt);
    var configLines = exportConfigPlainLines();
    var tableModel;
    var exportCols;
    var i;
    var e;
    var entry;
    var rowCells;
    for (i = 0; i < headerLines.length; i++) {
      lines.push(csvCell(headerLines[i]));
    }
    if (configLines.length) {
      lines.push("");
      for (i = 0; i < configLines.length; i++) {
        lines.push(csvCell(configLines[i]));
      }
    }
    if (state.rows.length && exportColumns().length) {
      tableModel = buildExportTableModel();
      exportCols = tableModel.cols;
      lines.push("");
      lines.push(
        exportCols
          .map(function (col) {
            return csvCell(col.label);
          })
          .join(",")
      );
      for (e = 0; e < tableModel.entries.length; e++) {
        entry = tableModel.entries[e];
        if (entry.type === "group") {
          rowCells = exportGroupHeaderCells(exportCols, entry.label).map(csvCell);
        } else {
          rowCells = entry.cells.map(csvCell);
        }
        lines.push(rowCells.join(","));
      }
      if (tableModel.showTotals && tableModel.entries.length) {
        lines.push(exportGrandTotalCells(exportCols, tableModel.grandTotals).map(csvCell).join(","));
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
    var notesHtml = sanitizeNotesHtml(getNotesHtml());
    var tableModel;
    var cols;
    var html = "";
    var c;
    var e;
    var entry;
    var value;
    var colspan;
    var colspan;
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
      "tr.export-group-header td{background:#F1F1F6;font-weight:600;font-size:12pt;color:#252A2E;" +
      "border-top:2px solid #0063A3;border-bottom:1px solid #D5D7DC;padding:0.45rem 0.65rem;}" +
      "tr.export-grand-total td{font-weight:600;background:#F1F1F6;border-top:2px solid #252A2E;}" +
      "tr.export-grand-total td.grand-total-label{text-align:right;}" +
      "</style></head><body>";
    html += "<h1>GST BOM</h1>";
    html += exportHeaderHtml(exportedAt);
    if (hasConfigFields()) {
      html += "<div class=\"config-export\">" + exportConfigHtml() + "</div>";
    }
    if (notesHtml) {
      html += "<h2>Configuration notes</h2><div>" + notesHtml + "</div>";
    }
    if (state.rows.length && exportColumns().length) {
      tableModel = buildExportTableModel();
      cols = tableModel.cols;
      html += "<h2>Parts list</h2><table><thead><tr>";
      for (c = 0; c < cols.length; c++) {
        html += "<th>" + escapeHtml(cols[c].label) + "</th>";
      }
      html += "</tr></thead><tbody>";
      for (e = 0; e < tableModel.entries.length; e++) {
        entry = tableModel.entries[e];
        if (entry.type === "group") {
          html +=
            '<tr class="export-group-header"><td colspan="' +
            cols.length +
            '">' +
            escapeHtml(entry.label) +
            "</td></tr>";
          continue;
        }
        html += "<tr>";
        for (c = 0; c < cols.length; c++) {
          value = entry.cells[c];
          html += "<td>" + escapeHtml(value).replace(/\n/g, "<br>") + "</td>";
        }
        html += "</tr>";
      }
      if (tableModel.showTotals && tableModel.entries.length) {
        colspan = Math.max(1, cols.length - 1);
        html += '<tr class="export-grand-total">';
        if (cols.length === 1) {
          html += "<td>" + escapeHtml(formatGrandTotalPlain(tableModel.grandTotals)) + "</td>";
        } else {
          html +=
            '<td class="grand-total-label" colspan="' +
            colspan +
            '">Grand total</td>';
          html += "<td>" + escapeHtml(formatGrandTotalPlain(tableModel.grandTotals)) + "</td>";
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

  function clearAll() {
    if (els.configPasteBox) els.configPasteBox.value = "";
    els.pasteBox.value = "";
    if (els.notesBox) setNotesHtml("");
    state.configFields = [];
    state.rows = [];
    state.columns = [];
    state.inputHidden = false;
    state.configSummaryCollapsed = false;
    state.copyOutputCollapsed = false;
    state.columnWidths = {};
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
  }

  tableActionButtons("clear").forEach(function (btn) {
    btn.addEventListener("click", clearAll);
  });

  function placeMenuNearButton(menu, btn) {
    var box;
    var left;
    var top;
    var pad = 8;
    var menuHeight;
    var rect;
    if (!menu || !btn || menu.hidden) return;
    menu.style.position = "fixed";
    menu.style.right = "auto";
    rect = btn.getBoundingClientRect();
    menu.style.visibility = "hidden";
    menu.style.left = Math.round(rect.left) + "px";
    menu.style.top = "0";
    menuHeight = menu.getBoundingClientRect().height;
    menu.style.visibility = "";
    if (window.innerHeight - rect.bottom > menuHeight + 12 || rect.top < menuHeight + 12) {
      top = rect.bottom + 6;
    } else {
      top = rect.top - menuHeight - 6;
    }
    menu.style.top = Math.round(top) + "px";
    menu.style.left = Math.round(rect.left) + "px";
    box = menu.getBoundingClientRect();
    left = box.left;
    if (box.right > window.innerWidth - pad) {
      left = window.innerWidth - pad - box.width;
    }
    if (left < pad) left = pad;
    menu.style.left = Math.round(left) + "px";
  }

  function placeExportMenu() {
    placeMenuNearButton(els.exportMenu, exportMenuAnchor || els.exportBtn);
  }

  function placeColumnsMenu() {
    placeMenuNearButton(els.columnsMenu, columnsMenuAnchor || els.columnsBtn);
  }

  function resetFloatingMenu(menu) {
    if (!menu) return;
    menu.hidden = true;
    menu.style.position = "";
    menu.style.top = "";
    menu.style.left = "";
    menu.style.visibility = "";
  }

  function toggleColumnsMenu(btn) {
    if (!els.columnsMenu) return;
    columnsMenuAnchor = btn;
    els.columnsMenu.hidden = !els.columnsMenu.hidden;
    if (els.columnsMenu.hidden) {
      resetFloatingMenu(els.columnsMenu);
    } else {
      placeColumnsMenu();
    }
  }

  function toggleExportMenu(btn) {
    if (!els.exportMenu) return;
    exportMenuAnchor = btn;
    els.exportMenu.hidden = !els.exportMenu.hidden;
    if (els.exportMenu.hidden) {
      resetFloatingMenu(els.exportMenu);
    } else {
      placeExportMenu();
    }
  }

  if (els.columnsMenu) {
    tableActionButtons("columns").forEach(function (btn) {
      btn.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleColumnsMenu(btn);
      });
    });
    document.addEventListener("click", function (event) {
      if (els.columnsMenu.hidden) return;
      if (event.target.closest('[data-table-action="columns"]')) return;
      if (event.target.closest("#columns-menu")) return;
      resetFloatingMenu(els.columnsMenu);
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

  tableActionButtons("add-row").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.rows.push(emptyRow());
      renderTable();
      saveState();
    });
  });

  tableActionButtons("auto-group").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var result = autoSortCleanList();
      var parts = [];
      if (result.headerCount) {
        parts.push(result.headerCount + " group header" + (result.headerCount === 1 ? "" : "s"));
      }
      if (result.groupedCount) {
        parts.push(result.groupedCount + " grouped line" + (result.groupedCount === 1 ? "" : "s"));
      }
      if (result.licenseCount) {
        parts.push(result.licenseCount + " license line" + (result.licenseCount === 1 ? "" : "s"));
      }
      if (parts.length) {
        showToast("Auto-group added " + parts.join(", ") + ".");
      } else {
        showToast("Sorted lines by BOM category.");
      }
    });
  });

  tableActionButtons("add-group-header").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!state.columns.length) {
        showToast("Organize a list first, then add group headers.", true);
        return;
      }
      state.rows.push(groupHeaderRow(""));
      renderTable();
      saveState();
      var headerRows = els.tbody.querySelectorAll("tr.is-group-header");
      if (headerRows.length) {
        var labelInput = headerRows[headerRows.length - 1].querySelector(".group-header-label");
        if (labelInput) labelInput.focus();
      }
    });
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
      setTableActionDisabled("export", !exportHasContent());
      saveState();
    });
  }

  if (els.configPasteBox) {
    els.configPasteBox.addEventListener("input", function () {
      if (state.inputHidden) syncConfigFromPasteBox();
      saveState();
    });
  }

  if (els.copyAllBtn) {
    els.copyAllBtn.addEventListener("click", function () {
      copyAllToClipboard();
    });
  }

  if (els.exportMenu) {
    tableActionButtons("export").forEach(function (btn) {
      btn.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleExportMenu(btn);
      });
    });
    els.exportMenu.addEventListener("click", function (event) {
      var option = event.target.closest("[data-export-preset]");
      if (!option) return;
      resetFloatingMenu(els.exportMenu);
      runExport(option.getAttribute("data-export-preset"));
    });
    document.addEventListener("click", function (event) {
      if (els.exportMenu.hidden) return;
      if (event.target.closest('[data-table-action="export"]')) return;
      if (event.target.closest("#export-menu")) return;
      resetFloatingMenu(els.exportMenu);
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
  setupColumnResize();
  loadState();
  syncWorkflowFromInput();
  if (state.configFields.length) {
    state.configFields = sortConfigFields(state.configFields);
  }
  renderConfigSummary();
  if (!state.rows.length) {
    renderTable();
  }
  window.addEventListener("resize", scheduleApplyColumnWidths);
  if (els.listWorkspace && typeof ResizeObserver !== "undefined") {
    new ResizeObserver(scheduleApplyColumnWidths).observe(els.listWorkspace);
  }
  window.addEventListener("resize", resizeCopyOutputBox);
})();
