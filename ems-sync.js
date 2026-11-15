(function () {
  var REMOTE = { owner: "nickatkinsbgky", repo: "bgfd-training-app", path: "ems-recert-data.json", branch: "main" };
  var TOKEN_KEY = "bgfd-gh-token";
  var KEY = "bgfd-ems-recert-excel-v1";

  function getToken() { return (localStorage.getItem(TOKEN_KEY) || "").trim(); }
  function setSyncMsg(text, ok) {
    var el = document.getElementById("sync-msg");
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("ok", "no");
    if (ok === true) el.classList.add("ok");
    if (ok === false) el.classList.add("no");
  }
  function currentDb() {
    if (typeof window.getEmsDb === "function") return window.getEmsDb();
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function applyRemote(remote) {
    if (typeof window.setEmsDb === "function") window.setEmsDb(remote);
    else localStorage.setItem(KEY, JSON.stringify(remote));
  }
  function stripMiddleName(name) {
    if (!name || name.indexOf(",") === -1) return name;
    var parts = name.split(",");
    var last = parts[0].trim();
    var firstParts = parts.slice(1).join(",").trim().split(/\s+/);
    var first = firstParts[0] || "";
    return last + ", " + first;
  }
  function cleanNames(data) {
    if (!data || !data.people) return data;
    var map = {};
    data.people.forEach(function (p) {
      var original = p.name;
      var cleaned = stripMiddleName(original);
      if (cleaned !== original) {
        map[original] = cleaned;
        p.name = cleaned;
      }
    });
    if (data.records) {
      data.records.forEach(function (r) {
        if (map[r.name]) r.name = map[r.name];
      });
    }
    return data;
  }
  async function pullRemote() {
    setSyncMsg("Loading site data…");
    try {
      var url = "https://raw.githubusercontent.com/nickatkinsbgky/bgfd-training-app/0640eb47f15f2f908f0a69d6b34fa0a591dd2938/ems-recert-data.json?t=" + Date.now();
      var res = await fetch(url, { cache: "no-store" });
      var remote = null;
      if (res.ok) remote = await res.json();
      if (!remote || !remote.people || remote.people.length < 50) {
        setSyncMsg("Could not load the November data set.", false);
        return;
      }
      remote = cleanNames(remote);
      var local = currentDb();
      var localPeople = local && local.people ? local.people.length : 0;
      var localRecords = local && local.records ? local.records.length : 0;
      var remoteRecords = remote.records ? remote.records.length : 0;
      if (localPeople && (localPeople !== remote.people.length || localRecords !== remoteRecords)) {
        var ok = confirm("Replace this device copy with the November data set (" + remote.people.length + " people, " + remoteRecords + " classes)? Middle names will be removed.");
        if (!ok) { setSyncMsg("Kept this device copy."); return; }
      }
      applyRemote(remote);
      setSyncMsg("Loaded data (" + remote.people.length + " people, " + remoteRecords + " classes). Middle names removed.", true);
    } catch (e) {
      setSyncMsg("Could not load the data. " + e.message, false);
    }
  }
  var pullBtn = document.getElementById("btn-pull");
  if (pullBtn) pullBtn.onclick = pullRemote;
})();
