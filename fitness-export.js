(function () {
  function personMeta(name) {
    return ((window.db && window.db.personnel) || []).filter(function (p) { return p.fullName === name; })[0] || {};
  }
  function yearOf(date) { return String(date || '').slice(0, 4); }
  function ageNow(p) {
    if (!p) return '';
    if (p.ageBase != null) return p.ageBase + (new Date().getFullYear() - 2026);
    return p.age || '';
  }
  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      alert('Excel library did not load. Check the connection and try again.');
      return;
    }
    var from = (document.getElementById('ex-from') || {}).value || '';
    var to = (document.getElementById('ex-to') || {}).value || '';
    if (from && to && from > to) { var swap = from; from = to; to = swap; }
    var rows = ((window.db && window.db.results) || []).filter(function (r) {
      var y = yearOf(r.date);
      if (!from && !to) return true;
      if (!y) return false;
      if (from && y < from) return false;
      if (to && y > to) return false;
      return true;
    });
    rows.sort(function (a, b) {
      var c = String(a.date || '').localeCompare(String(b.date || ''));
      if (c) return c;
      return String(a.personnel || '').localeCompare(String(b.personnel || ''));
    });
    var data = rows.map(function (r) {
      var p = personMeta(r.personnel);
      return {
        'Year': yearOf(r.date),
        'Personnel': r.personnel || '',
        'Age': ageNow(p),
        'Age as of': ageNow(p) ? new Date().getFullYear() : '',
        'Rank': p.rank || '',
        'Battalion': p.battalion || '',
        'Station': p.station || '',
        'Shift': p.shift || '',
        'Task': r.task || '',
        'Result': r.result || '',
        'Notes': r.notes || '',
        'Result ID': r.id || ''
      };
    });
    if (!data.length) data = [{ 'Year': '', 'Personnel': '', 'Age': '', 'Age as of': '', 'Rank': '', 'Battalion': '', 'Station': '', 'Shift': '', 'Task': '', 'Result': '', 'Notes': '', 'Result ID': '' }];
    var ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{wch:8},{wch:24},{wch:8},{wch:12},{wch:14},{wch:12},{wch:10},{wch:8},{wch:16},{wch:12},{wch:28},{wch:12}];
    var people = ((window.db && window.db.personnel) || []).slice().sort(function (a, b) { return String(a.fullName).localeCompare(String(b.fullName)); });
    var roster = people.map(function (p) {
      return { 'Personnel': p.fullName || '', 'Age': ageNow(p), 'Age as of': ageNow(p) ? new Date().getFullYear() : '', 'Rank': p.rank || '', 'Battalion': p.battalion || '', 'Station': p.station || '', 'Shift': p.shift || '', 'Active': p.active || '', 'Notes': p.notes || '' };
    });
    var ws2 = XLSX.utils.json_to_sheet(roster.length ? roster : [{ 'Personnel': '' }]);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.utils.book_append_sheet(wb, ws2, 'Roster');
    var stamp = new Date().toISOString().slice(0, 10);
    var range = (!from && !to) ? 'all' : ((from || 'start') + '_to_' + (to || 'end'));
    XLSX.writeFile(wb, 'BGFD-fitness-' + range + '-' + stamp + '.xlsx');
    var msg = document.getElementById('export-msg');
    if (msg) msg.textContent = rows.length ? ('Exported ' + rows.length + ' results' + ((!from && !to) ? ' (all years).' : (' for ' + (from || 'start') + ' to ' + (to || 'end') + '.'))) : 'No results in that year range. An empty workbook was downloaded.';
  }
  var btn = document.getElementById('btn-export-xlsx');
  if (btn) btn.onclick = exportExcel;
})();
