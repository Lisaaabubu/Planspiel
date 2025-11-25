// Konfetti-Effekt
function launchConfetti(){
  const duration = 2200;
  const end = Date.now() + duration;
  (function frame(){
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
    if(Date.now() < end) requestAnimationFrame(frame);
  })();
}
window.addEventListener('load', launchConfetti);

// „Neues Spiel“ – Seite neu starten
document.getElementById('restartBtn').addEventListener('click', () => {
  // Alten Spielstand löschen
  localStorage.removeItem('planspiel-markt-webapp-v3b');
  localStorage.removeItem('planspiel_firm_names');
  localStorage.removeItem('planspiel_force_new');

  // Weiter zur Startseite
  // Pfad:   end → pages → client → Planspiel → start
  window.location.href = "../start/index.html";
});


// Chart: Gemeinwohl-Index
new Chart(document.getElementById('indexChart'),{
  type:'line',
  data:{
    labels:['R1','R2','R3','R4','R5','R6','R7','R8'],
    datasets:[{
      label:'Gemeinwohl-Index',
      data:[3,5,6,8,10,13,17,19],
      borderColor:'#00858e',
      backgroundColor:'rgba(0,133,142,.18)',
      tension:.3,
      fill:true
    }]
  },
  options:{ responsive:true, maintainAspectRatio:true, scales:{ y:{ beginAtZero:true, max:20 } } }
});

// Chart: Dimensionen
new Chart(document.getElementById('valuesChart'),{
  type:'bar',
  data:{
    labels:['Menschenwürde','Solidarität','Nachhaltigkeit','Transparenz'],
    datasets:[{
      label:'Punkte (0–20)',
      data:[18,15,17,16],
      backgroundColor:['#8ba23f','#00858e','#8ba23f','#00858e']
    }]
  },
  options:{ responsive:true, scales:{ y:{ beginAtZero:true, max:20 } } }
});

// Exportfunktion
document.getElementById('exportBtn').addEventListener('click',()=>{
  const result={
    gemeinwohlIndex:[3,5,6,8,10,13,17,19],
    dimensionen:{ menschenwuerde:18, solidaritaet:15, nachhaltigkeit:17, transparenz:16 }
  };
  const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='GWOE_Spielergebnis.json'; a.click();
  URL.revokeObjectURL(url);
});
