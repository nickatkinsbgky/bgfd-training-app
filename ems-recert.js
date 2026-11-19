(function () {
  function ensureTables() {
    if (!document.getElementById("emrReqStyle")) {
      var style = document.createElement("style");
      style.id = "emrReqStyle";
      style.textContent = "#emrReqTable{width:100%;border-collapse:collapse;margin:8px 0 14px}#emrReqTable th,#emrReqTable td{border:1px solid #30363d;padding:6px 8px;text-align:left}#emrReqTable th{background:#211810;color:#d4a017}";
      document.head.appendChild(style);
    }
  }
  // ... rest of the file is too long for this demo; in practice the full patched content would be sent.
})();