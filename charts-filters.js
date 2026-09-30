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
    const p = personMeta(assignment.personnel);
    if (field === 'task') return assignment.task || 'Unassigned';
    if (field === 'personnel') return assignment.personnel || 'Unassigned';
    const v = String(p[field] || '').trim();
    return v || 'Unassigned';
  }
  function labelGroup(field, key) {
    if (key === 'Unassigned') return 'Unassigned';
    if (field === 'shift') return 'Shift ' + key;
    if (field === 'battalion') return 'Battalion ' + key;
    if (field === 'station') return (String(key).match(/^\d+$/) ? 'Station ' : '') + key;
    return key;
  }
  function sortVals(field, keys) {
    return keys.sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      const na = Number(a), nb = Number(b);
      if (field !== 'task' && field !== 'personnel' && field !== 'shift' && !isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });
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
      (db.personnel || []).forEach(p => set.add(String(p[field] || '').trim() || 'Unassigned'));
    }
    return sortVals(field, [...set]);
  }
  function selectedValues(field) {
    const box = document.getElementById('c-ms-' + field);
    if (!box) return [];
    return [...box.querySelectorAll('input[type=checkbox]:not([data-all]):checked')].map(i => i.value);
  }
  function buildMulti(field, title) {
    const vals = allValues(field);
    const prev = new Set(selectedValues(field));
    const had = document.getElementById('c-ms-' + field);
    const keepAll = had ? !had.querySelector('input[data-all]') || (had.querySelector('input[data-all]').checked && prev.size === 0) : true;
    const box = document.createElement('div');
    box.className = 'ms-box';
    box.id = 'c-ms-' + field;
    const tall = field === 'personnel' || field === 'task';
    let html = '<div class="ms-head"><label><input type="checkbox" data-all' + (keepAll || prev.size === 0 ? ' checked' : '') + '> All</label><span>' + title + '</span></div>';
    html += '<div class="ms-list' + (tall ? ' tall' : '') + '">';
    vals.forEach(v => {
      const on = keepAll || prev.size === 0 ? false : prev.has(v);
      html += '<label><input type="checkbox" value="' + esc(v) + '"' + (on ? ' checked' : '') + '> ' + esc(labelGroup(field, v)) + '</label>';
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
      refreshCharts();
    };
    items().forEach(i => {
      i.onchange = function () {
        if (i.checked && all) all.checked = false;
        if (!items().some(x => x.checked) && all) all.checked = true;
        refreshCharts();
      };
    });
  }
  function ensureChartFilters() {
    const tab = document.getElementById('tab-charts');
    if (!tab) return;
    let host = document.getElementById('c-filters');
    if (!host) {
      host = document.createElement('div');
      host.id = 'c-filters';
      const oldGrid = tab.querySelector('.grid');
      if (oldGrid) oldGrid.replaceWith(host);
      else tab.insertBefore(host, tab.children[1] || null);
    }
    if (host.dataset.ready === '1' && document.getElementById('c-ms-battalion')) return;
    host.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'ms-grid';
    FILTERS.forEach(pair => {
      const wrap = document.createElement('div');
      wrap.appendChild(buildMulti(pair[0], pair[1]));
      row.appendChild(wrap);
    });
    host.appendChild(row);
    FILTERS.forEach(pair => wireMulti(document.getElementById('c-ms-' + pair[0])));
    host.dataset.ready = '1';
  }
  function refillIfEmpty() {
    FILTERS.forEach(pair => {
      const box = document.getElementById('c-ms-' + pair[0]);
      if (!box) return;
      const list = box.querySelector('.ms-list');
      if (list && list.children.length < 2 && allValues(pair[0]).length) {
        const fresh = buildMulti(pair[0], pair[1]);
        box.replaceWith(fresh);
        wireMulti(fresh);
      }
    });
  }
  function passesFilters(a) {
    return FILTERS.every(pair => {
      const picked = selectedValues(pair[0]);
      if (!picked.length) return true;
      return picked.indexOf(fieldValue(a, pair[0])) >= 0;
    });
  }
  function chartScope() {
    const bits = [];
    FILTERS.forEach(pair => {
      const picked = selectedValues(pair[0]);
      if (!picked.length) return;
      bits.push(picked.length === 1 ? labelGroup(pair[0], picked[0]) : (picked.length + ' ' + pair[1].toLowerCase() + 's'));
    });
    return bits.length ? bits.join(' \u2022 ') : 'Department';
  }
  filteredTimed = function () {
    return (db.assignments || []).filter(a => timeToSec(a.completionTime) != null && passesFilters(a));
  };
  const _renderCharts = renderCharts;
  renderCharts = function () {
    ensureChartFilters();
    refillIfEmpty();
    _renderCharts();
    try {
      if (charts.trend && charts.trend.options && charts.trend.options.plugins) {
        charts.trend.options.plugins.title.text = chartScope() + ' \u2014 time trend by date';
        charts.trend.update();
      }
    } catch (e) {}
  };
  window.renderGroupChartsOnChartsTab = function () {
    ensureChartFilters();
    refillIfEmpty();
    const rows = filteredTimed();
    function draw(canvasId, key, f, title) {
      const el = document.getElementById(canvasId);
      if (!el || typeof destroyChart !== 'function') return;
      const wrap = el.closest('.chart-wrap');
      if (wrap) wrap.style.display = '';
      const buckets = {};
      rows.forEach(r => {
        const k = fieldValue(r, f);
        (buckets[k] ||= []).push(r);
      });
      const labels = sortVals(f, Object.keys(buckets));
      const data = labels.map(k => {
        const secs = buckets[k].map(r => timeToSec(r.completionTime)).filter(s => s != null);
        return secs.length ? +(secs.reduce((x, y) => x + y, 0) / secs.length / 60).toFixed(3) : 0;
      });
      destroyChart(key);
      charts[key] = new Chart(el, {
        type: 'bar',
        data: { labels: labels.map(k => labelGroup(f, k)), datasets: [{ label: 'Avg minutes', data: data, backgroundColor: COLORS }] },
        options: chartOpts(title)
      });
    }
    const scope = chartScope();
    draw('chart-c-shift', 'cShift', 'shift', scope + ' \u2014 by shift');
    draw('chart-c-station', 'cStation', 'station', scope + ' \u2014 by station');
    draw('chart-c-battalion', 'cBattalion', 'battalion', scope + ' \u2014 by battalion');
    if (document.getElementById('chart-c-task')) draw('chart-c-task', 'cTask', 'task', scope + ' \u2014 by task');
    if (document.getElementById('chart-c-person')) draw('chart-c-person', 'cPerson', 'personnel', scope + ' \u2014 by personnel');
  };
  function refreshCharts() {
    if (typeof renderCharts === 'function') renderCharts();
    if (typeof renderGroupChartsOnChartsTab === 'function') renderGroupChartsOnChartsTab();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureChartFilters);
  else ensureChartFilters();
})();
