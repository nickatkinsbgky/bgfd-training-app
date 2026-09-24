const KEY = 'bgfd-training-app-v2';

function defaultCategories(db) {
  const set = new Set();
  (db.tasks||[]).forEach(t => t.category && set.add(t.category));
  (db.assignments||[]).forEach(a => a.category && set.add(a.category));
  ['PPE','Physical Fitness','Engine Company','Truck Operations','Other'].forEach(c => set.add(c));
  return [...set].sort();
}
function migrate(db) {
  if (!db.categories || !db.categories.length) db.categories = defaultCategories(db);
  (db.assignments||[]).forEach((a,i) => {
    if (!a.assignmentId) a.assignmentId = 'A-' + String(i+1).padStart(4,'0');
    if (!a.category) a.category = 'Other';
  });
  (db.tasks||[]).forEach(t => { if (!t.category) t.category = 'Other'; });
  return db;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('bgfd-training-app-v1');
    if (raw) return migrate(JSON.parse(raw));
  } catch(e) {}
  return migrate(structuredClone(SEED));
}
function save(db) { localStorage.setItem(KEY, JSON.stringify(db)); }

let db = load();
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
  if (m == null || isNaN(m)) return '—';
  const total = Math.round(m*60);
  const mm = Math.floor(total/60);
  const ss = total % 60;
  return mm + ':' + String(ss).padStart(2,'0') + ' (' + m.toFixed(2) + ' min)';
}
function taskMeta(name) { return db.tasks.find(t => t.taskName === name) || {}; }
function peopleNames() { return db.personnel.map(p => p.fullName).sort((a,b)=>a.localeCompare(b)); }
function catOf(row) { return row.category || taskMeta(row.task).category || 'Other'; }

function fillSelect(sel, items, extraFirst) {
  const cur = sel.value;
  sel.innerHTML = (extraFirst || '') + items.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
}
function esc(s) { return String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function fillPeople() {
  document.getElementById('dl-people').innerHTML = peopleNames().map(n => `<option value="${esc(n)}"></option>`).join('');
  fillSelect(document.getElementById('f-task'), db.tasks.map(t => t.taskName));
  fillCats();
}
function fillCats() {
  const cats = [...db.categories].sort();
  fillSelect(document.getElementById('f-cat'), cats);
  fillSelect(document.getElementById('n-cat'), cats);
  fillSelect(document.getElementById('c-cat'), cats, '<option value="">All categories</option>');
}

function nextId() {
  const nums = db.assignments.map(a => parseInt(String(a.assignmentId||'').replace(/\D/g,''),10)).filter(n=>!isNaN(n));
  return 'A-' + String((Math.max(0,...nums)+1)).padStart(4,'0');
}

function setForm(rec) {
  document.getElementById('f-id').value = rec ? rec.assignmentId : '';
  document.getElementById('f-person').value = rec ? rec.personnel : '';
  if (rec && rec.task) document.getElementById('f-task').value = rec.task;
  document.getElementById('f-cat').value = rec ? (rec.category || taskMeta(rec.task).category || '') : '';
  document.getElementById('f-status').value = rec ? rec.status : 'Completed';
  document.getElementById('f-priority').value = rec ? (rec.priority||'') : '';
  document.getElementById('f-due').value = rec ? (rec.dateDue||'') : '';
  document.getElementById('f-done').value = rec ? (rec.dateCompleted||'') : '';
  document.getElementById('f-ctime').value = rec ? (rec.completionTime||'') : '';
  document.getElementById('f-std').value = rec ? (rec.stdTime || taskMeta(rec.task).stdTime || '') : '';
  document.getElementById('f-notes').value = rec ? (rec.notes||'') : '';
  document.getElementById('form-title').textContent = rec ? 'Edit assignment ' + rec.assignmentId : 'Log an assignment / evolution';
  document.getElementById('btn-delete').hidden = !rec;
}

document.getElementById('f-task').addEventListener('change', () => {
  if (document.getElementById('f-id').value) return;
  const meta = taskMeta(document.getElementById('f-task').value);
  if (meta.category) document.getElementById('f-cat').value = meta.category;
  if (meta.stdTime) document.getElementById('f-std').value = meta.stdTime;
});

document.querySelectorAll('nav button').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    ['input','person','personavg','dept','charts','cats','roster'].forEach(id => {
      document.getElementById('tab-'+id).hidden = id !== b.dataset.tab;
    });
    if (b.dataset.tab === 'person') renderPersonList();
    if (b.dataset.tab === 'personavg') renderPersonAvg();
    if (b.dataset.tab === 'dept') renderDept();
    if (b.dataset.tab === 'charts') renderCharts();
    if (b.dataset.tab === 'cats') renderCats();
    if (b.dataset.tab === 'roster') renderRoster();
    if (b.dataset.tab === 'input') renderAllTable();
  };
});

function collectForm() {
  const person = document.getElementById('f-person').value.trim();
  const task = document.getElementById('f-task').value;
  const recP = db.personnel.find(p => p.fullName.toLowerCase() === person.toLowerCase());
  const meta = taskMeta(task);
  const ctime = document.getElementById('f-ctime').value.trim();
  const std = document.getElementById('f-std').value.trim() || meta.stdTime || '';
  let met = '';
  if (ctime && std) {
    const a = timeToSec(ctime), b = timeToSec(std);
    if (a != null && b != null) met = a <= b ? 'Yes' : 'No';
  }
  return {
    person, task, recP, meta, ctime, std, met,
    category: document.getElementById('f-cat').value || meta.category || 'Other'
  };
}

document.getElementById('btn-save').onclick = () => {
  const f = collectForm();
  if (!f.person || !f.task) { document.getElementById('save-msg').textContent = 'Personnel and task are required.'; return; }
  const id = document.getElementById('f-id').value;
  const row = {
    task: f.task,
    personnel: f.recP ? f.recP.fullName : f.person,
    rank: f.recP ? f.recP.rank : '',
    status: document.getElementById('f-status').value,
    priority: document.getElementById('f-priority').value,
    dateDue: document.getElementById('f-due').value,
    dateCompleted: document.getElementById('f-done').value,
    stdTime: f.std,
    completionTime: f.ctime,
    metStandard: f.met,
    notes: document.getElementById('f-notes').value,
    assignmentId: id || nextId(),
    taskId: f.meta.taskId || '',
    category: f.category
  };
  if (id) {
    const i = db.assignments.findIndex(a => a.assignmentId === id);
    if (i >= 0) db.assignments[i] = row;
    else db.assignments.push(row);
  } else db.assignments.push(row);
  if (!f.recP) {
    const parts = f.person.split(',');
    db.personnel.push({ fullName: f.person, lastName: (parts[0]||'').trim(), firstName:(parts[1]||'').trim(), rank:'', active:'Yes', notes:'' });
    fillPeople();
  }
  const t = db.tasks.find(x => x.taskName === f.task);
  if (t) t.category = f.category;
  save(db);
  document.getElementById('save-msg').textContent = (id ? 'Updated ' : 'Saved ') + f.task + ' for ' + row.personnel + '.';
  setForm(null);
  renderAllTable();
};

document.getElementById('btn-reset').onclick = () => {
  setForm(null);
  document.getElementById('save-msg').textContent = '';
};
document.getElementById('btn-delete').onclick = () => {
  const id = document.getElementById('f-id').value;
  if (!id || !confirm('Delete this assignment?')) return;
  db.assignments = db.assignments.filter(a => a.assignmentId !== id);
  save(db);
  setForm(null);
  document.getElementById('save-msg').textContent = 'Deleted ' + id + '.';
  renderAllTable();
};

document.getElementById('btn-export').onclick = () => {
  const blob = new Blob([JSON.stringify(db,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bgfd-training-data.json';
  a.click();
};
document.getElementById('btn-import').onclick = () => document.getElementById('file-import').click();
document.getElementById('file-import').onchange = (e) => {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = () => { db = migrate(JSON.parse(r.result)); save(db); fillPeople(); renderAllTable(); document.getElementById('save-msg').textContent = 'Imported.'; };
  r.readAsText(file);
};

function rowsFor(name) { return db.assignments.filter(a => a.personnel === name); }
function groupByCat(rows) {
  const g = {};
  rows.forEach(r => { const c = catOf(r); (g[c] ||= []).push(r); });
  return g;
}
function pill(st) {
  const cls = String(st||'').replace(/\s+/g,'');
  return `<span class="pill ${cls}">${esc(st||'')}</span>`;
}

function renderAllTable() {
  const pf = (document.getElementById('list-person').value||'').trim().toLowerCase();
  const tf = (document.getElementById('list-task').value||'').trim().toLowerCase();
  const rows = [...db.assignments].reverse().filter(a =>
    (!pf || String(a.personnel).toLowerCase().includes(pf)) &&
    (!tf || String(a.task).toLowerCase().includes(tf))
  );
  let html = `<table><thead><tr><th></th><th>ID</th><th>Personnel</th><th>Task</th><th>Category</th><th>Status</th><th>Completed</th><th>Time</th><th>Met</th></tr></thead><tbody>`;
  rows.forEach(r => {
    html += `<tr>
      <td><button class="btn sm ghost" data-edit="${esc(r.assignmentId)}">Edit</button></td>
      <td>${esc(r.assignmentId)}</td><td>${esc(r.personnel)}</td><td>${esc(r.task)}</td>
      <td>${esc(catOf(r))}</td><td>${pill(r.status)}</td><td>${esc(r.dateCompleted||'')}</td>
      <td>${esc(r.completionTime||'')}</td>
      <td>${r.metStandard==='Yes'?'<span class="ok">Yes</span>':r.metStandard==='No'?'<span class="no">No</span>':'—'}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('all-table').innerHTML = html;
  document.getElementById('all-table').querySelectorAll('[data-edit]').forEach(b => {
    b.onclick = () => {
      const rec = db.assignments.find(a => a.assignmentId === b.dataset.edit);
      if (rec) { setForm(rec); window.scrollTo({top:0,behavior:'smooth'}); }
    };
  });
}
document.getElementById('list-person').oninput = renderAllTable;
document.getElementById('list-task').oninput = renderAllTable;

function renderPersonList() {
  const q = (document.getElementById('p-search').value || '').toLowerCase();
  const box = document.getElementById('p-list');
  box.innerHTML = peopleNames().filter(n => n.toLowerCase().includes(q)).map(n => {
    const p = db.personnel.find(x => x.fullName===n);
    const nAss = rowsFor(n).length;
    return `<button data-name="${esc(n)}"><strong>${esc(n)}</strong><small>${esc(p?p.rank:'')} • ${nAss} assignment${nAss===1?'':'s'}</small></button>`;
  }).join('');
  box.querySelectorAll('button').forEach(b => b.onclick = () => {
    box.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    renderPersonDetail(b.dataset.name);
  });
}
document.getElementById('p-search').oninput = renderPersonList;

function renderPersonDetail(name) {
  const p = db.personnel.find(x => x.fullName===name) || {rank:'', notes:''};
  const rows = rowsFor(name).sort((a,b) => String(a.dateCompleted||a.dateDue||'').localeCompare(String(b.dateCompleted||b.dateDue||'')));
  const grouped = groupByCat(rows);
  let html = `<h2 style="color:var(--text)">${esc(name)}</h2><p class="muted">${esc(p.rank||'')} • ${rows.length} records</p>`;
  if (!rows.length) html += '<p class="muted">No assignments yet.</p>';
  Object.keys(grouped).sort().forEach(cat => {
    html += `<div class="cat-block"><h2>${esc(cat)}</h2><table><thead><tr>
      <th></th><th>Task</th><th>Status</th><th>Due</th><th>Completed</th><th>Time</th><th>Standard</th><th>Met?</th><th>Notes</th>
    </tr></thead><tbody>`;
    grouped[cat].forEach(r => {
      const met = r.metStandard === 'Yes' ? '<span class="ok">Yes</span>' : (r.metStandard === 'No' ? '<span class="no">No</span>' : '—');
      html += `<tr><td><button class="btn sm ghost" data-edit="${esc(r.assignmentId)}">Edit</button></td>
        <td>${esc(r.task)}</td><td>${pill(r.status)}</td><td>${esc(r.dateDue||'')}</td><td>${esc(r.dateCompleted||'')}</td>
        <td>${esc(r.completionTime||'')}</td><td>${esc(r.stdTime||'')}</td><td>${met}</td><td>${esc(r.notes||'')}</td></tr>`;
    });
    html += '</tbody></table></div>';
  });
  document.getElementById('p-detail').innerHTML = html;
  document.getElementById('p-detail').querySelectorAll('[data-edit]').forEach(b => {
    b.onclick = () => {
      const rec = db.assignments.find(a => a.assignmentId === b.dataset.edit);
      if (!rec) return;
      document.querySelector('[data-tab="input"]').click();
      setForm(rec);
    };
  });
}

function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

const COLORS = ['#d4a017','#58a6ff','#3fb950','#ff7b72','#bc8cff','#f0883e','#79c0ff','#e3b341'];

function renderPersonAvg() {
  const name = document.getElementById('a-person').value.trim();
  const out = document.getElementById('a-out');
  destroyChart('personAvg');
  if (!name) { out.innerHTML = '<p class="muted">Choose a name to see category averages.</p>'; return; }
  const rows = rowsFor(name);
  const grouped = groupByCat(rows);
  let html = `<div class="kpis">
    <div class="kpi"><b>${rows.length}</b><span>Assignments</span></div>
    <div class="kpi"><b>${rows.filter(r=>r.status==='Completed').length}</b><span>Completed</span></div>
    <div class="kpi"><b>${rows.filter(r=>r.metStandard==='Yes').length}</b><span>Met standard</span></div>
    <div class="kpi"><b>${rows.filter(r=>r.metStandard==='No').length}</b><span>Missed standard</span></div>
  </div>`;
  const labels = [], data = [];
  html += '<table><thead><tr><th>Category</th><th>Task</th><th>N timed</th><th>Avg time</th><th>Best</th><th>Latest</th><th>Standard</th></tr></thead><tbody>';
  Object.keys(grouped).sort().forEach(cat => {
    const byTask = {};
    grouped[cat].forEach(r => (byTask[r.task] ||= []).push(r));
    Object.keys(byTask).sort().forEach(task => {
      const list = byTask[task];
      const secs = list.map(r => timeToSec(r.completionTime)).filter(s => s!=null);
      const avg = secs.length ? secs.reduce((a,b)=>a+b,0)/secs.length/60 : null;
      const best = secs.length ? Math.min(...secs)/60 : null;
      const latest = [...list].reverse().find(r => r.completionTime);
      if (avg != null) { labels.push(task); data.push(+avg.toFixed(3)); }
      html += `<tr><td>${esc(cat)}</td><td>${esc(task)}</td><td>${secs.length}</td><td>${fmtMin(avg)}</td><td>${fmtMin(best)}</td>
        <td>${latest? esc(latest.completionTime) + (latest.dateCompleted? ' on '+latest.dateCompleted:'') : '—'}</td>
        <td>${esc(taskMeta(task).stdTime || list[0].stdTime || '—')}</td></tr>`;
    });
  });
  html += '</tbody></table>';
  out.innerHTML = html;
  charts.personAvg = new Chart(document.getElementById('chart-person-avg'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Avg minutes — ' + name, data, backgroundColor: COLORS[0] }] },
    options: chartOpts('Person average time (minutes)')
  });
}
document.getElementById('a-person').oninput = renderPersonAvg;
document.getElementById('a-person').onchange = renderPersonAvg;

function chartOpts(title) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: title, color: '#e6edf3' },
      legend: { labels: { color: '#e6edf3' } },
      tooltip: { callbacks: { label: ctx => {
        const v = ctx.parsed.y ?? ctx.parsed;
        return typeof v === 'number' ? ctx.dataset.label + ': ' + v.toFixed(2) + ' min' : '';
      }}}
    },
    scales: {
      x: { ticks: { color: '#8b949e', maxRotation: 45 }, grid: { color: '#30363d' } },
      y: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' }, title: { display:true, text:'Minutes', color:'#8b949e' } }
    }
  };
}

function renderDept() {
  const out = document.getElementById('d-out');
  const timed = db.assignments.filter(a => timeToSec(a.completionTime) != null);
  const cats = {};
  timed.forEach(a => { const c = catOf(a); (cats[c] ||= []).push(a); });
  let html = `<div class="kpis">
    <div class="kpi"><b>${db.assignments.length}</b><span>Total assignments</span></div>
    <div class="kpi"><b>${timed.length}</b><span>Timed evolutions</span></div>
    <div class="kpi"><b>${db.assignments.filter(a=>a.status==='Completed').length}</b><span>Completed</span></div>
    <div class="kpi"><b>${new Set(db.assignments.map(a=>a.personnel)).size}</b><span>People with records</span></div>
  </div>`;
  const barLabels = [], barData = [];
  Object.keys(cats).sort().forEach(cat => {
    html += `<div class="cat-block"><h2>${esc(cat)}</h2>`;
    const byTask = {};
    cats[cat].forEach(r => (byTask[r.task] ||= []).push(r));
    html += '<table><thead><tr><th>Task</th><th>N timed</th><th>Dept avg</th><th>Fastest</th><th>Slowest</th><th>Standard</th><th>% met</th></tr></thead><tbody>';
    Object.keys(byTask).sort().forEach(task => {
      const list = byTask[task];
      const secs = list.map(r => timeToSec(r.completionTime)).filter(s=>s!=null);
      const avg = secs.reduce((a,b)=>a+b,0)/secs.length/60;
      const lo = Math.min(...secs)/60, hi = Math.max(...secs)/60;
      const std = taskMeta(task).stdTime || list.find(x=>x.stdTime)?.stdTime || '';
      const judged = list.filter(r => r.metStandard==='Yes' || r.metStandard==='No');
      const pct = judged.length ? (100*judged.filter(r=>r.metStandard==='Yes').length/judged.length).toFixed(0)+'%' : '—';
      barLabels.push(task); barData.push(+avg.toFixed(3));
      html += `<tr><td>${esc(task)}</td><td>${secs.length}</td><td>${fmtMin(avg)}</td><td>${fmtMin(lo)}</td><td>${fmtMin(hi)}</td><td>${esc(std||'—')}</td><td>${pct}</td></tr>`;
    });
    const all = cats[cat].map(r => timeToSec(r.completionTime)).filter(s=>s!=null);
    const cavg = all.reduce((a,b)=>a+b,0)/all.length/60;
    html += `</tbody></table><p class="note">Category mix average for ${esc(cat)}: <strong>${fmtMin(cavg)}</strong> across ${all.length} times.</p></div>`;
