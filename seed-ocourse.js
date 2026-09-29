window.SEED_OCOURSE=(window.SEED_OCOURSE||[]).concat((function(){
  const raw = `PLACEHOLDER`;
  const STD = '00:14:30';
  const stdSec = 14*60+30;
  function toSec(t){
    const p=String(t).split(':').map(Number);
    if(p.length===2) return p[0]*60+p[1];
    if(p.length===3) return p[0]*3600+p[1]*60+p[2];
    return null;
  }
  let n=0;
  return raw.trim().split('\n').filter(Boolean).map(line=>{
    const [name,year,time]=line.split('|');
    n+=1;
    const s=toSec(time);
    const y=String(year||'').trim();
    return {
      task:'O-Course', personnel:name, rank:'', status:'Completed', priority:'Low',
      dateDue:y+'-03-01', dateCompleted:y+'-03-01',
      stdTime:STD, completionTime:time,
      metStandard: (s!=null && s<=stdSec) ? 'Yes' : 'No',
      notes:'Imported from O-Course Times '+y,
      assignmentId:'OC-'+y+'-'+String(n).padStart(4,'0'),
      taskId:'T-006', category:'Physical Fitness'
    };
  });
})());
