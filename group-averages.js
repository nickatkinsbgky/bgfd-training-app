(function () {
  function personMeta(name) {
    return db.personnel.find(p => p.fullName === name) || {};
  }
  function groupKey(assignment, field) {
    const p = personMeta(assignment.personnel);
    const v = String(p[field] || '').trim();
    return v || 'Unassigned';
  }
  function sortGroupKeys(keys, field) {
    return keys.sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      const na = Number(a), nb = Number(b);
      if (field !== 'shift' && !isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });
  }
  function timedRows(cat) {
    return db.assignments.filter(a => {
      if (timeToSec(a.completionTime) == null) return false;
      if (cat && catOf(a) !== cat) return false;
      return true;
    });
  }
  function avgMinutes(rows) {
    const secs = rows.map(r => timeToSec(r.completionTime)).filter(s => s != null);
    if (!secs.length) return null;
    return secs.reduce((a, b) => a + b, 0) / secs.length / 60;
  }
  function groupStats(field, cat) {
    const rows = timedRows(cat);
    const buckets = {};
    rows.forEach(r => {
      const k = groupKey(r, field);
      (buckets[k] ||= []).push(r);
    });
    const keys = sortGroupKeys(Object.keys(buckets), field);
    return keys.map(k => {
      const list = buckets[k];
      const people = new Set(list.map(r => r.personnel));
      const judged = list.filter(r => r.metStandard === 'Yes' || r.metStandard === 'No');
      const met = judged.filter(r => r.metStandard === 'Yes').length;
      const byTask = {};
      list.forEach(r => (byTask[r.task] ||= []).push(r));
      return {
        key: k,
        n: list.length,
        people: people.size,
        avg: avgMinutes(list),
        pctMet: judged.length ? (100 * met / judged.length) : null,
        tasks: Object.keys(byTask).sort().map(task => ({
          task: task,
          n: byTask[task].length,
          avg: avgMinutes(byTask[task])
        }))
      };
    });
  }

  function tableFor(title, field, cat) {
    const stats = groupStats(field, cat);
    if (!stats.length) return '<p class="muted">No timed records for ' + esc(title.toLowerCase()) + '.</p>';
    let html = '<div class="cat-block"><h2>' + esc(title) + '</h2>';
    html += '<table><thead><tr><th>' + esc(title.replace(/ averages$/i, '')) + '</th><th>People</th><th>Timed N</th><th>Avg time</th><th>% met</th><th>By task</th></tr></thead><tbody>';
    stats.forEach(s => {
      const taskBits = s.tasks.map(t => esc(t.task) + ' ' + fmtMin(t.avg) + ' (n=' + t.n + ')').join('<br>');
      html += '<tr><td>' + esc(s.key) + '</td><td>' + s.people + '</td><td>' + s.n + '</td><td>' + fmtMin(s.avg) + '</td><td>' +
        (s.pctMet == null ? '\u2014' : s.pctMet.toFixed(0) + '%') + '</td><td>' + taskBits + '</td></tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function drawGroupBar(canvasId, chartKey, field, title, cat) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    const stats = groupStats(field, cat);
    destroyChart(chartKey);
    charts[chartKey] = new Chart(el, {
      type: 'bar',
      data: {
        labels: stats.map(s => field === 'shift' && s.key !== 'Unassigned' ? ('Shift ' + s.key) : (field === 'battalion' && s.key !== 'Unassigned' ? ('Battalion ' + s.key) : (field === 'station' && s.key !== 'Unassigned' ? ('Sta ' + s.key) : s.key))),
        datasets: [{ label: 'Avg minutes', data: stats.map(s => s.avg == null ? 0 : +s.avg.toFixed(3)), backgroundColor: COLORS }]
      },
      options: chartOpts(title)
    });
  }

  window.renderGroupAvgs = function () {
    const catSel = document.getElementById('g-cat');
    if (catSel && !catSel.dataset.filled) {
      const cats = [...db.categories].sort();
      catSel.innerHTML = '<option value="">All categories</option>' + cats.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
      catSel.dataset.filled = '1';
    }
    const cat = catSel ? catSel.value : '';
    drawGroupBar('chart-g-shift', 'gShift', 'shift', 'Average minutes by shift', cat);
    drawGroupBar('chart-g-station', 'gStation', 'station', 'Average minutes by station', cat);
    drawGroupBar('chart-g-battalion', 'gBattalion', 'battalion', 'Average minutes by battalion', cat);
    const out = document.getElementById('g-out');
    if (out) {
      out.innerHTML = tableFor('Shift averages', 'shift', cat) +
        tableFor('Station averages', 'station', cat) +
        tableFor('Battalion averages', 'battalion', cat);
    }
  };

  window.renderGroupChartsOnChartsTab = function () {
    const cat = document.getElementById('c-cat') ? document.getElementById('c-cat').value : '';
    drawGroupBar('chart-c-shift', 'cShift', 'shift', 'Charts \u2014 average minutes by shift', cat);
    drawGroupBar('chart-c-station', 'cStation', 'station', 'Charts \u2014 average minutes by station', cat);
    drawGroupBar('chart-c-battalion', 'cBattalion', 'battalion', 'Charts \u2014 average minutes by battalion', cat);
  };

  document.querySelectorAll('nav button').forEach(b => {
    b.onclick = function () {
      document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      ['input', 'person', 'personavg', 'dept', 'groups', 'charts', 'cats', 'roster'].forEach(id => {
        const el = document.getElementById('tab-' + id);
        if (el) el.hidden = id !== b.dataset.tab;
      });
      if (b.dataset.tab === 'person') renderPersonList();
      if (b.dataset.tab === 'personavg') renderPersonAvg();
      if (b.dataset.tab === 'dept') renderDept();
      if (b.dataset.tab === 'groups') renderGroupAvgs();
      if (b.dataset.tab === 'charts') { renderCharts(); renderGroupChartsOnChartsTab(); }
      if (b.dataset.tab === 'cats') renderCats();
      if (b.dataset.tab === 'roster') renderRoster();
      if (b.dataset.tab === 'input') renderAllTable();
    };
  });

  const gCat = document.getElementById('g-cat');
  if (gCat) gCat.onchange = renderGroupAvgs;
  const cCat = document.getElementById('c-cat');
  if (cCat) {
    cCat.onchange = function () {
      if (typeof renderCharts === 'function') renderCharts();
      renderGroupChartsOnChartsTab();
    };
  }
})();
