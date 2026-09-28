function restoreOriginalData() {
  if (typeof SEED === 'undefined') {
    alert('Original data files did not load. Hard-refresh the page and try again.');
    return;
  }
  const next = (typeof migrate === 'function') ? migrate(JSON.parse(JSON.stringify(SEED))) : JSON.parse(JSON.stringify(SEED));
  try { db = next; } catch (e) {}
  window.db = next;
  try {
    const key = (typeof KEY !== 'undefined') ? KEY : 'bgfd-training-app-v2';
    localStorage.setItem(key, JSON.stringify(next));
  } catch (e) {}
  if (typeof fillPeople === 'function') fillPeople();
  if (typeof renderAllTable === 'function') renderAllTable();
  if (typeof renderRoster === 'function') renderRoster();
  const msg = document.getElementById('save-msg');
  if (msg) {
    msg.textContent = 'Restored original data: ' +
      (next.personnel || []).length + ' personnel, ' +
      (next.tasks || []).length + ' tasks, ' +
      (next.assignments || []).length + ' assignments.';
  }
  alert('Restored original data: ' + (next.personnel || []).length + ' people, ' + (next.assignments || []).length + ' assignments.');
}

(function () {
  const btn = document.getElementById('btn-restore-original');
  if (btn) {
    btn.onclick = function () {
      if (!confirm('Replace this browser copy with the original 178 people / 61 assignments?')) return;
      try { restoreOriginalData(); }
      catch (err) { alert('Restore failed: ' + err.message); }
    };
  }
})();
