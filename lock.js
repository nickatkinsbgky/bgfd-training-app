(function () {
  const SESSION = 'bgfd-owner-unlock';
  const EDIT_IDS = [
    'btn-save', 'btn-reset', 'btn-delete',
    'btn-add-person', 'btn-reset-person', 'btn-delete-person',
    'btn-add-task', 'btn-reset-task', 'btn-delete-task',
    'btn-add-cat'
  ];
  const PASS = 'Bomberonick5606!';

  function unlocked() {
    return sessionStorage.getItem(SESSION) === '1';
  }

  function apply() {
    const on = unlocked();
    document.body.classList.toggle('view-only', !on);
    EDIT_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = !on;
    });
    const formGrid = document.querySelector('#tab-input .grid');
    if (formGrid) formGrid.style.display = on ? '' : 'none';
    const rosterForms = document.querySelectorAll('#tab-roster .grid');
    rosterForms.forEach(g => { g.style.display = on ? '' : 'none'; });
    const catGrid = document.querySelector('#tab-cats .grid');
    if (catGrid) catGrid.style.display = on ? '' : 'none';
    const hint = document.getElementById('form-hint');
    if (hint && !on) hint.textContent = 'View only. Sign in as owner to add or change records. Use Restore original data or Import JSON anytime.';
    if (hint && on) hint.textContent = 'Pick a member and task, then enter status and times. Saved in this browser.';
    const btn = document.getElementById('owner-btn');
    if (btn) btn.textContent = on ? 'Owner signed in' : 'Owner sign-in';
    const imp = document.getElementById('btn-import');
    if (imp) imp.hidden = false;
    const rest = document.getElementById('btn-restore-original');
    if (rest) rest.hidden = false;
  }

  function signIn() {
    if (unlocked()) {
      sessionStorage.removeItem(SESSION);
      apply();
      return;
    }
    const entered = window.prompt('Owner password');
    if (entered == null) return;
    if (entered === PASS) {
      sessionStorage.setItem(SESSION, '1');
      apply();
    } else {
      window.alert('Incorrect password. The site stays view-only.');
    }
  }

  function restoreOriginal() {
    if (typeof SEED === 'undefined') {
      alert('Original data files did not load. Hard-refresh the page and try again.');
      return;
    }
    const next = migrate(structuredClone(SEED));
    try { db = next; } catch (e) {}
    window.db = next;
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
    if (typeof fillPeople === 'function') fillPeople();
    if (typeof renderAllTable === 'function') renderAllTable();
    const msg = document.getElementById('save-msg');
    if (msg) msg.textContent = 'Restored original data: ' + (next.personnel||[]).length + ' personnel, ' + (next.tasks||[]).length + ' tasks, ' + (next.assignments||[]).length + ' assignments.';
  }

  const btn = document.getElementById('owner-btn');
  if (btn) btn.onclick = signIn;

  const actions = document.querySelector('#tab-input .row-actions');
  if (actions && !document.getElementById('btn-restore-original')) {
    const rest = document.createElement('button');
    rest.id = 'btn-restore-original';
    rest.type = 'button';
    rest.className = 'btn gold';
    rest.textContent = 'Restore original data';
    rest.onclick = function () {
      if (!confirm('Replace this browser copy with the original 178 people / 61 assignments?')) return;
      restoreOriginal();
    };
    actions.appendChild(rest);
  }

  apply();
})();
