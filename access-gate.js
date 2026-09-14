/* GST BOM Organizer — access gate (email code once → password, then email+password). */
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
    setupToken: "",
    busy: false,
    resetMode: false,
  };

  function cfg() {
    return window.GST_ACCESS_CONFIG || {};
  }

  function isGateActive() {
    var c = cfg();
    return c.enabled !== false && !!c.appsScriptUrl;
  }

  function isLocalDev() {
    var host = window.location.hostname;
    if (window.location.protocol === "file:") return true;
    return host === "localhost" || host === "127.0.0.1";
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function clearSession() {
    try {
      localStorage.removeItem((cfg().sessionKey || "gst-app-access-v1"));
    } catch (err) {}
  }

  function jsonp(action, params) {
    var c = cfg();
    return new Promise(function (resolve, reject) {
      if (!c.appsScriptUrl || !/^https?:\/\//i.test(c.appsScriptUrl)) {
        reject(new Error("Access service is not configured yet."));
        return;
      }
      var callbackName = "gstAccessCb_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
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
        reject(
          new Error(
            "Access service timed out or crashed. In Apps Script: confirm SPREADSHEET_ID, Save, then Deploy → Manage deployments → Edit → New version → Deploy."
          )
        );
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
        reject(
          new Error(
            "Could not reach the access service. Redeploy Apps Script (New version) and try again."
          )
        );
      };
      script.src = url.toString();
      document.head.appendChild(script);
    });
  }

  function encodePasswordParam(password) {
    return btoa(unescape(encodeURIComponent(String(password || ""))));
  }

  /* Passwords go via POST iframe; response uses postMessage (cross-origin safe). */
  function formPost(action, params) {
    var c = cfg();
    return new Promise(function (resolve, reject) {
      if (!c.appsScriptUrl || !/^https?:\/\//i.test(c.appsScriptUrl)) {
        reject(new Error("Access service is not configured yet."));
        return;
      }
      var callbackName = "gstAccessCb_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
      var iframe = document.createElement("iframe");
      var form = document.createElement("form");
      var settled = false;

      function cleanup() {
        window.removeEventListener("message", onMessage);
        if (form.parentNode) form.parentNode.removeChild(form);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }

      function finish(err, data) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        cleanup();
        if (err) reject(err);
        else resolve(data || {});
      }

      function onMessage(event) {
        var msg = event && event.data;
        if (!msg || msg.source !== "gst-bom-access" || msg.callback !== callbackName) return;
        finish(null, msg.payload);
      }

      var timer = window.setTimeout(function () {
        finish(
          new Error(
            "Request timed out. In Apps Script use Deploy → Manage deployments → Edit → New version, then try again."
          )
        );
      }, 45000);

      window.addEventListener("message", onMessage);

      iframe.name = callbackName + "_frame";
      iframe.title = "access";
      iframe.style.display = "none";
      form.method = "POST";
      form.action = c.appsScriptUrl;
      form.target = iframe.name;
      form.acceptCharset = "UTF-8";
      form.style.display = "none";

      function addField(name, value) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }

      addField("action", action);
      addField("callback", callbackName);
      Object.keys(params || {}).forEach(function (key) {
        if (params[key] != null && params[key] !== "") {
          addField(key, String(params[key]));
        }
      });

      document.body.appendChild(iframe);
      document.body.appendChild(form);
      form.submit();
    });
  }

  function els() {
    return {
      gate: document.getElementById("access-gate"),
      message: document.getElementById("access-gate-message"),
      expiry: document.getElementById("access-gate-expiry"),
      error: document.getElementById("access-gate-error"),
      emailStep: document.getElementById("access-step-email"),
      codeStep: document.getElementById("access-step-code"),
      pendingStep: document.getElementById("access-step-pending"),
      passwordStep: document.getElementById("access-step-password"),
      setPasswordStep: document.getElementById("access-step-set-password"),
      loginForm: document.getElementById("access-login-form"),
      setPasswordForm: document.getElementById("access-set-password-form"),
      emailInput: document.getElementById("access-email"),
      codeInput: document.getElementById("access-code"),
      passwordInput: document.getElementById("access-password"),
      loginUsername: document.getElementById("access-login-username"),
      setUsername: document.getElementById("access-set-username"),
      newPasswordInput: document.getElementById("access-new-password"),
      confirmPasswordInput: document.getElementById("access-confirm-password"),
      emailDisplay: document.getElementById("access-email-display"),
      btnRequest: document.getElementById("access-btn-request"),
      btnVerify: document.getElementById("access-btn-verify"),
      btnResend: document.getElementById("access-btn-resend"),
      btnLogin: document.getElementById("access-btn-login"),
      btnSetPassword: document.getElementById("access-btn-set-password"),
      btnForgot: document.getElementById("access-btn-forgot"),
      btnChangeEmail: document.getElementById("access-btn-change-email"),
      btnChangeEmailPending: document.getElementById("access-btn-change-email-pending"),
      btnChangeEmailPassword: document.getElementById("access-btn-change-email-password"),
    };
  }

  function setBusy(busy) {
    state.busy = busy;
    var ui = els();
    ["btnRequest", "btnVerify", "btnResend", "btnLogin", "btnSetPassword", "btnForgot"].forEach(function (key) {
      if (ui[key]) ui[key].disabled = busy;
    });
    if (ui.gate) ui.gate.classList.toggle("is-busy", busy);
  }

  function setExpiryNote(text) {
    var ui = els();
    if (!ui.expiry) return;
    ui.expiry.hidden = !text;
    ui.expiry.textContent = text || "";
  }

  function showError(text) {
    var ui = els();
    if (!ui.error) return;
    ui.error.hidden = !text;
    ui.error.textContent = text || "";
  }

  function showStep(step) {
    state.step = step;
    var ui = els();
    if (ui.emailStep) ui.emailStep.hidden = step !== "email";
    if (ui.codeStep) ui.codeStep.hidden = step !== "code";
    if (ui.pendingStep) ui.pendingStep.hidden = step !== "pending";
    if (ui.passwordStep) ui.passwordStep.hidden = step !== "password";
    if (ui.setPasswordStep) ui.setPasswordStep.hidden = step !== "set_password";
  }

  function markReady() {
    document.body.classList.remove("access-pending");
    document.body.classList.add("access-ready");
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

  function finishLogin() {
    clearSession();
    unlockApp();
    return loadAppScripts();
  }

  function openGate() {
    var ui = els();
    var c = cfg();
    clearSession();
    lockApp();
    showError("");
    state.resetMode = false;
    state.setupToken = "";
    showStep("email");
    setExpiryNote("New users verify email once and create a password. Return visits use email + password.");
    if (ui.message) {
      ui.message.textContent = "Enter your work email to open " + (c.appName || "this tool") + ".";
    }
    if (ui.emailInput) {
      ui.emailInput.value = state.email || "";
      ui.emailInput.focus();
    }
  }

  function goChangeEmail() {
    var ui = els();
    state.resetMode = false;
    state.setupToken = "";
    showStep("email");
    showError("");
    setExpiryNote("New users verify email once and create a password. Return visits use email + password.");
    if (ui.message) ui.message.textContent = "Enter your work email to continue.";
    if (ui.emailInput) ui.emailInput.focus();
  }

  function showPasswordStep(email) {
    var ui = els();
    state.email = email;
    showStep("password");
    setExpiryNote("Access stays active until an admin revokes it.");
    if (ui.message) ui.message.textContent = "Enter your password to continue.";
    if (ui.loginUsername) ui.loginUsername.value = email;
    if (ui.passwordInput) {
      ui.passwordInput.value = "";
      ui.passwordInput.focus();
    }
  }

  function showSetPasswordStep(email, setupToken) {
    var ui = els();
    state.email = email;
    state.setupToken = setupToken || "";
    showStep("set_password");
    setExpiryNote("Choose a password of at least 8 characters. You will use it for future visits.");
    if (ui.message) {
      ui.message.textContent = state.resetMode
        ? "Choose a new password for your account."
        : "Create a password to finish setup.";
    }
    if (ui.setUsername) ui.setUsername.value = email;
    if (ui.newPasswordInput) ui.newPasswordInput.value = "";
    if (ui.confirmPasswordInput) ui.confirmPasswordInput.value = "";
    if (ui.newPasswordInput) ui.newPasswordInput.focus();
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
    jsonp("access_start", { email: email, reset: state.resetMode ? "1" : "" })
      .then(function (result) {
        if (!result || result.status === "error") {
          throw new Error((result && result.message) || "Could not start access request.");
        }
        if (result.status === "use_password") {
          state.resetMode = false;
          showPasswordStep(email);
          return;
        }
        if (result.status === "verify_code") {
          showStep("code");
          if (ui.emailDisplay) ui.emailDisplay.textContent = email;
          if (ui.codeInput) {
            ui.codeInput.value = "";
            ui.codeInput.focus();
          }
          if (ui.message) ui.message.textContent = "Enter the 6-digit code sent to your email.";
          setExpiryNote(
            state.resetMode
              ? "After you verify, you will set a new password."
              : "After you verify, you will create a password for future logins."
          );
          return;
        }
        if (result.status === "pending") {
          showStep("pending");
          if (ui.message) {
            ui.message.textContent =
              "Your request was sent for approval. You will receive email when access is granted.";
          }
          setExpiryNote("After approval, verify your email once and create a password.");
          return;
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
      goChangeEmail();
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
        if (!result || (result.status !== "set_password" && result.status !== "ok")) {
          throw new Error((result && result.message) || "Invalid or expired code.");
        }
        showSetPasswordStep(result.email || email, result.setupToken || "");
      })
      .catch(function (err) {
        showError(err.message || "Verification failed.");
      })
      .then(function () {
        setBusy(false);
      });
  }

  function onResendCode() {
    var email = normalizeEmail(state.email);
    if (!email) return;
    setBusy(true);
    showError("");
    jsonp("access_resend_code", { email: email })
      .then(function (result) {
        if (!result || result.status !== "ok") {
          throw new Error((result && result.message) || "Could not resend code.");
        }
        if (els().message) els().message.textContent = "A new code was sent to your email.";
      })
      .catch(function (err) {
        showError(err.message || "Could not resend code.");
      })
      .then(function () {
        setBusy(false);
      });
  }

  function onLogin(event) {
    if (event && event.preventDefault) event.preventDefault();
    var ui = els();
    var email = normalizeEmail(
      state.email || (ui.loginUsername && ui.loginUsername.value)
    );
    var password = String((ui.passwordInput && ui.passwordInput.value) || "");
    if (!email) {
      goChangeEmail();
      return;
    }
    if (password.length < 8) {
      showError("Enter your password (at least 8 characters).");
      return;
    }
    setBusy(true);
    showError("");
    jsonp("access_login", { email: email, p: encodePasswordParam(password) })
      .then(function (result) {
        if (!result || result.status !== "ok") {
          throw new Error((result && result.message) || "Incorrect email or password.");
        }
        return finishLogin();
      })
      .catch(function (err) {
        showError(err.message || "Login failed.");
      })
      .then(function () {
        setBusy(false);
      });
  }

  function onSetPassword(event) {
    if (event && event.preventDefault) event.preventDefault();
    var ui = els();
    var email = normalizeEmail(
      state.email || (ui.setUsername && ui.setUsername.value)
    );
    var password = String((ui.newPasswordInput && ui.newPasswordInput.value) || "");
    var confirm = String((ui.confirmPasswordInput && ui.confirmPasswordInput.value) || "");
    if (password.length < 8) {
      showError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }
    if (!state.setupToken) {
      showError("Setup expired. Request a new email code.");
      return;
    }
    setBusy(true);
    showError("");
    jsonp("access_set_password", {
      email: email,
      setupToken: state.setupToken,
      p: encodePasswordParam(password),
    })
      .then(function (result) {
        if (!result || result.status !== "ok") {
          throw new Error((result && result.message) || "Could not save password.");
        }
        state.resetMode = false;
        state.setupToken = "";
        return finishLogin();
      })
      .catch(function (err) {
        showError(err.message || "Could not save password.");
      })
      .then(function () {
        setBusy(false);
      });
  }

  function onForgotPassword() {
    state.resetMode = true;
    showError("");
    var ui = els();
    if (ui.message) ui.message.textContent = "We will email a code so you can set a new password.";
    setExpiryNote("Password reset uses a one-time email code.");
    if (ui.emailInput && state.email) ui.emailInput.value = state.email;
    onRequestAccess();
  }

  function bindUi() {
    var ui = els();
    if (ui.btnRequest) ui.btnRequest.addEventListener("click", onRequestAccess);
    if (ui.btnVerify) ui.btnVerify.addEventListener("click", onVerifyCode);
    if (ui.btnResend) ui.btnResend.addEventListener("click", onResendCode);
    if (ui.loginForm) ui.loginForm.addEventListener("submit", onLogin);
    if (ui.setPasswordForm) ui.setPasswordForm.addEventListener("submit", onSetPassword);
    if (ui.btnForgot) ui.btnForgot.addEventListener("click", onForgotPassword);
    if (ui.btnChangeEmail) ui.btnChangeEmail.addEventListener("click", goChangeEmail);
    if (ui.btnChangeEmailPending) ui.btnChangeEmailPending.addEventListener("click", goChangeEmail);
    if (ui.btnChangeEmailPassword) ui.btnChangeEmailPassword.addEventListener("click", goChangeEmail);
    if (ui.emailInput) {
      ui.emailInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") onRequestAccess();
      });
    }
    if (ui.codeInput) {
      ui.codeInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") onVerifyCode();
      });
    }
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
    openGate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
