function renderPersonAvg() {
  const sel = document.getElementById('a-person');
  const out = document.getElementById('a-out');
  if (!sel || !out) return;
  if (!sel.dataset.filled || sel.options.length < 3) {
    const names = (typeof peopleNames === 'function') ? peopleNames() : (db.personnel || []).map(p => p.fullName).sort();
    const keep = sel.value;
    sel.innerHTML = '<option value="">Select personnel</option>' + names.map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
    if (keep) sel.value = keep;
    sel.dataset.filled = '1';
  }
  const name = (sel.value || '').trim();
  destroyChart('personAvg');
  if (!name) {
    out.innerHTML = '<p class="muted">Choose a person to see their averages by task.</p>';
    return;
  }
  const rows = db.assignments.filter(a => a.personnel === name);
  const byTask = {};
  rows.forEach(r => { (byTask[r.task] ||= []).push(r); });
  const tasks = Object.keys(byTask).sort();
  const completed = rows.filter(r => r.status === 'Completed').length;
  const met = rows.filter(r => r.metStandard === 'Yes').length;
  const judged = rows.filter(r => r.metStandard === 'Yes' || r.metStandard === 'No').length;
  let html = '<p class="note">Showing <strong>' + esc(name) + '</strong> — averages calculated from this person’s records only.</p>';
  html += '<div class="kpis"><div class="kpi"><b>' + rows.length + '</b><span>Assignments</span></div>';
  html += '<div class="kpi"><b>' + completed + '</b><span>Completed</span></div>';
  html += '<div class="kpi"><b>' + tasks.length + '</b><span>Tasks</span></div>';
  html += '<div class="kpi"><b>' + (judged ? Math.round(100 * met / judged) + '%' : '—') + '</b><span>% met standard</span></div></div>';
  const labels = [], data = [];
  html += '<table><thead><tr><th>Category</th><th>Task</th><th>Records</th><th>Timed N</th><th>This person avg</th><th>Best</th><th>Latest time</th><th>Standard</th><th>% met</th></tr></thead><tbody>';
  tasks.forEach(task => {
    const list = byTask[task];
    const cat = catOf(list[0]);
    const secs = list.map(r => timeToSec(r.completionTime)).filter(s => s != null);
    const avg = secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length / 60 : null;
    const best = secs.length ? Math.min.apply(null, secs) / 60 : null;
    const latestRow = list.slice().sort((a, b) => String(b.dateCompleted || '').localeCompare(String(a.dateCompleted || '')))[0];
    const latest = timeToSec(latestRow && latestRow.completionTime);
    const j = list.filter(r => r.metStandard === 'Yes' || r.metStandard === 'No');
    const pct = j.length ? (100 * j.filter(r => r.metStandard === 'Yes').length / j.length) : null;
    if (avg != null) { labels.push(task); data.push(+avg.toFixed(3)); }
    html += '<tr><td>' + esc(cat) + '</td><td>' + esc(task) + '</td><td>' + list.length + '</td><td>' + secs.length + '</td><td>' +
      fmtMin(avg) + '</td><td>' + fmtMin(best) + '</td><td>' + (latest != null ? fmtMin(latest / 60) : '—') + '</td><td>' +
      esc(taskMeta(task).stdTime || list[0].stdTime || '—') + '</td><td>' + (pct == null ? '—' : pct.toFixed(0) + '%') + '</td></tr>';
  });
  html += '</tbody></table>';
  if (!rows.length) html += '<p class="muted">No assignments logged for this person yet.</p>';
  else if (!labels.length) html += '<p class="muted">This person has records, but no completion times to average yet.</p>';
  out.innerHTML = html;
  const canvas = document.getElementById('chart-person-avg');
  if (canvas && labels.length) {
    charts.personAvg = new Chart(canvas, {
      type: 'bar',
      data: { labels: labels, datasets: [{ label: name + ' — avg minutes by task', data: data, backgroundColor: (typeof COLORS !== 'undefined' ? COLORS : ['#c62828']) }] },
      options: chartOpts(name + ' — average time by task')
    });
  }
}
(function () {
  const sel = document.getElementById('a-person');
  if (sel) {
    sel.onchange = renderPersonAvg;
    sel.addEventListener('change', renderPersonAvg);
  }
})();
