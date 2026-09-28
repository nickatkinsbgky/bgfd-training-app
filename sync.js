const REMOTE = {
  owner: 'nickatkinsbgky',
  repo: 'bgfd-training-app',
  path: 'data.json',
  branch: 'main'
};
const TOKEN_KEY = 'bgfd-gh-token';

function getToken() {
  return (localStorage.getItem(TOKEN_KEY) || '').trim();
}

function setSyncMsg(text, ok) {
  const el = document.getElementById('sync-msg');
  if (!el) return;
  el.textContent = text || '';
  el.classList.remove('ok', 'no');
  if (ok === true) el.classList.add('ok');
  if (ok === false) el.classList.add('no');
}

function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

function refreshViews() {
  try { if (typeof fillPeople === 'function') fillPeople(); } catch (e) {}
  try { if (typeof renderAllTable === 'function') renderAllTable(); } catch (e) {}
  try { if (typeof renderRoster === 'function') renderRoster(); } catch (e) {}
  const nP = (window.db && window.db.personnel) ? window.db.personnel.length : 0;
  const nA = (window.db && window.db.assignments) ? window.db.assignments.length : 0;
  const hint = document.getElementById('form-hint');
  if (hint) hint.textContent = nP + ' personnel • ' + nA + ' assignments loaded.';
}

function getDb() {
  if (window.db && window.db.personnel) return window.db;
  try {
    if (typeof db !== 'undefined' && db) {
      window.db = db;
      return db;
    }
  } catch (e) {}
  const raw = localStorage.getItem('bgfd-training-app-v2') || localStorage.getItem('bgfd-training-app-v1');
  if (raw) {
    window.db = migrate(JSON.parse(raw));
    return window.db;
  }
  if (typeof SEED !== 'undefined') {
    window.db = migrate(JSON.parse(JSON.stringify(SEED)));
    return window.db;
  }
  return null;
}

function setDb(next) {
  window.db = next;
  try { db = next; } catch (e) {}
}

function applyBuiltInData() {
  const seed = (typeof SEED !== 'undefined') ? JSON.parse(JSON.stringify(SEED)) : { personnel: [], tasks: [], assignments: [] };
  setDb(typeof migrate === 'function' ? migrate(seed) : seed);
  try { localStorage.setItem(typeof KEY !== 'undefined' ? KEY : 'bgfd-training-app-v2', JSON.stringify(window.db)); } catch (e) {}
  refreshViews();
  setSyncMsg('Loaded original department data (' + (window.db.assignments||[]).length + ' assignments, ' + (window.db.personnel||[]).length + ' personnel).', true);
}

async function pullRemote() {
  setSyncMsg('Loading shared data from the site…');
  try {
    const url = `https://raw.githubusercontent.com/${REMOTE.owner}/${REMOTE.repo}/${REMOTE.branch}/${REMOTE.path}?t=${Date.now()}`;
    const res = await fetch(url);
    const local = getDb() || { assignments: [], personnel: [] };
    const localPeople = (local.personnel || []).length;
    const localCount = (local.assignments || []).length;
    const seedPeople = (typeof SEED !== 'undefined' && SEED.personnel) ? SEED.personnel.length : 0;
    if (res.status === 404) {
      if (localPeople < 50) applyBuiltInData();
      else { refreshViews(); setSyncMsg('Using this browser\u2019s copy (' + localCount + ' assignments).', true); }
      return null;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const remote = migrate(await res.json());
    const remoteCount = (remote.assignments || []).length;
    const remotePeople = (remote.personnel || []).length;
    if (remotePeople < 50) {
      if (localPeople < 50) applyBuiltInData();
      else { refreshViews(); setSyncMsg('Site copy is empty. Keeping this browser\u2019s ' + localPeople + ' personnel / ' + localCount + ' assignments.', true); }
      return remote;
    }
    if (localCount > remoteCount && localPeople >= remotePeople) {
      refreshViews();
      setSyncMsg('This browser has more rows than the site. Click Upload to site to share them.');
      return remote;
    }
    setDb(remote);
    localStorage.setItem(typeof KEY !== 'undefined' ? KEY : 'bgfd-training-app-v2', JSON.stringify(window.db));
    refreshViews();
    setSyncMsg('Using shared data from the site (' + remoteCount + ' assignments, ' + remotePeople + ' personnel).', true);
    return remote;
  } catch (err) {
    if ((getDb() && (getDb().personnel||[]).length < 50)) applyBuiltInData();
    else refreshViews();
    setSyncMsg('Could not load the site copy (' + err.message + '). Using this browser\u2019s data.');
    return null;
  }
}

let pushTimer = null;
function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushRemote, 500);
}

async function pushRemote() {
  const tok = getToken();
  if (!tok) {
    setSyncMsg('Saved on this device only. Paste a GitHub token below to upload to the site.');
    return;
  }
  const payload = getDb();
  if (!payload) {
    setSyncMsg('Upload failed: app data is not ready. Hard-refresh and try again.', false);
    return;
  }
  setSyncMsg('Uploading to the site…');
  try {
    const api = `https://api.github.com/repos/${REMOTE.owner}/${REMOTE.repo}/contents/${REMOTE.path}`;
    const headers = {
      Authorization: 'Bearer ' + tok,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    let sha;
    const meta = await fetch(api + '?ref=' + REMOTE.branch, { headers });
    if (meta.ok) {
      const info = await meta.json();
      sha = info.sha;
    }
    const body = {
      message: 'Sync training data ' + new Date().toISOString(),
      content: utf8ToB64(JSON.stringify(payload)),
      branch: REMOTE.branch
    };
    if (sha) body.sha = sha;
    const res = await fetch(api, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
      body: JSON.stringify(body)
    });
    const info = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(info.message || ('HTTP ' + res.status));
    setSyncMsg('Uploaded to the site. Others will see this after a refresh.', true);
  } catch (err) {
    setSyncMsg('Upload failed: ' + err.message, false);
  }
}

function bindSyncUi() {
  const input = document.getElementById('sync-token');
  const saveBtn = document.getElementById('btn-save-token');
  const pullBtn = document.getElementById('btn-pull');
  const pushBtn = document.getElementById('btn-push');
  if (input) input.value = getToken() ? '••••••••••••' : '';
  if (saveBtn) saveBtn.onclick = function () {
    const val = (input.value || '').trim();
    if (!val || val.indexOf('•') === 0) {
      setSyncMsg(getToken() ? 'Token already saved in this browser.' : 'Paste a token first.', !!getToken());
      return;
    }
    localStorage.setItem(TOKEN_KEY, val);
    input.value = '••••••••••••';
    setSyncMsg('Token saved in this browser only.', true);
    pushRemote();
  };
  if (pullBtn) pullBtn.onclick = pullRemote;
  if (pushBtn) pushBtn.onclick = pushRemote;
}

if (typeof save === 'function') {
  const _save = save;
  save = function (data) {
    if (data) window.db = data;
    _save(data);
    schedulePush();
  };
}

window.db = getDb();
bindSyncUi();
refreshViews();
pullRemote();
