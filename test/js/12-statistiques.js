// ── STATISTIQUES ────────────────────────────────────────
// ════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// ── PILOTAGE : GRAPHIQUES SVG + EXPORT EXCEL ──────────────
// ══════════════════════════════════════════════════════════

// Calcule le CA encaissé par mois sur les 6 derniers mois (depuis FACTURES payées)
function caParMois(){
  const mois=[];
  const now=new Date();
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const key=d.toISOString().slice(0,7);
    const label=d.toLocaleDateString("fr-FR",{month:"short"});
    // CA encaissé du mois = somme des règlements DATÉS dans ce mois
    const total=FACTURES.filter(f=>facEnCompta(f)&&!["brouillon","annulee"].includes(f.statut))
      .reduce((s,f)=>s+(f.paiements||[])
        .filter(p=>p.date&&p.date.slice(0,7)===key)
        .reduce((a,p)=>a+(p.montant||0),0),0);
    mois.push({key,label,total});
  }
  return mois;
}

// Graphique en courbe (CA par mois)
function lineChart(data,color,height){
  height=height||160;
  const w=520, h=height, padL=48, padB=28, padT=14, padR=12;
  const max=Math.max(...data.map(d=>d.total),1);
  const niceMax=Math.ceil(max/1000)*1000||1000;
  const cw=w-padL-padR, ch=h-padT-padB;
  const px=i=>padL+(data.length<=1?cw/2:i*cw/(data.length-1));
  const py=v=>padT+ch-(v/niceMax)*ch;
  const pts=data.map((d,i)=>`${px(i)},${py(d.total)}`).join(" ");
  const area=`${padL},${padT+ch} ${pts} ${px(data.length-1)},${padT+ch}`;
  // lignes de grille
  let grid="";
  for(let g=0;g<=3;g++){
    const y=padT+ch-(g/3)*ch;
    const val=Math.round(niceMax*g/3);
    grid+=`<line x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}" stroke="#e8e4dc" stroke-width="1"/>`;
    grid+=`<text x="${padL-6}" y="${y+3}" text-anchor="end" font-size="9" fill="#94a3b8">${val>=1000?(val/1000)+"k":val}</text>`;
  }
  return`<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block">
    ${grid}
    <polygon points="${area}" fill="${color}" opacity="0.1"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${data.map((d,i)=>`<circle cx="${px(i)}" cy="${py(d.total)}" r="3.5" fill="#fff" stroke="${color}" stroke-width="2"/>
      <text x="${px(i)}" y="${h-9}" text-anchor="middle" font-size="9" fill="#64748b">${d.label}</text>`).join("")}
  </svg>`;
}

// Donut chart (répartition pipeline)
function donutChart(segments,centerLabel,centerValue){
  const total=segments.reduce((s,x)=>s+x.value,0)||1;
  const cx=80,cy=80,r=60,sw=22;
  let acc=0;
  const arcs=segments.filter(s=>s.value>0).map(s=>{
    const frac=s.value/total;
    const start=acc*2*Math.PI-Math.PI/2;
    acc+=frac;
    const end=acc*2*Math.PI-Math.PI/2;
    const large=frac>0.5?1:0;
    const x1=cx+r*Math.cos(start),y1=cy+r*Math.sin(start);
    const x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end);
    return`<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}" fill="none" stroke="${s.color}" stroke-width="${sw}"/>`;
  }).join("");
  return`<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
    <svg viewBox="0 0 160 160" style="width:140px;height:140px;flex-shrink:0">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1ede5" stroke-width="${sw}"/>
      ${arcs}
      <text x="${cx}" y="${cy-4}" text-anchor="middle" font-size="20" font-weight="700" fill="#1A2118">${centerValue}</text>
      <text x="${cx}" y="${cy+13}" text-anchor="middle" font-size="9" fill="#94a3b8">${centerLabel}</text>
    </svg>
    <div style="flex:1;min-width:120px">
      ${segments.map(s=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="width:11px;height:11px;border-radius:3px;background:${s.color};flex-shrink:0"></span>
        <span style="font-size:12px;color:#475569;flex:1">${s.label}</span>
        <span style="font-size:12px;font-weight:700;color:#1A2118">${s.value}</span>
      </div>`).join("")}
    </div>
  </div>`;
}

// Export Excel (xlsx via SheetJS chargé à la demande)
function exportExcel(){
  if(typeof XLSX==="undefined"){
    const script=document.createElement("script");
    script.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload=()=>doExportExcel();
    script.onerror=()=>alert("Impossible de charger le module Excel (vérifiez votre connexion).");
    document.head.appendChild(script);
  } else {
    doExportExcel();
  }
}
function doExportExcel(){
  try{
    const wb=XLSX.utils.book_new();
    // Clients
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(CLIENTS.map(c=>({
      Nom:c.nom,Contact:c.contact||"",Téléphone:c.tel||"",Email:c.email||"",
      Catégorie:c.cat||"",Statut:c.status||"","CA (€)":c.ca||0,"Dernière commande":c.dernCmd||""
    }))),"Clients");
    // Prospects
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(PROSPECTS.map(p=>({
      Nom:p.name,Entreprise:p.company||"",Email:p.email||"",Téléphone:p.phone||"",
      "Montant (€)":p.amount||0,Température:p.temp||"",Étape:p.stage||"",Relance:p.date||""
    }))),"Prospects");
    // Factures
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(FACTURES.map(f=>({
      Numéro:f.num||"",Client:f.client||"","Montant TTC (€)":f.ttc||0,Statut:f.statut||"",Échéance:f.ech||""
    }))),"Factures");
    // Stock
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(FACFOURN.map(f=>({
      "N° interne":f.num,"N° fournisseur":f.numFour||"",Fournisseur:f.four||"",Catégorie:f.cat||"",Bon:f.bcRef||"",
      Date:f.date||"",Échéance:f.ech||"","HT (€)":ffHT(f),"TVA (€)":ffTVA(f),"Total TTC (€)":ffTTC(f),"Réglé (€)":ffPaye(f),"Reste dû (€)":ffReste(f),
      Statut:(FF_STATUTS[ffStatutReel(f)]||{}).lbl||""
    }))),"Factures fournisseurs");
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(STOCK.map(s=>({
      Produit:s.nom,Fournisseur:(s.fournisseurs&&s.fournisseurs.length)?s.fournisseurs.join(", "):(s.four||""),Quantité:s.qte,Seuil:s.seuil,
      "Prix d'achat (€)":s.prixAchat||0,"Prix de revient (€)":s.prixRevient||s.prixAchat||0,"Prix de vente (€)":s.prix||0,
      "Marge unitaire (€)":(s.prix||0)-(s.prixRevient||s.prixAchat||0),"Valeur stock au coût (€)":(s.qte*(s.prixRevient||s.prixAchat||s.prix||0))
    }))),"Stock");
    const date=new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb,`adsecure-export-${date}.xlsx`);
    logActivity("Export Excel","Données exportées en Excel");
  }catch(e){
    alert("Erreur lors de l'export Excel : "+e.message);
  }
}

// Objectif annuel (stocké dans TH pour persistance via la synchro existante)
function getObjectif(){ return (TH && TH.objectifAnnuel) ? TH.objectifAnnuel : 50000; }
// ════════════════════════════════════════════════════════
// ── STATISTIQUES (période, objectifs mensuels) ──────────
// ════════════════════════════════════════════════════════
let statsAnnee=String(new Date().getFullYear()); // année affichée ou "tout"
const MOIS_COURTS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];

function statsAnneesDispo(){
  const s=new Set([String(new Date().getFullYear())]);
  FACTURES.forEach(f=>{const d=facDate(f); if(d) s.add(d.slice(0,4)); (f.paiements||[]).forEach(p=>p.date&&s.add(p.date.slice(0,4)));});
  DEVIS.forEach(d=>d.date&&s.add(d.date.slice(0,4)));
  return [...s].filter(y=>/^\d{4}$/.test(y)).sort().reverse();
}
// Mois affichés : les 12 mois de l'année choisie, ou les 12 derniers mois pour « Tout »
function statsMois(){
  if(statsAnnee!=="tout") return Array.from({length:12},(_,i)=>`${statsAnnee}-${String(i+1).padStart(2,"0")}`);
  const now=new Date(), out=[];
  for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);}
  return out;
}
const dansPeriode=d=>!!d&&(statsAnnee==="tout"||d.slice(0,4)===statsAnnee);
function moisLabel(k){return MOIS_COURTS[Number(k.slice(5,7))-1];}

// ── Objectifs : un objectif par mois, l'objectif annuel en est la somme ──
function objectifMois(k){
  const o=(TH.objectifsMensuels||{})[k];
  if(typeof o==="number") return o;
  return Math.round(getObjectif()/12);
}
function objectifAnnee(an){ let t=0; for(let m=1;m<=12;m++) t+=objectifMois(`${an}-${String(m).padStart(2,"0")}`); return t; }
function modalObjectifs(){
  const an=statsAnnee==="tout"?String(new Date().getFullYear()):statsAnnee;
  const lignes=Array.from({length:12},(_,i)=>{const k=`${an}-${String(i+1).padStart(2,"0")}`;
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><span style="width:70px;font-size:13px;color:#475569;text-transform:capitalize">${MOIS_COURTS[i]}</span>
      <input type="number" min="0" step="100" id="obj-${k}" value="${objectifMois(k)}" oninput="majTotalObjectifs('${an}')" style="flex:1;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px"/><span style="font-size:13px;color:#94a3b8">€</span></div>`;}).join("");
  showModal(`🎯 Objectifs de CA ${an}`,`
    <div class="info-box" style="margin-bottom:12px">Objectif de chiffre d'affaires encaissé (TTC) pour chaque mois. Vous pouvez répartir un montant annuel puis ajuster les mois forts ou creux.</div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <input type="number" min="0" step="1000" id="obj-annuel" placeholder="Montant annuel" value="${objectifAnnee(an)}" style="flex:1;padding:9px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px"/>
      <button class="btn-sm" onclick="repartirObjectif('${an}')" style="padding:8px 12px">Répartir sur 12 mois</button>
    </div>
    ${lignes}
    <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:14px"><span>Total annuel</span><b id="obj-total">${fMoney(objectifAnnee(an))}</b></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button onclick="saveObjectifs('${an}')" style="padding:9px 20px;border-radius:8px;border:none;background:${TH.c1};color:#fff;cursor:pointer;font-weight:700;font-size:13px">Enregistrer</button>`);
}
function majTotalObjectifs(an){
  let t=0; for(let m=1;m<=12;m++) t+=Number(document.getElementById(`obj-${an}-${String(m).padStart(2,"0")}`).value)||0;
  document.getElementById("obj-total").textContent=fMoney(t);
}
function repartirObjectif(an){
  const tot=Number(document.getElementById("obj-annuel").value)||0, base=Math.floor(tot/12/10)*10;
  for(let m=1;m<=12;m++) document.getElementById(`obj-${an}-${String(m).padStart(2,"0")}`).value=m<12?base:tot-base*11;
  majTotalObjectifs(an);
}
function saveObjectifs(an){
  TH.objectifsMensuels=TH.objectifsMensuels||{};
  for(let m=1;m<=12;m++){const k=`${an}-${String(m).padStart(2,"0")}`; TH.objectifsMensuels[k]=Math.max(0,Number(document.getElementById(`obj-${k}`).value)||0);}
  logActivity("Objectifs de CA",`Objectifs ${an} : ${fMoney(objectifAnnee(an))}`);
  saveData(); closeModal(); renderPage();
}
function changeObjectif(){ modalObjectifs(); }
window.modalObjectifs=modalObjectifs; window.majTotalObjectifs=majTotalObjectifs; window.repartirObjectif=repartirObjectif; window.saveObjectifs=saveObjectifs;

// Barres mensuelles : facturé / encaissé + trait d'objectif
function chartMensuel(rows,th){
  const w=640,h=230,padL=44,padR=10,padT=16,padB=30;
  const max=Math.max(1,...rows.map(r=>Math.max(r.fac,r.enc,r.obj)));
  const step=Math.pow(10,Math.floor(Math.log10(max)));
  const niceMax=Math.ceil(max/step)*step;
  const cw=w-padL-padR, ch=h-padT-padB, slot=cw/rows.length, bw=Math.min(16,slot*0.32);
  const y=v=>padT+ch-(v/niceMax)*ch;
  const fmtK=v=>v>=1000?(Math.round(v/100)/10).toString().replace(".",",")+"k":String(Math.round(v));
  let g="";
  for(let i=0;i<=4;i++){const v=niceMax*i/4,yy=y(v);g+=`<line x1="${padL}" y1="${yy}" x2="${w-padR}" y2="${yy}" stroke="#ece8df"/><text x="${padL-6}" y="${yy+3}" text-anchor="end" font-size="10" fill="#94a3b8">${fmtK(v)}</text>`;}
  rows.forEach((r,i)=>{
    const cx=padL+slot*i+slot/2, cur=r.k===getToday().slice(0,7);
    const tip=`${moisLabel(r.k)} ${r.k.slice(0,4)} — facturé ${fMoney(r.fac)} · encaissé ${fMoney(r.enc)} · objectif ${fMoney(r.obj)}`;
    g+=`<g><title>${tip}</title>
      <rect x="${cx-bw-1}" y="${y(r.fac)}" width="${bw}" height="${padT+ch-y(r.fac)}" rx="3" fill="${th.c1}" opacity="0.35"/>
      <rect x="${cx+1}" y="${y(r.enc)}" width="${bw}" height="${padT+ch-y(r.enc)}" rx="3" fill="${r.enc>=r.obj&&r.obj>0?"#15803d":th.c1}"/>
      ${r.obj>0?`<line x1="${cx-bw-4}" x2="${cx+bw+4}" y1="${y(r.obj)}" y2="${y(r.obj)}" stroke="#b45309" stroke-width="2.5" stroke-linecap="round"/>`:""}
      <text x="${cx}" y="${h-10}" text-anchor="middle" font-size="10.5" fill="${cur?th.c1:"#64748b"}" font-weight="${cur?700:400}">${moisLabel(r.k)}</text></g>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block">${g}</svg>
  <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;font-size:11.5px;color:#64748b;margin-top:6px">
    <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${th.c1};opacity:.35;margin-right:5px"></span>Facturé</span>
    <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${th.c1};margin-right:5px"></span>Encaissé</span>
    <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#15803d;margin-right:5px"></span>Objectif atteint</span>
    <span><span style="display:inline-block;width:14px;height:3px;background:#b45309;vertical-align:middle;margin-right:5px"></span>Objectif</span>
  </div>`;
}


function bar(pct,color,label,value){
  return`<div style="margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
      <span style="font-weight:600;color:#37301F">${label}</span>
      <span style="font-weight:700;color:${color}">${value}</span>
    </div>
    <div style="height:8px;background:#e2e8f0;border-radius:6px;overflow:hidden">
      <div style="height:100%;width:${Math.min(100,pct)}%;background:${color};border-radius:6px;transition:width 0.6s ease"></div>
    </div>
  </div>`;
}
function statCard(title,children,th){
  return`<div class="section-card" style="background:${th.card}">
    <div class="section-head"><div class="section-title" style="color:${th.txt}">${title}</div></div>
    <div style="padding:16px 18px">${children}</div>
  </div>`;
}
function renderStats(){
  const th=TH, T=getToday(), moisCourant=T.slice(0,7), anCourant=T.slice(0,4);
  const libPeriode=statsAnnee==="tout"?"depuis le début":`en ${statsAnnee}`;
  const facVivantes=FACTURES.filter(f=>facEnCompta(f)&&!["brouillon","annulee"].includes(f.statut));
  // ── Chiffre d'affaires ──
  const facPeriode=facVivantes.filter(f=>dansPeriode(facDate(f)));
  const caFacture=facPeriode.reduce((s,f)=>s+facTTC(f),0);
  const paiementsPeriode=facVivantes.flatMap(f=>(f.paiements||[]).map(p=>({...p,f}))).filter(p=>dansPeriode(p.date));
  const caEncaisse=paiementsPeriode.reduce((s,p)=>s+(p.montant||0),0);
  const resteAEncaisser=facVivantes.filter(f=>facStatutReel(f)!=="payee").reduce((s,f)=>s+facReste(f),0);
  // En retard = échéance dépassée et reste à payer (y compris les factures partiellement réglées)
  const facRetard=facVivantes.filter(f=>facStatutReel(f)!=="payee"&&f.ech&&f.ech<T&&facReste(f)>0);
  const montantRetard=facRetard.reduce((s,f)=>s+facReste(f),0);
  // Revenu récurrent : contrats de maintenance en cours (HT / mois)
  const contrats=CLIENTS.flatMap(c=>(c.contratsSignes||[]).filter(x=>!x.resilie).map(x=>({c,x})));
  const recurrentHT=contrats.reduce((s,o)=>s+Number(o.x.prixHT||0),0);
  // ── Mensuel & objectifs ──
  const mois=statsMois();
  const rows=mois.map(k=>({k,
    fac:facVivantes.filter(f=>facDate(f).slice(0,7)===k).reduce((s,f)=>s+facTTC(f),0),
    enc:facVivantes.reduce((s,f)=>s+(f.paiements||[]).filter(p=>p.date&&p.date.slice(0,7)===k).reduce((a,p)=>a+(p.montant||0),0),0),
    obj:objectifMois(k)}));
  const rowCourant=rows.find(r=>r.k===moisCourant)||{k:moisCourant,enc:0,obj:objectifMois(moisCourant)};
  const pctMois=rowCourant.obj>0?Math.round(rowCourant.enc/rowCourant.obj*100):0;
  const jour=Number(T.slice(8,10)), nbJours=new Date(Number(anCourant),Number(T.slice(5,7)),0).getDate();
  const anObj=statsAnnee==="tout"?anCourant:statsAnnee;
  const objAn=objectifAnnee(anObj);
  const encAn=facVivantes.reduce((s,f)=>s+(f.paiements||[]).filter(p=>p.date&&p.date.slice(0,4)===anObj).reduce((a,p)=>a+(p.montant||0),0),0);
  const objAnADate=anObj<anCourant?objAn:(anObj>anCourant?0:rows.filter(r=>r.k.slice(0,4)===anObj&&r.k<moisCourant).reduce((s,r)=>s+r.obj,0)+rowCourant.obj*jour/nbJours);
  const moisAtteints=rows.filter(r=>r.k<=moisCourant&&r.obj>0&&r.enc>=r.obj).length, moisEcoules=rows.filter(r=>r.k<=moisCourant&&r.obj>0).length;
  // ── Clients ──
  const caParClient={};
  facPeriode.forEach(f=>{const cli=CLIENTS.find(c=>c.id===f.clientId)||CLIENTS.find(c=>c.nom===f.client);const key=cli?cli.id:(f.client||"?");
    caParClient[key]=caParClient[key]||{nom:cli?cli.nom:(f.client||"—"),cat:cli?cli.cat:"",ca:0,nb:0}; caParClient[key].ca+=facTTC(f); caParClient[key].nb++;});
  const top=Object.values(caParClient).sort((a,b)=>b.ca-a.ca).slice(0,5);
  const maxTop=Math.max(1,...top.map(c=>c.ca));
  const parCat={};
  Object.values(caParClient).forEach(c=>{const k=c.cat||"Non classé";parCat[k]=(parCat[k]||0)+c.ca;});
  const creeLe=c=>{const n=parseInt(String(c.id),10);return n>1.5e12&&n<4e12?new Date(n).toISOString().slice(0,10):"";};
  const nouveauxClients=CLIENTS.filter(c=>dansPeriode(creeLe(c))).length;
  const clientsFactures=Object.keys(caParClient).length;
  // ── Devis ──
  const devisP=DEVIS.filter(d=>dansPeriode(d.date));
  const signes=devisP.filter(d=>d.statut==="accepte"||devisEstArchive(d));
  const refuses=devisP.filter(d=>d.statut==="refuse");
  const attente=devisP.filter(d=>d.statut==="envoye");
  const expires=attente.filter(d=>d.validite&&d.validite<T);
  const txSignature=devisP.length?Math.round(signes.length/Math.max(1,signes.length+refuses.length+attente.length)*100):0;
  const montantSignes=signes.reduce((s,d)=>s+devisTTC(d),0), montantAttente=attente.reduce((s,d)=>s+devisTTC(d),0);
  const panierMoyen=signes.length?montantSignes/signes.length:0;
  // ── Paiements ──
  const payees=facPeriode.filter(f=>facStatutReel(f)==="payee"&&(f.paiements||[]).length&&f.date);
  const delais=payees.map(f=>{const der=(f.paiements||[]).map(p=>p.date).filter(Boolean).sort().pop();return der?Math.max(0,Math.round((new Date(der)-new Date(f.date))/864e5)):null;}).filter(x=>x!==null);
  const delaiMoyen=delais.length?Math.round(delais.reduce((a,b)=>a+b,0)/delais.length):null;
  const modes={}; paiementsPeriode.forEach(p=>{const m=p.mode||"Autre";modes[m]=(modes[m]||0)+(p.montant||0);});
  // ── Charges ──
  const ffP=FACFOURN.filter(f=>f.statut!=="brouillon"&&dansPeriode(f.date||f.ech));
  const charges=ffP.reduce((s,f)=>s+ffTTC(f),0), chargesAPayer=FACFOURN.filter(f=>f.statut!=="brouillon").reduce((s,f)=>s+ffReste(f),0);
  const marge=caFacture-charges;
  // ── Activité ──
  const evP=EVENTS.filter(e=>dansPeriode(e.date));
  const TYPES_EV={rdv:["RDV clients",th.c2],chantier:["Chantiers","#b08d57"],maintenance:["Maintenances","#15803d"],prospection:["Prospection",th.c1],autre:["Autres","#94a3b8"]};
  const evParType={}; evP.forEach(e=>{const k=TYPES_EV[e.type]?e.type:"autre";evParType[k]=(evParType[k]||0)+1;});
  const ps=pipeStats();
  const valeurStock=STOCK.reduce((s,p)=>s+p.qte*(p.prixRevient||p.prixAchat||p.prix||0),0);
  const stockAlertes=STOCK.filter(s=>s.qte<s.seuil).length;
  const nbDoublons=(liste)=>{const vus={};let n=0;liste.forEach(x=>{const k=String(x.num||"").trim();if(!k)return;if(vus[k])n++;vus[k]=1;});return n;};
  const doublonsFac=nbDoublons(FACTURES), sansDate=facVivantes.filter(f=>!f.date).length;

  const tuile=(label,valeur,sous,couleur)=>`<div class="kpi"><div class="kpi-label">${label}</div><div class="kpi-value small" style="color:${couleur||th.c1}">${valeur}</div>${sous?`<div style="font-size:11px;color:${th.txt}88;margin-top:3px">${sous}</div>`:""}</div>`;
  const mini=(label,valeur,couleur)=>`<div style="text-align:center;padding:10px;background:${(couleur||th.c1)}10;border-radius:9px"><div style="font-size:18px;font-weight:700;color:${couleur||th.c1}">${valeur}</div><div style="font-size:11px;color:#64748b;margin-top:2px">${label}</div></div>`;
  const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
  const couleurPct=p=>p>=100?"#15803d":p>=70?"#b45309":"#991b1b";

  return`
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
      <div style="font-family:'Lora',Georgia,serif;font-size:17px;font-weight:700;color:${th.txt}">📊 Pilotage de l'activité</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${statsAnneesDispo().concat(["tout"]).map(a=>`<button onclick="statsAnnee='${a}';renderPage()" style="padding:6px 13px;border-radius:999px;border:1.5px solid ${statsAnnee===a?th.c1:"#e2e8f0"};background:${statsAnnee===a?th.c1:"#fff"};color:${statsAnnee===a?"#fff":"#64748b"};cursor:pointer;font-size:12px;font-weight:600;font-family:'Inter',sans-serif">${a==="tout"?"Tout":a}</button>`).join("")}
        <button class="btn-add" style="background:#15803d;color:#fff" onclick="exportExcel()">📥 Export Excel</button>
      </div>
    </div>

    ${doublonsFac||sansDate?`<div class="info-box" style="margin-bottom:14px;border-color:#fcd34d;background:#fffbeb;color:#92400e">⚠️ ${[doublonsFac?`${doublonsFac} numéro(s) de facture en double`:"",sansDate?`${sansDate} facture(s) sans date d'émission (date estimée à 30 jours avant l'échéance pour ces statistiques — complétez-la dans la facture)`:""].filter(Boolean).join(" · ")}.</div>`:""}

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px">
      ${tuile("CA facturé "+libPeriode,fMoney(caFacture),`${facPeriode.length} facture(s)`)}
      ${tuile("CA encaissé "+libPeriode,fMoney(caEncaisse),`${paiementsPeriode.length} règlement(s)`,"#15803d")}
      ${tuile("Reste à encaisser",fMoney(resteAEncaisser),facRetard.length?`dont ${fMoney(montantRetard)} en retard (${facRetard.length})`:"aucun retard",facRetard.length?"#991b1b":"#b45309")}
      ${tuile(FV("recurrent"),fMoney(recurrentHT)+" HT/mois",`${contrats.length} contrat(s) actif(s) · ${fMoney(recurrentHT*12)} HT/an`,th.c2)}
    </div>

    <!-- Objectif du mois + année -->
    <div class="two-col" style="margin-bottom:16px">
      <div class="section-card" style="background:${th.card}">
        <div class="section-head"><div><div class="section-title" style="color:${th.txt}">🎯 Objectif de ${moisLabel(moisCourant)} ${anCourant}</div><div class="section-sub">CA encaissé du mois</div></div>
          <button class="btn-sm" onclick="modalObjectifs()">Modifier les objectifs</button></div>
        <div style="padding:18px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
            <span style="font-family:'Lora',Georgia,serif;font-size:26px;font-weight:700;color:${couleurPct(pctMois)}">${fMoney(rowCourant.enc)}</span>
            <span style="font-size:13px;color:#64748b">/ ${fMoney(rowCourant.obj)}</span>
          </div>
          <div style="position:relative;height:14px;background:#f1ede5;border-radius:8px;overflow:hidden;margin-bottom:8px">
            <div style="height:100%;width:${Math.min(100,pctMois)}%;background:${couleurPct(pctMois)};border-radius:8px"></div>
            <div title="Où vous devriez en être aujourd'hui" style="position:absolute;top:0;bottom:0;left:${Math.round(jour/nbJours*100)}%;width:2px;background:#37301F;opacity:.5"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b">
            <span style="font-weight:700;color:${couleurPct(pctMois)}">${pctMois}% atteint</span>
            <span>${rowCourant.enc>=rowCourant.obj?"🎉 Objectif atteint !":`Reste ${fMoney(rowCourant.obj-rowCourant.enc)} · ${nbJours-jour} jour(s)`}</span>
          </div>
        </div>
      </div>
      <div class="section-card" style="background:${th.card}">
        <div class="section-head"><div><div class="section-title" style="color:${th.txt}">📅 Objectif ${anObj}</div><div class="section-sub">${moisEcoules?`${moisAtteints} mois sur ${moisEcoules} atteints`:"Année à venir"}</div></div></div>
        <div style="padding:18px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
            <span style="font-family:'Lora',Georgia,serif;font-size:26px;font-weight:700;color:${th.c1}">${fMoney(encAn)}</span>
            <span style="font-size:13px;color:#64748b">/ ${fMoney(objAn)}</span>
          </div>
          <div style="position:relative;height:14px;background:#f1ede5;border-radius:8px;overflow:hidden;margin-bottom:8px">
            <div style="height:100%;width:${Math.min(100,objAn?Math.round(encAn/objAn*100):0)}%;background:linear-gradient(90deg,${th.c1},${th.c2});border-radius:8px"></div>
            ${anObj===anCourant&&objAn?`<div title="Objectif cumulé à date" style="position:absolute;top:0;bottom:0;left:${Math.min(100,Math.round(objAnADate/objAn*100))}%;width:2px;background:#37301F;opacity:.5"></div>`:""}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b">
            <span style="font-weight:700;color:${th.c1}">${objAn?Math.round(encAn/objAn*100):0}% de l'objectif annuel</span>
            ${anObj===anCourant?`<span style="font-weight:700;color:${encAn>=objAnADate?"#15803d":"#991b1b"}">${encAn>=objAnADate?"En avance":"En retard"} de ${fMoney(Math.abs(encAn-objAnADate))}</span>`:""}
          </div>
        </div>
      </div>
    </div>

    <!-- Mois par mois -->
    <div class="section-card" style="background:${th.card};margin-bottom:16px">
      <div class="section-head"><div><div class="section-title" style="color:${th.txt}">💰 Mois par mois ${statsAnnee==="tout"?"(12 derniers mois)":statsAnnee}</div><div class="section-sub">Facturé, encaissé et objectif · touchez une barre pour le détail</div></div></div>
      <div style="padding:14px 16px 16px">${chartMensuel(rows,th)}</div>
      <div style="overflow-x:auto;padding:0 16px 16px"><table style="font-size:12px">
        <thead><tr><th>Mois</th><th style="text-align:right">Facturé</th><th style="text-align:right">Encaissé</th><th style="text-align:right">Objectif</th><th style="text-align:right">Écart</th></tr></thead>
        <tbody>${rows.filter(r=>r.fac||r.enc||r.k<=moisCourant).map(r=>{const e=r.enc-r.obj;return`<tr style="${r.k===moisCourant?`background:${th.c1}0d;font-weight:700`:""}"><td style="text-transform:capitalize">${moisLabel(r.k)} ${r.k.slice(0,4)}</td><td style="text-align:right">${fMoney(r.fac)}</td><td style="text-align:right">${fMoney(r.enc)}</td><td style="text-align:right;color:#64748b">${fMoney(r.obj)}</td><td style="text-align:right;font-weight:700;color:${e>=0?"#15803d":"#991b1b"}">${r.k>moisCourant?"—":(e>=0?"+":"")+fMoney(e)}</td></tr>`;}).join("")}</tbody>
      </table></div>
    </div>

    <div class="two-col" style="margin-bottom:16px">
      ${statCard("🏆 Meilleurs clients "+libPeriode,top.length?top.map((c,i)=>`<div style="margin-bottom:11px">
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-bottom:4px"><span style="font-weight:600;color:${th.txt}">${i+1}. ${esc(c.nom)} <span style="color:#94a3b8;font-weight:400">· ${c.nb} fact.</span></span><span style="font-weight:700;color:${th.c1};white-space:nowrap">${fMoney(c.ca)}</span></div>
          <div style="height:7px;background:#f1ede5;border-radius:5px;overflow:hidden"><div style="height:100%;width:${c.ca/maxTop*100}%;background:${th.c1};border-radius:5px"></div></div></div>`).join("")
        +`<div style="margin-top:14px;padding-top:12px;border-top:1px solid #f1f5f9;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">${mini("Clients",CLIENTS.length)}${mini("Nouveaux "+(statsAnnee==="tout"?"":statsAnnee),nouveauxClients,"#15803d")}${mini("Facturés",clientsFactures,th.c2)}</div>`
        :`<div style="padding:18px;text-align:center;color:#94a3b8;font-size:13px">Aucune facture ${libPeriode}</div>`,th)}

      ${statCard("🧩 CA par type de client",Object.keys(parCat).length?Object.entries(parCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>bar(caFacture?v/caFacture*100:0,k==="Pro"?th.c1:k==="VIP"?"#b08d57":th.c2,k,`${fMoney(v)} · ${caFacture?Math.round(v/caFacture*100):0}%`)).join("")
        +`<div style="margin-top:14px;padding-top:12px;border-top:1px solid #f1f5f9;display:grid;grid-template-columns:1fr 1fr;gap:8px">${mini("Délai moyen de paiement",delaiMoyen===null?"—":delaiMoyen+" j",delaiMoyen!==null&&delaiMoyen>30?"#991b1b":"#15803d")}${(()=>{const m=Object.entries(modes).sort((a,b)=>b[1]-a[1])[0];return mini("Mode de règlement principal",m?`${m[0]} ${caEncaisse?Math.round(m[1]/caEncaisse*100):0} %`:"—",th.c1);})()}</div>`
        :`<div style="padding:18px;text-align:center;color:#94a3b8;font-size:13px">Aucune facture ${libPeriode}</div>`,th)}
    </div>

    <div class="two-col" style="margin-bottom:16px">
      ${statCard("📋 Devis "+libPeriode,`
        ${bar(devisP.length?signes.length/devisP.length*100:0,"#15803d","Signés",`${signes.length} · ${fMoney(montantSignes)}`)}
        ${bar(devisP.length?attente.length/devisP.length*100:0,th.c1,"En attente de réponse",`${attente.length} · ${fMoney(montantAttente)}`)}
        ${bar(devisP.length?refuses.length/devisP.length*100:0,"#991b1b","Refusés",refuses.length)}
        ${expires.length?`<div style="font-size:12px;color:#b45309;margin:-4px 0 10px">⏳ ${expires.length} devis en attente ont dépassé leur date de validité — à relancer</div>`:""}
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid #f1f5f9;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">${mini("Devis émis",devisP.length)}${mini("Taux de signature",txSignature+"%","#15803d")}${mini("Panier moyen",fMoney(panierMoyen),th.c2)}</div>`,th)}

      ${statCard("📈 Rentabilité "+libPeriode,`
        ${bar(100,th.c1,"CA facturé",fMoney(caFacture))}
        ${bar(caFacture?charges/caFacture*100:0,"#b45309","Charges fournisseurs",fMoney(charges))}
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid #f1f5f9;display:grid;grid-template-columns:1fr 1fr;gap:8px">${mini("Marge",fMoney(marge)+(caFacture?` · ${Math.round(marge/caFacture*100)}%`:""),marge>=0?"#15803d":"#991b1b")}${mini("Fournisseurs à régler",fMoney(chargesAPayer),"#b45309")}</div>
        ${FACFOURN.length?"":`<div style="font-size:11px;color:#94a3b8;margin-top:10px">Saisissez vos factures fournisseurs pour obtenir une marge réelle.</div>`}`,th)}
    </div>

    <div class="two-col" style="margin-bottom:16px">
      ${statCard("📅 Interventions "+libPeriode,(evP.length?Object.entries(TYPES_EV).filter(([k])=>evParType[k]).map(([k,[l,col]])=>bar(evParType[k]/evP.length*100,col,l,evParType[k])).join(""):`<div style="padding:8px 0 4px;color:#94a3b8;font-size:13px">Aucun événement ${libPeriode}</div>`)
        +`<div style="margin-top:14px;padding-top:12px;border-top:1px solid #f1f5f9;display:grid;grid-template-columns:1fr 1fr;gap:8px">${mini("Ce mois-ci",EVENTS.filter(e=>(e.date||"").slice(0,7)===moisCourant).length)}${mini("Visites à venir (contrats)",EVENTS.filter(e=>e.contratId&&e.date>=T).length,"#15803d")}</div>`,th)}

      ${statCard("🎯 Prospects & stock",`
        ${bar(ps.total?ps.active.length/ps.total*100:0,th.c1,"Prospects en cours",`${ps.active.length} · ${fMoney(ps.pipeline)}`)}
        ${bar(ps.total?ps.won.length/ps.total*100:0,"#15803d","Gagnés",ps.won.length)}
        ${ps.urgent?`<div style="font-size:12px;color:#b45309;margin:-4px 0 10px">🔔 ${ps.urgent} prospect(s) à relancer aujourd'hui</div>`:""}
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid #f1f5f9;display:grid;grid-template-columns:1fr 1fr;gap:8px">${mini("Valeur du stock",fMoney(valeurStock))}${mini("Références en alerte",stockAlertes,stockAlertes?"#991b1b":"#15803d")}</div>`,th)}
    </div>
  `;
}

// ════════════════════════════════════════════════════════
