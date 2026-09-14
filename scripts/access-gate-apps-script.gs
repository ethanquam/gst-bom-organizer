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
  ACCESS_GRANT_DAYS: 3650,
  ACCESS_CODE_MINUTES: 30,
  SETUP_TOKEN_MINUTES: 30,
  MIN_PASSWORD_LENGTH: 8,
};

var SHEETS = {
  REQUESTS: "AccessRequests",
  APPROVED: "ApprovedUsers",
  CODES: "AccessCodes",
  EVENTS: "Events",
};

function doGet(e) {
  return handleHttp_(e);
}

function doPost(e) {
  return handleHttp_(e, true);
}

function handleHttp_(e, asHtmlCallback) {
  var params = e && e.parameter ? e.parameter : {};
  var action = String(params.action || "").toLowerCase();

  try {
    if (action === "ping") {
      return respondJsonpOrHtml_(params, { status: "ok", app: CONFIG.APP_NAME }, asHtmlCallback);
    }

    ensureSheets();

    if (action === "access_approve" || action === "access_deny" || action === "access_revoke") {
      return handleAdminHtmlAction(action, params);
    }

    var result = handleJsonAction(action, params);
    return respondJsonpOrHtml_(params, result, asHtmlCallback);
  } catch (err) {
    var message = err && err.message ? err.message : String(err);
    var errorResult = { status: "error", message: message };
    try {
      return respondJsonpOrHtml_(params, errorResult, asHtmlCallback);
    } catch (err2) {
      return ContentService.createTextOutput(
        (params.callback || "gstAccessCb") + "(" + JSON.stringify(errorResult) + ")"
      ).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
  }
}

function respondJsonpOrHtml_(params, result, asHtmlCallback) {
  if (params.callback) {
    if (asHtmlCallback) {
      return htmlCallback_(params.callback, result);
    }
    return ContentService.createTextOutput(params.callback + "(" + JSON.stringify(result) + ")").setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  }
  return jsonResponse(result);
}

function htmlCallback_(callbackName, result) {
  var name = String(callbackName || "").replace(/[^\w$]/g, "");
  if (!name) name = "gstAccessCb";
  var envelope = JSON.stringify({
    source: "gst-bom-access",
    callback: name,
    payload: result,
  }).replace(/</g, "\\u003c");
  return HtmlService.createHtmlOutput(
    "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><script>" +
      "var msg=" +
      envelope +
      ";" +
      "try{if(window.parent&&window.parent!==window){window.parent.postMessage(msg,'*');}}" +
      "catch(e){}" +
      "</script><p>OK</p></body></html>"
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function handleJsonAction(action, params) {
  switch (action) {
    case "access_start":
      return accessStart(params.email, params.reset === "1");
    case "access_verify":
      return accessVerify(params.email, params.code);
    case "access_set_password":
      return accessSetPassword(params.email, params.setupToken, passwordFromParams_(params));
    case "access_login":
      return accessLogin(params.email, passwordFromParams_(params));
    case "access_check":
      return accessCheck(params.email, params.revalidate === "1");
    case "access_resend_code":
      return accessResendCode(params.email);
    default:
      return { status: "error", message: "Unknown action: " + action };
  }
}

function passwordFromParams_(params) {
  if (params && params.password) return String(params.password);
  if (params && params.p) {
    try {
      var raw = String(params.p).replace(/-/g, "+").replace(/_/g, "/");
      while (raw.length % 4) raw += "=";
      return Utilities.newBlob(Utilities.base64Decode(raw)).getDataAsString("UTF-8");
    } catch (err) {
      return "";
    }
  }
  return "";
}

function accessStart(emailRaw, reset) {
  var email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    return { status: "error", message: "Invalid email address." };
  }

  logEvent("access_start", email, reset ? "reset" : "");

  var approved = getApprovedUser(email);
  if (approved && userHasPassword(approved) && !reset) {
    return { status: "use_password" };
  }

  if (approved) {
    sendAccessCode(email, approved.grantType || "existing");
    return { status: "verify_code" };
  }

  if (isAutoApproveEmail(email)) {
    sendAccessCode(email, "auto");
    return { status: "verify_code" };
  }

  if (reset) {
    return { status: "error", message: "No approved account found for password reset." };
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
    logEvent("access_verify_failed", email, "bad_code:" + code);
    return { status: "error", message: "Invalid or expired code." };
  }

  markCodeUsed(codeRow.rowIndex);
  var grantType = isAutoApproveEmail(email) ? "auto" : "manual";
  var pending = findOpenRequest(email);
  if (pending) {
    updateRequestStatus(pending.rowIndex, "approved");
    grantType = "manual";
  }

  grantAccess(email, grantType);
  var setupToken = issueSetupToken(email);
  logEvent("access_verify_ok", email, grantType);
  return { status: "set_password", email: email, setupToken: setupToken, grantType: grantType };
}

function accessSetPassword(emailRaw, setupTokenRaw, passwordRaw) {
  var email = normalizeEmail(emailRaw);
  var setupToken = String(setupTokenRaw || "");
  var password = String(passwordRaw || "");
  if (!isValidEmail(email)) {
    return { status: "error", message: "Invalid email." };
  }
  if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
    return { status: "error", message: "Password must be at least " + CONFIG.MIN_PASSWORD_LENGTH + " characters." };
  }

  var approved = getApprovedUser(email);
  if (!approved) {
    return { status: "error", message: "Account not approved." };
  }
  if (String(approved.setupToken || "") !== setupToken || !isFuture(approved.setupTokenExpires)) {
    return { status: "error", message: "Setup expired. Request a new email code." };
  }

  var salt = Utilities.getUuid().replace(/-/g, "");
  var hash = hashPassword_(password, salt);
  savePassword_(email, salt, hash);
  clearSetupToken_(email);
  grantAccess(email, approved.grantType || "manual");
  logEvent("access_set_password", email, "");
  return { status: "ok", email: email };
}

function accessLogin(emailRaw, passwordRaw) {
  var email = normalizeEmail(emailRaw);
  var password = String(passwordRaw || "");
  if (!isValidEmail(email) || password.length < CONFIG.MIN_PASSWORD_LENGTH) {
    return { status: "error", message: "Incorrect email or password." };
  }

  var approved = getApprovedUser(email);
  if (!approved || !userHasPassword(approved)) {
    return { status: "error", message: "Incorrect email or password." };
  }
  if (!passwordsMatch_(password, approved.passwordSalt, approved.passwordHash)) {
    logEvent("access_login_failed", email, "");
    return { status: "error", message: "Incorrect email or password." };
  }

  logEvent("access_login_ok", email, "");
  return { status: "ok", email: email, grantType: approved.grantType || "" };
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
  forceCodeColumnText_();

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

function forceCodeColumnText_() {
  var sheet = getSheet(SHEETS.CODES);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var codeCol = headers.indexOf("code") + 1;
  if (codeCol > 0) {
    sheet.getRange(2, codeCol, Math.max(sheet.getLastRow(), 2), 1).setNumberFormat("@");
  }
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
      " was approved.\n\nOpen the app and enter your email. You will receive a one-time code, then create a password for future visits:\n" +
      CONFIG.APP_URL,
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
  if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID.indexOf("PASTE_SHEET") === 0) {
    throw new Error("Set CONFIG.SPREADSHEET_ID to your Google Sheet ID, then deploy a new version.");
  }
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  ensureSheet(ss, SHEETS.REQUESTS, ["email", "token", "status", "requestedAt"]);
  ensureSheet(ss, SHEETS.APPROVED, [
    "email",
    "expiresAt",
    "grantType",
    "approvedAt",
    "passwordSalt",
    "passwordHash",
    "setupToken",
    "setupTokenExpires",
  ]);
  try {
    ensureApprovedPasswordColumns_();
  } catch (err) {
    // Older sheets still work; password columns added when possible.
  }
  ensureSheet(ss, SHEETS.CODES, ["email", "code", "expiresAt", "used", "grantType", "createdAt"]);
  ensureSheet(ss, SHEETS.EVENTS, ["timestamp", "action", "email", "detail"]);
}

function ensureApprovedPasswordColumns_() {
  var sheet = getSheet(SHEETS.APPROVED);
  if (!sheet) return;
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var needed = ["passwordSalt", "passwordHash", "setupToken", "setupTokenExpires"];
  var i;
  for (i = 0; i < needed.length; i++) {
    if (headers.indexOf(needed[i]) === -1) {
      sheet.getRange(1, headers.length + 1).setValue(needed[i]);
      headers.push(needed[i]);
    }
  }
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
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var col = function (name) {
    return headers.indexOf(name) + 1;
  };
  for (var i = 0; i < rows.length; i++) {
    if (normalizeEmail(rows[i].email) === email) {
      if (col("expiresAt")) sheet.getRange(rows[i].rowIndex, col("expiresAt")).setValue(expiresAt);
      if (col("grantType")) sheet.getRange(rows[i].rowIndex, col("grantType")).setValue(grantType);
      if (col("approvedAt")) sheet.getRange(rows[i].rowIndex, col("approvedAt")).setValue(new Date().toISOString());
      return;
    }
  }
  appendRow(SHEETS.APPROVED, {
    email: email,
    expiresAt: expiresAt,
    grantType: grantType,
    approvedAt: new Date().toISOString(),
    passwordSalt: "",
    passwordHash: "",
    setupToken: "",
    setupTokenExpires: "",
  });
}

function userHasPassword(approved) {
  return !!(approved && String(approved.passwordHash || "").trim());
}

function issueSetupToken(email) {
  var token = Utilities.getUuid();
  var expires = new Date();
  expires.setMinutes(expires.getMinutes() + CONFIG.SETUP_TOKEN_MINUTES);
  var sheet = getSheet(SHEETS.APPROVED);
  var rows = readRows(SHEETS.APPROVED);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var tokenCol = headers.indexOf("setupToken") + 1;
  var expCol = headers.indexOf("setupTokenExpires") + 1;
  for (var i = 0; i < rows.length; i++) {
    if (normalizeEmail(rows[i].email) === email) {
      if (tokenCol) sheet.getRange(rows[i].rowIndex, tokenCol).setValue(token);
      if (expCol) sheet.getRange(rows[i].rowIndex, expCol).setValue(expires.toISOString());
      return token;
    }
  }
  return token;
}

function clearSetupToken_(email) {
  var sheet = getSheet(SHEETS.APPROVED);
  var rows = readRows(SHEETS.APPROVED);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var tokenCol = headers.indexOf("setupToken") + 1;
  var expCol = headers.indexOf("setupTokenExpires") + 1;
  for (var i = 0; i < rows.length; i++) {
    if (normalizeEmail(rows[i].email) === email) {
      if (tokenCol) sheet.getRange(rows[i].rowIndex, tokenCol).setValue("");
      if (expCol) sheet.getRange(rows[i].rowIndex, expCol).setValue("");
      return;
    }
  }
}

function savePassword_(email, salt, hash) {
  var sheet = getSheet(SHEETS.APPROVED);
  var rows = readRows(SHEETS.APPROVED);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var saltCol = headers.indexOf("passwordSalt") + 1;
  var hashCol = headers.indexOf("passwordHash") + 1;
  for (var i = 0; i < rows.length; i++) {
    if (normalizeEmail(rows[i].email) === email) {
      if (saltCol) sheet.getRange(rows[i].rowIndex, saltCol).setValue(salt);
      if (hashCol) sheet.getRange(rows[i].rowIndex, hashCol).setValue(hash);
      return;
    }
  }
}

function hashPassword_(password, salt) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + "|" + password,
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(raw);
}

function passwordsMatch_(password, salt, hash) {
  if (!salt || !hash) return false;
  return hashPassword_(password, String(salt)) === String(hash);
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
  var wanted = normalizeCode(code);
  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    if (normalizeEmail(row.email) !== email) continue;
    if (normalizeCode(row.code) !== wanted) continue;
    if (isUsedFlag(row.used)) continue;
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
  try {
    appendRow(SHEETS.EVENTS, {
      timestamp: new Date().toISOString(),
      action: action,
      email: email || "",
      detail: detail || "",
    });
  } catch (err) {
    // Never fail a login because audit logging failed.
  }
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

function normalizeCode(value) {
  return String(value == null ? "" : value)
    .trim()
    .replace(/\s+/g, "")
    .replace(/\.0+$/, "");
}

function isUsedFlag(value) {
  if (value === true || value === 1) return true;
  var text = String(value == null ? "" : value).trim().toLowerCase();
  return text === "true" || text === "yes" || text === "1";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toMillis(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    var time = value.getTime();
    return isNaN(time) ? NaN : time;
  }
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }
  var parsed = Date.parse(String(value || ""));
  return isNaN(parsed) ? NaN : parsed;
}

function isFuture(value) {
  var ms = toMillis(value);
  return !isNaN(ms) && ms > Date.now();
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
