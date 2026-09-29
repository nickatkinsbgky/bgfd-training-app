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
function mergeMissingPersonnel(store) {
  const extra = [].concat(window.SEED_PERSONNEL || [], window.SEED_PERSONNEL_A || [], window.SEED_PERSONNEL_B || []);
  store.personnel = store.personnel || [];
  const have = new Set(store.personnel.map(p => p && p.fullName));
  let changed = 0;
  extra.forEach(p => {
    if (!p || !p.fullName) return;
    if (!have.has(p.fullName)) {
      store.personnel.push(p);
      have.add(p.fullName);
      changed++;
    }
  });
  store.personnel.forEach(p => {
    if (p && p.fullName === 'Rich, Brittany') {
      if (p.station !== 'ADM') { p.station = 'ADM'; p.shift = ''; p.battalion = ''; changed++; }
      if (!p.rank) p.rank = 'INSPECTOR';
    }
  });
  return changed;
}
function mergeOCourse(store) {
  const extra = window.SEED_OCOURSE || [];
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
  store.assignments = store.assignments || [];
  let changed = 0;
  store.assignments.forEach(a => {
    if (a && map[a.personnel]) { a.personnel = map[a.personnel]; changed++; }
  });
  const have = new Set(store.assignments.map(a => a.assignmentId));
  extra.forEach(a => {
    if (!a || !a.assignmentId) return;
    if (map[a.personnel]) a.personnel = map[a.personnel];
    if (!have.has(a.assignmentId)) {
      store.assignments.push(a);
      have.add(a.assignmentId);
      changed++;
    } else {
      const cur = store.assignments.find(x => x.assignmentId === a.assignmentId);
      if (cur && cur.personnel !== a.personnel) { cur.personnel = a.personnel; changed++; }
    }
  });
  changed += mergeMissingPersonnel(store);
  if (changed) {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
  }
  return store;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('bgfd-training-app-v1');
    if (raw) {
      const parsed = migrate(JSON.parse(raw));
      if ((parsed.personnel || []).length >= 50) return mergeOCourse(parsed);
    }
  } catch (e) {}
  return mergeOCourse(migrate(JSON.parse(JSON.stringify(SEED))));
}
function save(store) { localStorage.setItem(KEY, JSON.stringify(store)); window.db = store; }
let db = load();
window.db = db;
let charts = {};
function timeToSec(t) {
  if (!t) return null;
  const parts = String(t).trim().split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
  if (parts.length === 2) return parts[0]*60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}
function fmtMin(m) {
  if (m == null || isNaN(m)) return '\u2014';
  const total = Math.round(m*60);
  return Math.floor(total/60) + ':' + String(total%60).padStart(2,'0') + ' (' + m.toFixed(2) + ' min)';
}
function taskMeta(name) { return db.tasks.find(t => t.taskName === name) || {}; }
function peopleNames() { return db.personnel.map(p => p.fullName).sort((a,b)=>a.localeCompare(b)); }
function catOf(row) { return row.category || taskMeta(row.task).category || 'Other'; }
function esc(s) { return String(s??'').replace(/[&<>"']/g, c => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c])); }
function fillSelect(sel, items, extraFirst) {
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = (extraFirst || '') + items.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
  if ([].slice.call(sel.options).some(o => o.value === cur)) sel.value = cur;
}
function fillCats() {
  const cats = [...(db.categories||[])].sort();
  fillSelect(document.getElementById('f-cat'), cats);
  fillSelect(document.getElementById('n-cat'), cats);
  fillSelect(document.getElementById('c-cat'), cats, '<option value="">All categories</option>');
  fillSelect(document.getElementById('g-cat'), cats, '<option value="">All categories</option>');
}
function fillPeople() {
  const names = peopleNames();
  fillSelect(document.getElementById('f-person'), names, '<option value="">Select personnel</option>');
  fillSelect(document.getElementById('list-person'), names, '<option value="">All people</option>');
  fillSelect(document.getElementById('a-person'), names, '<option value="">Select personnel</option>');
  fillSelect(document.getElementById('c-person'), names, '<option value="">All / department</option>');
  fillSelect(document.getElementById('f-task'), db.tasks.map(t => t.taskName));
  fillSelect(document.getElementById('list-task'), db.tasks.map(t => t.taskName), '<option value="">All tasks</option>');
  fillCats();
  const hint = document.getElementById('form-hint');
  if (hint) hint.textContent = db.personnel.length + ' personnel \u2022 ' + db.assignments.length + ' assignments loaded.';
}
function rowsFor(name) { return db.assignments.filter(a => a.personnel === name); }
function groupByCat(rows) {
  const g = {};
  rows.forEach(r => { const c = catOf(r); (g[c] ||= []).push(r); });
  return g;
}
function pill(st) {
  const cls = String(st||'').replace(/\s+/g,'');
  return '<span class="pill ' + cls + '">' + esc(st||'') + '</span>';
}
function renderAllTable() {
  const box = document.getElementById('all-table');
  if (!box) return;
  const pf = ((document.getElementById('list-person')||{}).value||'').toLowerCase();
  const tf = ((document.getElementById('list-task')||{}).value||'').toLowerCase();
  const rows = db.assignments.slice().reverse().filter(a =>
    (!pf || String(a.personnel).toLowerCase().indexOf(pf)>=0) && (!tf || String(a.task).toLowerCase().indexOf(tf)>=0)
  );
  box.innerHTML = '<table><thead><tr><th>ID</th><th>Personnel</th><th>Task</th><th>Category</th><th>Status</th><th>Completed</th><th>Time</th><th>Met</th></tr></thead><tbody>' +
    rows.map(r => '<tr><td>'+esc(r.assignmentId)+'</td><td>'+esc(r.personnel)+'</td><td>'+esc(r.task)+'</td><td>'+esc(catOf(r))+'</td><td>'+pill(r.status)+'</td><td>'+esc(r.dateCompleted||'')+'</td><td>'+esc(r.completionTime||'')+'</td><td>'+(r.metStandard==='Yes'?'<span class="ok">Yes</span>':r.metStandard==='No'?'<span class="no">No</span>':'\u2014')+'</td></tr>').join('') +
    '</tbody></table>';
}
function renderPersonList() {
  const box = document.getElementById('p-list');
  if (!box) return;
  const q = ((document.getElementById('p-search')||{}).value||'').toLowerCase();
  box.innerHTML = peopleNames().filter(n => n.toLowerCase().indexOf(q)>=0).map(n => {
    const p = db.personnel.find(x => x.fullName===n);
    const nAss = rowsFor(n).length;
    return '<button type="button" data-name="'+esc(n)+'"><strong>'+esc(n)+'</strong><small>'+esc(p?p.rank:'')+' \u2022 '+nAss+' assignment'+(nAss===1?'':'s')+'</small></button>';
  }).join('');
  box.querySelectorAll('button').forEach(b => b.onclick = function () {
    box.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    renderPersonDetail(b.dataset.name);
  });
}
function renderPersonDetail(name) {
  const p = db.personnel.find(x => x.fullName===name) || {rank:''};
  const rows = rowsFor(name);
  const grouped = groupByCat(rows);
  let html = '<h2 style="color:var(--text)">'+esc(name)+'</h2><p class="muted">'+esc(p.rank||'')+' \u2022 '+rows.length+' records</p>';
  if (!rows.length) html += '<p class="muted">No assignments yet.</p>';
  Object.keys(grouped).sort().forEach(cat => {
    html += '<div class="cat-block"><h2>'+esc(cat)+'</h2><table><thead><tr><th>Task</th><th>Status</th><th>Due</th><th>Completed</th><th>Time</th><th>Standard</th><th>Met?</th><th>Notes</th></tr></thead><tbody>';
    grouped[cat].forEach(r => {
      const met = r.metStandard==='Yes' ? '<span class="ok">Yes</span>' : (r.metStandard==='No' ? '<span class="no">No</span>' : '\u2014');
      html += '<tr><td>'+esc(r.task)+'</td><td>'+pill(r.status)+'</td><td>'+esc(r.dateDue||'')+'</td><td>'+esc(r.dateCompleted||'')+'</td><td>'+esc(r.completionTime||'')+'</td><td>'+esc(r.stdTime||'')+'</td><td>'+met+'</td><td>'+esc(r.notes||'')+'</td></tr>';
    });
    html += '</tbody></table></div>';
  });
  document.getElementById('p-detail').innerHTML = html;
}
function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }
const COLORS = ['#d4a017','#58a6ff','#3fb950','#ff7b72','#bc8cff','#f0883e','#79c0ff','#e3b341'];
function chartOpts(title) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { title: { display: true, text: title, color: '#e6edf3' }, legend: { labels: { color: '#e6edf3' } } },
    scales: {
      x: { ticks: { color: '#8b949e', maxRotation: 45 }, grid: { color: '#30363d' } },
      y: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' }, title: { display:true, text:'Minutes', color:'#8b949e' } }
    }
  };
}
function renderPersonAvg() {
  const name = (document.getElementById('a-person').value||'').trim();
  const out = document.getElementById('a-out');
  destroyChart('personAvg');
  if (!name) { out.innerHTML = '<p class="muted">Choose a name to see averages by task.</p>'; return; }
  const rows = rowsFor(name);
  const grouped = groupByCat(rows);
  let html = '<div class="kpis"><div class="kpi"><b>'+rows.length+'</b><span>Assignments</span></div><div class="kpi"><b>'+rows.filter(r=>r.status==='Completed').length+'</b><span>Completed</span></div><div class="kpi"><b>'+rows.filter(r=>r.metStandard==='Yes').length+'</b><span>Met standard</span></div></div>';
  const labels = [], data = [];
  html += '<table><thead><tr><th>Category</th><th>Task</th><th>N timed</th><th>Avg time</th><th>Best</th><th>Standard</th></tr></thead><tbody>';
  Object.keys(grouped).sort().forEach(cat => {
    const byTask = {};
    grouped[cat].forEach(r => (byTask[r.task] ||= []).push(r));
    Object.keys(byTask).sort().forEach(task => {
      const list = byTask[task];
      const secs = list.map(r => timeToSec(r.completionTime)).filter(s => s!=null);
      const avg = secs.length ? secs.reduce((a,b)=>a+b,0)/secs.length/60 : null;
      const best = secs.length ? Math.min.apply(null, secs)/60 : null;
      if (avg != null) { labels.push(task); data.push(+avg.toFixed(3)); }
      html += '<tr><td>'+esc(cat)+'</td><td>'+esc(task)+'</td><td>'+secs.length+'</td><td>'+fmtMin(avg)+'</td><td>'+fmtMin(best)+'</td><td>'+esc(taskMeta(task).stdTime || list[0].stdTime || '\u2014')+'</td></tr>';
    });
  });
  html += '</tbody></table>';
  out.innerHTML = html;
  const canvas = document.getElementById('chart-person-avg');
  if (canvas) charts.personAvg = new Chart(canvas, { type: 'bar', data: { labels, datasets: [{ label: 'Avg minutes \u2014 ' + name, data, backgroundColor: COLORS[0] }] }, options: chartOpts('Person average time (minutes)') });
}
function renderDept() {
  const out = document.getElementById('d-out');
  const timed = db.assignments.filter(a => timeToSec(a.completionTime) != null);
  const cats = {};
  timed.forEach(a => { const c = catOf(a); (cats[c] ||= []).push(a); });
  let html = '<div class="kpis"><div class="kpi"><b>'+db.assignments.length+'</b><span>Total assignments</span></div><div class="kpi"><b>'+timed.length+'</b><span>Timed evolutions</span></div><div class="kpi"><b>'+db.assignments.filter(a=>a.status==='Completed').length+'</b><span>Completed</span></div><div class="kpi"><b>'+new Set(db.assignments.map(a=>a.personnel)).size+'</b><span>People with records</span></div></div>';
  const barLabels = [], barData = [];
  Object.keys(cats).sort().forEach(cat => {
    html += '<div class="cat-block"><h2>'+esc(cat)+'</h2>';
    const byTask = {};
    cats[cat].forEach(r => (byTask[r.task] ||= []).push(r));
    html += '<table><thead><tr><th>Task</th><th>N timed</th><th>Dept avg</th><th>Fastest</th><th>Slowest</th><th>Standard</th><th>% met</th></tr></thead><tbody>';
    Object.keys(byTask).sort().forEach(task => {
      const list = byTask[task];
      const secs = list.map(r => timeToSec(r.completionTime)).filter(s=>s!=null);
      const avg = secs.reduce((a,b)=>a+b,0)/secs.length/60;
      const lo = Math.min.apply(null, secs)/60, hi = Math.max.apply(null, secs)/60;
      const judged = list.filter(r => r.metStandard==='Yes' || r.metStandard==='No');
      const pct = judged.length ? (100*judged.filter(r=>r.metStandard==='Yes').length/judged.length).toFixed(0)+'%' : '\u2014';
      barLabels.push(task); barData.push(+avg.toFixed(3));
      html += '<tr><td>'+esc(task)+'</td><td>'+secs.length+'</td><td>'+fmtMin(avg)+'</td><td>'+fmtMin(lo)+'</td><td>'+fmtMin(hi)+'</td><td>'+esc(taskMeta(task).stdTime || '\u2014')+'</td><td>'+pct+'</td></tr>';
    });
    html += '</tbody></table></div>';
  });
  out.innerHTML = html;
  destroyChart('deptAvg');
  const canvas = document.getElementById('chart-dept-avg');
  if (canvas) charts.deptAvg = new Chart(canvas, { type: 'bar', data: { labels: barLabels, datasets: [{ label: 'Department avg minutes', data: barData, backgroundColor: COLORS }] }, options: chartOpts('Department average by task (minutes)') });
}
