(function () {
  function fileName(base) {
    var safe = String(base || 'report').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report';
    var stamp = new Date().toISOString().slice(0, 10);
    return 'BGFD-Fitness-' + safe + '-' + stamp + '.pdf';
  }

  function getActiveTab() {
    var btn = document.querySelector('nav button.active');
    return btn && btn.dataset.tab ? btn.dataset.tab : 'log';
  }

  function personOf(name) {
    return ((window.db && window.db.personnel) || []).filter(function (p) { return p.fullName === name; })[0] || {};
  }

  function yearOf(date) { return String(date || '').slice(0, 4); }

  function ageOf(name) {
    var p = personOf(name);
    if (p && p.age != null) return p.age;
    if (window.SEED_FITNESS_AGES && window.SEED_FITNESS_AGES[name] != null) {
      return window.SEED_FITNESS_AGES[name] + (new Date().getFullYear() - 2026);
    }
    return '';
  }

  function parseResult(task, raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return null;
    var unit = (((window.db && window.db.tasks) || []).filter(function (t) { return t.name === task; })[0] || {}).unit || '';
    if (unit === 'time' || s.indexOf(':') >= 0) {
      var bits = s.split(':').map(function (x) { return parseInt(x, 10); });
      if (bits.some(function (n) { return isNaN(n); })) return null;
      if (bits.length === 2) return bits[0] * 60 + bits[1];
      if (bits.length === 3) return bits[0] * 3600 + bits[1] * 60 + bits[2];
    }
    var n = parseFloat(s.replace(/,/g, ''));
    return isNaN(n) ? null : n;
  }

  function fmtResult(task, n) {
    if (n == null || isNaN(n)) return '\u2014';
    var unit = (((window.db && window.db.tasks) || []).filter(function (t) { return t.name === task; })[0] || {}).unit || '';
    if (unit === 'time') {
      var sec = Math.round(n);
      var m = Math.floor(sec / 60), s = sec % 60;
      return m + ':' + String(s).padStart(2, '0');
    }
    if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
    return n.toFixed(1);
  }

  function avg(list) { return list.length ? list.reduce(function (a, b) { return a + b; }, 0) / list.length : null; }

  function addHeader(doc, title, subtitle) {
    var pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(59, 10, 10);
    doc.rect(0, 0, pageWidth, 78, 'F');
    doc.setFillColor(212, 160, 23);
    doc.rect(0, 78, pageWidth, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Bowling Green Fire Department', 40, 32);
    doc.setFontSize(13);
    doc.setTextColor(212, 160, 23);
    doc.text(title || 'Personnel Fitness', 40, 52);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(230, 230, 230);
    if (subtitle) doc.text(subtitle, 40, 68);
    doc.setTextColor(20, 20, 20);
  }

  function addFooter(doc, generated) {
    var pages = doc.internal.getNumberOfPages();
    var pageWidth = doc.internal.pageSize.getWidth();
    for (var i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('BGFD Personnel Fitness  \u00b7  Generated ' + generated, 40, 770);
      doc.text('Page ' + i + ' of ' + pages, pageWidth - 90, 770);
    }
  }

  function addChartImage(doc, canvasId, yStart, maxWidth) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return yStart;
    try {
      var img = canvas.toDataURL('image/png');
      var props = doc.getImageProperties(img);
      var w = Math.min(maxWidth || 500, props.width);
      var h = (props.height * w) / props.width;
      if (yStart + h > 740) {
        doc.addPage();
        yStart = 40;
      }
      doc.addImage(img, 'PNG', 40, yStart, w, h);
      return yStart + h + 16;
    } catch (e) {
      return yStart;
    }
  }

  function addVisibleCharts(doc, tabId, y) {
    var tab = document.getElementById('tab-' + tabId);
    if (!tab) return y;
    var canvases = tab.querySelectorAll('canvas');
    for (var i = 0; i < canvases.length; i++) {
      var c = canvases[i];
      var wrap = c.closest('.chart-wrap');
      if (wrap && wrap.style.display === 'none') continue;
      if (!c.id) continue;
      y = addChartImage(doc, c.id, y, 520);
    }
    return y;
  }

  function exportPerson(doc, name) {
    var p = personOf(name);
    var rows = ((window.db && window.db.results) || []).filter(function (r) { return r.personnel === name; });
    var age = ageOf(name);
    var subtitle = name + (age ? ' \u00b7 Age ' + age : '') + (p.rank ? ' \u00b7 ' + p.rank : '') + ' \u00b7 ' + rows.length + ' results';
    addHeader(doc, 'Personnel Fitness', subtitle);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(name, 40, 112);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    var meta = [p.rank || '', p.station ? 'Station ' + p.station : '', p.shift ? 'Shift ' + p.shift : '', p.battalion ? 'Battalion ' + p.battalion : ''].filter(Boolean).join('  \u00b7  ');
    if (meta) doc.text(meta, 40, 130);

    var years = [];
    rows.forEach(function (r) {
      var y = yearOf(r.date);
      if (y && years.indexOf(y) < 0) years.push(y);
    });
    years.sort();
    var tasks = [];
    rows.forEach(function (r) { if (r.task && tasks.indexOf(r.task) < 0) tasks.push(r.task); });
    tasks.sort();

    var y = 150;
    tasks.forEach(function (task) {
      if (y > 680) { doc.addPage(); y = 40; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(task, 40, y);
      y += 6;
      var byYear = {};
      rows.filter(function (r) { return r.task === task; }).forEach(function (r) {
        var yy = yearOf(r.date) || 'Other';
        byYear[yy] = (byYear[yy] ? byYear[yy] + '; ' : '') + (r.result || '') + (r.notes ? ' (' + r.notes + ')' : '');
      });
      var body = [years.map(function (yy) { return byYear[yy] || '\u2014'; })];
      doc.autoTable({
        startY: y,
        head: [years],
        body: body,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [59, 10, 10], textColor: [212, 160, 23] },
        margin: { left: 40, right: 40 }
      });
      y = doc.lastAutoTable.finalY + 18;
    });
    if (!rows.length) doc.text('No fitness results for this person yet.', 40, y);
    return y;
  }

  function exportPersonAvg(doc, name) {
    addHeader(doc, 'Personnel Averages', name);
    var rows = ((window.db && window.db.results) || []).filter(function (r) { return r.personnel === name; });
    var byTask = {};
    rows.forEach(function (r) {
      var n = parseResult(r.task, r.result);
      if (n == null) return;
      (byTask[r.task] = byTask[r.task] || []).push(n);
    });
    var body = Object.keys(byTask).sort().map(function (task) {
      var list = byTask[task];
      return [task, String(list.length), fmtResult(task, avg(list)), fmtResult(task, list.length ? Math.min.apply(null, list) : null), fmtResult(task, list.length ? Math.max.apply(null, list) : null)];
    });
    doc.autoTable({
      startY: 110,
      head: [['Task', 'N', 'Average', 'Best / Low', 'High']],
      body: body.length ? body : [['No numeric results', '', '', '', '']],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [59, 10, 10], textColor: [212, 160, 23] },
      margin: { left: 40, right: 40 }
    });
    var y = doc.lastAutoTable.finalY + 20;
    y = addVisibleCharts(doc, 'pavg', y);
    return y;
  }

  function exportDept(doc) {
    addHeader(doc, 'Department Averages', 'All personnel');
    var results = (window.db && window.db.results) || [];
    var tasks = [];
    ((window.db && window.db.tasks) || []).forEach(function (t) { if (t.name && tasks.indexOf(t.name) < 0) tasks.push(t.name); });
    results.forEach(function (r) { if (r.task && tasks.indexOf(r.task) < 0) tasks.push(r.task); });
    var body = tasks.map(function (task) {
      var nums = [];
      results.forEach(function (r) {
        if (r.task !== task) return;
        var n = parseResult(task, r.result);
        if (n != null) nums.push(n);
      });
      return [task, String(nums.length), fmtResult(task, avg(nums)), fmtResult(task, nums.length ? Math.min.apply(null, nums) : null), fmtResult(task, nums.length ? Math.max.apply(null, nums) : null)];
    });
    doc.autoTable({
      startY: 110,
      head: [['Task', 'N', 'Average', 'Best / Low', 'High']],
      body: body.length ? body : [['No results', '', '', '', '']],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [59, 10, 10], textColor: [212, 160, 23] },
      margin: { left: 40, right: 40 }
    });
    var y = doc.lastAutoTable.finalY + 20;
    y = addVisibleCharts(doc, 'dept', y);
    return y;
  }

  function exportCompare(doc) {
    var namesMode = document.getElementById('cmp-names') && !document.getElementById('cmp-names').hidden;
    if (namesMode) {
      var a = (document.getElementById('cmp-a') || {}).value || '';
      var b = (document.getElementById('cmp-b') || {}).value || '';
      if (!a || !b) { alert('Select two people first.'); return false; }
      addHeader(doc, 'Comparison', a + ' vs ' + b);
      doc.setFontSize(11);
      doc.text('Side-by-side results by task and year.', 40, 110);
      var y = addVisibleCharts(doc, 'compare', 130);
      if (y === 130) doc.text('Charts will appear after the comparison renders.', 40, 140);
    } else {
      var ya = (document.getElementById('cmp-year-a') || {}).value || '';
      var yb = (document.getElementById('cmp-year-b') || {}).value || '';
      var person = (document.getElementById('cmp-year-person') || {}).value || 'All personnel';
      addHeader(doc, 'Year Comparison', ya + ' vs ' + yb + ' \u00b7 ' + person);
      var y = addVisibleCharts(doc, 'compare', 110);
    }
    return true;
  }

  window.exportFitnessPdf = function () {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF library did not load. Refresh and try again.');
      return;
    }
    var tab = getActiveTab();
    var doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' });
    var generated = new Date().toLocaleString();
    var ok = true;
    var titleBit = tab;

    if (tab === 'person') {
      var name = (document.getElementById('bp-person') || {}).value || '';
      if (!name) { alert('Select a person first.'); return; }
      exportPerson(doc, name);
      titleBit = name;
    } else if (tab === 'pavg') {
      var name2 = (document.getElementById('pa-person') || {}).value || '';
      if (!name2) { alert('Select a person first.'); return; }
      exportPersonAvg(doc, name2);
      titleBit = name2 + '-avg';
    } else if (tab === 'dept') {
      exportDept(doc);
      titleBit = 'department';
    } else if (tab === 'compare') {
      ok = exportCompare(doc);
      titleBit = 'comparison';
    } else {
      addHeader(doc, 'Personnel Fitness', 'Current view: ' + tab);
      doc.setFontSize(11);
      doc.text('Switch to By personnel, Personnel averages, Department averages, or Comparison for a dedicated report. Charts from the current view are included when available.', 40, 120, { maxWidth: 520 });
      var y = addVisibleCharts(doc, tab, 150);
      titleBit = tab;
    }

    if (ok === false) return;
    addFooter(doc, generated);
    doc.save(fileName(titleBit));
  };

  function bind() {
    var btn = document.getElementById('btn-pdf');
    if (btn) btn.onclick = window.exportFitnessPdf;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
