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

async function pullRemote() {
  setSyncMsg('Loading shared data from the site…');
  try {
    const url = `https://raw.githubusercontent.com/${REMOTE.owner}/${REMOTE.repo}/${REMOTE.branch}/${REMOTE.path}?t=${Date.now()}`;
    const res = await fetch(url);
    if (res.status === 404) {
      setSyncMsg('No shared file on the site yet. First save with a token will create it.');
      return null;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const remote = migrate(await res.json());
    db = remote;
    localStorage.setItem(KEY, JSON.stringify(db));
    if (typeof fillPeople === 'function') fillPeople();
    if (typeof renderAllTable === 'function') renderAllTable();
    setSyncMsg('Using shared data from the site.', true);
    return remote;
  } catch (err) {
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
      content: utf8ToB64(JSON.stringify(db)),
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
  if (input) input.value = getToken() ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : '';
  if (saveBtn) saveBtn.onclick = () => {
    const val = (input.value || '').trim();
    if (!val || val.indexOf('\u2022') === 0) {
      setSyncMsg(getToken() ? 'Token already saved in this browser.' : 'Paste a token first.', !getToken() ? false : true);
      return;
    }
    localStorage.setItem(TOKEN_KEY, val);
    input.value = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
    setSyncMsg('Token saved in this browser only. Next save will upload.', true);
    pushRemote();
  };
  if (pullBtn) pullBtn.onclick = pullRemote;
  if (pushBtn) pushBtn.onclick = pushRemote;
}

bindSyncUi();
pullRemote();
