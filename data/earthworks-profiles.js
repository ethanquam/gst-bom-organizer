/* Earthworks machine profiles — dozer v1. See Ideaverse docs/earthworks-bom-rules.md */
(function () {
  "use strict";

  window.EARTHWORKS_PROFILES = {
    version: "2.25.x",
    defaultProfile: "auto",
    profiles: {
      dozer: {
        key: "dozer",
        label: "Earthworks Dozer (generic blade mount)",
        manualRef: "Dozer Installation Manual V2.25.x",
        disclaimer:
          "Based on generic Earthworks dozer install manual V2.25.x — verify against machine-specific docs and GST notes.",
        detect: {
          kitPrefixes: ["160005-"],
          machineKeywords: ["dozer", "d6", "d7", "d8", "d9", "d10", "d11", "cat dozer", "komatsu dozer"],
          notesKeywords: ["dozer", "blade mount", "160005-"],
        },
        roles: {
          ec520: { required: true, label: "EC520 controller", manualRef: "§3.4", suggestPart: "100435-10" },
          display: {
            required: true,
            label: "TD5x0 display or supported tablet",
            oneOf: ["td510", "td520", "td540", "td520"],
            manualRef: "§3.5–3.6",
          },
          platform_harness: {
            required: true,
            label: "EC520 long platform harness",
            manualRef: "§3.3, §4.2",
            suggestPart: "150603-02",
          },
          power_cable: {
            required: true,
            label: "Power cable",
            manualRef: "§3.3.1",
            suggestPart: "150411-045",
          },
          aa510: { required: true, label: "AA510 audible alarm", manualRef: "§3.9", matchPatterns: ["AA510"] },
          gnss_receiver: {
            required: "if_3d",
            label: "GNSS receiver / Smart Antenna",
            minQty: 2,
            manualRef: "§6.2–6.3",
            suggestPart: "95106-01",
          },
          mast_mount_lr: { required: "if_blade_gnss", label: "Mast mount kits", manualRef: "§5.2", suggestPart: "78003-02" },
          valve_module: {
            required: "if_autos",
            label: "VM510 valve module",
            manualRef: "§3.8",
            suggestPart: "100441-00",
          },
          ci5xx: {
            required: "if_autos",
            label: "CI510 or CI520 CAN interface",
            oneOf: ["ci510", "ci520"],
            manualRef: "§3.7",
          },
          correction_source: {
            required: "if_3d",
            label: "SNM94x gateway or SNR radio (corrections)",
            oneOf: ["snm941", "snm941_mount", "snm941_antenna", "snr_radio"],
            manualRef: "§3.2.3",
          },
          software_license: {
            required: "info",
            label: "Earthworks software / license",
            categoryMatch: "software",
            manualRef: "Commissioning §2.8",
          },
        },
        kitTriggers: {
          "160005-500": ["ec520", "platform_harness", "power_cable"],
          "160005-501": ["display"],
          "160005-502": ["valve_module", "ci5xx"],
        },
        flags: [
          {
            when: { hasRole: "td540" },
            expect: { role: "td540_adapter" },
            severity: "warn",
            message: "TD540 installs typically need adapter cable P/N 150878-002 (§3.6.4).",
            suggestPart: "150878-002",
          },
          {
            when: { hasRole: "valve_module" },
            expect: { oneOfRoles: ["ci510", "ci520"] },
            severity: "error",
            message: "Valve module (VM510) requires a CI510 or CI520 CAN interface (§3.7).",
          },
          {
            when: { hasKit: "160005-502" },
            expect: { role: "valve_module" },
            severity: "error",
            message: "Valve add-on kit 160005-502 implies VM510 valve module (§3.8).",
            suggestPart: "100441-00",
          },
          {
            when: { hasKit: "160005-500" },
            expect: { role: "platform_harness" },
            severity: "error",
            message: "Base dozer kit 160005-500 expects EC520 long platform harness (§4.2).",
            suggestPart: "150603-02",
          },
        ],
      },
    },
  };
})();
