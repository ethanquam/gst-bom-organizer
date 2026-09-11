/* GST BOM Organizer — email + code access gate (client). */
(function () {
  "use strict";

  var APP_SCRIPTS = [
    "data/trimble-components-catalog.js",
    "data/group-data.js",
    "app.js",
  ];

  var state = {
    step: "email",
    email: "",
    expiredNotice: false,
    busy: false,
  };

  function cfg() {
    return window.GST_ACCESS_CONFIG || {};
  }

  function isGateActive() {
    var c = cfg();
    if (c.enabled === false) return false;
    if (!c.appsScriptUrl) return false;
    return true;
  }

  function isLocalDev() {
    var host = window.location.hostname;
    if (window.location.protocol === "file:") return true;
    return host === "localhost" || host === "127.0.0.1";
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function readSession() {
    var c = cfg();
    try {
      var raw = localStorage.getItem(c.sessionKey || "gst-app-access-v1");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function writeSession(session) {
    var c = cfg();
    localStorage.setItem(c.sessionKey || "gst-app-access-v1", JSON.stringify(session));
  }

  function clearSession() {
    var c = cfg();
    localStorage.removeItem(c.sessionKey || "gst-app-access-v1");
  }

  function sessionValid(session) {
    if (!session || !session.email || !session.expiresAt) return false;
    return Date.parse(session.expiresAt) > Date.now();
  }

  function jsonp(action, params) {
    var c = cfg();
    return new Promise(function (resolve, reject) {
      if (!c.appsScriptUrl || !/^https?:\/\//i.test(c.appsScriptUrl)) {
        reject(
          new Error(
            "Access service is not configured yet. Set appsScriptUrl in access-config.js (see docs/access-gate-setup.md)."
          )
        );
        return;
      }
      var callbackName =
        "gstAccessCb_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
      var url = new URL(c.appsScriptUrl);
      url.searchParams.set("action", action);
      url.searchParams.set("callback", callbackName);
      Object.keys(params || {}).forEach(function (key) {
        if (params[key] != null && params[key] !== "") {
          url.searchParams.set(key, String(params[key]));
        }
      });

      var script = document.createElement("script");
      var timer = window.setTimeout(function () {
        cleanup();
        reject(new Error("Request timed out. Try again."));
      }, 25000);

      function cleanup() {
        window.clearTimeout(timer);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = function (data) {
        cleanup();
        resolve(data || {});
      };

      script.onerror = function () {
        cleanup();
        reject(new Error("Could not reach the access service."));
      };

      script.src = url.toString();
      document.head.appendChild(script);
    });
  }

  function els() {
    return {
      gate: document.getElementById("access-gate"),
      message: document.getElementById("access-gate-message"),
      error: document.getElementById("access-gate-error"),
      emailStep: document.getElementById("access-step-email"),
      codeStep: document.getElementById("access-step-code"),
      pendingStep: document.getElementById("access-step-pending"),
      emailInput: document.getElementById("access-email"),
      codeInput: document.getElementById("access-code"),
      emailDisplay: document.getElementById("access-email-display"),
      btnRequest: document.getElementById("access-btn-request"),
      btnVerify: document.getElementById("access-btn-verify"),
      btnResend: document.getElementById("access-btn-resend"),
      btnChangeEmail: document.getElementById("access-btn-change-email"),
      btnChangeEmailPending: document.getElementById("access-btn-change-email-pending"),
    };
  }

  function setBusy(busy) {
    state.busy = busy;
    var ui = els();
    if (ui.btnRequest) ui.btnRequest.disabled = busy;
    if (ui.btnVerify) ui.btnVerify.disabled = busy;
    if (ui.btnResend) ui.btnResend.disabled = busy;
    if (ui.gate) ui.gate.classList.toggle("is-busy", busy);
  }

  function showError(text) {
    var ui = els();
    if (!ui.error) return;
    if (!text) {
      ui.error.hidden = true;
      ui.error.textContent = "";
      return;
    }
    ui.error.hidden = false;
    ui.error.textContent = text;
  }

  function showStep(step) {
    state.step = step;
    var ui = els();
    if (ui.emailStep) ui.emailStep.hidden = step !== "email";
    if (ui.codeStep) ui.codeStep.hidden = step !== "code";
    if (ui.pendingStep) ui.pendingStep.hidden = step !== "pending";
  }

  function lockApp() {
    document.body.classList.remove("access-pending");
    document.body.classList.add("access-locked");
    var ui = els();
    if (ui.gate) ui.gate.hidden = false;
  }

  function unlockApp() {
    document.body.classList.remove("access-locked");
    markReady();
    var ui = els();
    if (ui.gate) ui.gate.hidden = true;
  }

  function loadAppScripts() {
    if (window.__gstAppScriptsLoaded) return Promise.resolve();
    window.__gstAppScriptsLoaded = true;
    return APP_SCRIPTS.reduce(function (chain, src) {
      return chain.then(function () {
        return new Promise(function (resolve, reject) {
          var script = document.createElement("script");
          script.src = src;
          script.onload = resolve;
          script.onerror = function () {
            reject(new Error("Failed to load " + src));
          };
          document.body.appendChild(script);
        });
      });
    }, Promise.resolve());
  }

  function grantAccess(result) {
    writeSession({
      email: result.email,
      expiresAt: result.expiresAt,
      grantType: result.grantType || "auto",
    });
    unlockApp();
    return loadAppScripts();
  }

  function openGate(options) {
    var ui = els();
    var c = cfg();
    state.expiredNotice = !!(options && options.expired);
    lockApp();
    showError("");
    showStep("email");

    if (ui.message) {
      if (state.expiredNotice) {
        ui.message.textContent =
          "Your access expired. Verify again to continue. BOM data saved in this browser is unchanged.";
      } else {
        ui.message.textContent =
          "Enter your work email to open " + (c.appName || "this tool") + ".";
      }
    }

    if (ui.emailInput) {
      ui.emailInput.value = state.email || (readSession() && readSession().email) || "";
      ui.emailInput.focus();
    }
  }

  function revalidateSession(session) {
    return jsonp("access_check", {
      email: session.email,
      revalidate: "1",
    }).then(function (result) {
      if (result && result.status === "ok") {
        if (result.expiresAt) {
          writeSession({
            email: session.email,
            expiresAt: result.expiresAt,
            grantType: result.grantType || session.grantType,
          });
        }
        return true;
      }
      clearSession();
      return false;
    });
  }

  function startWithSession() {
    var session = readSession();
    if (!sessionValid(session)) {
      if (session && session.email) {
        openGate({ expired: true });
      } else {
        openGate();
      }
      return;
    }

    revalidateSession(session)
      .then(function (ok) {
        if (ok) {
          unlockApp();
          return loadAppScripts();
        }
        openGate({ expired: true });
      })
      .catch(function () {
        unlockApp();
        return loadAppScripts();
      });
  }

  function onRequestAccess() {
    var ui = els();
    var email = normalizeEmail(ui.emailInput && ui.emailInput.value);
    if (!email || email.indexOf("@") < 1) {
      showError("Enter a valid work email address.");
      return;
    }

    setBusy(true);
    showError("");
    state.email = email;

    jsonp("access_start", { email: email })
      .then(function (result) {
        if (!result || result.status === "error") {
          throw new Error((result && result.message) || "Could not start access request.");
        }

        if (result.status === "verify_code") {
          showStep("code");
          if (ui.emailDisplay) ui.emailDisplay.textContent = email;
          if (ui.codeInput) {
            ui.codeInput.value = "";
            ui.codeInput.focus();
          }
          if (ui.message) {
            ui.message.textContent = "Enter the 6-digit code sent to your email.";
          }
          return;
        }

        if (result.status === "pending") {
          showStep("pending");
          if (ui.message) {
            ui.message.textContent =
              "Your request was sent for approval. You will receive email when access is granted.";
          }
          return;
        }

        if (result.status === "approved" && result.expiresAt) {
          return grantAccess(result);
        }

        throw new Error("Unexpected response from access service.");
      })
      .catch(function (err) {
        showError(err.message || "Something went wrong.");
      })
      .then(function () {
        setBusy(false);
      });
  }

  function onVerifyCode() {
    var ui = els();
    var email = normalizeEmail(state.email || (ui.emailDisplay && ui.emailDisplay.textContent));
    var code = String((ui.codeInput && ui.codeInput.value) || "").replace(/\s+/g, "");
    if (!email) {
      showStep("email");
      showError("Enter your email first.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      showError("Enter the 6-digit code from your email.");
      return;
    }

    setBusy(true);
    showError("");

    jsonp("access_verify", { email: email, code: code })
      .then(function (result) {
        if (!result || result.status !== "ok") {
          throw new Error((result && result.message) || "Invalid or expired code.");
        }
        return grantAccess(result);
      })
      .catch(function (err) {
        showError(err.message || "Verification failed.");
      })
      .then(function () {
        setBusy(false);
      });
  }

  function onResendCode() {
    var email = normalizeEmail(state.email || (els().emailDisplay && els().emailDisplay.textContent));
    if (!email) return;
    setBusy(true);
    showError("");
    jsonp("access_resend_code", { email: email })
      .then(function (result) {
        if (!result || result.status !== "ok") {
          throw new Error((result && result.message) || "Could not resend code.");
        }
        if (els().message) {
          els().message.textContent = "A new code was sent to your email.";
        }
      })
      .catch(function (err) {
        showError(err.message || "Could not resend code.");
      })
      .then(function () {
        setBusy(false);
      });
  }

  function bindUi() {
    var ui = els();
    if (ui.btnRequest) ui.btnRequest.addEventListener("click", onRequestAccess);
    if (ui.btnVerify) ui.btnVerify.addEventListener("click", onVerifyCode);
    if (ui.btnResend) ui.btnResend.addEventListener("click", onResendCode);
    function goChangeEmail() {
      showStep("email");
      showError("");
      if (ui.message) ui.message.textContent = "Enter your work email to continue.";
      if (ui.emailInput) ui.emailInput.focus();
    }
    if (ui.btnChangeEmail) ui.btnChangeEmail.addEventListener("click", goChangeEmail);
    if (ui.btnChangeEmailPending) ui.btnChangeEmailPending.addEventListener("click", goChangeEmail);
    if (ui.codeInput) {
      ui.codeInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") onVerifyCode();
      });
    }
    if (ui.emailInput) {
      ui.emailInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") onRequestAccess();
      });
    }
  }

  function markReady() {
    document.body.classList.remove("access-pending");
    document.body.classList.add("access-ready");
  }

  function init() {
    if (isGateActive() && !isLocalDev()) {
      document.body.classList.add("access-pending");
    }
    bindUi();
    if (!isGateActive() || isLocalDev()) {
      unlockApp();
      markReady();
      loadAppScripts().catch(function (err) {
        console.error(err);
      });
      return;
    }
    startWithSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
