(function () {
  var KEY = "bgfd-ems-recert-excel-v1";
  var db = { people: [], records: [] };

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }

  function fillLanding() {
    var sel = document.getElementById("landSelect");
    var q = ((document.getElementById("landSearch") || {}).value || "").toLowerCase();
    if (!sel) return;
    var names = (db.people || []).filter(function (p) {
      var blob = ((p.name || "") + " " + (p.kemsisId || "")).toLowerCase();
      return !q || blob.indexOf(q) >= 0;
    });
    sel.innerHTML = names.map(function (p) {
      return "<option>" + String(p.name || "") + "</option>";
    }).join("");
  }

  function init() {
    var source = document.getElementById("landSource");
    var saved = loadSaved();
    var seed = window.EMS_RECERT_SEED || { people: [], records: [] };
    if (seed.people) {
      seed.people = seed.people.filter(function (p) {
        return p && p.name && String(p.name).charAt(0) !== "=";
      });
    }
    if (saved && saved.people && saved.people.length) {
      db = saved;
      if (source) source.textContent = "Showing saved edits from this browser.";
    } else {
      db = seed;
      if (source) source.textContent = "Loaded " + (db.people || []).length + " people and " + (db.records || []).length + " classes from the recertification workbook.";
    }
    fillLanding();
    var search = document.getElementById("landSearch");
    if (search) search.oninput = fillLanding;
  }

  document.addEventListener("DOMContentLoaded", function () {
    init();
    var land = document.getElementById("landRoster");
    if (land) {
      land.onclick = function () {
        window.open(location.pathname + "?roster=1", "_blank", "noopener");
      };
    }
  });

  if (document.readyState !== "loading") init();
})();
