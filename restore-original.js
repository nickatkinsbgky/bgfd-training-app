function restoreOriginalData() {
  if (typeof SEED === 'undefined') {
    alert('Original data files did not load. Hard-refresh the page and try again.');
    return;
  }
  var next = JSON.parse(JSON.stringify(SEED));
  if (typeof migrate === 'function') next = migrate(next);
  var key = (typeof KEY !== 'undefined') ? KEY : 'bgfd-training-app-v2';
  localStorage.setItem(key, JSON.stringify(next));
  try { db = next; } catch (e) {}
  window.db = next;
  alert('Restored original data: ' + (next.personnel || []).length + ' people, ' + (next.assignments || []).length + ' assignments. The page will reload.');
  location.reload();
}
