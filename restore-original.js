(function () {
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

  const actions = document.querySelector('#tab-input .row-actions');
  if (actions && !document.getElementById('btn-restore-original')) {
    const btn = document.createElement('button');
    btn.id = 'btn-restore-original';
    btn.type = 'button';
    btn.className = 'btn gold';
    btn.textContent = 'Restore original data';
    btn.onclick = function () {
      if (!confirm('Replace this browser\u2019s copy with the original 178 people / 61 assignments?')) return;
      restoreOriginal();
    };
    actions.appendChild(btn);
  }

  const file = document.getElementById('file-import');
  if (file) {
    file.addEventListener('change', function (e) {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = function () {
        try {
          const next = migrate(JSON.parse(r.result));
          try { db = next; } catch (err) {}
          window.db = next;
          localStorage.setItem(KEY, JSON.stringify(next));
          if (typeof fillPeople === 'function') fillPeople();
          if (typeof renderAllTable === 'function') renderAllTable();
          const msg = document.getElementById('save-msg');
          if (msg) msg.textContent = 'Imported ' + (next.assignments||[]).length + ' assignments and ' + (next.personnel||[]).length + ' personnel into this browser.';
        } catch (err) {
          alert('Could not import that file: ' + err.message);
        }
      };
      r.readAsText(f);
    });
  }
})();
