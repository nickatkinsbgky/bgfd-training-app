(function () {
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function stationOf(unit) {
    var u = String(unit || "").toUpperCase().trim();
    if (!u) return "No unit";
    if (u.indexOf("BATTALION") !== -1) return "Battalion";
    var m = u.match(/(\d+)/);
    if (!m) return u;
    if (m[1] === "11" || m[1] === "1") return "Station 1";
    return "Station " + m[1];
  }
  function monthKey(created) {
    var d = String(created || "").slice(0, 7);
    return /^\d{4}-\d{2}$/.test(d) ? d : "Unknown";
  }
  function monthLabel(key) {
    if (key === "Unknown") return key;
    var parts = key.split("-");
    return MONTHS[Number(parts[1]) - 1] + " " + parts[0];
  }
  function avg(count, months) { return months ? (count / months) : 0; }
  function fmt(n) { return (Math.round(n * 10) / 10).toFixed(1); }
  function rows(pairs, months) {
    return pairs.map(function (p) {
      return "<tr><td class='left'>" + p[0] + "</td><td>" + p[1] + "</td><td>" + fmt(avg(p[1], months)) + "</td></tr>";
    }).join("");
  }
  function paint() {
    var box = document.getElementById("averages");
    if (!box || box.hidden) return;
    var db = window.getCriticalDb ? window.getCriticalDb() : { incidents: [] };
    var list = db.incidents || [];
    var monthMap = {};
    var shiftMap = { A: 0, B: 0, C: 0 };
    var stationMap = {};
    var officerMap = {};
    list.forEach(function (r) {
      var mk = monthKey(r.created);
      monthMap[mk] = (monthMap[mk] || 0) + 1;
      var sh = r.shift || "?";
      shiftMap[sh] = (shiftMap[sh] || 0) + 1;
      var st = stationOf(r.unit);
      stationMap[st] = (stationMap[st] || 0) + 1;
      var name = (r.officer || "Unknown").trim() || "Unknown";
      officerMap[name] = (officerMap[name] || 0) + 1;
    });
    var monthKeys = Object.keys(monthMap).filter(function (k) { return k !== "Unknown"; }).sort();
    var months = monthKeys.length || 1;
    var shiftPairs = Object.keys(shiftMap).sort().map(function (k) { return ["Shift " + k, shiftMap[k]]; });
    var stationPairs = Object.keys(stationMap).map(function (k) { return [k, stationMap[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var monthPairs = monthKeys.map(function (k) { return [monthLabel(k), monthMap[k]]; });
    var officers = Object.keys(officerMap).map(function (k) { return [k, officerMap[k]]; }).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); });
    var overall = list.length / months;
    box.innerHTML =
      "<p class='meta'>Averages use the " + months + " months in this list (" + (monthKeys[0] ? monthLabel(monthKeys[0]) : "") + (monthKeys.length > 1 ? " through " + monthLabel(monthKeys[monthKeys.length - 1]) : "") + "). Station comes from the first-arriving unit. Ranking is the officer in charge, because this export does not list every firefighter on the call.</p>" +
      "<div class='stats'><div class='stat'><b>" + fmt(overall) + "</b><span>Avg incidents / month</span></div><div class='stat'><b>" + list.length + "</b><span>Incidents</span></div></div>" +
      "<h2>Average incidents by shift</h2><div class='wrap'><table><thead><tr><th class='left'>Shift</th><th>Incidents</th><th>Per month</th></tr></thead><tbody>" + rows(shiftPairs, months) + "</tbody></table></div>" +
      "<h2>Average incidents by station</h2><div class='wrap'><table><thead><tr><th class='left'>Station</th><th>Incidents</th><th>Per month</th></tr></thead><tbody>" + rows(stationPairs, months) + "</tbody></table></div>" +
      "<h2>Average incidents by month</h2><div class='wrap'><table><thead><tr><th class='left'>Month</th><th>Incidents</th><th>Vs monthly average</th></tr></thead><tbody>" + monthPairs.map(function (p) { return "<tr><td class='left'>" + p[0] + "</td><td>" + p[1] + "</td><td>" + fmt(p[1] - overall) + "</td></tr>"; }).join("") + "</tbody></table></div>" +
      "<h2>Personnel ranked by critical incidents</h2><div class='wrap'><table><thead><tr><th>Rank</th><th class='left'>Officer in charge</th><th>Incidents</th></tr></thead><tbody>" + officers.map(function (p, i) { return "<tr><td>" + (i + 1) + "</td><td class='left'>" + p[0] + "</td><td>" + p[1] + "</td></tr>"; }).join("") + "</tbody></table></div>";
  }
  window.paintCriticalAverages = paint;
  document.getElementById("tab-avg").onclick = function () {
    document.getElementById("incidents-panel").hidden = true;
    document.getElementById("averages").hidden = false;
    document.getElementById("tab-list").classList.remove("red");
    document.getElementById("tab-avg").classList.add("red");
    paint();
  };
  document.getElementById("tab-list").onclick = function () {
    document.getElementById("incidents-panel").hidden = false;
    document.getElementById("averages").hidden = true;
    document.getElementById("tab-avg").classList.remove("red");
    document.getElementById("tab-list").classList.add("red");
  };
})();
