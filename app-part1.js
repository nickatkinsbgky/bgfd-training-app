const KEY = 'bgfd-training-app-v2';

function defaultCategories(store) {
  const set = new Set();
  (store.tasks || []).forEach(t => t.category && set.add(t.category));
  (store.assignments || []).forEach(a => a.category && set.add(a.category));
  ['PPE', 'Physical Fitness', 'Engine Company', 'Truck Operations', 'Other'].forEach(c => set.add(c));
  return [...set].sort();
}
function migrate(store) {
  if (!store.categories || !store.categories.length) store.categories = defaultCategories(store);
  (store.assignments || []).forEach((a, i) => {
    if (!a.assignmentId) a.assignmentId = 'A-' + String(i + 1).padStart(4, '0');
    if (!a.category) a.category = 'Other';
  });
  (store.tasks || []).forEach(t => { if (!t.category) t.category = 'Other'; });
  return store;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('bgfd-training-app-v1');
    if (raw) {
      const parsed = migrate(JSON.parse(raw));
      if ((parsed.personnel || []).length >= 50) return parsed;
    }
  } catch (e) {}
  return migrate(JSON.parse(JSON.stringify(SEED)));
}
function save(store) {
  localStorage.setItem(KEY, JSON.stringify(store));
  window.db = store;
}

let db = load();
window.db = db;
let charts = {};

function peopleNames() { return db.personnel.map(p => p.fullName).sort((a, b) => a.localeCompare(b)); }
function taskMeta(name) { return db.tasks.find(t => t.taskName === name) || {}; }
function catOf(row) { return row.category || taskMeta(row.task).category || 'Other'; }
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, function (c) {
    return ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' })[c];
  });
}
function fillSelect(sel, items, extraFirst) {
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = (extraFirst || '') + items.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
  if ([].slice.call(sel.options).some(function (o) { return o.value === cur; })) sel.value = cur;
}
function fillPeople() {
  const names = peopleNames();
  const tasks = db.tasks.map(t => t.taskName);
  const cats = (db.categories || []).slice().sort();
  fillSelect(document.getElementById('f-person'), names, '<option value="">Select personnel</option>');
  fillSelect(document.getElementById('list-person'), names, '<option value="">All people</option>');
  fillSelect(document.getElementById('a-person'), names, '<option value="">Select personnel</option>');
  fillSelect(document.getElementById('c-person'), names, '<option value="">All / department</option>');
  fillSelect(document.getElementById('f-task'), tasks);
  fillSelect(document.getElementById('list-task'), tasks, '<option value="">All tasks</option>');
  fillSelect(document.getElementById('f-cat'), cats);
  fillSelect(document.getElementById('n-cat'), cats);
  fillSelect(document.getElementById('c-cat'), cats, '<option value="">All categories</option>');
  const hint = document.getElementById('form-hint');
  if (hint) hint.textContent = db.personnel.length + ' personnel • ' + db.assignments.length + ' assignments loaded.';
}
function renderAllTable() {
  const box = document.getElementById('all-table');
  if (!box) return;
  const pf = ((document.getElementById('list-person') || {}).value || '').toLowerCase();
  const tf = ((document.getElementById('list-task') || {}).value || '').toLowerCase();
  const rows = db.assignments.slice().reverse().filter(function (a) {
    return (!pf || String(a.personnel).toLowerCase().indexOf(pf) >= 0) && (!tf || String(a.task).toLowerCase().indexOf(tf) >= 0);
  });
  box.innerHTML = '<p class="note"><strong>' + db.personnel.length + '</strong> personnel • <strong>' + rows.length + '</strong> assignment rows</p>' +
    '<table><thead><tr><th>ID</th><th>Personnel</th><th>Task</th><th>Category</th><th>Status</th><th>Completed</th><th>Time</th></tr></thead><tbody>' +
    rows.map(function (r) {
      return '<tr><td>' + esc(r.assignmentId) + '</td><td>' + esc(r.personnel) + '</td><td>' + esc(r.task) + '</td><td>' + esc(catOf(r)) + '</td><td>' + esc(r.status) + '</td><td>' + esc(r.dateCompleted || '') + '</td><td>' + esc(r.completionTime || '') + '</td></tr>';
    }).join('') + '</tbody></table>';
}
function renderRoster() {
  const out = document.getElementById('r-out');
  if (!out) return;
  const people = db.personnel.slice().sort(function (a, b) { return a.fullName.localeCompare(b.fullName); });
  out.innerHTML = '<p><strong>' + db.personnel.length + '</strong> personnel • <strong>' + db.tasks.length + '</strong> tasks • <strong>' + db.assignments.length + '</strong> assignments</p>' +
    '<table><thead><tr><th>Name</th><th>Rank</th><th>Station</th><th>Shift</th><th>Battalion</th></tr></thead><tbody>' +
    people.map(function (p) {
      return '<tr><td>' + esc(p.fullName) + '</td><td>' + esc(p.rank || '') + '</td><td>' + esc(p.station || '') + '</td><td>' + esc(p.shift || '') + '</td><td>' + esc(p.battalion || '') + '</td></tr>';
    }).join('') + '</tbody></table>';
}
function renderPersonList() {
  const box = document.getElementById('p-list');
  if (!box) return;
  const q = ((document.getElementById('p-search') || {}).value || '').toLowerCase();
  box.innerHTML = peopleNames().filter(function (n) { return n.toLowerCase().indexOf(q) >= 0; }).map(function (n) {
    return '<button type="button" data-name="' + esc(n) + '">' + esc(n) + '</button>';
  }).join('');
}
function renderPersonAvg() {}
function renderDept() {}
function renderCharts() {}
function renderCats() {}
function chartOpts() { return {}; }

if (document.getElementById('list-person')) document.getElementById('list-person').onchange = renderAllTable;
if (document.getElementById('list-task')) document.getElementById('list-task').onchange = renderAllTable;
if (document.getElementById('p-search')) document.getElementById('p-search').oninput = renderPersonList;
if (document.getElementById('btn-export')) document.getElementById('btn-export').onclick = function () {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bgfd-training-data.json';
  a.click();
};

document.querySelectorAll('nav button').forEach(function (b) {
  b.onclick = function () {
    document.querySelectorAll('nav button').forEach(function (x) { x.classList.remove('active'); });
    b.classList.add('active');
    ['input', 'person', 'personavg', 'dept', 'groups', 'charts', 'cats', 'roster'].forEach(function (id) {
      const el = document.getElementById('tab-' + id);
      if (el) el.hidden = id !== b.dataset.tab;
    });
    if (b.dataset.tab === 'person') renderPersonList();
    if (b.dataset.tab === 'roster') renderRoster();
    if (b.dataset.tab === 'input') renderAllTable();
  };
});

fillPeople();
renderAllTable();
