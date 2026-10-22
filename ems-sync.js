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
    // Ensure Stine, Cameron is included
    var hasStine = seed.people && seed.people.some(function(p) { return p.name === "Stine, Cameron"; });
    if (!hasStine) {
      seed.people = seed.people || [];
      seed.people.push({
        name: "Stine, Cameron",
        kemsisId: "",
        expDate: "2026-12-31",
        certificationLevel: "Paramedic"
      });
      var stineRecords = [
        {"name":"Stine, Cameron","date":"2026-07-06","category":"Cardiovascular","standard":"KBEMS | Cardiovascular | Cardiovascular","hours":1.5,"course":"Pediatric Emergencies & Pediatric Assessment (3742018)","pediatric":true},
        {"name":"Stine, Cameron","date":"2026-07-01","category":"Trauma","standard":"KBEMS | Trauma | Trauma","hours":1.5,"course":"Orthopeadic Trauma (3742079)"},
        {"name":"Stine, Cameron","date":"2026-07-01","category":"Medical","standard":"KBEMS | Medical | Medical","hours":1,"course":"Poisoning & Antidotes (3742082)"},
        {"name":"Stine, Cameron","date":"2026-06-29","category":"Medical","standard":"KBEMS | Medical | Medical","hours":1,"course":"Hyperthermia/Hypothermay (3706333)"},
        {"name":"Stine, Cameron","date":"2026-05-06","category":"Airway","standard":"KBEMS | Airway | Airway","hours":1,"course":"Pulmonary Embolism (3444915)"},
        {"name":"Stine, Cameron","date":"2026-05-06","category":"Medical","standard":"KBEMS | Medical | Medical","hours":1.5,"course":"Pain Management & Medication Review (3444920)"},
        {"name":"Stine, Cameron","date":"2026-04-27","category":"Trauma","standard":"KBEMS | Trauma | Trauma","hours":1,"course":"Traumatic Brain Injury (3410723)"},
        {"name":"Stine, Cameron","date":"2026-04-27","category":"Medical","standard":"KBEMS | Medical | Medical","hours":1.5,"course":"Altered Mental Status & Coma (3322376)"},
        {"name":"Stine, Cameron","date":"2026-04-15","category":"CPR/AED","standard":"KBEMS | CPR/AED | CPR/AED","hours":1,"course":"BLS CPR (3355738)"},
        {"name":"Stine, Cameron","date":"2026-04-03","category":"Trauma","standard":"KBEMS | Trauma | Trauma","hours":1,"course":"Traumatic Brain Injury (3322371)"},
        {"name":"Stine, Cameron","date":"2026-04-03","category":"Medical","standard":"KBEMS | Medical | Medical","hours":1.5,"course":"Altered Mental Status & Coma (3322376)"},
        {"name":"Stine, Cameron","date":"2026-03-26","category":"Trauma","standard":"KBEMS | Trauma | Trauma","hours":1,"course":"Crush Injuries & Crush Syndrome (3213888)"},
        {"name":"Stine, Cameron","date":"2026-03-26","category":"Airway","standard":"KBEMS | Airway | Airway","hours":1.5,"course":"Airway & Ventilation (3213881)"},
        {"name":"Stine, Cameron","date":"2026-02-26","category":"Medical","standard":"KBEMS | Medical | Medical","hours":1,"course":"Pharmacology (3129205)"},
        {"name":"Stine, Cameron","date":"2026-02-26","category":"Operations","standard":"KBEMS | Operations | Operations","hours":1.5,"course":"Patient Refusals / Evidence Preservation (3129170)"},
        {"name":"Stine, Cameron","date":"2026-02-13","category":"Medical","standard":"KBEMS | Medical | Medical","hours":1,"course":"EMS Adrenal Insufficiency (3021873)"},
        {"name":"Stine, Cameron","date":"2026-02-02","category":"Medical","standard":"KBEMS | Medical | Medical","hours":1,"course":"EMS Adrenal Insufficiency (3021870)"},
        {"name":"Stine, Cameron","date":"2026-02-02","category":"Airway","standard":"KBEMS | Airway | Airway","hours":1,"course":"Cyano Kit (3033434)"},
        {"name":"Stine, Cameron","date":"2026-01-26","category":"Airway","standard":"KBEMS | Airway | Airway","hours":2,"course":"Cardiac 12 Lead EKG's (3033266)"},
        {"name":"Stine, Cameron","date":"2026-01-12","category":"Trauma","standard":"KBEMS | Trauma | Trauma","hours":1,"course":"Cyano Kit (3033434)"},
        {"name":"Stine, Cameron","date":"2026-01-09","category":"Medical","standard":"KBEMS | Medical | Medical","hours":0.5,"course":"OB/GYM (3033277)"}
      ];
      seed.records = seed.records || [];
      seed.records = seed.records.concat(stineRecords);
    }
    return seed;
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
      var res = await fetch("https://raw.githubusercontent.com/" + REMOTE.owner + "/" + REMOTE.repo + "/" + REMOTE.branch + "/" + REMOTE.path + "?t=" + Date.now(), { cache: "no-store" });
      var remote = null;
      if (res.ok) {
        remote = await res.json();
      }
      // If site data is incomplete (fewer than 50 people), fall back to full seed
      if (!remote || !remote.people || remote.people.length < 50) {
        var seed = getFullSeed();
        applyRemote(seed);
        setSyncMsg("Site data incomplete. Loaded full department seed with Stine, Cameron (" + seed.people.length + " people, " + seed.records.length + " classes).", true);
        return;
      }
      if (!remote.people.length) {
        setSyncMsg("Site copy is empty. Kept this device.");
        return;
      }
      var local = currentDb();
      var localPeople = local && local.people ? local.people.length : 0;
      var localRecords = local && local.records ? local.records.length : 0;
      var remoteRecords = remote.records ? remote.records.length : 0;
      if (localPeople && (localPeople !== remote.people.length || localRecords !== remoteRecords)) {
        var ok = confirm("Replace this device copy with the site copy (" + remote.people.length + " people, " + remoteRecords + " classes)?");
        if (!ok) { setSyncMsg("Kept this device copy."); return; }
      }
      applyRemote(remote);
      setSyncMsg("Loaded site copy (" + remote.people.length + " people, " + remoteRecords + " classes).", true);
    } catch (e) {
      setSyncMsg("Could not load the site copy. Using this device.", false);
    }
  }
  async function pushRemote() {
    var tok = getToken();
    var payload = currentDb();
    if (!payload || !payload.people) { setSyncMsg("Nothing to upload yet.", false); return; }
    if (typeof window.saveEms === "function") payload = window.saveEms();
    else localStorage.setItem(KEY, JSON.stringify(payload));
    if (!tok) { setSyncMsg("Saved on this device. Paste a GitHub token, then upload."); return; }
    setSyncMsg("Uploading to the site…");
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
    if (typeof window.saveEms === "function") window.saveEms();
    else if (currentDb()) localStorage.setItem(KEY, JSON.stringify(currentDb()));
    setSyncMsg("Saved on this device.", true);
  };
  var pushBtn = document.getElementById("btn-push");
  if (pushBtn) pushBtn.onclick = pushRemote;
  var pullBtn = document.getElementById("btn-pull");
  if (pullBtn) pullBtn.onclick = pullRemote;
  if (!localStorage.getItem(KEY)) pullRemote();
})();
