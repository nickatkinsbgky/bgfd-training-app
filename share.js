(function () {
  var params = new URLSearchParams(location.search);
  var isView = params.has('view') || params.has('share') || params.has('standalone');

  function hideEl(el) {
    if (el) el.style.display = 'none';
  }

  function lockViewMode() {
    if (!isView) return;

    // Hide home link
    document.querySelectorAll('a.home-link[href="index.html"], a[href="index.html"]').forEach(function (el) {
      hideEl(el);
    });

    // Hide sync / edit bar controls
    var syncBar = document.querySelector('.sync-bar');
    if (syncBar) {
      Array.prototype.forEach.call(syncBar.querySelectorAll('button, input'), function (el) {
        hideEl(el);
      });
      var msg = document.getElementById('sync-msg');
      if (msg) {
        msg.textContent = 'View-only — latest site data';
        msg.classList.add('ok');
      }
    }

    // Hide add / edit / delete / save / import / reset controls
    [
      'addPerson', 'exportBtn', 'importBtn', 'importFile', 'resetBtn',
      'savePerson', 'deletePerson', 'addClass', 'sumEdit', 'drawerPdf',
      'btn-save-all', 'btn-push', 'btn-pull', 'btn-save-token', 'sync-token',
      'landOpen' // keep landing usable but open is view
    ].forEach(function (id) {
      hideEl(document.getElementById(id));
    });

    // Hide action buttons in tables
    document.querySelectorAll('button.tiny, button.del, button.edit-class, td.actions, th.actions').forEach(function (el) {
      hideEl(el);
    });

    // Disable form inputs inside drawers and edit areas
    document.querySelectorAll('#drawer input, #drawer select, #drawer button, #editName, #editId, #editCert, #editExp, #newDate, #newCat, #newHours, #newCourse, #newPeds').forEach(function (el) {
      el.disabled = true;
    });

    // Hide the drawer if it opens
    var drawer = document.getElementById('drawer');
    if (drawer) drawer.style.display = 'none';

    // Mark page as view-only
    document.body.classList.add('view-only');
    var style = document.createElement('style');
    style.textContent = '.view-only .sync-bar button, .view-only .sync-bar input { display:none !important; } .view-only #drawer, .view-only button.tiny, .view-only #addPerson, .view-only #savePerson, .view-only #deletePerson, .view-only #addClass { display:none !important; }';
    document.head.appendChild(style);
  }

  function forceLoadLatest() {
    if (!isView) return;
    // Prefer the public raw site data so viewers always see the latest uploaded copy
    var url = 'https://raw.githubusercontent.com/nickatkinsbgky/bgfd-training-app/main/ems-recert-data.json?t=' + Date.now();
    fetch(url, { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (remote) {
        if (!remote || !remote.people || !remote.people.length) return;
        if (typeof window.setEmsDb === 'function') {
          window.setEmsDb(remote);
        } else {
          try { localStorage.setItem('bgfd-ems-recert-excel-v1', JSON.stringify(remote)); } catch (e) {}
        }
        var msg = document.getElementById('sync-msg');
        if (msg) {
          msg.textContent = 'View-only — showing latest site data (' + remote.people.length + ' people)';
          msg.classList.add('ok');
        }
        // Trigger a refresh if the app exposes one
        if (typeof window.render === 'function') window.render();
        else if (typeof window.applyFilters === 'function') window.applyFilters();
      })
      .catch(function () {});
  }

  function fallback(link) {
    window.prompt('Copy this view-only share link:', link);
  }

  function addShareButton() {
    var header = document.querySelector('header');
    if (!header || document.getElementById('shareBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'shareBtn';
    btn.type = 'button';
    btn.textContent = 'Share';
    btn.title = 'Copy a view-only link others can use to see the latest EMS data (no edits)';
    btn.style.cssText = 'background:#241c0c;color:#d4a017;border:1px solid #d4a017;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer;margin-left:8px;';
    var home = header.querySelector('a.home-link');
    if (home && home.parentNode) {
      home.parentNode.insertBefore(btn, home.nextSibling);
    } else {
      header.appendChild(btn);
    }
    btn.onclick = function () {
      var url = new URL(location.href);
      url.searchParams.set('view', '1');
      url.searchParams.delete('share');
      url.searchParams.delete('standalone');
      var link = url.toString();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function () {
          var orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(function () { btn.textContent = orig; }, 1800);
        }).catch(function () { fallback(link); });
      } else {
        fallback(link);
      }
    };
  }

  function init() {
    addShareButton();
    lockViewMode();
    // Load latest after the main app has had a chance to boot
    setTimeout(forceLoadLatest, 600);
    setTimeout(lockViewMode, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
