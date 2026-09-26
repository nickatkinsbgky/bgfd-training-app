(function () {
  function uniqueSorted(vals) {
    return [...new Set(vals.map(v => String(v || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }
  function setOptions(sel, items, firstLabel, firstValue) {
    if (!sel) return;
    const cur = sel.value;
    const first = firstLabel == null ? '' : '<option value="' + esc(firstValue || '') + '">' + esc(firstLabel) + '</option>';
    sel.innerHTML = first + items.map(v => '<option value="' + esc(v) + '">' + esc(v) + '</option>').join('');
    if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
  }
  function fillPersonSelects() {
    const names = peopleNames();
    setOptions(document.getElementById('f-person'), names, 'Select personnel', '');
    setOptions(document.getElementById('list-person'), names, 'All people', '');
    setOptions(document.getElementById('a-person'), names, 'Select personnel', '');
    setOptions(document.getElementById('c-person'), names, 'All / department', '');
  }
  function fillTaskSelects() {
    const tasks = db.tasks.map(t => t.taskName);
    setOptions(document.getElementById('f-task'), tasks);
    setOptions(document.getElementById('list-task'), tasks, 'All tasks', '');
  }
  function fillRosterSelects() {
    const ranks = uniqueSorted([
      ...db.personnel.map(p => p.rank),
      'CHIEF','DEPUTY CHIEF','ASSISTANT CHIEF','BATTALION CHIEF','CAPTAIN','ENGINEER',
      'ADVANCED FIREFIGHTER','FIREFIGHTER','PROBATIONARY FIREFIGHTER','RECRUIT',
      'TRAINING INSTRUCTOR','INVESTIGATOR','INSPECTOR','INSPECTION SUPERVISOR',
      'CODE INSPECTOR','PROJECT COORDINATOR','OFFICE ASSOCIATE','EXECUTIVE ASSISTANT',
      'COMM RISK REDUCTION/ED COOR'
    ]);
    const stations = uniqueSorted([
      ...db.personnel.map(p => p.station),
      '1','2','3','4','5','6','7','8','ADM','PSTC'
    ]);
    const shifts = uniqueSorted([...db.personnel.map(p => p.shift), 'A','B','C']);
    const battalions = uniqueSorted([...db.personnel.map(p => p.battalion), '1','2']);
    setOptions(document.getElementById('n-rank'), ranks, 'Select rank', '');
    setOptions(document.getElementById('n-station'), stations, 'Select station', '');
    setOptions(document.getElementById('n-shift'), shifts, 'Select shift', '');
    setOptions(document.getElementById('n-battalion'), battalions, 'Select battalion', '');
  }
  function fillTimeList() {
    const dl = document.getElementById('dl-times');
    if (!dl) return;
    const times = uniqueSorted([
      ...db.tasks.map(t => t.stdTime),
      ...db.assignments.map(a => a.stdTime),
      ...db.assignments.map(a => a.completionTime),
      '00:00:30','00:01:00','00:01:30','00:02:00','00:03:00','00:05:00','01:00','01:30','02:00'
    ]);
    dl.innerHTML = times.map(t => '<option value="' + esc(t) + '"></option>').join('');
  }

  const prevFill = window.fillPeople;
  window.fillPeople = function () {
    if (typeof prevFill === 'function') prevFill();
    fillPersonSelects();
    fillTaskSelects();
    fillRosterSelects();
    fillTimeList();
  };
  fillPeople();

  ['list-person','list-task'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onchange = renderAllTable;
  });
  const aPerson = document.getElementById('a-person');
  if (aPerson) aPerson.onchange = renderPersonAvg;
  const cPerson = document.getElementById('c-person');
  if (cPerson) {
    cPerson.onchange = function () {
      if (typeof renderCharts === 'function') renderCharts();
      if (typeof renderGroupChartsOnChartsTab === 'function') renderGroupChartsOnChartsTab();
    };
  }
})();
