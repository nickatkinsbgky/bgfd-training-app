(function () {
  function fileName(base) {
    var safe = String(base || 'report').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report';
    var stamp = new Date().toISOString().slice(0, 10);
    return 'BGFD-Performance-' + safe + '-' + stamp + '.pdf';
  }

  function getActiveTab() {
    var btn = document.querySelector('nav button.active');
    return btn && btn.dataset.tab ? btn.dataset.tab : 'input';
  }

  function selectedPersonName() {
    var on = document.querySelector('#p-list button.on');
    if (on && on.dataset.name) return on.dataset.name;
    var sel = document.getElementById('a-person');
    if (sel && sel.value) return sel.value;
    var ts = document.getElementById('tasksort-person');
    if (ts && ts.value) return ts.value;
    return '';
  }

  function personMeta(name) {
    return (db.personnel || []).find(function (p) { return p.fullName === name; }) || {};
  }

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
    doc.text(title || 'Personnel Performance', 40, 52);
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
      doc.text('BGFD Personnel Performance  ·  Generated ' + generated, 40, 770);
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

  function exportPersonDetail(doc, name) {
    var p = personMeta(name);
    var rows = (db.assignments || []).filter(function (a) { return a.personnel === name; });
    addHeader(doc, 'Personnel Performance', name + (p.rank ? ' · ' + p.rank : '') + ' · ' + rows.length + ' records');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(name, 40, 112);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    var meta = [p.rank || '', p.station ? 'Station ' + p.station : '', p.shift ? 'Shift ' + p.shift : '', p.battalion ? 'Battalion ' + p.battalion : ''].filter(Boolean).join('  ·  ');
    if (meta) doc.text(meta, 40, 130);

    var byCat = {};
    rows.forEach(function (r) {
      var c = (typeof catOf === 'function' ? catOf(r) : r.category) || 'Other';
      (byCat[c] = byCat[c] || []).push(r);
    });
    var y = 150;
    Object.keys(byCat).sort().forEach(function (cat) {
      if (y > 680) { doc.addPage(); y = 40; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(cat, 40, y);
      y += 6;
      var body = byCat[cat].map(function (r) {
        return [
          r.task || '',
          r.status || '',
          r.dateCompleted || '',
          r.completionTime || '',
          r.stdTime || '',
          r.metStandard || '',
          (r.notes || '').slice(0, 80)
        ];
      });
      doc.autoTable({
        startY: y,
        head: [['Task', 'Status', 'Completed', 'Time', 'Standard', 'Met', 'Notes']],
        body: body.length ? body : [['No records', '', '', '', '', '', '']],
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [59, 10, 10], textColor: [212, 160, 23] },
        margin: { left: 40, right: 40 }
      });
      y = doc.lastAutoTable.finalY + 18;
    });
    if (!rows.length) {
      doc.text('No assignments logged for this person yet.', 40, y);
    }
    return y;
  }

  function exportPersonAvg(doc, name) {
    addHeader(doc, 'Person Averages', name);
    var rows = (db.assignments || []).filter(function (a) { return a.personnel === name; });
    var byTask = {};
    rows.forEach(function (r) { (byTask[r.task] = byTask[r.task] || []).push(r); });
    var tasks = Object.keys(byTask).sort();
    var body = tasks.map(function (task) {
      var list = byTask[task];
      var secs = list.map(function (r) { return timeToSec(r.completionTime); }).filter(function (s) { return s != null; });
      var avg = secs.length ? secs.reduce(function (a, b) { return a + b; }, 0) / secs.length / 60 : null;
      var best = secs.length ? Math.min.apply(null, secs) / 60 : null;
      var judged = list.filter(function (r) { return r.metStandard === 'Yes' || r.metStandard === 'No'; });
      var pct = judged.length ? (100 * judged.filter(function (r) { return r.metStandard === 'Yes'; }).length / judged.length).toFixed(0) + '%' : '—';
      return [
        (typeof catOf === 'function' ? catOf(list[0]) : '') || '',
        task,
        String(list.length),
        String(secs.length),
        avg != null ? avg.toFixed(2) + ' min' : '—',
        best != null ? best.toFixed(2) + ' min' : '—',
        pct
      ];
    });
    doc.autoTable({
      startY: 110,
      head: [['Category', 'Task', 'Records', 'Timed N', 'Avg', 'Best', '% met']],
      body: body.length ? body : [['No timed records', '', '', '', '', '', '']],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [59, 10, 10], textColor: [212, 160, 23] },
      margin: { left: 40, right: 40 }
    });
    var y = doc.lastAutoTable.finalY + 20;
    y = addChartImage(doc, 'chart-person-avg', y, 500);
    return y;
  }

  function exportDept(doc) {
    addHeader(doc, 'Department Averages', 'All personnel');
    var timed = (db.assignments || []).filter(function (a) { return timeToSec(a.completionTime) != null; });
    var byTask = {};
    timed.forEach(function (a) { (byTask[a.task] = byTask[a.task] || []).push(a); });
    var body = Object.keys(byTask).sort().map(function (task) {
      var list = byTask[task];
      var secs = list.map(function (r) { return timeToSec(r.completionTime); }).filter(function (s) { return s != null; });
      var avg = secs.length ? secs.reduce(function (a, b) { return a + b; }, 0) / secs.length / 60 : null;
      var judged = list.filter(function (r) { return r.metStandard === 'Yes' || r.metStandard === 'No'; });
      var pct = judged.length ? (100 * judged.filter(function (r) { return r.metStandard === 'Yes'; }).length / judged.length).toFixed(0) + '%' : '—';
      return [task, String(secs.length), avg != null ? avg.toFixed(2) + ' min' : '—', pct];
    });
    doc.autoTable({
      startY: 110,
      head: [['Task', 'Timed N', 'Dept avg', '% met']],
      body: body.length ? body : [['No timed records', '', '', '']],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [59, 10, 10], textColor: [212, 160, 23] },
      margin: { left: 40, right: 40 }
    });
    var y = doc.lastAutoTable.finalY + 20;
    y = addChartImage(doc, 'chart-dept-avg', y, 500);
    return y;
  }

  function exportTaskSort(doc) {
    var task = (document.getElementById('tasksort-task') || {}).value || '';
    var person = (document.getElementById('tasksort-person') || {}).value || '';
    if (!task) {
      alert('Select a task first.');
      return false;
    }
    addHeader(doc, 'By Task', task + (person ? ' · ' + person : ''));
    if (!person) {
      doc.text('Select a person to see detailed records for this task.', 40, 120);
      return true;
    }
    var rows = (db.assignments || []).filter(function (a) {
      return (a.task || 'Unassigned') === task && a.personnel === person;
    }).sort(function (a, b) { return String(a.dateCompleted || '').localeCompare(String(b.dateCompleted || '')); });
    var body = rows.map(function (a) {
      return [a.dateCompleted || '', a.status || '', a.completionTime || '', a.stdTime || '', a.metStandard || '', a.notes || ''];
    });
    doc.autoTable({
      startY: 110,
      head: [['Date', 'Status', 'Time', 'Standard', 'Met', 'Notes']],
      body: body.length ? body : [['No records', '', '', '', '', '']],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [59, 10, 10], textColor: [212, 160, 23] },
      margin: { left: 40, right: 40 }
    });
    return true;
  }

  window.exportPerformancePdf = function () {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF library did not load. Refresh and try again.');
      return;
    }
    var tab = getActiveTab();
    var doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' });
    var generated = new Date().toLocaleString();
    var ok = true;
    var name = selectedPersonName();
    var titleBit = tab;

    if (tab === 'person') {
      if (!name) { alert('Select a person first.'); return; }
      exportPersonDetail(doc, name);
      titleBit = name;
    } else if (tab === 'personavg') {
      if (!name) { alert('Select a person first.'); return; }
      exportPersonAvg(doc, name);
      titleBit = name + '-avg';
    } else if (tab === 'dept') {
      exportDept(doc);
      titleBit = 'department';
    } else if (tab === 'tasksort') {
      ok = exportTaskSort(doc);
      titleBit = 'task';
    } else if (tab === 'groups' || tab === 'charts') {
      var subtitle = tab === 'groups' ? 'Group averages (current filters)' : 'Charts (current filters)';
      addHeader(doc, 'Personnel Performance', subtitle);
      doc.setFontSize(11);
      doc.text('Charts and summary for the view currently on screen.', 40, 110);
      var y = addVisibleCharts(doc, tab, 130);
      if (y === 130) doc.text('No charts rendered in this view yet. Adjust filters and try again.', 40, 140);
      titleBit = tab;
    } else {
      addHeader(doc, 'Personnel Performance', 'Current view: ' + tab);
      doc.setFontSize(11);
      doc.text('This tab does not have a dedicated printable report yet. Switch to By personnel, Person averages, Department averages, Group averages, Charts, or By Task.', 40, 120, { maxWidth: 520 });
      titleBit = tab;
    }

    if (ok === false) return;
    addFooter(doc, generated);
    doc.save(fileName(titleBit));
  };

  function bind() {
    var btn = document.getElementById('btn-pdf');
    if (btn) btn.onclick = window.exportPerformancePdf;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
