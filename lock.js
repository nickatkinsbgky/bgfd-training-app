(function () {
  const SESSION = 'bgfd-owner-unlock';
  const EDIT_IDS = [
    'btn-save', 'btn-reset', 'btn-delete', 'btn-import', 'file-import',
    'btn-add-person', 'btn-reset-person', 'btn-delete-person',
    'btn-add-task', 'btn-reset-task', 'btn-delete-task',
    'btn-add-cat'
  ];
  const PASS = 'BGFD-Training';

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
    document.querySelectorAll('#tab-roster input, #tab-roster select, #tab-input input, #tab-input select, #tab-cats input').forEach(el => {
      if (el.id === 'list-person' || el.id === 'list-task' || el.id === 'p-search' || el.id === 'a-person' || el.id === 'c-person' || el.id === 'c-cat' || el.id === 'g-cat') return;
      if (el.closest('#tab-personavg') || el.closest('#tab-charts') || el.closest('#tab-groups') || el.closest('#tab-person')) return;
    });
    const formGrid = document.querySelector('#tab-input .grid');
    if (formGrid) formGrid.style.display = on ? '' : 'none';
    const rosterForms = document.querySelectorAll('#tab-roster .grid');
    rosterForms.forEach(g => { g.style.display = on ? '' : 'none'; });
    const catGrid = document.querySelector('#tab-cats .grid');
    if (catGrid) catGrid.style.display = on ? '' : 'none';
    const hint = document.getElementById('form-hint');
    if (hint && !on) hint.textContent = 'View only. Sign in as owner to add or change records.';
    if (hint && on) hint.textContent = 'Pick a member and task, then enter status and times. Saved in this browser.';
    const btn = document.getElementById('owner-btn');
    if (btn) btn.textContent = on ? 'Owner signed in' : 'Owner sign-in';
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

  const nav = document.querySelector('header nav');
  const btn = document.createElement('button');
  btn.id = 'owner-btn';
  btn.type = 'button';
  btn.textContent = 'Owner sign-in';
  btn.style.borderColor = 'var(--gold)';
  btn.onclick = signIn;
  if (nav) nav.appendChild(btn);

  if (typeof save === 'function') {
    const origSave = save;
    window.save = function (data) {
      if (!unlocked()) return;
      origSave(data);
    };
  }

  apply();
})();
