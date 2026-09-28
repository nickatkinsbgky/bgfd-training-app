function filteredTimed() {
  const person = (document.getElementById('c-person').value||'').trim();
  const cat = document.getElementById('c-cat').value;
  return db.assignments.filter(a => {
    if (timeToSec(a.completionTime) == null) return false;
    if (person && a.personnel !== person) return false;
    if (cat && catOf(a) !== cat) return false;
    return true;
  });
}
