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
  function labelFor(field, key) {
    if (key === 'Unassigned') return 'Unassigned';
    if (field === 'shift') return 'Shift ' + key;
    if (field === 'battalion') return 'Battalion ' + key;
    if (field === 'station') return (String(key).match(/^\d+$/) ? 'Station ' : '') + key;
    return key;
  }
  function allValues(field) {
    const set = new Set();
    (db.personnel || []).forEach(p => {
      const v = String(p[field] || '').trim();
      set.add(v || 'Unassigned');
    });
    return sortGroupKeys([...set], field);
  }
  function timedRows(cat, field, value) {
    return db.assignments.filter(a => {
      if (timeToSec(a.completionTime) == null) return false;
      if (cat && catOf(a) !== cat) return false;
      if (field && value && groupKey(a, field) !== value) return false;
      return true;
    });
  }
  function avgMinutes(rows) {
    const secs = rows.map(r => timeToSec(r.completionTime)).filter(s => s != null);
    if (!secs.length) return null;
    return secs.reduce((a, b) => a + b, 0) / secs.length / 60;
  }
  function groupStats(field, cat, value) {
    const rows = timedRows(cat, field, value);
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
  function tableFor(title, field, cat, value) {
    const stats = groupStats(field, cat, value);
    if (!stats.length) return '<p class="muted">No timed records for ' + esc(title.toLowerCase()) + '.</p>';
    let html = '<div class="cat-block"><h2>' + esc(title) + '</h2>';
    html += '<table><thead><tr><th>' + esc(title.replace(/ averages$/i, '')) + '</th><th>People</th><th>Timed N</th><th>Avg time</th><th>% met</th><th>By task</th></tr></thead><tbody>';
    stats.forEach(s => {
      const taskBits = s.tasks.map(t => esc(t.task) + ' ' + fmtMin(t.avg) + ' (n=' + t.n + ')').join('<br>');
      html += '<tr><td>' + esc(labelFor(field, s.key)) + '</td><td>' + s.people + '</td><td>' + s.n + '</td><td>' + fmtMin(s.avg) + '</td><td>' +
        (s.pctMet == null ? '\u2014' : s.pctMet.toFixed(0) + '%') + '</td><td>' + taskBits + '</td></tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }
  function drawGroupBar(canvasId, chartKey, field, title, cat, value) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    const wrap = el.closest('.chart-wrap');
    if (wrap) wrap.style.display = '';
    const stats = groupStats(field, cat, value);
    destroyChart(chartKey);
    charts[chartKey] = new Chart(el, {
      type: 'bar',
      data: {
        labels: stats.map(s => labelFor(field, s.key)),
        datasets: [{ label: 'Avg minutes', data: stats.map(s => s.avg == null ? 0 : +s.avg.toFixed(3)), backgroundColor: COLORS }]
      },
      options: chartOpts(title)
    });
  }
  function hideChart(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const wrap = el.closest('.chart-wrap');
    if (wrap) wrap.style.display = 'none';
  }
  function fillValueSelect(field) {
    const sel = document.getElementById('g-value');
    if (!sel) return;
    const keep = sel.value;
    if (!field) {
      sel.innerHTML = '<option value="">All groups</option>';
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    const vals = allValues(field);
    sel.innerHTML = '<option value="">All ' + field + 's</option>' +
      vals.map(v => '<option value="' + esc(v) + '">' + esc(labelFor(field, v)) + '</option>').join('');
    if ([...sel.options].some(o => o.value === keep)) sel.value = keep;
  }
  window.renderGroupAvgs = function () {
    const catSel = document.getElementById('g-cat');
    if (catSel && !catSel.dataset.filled) {
      catSel.innerHTML = '<option value="">All categories</option>' + [...db.categories].sort().map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
      catSel.dataset.filled = '1';
    }
    const bySel = document.getElementById('g-by');
    const field = bySel ? bySel.value : '';
    fillValueSelect(field);
    const cat = catSel ? catSel.value : '';
    const value = document.getElementById('g-value') ? document.getElementById('g-value').value : '';
    const fields = field ? [field] : ['shift', 'station', 'battalion'];
    const ids = { shift: ['chart-g-shift', 'gShift', 'Shift averages'], station: ['chart-g-station', 'gStation', 'Station averages'], battalion: ['chart-g-battalion', 'gBattalion', 'Battalion averages'] };
    Object.keys(ids).forEach(f => {
      if (fields.indexOf(f) >= 0) drawGroupBar(ids[f][0], ids[f][1], f, 'Average minutes by ' + f, cat, value);
      else hideChart(ids[f][0]);
    });
    const out = document.getElementById('g-out');
    if (out) {
      out.innerHTML = fields.map(f => tableFor(ids[f][2], f, cat, value)).join('');
    }
  };
  window.renderGroupChartsOnChartsTab = function () {
    const cat = document.getElementById('c-cat') ? document.getElementById('c-cat').value : '';
    drawGroupBar('chart-c-shift', 'cShift', 'shift', 'Charts \u2014 average minutes by shift', cat, '');
    drawGroupBar('chart-c-station', 'cStation', 'station', 'Charts \u2014 average minutes by station', cat, '');
    drawGroupBar('chart-c-battalion', 'cBattalion', 'battalion', 'Charts \u2014 average minutes by battalion', cat, '');
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
      if (b.dataset.tab === 'cats' && typeof renderCats === 'function') renderCats();
      if (b.dataset.tab === 'roster') renderRoster();
      if (b.dataset.tab === 'input') renderAllTable();
    };
  });
  const gCat = document.getElementById('g-cat');
  if (gCat) gCat.onchange = renderGroupAvgs;
  const gBy = document.getElementById('g-by');
  if (gBy) gBy.onchange = function () {
    fillValueSelect(gBy.value);
    renderGroupAvgs();
  };
  const gVal = document.getElementById('g-value');
  if (gVal) gVal.onchange = renderGroupAvgs;
  const cCat = document.getElementById('c-cat');
  if (cCat) {
    cCat.onchange = function () {
      if (typeof renderCharts === 'function') renderCharts();
      renderGroupChartsOnChartsTab();
    };
  }
})();
