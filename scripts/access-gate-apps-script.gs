/**
 * GST BOM Organizer — access gate (Google Apps Script).
 * Deploy as web app: Execute as Me, Who has access: Anyone.
 * Paste into a script bound to your Google Sheet (see docs/access-gate-setup.md).
 */

var CONFIG = {
  SPREADSHEET_ID: "PASTE_SHEET_ID_HERE",
  RECIPIENT_EMAIL: "ethan_quam@trimble.com",
  APP_URL: "https://ethanquam.github.io/gst-bom-organizer/",
  APP_NAME: "GST BOM Organizer",
  AUTO_APPROVE_DOMAINS: ["trimble.com"],
  ACCESS_GRANT_DAYS: 28,
  ACCESS_CODE_MINUTES: 30,
};

var SHEETS = {
  REQUESTS: "AccessRequests",
  APPROVED: "ApprovedUsers",
  CODES: "AccessCodes",
  EVENTS: "Events",
};

function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var action = String(params.action || "").toLowerCase();

  try {
    ensureSheets();

    if (action === "access_approve" || action === "access_deny" || action === "access_revoke") {
      return handleAdminHtmlAction(action, params);
    }

    var result = handleJsonAction(action, params);
    if (params.callback) {
      return ContentService.createTextOutput(params.callback + "(" + JSON.stringify(result) + ")").setMimeType(
        ContentService.MimeType.JAVASCRIPT
      );
    }
    return jsonResponse(result);
  } catch (err) {
    var message = err && err.message ? err.message : String(err);
    if (params.callback) {
      return ContentService.createTextOutput(
        params.callback + "(" + JSON.stringify({ status: "error", message: message }) + ")"
      ).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return htmlPage("Error", "<p>" + escapeHtml(message) + "</p>");
  }
}

function handleJsonAction(action, params) {
  switch (action) {
    case "access_start":
      return accessStart(params.email);
    case "access_verify":
      return accessVerify(params.email, params.code);
    case "access_check":
      return accessCheck(params.email, params.revalidate === "1");
    case "access_resend_code":
      return accessResendCode(params.email);
    default:
      return { status: "error", message: "Unknown action: " + action };
  }
}

function accessStart(emailRaw) {
  var email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    return { status: "error", message: "Invalid email address." };
  }

  logEvent("access_start", email, "");

  var approved = getApprovedUser(email);
  if (approved && isFuture(approved.expiresAt)) {
    sendAccessCode(email, approved.grantType || "existing");
    return { status: "verify_code" };
  }

  if (isAutoApproveEmail(email)) {
    sendAccessCode(email, "auto");
    return { status: "verify_code" };
  }

  var pending = findOpenRequest(email);
  if (pending) {
    return { status: "pending", message: "Request already pending approval." };
  }

  var token = Utilities.getUuid();
  appendRow(SHEETS.REQUESTS, {
    email: email,
    token: token,
    status: "pending",
    requestedAt: new Date().toISOString(),
  });
  sendAdminApprovalEmail(email, token);
  logEvent("access_request_pending", email, "");
  return { status: "pending" };
}

function accessVerify(emailRaw, codeRaw) {
  var email = normalizeEmail(emailRaw);
  var code = String(codeRaw || "").replace(/\s+/g, "");
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return { status: "error", message: "Invalid email or code." };
  }

  var codeRow = findValidCode(email, code);
  if (!codeRow) {
    logEvent("access_verify_failed", email, "bad_code");
    return { status: "error", message: "Invalid or expired code." };
  }

  markCodeUsed(codeRow.rowIndex);
  var grantType = isAutoApproveEmail(email) ? "auto" : "manual";
  var pending = findOpenRequest(email);
  if (pending) {
    updateRequestStatus(pending.rowIndex, "approved");
    grantType = "manual";
  }

  var expiresAt = grantAccess(email, grantType);
  logEvent("access_verify_ok", email, grantType);
  return { status: "ok", email: email, expiresAt: expiresAt, grantType: grantType };
}

function accessCheck(emailRaw, revalidate) {
  var email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    return { status: "error", message: "Invalid email." };
  }

  var approved = getApprovedUser(email);
  if (!approved || !isFuture(approved.expiresAt)) {
    if (revalidate) removeApprovedUser(email);
    return { status: "revoked" };
  }

  if (revalidate) logEvent("access_check_ok", email, "");
  return {
    status: "ok",
    email: email,
    expiresAt: approved.expiresAt,
    grantType: approved.grantType || "",
  };
}

function accessResendCode(emailRaw) {
  var email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    return { status: "error", message: "Invalid email." };
  }

  var approved = getApprovedUser(email);
  var pending = findOpenRequest(email);
  if (!isAutoApproveEmail(email) && !approved && !pending) {
    return { status: "error", message: "No active access request for this email." };
  }

  var grantType = approved ? approved.grantType || "existing" : isAutoApproveEmail(email) ? "auto" : "manual";
  sendAccessCode(email, grantType);
  logEvent("access_resend_code", email, "");
  return { status: "ok" };
}

function handleAdminHtmlAction(action, params) {
  var email = normalizeEmail(params.email);
  var token = String(params.token || "");

  if (!isValidEmail(email)) {
    return htmlPage("Invalid request", "<p>Missing or invalid email.</p>");
  }

  if (action === "access_revoke") {
    if (!isAdminTokenValid(token, email, "revoke")) {
      return htmlPage("Not allowed", "<p>Invalid revoke link.</p>");
    }
    removeApprovedUser(email);
    clearCodesForEmail(email);
    logEvent("access_revoke", email, "admin");
    return htmlPage("Access revoked", "<p>Access revoked for <strong>" + escapeHtml(email) + "</strong>.</p>");
  }

  var request = findRequestByToken(email, token);
  if (!request || request.status !== "pending") {
    return htmlPage("Request not found", "<p>This approval link is invalid or already used.</p>");
  }

  if (action === "access_deny") {
    updateRequestStatus(request.rowIndex, "denied");
    sendDeniedEmail(email);
    logEvent("access_deny", email, "admin");
    return htmlPage("Access denied", "<p>Denied access for <strong>" + escapeHtml(email) + "</strong>.</p>");
  }

  if (action === "access_approve") {
    updateRequestStatus(request.rowIndex, "approved");
    var expiresAt = grantAccess(email, "manual");
    sendAccessCode(email, "manual");
    sendApprovedWelcomeEmail(email, expiresAt);
    logEvent("access_approve", email, "admin");
    return htmlPage(
      "Access approved",
      "<p>Approved <strong>" +
        escapeHtml(email) +
        "</strong>. A login code was emailed to them.</p>"
    );
  }

  return htmlPage("Unknown action", "<p>Unsupported admin action.</p>");
}

function grantAccess(email, grantType) {
  var expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CONFIG.ACCESS_GRANT_DAYS);
  upsertApprovedUser(email, expiresAt.toISOString(), grantType);
  return expiresAt.toISOString();
}

function sendAccessCode(email, grantType) {
  var code = String(Math.floor(100000 + Math.random() * 900000));
  var expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CONFIG.ACCESS_CODE_MINUTES);
  appendRow(SHEETS.CODES, {
    email: email,
    code: code,
    expiresAt: expiresAt.toISOString(),
    used: "false",
    grantType: grantType,
    createdAt: new Date().toISOString(),
  });

  var body =
    "Your " +
    CONFIG.APP_NAME +
    " access code is:\n\n" +
    code +
    "\n\nThis code expires in " +
    CONFIG.ACCESS_CODE_MINUTES +
    " minutes.\n\nOpen: " +
    CONFIG.APP_URL +
    "\n\nIf you did not request this, ignore this email.";

  MailApp.sendEmail({
    to: email,
    subject: CONFIG.APP_NAME + " access code",
    body: body,
  });
  logEvent("access_code_sent", email, grantType);
}

function sendAdminApprovalEmail(email, token) {
  var base = ScriptApp.getService().getUrl();
  var approveUrl =
    base + "?action=access_approve&email=" + encodeURIComponent(email) + "&token=" + encodeURIComponent(token);
  var denyUrl =
    base + "?action=access_deny&email=" + encodeURIComponent(email) + "&token=" + encodeURIComponent(token);
  var revokeUrl =
    base +
    "?action=access_revoke&email=" +
    encodeURIComponent(email) +
    "&token=" +
    encodeURIComponent(makeRevokeToken(email));

  var body =
    "Access request for " +
    CONFIG.APP_NAME +
    "\n\nEmail: " +
    email +
    "\n\nGrant: " +
    approveUrl +
    "\nDeny: " +
    denyUrl +
    "\n\nAfter approval, revoke later:\n" +
    revokeUrl;

  MailApp.sendEmail({
    to: CONFIG.RECIPIENT_EMAIL,
    subject: CONFIG.APP_NAME + " access request: " + email,
    body: body,
  });
}

function sendApprovedWelcomeEmail(email, expiresAt) {
  MailApp.sendEmail({
    to: email,
    subject: CONFIG.APP_NAME + " access approved",
    body:
      "Your access to " +
      CONFIG.APP_NAME +
      " was approved.\n\nA 6-digit login code was sent in a separate email. Open:\n" +
      CONFIG.APP_URL +
      "\n\nAccess expires: " +
      expiresAt,
  });
}

function sendDeniedEmail(email) {
  MailApp.sendEmail({
    to: email,
    subject: CONFIG.APP_NAME + " access not granted",
    body:
      "Your request to access " +
      CONFIG.APP_NAME +
      " was not approved at this time.\n\nContact " +
      CONFIG.RECIPIENT_EMAIL +
      " if you have questions.",
  });
}

function ensureSheets() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  ensureSheet(ss, SHEETS.REQUESTS, ["email", "token", "status", "requestedAt"]);
  ensureSheet(ss, SHEETS.APPROVED, ["email", "expiresAt", "grantType", "approvedAt"]);
  ensureSheet(ss, SHEETS.CODES, ["email", "code", "expiresAt", "used", "grantType", "createdAt"]);
  ensureSheet(ss, SHEETS.EVENTS, ["timestamp", "action", "email", "detail"]);
}

function ensureSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function getSheet(name) {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(name);
}

function appendRow(sheetName, obj) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) {
    return obj[h] != null ? obj[h] : "";
  });
  sheet.appendRow(row);
}

function readRows(sheetName) {
  var sheet = getSheet(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var obj = { rowIndex: i + 1 };
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = values[i][c];
    }
    rows.push(obj);
  }
  return rows;
}

function getApprovedUser(email) {
  var rows = readRows(SHEETS.APPROVED);
  for (var i = rows.length - 1; i >= 0; i--) {
    if (normalizeEmail(rows[i].email) === email) return rows[i];
  }
  return null;
}

function upsertApprovedUser(email, expiresAt, grantType) {
  var sheet = getSheet(SHEETS.APPROVED);
  var rows = readRows(SHEETS.APPROVED);
  for (var i = 0; i < rows.length; i++) {
    if (normalizeEmail(rows[i].email) === email) {
      sheet.getRange(rows[i].rowIndex, 2, 1, 3).setValues([[expiresAt, grantType, new Date().toISOString()]]);
      return;
    }
  }
  appendRow(SHEETS.APPROVED, {
    email: email,
    expiresAt: expiresAt,
    grantType: grantType,
    approvedAt: new Date().toISOString(),
  });
}

function removeApprovedUser(email) {
  var sheet = getSheet(SHEETS.APPROVED);
  var rows = readRows(SHEETS.APPROVED);
  for (var i = rows.length - 1; i >= 0; i--) {
    if (normalizeEmail(rows[i].email) === email) {
      sheet.deleteRow(rows[i].rowIndex);
    }
  }
}

function findOpenRequest(email) {
  var rows = readRows(SHEETS.REQUESTS);
  for (var i = rows.length - 1; i >= 0; i--) {
    if (normalizeEmail(rows[i].email) === email && rows[i].status === "pending") return rows[i];
  }
  return null;
}

function findRequestByToken(email, token) {
  var rows = readRows(SHEETS.REQUESTS);
  for (var i = rows.length - 1; i >= 0; i--) {
    if (normalizeEmail(rows[i].email) === email && String(rows[i].token) === token) return rows[i];
  }
  return null;
}

function updateRequestStatus(rowIndex, status) {
  getSheet(SHEETS.REQUESTS).getRange(rowIndex, 3).setValue(status);
}

function findValidCode(email, code) {
  var rows = readRows(SHEETS.CODES);
  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    if (normalizeEmail(row.email) !== email) continue;
    if (String(row.code) !== code) continue;
    if (String(row.used) === "true") continue;
    if (!isFuture(row.expiresAt)) continue;
    return row;
  }
  return null;
}

function markCodeUsed(rowIndex) {
  var sheet = getSheet(SHEETS.CODES);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var usedCol = headers.indexOf("used") + 1;
  if (usedCol > 0) sheet.getRange(rowIndex, usedCol).setValue("true");
}

function clearCodesForEmail(email) {
  var sheet = getSheet(SHEETS.CODES);
  var rows = readRows(SHEETS.CODES);
  for (var i = rows.length - 1; i >= 0; i--) {
    if (normalizeEmail(rows[i].email) === email) sheet.deleteRow(rows[i].rowIndex);
  }
}

function logEvent(action, email, detail) {
  appendRow(SHEETS.EVENTS, {
    timestamp: new Date().toISOString(),
    action: action,
    email: email || "",
    detail: detail || "",
  });
}

function isAutoApproveEmail(email) {
  var domain = email.split("@")[1] || "";
  return CONFIG.AUTO_APPROVE_DOMAINS.some(function (allowed) {
    return domain === allowed || domain.slice(-(allowed.length + 1)) === "." + allowed;
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isFuture(iso) {
  return Date.parse(iso) > Date.now();
}

function makeRevokeToken(email) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    email + "|" + CONFIG.RECIPIENT_EMAIL + "|" + CONFIG.SPREADSHEET_ID
  );
  return Utilities.base64EncodeWebSafe(digest).slice(0, 32);
}

function isAdminTokenValid(token, email, kind) {
  if (kind === "revoke") return token === makeRevokeToken(email);
  return false;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function htmlPage(title, bodyHtml) {
  return HtmlService.createHtmlOutput(
    "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" +
      escapeHtml(title) +
      "</title></head><body style='font-family:Open Sans,sans-serif;padding:24px'>" +
      "<h1>" +
      escapeHtml(title) +
      "</h1>" +
      bodyHtml +
      "</body></html>"
  );
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
