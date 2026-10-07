(function () {
  var KEY = "bgfd-critical-incidents-v1";
  var SESSION = "bgfd-owner-unlock";
  var PASS = "Bomberonick5606!";
  var db = { imported: "2026-10-07", source: "CriticalIncidents-Nick_20261007144204.xlsx", incidents: [] };
  var editing = null;
  var list = document.getElementById("list");
  var q = document.getElementById("q");
  var shift = document.getElementById("shift");
  var drawer = document.getElementById("drawer");
  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function unlocked() { return sessionStorage.getItem(SESSION) === "1"; }
  function applyLock() {
    document.body.classList.toggle("view-only", !unlocked());
    document.getElementById("owner-btn").textContent = unlocked() ? "Owner signed in" : "Owner sign-in";
    if (!unlocked()) drawer.hidden = true;
  }
  function saveCritical() {
    localStorage.setItem(KEY, JSON.stringify(db));
    return db;
  }
  window.saveCritical = saveCritical;
  window.getCriticalDb = function () { return db; };
  window.setCriticalDb = function (next) {
    db = next && next.incidents ? next : db;
    saveCritical();
    render();
  };
  function paintStats(shown) {
    var people = shown.reduce(function (n, r) { return n + (Number(r.personnel) || 0); }, 0);
    document.getElementById("stats").innerHTML =
      "<div class='stat'><b>" + shown.length + "</b><span>Showing</span></div>" +
      "<div class='stat'><b>" + db.incidents.length + "</b><span>Stored</span></div>" +
      "<div class='stat'><b>" + people + "</b><span>Personnel on shown</span></div>";
  }
  function render() {
    var term = q.value.trim().toLowerCase();
    var sh = shift.value;
    var shown = db.incidents.filter(function (r) {
      if (sh && r.shift !== sh) return false;
      if (!term) return true;
      return [r.address, r.officer, r.unit, r.incidentNumber, r.cadNumber, r.nfirs, r.narrative].join(" ").toLowerCase().indexOf(term) !== -1;
    });
    paintStats(shown);
    if (window.paintCriticalAverages) window.paintCriticalAverages();
    if (!shown.length) { list.innerHTML = "<p class='empty'>No incidents match.</p>"; return; }
    list.innerHTML = shown.map(function (r) {
      var idx = db.incidents.indexOf(r);
      var narrative = r.narrative ? "<details><summary>Narrative</summary><p class='narrative'>" + esc(r.narrative) + "</p></details>" : "";
      var actions = unlocked() ? "<div class='edit-bar owner-only'><button class='tiny gold' data-edit='" + idx + "' type='button'>Edit</button><button class='tiny' data-del='" + idx + "' type='button'>Delete</button></div>" : "";
      return "<article class='card'><h2>" + esc(r.incidentNumber) + " · " + esc(r.address) + "</h2><div class='meta'>" + esc(r.created) + "</div><div class='pills'><span class='pill'>Shift " + esc(r.shift) + "</span><span class='pill'>" + esc(r.unit || "No unit") + "</span><span class='pill'>" + esc(r.officer) + "</span><span class='pill'>" + esc(r.personnel) + " personnel</span>" + (r.nfirs ? "<span class='pill'>" + esc(r.nfirs) + "</span>" : "") + "</div>" + narrative + actions + "</article>";
    }).join("");
  }
  function blankForm() {
    editing = null;
    document.getElementById("drawerTitle").textContent = "Add incident";
    ["f-created", "f-number", "f-address", "f-unit", "f-officer", "f-nfirs", "f-narrative"].forEach(function (id) {
      document.getElementById(id).value = "";
    });
    document.getElementById("f-shift").value = "A";
    document.getElementById("f-personnel").value = "0";
  }
  function openEdit(idx) {
    if (!unlocked()) return;
    var r = db.incidents[idx];
    if (!r) return;
    editing = idx;
    drawer.hidden = false;
    document.getElementById("drawerTitle").textContent = "Edit incident";
    document.getElementById("f-created").value = String(r.created || "").replace(" ", "T").slice(0, 16);
    document.getElementById("f-number").value = r.incidentNumber || "";
    document.getElementById("f-address").value = r.address || "";
    document.getElementById("f-shift").value = r.shift || "A";
    document.getElementById("f-unit").value = r.unit || "";
    document.getElementById("f-officer").value = r.officer || "";
    document.getElementById("f-personnel").value = r.personnel || 0;
    document.getElementById("f-nfirs").value = r.nfirs || "";
    document.getElementById("f-narrative").value = r.narrative || "";
  }
  document.getElementById("owner-btn").onclick = function () {
    if (unlocked()) { sessionStorage.removeItem(SESSION); applyLock(); render(); return; }
    var entered = window.prompt("Owner password");
    if (entered == null) return;
    if (entered === PASS) { sessionStorage.setItem(SESSION, "1"); applyLock(); render(); }
    else window.alert("Incorrect password. The site stays view-only.");
  };
  document.getElementById("btn-add").onclick = function () { blankForm(); drawer.hidden = false; };
  document.getElementById("btn-cancel").onclick = function () { drawer.hidden = true; editing = null; };
  document.getElementById("btn-save-incident").onclick = function () {
    var created = document.getElementById("f-created").value.replace("T", " ");
    var row = {
      created: created,
      incidentId: editing != null && db.incidents[editing] ? db.incidents[editing].incidentId : Date.now(),
      incidentNumber: document.getElementById("f-number").value.trim(),
      criteria: "Meets Critical Incident Criteria",
      answer: true,
      address: document.getElementById("f-address").value.trim(),
      nfirs: document.getElementById("f-nfirs").value.trim(),
      unit: document.getElementById("f-unit").value.trim(),
      shift: document.getElementById("f-shift").value,
      officer: document.getElementById("f-officer").value.trim(),
      cadNumber: document.getElementById("f-number").value.trim(),
      narrative: document.getElementById("f-narrative").value.trim(),
      personnel: Number(document.getElementById("f-personnel").value) || 0
    };
    if (editing == null) db.incidents.unshift(row);
    else db.incidents[editing] = row;
    saveCritical();
    drawer.hidden = true;
    render();
  };
  list.onclick = function (e) {
    var edit = e.target.getAttribute("data-edit");
    var del = e.target.getAttribute("data-del");
    if (edit != null) openEdit(Number(edit));
    if (del != null && confirm("Delete this incident from this device?")) {
      db.incidents.splice(Number(del), 1);
      saveCritical();
      render();
    }
  };
  q.oninput = render;
  shift.onchange = render;
  async function seedFromGroups() {
    var files = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var groups = await Promise.all(files.map(function (n) {
      return fetch("critical-incidents/" + n + ".json?t=" + Date.now(), { cache: "no-store" }).then(function (r) {
        return r.ok ? r.json() : [];
      });
    }));
    return groups.reduce(function (all, group) { return all.concat(group); }, []);
  }
  async function boot() {
    applyLock();
    try { db = JSON.parse(localStorage.getItem(KEY) || "null") || db; } catch (e) {}
    if (!db.incidents || !db.incidents.length) {
      db.incidents = await seedFromGroups();
      saveCritical();
    }
    render();
    var msg = document.getElementById("sync-msg");
    if (msg && db.incidents.length) {
      msg.textContent = "Loaded " + db.incidents.length + " incidents.";
      msg.className = "ok";
    }
  }
  boot();
})();
