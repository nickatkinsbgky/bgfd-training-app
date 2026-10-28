(function () {
  if (!document.getElementById('iso-race-styles')) {
    var style = document.createElement('style');
    style.id = 'iso-race-styles';
    style.textContent = [
      '.race-track { margin:10px 0; padding:8px 0; border-bottom:1px dashed var(--line); }',
      '.race-lane { display:grid; grid-template-columns:140px 1fr 70px; gap:10px; align-items:center; margin:6px 0; }',
      '.race-name { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
      '.track { position:relative; height:28px; background:#1c2330; border-radius:14px; border:1px solid var(--line); overflow:hidden; }',
      '.horse { position:absolute; left:0; top:0; height:100%; background:linear-gradient(90deg,#c62828,#d4a017); border-radius:14px; transition:width .6s ease; display:flex; align-items:center; justify-content:flex-end; padding-right:6px; font-size:18px; min-width:28px; }',
      '.horse.done { background:linear-gradient(90deg,#2e7d4f,#7dcea0); }',
      '.race-pct { text-align:right; font-weight:700; color:var(--gold); font-size:13px; }',
      '.winners-circle { margin-top:20px; padding:16px; background:#163326; border:2px solid #2ecc71; border-radius:14px; }',
      '.winners-circle h3 { margin:0 0 10px; color:#7dcea0; }',
      '.winner { display:inline-block; background:#1e3a2f; border:1px solid #2ecc71; border-radius:8px; padding:6px 10px; margin:4px; font-size:13px; }',
      '.finish-line { text-align:center; font-weight:700; color:var(--gold); margin:8px 0 4px; letter-spacing:.1em; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>');
  }
  function pct(have, need) {
    if (!need) return 100;
    return Math.min(100, Math.round(100 * (Number(have) || 0) / need));
  }
  function personProgress(p) {
    var eng = (p.Rank || '').toUpperCase().indexOf('ENGINEER') >= 0 || (p.Rank || '').toUpperCase().indexOf('TRAINING INSTRUCTOR') >= 0;
    var off = /CAPTAIN|CHIEF|BATTALION|ASSISTANT|DEPUTY/i.test(p.Rank || '');
    var cats = [
      { key: 'Company', label: 'Company (192)', have: p.Effective_Company_Hours, need: 192 },
      { key: 'Facility', label: 'Facility (18)', have: p.Facility_Raw, need: 18 },
      { key: 'Driver', label: 'Driver Op', have: p.Driver_Op_Raw, need: eng ? 12 : 0 },
      { key: 'Officer', label: 'Officer', have: p.Officer_Raw, need: off ? 12 : 0 },
      { key: 'HazMat', label: 'HazMat (6)', have: p.HazMat_Raw, need: 6 }
    ];
    var scored = cats.filter(function (c) { return c.need > 0; }).map(function (c) {
      return { key: c.key, label: c.label, have: c.have, need: c.need, pct: pct(c.have, c.need) };
    });
    var avg = scored.length ? Math.round(scored.reduce(function (s, c) { return s + c.pct; }, 0) / scored.length) : 0;
    var complete = scored.length > 0 && scored.every(function (c) { return c.pct >= 100; });
    return { name: (p.Last_Name || '') + ', ' + (p.First_Name || ''), avg: avg, complete: complete, cats: scored };
  }
  function render() {
    var box = document.getElementById('iso-bracket-out');
    if (!box) return;
    var section = box.closest('section');
    if (section) {
      var h2 = section.querySelector('h2');
      if (h2) h2.textContent = 'Race to Complete';
      var muted = section.querySelector('p.muted');
      if (muted) muted.textContent = 'Each personnel is a horse racing down the track. Closer to the finish line means closer to completing all required ISO categories. Fully complete personnel are in the winners circle.';
    }
    var people = (typeof data !== 'undefined' && Array.isArray(data)) ? data.map(personProgress).sort(function (a, b) {
      return b.avg - a.avg || a.name.localeCompare(b.name);
    }) : [];
    if (!people.length) {
      box.innerHTML = '<p class="muted">No ISO data loaded.</p>';
      return;
    }
    var winners = people.filter(function (p) { return p.complete; });
    var racing = people.filter(function (p) { return !p.complete; });

    var html = '';
    if (winners.length) {
      html += '<div class="winners-circle">';
      html += '<h3>🏆 Winners Circle — Hours Completed</h3>';
      winners.forEach(function (p) {
        html += '<span class="winner">🐴 ' + esc(p.name) + ' (100%)</span>';
      });
      html += '</div>';
    } else {
      html += '<p class="muted">No one has crossed the finish line yet. Keep racing!</p>';
    }

    html += '<div class="finish-line">FINISH LINE →</div>';
    html += '<div class="race-track">';
    racing.forEach(function (p) {
      var width = Math.max(4, Math.min(100, p.avg));
      html += '<div class="race-lane">';
      html += '<div class="race-name" title="' + esc(p.name) + '">' + esc(p.name) + '</div>';
      html += '<div class="track"><div class="horse" style="width:' + width + '%">🐴</div></div>';
      html += '<div class="race-pct">' + p.avg + '%</div>';
      html += '</div>';
    });
    if (!racing.length) {
      html += '<p class="muted">Everyone is in the winners circle!</p>';
    }
    html += '</div>';
    html += '<p class="muted" style="margin-top:12px">' + people.length + ' personnel. Horses move closer to the finish line by average percent complete across applicable categories (Company 192, Facility 18, Driver Op if required, Officer if required, HazMat 6). 100% = all required categories met.</p>';
    box.innerHTML = html;
  }
  function wire() {
    var btn = document.querySelector('nav button[data-tab="bracket"]');
    if (btn && !btn._wired) {
      btn._wired = true;
      btn.onclick = function () {
        document.querySelectorAll('nav button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        ['overview', 'personnel', 'charts', 'export', 'bracket'].forEach(function (id) {
          var el = document.getElementById('tab-' + id);
          if (el) el.hidden = id !== 'bracket';
        });
        render();
      };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  setTimeout(wire, 800);
  setTimeout(wire, 2000);
})();
