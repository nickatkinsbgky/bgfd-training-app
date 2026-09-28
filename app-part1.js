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

function timeToSec(t) {
  if (!t) return null;
  const parts = String(t).trim().split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}
function taskMeta(name) { return db.tasks.find(t => t.taskName === name) || {}; }
function peopleNames() { return db.personnel.map(p => p.fullName).sort((a, b) => a.localeCompare(b)); }
function catOf(row) { return row.category || taskMeta(row.task).category || 'Other'; }
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c]));
}
function fillSelect(sel, items, extraFirst) {
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = (extraFirst || '') + items.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
function fillCats() {
  const cats = [...db.categories].sort();
  fillSelect(document.getElementById('f-cat'), cats);
  fillSelect(document.getElementById('n-cat'), cats);
  fillSelect(document.getElementById('c-cat'), cats, '<option value="">All categories</option>');
}
function fillPeople() {
  const dl = document.getElementById('dl-people');
  if (dl) dl.innerHTML = peopleNames().map(n => '<option value="' + esc(n) + '"></option>').join('');
  fillSelect(document.getElementById('f-task'), db.tasks.map(t => t.taskName));
  fillCats();
}
function renderAllTable() {
  const box = document.getElementById('all-table');
  if (!box) return;
  const rows = [...db.assignments].reverse();
  box.innerHTML = '<p class="note"><strong>' + db.personnel.length + '</strong> personnel • <strong>' + db.assignments.length + '</strong> assignments</p>' +
    '<table><thead><tr><th>ID</th><th>Personnel</th><th>Task</th><th>Category</th><th>Status</th><th>Completed</th><th>Time</th></tr></thead><tbody>' +
    rows.map(r => '<tr><td>' + esc(r.assignmentId) + '</td><td>' + esc(r.personnel) + '</td><td>' + esc(r.task) + '</td><td>' + esc(catOf(r)) + '</td><td>' + esc(r.status) + '</td><td>' + esc(r.dateCompleted || '') + '</td><td>' + esc(r.completionTime || '') + '</td></tr>').join('') +
    '</tbody></table>';
}
function renderRoster() {
  const out = document.getElementById('r-out');
  if (!out) return;
  const people = [...db.personnel].sort((a, b) => a.fullName.localeCompare(b.fullName));
  out.innerHTML = '<p><strong>' + db.personnel.length + '</strong> personnel • <strong>' + db.tasks.length + '</strong> tasks • <strong>' + db.assignments.length + '</strong> assignments</p>' +
    '<table><thead><tr><th>Name</th><th>Rank</th><th>Station</th><th>Shift</th><th>Battalion</th></tr></thead><tbody>' +
    people.map(p => '<tr><td>' + esc(p.fullName) + '</td><td>' + esc(p.rank || '') + '</td><td>' + esc(p.station || '') + '</td><td>' + esc(p.shift || '') + '</td><td>' + esc(p.battalion || '') + '</td></tr>').join('') +
    '</tbody></table>';
}
function renderPersonList() {
  const box = document.getElementById('p-list');
  if (!box) return;
  box.innerHTML = peopleNames().map(n => '<button data-name="' + esc(n) + '">' + esc(n) + '</button>').join('');
}
function renderPersonAvg() {}
function renderDept() {}
function renderCharts() {}
function renderCats() {}
function chartOpts() { return {}; }

document.querySelectorAll('nav button').forEach(b => {
  b.onclick = function () {
    document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    ['input', 'person', 'personavg', 'dept', 'groups', 'charts', 'cats', 'roster'].forEach(id => {
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
