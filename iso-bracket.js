(function () {
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
    const eng = (p.Rank || '').toUpperCase().includes('ENGINEER') || (p.Rank || '').toUpperCase().includes('TRAINING INSTRUCTOR');
    const off = /CAPTAIN|CHIEF|BATTALION|ASSISTANT|DEPUTY/i.test(p.Rank || '');
    const cats = [
      { key: 'Company', label: 'Company (192)', have: p.Effective_Company_Hours, need: 192 },
      { key: 'Facility', label: 'Facility (18)', have: p.Facility_Raw, need: 18 },
      { key: 'Driver', label: 'Driver Op', have: p.Driver_Op_Raw, need: eng ? 12 : 0 },
      { key: 'Officer', label: 'Officer', have: p.Officer_Raw, need: off ? 12 : 0 },
      { key: 'HazMat', label: 'HazMat (6)', have: p.HazMat_Raw, need: 6 }
    ];
    const scored = cats.filter(c => c.need > 0).map(c => ({ ...c, pct: pct(c.have, c.need) }));
    const avg = scored.length ? Math.round(scored.reduce((s, c) => s + c.pct, 0) / scored.length) : 0;
    const complete = scored.every(c => c.pct >= 100);
    return { name: (p.Last_Name || '') + ', ' + (p.First_Name || ''), avg, complete, cats: scored };
  }
  function render() {
    const box = document.getElementById('iso-bracket-out');
    if (!box) return;
    const people = (typeof data !== 'undefined' && Array.isArray(data)) ? data.map(personProgress).sort((a, b) => b.avg - a.avg || a.name.localeCompare(b.name)) : [];
    if (!people.length) {
      box.innerHTML = '<p class="muted">No ISO data loaded.</p>';
      return;
    }
    const complete = people.filter(p => p.complete);
    const racing = people.filter(p => !p.complete);

    let html = '<div class="race-container">';
    html += '<div class="track-wrap">';
    html += '<h3 style="margin:0 0 8px;color:var(--gold)">The Track</h3>';
    if (racing.length) {
      racing.forEach((p, i) => {
        const left = Math.max(2, Math.min(98, p.avg));
        html += '<div class="track" style="margin-bottom:28px">';
        html += '<div class="horse" style="left:' + left + '%">🐴<span>' + esc(p.name) + ' (' + p.avg + '%)</span></div>';
        html += '<div class="finish"></div>';
        html += '</div>';
      });
    } else {
      html += '<p class="muted">All horses have finished!</p>';
    }
    html += '</div>';

    html += '<div class="winners-circle">';
    html += '<h3>🏆 Winners Circle</h3>';
    if (complete.length) {
      complete.forEach(p => {
        html += '<div class="winner"><span class="horse-icon">🐴</span><span>' + esc(p.name) + '</span></div>';
      });
    } else {
      html += '<p class="muted">No finishers yet — keep racing!</p>';
    }
    html += '</div></div>';

    html += '<p class="muted" style="margin-top:12px">Horses are positioned by average percent complete across applicable categories (Company 192, Facility 18, Driver Op if required, Officer if required, HazMat 6). Finish line = all applicable categories met.</p>';
    box.innerHTML = html;
  }
  function wire() {
    const btn = document.querySelector('nav button[data-tab="bracket"]');
    if (btn && !btn._wired) {
      btn._wired = true;
      btn.onclick = function () {
        document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ['overview','personnel','charts','export','bracket'].forEach(id => {
          const el = document.getElementById('tab-' + id);
          if (el) el.hidden = id !== 'bracket';
        });
        render();
      };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  setTimeout(wire, 800);
})();
