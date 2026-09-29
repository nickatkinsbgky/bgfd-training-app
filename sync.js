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

function applyNameMaps(store) {
  if (!store) return store;
  if (typeof mergeOCourse === 'function') return mergeOCourse(store);
  const map = window.OC_NAME_MAP || {
    'Barnhart, Zack':'Barnhart, Zach',
    'Bates, Chris':'Bates, Christopher',
    'Dylan, Matt':'Dylan, Matthew',
    'Gaoa, Solo':'Gaoa, Solomona',
    'Napolitano, Thomas':'Napolitano, Tom',
    'Parsley, Dane':'Parsley, William',
    'Smith, Jonathan':'Smith, Jon',
    'Vance, Josh':'Vance, Joshua'
  };
  (store.assignments || []).forEach(a => {
    if (a && map[a.personnel]) a.personnel = map[a.personnel];
  });
  return store;
}

function refreshViews() {
  try { if (typeof fillPeople === 'function') fillPeople(); } catch (e) {}
  try { if (typeof fillPeopleAll === 'function') fillPeopleAll(); } catch (e) {}
  try { if (typeof renderAllTable === 'function') renderAllTable(); } catch (e) {}
  try { if (typeof renderRoster === 'function') renderRoster(); } catch (e) {}
  try { if (typeof renderPersonList === 'function') renderPersonList(); } catch (e) {}
  const nP = (window.db && window.db.personnel) ? window.db.personnel.length : 0;
  const nA = (window.db && window.db.assignments) ? window.db.assignments.length : 0;
  const hint = document.getElementById('form-hint');
  if (hint && nP) hint.textContent = nP + ' personnel \u2022 ' + nA + ' assignments loaded.';
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
    window.db = (typeof migrate === 'function') ? migrate(JSON.parse(raw)) : JSON.parse(raw);
    return window.db;
  }
  return window.db || null;
}

function setDb(next) {
  window.db = next;
  try { db = next; } catch (e) {}
}

async function pullRemote() {
  setSyncMsg('Loading shared data from the site\u2026');
  try {
    const url = 'https://raw.githubusercontent.com/' + REMOTE.owner + '/' + REMOTE.repo + '/' + REMOTE.branch + '/' + REMOTE.path + '?t=' + Date.now();
    const res = await fetch(url, { cache: 'no-store' });
    const local = getDb() || { assignments: [], personnel: [] };
    const localPeople = (local.personnel || []).length;
    const localCount = (local.assignments || []).length;
    if (!res.ok) {
      setDb(applyNameMaps(local));
      refreshViews();
      setSyncMsg('Could not reach shared file. Using this device copy.');
      return null;
    }
    let remote = (typeof migrate === 'function') ? migrate(await res.json()) : await res.json();
    remote = applyNameMaps(remote);
    const remoteCount = (remote.assignments || []).length;
    const remotePeople = (remote.personnel || []).length;
    if (remotePeople < 50) {
      setDb(applyNameMaps(local));
      refreshViews();
      setSyncMsg('Site copy is empty. Keeping this device copy.');
      return remote;
    }
    if (localCount > remoteCount && localPeople >= remotePeople) {
      setDb(applyNameMaps(local));
      refreshViews();
      setSyncMsg('This device has more rows than the site. Uploading\u2026');
      schedulePush();
      return remote;
    }
    setDb(remote);
    localStorage.setItem(typeof KEY !== 'undefined' ? KEY : 'bgfd-training-app-v2', JSON.stringify(window.db));
    refreshViews();
    setSyncMsg('Using shared data (' + remoteCount + ' assignments, ' + remotePeople + ' personnel).', true);
    return remote;
  } catch (err) {
    refreshViews();
    setSyncMsg('Could not load the site copy. Using this device copy.');
    return null;
  }
}

let pushTimer = null;
let pushing = false;
function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushRemote, 1200);
}

async function latestSha(api, headers) {
  const meta = await fetch(api + '?ref=' + REMOTE.branch + '&t=' + Date.now(), { headers, cache: 'no-store' });
  if (!meta.ok) return null;
  const info = await meta.json();
  return info.sha || null;
}

function isShaError(msg) {
  const t = String(msg || '').toLowerCase();
  return t.indexOf('does not match') >= 0 || t.indexOf('sha') >= 0 || t.indexOf('409') >= 0;
}

async function pushRemote() {
  const tok = getToken();
  if (!tok) {
    setSyncMsg('Saved on this device. Paste a GitHub token to publish.');
    return;
  }
  const payload = getDb();
  if (!payload) {
    setSyncMsg('Upload failed: app data is not ready.', false);
    return;
  }
  if (pushing) {
    schedulePush();
    return;
  }
  pushing = true;
  setSyncMsg('Uploading to the site\u2026');
  const api = 'https://api.github.com/repos/' + REMOTE.owner + '/' + REMOTE.repo + '/contents/' + REMOTE.path;
  const headers = {
    Authorization: 'Bearer ' + tok,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  const content = utf8ToB64(JSON.stringify(payload));
  let lastErr = '';
  try {
    for (let attempt = 1; attempt <= 6; attempt++) {
      const sha = await latestSha(api, headers);
      const body = {
        message: 'Sync training data ' + new Date().toISOString(),
        content: content,
        branch: REMOTE.branch
      };
      if (sha) body.sha = sha;
      const res = await fetch(api, {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify(body)
      });
      const info = await res.json().catch(() => ({}));
      if (res.ok) {
        setSyncMsg('Uploaded to the site. Other devices will see this after a refresh.', true);
        pushing = false;
        return;
      }
      lastErr = info.message || ('HTTP ' + res.status);
      if (isShaError(lastErr) && attempt < 6) {
        setSyncMsg('Site file changed. Retrying upload (' + attempt + '/5)\u2026');
        await new Promise(r => setTimeout(r, 400 * attempt));
        continue;
      }
      throw new Error(lastErr);
    }
    throw new Error(lastErr || 'Upload failed after retries');
  } catch (err) {
    setSyncMsg('Upload failed: ' + err.message, false);
  } finally {
    pushing = false;
  }
}

function bindSyncUi() {
  const input = document.getElementById('sync-token');
  const saveBtn = document.getElementById('btn-save-token');
  const pullBtn = document.getElementById('btn-pull');
  const pushBtn = document.getElementById('btn-push');
  if (input) input.value = getToken() ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : '';
  if (saveBtn) saveBtn.onclick = function () {
    const val = (input.value || '').trim();
    if (!val || val.indexOf('\u2022') === 0) {
      setSyncMsg(getToken() ? 'Token already saved on this device.' : 'Paste a token first.', !!getToken());
      return;
    }
    localStorage.setItem(TOKEN_KEY, val);
    input.value = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
    setSyncMsg('Token saved on this device.', true);
    pushRemote();
  };
  if (pullBtn) pullBtn.onclick = pullRemote;
  if (pushBtn) pushBtn.onclick = pushRemote;
}

if (typeof save === 'function' && !save._bgfdWrapped) {
  const _save = save;
  save = function (data) {
    if (data) window.db = data;
    _save(data);
    schedulePush();
  };
  save._bgfdWrapped = true;
}

bindSyncUi();
pullRemote();
