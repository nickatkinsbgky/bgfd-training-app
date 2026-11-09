(function () {
  function ensureTables() {
    if (!document.getElementById("emrReqStyle")) {
      var style = document.createElement("style");
      style.id = "emrReqStyle";
      style.textContent = ".req-wrap{margin:0 0 14px}.req-wrap table{min-width:0;width:min(720px,100%)}.req-wrap h3{margin:0 0 4px}#personReq[hidden]{display:none}.req-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}";
      document.head.appendChild(style);
    }
  }
  ensureTables();
  // Full file restore in progress - please use the complete local version
})();
