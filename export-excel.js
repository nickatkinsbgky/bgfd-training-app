(function () {
  function personMeta(name) {
    return (db.personnel || []).find(function (p) { return p.fullName === name; }) || {};
  }
  function inRange(date, from, to) {
    if (!from && !to) return true;
    var d = String(date || '').slice(0, 10);
    if (!d) return false;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }
  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      alert('Excel library did not load. Check the connection and try again.');
      return;
    }
    var fromEl = document.getElementById('ex-from');
    var toEl = document.getElementById('ex-to');
    var from = fromEl ? fromEl.value : '';
    var to = toEl ? toEl.value : '';
    if (from && to && from > to) {
      var swap = from;
      from = to;
      to = swap;
    }
    var rows = (db.assignments || []).filter(function (a) {
      return inRange(a.dateCompleted || a.dateDue || '', from, to);
    });
    rows.sort(function (a, b) {
      var c = String(a.dateCompleted || '').localeCompare(String(b.dateCompleted || ''));
      if (c) return c;
      return String(a.personnel || '').localeCompare(String(b.personnel || ''));
    });
    var data = rows.map(function (a) {
      var p = personMeta(a.personnel);
      var meta = typeof taskMeta === 'function' ? taskMeta(a.task) : {};
      return {
        'Date completed': a.dateCompleted || '',
        'Personnel': a.personnel || '',
        'Rank': a.rank || p.rank || '',
        'Battalion': p.battalion || '',
        'Station': p.station || '',
        'Shift': p.shift || '',
        'Task': a.task || '',
        'Category': a.category || meta.category || '',
        'Time': a.completionTime || '',
        'Standard time': a.stdTime || meta.stdTime || '',
        'Met standard': a.metStandard || '',
        'Status': a.status || '',
        'Notes': a.notes || '',
        'Assignment ID': a.assignmentId || ''
      };
    });
    if (!data.length) {
      data = [{
        'Date completed': '', 'Personnel': '', 'Rank': '', 'Battalion': '', 'Station': '', 'Shift': '',
        'Task': '', 'Category': '', 'Time': '', 'Standard time': '', 'Met standard': '', 'Status': '',
        'Notes': '', 'Assignment ID': ''
      }];
    }
    var ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 16 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 28 }, { wch: 14 }
    ];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assignments');
    var stamp = new Date().toISOString().slice(0, 10);
    var range = (!from && !to) ? 'all' : ((from || 'start') + '_to_' + (to || 'end'));
    XLSX.writeFile(wb, 'BGFD-training-' + range + '-' + stamp + '.xlsx');
    var msg = document.getElementById('export-msg');
    if (msg) {
      msg.textContent = rows.length
        ? ('Exported ' + rows.length + ' rows' + ((!from && !to) ? ' (all dates).' : (' for ' + (from || 'start') + ' to ' + (to || 'end') + '.')))
        : 'No assignments in that date range. An empty workbook was downloaded.';
    }
  }
  function bind() {
    var btn = document.getElementById('btn-export-xlsx');
    if (btn) btn.onclick = exportExcel;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
