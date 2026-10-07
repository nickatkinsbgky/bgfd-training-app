(function () {
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DOWS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function stationOf(unit) {
    var u = String(unit || "").toUpperCase().trim();
    if (!u) return "No unit";
    if (u.indexOf("BATTALION") !== -1) return "Battalion";
    var m = u.match(/(\d+)/);
    if (!m) return u;
    if (m[1] === "11" || m[1] === "1") return "Station 1";
    return "Station " + m[1];
  }
  function when(created) {
    var c = String(created || "");
    var d = new Date(c.replace(" ", "T"));
    return {
      ok: !isNaN(d.getTime()),
      year: c.slice(0, 4),
      month: c.slice(5, 7),
      hour: d.getHours(),
      dow: d.getDay()
    };
  }
  function bars(pairs, color) {
    var max = pairs.reduce(function (n, p) { return Math.max(n, p[1]); }, 1);
    return "<div class='hbar'>" + pairs.map(function (p) {
      var w = Math.max(4, Math.round((p[1] / max) * 100));
      return "<div class='hbar-row'><span>" + p[0] + "</span><i><b style='width:" + w + "%;background:" + color + "'></b></i><em>" + p[1] + "</em></div>";
    }).join("") + "</div>";
  }
  function paint() {
    var box = document.getElementById("compare");
    if (!box || box.hidden) return;
    var list = (window.getCriticalDb ? window.getCriticalDb().incidents : []) || [];
    var byYearMonth = {}, years = {}, byMonth = {}, byHour = {}, byDow = {}, byShift = {}, byStation = {};
    var blocks = { "Overnight 00-05": 0, "Morning 06-11": 0, "Afternoon 12-17": 0, "Evening 18-23": 0 };
    list.forEach(function (r) {
      var t = when(r.created);
      if (!t.ok) return;
      years[t.year] = true;
      byYearMonth[t.year] = byYearMonth[t.year] || {};
      byYearMonth[t.year][t.month] = (byYearMonth[t.year][t.month] || 0) + 1;
      byMonth[t.month] = (byMonth[t.month] || 0) + 1;
      byHour[t.hour] = (byHour[t.hour] || 0) + 1;
      byDow[t.dow] = (byDow[t.dow] || 0) + 1;
      byShift[r.shift || "?"] = (byShift[r.shift || "?"] || 0) + 1;
      var st = stationOf(r.unit);
      byStation[st] = (byStation[st] || 0) + 1;
      if (t.hour < 6) blocks["Overnight 00-05"]++;
      else if (t.hour < 12) blocks["Morning 06-11"]++;
      else if (t.hour < 18) blocks["Afternoon 12-17"]++;
      else blocks["Evening 18-23"]++;
    });
    var yearList = Object.keys(years).sort();
    var monthRows = MONTHS.map(function (name, i) {
      var key = String(i + 1).padStart(2, "0");
      var cells = yearList.map(function (y) { return (byYearMonth[y] && byYearMonth[y][key]) || 0; });
      return "<tr><td class='left'>" + name + "</td>" + cells.map(function (n) { return "<td>" + n + "</td>"; }).join("") + "<td>" + (byMonth[key] || 0) + "</td></tr>";
    }).join("");
    var monthPairs = MONTHS.map(function (name, i) {
      return [name, byMonth[String(i + 1).padStart(2, "0")] || 0];
    });
    var hourPairs = [];
    for (var h = 0; h < 24; h++) hourPairs.push([String(h).padStart(2, "0") + ":00", byHour[h] || 0]);
    var dowPairs = DOWS.map(function (name, i) { return [name, byDow[i] || 0]; });
    var blockPairs = Object.keys(blocks).map(function (k) { return [k, blocks[k]]; });
    var shiftPairs = Object.keys(byShift).sort().map(function (k) { return ["Shift " + k, byShift[k]]; });
    var stationPairs = Object.keys(byStation).map(function (k) { return [k, byStation[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var peakMonth = monthPairs.slice().sort(function (a, b) { return b[1] - a[1]; })[0];
    var peakHour = hourPairs.slice().sort(function (a, b) { return b[1] - a[1]; })[0];
    var peakBlock = blockPairs.slice().sort(function (a, b) { return b[1] - a[1]; })[0];
    var peakDow = dowPairs.slice().sort(function (a, b) { return b[1] - a[1]; })[0];
    var overlap = yearList.length > 1 ? yearList.map(function (y) {
      var n = 0;
      for (var i = 1; i <= 9; i++) n += (byYearMonth[y] && byYearMonth[y][String(i).padStart(2, "0")]) || 0;
      return y + " Jan-Sep: " + n;
    }).join(" · ") : "";
    box.innerHTML =
      "<section class='chart-card'><h2>What stands out</h2><ul class='findings'>" +
      "<li>" + peakMonth[0] + " is the heaviest month (" + peakMonth[1] + " incidents). February and August are the next busiest.</li>" +
      "<li>Most critical incidents come in during the " + peakBlock[0].toLowerCase() + " window (" + peakBlock[1] + " of " + list.length + "). The single busiest hour is " + peakHour[0] + " (" + peakHour[1] + "). Overnight 00-05 is the quietest block.</li>" +
      "<li>" + peakDow[0] + " is the busiest day of the week (" + peakDow[1] + ").</li>" +
      "<li>B shift has the most flagged incidents, then A, then C. Station 3 and Station 6 lead the first-arriving units.</li>" +
      "<li>Same-month comparison: " + overlap + ". February rose from 2025 to 2026. May stayed high both years. August dropped. 2026 only runs through September in this export, so October-December cannot be compared yet.</li>" +
      "</ul></section>" +
      "<section class='chart-card'><h2>Same month, different years</h2><div class='wrap'><table><thead><tr><th class='left'>Month</th>" + yearList.map(function (y) { return "<th>" + y + "</th>"; }).join("") + "<th>Total</th></tr></thead><tbody>" + monthRows + "</tbody></table></div></section>" +
      "<section class='chart-card'><h2>Incidents by month</h2>" + bars(monthPairs, "#d4a017") + "</section>" +
      "<section class='chart-card'><h2>Time of day</h2>" + bars(blockPairs, "#c62828") + bars(hourPairs, "#e67e22") + "</section>" +
      "<section class='chart-card'><h2>Day of week</h2>" + bars(dowPairs, "#5dade2") + "</section>" +
      "<section class='chart-card'><h2>Shift and station</h2>" + bars(shiftPairs, "#c62828") + bars(stationPairs, "#d4a017") + "</section>";
  }
  window.paintCriticalCompare = paint;
  var btn = document.getElementById("tab-compare");
  if (!btn) return;
  var oldShow = document.getElementById("tab-charts") && document.getElementById("tab-charts").onclick;
  function show(which) {
    document.getElementById("incidents-panel").hidden = which !== "list";
    document.getElementById("averages").hidden = which !== "avg";
    document.getElementById("charts").hidden = which !== "charts";
    document.getElementById("compare").hidden = which !== "compare";
    document.getElementById("tab-list").classList.toggle("red", which === "list");
    document.getElementById("tab-avg").classList.toggle("red", which === "avg");
    document.getElementById("tab-charts").classList.toggle("red", which === "charts");
    document.getElementById("tab-compare").classList.toggle("red", which === "compare");
    if (which === "avg" && window.paintCriticalAverages) window.paintCriticalAverages();
    if (which === "charts" && window.paintCriticalCharts) window.paintCriticalCharts();
    if (which === "compare") paint();
  }
  document.getElementById("tab-list").onclick = function () { show("list"); };
  document.getElementById("tab-avg").onclick = function () { show("avg"); };
  document.getElementById("tab-charts").onclick = function () { show("charts"); };
  btn.onclick = function () { show("compare"); };
})();
