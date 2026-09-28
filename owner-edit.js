function nextAssignId() {
  const nums = (db.assignments || []).map(a => parseInt(String(a.assignmentId || '').replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
  return 'A-' + String((Math.max(0, ...nums) + 1)).padStart(4, '0');
}
function ownerUnlocked() {
  return sessionStorage.getItem('bgfd-owner-unlock') === '1';
}
(function () {
  const btn = document.getElementById('btn-save');
  if (!btn) return;
  btn.onclick = function () {
    if (!ownerUnlocked()) {
      alert('Sign in as owner to add or change records.');
      return;
    }
    const person = (document.getElementById('f-person').value || '').trim();
    const task = (document.getElementById('f-task').value || '').trim();
    if (!person || !task) {
      document.getElementById('save-msg').textContent = 'Personnel and task are required.';
      return;
    }
    const recP = db.personnel.find(p => p.fullName === person) || {};
    const meta = (typeof taskMeta === 'function') ? taskMeta(task) : {};
    const ctime = (document.getElementById('f-ctime') || {}).value || '';
    const std = ((document.getElementById('f-std') || {}).value || meta.stdTime || '');
    let met = '';
    if (ctime && std && typeof timeToSec === 'function') {
      const a = timeToSec(ctime), b = timeToSec(std);
      if (a != null && b != null) met = a <= b ? 'Yes' : 'No';
    }
    const row = {
      task: task,
      personnel: person,
      rank: recP.rank || '',
      status: document.getElementById('f-status').value,
      dateCompleted: (document.getElementById('f-done') || {}).value || '',
      stdTime: std,
      completionTime: ctime,
      metStandard: met,
      notes: (document.getElementById('f-notes') || {}).value || '',
      assignmentId: nextAssignId(),
      taskId: meta.taskId || '',
      category: document.getElementById('f-cat').value || meta.category || 'Other'
    };
    db.assignments.push(row);
    window.db = db;
    save(db);
    document.getElementById('save-msg').textContent = 'Saved ' + task + ' for ' + person + '.';
    if (typeof renderAllTable === 'function') renderAllTable();
  };
})();
