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
    return MONTHS[Number(parts[1]) - 1] + " " + parts[0].slice(2);
  }
  function fmt(n) { return (Math.round(n * 10) / 10).toFixed(1); }
  function summary() {
    var db = window.getCriticalDb ? window.getCriticalDb() : { incidents: [] };
    var list = db.incidents || [];
    var monthMap = {}, shiftMap = { A: 0, B: 0, C: 0 }, stationMap = {}, officerMap = {};
    list.forEach(function (r) {
      var mk = monthKey(r.created);
      monthMap[mk] = (monthMap[mk] || 0) + 1;
      shiftMap[r.shift || "?"] = (shiftMap[r.shift || "?"] || 0) + 1;
      var st = stationOf(r.unit);
      stationMap[st] = (stationMap[st] || 0) + 1;
      var name = (r.officer || "Unknown").trim() || "Unknown";
      officerMap[name] = (officerMap[name] || 0) + 1;
    });
    var monthKeys = Object.keys(monthMap).filter(function (k) { return k !== "Unknown"; }).sort();
    var months = monthKeys.length || 1;
    return {
      total: list.length,
      months: months,
      overall: list.length / months,
      shifts: Object.keys(shiftMap).sort().map(function (k) { return ["Shift " + k, shiftMap[k]]; }),
      stations: Object.keys(stationMap).map(function (k) { return [k, stationMap[k]]; }).sort(function (a, b) { return b[1] - a[1]; }),
      monthPairs: monthKeys.map(function (k) { return [monthLabel(k), monthMap[k]]; }),
      officers: Object.keys(officerMap).map(function (k) { return [k, officerMap[k]]; }).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); }).slice(0, 10)
    };
  }
  function bars(pairs, color) {
    var max = pairs.reduce(function (n, p) { return Math.max(n, p[1]); }, 1);
    return "<div class='hbar'>" + pairs.map(function (p) {
      var w = Math.max(4, Math.round(p[1] / max * 100));
      return "<div class='hbar-row'><span>" + p[0] + "</span><i><b style='width:" + w + "%;background:" + color + "'></b></i><em>" + p[1] + "</em></div>";
    }).join("") + "</div>";
  }
  function line(pairs, average) {
    if (!pairs.length) return "<p class='empty'>No monthly data.</p>";
    var max = pairs.reduce(function (n, p) { return Math.max(n, p[1], average); }, 1);
    var w = 640, h = 220, pad = 28;
    var step = pairs.length === 1 ? 0 : (w - pad * 2) / (pairs.length - 1);
    var pts = pairs.map(function (p, i) {
      var x = pad + step * i;
      var y = h - pad - (p[1] / max) * (h - pad * 2);
      return [x, y, p];
    });
    var avgY = h - pad - (average / max) * (h - pad * 2);
    var poly = pts.map(function (p) { return p[0] + "," + p[1]; }).join(" ");
    var dots = pts.map(function (p) {
      return "<circle cx='" + p[0] + "' cy='" + p[1] + "' r='4' fill='#d4a017'></circle><text x='" + p[0] + "' y='" + (p[1] - 8) + "' text-anchor='middle' fill='#e6edf3' font-size='12'>" + p[2][1] + "</text><text x='" + p[0] + "' y='" + (h - 6) + "' text-anchor='middle' fill='#8b949e' font-size='11'>" + p[2][0] + "</text>";
    }).join("");
    return "<svg viewBox='0 0 " + w + " " + h + "' class='linechart' role='img'><line x1='" + pad + "' y1='" + avgY + "' x2='" + (w - pad) + "' y2='" + avgY + "' stroke='#7dcea0' stroke-dasharray='4 4'></line><polyline fill='none' stroke='#d4a017' stroke-width='3' points='" + poly + "'></polyline>" + dots + "</svg><p class='meta'>Green dashed line is the monthly average (" + fmt(average) + ").</p>";
  }
  function paint() {
    var box = document.getElementById("charts");
    if (!box || box.hidden) return;
    var s = summary();
    box.innerHTML =
      "<div class='stats'><div class='stat'><b>" + s.total + "</b><span>Incidents</span></div><div class='stat'><b>" + fmt(s.overall) + "</b><span>Avg / month</span></div></div>" +
      "<section class='chart-card'><h2>Incidents by shift</h2>" + bars(s.shifts, "#c62828") + "</section>" +
      "<section class='chart-card'><h2>Incidents by station</h2>" + bars(s.stations, "#d4a017") + "</section>" +
      "<section class='chart-card'><h2>Incidents by month</h2>" + line(s.monthPairs, s.overall) + "</section>" +
      "<section class='chart-card'><h2>Officers in charge, most to least</h2>" + bars(s.officers, "#5dade2") + "<p class='meta'>Top 10. This export names the officer in charge, not every firefighter on the call.</p></section>";
  }
  function show(which) {
    document.getElementById("incidents-panel").hidden = which !== "list";
    document.getElementById("averages").hidden = which !== "avg";
    document.getElementById("charts").hidden = which !== "charts";
    document.getElementById("tab-list").classList.toggle("red", which === "list");
    document.getElementById("tab-avg").classList.toggle("red", which === "avg");
    document.getElementById("tab-charts").classList.toggle("red", which === "charts");
    if (which === "avg" && window.paintCriticalAverages) window.paintCriticalAverages();
    if (which === "charts") paint();
  }
  window.paintCriticalCharts = paint;
  var chartsBtn = document.getElementById("tab-charts");
  if (chartsBtn) chartsBtn.onclick = function () { show("charts"); };
  var avgBtn = document.getElementById("tab-avg");
  if (avgBtn) avgBtn.onclick = function () { show("avg"); };
  var listBtn = document.getElementById("tab-list");
  if (listBtn) listBtn.onclick = function () { show("list"); };
})();
