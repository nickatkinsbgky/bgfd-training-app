if (!document.getElementById('btn-delete')) {
  const b = document.createElement('button');
  b.id = 'btn-delete';
  b.hidden = true;
  document.body.appendChild(b);
}

function filteredTimed() {
  const person = (document.getElementById('c-person').value || '').trim();
  const cat = document.getElementById('c-cat').value;
  return db.assignments.filter(a => {
    if (timeToSec(a.completionTime) == null) return false;
    if (person && a.personnel !== person) return false;
    if (cat && catOf(a) !== cat) return false;
    return true;
  });
}

function renderCharts() {
  const personEl = document.getElementById('c-person');
  const catEl = document.getElementById('c-cat');
  if (!personEl || !document.getElementById('chart-trend')) return;
  const rows = filteredTimed().slice().sort((a,b) => String(a.dateCompleted||a.dateDue||'').localeCompare(String(b.dateCompleted||b.dateDue||'')));
  const person = (personEl.value||'').trim();
  const scope = person || 'Department';
  const byTask = {};
  rows.forEach(r => (byTask[r.task] ||= []).push(r));
  const dates = [...new Set(rows.map(r => r.dateCompleted || r.dateDue || ''))].filter(Boolean).sort();
  destroyChart('trend');
  charts.trend = new Chart(document.getElementById('chart-trend'), {
    type: 'line',
    data: {
      labels: dates,
      datasets: Object.keys(byTask).map((task,i) => ({
        label: task,
        data: dates.map(d => {
          const hits = byTask[task].filter(r => (r.dateCompleted||r.dateDue) === d);
          if (!hits.length) return null;
          const secs = hits.map(h => timeToSec(h.completionTime)).filter(s=>s!=null);
          return secs.length ? +(secs.reduce((a,b)=>a+b,0)/secs.length/60).toFixed(3) : null;
        }),
        borderColor: COLORS[i % COLORS.length],
        backgroundColor: COLORS[i % COLORS.length],
        spanGaps: true, tension: 0.2
      }))
    },
    options: chartOpts(scope + ' \u2014 time trend by date')
  });
  destroyChart('compare');
  if (person) {
    const labels = Object.keys(byTask);
    const data = labels.map(t => {
      const secs = byTask[t].map(r => timeToSec(r.completionTime)).filter(s=>s!=null);
      return secs.length ? +(secs.reduce((a,b)=>a+b,0)/secs.length/60).toFixed(3) : 0;
    });
    charts.compare = new Chart(document.getElementById('chart-compare'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Avg min', data, backgroundColor: COLORS }] },
      options: chartOpts(person + ' \u2014 task comparison')
    });
  } else {
    const people = {};
    rows.forEach(r => (people[r.personnel] ||= []).push(r));
    const labels = Object.keys(people).sort();
    const data = labels.map(n => {
      const secs = people[n].map(r => timeToSec(r.completionTime)).filter(s=>s!=null);
      return secs.length ? +(secs.reduce((a,b)=>a+b,0)/secs.length/60).toFixed(3) : 0;
    });
    charts.compare = new Chart(document.getElementById('chart-compare'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Avg min (mixed tasks)', data, backgroundColor: COLORS[1] }] },
      options: chartOpts('People comparison \u2014 average minutes')
    });
  }
  destroyChart('status');
  const statuses = ['Completed','In Progress','Not Started','At Risk','Overdue'];
  const pool = person ? rowsFor(person) : db.assignments;
  charts.status = new Chart(document.getElementById('chart-status'), {
    type: 'doughnut',
    data: { labels: statuses, datasets: [{ data: statuses.map(s => pool.filter(a => a.status === s).length), backgroundColor: ['#3fb950','#58a6ff','#8b949e','#e3b341','#ff7b72'] }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ title:{display:true,text:scope+' \u2014 status mix',color:'#e6edf3'}, legend:{labels:{color:'#e6edf3'}} } }
  });
  destroyChart('met');
  const yes = pool.filter(a => a.metStandard==='Yes').length;
  const no = pool.filter(a => a.metStandard==='No').length;
  const unk = pool.filter(a => a.metStandard!=='Yes' && a.metStandard!=='No').length;
  charts.met = new Chart(document.getElementById('chart-met'), {
    type: 'doughnut',
    data: { labels: ['Met standard','Missed','No standard / not timed'], datasets: [{ data:[yes,no,unk], backgroundColor:['#3fb950','#ff7b72','#8b949e'] }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ title:{display:true,text:scope+' \u2014 standard time',color:'#e6edf3'}, legend:{labels:{color:'#e6edf3'}} } }
  });
}

function renderRoster() {
  const out = document.getElementById('r-out');
  if (!out) return;
  const people = [...db.personnel].sort((a,b) => a.fullName.localeCompare(b.fullName));
  out.innerHTML = '<p><strong>' + db.personnel.length + '</strong> personnel \u2022 <strong>' + db.tasks.length + '</strong> tasks \u2022 <strong>' + db.assignments.length + '</strong> assignments</p>' +
    '<table><thead><tr><th>Name</th><th>Rank</th><th>Station</th><th>Shift</th><th>Battalion</th></tr></thead><tbody>' +
    people.map(p => '<tr><td>' + esc(p.fullName) + '</td><td>' + esc(p.rank||'') + '</td><td>' + esc(p.station||'') + '</td><td>' + esc(p.shift||'') + '</td><td>' + esc(p.battalion||'') + '</td></tr>').join('') +
    '</tbody></table>';
}

function fillPeopleAll() {
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
  fillSelect(document.getElementById('g-cat'), cats, '<option value="">All categories</option>');
  const hint = document.getElementById('form-hint');
  if (hint) hint.textContent = db.personnel.length + ' personnel \u2022 ' + db.assignments.length + ' assignments loaded.';
}

document.querySelectorAll('nav button').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    ['input','person','personavg','dept','groups','charts','cats','roster'].forEach(id => {
      const el = document.getElementById('tab-'+id);
      if (el) el.hidden = id !== b.dataset.tab;
    });
    if (b.dataset.tab === 'person') renderPersonList();
    if (b.dataset.tab === 'personavg') renderPersonAvg();
    if (b.dataset.tab === 'dept') renderDept();
    if (b.dataset.tab === 'groups' && typeof renderGroupAvgs === 'function') renderGroupAvgs();
    if (b.dataset.tab === 'charts') {
      renderCharts();
      if (typeof renderGroupChartsOnChartsTab === 'function') renderGroupChartsOnChartsTab();
    }
    if (b.dataset.tab === 'roster') renderRoster();
    if (b.dataset.tab === 'input') renderAllTable();
  };
});

fillPeopleAll();
renderAllTable();
