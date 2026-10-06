(function () {
  var KEY = "bgfd-ems-recert-v1";
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
  function load() {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return JSON.parse(JSON.stringify(window.EMS_RECERT_SEED || { people: [], records: [] }));
  }
  var db = load();
  function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
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
      return "<tr" + inCycle + "><td>" + r.date + "</td><td>" + r.category + "</td><td>" + r.hours + "</td><td>" + (r.course || "") + "</td><td><button data-i='" + i + "' type='button'>Remove</button></td></tr>";
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
    return String(value == null ? "" : value).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """);
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
    db.records.push({ name: selected.name, date: date, category: document.getElementById("newCat").value, hours: hours, course: document.getElementById("newCourse").value.trim() });
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
    if (!confirm("Replace saved tracker data on this browser with the seed file?")) return;
    localStorage.removeItem(KEY);
    db = load();
    save();
    render();
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
      return "<tr class='" + cls + "'><td>" + esc(r.date) + "</td><td class='cat'>" + esc(r.category) + "</td><td>" + r.hours + "</td><td>" + esc(r.course || "") + "</td></tr>";
    }).join("") : "<tr><td colspan='4'>No classes in this cycle.</td></tr>";
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
    document.getElementById("app").hidden = false;
    render();
  };
  document.getElementById("sumEdit").onclick = function () {
    if (!selected) return;
    document.getElementById("personView").hidden = true;
    document.getElementById("app").hidden = false;
    render();
    openPerson(selected.name);
    document.getElementById("drawer").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  document.getElementById("sumRoster").onclick = function () {
    document.getElementById("personView").hidden = true;
    document.getElementById("app").hidden = false;
    render();
  };
  document.getElementById("backLanding").onclick = function (ev) {
    ev.preventDefault();
    document.getElementById("app").hidden = true;
    document.getElementById("personView").hidden = true;
    document.getElementById("landing").hidden = false;
    document.getElementById("landSearch").value = "";
    fillLanding();
    document.getElementById("landSearch").focus();
  };
  fillLanding();
  render();
})();
