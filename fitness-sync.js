(function () {
  var REMOTE = { owner: 'nickatkinsbgky', repo: 'bgfd-training-app', path: 'fitness-data.json', branch: 'main' };
  var TOKEN_KEY = 'bgfd-gh-token';
  function getToken() { return (localStorage.getItem(TOKEN_KEY) || '').trim(); }
  function setSyncMsg(text, ok) {
    var el = document.getElementById('sync-msg');
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('ok', 'no');
    if (ok === true) el.classList.add('ok');
    if (ok === false) el.classList.add('no');
  }
  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function db() { return window.db || { personnel: [], tasks: [], results: [] }; }
  var pushTimer = null, pushing = false;
  function scheduleFitnessPush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushRemote, 1200);
  }
  window.scheduleFitnessPush = scheduleFitnessPush;
  function mergeBy(list, extra, key) {
    var have = {};
    list.forEach(function (item) { if (item && item[key]) have[item[key]] = true; });
    extra.forEach(function (item) { if (item && item[key] && !have[item[key]]) { list.push(item); have[item[key]] = true; } });
  }
  async function pullRemote() {
    try {
      var res = await fetch('https://raw.githubusercontent.com/' + REMOTE.owner + '/' + REMOTE.repo + '/' + REMOTE.branch + '/' + REMOTE.path + '?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) { setSyncMsg('No site copy yet. Save, then upload.'); return; }
      var remote = await res.json();
      var local = db();
      var byId = {};
      (remote.results || []).forEach(function (r) { if (r && r.id) byId[r.id] = r; });
      (local.results || []).forEach(function (r) { if (r && r.id && !byId[r.id]) byId[r.id] = r; });
      local.results = Object.keys(byId).map(function (id) { return byId[id]; });
      mergeBy(local.personnel, remote.personnel || [], 'fullName');
      mergeBy(local.tasks, remote.tasks || [], 'name');
      var ages = window.SEED_FITNESS_AGES || {};
      (local.personnel || []).forEach(function (p) {
        if (p && ages[p.fullName] != null) { p.age = ages[p.fullName]; p.ageAsOf = '2026'; }
      });
      if (typeof window.saveFitness === 'function') window.saveFitness(local, { silent: true });
      setSyncMsg('Loaded site copy (' + local.results.length + ' results). Ages are as of 2026.', true);
      var active = document.querySelector('nav button.active');
      if (active) active.click();
      document.getElementById('btn-save-all').click && document.getElementById('tab-log') && (location.hash = location.hash);
    } catch (e) {
      setSyncMsg('Could not load the site copy. Using this device.');
    }
  }
  async function latestSha(api, headers) {
    var meta = await fetch(api + '?ref=' + REMOTE.branch + '&t=' + Date.now(), { headers: headers, cache: 'no-store' });
    if (!meta.ok) return null;
    var info = await meta.json();
    return info.sha || null;
  }
  async function pushRemote() {
    var tok = getToken();
    if (!tok) { setSyncMsg('Saved on this device. Paste a GitHub token, then upload.'); return; }
    if (pushing) { scheduleFitnessPush(); return; }
    pushing = true;
    setSyncMsg('Uploading to the site…');
    var api = 'https://api.github.com/repos/' + REMOTE.owner + '/' + REMOTE.repo + '/contents/' + REMOTE.path;
    var headers = { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    var content = utf8ToB64(JSON.stringify(db()));
    try {
      for (var attempt = 1; attempt <= 6; attempt++) {
        var sha = await latestSha(api, headers);
        var body = { message: 'Sync fitness data ' + new Date().toISOString(), content: content, branch: REMOTE.branch };
        if (sha) body.sha = sha;
        var res = await fetch(api, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, headers), body: JSON.stringify(body) });
        var info = await res.json().catch(function () { return {}; });
        if (res.ok) { setSyncMsg('Uploaded to the site. Other devices will see this after a refresh.', true); pushing = false; return; }
        var msg = info.message || ('HTTP ' + res.status);
        if (attempt < 6 && /sha|match|409/i.test(msg)) { await new Promise(function (r) { setTimeout(r, 400 * attempt); }); continue; }
        throw new Error(msg);
      }
    } catch (err) {
      setSyncMsg('Upload failed: ' + err.message, false);
    } finally { pushing = false; }
  }
  window.pushFitness = pushRemote;
  var input = document.getElementById('sync-token');
  if (input) input.value = getToken() ? '••••••••••••' : '';
  var saveToken = document.getElementById('btn-save-token');
  if (saveToken) saveToken.onclick = function () {
    var val = (input.value || '').trim();
    if (!val || val.indexOf('•') === 0) { setSyncMsg(getToken() ? 'Token already saved on this device.' : 'Paste a token first.', !!getToken()); return; }
    localStorage.setItem(TOKEN_KEY, val);
    input.value = '••••••••••••';
    setSyncMsg('Token saved on this device.', true);
  };
  var saveAll = document.getElementById('btn-save-all');
  if (saveAll) saveAll.onclick = function () {
    if (typeof window.saveFitness === 'function') window.saveFitness(db(), { silent: true });
    setSyncMsg('Saved on this device.', true);
  };
  var pushBtn = document.getElementById('btn-push');
  if (pushBtn) pushBtn.onclick = pushRemote;
  pullRemote();
})();
