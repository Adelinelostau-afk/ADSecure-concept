// ── FICHE CLIENT ────────────────────────────────────────
// ════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// ── GRAND LIVRE CLIENT (compte client dans la fiche) ──────
// ══════════════════════════════════════════════════════════
// Débit = ce que le client doit (factures émises), crédit = ce qu'il a réglé
// (règlements des factures + acomptes versés sur un bon de commande pas encore facturé).
// Solde > 0 : compte débiteur (le client doit de l'argent) ; solde < 0 : compte créditeur (avance).
let glcFiltre={};   // période par client : {clientId:"tout"|"annee"|...}
function glcEsc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function glcEur(n){return (Number(n)||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2});}
function glcR(n){return Math.round((Number(n)||0)*100)/100;}
function glcFacturesClient(c){
  return FACTURES.filter(f=>facEnCompta(f)&&(f.clientId===c.id||(!f.clientId&&f.client&&f.client===c.nom))&&f.statut!=="brouillon"&&f.statut!=="annulee");
}
function glcBCClient(c){ return BCCLIENTS.filter(b=>b.clientId===c.id); }
// Retrouve la chaîne devis → bon de commande → facture
function glcChaineFacture(f){
  const bc=BCCLIENTS.find(b=>b.factureNum&&b.factureNum===f.num&&(b.clientId===f.clientId||!f.clientId));
  const dv=bc&&bc.devisId?DEVIS.find(d=>d.id===bc.devisId):null;
  return {bc,dv:dv||null,devisNum:dv?dv.num:(bc&&bc.devisNum)||f.devisNum||""};
}
function glcEcritures(c){
  const E=[];
  glcFacturesClient(c).forEach(f=>{
    const ch=glcChaineFacture(f);
    E.push({date:facDate(f)||"",ordre:0,piece:f.num,type:"fac",id:f.id,
      libelle:"Facture"+(f.refChantier?" — "+f.refChantier:"")+(ch.devisNum?" (devis "+ch.devisNum+")":""),
      debit:glcR(facTTC(f)),credit:0,ech:f.ech||"",statut:facStatutReel(f)});
    (f.paiements||[]).forEach(p=>E.push({date:p.date||facDate(f)||"",ordre:1,piece:f.num,type:"reg",id:f.id,
      libelle:"Règlement "+(p.mode||"")+" sur "+f.num,debit:0,credit:glcR(p.montant)}));
    // Facture marquée « Payée » à la main sans détail du règlement : on solde le reste
    if(f.statut==="payee"&&facReste(f)>0.004) E.push({date:facDate(f)||"",ordre:2,piece:f.num,type:"reg",id:f.id,
      libelle:"Règlement (facture marquée payée, mode non renseigné)",debit:0,credit:glcR(facReste(f))});
  });
  glcBCClient(c).filter(b=>b.statut!=="facture").forEach(b=>(b.paiements||[]).filter(p=>dateEnCompta(p.date||b.date)).forEach(p=>E.push({
    date:p.date||b.date||"",ordre:1,piece:b.num,type:"acompte",id:b.id,
    libelle:"Acompte "+(p.mode||"")+" sur "+b.num+(b.devisNum?" (devis "+b.devisNum+")":""),debit:0,credit:glcR(p.montant)})));
  const E2=E.filter(e=>e.type==='fac'||dateEnCompta(e.date)||glcFacturesClient(c).some(f=>f.num===e.piece));E.length=0;E.push(...E2);
  E.sort((a,b)=>(a.date||"").localeCompare(b.date||"")||a.ordre-b.ordre);
  let s=0;E.forEach(e=>{s=glcR(s+e.debit-e.credit);e.solde=s;});
  return E;
}
function glcSynthese(c){
  const E=glcEcritures(c);
  const debit=glcR(E.reduce((s,e)=>s+e.debit,0)),credit=glcR(E.reduce((s,e)=>s+e.credit,0));
  const solde=glcR(debit-credit);
  const facs=glcFacturesClient(c);
  const enRetard=facs.filter(f=>facStatutReel(f)!=="payee"&&facReste(f)>0&&f.ech&&f.ech<getToday());
  const echu=glcR(enRetard.reduce((s,f)=>s+facReste(f),0));
  const nbRetard=enRetard.length;
  // Devis acceptés pas encore transformés en BC ni facturés = carnet de commandes à venir
  const aVenir=glcR(DEVIS.filter(d=>d.clientId===c.id&&d.statut==="accepte"&&!BCCLIENTS.some(b=>b.devisId===d.id)).reduce((s,d)=>s+glcR(devisTTC(d)),0)
    +glcBCClient(c).filter(b=>b.statut!=="facture").reduce((s,b)=>s+glcR(devisTTC(b)),0));
  const acomptes=glcR(E.filter(e=>e.type==="acompte").reduce((s,e)=>s+e.credit,0));
  return {E,debit,credit,solde,echu,nbRetard,aVenir,acomptes};
}
function glcEtat(solde,acomptes){
  if(solde>0.004) return {lbl:"Débiteur",bg:"#fee2e2",col:"#991b1b",txt:"Le client vous doit"};
  if(solde<-0.004&&acomptes>0.004&&Math.abs(solde)<=acomptes+0.004) return {lbl:"Acompte reçu",bg:"#e8f4f8",col:"#3286A0",txt:"À déduire de la future facture"};
  if(solde<-0.004) return {lbl:"Créditeur",bg:"#e8f4f8",col:"#3286A0",txt:"Avance du client"};
  return {lbl:"Soldé",bg:"#dcfce7",col:"#15803d",txt:"Compte à jour"};
}

function renderGrandLivreClient(c){
  const S=glcSynthese(c);
  const et=glcEtat(S.solde,S.acomptes);
  const per=glcFiltre[c.id]||"tout";
  const t=getToday();
  const debut=per==="annee"?t.slice(0,4)+"-01-01":per==="12m"?addDays(t,-365):"";
  // Report à nouveau : solde des écritures antérieures à la période affichée
  const avant=debut?S.E.filter(e=>(e.date||"")<debut):[];
  const report=avant.length?avant[avant.length-1].solde:0;
  const lignes=debut?S.E.filter(e=>(e.date||"")>=debut):S.E;
  const ST={payee:["#dcfce7","#15803d","Payée"],partiel:["#fef9c3","#a16207","Partielle"],retard:["#fee2e2","#991b1b","En retard"],envoyee:["#e8f4f8","#3286A0","À régler"]};
  const chip=(v,l)=>`<button onclick="glcFiltre['${c.id}']='${v}';renderPage()" style="padding:5px 11px;border-radius:999px;border:1.5px solid ${per===v?TH.c1:"#e2e8f0"};background:${per===v?TH.c1:"#fff"};color:${per===v?"#fff":"#475569"};cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif">${l}</button>`;
  const clic=e=>e.type==="acompte"?`modalPaiementBCC('${e.id}')`:e.type==="reg"?`modalPaiement('${e.id}')`:`modalFacture('${e.id}')`;
  return `<div class="section-card" style="background:${TH.card}">
    <div class="section-head">
      <div><div class="section-title" style="color:${TH.txt}">📒 Grand livre client</div><div class="section-sub">Factures, règlements et acomptes de ${glcEsc(c.nom)}</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn-sm" onclick="glcImprimer('${c.id}')">📄 Relevé de compte PDF</button>
        <button class="btn-sm" onclick="glcExportCSV('${c.id}')">⬇️ CSV</button>
      </div>
    </div>
    <div style="padding:16px 18px 6px;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">
      <div style="background:${et.bg};border-radius:12px;padding:12px 14px">
        <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${et.col}">Solde · ${et.lbl}</div>
        <div style="font-size:20px;font-weight:800;color:${et.col};margin-top:2px">${glcEur(Math.abs(S.solde))}</div>
        <div style="font-size:11px;color:${et.col}">${et.txt}</div>
      </div>
      <div style="background:#F7F4ED;border-radius:12px;padding:12px 14px">
        <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b">Total facturé</div>
        <div style="font-size:17px;font-weight:800;margin-top:2px">${glcEur(S.debit)}</div></div>
      <div style="background:#F7F4ED;border-radius:12px;padding:12px 14px">
        <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b">Total réglé</div>
        <div style="font-size:17px;font-weight:800;color:#15803d;margin-top:2px">${glcEur(S.credit)}</div></div>
      <div style="background:${S.echu>0?"#fef2f2":"#F7F4ED"};border-radius:12px;padding:12px 14px">
        <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${S.echu>0?"#991b1b":"#64748b"}">Échu impayé</div>
        <div style="font-size:17px;font-weight:800;color:${S.echu>0?"#991b1b":TH.txt};margin-top:2px">${glcEur(S.echu)}</div>
        ${S.nbRetard?`<div style="font-size:11px;color:#991b1b">${S.nbRetard} facture(s) en retard</div>`:""}</div>
      ${S.aVenir>0?`<div style="background:#F7F4ED;border-radius:12px;padding:12px 14px">
        <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b">À facturer</div>
        <div style="font-size:17px;font-weight:800;color:#8a6d3b;margin-top:2px">${glcEur(S.aVenir)}</div>
        <div style="font-size:11px;color:#64748b">${S.acomptes>0?`dont ${glcEur(S.acomptes)} d'acompte déjà reçu`:"devis acceptés / BC en cours"}</div></div>`:""}
    </div>
    <div style="padding:8px 18px;display:flex;gap:6px;flex-wrap:wrap">${chip("tout","Tout")}${chip("annee","Cette année")}${chip("12m","12 derniers mois")}</div>
    ${S.E.length===0?`<div style="padding:26px;text-align:center;color:${TH.txt}66;font-size:13px">Aucune facture ni règlement pour ce client.</div>`:`
    <div style="overflow-x:auto;padding:0 18px 14px">
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;min-width:560px">
        <thead><tr style="text-align:left;color:#94a3b8;font-size:10.5px;text-transform:uppercase;letter-spacing:0.05em">
          <th style="padding:8px 6px">Date</th><th style="padding:8px 6px">Pièce</th><th style="padding:8px 6px">Libellé</th>
          <th style="padding:8px 6px;text-align:right">Débit</th><th style="padding:8px 6px;text-align:right">Crédit</th><th style="padding:8px 6px;text-align:right">Solde</th></tr></thead>
        <tbody>
          ${debut?`<tr style="background:#F7F4ED"><td style="padding:8px 6px" colspan="5"><em>Report à nouveau au ${fDate(debut)}</em></td><td style="padding:8px 6px;text-align:right;font-weight:700">${glcEur(report)}</td></tr>`:""}
          ${lignes.map(e=>{const st=e.type==="fac"?ST[e.statut]:null;return `<tr onclick="${clic(e)}" style="border-top:1px solid var(--line);cursor:pointer">
            <td style="padding:8px 6px;white-space:nowrap">${fDate(e.date)}</td>
            <td style="padding:8px 6px;white-space:nowrap;font-weight:700;color:${TH.c1}">${glcEsc(e.piece)}</td>
            <td style="padding:8px 6px">${e.type==="fac"?"🧾":"💶"} ${glcEsc(e.libelle)}${st?` ${badge(st[2],st[0],st[1])}`:""}${e.type==="fac"&&e.ech&&e.statut!=="payee"?`<div style="font-size:10.5px;color:#94a3b8">Échéance ${fDate(e.ech)}</div>`:""}</td>
            <td style="padding:8px 6px;text-align:right;white-space:nowrap">${e.debit?glcEur(e.debit):""}</td>
            <td style="padding:8px 6px;text-align:right;white-space:nowrap;color:#15803d">${e.credit?glcEur(e.credit):""}</td>
            <td style="padding:8px 6px;text-align:right;white-space:nowrap;font-weight:700;color:${e.solde>0.004?"#991b1b":e.solde<-0.004?TH.c1:"#15803d"}">${glcEur(e.solde)}</td>
          </tr>`;}).join("")}
          <tr style="border-top:2px solid ${TH.txt}33;font-weight:800">
            <td style="padding:9px 6px" colspan="3">Totaux${debut?" de la période":""}</td>
            <td style="padding:9px 6px;text-align:right">${glcEur(lignes.reduce((s,e)=>s+e.debit,0))}</td>
            <td style="padding:9px 6px;text-align:right;color:#15803d">${glcEur(lignes.reduce((s,e)=>s+e.credit,0))}</td>
            <td style="padding:9px 6px;text-align:right;color:${et.col}">${glcEur(S.solde)}</td></tr>
        </tbody>
      </table>
    </div>`}
    ${renderGlcCorrespondances(c)}
  </div>`;
}

function glcFacDuBC(bc){
  if(!bc.factureNum) return null;
  return FACTURES.find(x=>x.num===bc.factureNum&&x.clientId===bc.clientId)||FACTURES.find(x=>x.num===bc.factureNum)||null;
}
// Correspondance devis → bon de commande → facture → règlements
function renderGlcCorrespondances(c){
  const devis=DEVIS.filter(d=>d.clientId===c.id&&["accepte","transforme"].includes(d.statut)||(d.clientId===c.id&&BCCLIENTS.some(b=>b.devisId===d.id)));
  const vus=new Set();
  const chaines=[];
  devis.forEach(d=>{
    const bcs=BCCLIENTS.filter(b=>b.devisId===d.id);
    if(bcs.length===0) chaines.push({d,bc:null,f:null});
    bcs.forEach(bc=>{const f=glcFacDuBC(bc);if(f)vus.add(f.id);vus.add("bc"+bc.id);chaines.push({d,bc,f});});
  });
  glcBCClient(c).filter(b=>!vus.has("bc"+b.id)).forEach(bc=>{const f=glcFacDuBC(bc);if(f)vus.add(f.id);chaines.push({d:null,bc,f});});
  glcFacturesClient(c).filter(f=>!vus.has(f.id)).forEach(f=>chaines.push({d:null,bc:null,f}));
  if(!chaines.length) return "";
  const etape=(ico,lbl,num,montant,sub,onclick,actif)=>`<div onclick="${onclick||""}" style="flex:1;min-width:120px;padding:9px 11px;border-radius:10px;border:1.5px solid ${actif?TH.c1+"55":"#e2e8f0"};background:${actif?"#fff":"#f8fafc"};cursor:${onclick?"pointer":"default"};opacity:${actif?1:0.55}">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8">${ico} ${lbl}</div>
      <div style="font-weight:700;font-size:12.5px;color:${actif?TH.c1:"#94a3b8"}">${num?glcEsc(num):"—"}</div>
      ${montant!==null?`<div style="font-size:12px;font-weight:700">${glcEur(montant)}</div>`:""}
      ${sub?`<div style="font-size:10.5px;color:#64748b">${sub}</div>`:""}</div>`;
  const fl=`<div style="align-self:center;color:#cbd5e1;font-size:14px">→</div>`;
  return `<div style="padding:4px 18px 16px">
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:6px 0 8px">Correspondance des documents</div>
    ${chaines.sort((a,b)=>((b.f&&facDate(b.f))||(b.bc&&b.bc.date)||(b.d&&b.d.date)||"").localeCompare((a.f&&facDate(a.f))||(a.bc&&a.bc.date)||(a.d&&a.d.date)||"")).map(({d,bc,f})=>{
      const payeBC=bc&&bc.statut!=="facture"?bccPaye(bc):0;
      const regle=glcR(f?(f.statut==="payee"?Math.max(facPaye(f),facTTC(f)):facPaye(f)):payeBC), du=glcR(f?facTTC(f):(bc?devisTTC(bc):(d?devisTTC(d):0)));
      const reste=glcR(Math.max(0,du-regle));
      const fst=f?facStatutReel(f):"";
      return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:stretch">
        ${etape("📝","Devis",d&&d.num,d?devisTTC(d):null,d?fDate(d.date):"",d?`modalDevis('${d.id}')`:"",!!d)}${fl}
        ${etape("📋","Bon de commande",bc&&bc.num,null,bc?fDate(bc.date):"",bc?`modalBCC('${bc.id}')`:"",!!bc)}${fl}
        ${etape("🧾","Facture",f&&f.num,f?facTTC(f):null,f?fDate(facDate(f)):"",f?`modalFacture('${f.id}')`:"",!!f)}${fl}
        ${etape("💶","Réglé",regle>0?glcEur(regle):"",null,reste>0.004?`<span style="color:${fst==="retard"?"#991b1b":"#b45309"};font-weight:700">Reste ${glcEur(reste)}</span>`:(du>0?`<span style="color:#15803d;font-weight:700">✓ Soldé</span>`:""),f?`modalPaiement('${f.id}')`:(bc?`modalPaiementBCC('${bc.id}')`:""),regle>0)}
      </div>`;}).join("")}
  </div>`;
}

function glcExportCSV(clientId){
  const c=CLIENTS.find(x=>x.id===clientId);if(!c)return;
  const E=glcEcritures(c);
  const n=v=>v?(Number(v).toFixed(2).replace(".",",")):"";
  const q=s=>'"'+String(s==null?"":s).replace(/"/g,'""')+'"';
  const rows=[["Date","Pièce","Libellé","Débit","Crédit","Solde"]].concat(E.map(e=>[e.date,e.piece,e.libelle,n(e.debit),n(e.credit),Number(e.solde).toFixed(2).replace(".",",")]));
  const blob=new Blob(["﻿"+rows.map(r=>r.map(q).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download=`grand-livre_${c.nom.replace(/[^a-z0-9]+/gi,"-")}_${getToday()}.csv`;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
}
function glcImprimer(clientId){
  const c=CLIENTS.find(x=>x.id===clientId);if(!c)return;
  const S=glcSynthese(c),et=glcEtat(S.solde,S.acomptes),logoSrc=thLogo();
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relevé de compte — ${glcEsc(c.nom)}</title><style>
    body{font-family:'Inter',Arial,sans-serif;color:#1A2118;padding:36px 42px;font-size:12px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${TH.c1};padding-bottom:16px;margin-bottom:22px}
    .logo{display:flex;align-items:center;gap:12px}.logo img{width:56px;height:56px;object-fit:contain}
    h1{margin:0;font-size:20px;text-align:right}.st{font-size:12px;color:#64748b;text-align:right;margin-top:4px}
    .parties{display:flex;justify-content:space-between;margin-bottom:20px}.lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-bottom:18px}
    th{background:${TH.sidebar};color:#fff;padding:8px 10px;text-align:left;font-size:10.5px;text-transform:uppercase}
    td{padding:7px 10px;border-bottom:1px solid #e8e4dc}.r{text-align:right}
    .tot td{font-weight:800;background:#F7F4ED}
    .solde{display:inline-block;padding:12px 18px;border-radius:10px;background:${et.bg};color:${et.col};font-weight:800;font-size:15px}
    .foot{margin-top:30px;font-size:10px;color:#94a3b8;text-align:center}
    @media print{body{padding:20px 26px}}</style></head><body>
    <div class="head"><div class="logo">${logoSrc?`<img src="${logoSrc}" onerror="this.style.display='none'"/>`:""}<div><div style="font-size:18px;font-weight:800">${glcEsc(TH.nom)}</div><div style="color:${TH.c1}">${glcEsc(TH.sous||"")}</div></div></div>
      <div><h1>RELEVÉ DE COMPTE CLIENT</h1><div class="st">Arrêté au ${fDate(getToday())} ${getToday().slice(0,4)}</div></div></div>
    <div class="parties"><div><div class="lbl">Émetteur</div><strong>${glcEsc(TH.nom)} ${glcEsc(TH.sous||"")}</strong><br/>${glcEsc(TH.adresse||TH.contratSiege||"")}<br/>${glcEsc(TH.email||"")} ${glcEsc(TH.tel||"")}</div>
      <div style="text-align:right"><div class="lbl">Client</div><strong>${glcEsc(c.nom)}</strong><br/>${glcEsc(c.contact||"")}<br/>${glcEsc(c.email||"")}</div></div>
    <table><thead><tr><th>Date</th><th>Pièce</th><th>Libellé</th><th class="r">Débit</th><th class="r">Crédit</th><th class="r">Solde</th></tr></thead><tbody>
      ${S.E.map(e=>`<tr><td>${fDate(e.date)} ${(e.date||"").slice(0,4)}</td><td>${glcEsc(e.piece)}</td><td>${glcEsc(e.libelle)}</td><td class="r">${e.debit?glcEur(e.debit):""}</td><td class="r">${e.credit?glcEur(e.credit):""}</td><td class="r">${glcEur(e.solde)}</td></tr>`).join("")}
      <tr class="tot"><td colspan="3">Totaux</td><td class="r">${glcEur(S.debit)}</td><td class="r">${glcEur(S.credit)}</td><td class="r">${glcEur(S.solde)}</td></tr>
    </tbody></table>
    <div class="solde">${S.solde>0.004?"Reste dû par le client : ":S.solde<-0.004?(et.lbl==="Acompte reçu"?"Acompte reçu, à déduire de la facture : ":"Avance en faveur du client : "):"Compte soldé : "}${glcEur(Math.abs(S.solde))}</div>
    ${S.echu>0?`<p style="color:#991b1b;margin-top:12px">Dont ${glcEur(S.echu)} échu(s) et non réglé(s) à ce jour.</p>`:""}
    <div class="foot">${glcEsc(TH.nom)} ${glcEsc(TH.sous||"")}${TH.contratSiren?" · SIREN "+glcEsc(TH.contratSiren):""} — document généré le ${fDate(getToday())} ${getToday().slice(0,4)}</div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),400);}<\/script></body></html>`;
  const w=window.open("","_blank");
  if(!w){alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF.");return;}
  w.document.write(html);w.document.close();
}

// ══════════════════════════════════════════════════════════
