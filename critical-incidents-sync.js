(function () {
  var REMOTE = { owner: "nickatkinsbgky", repo: "bgfd-training-app", path: "critical-incidents-data.json", branch: "main" };
  var TOKEN_KEY = "bgfd-gh-token";
  var KEY = "bgfd-critical-incidents-v1";

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
    if (typeof window.getCriticalDb === "function") return window.getCriticalDb();
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function applyRemote(remote) {
    if (typeof window.setCriticalDb === "function") window.setCriticalDb(remote);
    else localStorage.setItem(KEY, JSON.stringify(remote));
  }
  async function latestSha(api, headers) {
    var meta = await fetch(api + "?ref=" + REMOTE.branch + "&t=" + Date.now(), { headers: headers, cache: "no-store" });
    if (!meta.ok) return null;
    var info = await meta.json();
    return info.sha || null;
  }
  async function loadGroups() {
    var files = [0,1,2,3,4,5,6,7,8,9,10];
    var groups = await Promise.all(files.map(function (n) {
      return fetch("critical-incidents/" + n + ".json?t=" + Date.now(), { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("Missing group " + n);
        return r.json();
      });
    }));
    var incidents = groups.reduce(function (all, group) { return all.concat(group); }, []);
    return { source: "CriticalIncidents-Nick_20261007144204.xlsx", imported: "2026-10-07", count: incidents.length, incidents: incidents };
  }
  async function pullRemote() {
    setSyncMsg("Loading site data…");
    try {
      var remote = null;
      var res = await fetch("https://raw.githubusercontent.com/" + REMOTE.owner + "/" + REMOTE.repo + "/" + REMOTE.branch + "/" + REMOTE.path + "?t=" + Date.now(), { cache: "no-store" });
      if (res.ok) remote = await res.json();
      if (!remote || !remote.incidents || !remote.incidents.length) remote = await loadGroups();
      if (!remote.incidents.length) { setSyncMsg("Site copy is empty. Kept this device.", false); return; }
      var local = currentDb();
      var localCount = local && local.incidents ? local.incidents.length : 0;
      if (localCount && localCount !== remote.incidents.length) {
        var ok = confirm("Replace this device copy with the site copy (" + remote.incidents.length + " incidents)?");
        if (!ok) { setSyncMsg("Kept this device copy."); return; }
      }
      applyRemote(remote);
      setSyncMsg("Loaded site copy (" + remote.incidents.length + " incidents).", true);
    } catch (e) {
      setSyncMsg("Could not load the site copy. Using this device.", false);
    }
  }
  async function pushRemote() {
    var tok = getToken();
    var payload = currentDb();
    if (!payload || !payload.incidents) { setSyncMsg("Nothing to upload yet.", false); return; }
    if (typeof window.saveCritical === "function") payload = window.saveCritical();
    else localStorage.setItem(KEY, JSON.stringify(payload));
    if (!tok) { setSyncMsg("Saved on this device. Paste a GitHub token, then upload."); return; }
    setSyncMsg("Uploading to the site…");
    var api = "https://api.github.com/repos/" + REMOTE.owner + "/" + REMOTE.repo + "/contents/" + REMOTE.path;
    var headers = { Authorization: "Bearer " + tok, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    var content = utf8ToB64(JSON.stringify(payload));
    try {
      for (var attempt = 1; attempt <= 6; attempt++) {
        var sha = await latestSha(api, headers);
        var body = { message: "Sync critical incidents " + new Date().toISOString(), content: content, branch: REMOTE.branch };
        if (sha) body.sha = sha;
        var res = await fetch(api, { method: "PUT", headers: Object.assign({ "Content-Type": "application/json" }, headers), body: JSON.stringify(body) });
        var info = await res.json().catch(function () { return {}; });
        if (res.ok) {
          setSyncMsg("Uploaded to the site. Other devices will see this after Load site data.", true);
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
  var input = document.getElementById("sync-token");
  if (input) input.value = getToken() ? "••••••••••••" : "";
  var saveToken = document.getElementById("btn-save-token");
  if (saveToken) saveToken.onclick = function () {
    var val = (input.value || "").trim();
    if (!val || val.indexOf("•") === 0) {
      setSyncMsg(getToken() ? "Token already saved on this device." : "Paste a token first.", !!getToken());
      return;
    }
    localStorage.setItem(TOKEN_KEY, val);
    input.value = "••••••••••••";
    setSyncMsg("Token saved on this device.", true);
  };
  var saveAll = document.getElementById("btn-save-all");
  if (saveAll) saveAll.onclick = function () {
    if (typeof window.saveCritical === "function") window.saveCritical();
    else if (currentDb()) localStorage.setItem(KEY, JSON.stringify(currentDb()));
    setSyncMsg("Saved on this device.", true);
  };
  var pushBtn = document.getElementById("btn-push");
  if (pushBtn) pushBtn.onclick = pushRemote;
  var pullBtn = document.getElementById("btn-pull");
  if (pullBtn) pullBtn.onclick = pullRemote;
  window.pullCritical = pullRemote;
  window.pushCritical = pushRemote;
})();
