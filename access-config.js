/* GST BOM Organizer — access gate config (client). Keep in sync with Apps Script CONFIG. */
(function () {
  "use strict";

  window.GST_ACCESS_CONFIG = {
    /* Paste your deployed Apps Script /exec URL after setup (see docs/access-gate-setup.md). */
    appsScriptUrl: "https://script.google.com/macros/s/AKfycbwUMKsTOXH72HufKZao31wqDpOA2TwQTG3dNKXIRkhH2SBYLRC89E0TU3ojP5o47qZE/exec",

    appUrl: "https://ethanquam.github.io/gst-bom-organizer/",
    appName: "GST BOM Organizer",
    sessionKey: "gst-app-access-v1",
    accessGrantDays: 28,
    accessCodeMinutes: 30,
    autoApproveDomains: ["trimble.com"],

    /* Gate runs only when appsScriptUrl is set. Set false to disable even when URL is set. */
    enabled: true,
  };
})();
