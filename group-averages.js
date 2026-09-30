(function () {
  const FILTERS = [
    ['battalion', 'Battalion'],
    ['shift', 'Shift'],
    ['task', 'Task'],
    ['personnel', 'Personnel']
  ];

  function personMeta(name) {
    return (db.personnel || []).find(p => p.fullName === name) || {};
  }
  function fieldValue(assignment, field) {
    if (!field) return '';
    const p = personMeta(assignment.personnel);
    if (field === 'task') return assignment.task || 'Unassigned';
    if (field === 'category') return (typeof catOf === 'function' ? catOf(assignment) : assignment.category) || 'Other';
    if (field === 'personnel') return assignment.personnel || 'Unassigned';
    if (field === 'rank') return String(p.rank || assignment.rank || '').trim() || 'Unassigned';
    const v = String(p[field] || '').trim();
    return v || 'Unassigned';
  }
  function cmpKey(a, b, field) {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    const na = Number(a), nb = Number(b);
    if (field !== 'shift' && field !== 'task' && field !== 'personnel' && field !== 'category' && field !== 'rank' && !isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  }
  function sortKeys(keys, field) {
    return keys.sort((a, b) => cmpKey(a, b, field));
  }
  function labelFor(field, key) {
    if (!field || !key) return '';
    if (key === 'Unassigned') return 'Unassigned';
    if (field === 'shift') return 'Shift ' + key;
    if (field === 'battalion') return 'Battalion ' + key;
    if (field === 'station') return (String(key).match(/^\d+$/) ? 'Station ' : '') + key;
    return key;
  }
  function allValues(field) {
    const set = new Set();
    if (field === 'task') {
      (db.tasks || []).forEach(t => t.taskName && set.add(t.taskName));
      (db.assignments || []).forEach(a => a.task && set.add(a.task));
    } else if (field === 'personnel') {
      (db.personnel || []).forEach(p => p.fullName && set.add(p.fullName));
      (db.assignments || []).forEach(a => a.personnel && set.add(a.personnel));
    } else {
      (db.personnel || []).forEach(p => {
        const v = String(p[field] || '').trim();
        set.add(v || 'Unassigned');
      });
    }
    return sortKeys([...set], field);
  }
  function selectedValues(field) {
    const box = document.getElementById('g-ms-' + field);
    if (!box) return [];
    return [...box.querySelectorAll('input[type=checkbox]:not([data-all]):checked')].map(i => i.value);
  }
  function selectedGroupFields() {
    return FILTERS.map(p => p[0]).filter(f => {
      const el = document.getElementById('g-gf-' + f);
      return el && el.checked;
    });
  }
  function buildMulti(field, title) {
    const vals = allValues(field);
    const prev = new Set(selectedValues(field));
    const had = document.getElementById('g-ms-' + field);
    const keepAll = had ? !had.querySelector('input[data-all]') || had.querySelector('input[data-all]').checked && prev.size === 0 : true;
    const box = document.createElement('div');
    box.className = 'ms-box';
    box.id = 'g-ms-' + field;
    const tall = field === 'personnel' || field === 'task';
    let html = '<div class="ms-head"><label><input type="checkbox" data-all' + (keepAll || prev.size === 0 ? ' checked' : '') + '> All</label><span>' + title + '</span></div>';
    html += '<div class="ms-list' + (tall ? ' tall' : '') + '">';
    vals.forEach(v => {
      const on = keepAll || prev.size === 0 ? false : prev.has(v);
      html += '<label><input type="checkbox" value="' + esc(v) + '"' + (on ? ' checked' : '') + '> ' + esc(labelFor(field, v)) + '</label>';
    });
    html += '</div>';
    box.innerHTML = html;
    return box;
  }
  function wireMulti(box) {
    const all = box.querySelector('input[data-all]');
    const items = () => [...box.querySelectorAll('input[type=checkbox]:not([data-all])')];
    if (all) all.onchange = function () {
      if (all.checked) items().forEach(i => { i.checked = false; });
      renderGroupAvgs();
    };
    items().forEach(i => {
      i.onchange = function () {
        if (i.checked && all) all.checked = false;
        if (!items().some(x => x.checked) && all) all.checked = true;
        renderGroupAvgs();
      };
    });
  }
  function ensureGroupFilters() {
    const tab = document.getElementById('tab-groups');
    if (!tab) return;
    let host = document.getElementById('g-filters');
    if (!host) {
      host = document.createElement('div');
      host.id = 'g-filters';
      const oldGrid = tab.querySelector('.grid');
      if (oldGrid) oldGrid.replaceWith(host);
      else tab.insertBefore(host, tab.children[1] || null);
    }
    if (host.dataset.ready === '1' && document.getElementById('g-ms-battalion')) return;
    host.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'ms-grid';
    FILTERS.forEach(pair => {
      const wrap = document.createElement('div');
      wrap.appendChild(buildMulti(pair[0], pair[1]));
      row.appendChild(wrap);
    });
    host.appendChild(row);
    const gf = document.createElement('div');
    gf.className = 'ms-group-by';
    gf.innerHTML = '<span>Group / sort by</span>' + FILTERS.map((pair, i) =>
      '<label><input type="checkbox" id="g-gf-' + pair[0] + '"' + (i < 3 ? ' checked' : '') + '> ' + pair[1] + '</label>'
    ).join('') + '<span class="muted">Check several. Order is Battalion → Shift → Task → Personnel.</span>';
    host.appendChild(gf);
    FILTERS.forEach(pair => {
      wireMulti(document.getElementById('g-ms-' + pair[0]));
      const cb = document.getElementById('g-gf-' + pair[0]);
      if (cb) cb.onchange = renderGroupAvgs;
    });
    host.dataset.ready = '1';
  }
  function passesFilters(a) {
    return FILTERS.every(pair => {
      const picked = selectedValues(pair[0]);
      if (!picked.length) return true;
      return picked.indexOf(fieldValue(a, pair[0])) >= 0;
    });
  }
  function timedRows() {
    return (db.assignments || []).filter(a => timeToSec(a.completionTime) != null && passesFilters(a));
  }
  function avgMinutes(rows) {
    const secs = rows.map(r => timeToSec(r.completionTime)).filter(s => s != null);
    if (!secs.length) return null;
    return secs.reduce((a, b) => a + b, 0) / secs.length / 60;
  }
  function statsOf(list) {
    const people = new Set(list.map(r => r.personnel));
    const judged = list.filter(r => r.metStandard === 'Yes' || r.metStandard === 'No');
    const met = judged.filter(r => r.metStandard === 'Yes').length;
    return { n: list.length, people: people.size, avg: avgMinutes(list), pctMet: judged.length ? (100 * met / judged.length) : null };
  }
  function groupStats(field, rows) {
    const buckets = {};
    rows.forEach(r => { const k = fieldValue(r, field); (buckets[k] ||= []).push(r); });
    return sortKeys(Object.keys(buckets), field).map(k => {
      const list = buckets[k];
      const byTask = {};
      list.forEach(r => (byTask[r.task] ||= []).push(r));
      return Object.assign({ key: k, tasks: Object.keys(byTask).sort().map(task => ({ task: task, n: byTask[task].length, avg: avgMinutes(byTask[task]) })) }, statsOf(list));
    });
  }
  function tableFor(title, field, rows) {
    const stats = groupStats(field, rows);
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
  function multiSortTable(rows, keys) {
    if (!keys.length) return '';
    const buckets = {};
    rows.forEach(r => {
      const path = keys.map(f => fieldValue(r, f)).join('\u0001');
      (buckets[path] ||= []).push(r);
    });
    const paths = Object.keys(buckets).sort((a, b) => {
      const aa = a.split('\u0001'), bb = b.split('\u0001');
      for (let i = 0; i < keys.length; i++) {
        const c = cmpKey(aa[i] || '', bb[i] || '', keys[i]);
        if (c) return c;
      }
      return 0;
    });
    const titles = keys.map(f => (FILTERS.find(p => p[0] === f) || [f, f])[1]);
    let html = '<div class="cat-block"><h2>Grouped averages</h2><p class="muted">' + titles.join(' \u2192 ') + ' \u2022 ' + rows.length + ' timed rows</p>';
    html += '<table><thead><tr>' + titles.map(t => '<th>' + esc(t) + '</th>').join('') +
      '<th>People</th><th>Timed N</th><th>Avg time</th><th>% met</th></tr></thead><tbody>';
    paths.forEach(path => {
      const parts = path.split('\u0001');
      const st = statsOf(buckets[path]);
      html += '<tr>' + parts.map((part, i) => '<td>' + esc(labelFor(keys[i], part)) + '</td>').join('') +
        '<td>' + st.people + '</td><td>' + st.n + '</td><td>' + fmtMin(st.avg) + '</td><td>' +
        (st.pctMet == null ? '\u2014' : st.pctMet.toFixed(0) + '%') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }
  function drawGroupBar(canvasId, chartKey, field, title, rows) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    const wrap = el.closest('.chart-wrap');
    if (wrap) wrap.style.display = '';
    const stats = groupStats(field, rows);
    if (typeof destroyChart === 'function') destroyChart(chartKey);
    charts[chartKey] = new Chart(el, {
      type: 'bar',
      data: { labels: stats.map(s => labelFor(field, s.key)), datasets: [{ label: 'Avg minutes', data: stats.map(s => s.avg == null ? 0 : +s.avg.toFixed(3)), backgroundColor: COLORS }] },
      options: chartOpts(title)
    });
  }
  function hideChart(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const wrap = el.closest('.chart-wrap');
    if (wrap) wrap.style.display = 'none';
  }
  function refillIfEmpty() {
    FILTERS.forEach(pair => {
      const box = document.getElementById('g-ms-' + pair[0]);
      if (!box) return;
      const list = box.querySelector('.ms-list');
      if (list && list.children.length < 2 && allValues(pair[0]).length) {
        const fresh = buildMulti(pair[0], pair[1]);
        box.replaceWith(fresh);
        wireMulti(fresh);
      }
    });
  }
  window.renderGroupAvgs = function () {
    ensureGroupFilters();
    refillIfEmpty();
    const rows = timedRows();
    const groupFields = selectedGroupFields();
    const chartMap = {
      shift: ['chart-g-shift', 'gShift', 'Shift averages'],
      battalion: ['chart-g-battalion', 'gBattalion', 'Battalion averages'],
      task: ['chart-g-task', 'gTask', 'Task averages'],
      personnel: ['chart-g-person', 'gPerson', 'Personnel averages']
    };
    const show = groupFields.length ? groupFields : ['battalion', 'shift', 'task'];
    Object.keys(chartMap).forEach(f => {
      if (show.indexOf(f) >= 0) drawGroupBar(chartMap[f][0], chartMap[f][1], f, 'Average minutes by ' + f, rows);
      else hideChart(chartMap[f][0]);
    });
    hideChart('chart-g-station');
    const out = document.getElementById('g-out');
    if (out) {
      const keys = groupFields.length ? groupFields : ['battalion', 'shift', 'task'];
      out.innerHTML = multiSortTable(rows, keys) + keys.map(f => {
        const meta = chartMap[f];
        return tableFor(meta ? meta[2] : f, f, rows);
      }).join('');
    }
  };
  window.renderGroupChartsOnChartsTab = function () {
    const rows = (db.assignments || []).filter(a => timeToSec(a.completionTime) != null);
    drawGroupBar('chart-c-shift', 'cShift', 'shift', 'Charts \u2014 average minutes by shift', rows);
    drawGroupBar('chart-c-station', 'cStation', 'station', 'Charts \u2014 average minutes by station', rows);
    drawGroupBar('chart-c-battalion', 'cBattalion', 'battalion', 'Charts \u2014 average minutes by battalion', rows);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureGroupFilters);
  else ensureGroupFilters();
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
  const cCat = document.getElementById('c-cat');
  if (cCat) {
    cCat.onchange = function () {
      if (typeof renderCharts === 'function') renderCharts();
      renderGroupChartsOnChartsTab();
    };
  }
})();
