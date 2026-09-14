/* Earthworks part catalog — dozer v1 (manual V2.25.x). See Ideaverse docs/earthworks-bom-rules.md */
(function () {
  "use strict";

  window.EARTHWORKS_PARTS = {
    version: "2.25.x",
    parts: [
      { part: "160005-500", role: "dozer_base_kit", label: "Base dozer kit (generic blade mount)", category: "kit", matchPatterns: ["Base, Dozer", "Kit - Base, Dozer"] },
      { part: "160005-501", role: "dozer_display_kit", label: "Display add-on dozer kit", category: "kit", matchPatterns: ["Display Add-on, Dozer"] },
      { part: "160005-502", role: "dozer_valve_kit", label: "Valve module add-on dozer kit", category: "kit", matchPatterns: ["Valve Module Add-on, Dozer", "Valve Add-on"] },
      { part: "160041-10", role: "snm941_mount", label: "SNM941 roof mounting kit", category: "bracket", matchPatterns: ["SNM941 roof", "SNM941 Mounting"] },
      { part: "112057-00", role: "snm941_antenna", label: "SNM941 4-in-1 antenna kit", category: "gnss", matchPatterns: ["SNM941 4-in-1", "SNM941 antenna"] },

      { part: "100435-10", aliases: ["200435-10", "520435-10"], role: "ec520", label: "EC520 control module", category: "kit", matchPatterns: ["EC520", "Electronic Controller", "FRU - Electronic Controller"] },
      { part: "201910-10", role: "ec520_bracket", label: "EC520 mounting bracket", category: "bracket", matchPatterns: ["EC520 bracket", "Bracket - EC520"] },

      { part: "150603-02", role: "platform_harness", label: "EC520 long platform harness", category: "harness", matchPatterns: ["Platform harness", "long platform harness", "Harness - Platform"] },
      { part: "150411-045", role: "power_cable", label: "Power cable", category: "cabling", matchPatterns: ["Power cable", "Cable - Power"] },
      { part: "109333-24", role: "relay_24v", label: "Relay 24V", category: "misc", matchPatterns: ["Relay", "109333-24"] },
      { part: "109333-12", role: "relay_12v", label: "Relay 12V", category: "misc", matchPatterns: ["109333-12", "Relay 12V"] },

      { part: "300520-00", role: "td520", label: "TD520 display", category: "display", matchPatterns: ["TD520", "Display - TD520"] },
      { part: "222540-00", role: "td540", label: "TD540 display", category: "display", matchPatterns: ["TD540", "Display - TD540"] },
      { part: "300510-00", role: "td510", label: "TD510 display", category: "display", matchPatterns: ["TD510", "Display - TD510"] },
      { part: "150701-030", role: "display_harness", label: "Display harness 3 m", category: "harness", matchPatterns: ["Display harness", "Harness - Display"] },
      { part: "150878-002", role: "td540_adapter", label: "TD540 adapter cable", category: "cabling", matchPatterns: ["TD540 adapter", "adapter cable"] },
      { part: "110262-00", role: "display_mag_mount", label: "Magnetic display mount", category: "bracket", matchPatterns: ["Magnetic Mount", "magnetic display mount"] },
      { part: "597-1269", role: "display_post_mount", label: "Display post mount", category: "bracket", matchPatterns: ["Display Mounting Post", "post mount"] },

      { part: "100441-00", role: "valve_module", label: "VM510 valve module", category: "sensor", matchPatterns: ["VM510", "Valve module", "Valve Module"] },
      { part: "196540-10", role: "valve_bracket", label: "Valve module mounting bracket", category: "bracket", matchPatterns: ["valve module bracket", "Module mounting bracket"] },
      { part: "09231-10", role: "ci510", label: "CI510 CAN interface", category: "harness", matchPatterns: ["CI510", "CAN Interface Module"] },
      { part: "132739-10", role: "ci520", label: "CI520 CAN interface", category: "harness", matchPatterns: ["CI520"] },
      { part: "150906-01", role: "valve_harness", label: "Valve module harness", category: "harness", matchPatterns: ["Valve module harness", "Harness - Valve"] },
      { part: "86930-05", role: "valve_cable", label: "Valve cable", category: "cabling", matchPatterns: ["Valve cable", "Cable - Valve"] },

      { part: "AA510", aliases: ["AA510-00"], role: "aa510", label: "AA510 audible alarm", category: "sensor", matchPatterns: ["AA510", "audible alarm", "Alarm - AA510"] },

      { part: "95106-01", aliases: ["95105-05", "400976-15", "400996-15"], role: "gnss_receiver", label: "MS9xx GNSS receiver / Smart Antenna", category: "gnss", matchPatterns: ["Receiver - GNSS", "MS995", "MS975", "MS976", "MS992", "Smart Antenna", "GNSS receiver"] },
      { part: "150750-01", role: "gnss_splitter_cable", label: "GNSS splitter cable", category: "cabling", matchPatterns: ["GNSS splitter cable"] },
      { part: "150606-01", role: "gnss_splitter", label: "GNSS splitter", category: "cabling", matchPatterns: ["Splitter", "GNSS splitter"] },
      { part: "150857-01", role: "gnss_terminator", label: "GNSS inline terminator", category: "cabling", matchPatterns: ["Terminator", "inline terminator"] },
      { part: "150416-010", aliases: ["150416-020", "150416-030", "150416-040"], role: "gnss_extender", label: "GNSS extender cable", category: "cabling", matchPatterns: ["Extender cable", "Cable - GNSS", "GNSS Antenna"] },
      { part: "81069-10", role: "gnss_mast", label: "GNSS steel mast", category: "bracket", matchPatterns: ["Steel mast", "Mast - GNSS"] },
      { part: "52070-00", aliases: ["52070-10"], role: "mast_clamp", label: "Mast mounting clamp", category: "bracket", matchPatterns: ["mast clamp", "Mast mounting clamp"] },

      { part: "78003-02", role: "mast_mount_lr", label: "Left/right mast mount kit", category: "bracket", matchPatterns: ["mast mount", "Mast Mount"] },
      { part: "76702", role: "mast_mount_center", label: "Center mast mount kit", category: "bracket", matchPatterns: ["Center mast mount"] },

      { part: "150473-020", role: "cable_ext_2m", label: "Cable extension 2 m", category: "cabling", matchPatterns: ["extension 2m", "extension, 2m"] },
      { part: "150473-040", role: "cable_ext_4m", label: "Cable extension 4 m", category: "cabling", matchPatterns: ["extension 4m", "extension, 4m"] },
      { part: "150858-01", role: "splitter_4", label: "4-circuit splitter", category: "cabling", matchPatterns: ["Splitter, 4 Circuit", "4 Circuit"] },

      { part: "150624-02", role: "quick_disconnect", label: "Quick disconnect", category: "harness", matchPatterns: ["Quick disconnect"] },
      { part: "185150-10", role: "qd_bracket", label: "Quick disconnect bracket", category: "bracket", matchPatterns: ["disconnect bracket"] },

      { part: "150420-025", role: "remote_switch", label: "Remote switch assembly", category: "display", matchPatterns: ["Remote switch", "Switch - Remote"] },

      { part: "74706-01", role: "lightbar", label: "LB400 external lightbar kit", category: "sensor", matchPatterns: ["LB400", "Lightbar", "lightbar"] },

      { part: "990022-210", role: "td520", label: "Training display (maps to TD520)", category: "display", matchPatterns: ["Display - Field Tablet", "Display -", "Tablet"] },
      { part: "990044-008", role: "gnss_receiver", label: "Training GNSS receiver", category: "gnss", matchPatterns: ["Receiver - GNSS"] },
      { part: "990066-440", role: "snr_radio", label: "Training/example radio", category: "radio", matchPatterns: ["Radio -"] },
      { part: "990077-012", role: "valve_harness", label: "Training valve harness", category: "harness", matchPatterns: ["Harness - Valve"] },
      { part: "990055-003", role: "gs_sensor", label: "Training slope/body sensor", category: "sensor", matchPatterns: ["Sensor - Slope", "Sensor -"] },
      { part: "990011-101", role: "dozer_base_kit", label: "Training dozer base kit", category: "kit", matchPatterns: ["Kit - Base, Sample Dozer", "Kit - Base, Dozer"] },

      { part: "SNM941", role: "snm941", label: "SNM941 Connected Site Gateway", category: "radio", matchPatterns: ["SNM941", "SNM94", "Connected Site Gateway"] },
      { part: "SNR", role: "snr_radio", label: "SNR serial radio", category: "radio", matchPatterns: ["SNR radio", "SNR-", "Radio -"] },

      { part: "SCS900-20", role: "siteworks_license", label: "Siteworks Standard", category: "software", matchPatterns: ["SCS900 Standard", "Siteworks/SCS900 Standard"] },
      { part: "SCS900-22", role: "siteworks_license", label: "Siteworks Roading Module", category: "software", matchPatterns: ["SCS900 Roading", "Roading Module"] },
      { part: "SCS900-23", role: "siteworks_license", label: "Siteworks Advanced Measurement", category: "software", matchPatterns: ["Advanced Measurement"] },
      { part: "SITEWORKS-MG", role: "siteworks_license", label: "Siteworks Machine Guidance Module", category: "software", matchPatterns: ["Machine Guidance Module"] },
      { part: "SITEWORKS-B2W", role: "siteworks_license", label: "Siteworks B2W Integration", category: "software", matchPatterns: ["B2W Integration"] },
      { part: "SITEWORKS-SE", role: "siteworks_license", label: "Siteworks SE Starter", category: "software", matchPatterns: ["Siteworks SE"] },
      { part: "TSV-YR-HH-NR", role: "sitevision_license", label: "SiteVision Pro subscription", category: "software", matchPatterns: ["SiteVision Pro"] },
      { part: "IS132309-11", role: "earthworks_license", label: "BX992 / Precise Rover licensing", category: "software", matchPatterns: ["BX992 Earthworks", "Precise Rover", "Option - GLN"] },
      { part: "990100-001", role: "earthworks_license", label: "Earthworks dozer license (training)", category: "software", matchPatterns: ["Earthworks Dozer License", "Software - Earthworks"] }
    ],
  };
})();
