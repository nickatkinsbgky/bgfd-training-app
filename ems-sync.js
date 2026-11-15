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
  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function currentDb() {
    if (typeof window.getEmsDb === "function") return window.getEmsDb();
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function applyRemote(remote) {
    if (typeof window.setEmsDb === "function") window.setEmsDb(remote);
    else localStorage.setItem(KEY, JSON.stringify(remote));
  }
  function getFullSeed() {
    var seed = window.EMS_RECERT_SEED || { people: [], records: [] };
    return seed;
  }
  async function pullRemote() {
    setSyncMsg("Loading site data…");
    try {
      // Temporarily pull from the Nov 12 commit that has the November records
      var url = "https://raw.githubusercontent.com/nickatkinsbgky/bgfd-training-app/0640eb47f15f2f908f0a69d6b34fa0a591dd2938/ems-recert-data.json?t=" + Date.now();
      var res = await fetch(url, { cache: "no-store" });
      var remote = null;
      if (res.ok) {
        remote = await res.json();
      }
      if (!remote || !remote.people || remote.people.length < 50) {
        setSyncMsg("Could not load the November data set.", false);
        return;
      }
      var local = currentDb();
      var localPeople = local && local.people ? local.people.length : 0;
      var localRecords = local && local.records ? local.records.length : 0;
      var remoteRecords = remote.records ? remote.records.length : 0;
      if (localPeople && (localPeople !== remote.people.length || localRecords !== remoteRecords)) {
        var ok = confirm("Replace this device copy with the November data set (" + remote.people.length + " people, " + remoteRecords + " classes)?");
        if (!ok) { setSyncMsg("Kept this device copy."); return; }
      }
      applyRemote(remote);
      setSyncMsg("Loaded November data set (" + remote.people.length + " people, " + remoteRecords + " classes).", true);
    } catch (e) {
      setSyncMsg("Could not load the data. " + e.message, false);
    }
  }
  var pullBtn = document.getElementById("btn-pull");
  if (pullBtn) pullBtn.onclick = pullRemote;
})();
