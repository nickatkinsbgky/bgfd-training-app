(function () {
  var CATS = [
    { key: "Airway", need: 4 },
    { key: "Cardiovascular", need: 5 },
    { key: "Trauma", need: 3 },
    { key: "Medical", need: 6 },
    { key: "Operations", need: 2 },
    { key: "PAHT", need: 1 },
    { key: "SVAT", need: 1 },
    { key: "CPR/AED", need: 1 }
  ];
  var KEY = "bgfd-ems-recert-excel-v1";
  var db = { people: [], records: [] };
  function iso(value) {
    if (!value) return "";
    if (value instanceof Date && !isNaN(value)) {
      var m = String(value.getMonth() + 1).padStart(2, "0");
      var d = String(value.getDate()).padStart(2, "0");
      return value.getFullYear() + "-" + m + "-" + d;
    }
    var text = String(value);
    return text.length >= 10 ? text.slice(0, 10) : text;
  }
  function fromWorkbook(buf) {
    var book = XLSX.read(buf, { type: "array", cellDates: true });
    var status = XLSX.utils.sheet_to_json(book.Sheets["Recert Status"], { header: 1, raw: true });
    var detail = XLSX.utils.sheet_to_json(book.Sheets["Training Detail"], { header: 1, raw: true });
    var people = [];
    status.slice(7).forEach(function (row) {
      if (!row || !row[0]) return;
      people.push({ name: String(row[0]), kemsisId: row[1] == null ? "" : String(row[1]).replace(/\.0$/, ""), expDate: iso(row[2]) });
    });
    var map = {
      "KBEMS | Airway | Airway/Respiration/Ventilation": "Airway",
      "KBEMS | Cardiovascular | Cardiovascular": "Cardiovascular",
      "KBEMS | Trauma | Trauma": "Trauma",
      "KBEMS | Medical | Medical": "Medical",
      "KBEMS | Operations | Operations": "Operations",
      "KBEMS | PAHT | PAHT": "PAHT",
      "KBEMS | SVAT | SVAT": "SVAT",
      "KBEMS | CPR/AED | CPR/AED": "CPR/AED"
    };
    var records = [];
    detail.slice(4).forEach(function (row) {
      if (!row || !row[0] || !map[row[12]]) return;
      var credit = row[14];
      if (credit === "" || credit == null) credit = row[11];
      if (credit === "" || credit == null) credit = row[5];
      if (credit === "" || credit == null) return;
      records.push({ name: String(row[0]), date: iso(row[6]), category: map[row[12]], hours: Math.round(Number(credit) * 100) / 100, course: row[3] ? String(row[3]).slice(0, 80) : "" });
    });
    return { people: people, records: records };
  }
  function loadSaved() {
    var raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(db)); }

  function todayIso() {
    var now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  }
  function addYears(iso, years) {
    var parts = String(iso).split("-");
    var year = Number(parts[0]) + years;
    var month = Number(parts[1]);
    var day = Number(parts[2]);
    var dim = new Date(year, month, 0).getDate();
    if (day > dim) day = dim;
    return year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }
  function rollExpiration(person) {
    var exp = person.expDate || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exp)) return false;
    var today = todayIso();
    var changed = false;
    var guard = 0;
    while (exp <= today && guard < 20) {
      exp = addYears(exp, 2);
      changed = true;
      guard += 1;
    }
    if (changed) person.expDate = exp;
    return changed;
  }
  function rollExpirations() {
    var changed = false;
    db.people.forEach(function (person) {
      if (rollExpiration(person)) changed = true;
    });
    if (changed) save();
    return changed;
  }
  function cycle(exp) {
    if (!exp) return null;
    var year = Number(String(exp).slice(0, 4));
    if (!year) return null;
    return { start: (year - 1) + "-01-01", end: year + "-12-31" };
  }
  function hoursFor(name, cat, win) {
    var total = 0;
    db.records.forEach(function (r) {
      if (r.name !== name || r.category !== cat) return;
      if (win && (r.date < win.start || r.date > win.end)) return;
      total += Number(r.hours) || 0;
    });
    return Math.round(total * 100) / 100;
  }
  function statusOf(person) {
    var win = cycle(person.expDate);
    if (!win) return { status: "Set exp date", hours: {}, needs: [], win: null };
    var hours = {};
    var needs = [];
    CATS.forEach(function (c) {
      hours[c.key] = hoursFor(person.name, c.key, win);
      if (hours[c.key] < c.need) needs.push(c.key + " " + (Math.round((c.need - hours[c.key]) * 100) / 100));
    });
    return { status: needs.length ? "Short" : "Met", hours: hours, needs: needs, win: win };
  }
  var selected = null;
  function render() {
    var q = (document.getElementById("q").value || "").toLowerCase();
    var filter = document.getElementById("statusFilter").value;
    var rows = db.people.map(function (p) { return { p: p, s: statusOf(p) }; }).filter(function (row) {
      var blob = (row.p.name + " " + (row.p.kemsisId || "")).toLowerCase();
      if (q && blob.indexOf(q) === -1) return false;
      if (filter && row.s.status !== filter) return false;
      return true;
    });
    var counts = { Met: 0, Short: 0, "Set exp date": 0 };
    db.people.forEach(function (p) { counts[statusOf(p).status] += 1; });
    document.getElementById("stats").innerHTML =
      '<div class="stat ok"><b>' + counts.Met + '</b>Met</div>' +
      '<div class="stat bad"><b>' + counts.Short + '</b>Short</div>' +
      '<div class="stat warn"><b>' + counts["Set exp date"] + '</b>Needs exp date</div>' +
      '<div class="stat"><b>' + db.people.length + '</b>People</div>';
    document.getElementById("head").innerHTML = "<tr><th class='name'>Attendee</th><th>KEMSIS ID</th><th>Exp date</th><th>Cycle</th>" +
      CATS.map(function (c) { return "<th>" + c.key + " (" + c.need + ")</th>"; }).join("") +
      "<th>Status</th><th>Still needed</th><th class='actions'></th></tr>";
    document.getElementById("body").innerHTML = rows.map(function (row) {
      var win = row.s.win ? row.s.win.start.slice(0, 4) + "–" + row.s.win.end.slice(0, 4) : "";
      var cells = CATS.map(function (c) {
        var val = row.s.win ? row.s.hours[c.key] : "";
        var cls = row.s.win ? (val >= c.need ? "hrs met" : "hrs short") : "";
        return "<td class='" + cls + "'>" + val + "</td>";
      }).join("");
      return "<tr data-name=\"" + esc(row.p.name) + "\"><td class='name'>" + esc(row.p.name) + "</td><td>" + esc(row.p.kemsisId || "") + "</td><td>" + esc(row.p.expDate || "") + "</td><td>" + win + "</td>" + cells + "<td>" + row.s.status + "</td><td class='need'>" + esc(row.s.needs.join("; ")) + "</td><td class='actions'><button class='tiny edit' type='button'>Edit</button><button class='tiny del' type='button'>Delete</button></td></tr>";
    }).join("");
    Array.prototype.forEach.call(document.querySelectorAll("#body tr"), function (tr) {
      var name = tr.getAttribute("data-name");
      tr.onclick = function () { openPerson(name); };
      tr.querySelector(".edit").onclick = function (ev) { ev.stopPropagation(); openPerson(name); document.getElementById("editName").focus(); };
      tr.querySelector(".del").onclick = function (ev) { ev.stopPropagation(); removePerson(name); };
    });
  }
  function openPerson(name) {
    selected = db.people.filter(function (p) { return p.name === name; })[0];
    if (!selected) return;
    var s = statusOf(selected);
    document.getElementById("drawer").hidden = false;
    document.getElementById("drawerTitle").textContent = selected.name;
    document.getElementById("editName").value = selected.name;
    document.getElementById("editId").value = selected.kemsisId || "";
    document.getElementById("editExp").value = selected.expDate || "";
    document.getElementById("editCycle").value = s.win ? s.win.start + " to " + s.win.end : "Set an expiration date";
    document.getElementById("editNeeds").textContent = s.needs.length ? "Still needed: " + s.needs.join("; ") : (s.win ? "All required categories are met for this cycle." : "");
    var cat = document.getElementById("newCat");
    cat.innerHTML = CATS.map(function (c) { return "<option>" + c.key + "</option>"; }).join("");
    var mine = db.records.filter(function (r) { return r.name === selected.name; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    document.getElementById("classBody").innerHTML = mine.map(function (r, i) {
      var inCycle = s.win && r.date >= s.win.start && r.date <= s.win.end ? "" : " class='muted'";
      return "<tr" + inCycle + "><td>" + esc(r.date) + "</td><td>" + esc(r.category) + "</td><td>" + esc(r.standard || r.category) + "</td><td>" + r.hours + "</td><td>" + esc(r.course || "") + "</td><td><button data-i='" + i + "' type='button'>Remove</button></td></tr>";
    }).join("");
    Array.prototype.forEach.call(document.querySelectorAll("#classBody button"), function (btn) {
      btn.onclick = function (ev) {
        ev.stopPropagation();
        var idx = Number(btn.getAttribute("data-i"));
        var target = mine[idx];
        db.records = db.records.filter(function (r) { return r !== target; });
        save(); render(); openPerson(selected.name);
      };
    });
  }
  document.getElementById("q").oninput = render;
  document.getElementById("statusFilter").onchange = render;
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function removePerson(name) {
    var person = db.people.filter(function (p) { return p.name === name; })[0];
    if (!person) return;
    var classes = db.records.filter(function (r) { return r.name === name; }).length;
    var msg = "Delete " + name + "?";
    if (classes) msg += " This also removes " + classes + " class record" + (classes === 1 ? "" : "s") + ".";
    if (!confirm(msg)) return;
    db.people = db.people.filter(function (p) { return p.name !== name; });
    db.records = db.records.filter(function (r) { return r.name !== name; });
    if (selected && selected.name === name) {
      selected = null;
      document.getElementById("drawer").hidden = true;
    }
    save();
    render();
  }
  document.getElementById("savePerson").onclick = function () {
    if (!selected) return;
    var nextName = document.getElementById("editName").value.trim();
    if (!nextName) { alert("Name is required."); return; }
    var taken = db.people.some(function (p) { return p !== selected && p.name === nextName; });
    if (taken) { alert("That name is already on the roster."); return; }
    var previous = selected.name;
    selected.name = nextName;
    selected.kemsisId = document.getElementById("editId").value.trim();
    selected.expDate = document.getElementById("editExp").value;
    rollExpiration(selected);
    document.getElementById("editExp").value = selected.expDate || "";
    if (previous !== nextName) {
      db.records.forEach(function (r) { if (r.name === previous) r.name = nextName; });
      db.people.sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    save(); render(); openPerson(selected.name);
  };
  document.getElementById("deletePerson").onclick = function () {
    if (!selected) return;
    removePerson(selected.name);
  };
  document.getElementById("addClass").onclick = function () {
    if (!selected) return;
    var date = document.getElementById("newDate").value;
    var hours = Number(document.getElementById("newHours").value);
    if (!date || !hours) { alert("Date and hours are required."); return; }
    var cat = document.getElementById("newCat").value; db.records.push({ name: selected.name, date: date, category: cat, standard: "KBEMS | " + cat + " | " + cat, hours: hours, course: document.getElementById("newCourse").value.trim() });
    save(); render(); openPerson(selected.name);
  };
  document.getElementById("addPerson").onclick = function () {
    var name = prompt("Attendee name, Last, First");
    if (!name) return;
    db.people.push({ name: name.trim(), kemsisId: "", expDate: "" });
    db.people.sort(function (a, b) { return a.name.localeCompare(b.name); });
    save(); render(); openPerson(name.trim());
  };
  document.getElementById("exportBtn").onclick = function () {
    var blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ems-recertification-tracker.json";
    a.click();
  };
  document.getElementById("importBtn").onclick = function () { document.getElementById("importFile").click(); };
  document.getElementById("importFile").onchange = function (ev) {
    var file = ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      db = JSON.parse(reader.result);
      save(); render();
    };
    reader.readAsText(file);
  };
  document.getElementById("resetBtn").onclick = function () {
    if (!confirm("Reload personnel and classes from KBEMS_EMT_Recert_Tracker.xlsx?")) return;
    localStorage.removeItem(KEY);
    location.reload();
  };
  function fillLanding() {
    var q = (document.getElementById("landSearch").value || "").toLowerCase();
    var select = document.getElementById("landSelect");
    var people = db.people.filter(function (p) {
      return (p.name + " " + (p.kemsisId || "")).toLowerCase().indexOf(q) !== -1;
    });
    select.innerHTML = people.map(function (p) {
      var label = p.name + (p.kemsisId ? " — " + p.kemsisId : "");
      return "<option value=\"" + esc(p.name) + "\">" + esc(label) + "</option>";
    }).join("");
    if (people.length) select.selectedIndex = 0;
  }

  function showSummary(name) {
    selected = db.people.filter(function (p) { return p.name === name; })[0];
    if (!selected) return;
    var s = statusOf(selected);
    document.getElementById("landing").hidden = true;
    document.getElementById("app").hidden = true;
    document.getElementById("deptView").hidden = true;
    document.getElementById("focusView").hidden = true;
    document.getElementById("personView").hidden = false;
    document.getElementById("sumName").textContent = selected.name;
    var cycle = s.win ? s.win.start + " through " + s.win.end : "Set an expiration date to start the cycle";
    document.getElementById("sumMeta").textContent = "KEMSIS " + (selected.kemsisId || "—") + " · Exp " + (selected.expDate || "not set") + " · " + cycle;
    document.getElementById("sumStatus").textContent = s.status === "Met" ? "Met for this cycle." : (s.needs.length ? "Still needed: " + s.needs.join("; ") : s.status);
    function tone(earned, need) {
      if (earned > need) return "over";
      if (earned === need) return "met";
      return "short";
    }
    document.getElementById("sumCats").innerHTML = CATS.map(function (c) {
      var earned = s.win ? s.hours[c.key] : 0;
      var cls = s.win ? tone(earned, c.need) : "";
      return "<div class='" + cls + "'><span>" + c.key + "</span><b>" + earned + "</b><span>of " + c.need + "</span></div>";
    }).join("");
    var classes = [];
    if (s.win) {
      classes = db.records.filter(function (r) {
        return r.name === selected.name && r.date >= s.win.start && r.date <= s.win.end;
      }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    }
    document.getElementById("sumClasses").innerHTML = classes.length ? classes.map(function (r) {
      var req = CATS.filter(function (c) { return c.key === r.category; })[0];
      var earned = req && s.hours ? s.hours[req.key] : 0;
      var cls = req ? tone(earned, req.need) : "";
      return "<tr class='" + cls + "'><td>" + esc(r.date) + "</td><td class='cat'>" + esc(r.category) + "</td><td>" + esc(r.standard || r.category) + "</td><td>" + r.hours + "</td><td>" + esc(r.course || "") + "</td></tr>";
    }).join("") : "<tr><td colspan='5'>No classes in this cycle.</td></tr>";
  }
  function openFromLanding() {
    var name = document.getElementById("landSelect").value;
    if (!name) { alert("Select a person."); return; }
    showSummary(name);
  }
  document.getElementById("landSearch").oninput = fillLanding;
  document.getElementById("landSelect").ondblclick = openFromLanding;
  document.getElementById("landOpen").onclick = openFromLanding;
  document.getElementById("landRoster").onclick = function () {
    document.getElementById("landing").hidden = true;
    document.getElementById("deptView").hidden = true;
    document.getElementById("focusView").hidden = true;
    document.getElementById("app").hidden = false;
    render();
  };
  document.getElementById("sumEdit").onclick = function () {
    if (!selected) return;
    document.getElementById("personView").hidden = true;
    document.getElementById("deptView").hidden = true;
    document.getElementById("focusView").hidden = true;
    document.getElementById("app").hidden = false;
    render();
    openPerson(selected.name);
    document.getElementById("drawer").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  document.getElementById("sumRoster").onclick = function () {
    document.getElementById("personView").hidden = true;
    document.getElementById("deptView").hidden = true;
    document.getElementById("focusView").hidden = true;
    document.getElementById("app").hidden = false;
    render();
  };

  function expYear(person) {
    var year = Number(String(person.expDate || "").slice(0, 4));
    return year >= 2000 && year <= 2100 ? year : 0;
  }
  function dueInYear(year) {
    return db.people.filter(function (p) { return expYear(p) === Number(year); });
  }
  function cycleYears() {
    var set = {};
    db.people.forEach(function (p) {
      var year = expYear(p);
      if (year) set[year] = true;
    });
    return Object.keys(set).map(Number).sort();
  }
  function pct(part, whole) {
    if (!whole) return 0;
    return Math.round((1000 * part) / whole) / 10;
  }
  function showDept() {
    document.getElementById("landing").hidden = true;
    document.getElementById("app").hidden = true;
    document.getElementById("personView").hidden = true;
    document.getElementById("focusView").hidden = true;
    document.getElementById("deptView").hidden = false;
    var select = document.getElementById("deptYear");
    var years = cycleYears();
    var current = new Date().getFullYear();
    var keep = Number(select.value) || (years.indexOf(current) >= 0 ? current : (years[0] || current));
    select.innerHTML = years.length ? years.map(function (year) {
      return "<option value=\"" + year + "\">" + year + "</option>";
    }).join("") : "<option value=\"" + current + "\">" + current + "</option>";
    if (years.indexOf(keep) >= 0) select.value = String(keep);
    renderDept();
  }
  function renderDept() {
    var year = Number(document.getElementById("deptYear").value);
    var people = dueInYear(year);
    var win = year ? { start: (year - 1) + "-01-01", end: year + "-12-31" } : null;
    document.getElementById("deptWindow").textContent = win
      ? "Only personnel expiring in " + year + " are included. Hours count from " + win.start + " through " + win.end + ". A category counts as met when earned hours reach the required hours."
      : "No expiration years are on the roster.";
    var rows = people.map(function (p) {
      var s = statusOf(p);
      var met = CATS.filter(function (c) { return s.hours[c.key] >= c.need; }).length;
      return { p: p, s: s, met: met, pct: pct(met, CATS.length) };
    }).sort(function (a, b) {
      if (a.pct !== b.pct) return a.pct - b.pct;
      return a.p.name.localeCompare(b.p.name);
    });
    var avg = rows.length ? Math.round(rows.reduce(function (sum, row) { return sum + row.pct; }, 0) / rows.length * 10) / 10 : 0;
    var fully = rows.filter(function (row) { return row.met === CATS.length; }).length;
    document.getElementById("deptStats").innerHTML =
      "<div class=\"stat\"><b>" + people.length + "</b>Due in " + year + "</div>" +
      "<div class=\"stat " + (avg >= 100 ? "ok" : "warn") + "\"><b>" + avg + "%</b>Avg % of categories met</div>" +
      "<div class=\"stat ok\"><b>" + fully + "</b>All categories met</div>" +
      "<div class=\"stat bad\"><b>" + (people.length - fully) + "</b>Still short</div>";
    document.getElementById("deptCats").innerHTML = CATS.map(function (c) {
      var metCount = rows.filter(function (row) { return row.s.hours[c.key] >= c.need; }).length;
      var hourPct = rows.length ? rows.reduce(function (sum, row) {
        return sum + Math.min(row.s.hours[c.key] / c.need, 1);
      }, 0) / rows.length * 100 : 0;
      hourPct = Math.round(hourPct * 10) / 10;
      var metPct = pct(metCount, rows.length);
      var tone = metPct >= 100 ? "met" : "short";
      return "<tr><td class='left'>" + esc(c.key) + "</td><td>" + c.need + "</td><td>" + metCount + " / " + rows.length +
        "</td><td>" + metPct + "%</td><td>" + hourPct + "%</td><td><span class='meter " + tone + "'><span style='width:" +
        Math.max(0, Math.min(100, metPct)) + "%'></span></span></td></tr>";
    }).join("");
    document.getElementById("deptPeople").innerHTML = rows.length ? rows.map(function (row) {
      var tone = row.pct >= 100 ? "met" : "short";
      return "<tr class='clickable " + tone + "' data-name=\"" + esc(row.p.name) + "\"><td class='left name'>" + esc(row.p.name) +
        "</td><td>" + esc(row.p.kemsisId || "") + "</td><td>" + esc(row.p.expDate || "") + "</td><td>" + row.met + " / " + CATS.length +
        "</td><td>" + row.pct + "%</td><td class='need'>" + esc(row.s.needs.join("; ")) + "</td></tr>";
    }).join("") : "<tr><td colspan='6'>No personnel need to recertify in " + year + ".</td></tr>";
    Array.prototype.forEach.call(document.querySelectorAll("#deptPeople tr[data-name]"), function (tr) {
      tr.onclick = function () { showSummary(tr.getAttribute("data-name")); };
    });
  }

  var STANDARDS = {
    Airway: "KBEMS | Airway | Airway/Respiration/Ventilation",
    Cardiovascular: "KBEMS | Cardiovascular | Cardiovascular",
    Trauma: "KBEMS | Trauma | Trauma",
    Medical: "KBEMS | Medical | Medical",
    Operations: "KBEMS | Operations | Operations",
    PAHT: "KBEMS | PAHT | PAHT",
    SVAT: "KBEMS | SVAT | SVAT",
    "CPR/AED": "KBEMS | CPR/AED | CPR/AED"
  };
  function parseIso(value) {
    var parts = String(value || "").split("-");
    if (parts.length < 3 || !parts[0]) return null;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  function todayDate() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  function paceOf(earned, need, exp) {
    var year = Number(String(exp).slice(0, 4));
    var start = parseIso((year - 1) + "-01-01");
    var end = parseIso(exp);
    var today = todayDate();
    var total = Math.max(1, Math.round((end - start) / 86400000));
    var elapsed = Math.max(0, Math.min(total, Math.round((today - start) / 86400000)));
    var fraction = elapsed / total;
    var expected = Math.round(need * fraction * 100) / 100;
    var tolerance = Math.max(0.25, need * 0.1);
    var bucket = "short";
    if (earned + 0.001 >= need) bucket = "ahead";
    else if (earned + tolerance >= expected) bucket = "ontrack";
    var daysLeft = Math.max(0, Math.round((end - today) / 86400000));
    return { bucket: bucket, fraction: fraction, expected: expected, daysLeft: daysLeft, elapsed: elapsed, total: total };
  }
  function showFocus() {
    document.getElementById("landing").hidden = true;
    document.getElementById("app").hidden = true;
    document.getElementById("personView").hidden = true;
    document.getElementById("deptView").hidden = true;
    document.getElementById("focusView").hidden = false;
    var select = document.getElementById("focusYear");
    var years = cycleYears();
    var current = new Date().getFullYear();
    var keep = Number(select.value) || (years.indexOf(current) >= 0 ? current : (years[0] || current));
    select.innerHTML = years.length ? years.map(function (year) {
      return "<option value=\"" + year + "\">" + year + "</option>";
    }).join("") : "<option value=\"" + current + "\">" + current + "</option>";
    if (years.indexOf(keep) >= 0) select.value = String(keep);
    renderFocus();
  }
  function renderFocus() {
    var year = Number(document.getElementById("focusYear").value) || new Date().getFullYear();
    var people = dueInYear(year);
    var today = todayDate();
    var elapsedPct = 0;
    var daysLeft = 0;
    if (people.length) {
      var sample = paceOf(0, 1, people[0].expDate);
      elapsedPct = Math.round(sample.fraction * 1000) / 10;
      daysLeft = sample.daysLeft;
    }
    document.getElementById("focusWindow").textContent = people.length
      ? "Cycle " + (year - 1) + "-01-01 through each " + year + " expiration. As of " + todayIso() + ", " + elapsedPct + "% of the cycle is elapsed and " + daysLeft + " days remain for a " + year + "-12-31 expiration."
      : "No personnel have a " + year + " expiration.";
    var rows = CATS.map(function (c) {
      var counts = { short: 0, ontrack: 0, ahead: 0 };
      var gap = 0;
      var behind = [];
      people.forEach(function (p) {
        var earned = hoursFor(p.name, c.key, cycle(p.expDate));
        var pace = paceOf(earned, c.need, p.expDate);
        counts[pace.bucket] += 1;
        if (pace.bucket === "short") {
          gap += Math.max(0, c.need - earned);
          behind.push({ p: p, earned: earned, pace: pace, need: c.need });
        }
      });
      behind.sort(function (a, b) { return (a.earned - b.earned) || a.p.name.localeCompare(b.p.name); });
      return { c: c, counts: counts, gap: Math.round(gap * 10) / 10, behind: behind };
    }).sort(function (a, b) { return b.counts.short - a.counts.short || b.gap - a.gap; });
    var shortPeople = people.filter(function (p) {
      return CATS.some(function (c) {
        var earned = hoursFor(p.name, c.key, cycle(p.expDate));
        return paceOf(earned, c.need, p.expDate).bucket === "short";
      });
    }).length;
    var metPeople = people.filter(function (p) {
      return CATS.every(function (c) {
        return hoursFor(p.name, c.key, cycle(p.expDate)) + 0.001 >= c.need;
      });
    }).length;
    document.getElementById("focusStats").innerHTML =
      '<div class="stat"><b>' + people.length + '</b>In this cycle</div>' +
      '<div class="stat bad"><b>' + shortPeople + '</b>Short in a category</div>' +
      '<div class="stat ok"><b>' + metPeople + '</b>All categories met</div>' +
      '<div class="stat warn"><b>' + daysLeft + '</b>Days left</div>';
    var top = rows.filter(function (row) { return row.counts.short; }).slice(0, 3);
    document.getElementById("focusCallout").innerHTML = top.length
      ? "<strong>Focus these standards first.</strong> " + top.map(function (row) {
          return row.c.key + " (" + row.counts.short + " of " + people.length + " behind, " + row.gap + " hours still needed)";
        }).join("; ") + ". Trauma and other categories with few people behind can stay on the regular schedule."
      : "Nobody in this cycle is behind the prorated pace.";
    document.getElementById("focusCards").innerHTML = rows.map(function (row) {
      var tone = row.counts.short >= people.length / 2 ? "short" : (row.counts.ahead >= row.counts.short ? "ahead" : "ontrack");
      return '<article class="focus-card ' + tone + '"><h3>' + esc(row.c.key) + '</h3><div class="std">' + esc(STANDARDS[row.c.key] || row.c.key) + '</div><div class="pace"><span class="short"><b>' + row.counts.short + '</b>Falling short</span><span class="ontrack"><b>' + row.counts.ontrack + '</b>On track</span><span class="ahead"><b>' + row.counts.ahead + '</b>Ahead / met</span></div><p class="muted" style="margin:8px 0 0">Required ' + row.c.need + ' · ' + row.gap + ' hours still short of the requirement</p></article>';
    }).join("");
    var catSelect = document.getElementById("focusCat");
    var keepCat = catSelect.value || (rows[0] ? rows[0].c.key : "");
    catSelect.innerHTML = rows.map(function (row) {
      return '<option value="' + esc(row.c.key) + '">' + esc(row.c.key) + ' — ' + row.counts.short + ' behind</option>';
    }).join("");
    if (keepCat) catSelect.value = keepCat;
    var chosen = rows.filter(function (row) { return row.c.key === catSelect.value; })[0] || rows[0];
    document.getElementById("focusPeople").innerHTML = chosen && chosen.behind.length ? chosen.behind.map(function (row) {
      var still = Math.round((row.need - row.earned) * 100) / 100;
      return '<tr class="clickable short" data-name="' + esc(row.p.name) + '"><td class="left name">' + esc(row.p.name) + '</td><td>' + esc(row.p.expDate || "") + '</td><td>' + row.earned + '</td><td>' + row.pace.expected + '</td><td>' + row.need + '</td><td>' + still + '</td><td>' + row.pace.daysLeft + '</td></tr>';
    }).join("") : '<tr><td colspan="7">No one is behind pace in this category.</td></tr>';
    Array.prototype.forEach.call(document.querySelectorAll("#focusPeople tr[data-name]"), function (tr) {
      tr.onclick = function () { showSummary(tr.getAttribute("data-name")); };
    });
  }
  document.getElementById("focusYear").onchange = renderFocus;
  document.getElementById("focusCat").onchange = renderFocus;
  document.getElementById("landFocus").onclick = showFocus;
  document.getElementById("sumFocus").onclick = showFocus;
  document.getElementById("rosterFocus").onclick = showFocus;

  document.getElementById("deptYear").onchange = renderDept;
  document.getElementById("landDept").onclick = showDept;
  document.getElementById("rosterDept").onclick = showDept;
  document.getElementById("sumDept").onclick = showDept;

  document.getElementById("backLanding").onclick = function (ev) {
    ev.preventDefault();
    document.getElementById("app").hidden = true;
    document.getElementById("personView").hidden = true;
    document.getElementById("deptView").hidden = true;
    document.getElementById("focusView").hidden = true;
    document.getElementById("landing").hidden = false;
    document.getElementById("landSearch").value = "";
    fillLanding();
    document.getElementById("landSearch").focus();
  };
  var source = document.getElementById("landSource");
  var saved = loadSaved();
  var seed = window.EMS_RECERT_SEED || { people: [], records: [] };
  if (saved && saved.people && saved.people.length) {
    db = saved;
    if (source) source.textContent = "Showing saved edits from this browser. Reload seed uses the uploaded workbook.";
  } else {
    db = seed;
    if (source) source.textContent = "Loaded " + db.people.length + " people and " + db.records.length + " classes from KBEMS_EMT_Recert_Tracker.xlsx";
  }

  window.getEmsDb = function () { return db; };
  window.saveEms = function () { save(); return db; };
  window.setEmsDb = function (next) {
    db = next && next.people ? next : { people: [], records: [] };
    if (!db.records) db.records = [];
    save();
    rollExpirations();
    fillLanding();
    render();
    if (selected) selected = db.people.filter(function (p) { return p.name === selected.name; })[0] || null;
    var personView = document.getElementById("personView");
    var deptView = document.getElementById("deptView");
    if (personView && !personView.hidden && selected) showSummary(selected.name);
    if (deptView && !deptView.hidden) renderDept();
    var focusView = document.getElementById("focusView");
    if (focusView && !focusView.hidden) renderFocus();
  };

  rollExpirations();
  fillLanding();
  render();
})();
