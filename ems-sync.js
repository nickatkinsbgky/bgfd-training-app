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
  async function latestSha(api, headers) {
    var meta = await fetch(api + "?ref=" + REMOTE.branch + "&t=" + Date.now(), { headers: headers, cache: "no-store" });
    if (!meta.ok) return null;
    var info = await meta.json();
    return info.sha || null;
  }
  async function pullRemote() {
    setSyncMsg("Loading site data…");
    try {
      var url = "https://raw.githubusercontent.com/" + REMOTE.owner + "/" + REMOTE.repo + "/" + REMOTE.branch + "/" + REMOTE.path + "?t=" + Date.now();
      var res = await fetch(url, { cache: "no-store" });
      var remote = null;
      if (res.ok) remote = await res.json();
      if (!remote || !remote.people || remote.people.length < 50) {
        setSyncMsg("Could not load site data.", false);
        return;
      }
      remote = cleanNames(remote);
      var local = currentDb();
      var localPeople = local && local.people ? local.people.length : 0;
      var localRecords = local && local.records ? local.records.length : 0;
      var remoteRecords = remote.records ? remote.records.length : 0;
      if (localPeople && (localPeople !== remote.people.length || localRecords !== remoteRecords)) {
        var ok = confirm("Replace this device copy with the latest site data (" + remote.people.length + " people, " + remoteRecords + " classes)? Middle names will be removed.");
        if (!ok) { setSyncMsg("Kept this device copy."); return; }
      }
      applyRemote(remote);
      setSyncMsg("Loaded latest site data (" + remote.people.length + " people, " + remoteRecords + " classes). Middle names removed.", true);
    } catch (e) {
      setSyncMsg("Could not load the data. " + e.message, false);
    }
  }
  async function pushRemote() {
    var tok = getToken();
    var payload = currentDb();
    if (!payload || !payload.people) { setSyncMsg("Nothing to upload yet.", false); return; }
    payload = cleanNames(payload);
    if (typeof window.saveEms === "function") payload = window.saveEms();
    else localStorage.setItem(KEY, JSON.stringify(payload));
    if (!tok) {
      setSyncMsg("Saved on this device. Add a GitHub token to upload to the site.", true);
      return;
    }
    setSyncMsg("Uploading to the site (main)…");
    var api = "https://api.github.com/repos/" + REMOTE.owner + "/" + REMOTE.repo + "/contents/" + REMOTE.path;
    var headers = { Authorization: "Bearer " + tok, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    var content = utf8ToB64(JSON.stringify(payload));
    try {
      for (var attempt = 1; attempt <= 6; attempt++) {
        var sha = await latestSha(api, headers);
        var body = { message: "Sync EMS recert data " + new Date().toISOString(), content: content, branch: REMOTE.branch };
        if (sha) body.sha = sha;
        var res = await fetch(api, { method: "PUT", headers: Object.assign({ "Content-Type": "application/json" }, headers), body: JSON.stringify(body) });
        var info = await res.json().catch(function () { return {}; });
        if (res.ok) {
          setSyncMsg("Uploaded to main. Other devices and Share links will see this after Load site data.", true);
          return;
        }
        var msg = info.message || ("HTTP " + res.status);
        if (attempt < 6 && /sha|match|409/i.test(msg)) {
          await new Promise(function (r) { setTimeout(r, 400 * attempt); });
          continue;
        }
        throw new Error(msg);
      }
    } catch (err) {
      setSyncMsg("Upload failed: " + err.message, false);
    }
  }
  var saveAll = document.getElementById("btn-save-all");
  if (saveAll) saveAll.onclick = function () {
    if (typeof window.saveEms === "function") window.saveEms();
    else if (currentDb()) localStorage.setItem(KEY, JSON.stringify(currentDb()));
    setSyncMsg("Saved on this device.", true);
  };
  var pushBtn = document.getElementById("btn-push");
  if (pushBtn) pushBtn.onclick = pushRemote;
  var pullBtn = document.getElementById("btn-pull");
  if (pullBtn) pullBtn.onclick = pullRemote;
  var saveToken = document.getElementById("btn-save-token");
  if (saveToken) saveToken.onclick = function () {
    var input = document.getElementById("sync-token");
    if (input && input.value) {
      localStorage.setItem(TOKEN_KEY, input.value.trim());
      setSyncMsg("Token saved.", true);
    }
  };
})();
