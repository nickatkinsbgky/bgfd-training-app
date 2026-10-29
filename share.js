(function () {
  var params = new URLSearchParams(location.search);
  var isView = params.has('view') || params.has('share') || params.has('standalone');
  var path = (location.pathname || '').toLowerCase();
  var isIso = path.indexOf('iso-class1') >= 0;
  var isFitness = path.indexOf('fitness') >= 0;
  var isTraining = path.indexOf('training') >= 0;
  var isEms = path.indexOf('ems-recert') >= 0;

  function hideEl(el) {
    if (el) el.style.display = 'none';
  }

  function lockViewMode() {
    if (!isView) return;

    document.querySelectorAll('a.home-link[href="index.html"], a[href="index.html"]').forEach(function (el) {
      hideEl(el);
    });

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

    [
      'addPerson', 'exportBtn', 'importBtn', 'importFile', 'resetBtn',
      'savePerson', 'deletePerson', 'addClass', 'sumEdit', 'drawerPdf',
      'btn-save-all', 'btn-push', 'btn-pull', 'btn-load', 'btn-save-token', 'sync-token',
      'btn-add', 'btn-save-local', 'landOpen'
    ].forEach(function (id) {
      hideEl(document.getElementById(id));
    });

    document.querySelectorAll('button.tiny, button.del, button.edit-class, button.row-btn, td.actions, th.actions').forEach(function (el) {
      hideEl(el);
    });

    document.querySelectorAll('#drawer input, #drawer select, #drawer button, #edit-modal input, #edit-modal select, #edit-modal button').forEach(function (el) {
      el.disabled = true;
    });

    var drawer = document.getElementById('drawer');
    if (drawer) drawer.style.display = 'none';
    var modal = document.getElementById('edit-modal');
    if (modal) modal.style.display = 'none';

    document.body.classList.add('view-only');
    var style = document.createElement('style');
    style.textContent = [
      '.view-only .sync-bar button, .view-only .sync-bar input { display:none !important; }',
      '.view-only #drawer, .view-only #edit-modal, .view-only button.tiny, .view-only button.row-btn,',
      '.view-only #addPerson, .view-only #savePerson, .view-only #deletePerson, .view-only #addClass,',
      '.view-only #btn-add, .view-only #btn-save-local, .view-only td.actions, .view-only th.actions { display:none !important; }'
    ].join(' ');
    document.head.appendChild(style);
  }

  function forceLoadLatest() {
    if (!isView) return;
    var url = null;
    if (isEms) {
      url = 'https://raw.githubusercontent.com/nickatkinsbgky/bgfd-training-app/main/ems-recert-data.json?t=' + Date.now();
    } else if (isIso) {
      url = 'https://raw.githubusercontent.com/nickatkinsbgky/bgfd-training-app/main/iso_class1_data.json?t=' + Date.now();
    } else if (isFitness) {
      url = 'https://raw.githubusercontent.com/nickatkinsbgky/bgfd-training-app/main/fitness-data.json?t=' + Date.now();
    }
    if (!url) return;

    fetch(url, { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (remote) {
        if (!remote) return;
        var msg = document.getElementById('sync-msg');
        if (isEms && remote.people && remote.people.length) {
          if (typeof window.setEmsDb === 'function') window.setEmsDb(remote);
          else try { localStorage.setItem('bgfd-ems-recert-excel-v1', JSON.stringify(remote)); } catch (e) {}
          if (msg) {
            msg.textContent = 'View-only — showing latest site data (' + remote.people.length + ' people)';
            msg.classList.add('ok');
          }
        } else if (isIso && Array.isArray(remote) && remote.length) {
          try { localStorage.setItem('iso-class1-data', JSON.stringify(remote)); } catch (e) {}
          if (typeof window.applyFilters === 'function') {
            // data is global in iso-class1.html; trigger reload path if exposed
          }
          if (msg) {
            msg.textContent = 'View-only — showing latest site data (' + remote.length + ' personnel)';
            msg.classList.add('ok');
          }
          // Force a fresh load by re-triggering the page's fetch path if possible
          if (typeof window.loadSiteData === 'function') window.loadSiteData();
        } else if (isFitness) {
          if (msg) {
            msg.textContent = 'View-only — latest site data';
            msg.classList.add('ok');
          }
        }
        if (typeof window.render === 'function') window.render();
        else if (typeof window.applyFilters === 'function') window.applyFilters();
      })
      .catch(function () {});
  }

  function fallback(link) {
    window.prompt('Copy this view-only share link:', link);
  }

  function appLabel() {
    if (isIso) return 'ISO Class 1 Hours';
    if (isFitness) return 'Personnel Fitness';
    if (isTraining) return 'Personnel Performance';
    if (isEms) return 'EMS Recertification';
    return 'this app';
  }

  function addShareButton() {
    var header = document.querySelector('header');
    if (!header || document.getElementById('shareBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'shareBtn';
    btn.type = 'button';
    btn.textContent = 'Share';
    btn.title = 'Copy a view-only link others can use to see the latest ' + appLabel() + ' data (no edits, this app only)';
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
    setTimeout(forceLoadLatest, 600);
    setTimeout(lockViewMode, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
