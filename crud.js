function requireOwner() {
  if (sessionStorage.getItem('bgfd-owner-unlock') !== '1') {
    alert('Sign in as owner to add, edit, or delete records.');
    return false;
  }
  return true;
}
function persist() {
  window.db = db;
  save(db);
  if (typeof fillPeople === 'function') fillPeople();
  if (typeof fillPeopleAll === 'function') fillPeopleAll();
  if (typeof renderAllTable === 'function') renderAllTable();
  if (typeof renderRoster === 'function') renderRoster();
  if (typeof renderCats === 'function') renderCats();
  if (typeof renderPersonList === 'function') renderPersonList();
}
function nextAssignId() {
  const nums = (db.assignments || []).map(a => parseInt(String(a.assignmentId || '').replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
  return 'A-' + String((Math.max(0, ...nums) + 1)).padStart(4, '0');
}
function val(id) {
  const el = document.getElementById(id);
  return el ? (el.value || '').trim() : '';
}
function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v == null ? '' : v;
}

function loadAssignment(id) {
  const rec = db.assignments.find(a => a.assignmentId === id);
  if (!rec) return;
  setVal('f-id', rec.assignmentId);
  setVal('f-person', rec.personnel);
  setVal('f-task', rec.task);
  setVal('f-cat', rec.category || '');
  setVal('f-status', rec.status || 'Completed');
  setVal('f-done', rec.dateCompleted || '');
  setVal('f-ctime', rec.completionTime || '');
  setVal('f-std', rec.stdTime || '');
  setVal('f-notes', rec.notes || '');
  const del = document.getElementById('btn-delete');
  if (del) del.hidden = false;
  const title = document.getElementById('form-title');
  if (title) title.textContent = 'Edit ' + rec.assignmentId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function clearAssignment() {
  setVal('f-id', '');
  setVal('f-person', '');
  setVal('f-done', '');
  setVal('f-ctime', '');
  setVal('f-std', '');
  setVal('f-notes', '');
  const del = document.getElementById('btn-delete');
  if (del) del.hidden = true;
  const title = document.getElementById('form-title');
  if (title) title.textContent = 'Log an assignment / evolution';
}

const _renderAll = typeof renderAllTable === 'function' ? renderAllTable : null;
renderAllTable = function () {
  const box = document.getElementById('all-table');
  if (!box) return;
  const pf = val('list-person').toLowerCase();
  const tf = val('list-task').toLowerCase();
  const rows = db.assignments.slice().reverse().filter(a =>
    (!pf || String(a.personnel).toLowerCase().indexOf(pf) >= 0) &&
    (!tf || String(a.task).toLowerCase().indexOf(tf) >= 0)
  );
  const owner = sessionStorage.getItem('bgfd-owner-unlock') === '1';
  box.innerHTML = '<table><thead><tr>' + (owner ? '<th></th>' : '') + '<th>ID</th><th>Personnel</th><th>Task</th><th>Category</th><th>Status</th><th>Completed</th><th>Time</th></tr></thead><tbody>' +
    rows.map(r => '<tr>' + (owner ? '<td><button type="button" class="btn ghost" data-edit="' + esc(r.assignmentId) + '">Edit</button></td>' : '') +
      '<td>' + esc(r.assignmentId) + '</td><td>' + esc(r.personnel) + '</td><td>' + esc(r.task) + '</td><td>' + esc(typeof catOf === 'function' ? catOf(r) : (r.category || '')) + '</td><td>' + esc(r.status) + '</td><td>' + esc(r.dateCompleted || '') + '</td><td>' + esc(r.completionTime || '') + '</td></tr>').join('') +
    '</tbody></table>';
  box.querySelectorAll('[data-edit]').forEach(b => {
    b.onclick = function () { loadAssignment(b.dataset.edit); };
  });
};

const _renderRoster = typeof renderRoster === 'function' ? renderRoster : function () {};
renderRoster = function () {
  _renderRoster();
  const out = document.getElementById('r-out');
  if (!out || sessionStorage.getItem('bgfd-owner-unlock') !== '1') return;
  out.querySelectorAll('tr').forEach(function () {});
  const people = db.personnel.slice().sort((a,b) => a.fullName.localeCompare(b.fullName));
  out.innerHTML =
    '<p><strong>' + db.personnel.length + '</strong> personnel \u2022 <strong>' + db.tasks.length + '</strong> tasks</p>' +
    '<h2>Personnel</h2><table><thead><tr><th></th><th>Name</th><th>Rank</th><th>Station</th><th>Shift</th><th>Battalion</th></tr></thead><tbody>' +
    people.map(p => '<tr><td><button type="button" class="btn ghost" data-editperson="' + esc(p.fullName) + '">Edit</button></td><td>' + esc(p.fullName) + '</td><td>' + esc(p.rank||'') + '</td><td>' + esc(p.station||'') + '</td><td>' + esc(p.shift||'') + '</td><td>' + esc(p.battalion||'') + '</td></tr>').join('') +
    '</tbody></table><h2 style="margin-top:18px">Tasks</h2><table><thead><tr><th></th><th>Task</th><th>Category</th><th>Standard</th></tr></thead><tbody>' +
    db.tasks.map(t => '<tr><td><button type="button" class="btn ghost" data-edittask="' + esc(t.taskName) + '">Edit</button></td><td>' + esc(t.taskName) + '</td><td>' + esc(t.category||'') + '</td><td>' + esc(t.stdTime||'') + '</td></tr>').join('') +
    '</tbody></table>';
  out.querySelectorAll('[data-editperson]').forEach(b => {
    b.onclick = function () {
      const p = db.personnel.find(x => x.fullName === b.dataset.editperson);
      if (!p) return;
      setVal('n-orig-person', p.fullName);
      setVal('n-name', p.fullName);
      setVal('n-rank', p.rank || '');
      setVal('n-station', p.station || '');
      setVal('n-shift', p.shift || '');
      setVal('n-battalion', p.battalion || '');
      setVal('n-active', p.active || 'Yes');
      setVal('n-pnotes', p.notes || '');
      const d = document.getElementById('btn-delete-person');
      if (d) d.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });
  out.querySelectorAll('[data-edittask]').forEach(b => {
    b.onclick = function () {
      const t = db.tasks.find(x => x.taskName === b.dataset.edittask);
      if (!t) return;
      setVal('n-orig-task', t.taskName);
      setVal('n-task', t.taskName);
      setVal('n-cat', t.category || '');
      setVal('n-std', t.stdTime || '');
      setVal('n-tid', t.taskId || '');
      const d = document.getElementById('btn-delete-task');
      if (d) d.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });
};

function renderCats() {
  const box = document.getElementById('cat-list');
  if (!box) return;
  const owner = sessionStorage.getItem('bgfd-owner-unlock') === '1';
  box.innerHTML = (db.categories || []).slice().sort().map(c => {
    const nA = db.assignments.filter(a => (a.category || '') === c).length;
    return '<div style="margin:8px 0">' + esc(c) + ' <span class="muted">(' + nA + ' records)</span>' +
      (owner ? ' <button type="button" class="btn ghost" data-rencat="' + esc(c) + '">Rename</button> <button type="button" class="btn ghost" data-delcat="' + esc(c) + '">Delete</button>' : '') +
      '</div>';
  }).join('');
  box.querySelectorAll('[data-rencat]').forEach(b => {
    b.onclick = function () {
      if (!requireOwner()) return;
      const neu = prompt('Rename category', b.dataset.rencat);
      if (!neu || neu === b.dataset.rencat) return;
      db.categories = db.categories.map(c => c === b.dataset.rencat ? neu : c);
      db.tasks.forEach(t => { if (t.category === b.dataset.rencat) t.category = neu; });
      db.assignments.forEach(a => { if (a.category === b.dataset.rencat) a.category = neu; });
      persist();
    };
  });
  box.querySelectorAll('[data-delcat]').forEach(b => {
    b.onclick = function () {
      if (!requireOwner()) return;
      if (!confirm('Delete category "' + b.dataset.delcat + '" and move items to Other?')) return;
      db.tasks.forEach(t => { if (t.category === b.dataset.delcat) t.category = 'Other'; });
      db.assignments.forEach(a => { if (a.category === b.dataset.delcat) a.category = 'Other'; });
      db.categories = db.categories.filter(c => c !== b.dataset.delcat);
      if (db.categories.indexOf('Other') < 0) db.categories.push('Other');
      persist();
    };
  });
}

(function bindCrud() {
  const saveA = document.getElementById('btn-save');
  if (saveA) saveA.onclick = function () {
    if (!requireOwner()) return;
    const person = val('f-person'), task = val('f-task');
    if (!person || !task) {
      document.getElementById('save-msg').textContent = 'Personnel and task are required.';
      return;
    }
    const recP = db.personnel.find(p => p.fullName === person) || {};
    const meta = typeof taskMeta === 'function' ? taskMeta(task) : {};
    const ctime = val('f-ctime'), std = val('f-std') || meta.stdTime || '';
    let met = '';
    if (ctime && std && typeof timeToSec === 'function') {
      const x = timeToSec(ctime), y = timeToSec(std);
      if (x != null && y != null) met = x <= y ? 'Yes' : 'No';
    }
    const id = val('f-id') || nextAssignId();
    const row = {
      assignmentId: id, task: task, personnel: person, rank: recP.rank || '',
      status: val('f-status') || 'Completed', dateCompleted: val('f-done'),
      completionTime: ctime, stdTime: std, metStandard: met, notes: val('f-notes'),
      taskId: meta.taskId || '', category: val('f-cat') || meta.category || 'Other'
    };
    const i = db.assignments.findIndex(a => a.assignmentId === id);
    if (i >= 0) db.assignments[i] = row; else db.assignments.push(row);
    persist();
    document.getElementById('save-msg').textContent = (i >= 0 ? 'Updated ' : 'Added ') + task + ' for ' + person + '.';
    clearAssignment();
  };
  const delA = document.getElementById('btn-delete');
  if (delA) delA.onclick = function () {
    if (!requireOwner()) return;
    const id = val('f-id');
    if (!id || !confirm('Delete assignment ' + id + '?')) return;
    db.assignments = db.assignments.filter(a => a.assignmentId !== id);
    persist();
    document.getElementById('save-msg').textContent = 'Deleted ' + id + '.';
    clearAssignment();
  };
  const resetA = document.getElementById('btn-reset');
  if (resetA) resetA.onclick = clearAssignment;

  const saveP = document.getElementById('btn-add-person');
  if (saveP) saveP.onclick = function () {
    if (!requireOwner()) return;
    const name = val('n-name');
    if (!name) { document.getElementById('person-msg').textContent = 'Name is required (Last, First).'; return; }
    const orig = val('n-orig-person');
    const parts = name.split(',');
    const rec = {
      fullName: name, lastName: (parts[0]||'').trim(), firstName: (parts.slice(1).join(',')||'').trim(),
      rank: val('n-rank'), station: val('n-station'), shift: val('n-shift'), battalion: val('n-battalion'),
      active: val('n-active') || 'Yes', notes: val('n-pnotes')
    };
    if (orig) {
      const p = db.personnel.find(x => x.fullName === orig);
      if (p) Object.assign(p, rec);
      db.assignments.forEach(a => { if (a.personnel === orig) { a.personnel = name; a.rank = rec.rank; } });
      document.getElementById('person-msg').textContent = 'Updated ' + name + '.';
    } else {
      db.personnel.push(rec);
      document.getElementById('person-msg').textContent = 'Added ' + name + '.';
    }
    setVal('n-orig-person', ''); setVal('n-name', ''); setVal('n-pnotes', '');
    const d = document.getElementById('btn-delete-person'); if (d) d.hidden = true;
    persist();
  };
  const delP = document.getElementById('btn-delete-person');
  if (delP) delP.onclick = function () {
    if (!requireOwner()) return;
    const orig = val('n-orig-person');
    if (!orig || !confirm('Delete ' + orig + ' and their assignment rows?')) return;
    db.assignments = db.assignments.filter(a => a.personnel !== orig);
    db.personnel = db.personnel.filter(p => p.fullName !== orig);
    persist();
    document.getElementById('person-msg').textContent = 'Deleted ' + orig + '.';
    setVal('n-orig-person', ''); setVal('n-name', '');
    delP.hidden = true;
  };
  const resetP = document.getElementById('btn-reset-person');
  if (resetP) resetP.onclick = function () {
    setVal('n-orig-person', ''); setVal('n-name', ''); setVal('n-rank', ''); setVal('n-station', ''); setVal('n-shift', ''); setVal('n-battalion', ''); setVal('n-pnotes', '');
    if (delP) delP.hidden = true;
  };

  const saveT = document.getElementById('btn-add-task');
  if (saveT) saveT.onclick = function () {
    if (!requireOwner()) return;
    const name = val('n-task');
    if (!name) { document.getElementById('task-msg').textContent = 'Task name is required.'; return; }
    const orig = val('n-orig-task');
    const cat = val('n-cat') || 'Other';
    const std = val('n-std');
    const tid = val('n-tid');
    if (orig) {
      const t = db.tasks.find(x => x.taskName === orig);
      if (t) { t.taskName = name; t.category = cat; t.stdTime = std; if (tid) t.taskId = tid; }
      db.assignments.forEach(a => { if (a.task === orig) { a.task = name; a.category = cat; if (std) a.stdTime = std; } });
      document.getElementById('task-msg').textContent = 'Updated task ' + name + '.';
    } else {
      db.tasks.push({ taskId: tid || ('T-X' + String(db.tasks.length + 1).padStart(2, '0')), taskName: name, category: cat, stdTime: std, active: 'Yes' });
      if (db.categories.indexOf(cat) < 0) db.categories.push(cat);
      document.getElementById('task-msg').textContent = 'Added task ' + name + '.';
    }
    setVal('n-orig-task', ''); setVal('n-task', ''); setVal('n-std', ''); setVal('n-tid', '');
    const d = document.getElementById('btn-delete-task'); if (d) d.hidden = true;
    persist();
  };
  const delT = document.getElementById('btn-delete-task');
  if (delT) delT.onclick = function () {
    if (!requireOwner()) return;
    const orig = val('n-orig-task');
    if (!orig || !confirm('Delete task "' + orig + '" and its assignment rows?')) return;
    db.assignments = db.assignments.filter(a => a.task !== orig);
    db.tasks = db.tasks.filter(t => t.taskName !== orig);
    persist();
    document.getElementById('task-msg').textContent = 'Deleted ' + orig + '.';
    setVal('n-orig-task', ''); setVal('n-task', '');
    delT.hidden = true;
  };
  const resetT = document.getElementById('btn-reset-task');
  if (resetT) resetT.onclick = function () {
    setVal('n-orig-task', ''); setVal('n-task', ''); setVal('n-std', ''); setVal('n-tid', '');
    if (delT) delT.hidden = true;
  };

  const addC = document.getElementById('btn-add-cat');
  if (addC) addC.onclick = function () {
    if (!requireOwner()) return;
    const name = val('cat-new');
    if (!name) return;
    if (db.categories.indexOf(name) >= 0) { alert('That category already exists.'); return; }
    db.categories.push(name);
    persist();
    setVal('cat-new', '');
  };

  document.querySelectorAll('nav button').forEach(b => {
    const prev = b.onclick;
    b.addEventListener('click', function () {
      if (b.dataset.tab === 'cats') renderCats();
      if (b.dataset.tab === 'roster') renderRoster();
      if (b.dataset.tab === 'input') renderAllTable();
    });
  });

  renderAllTable();
})();
