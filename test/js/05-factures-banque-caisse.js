// ── ADMIN ────────────────────────────────────────────────
// ════════════════════════════════════════════════════════
// Carte Factures & Paiements — page Factures
function renderFacturesCard(){
  return`<div class="section-card" style="background:${TH.card}">
        <div class="section-head">
          <div><div class="section-title" style="color:${TH.txt}">Factures & Paiements</div><div class="section-sub">${FACTURES.length} factures</div></div>
          <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="modalFacture()">＋ Ajouter</button>
        </div>
        ${FACTURES.map(f=>{
          const stReel=facStatutReel(f);
          const[bg,col,lbl]=ST_FAC[stReel]||["#f1f5f9","#64748b",stReel];
          const ttc=facTTC(f),paye=facPaye(f),reste=facReste(f);
          const pct=ttc>0?Math.round(paye/ttc*100):0;
          return`<div class="cmd-row" style="flex-wrap:wrap">
          <div style="flex:1;min-width:140px"><div style="font-weight:700;font-size:13px;color:${TH.c1}">${f.num}</div><div style="font-size:11px;color:${TH.txt}BB">${f.client} · ${fDate(f.ech)}</div>
            ${paye>0&&!facEstPayee(f)?`<div style="margin-top:4px"><div style="height:5px;background:#f1ede5;border-radius:3px;overflow:hidden;max-width:140px"><div style="height:100%;width:${pct}%;background:#a16207;border-radius:3px"></div></div><div style="font-size:10px;color:#a16207;margin-top:2px">Reste ${fMoney(reste)}</div></div>`:""}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="text-align:right"><div style="font-weight:700;font-size:13px;color:${TH.txt}">${fMoney(ttc)}</div>${badge(lbl,bg,col)}</div>
            ${stReel==="retard"?`<button class="btn-sm" onclick="voirTexteRelance('${f.id}')" title="${labelRelance(niveauRelance(f))}" style="border-color:${bordRelance(niveauRelance(f))};background:${bgRelance(niveauRelance(f))};color:${colorRelance(niveauRelance(f))}">📨</button>`:""}
            ${!facEstPayee(f)&&!["brouillon","annulee"].includes(f.statut)?`<button class="btn-sm" onclick="modalPaiement('${f.id}')" title="Enregistrer un paiement" style="border-color:#86efac;background:#f0fdf4;color:#15803d">💰</button>`:""}
            <button class="btn-sm" onclick="genererFacturePDF('${f.id}')" title="Générer PDF" style="border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8">📄</button>
            ${f.statut!=="annulee"?`<button class="btn-sm" onclick="modalEnvoiDoc('facture','${f.id}')" title="Envoyer par e-mail${(f.envois||[]).length?" (déjà envoyée le "+fDate(f.envois[f.envois.length-1].date)+")":""}" style="border-color:#bae6fd;background:#f0f9ff;color:#0369a1">✉️${(f.envois||[]).length?"✓":""}</button>`:""}
            <button class="btn-sm btn-edit" onclick="modalFacture('${f.id}')">✏️</button>
            <button class="btn-sm btn-danger" onclick="delFacture('${f.id}')">🗑️</button>
          </div>
        </div>`;}).join("")}
      </div>`;
}

// Page Factures dédiée (raccourci barre latérale)
function renderFactures(){
  const actives=FACTURES.filter(f=>facEnCompta(f)&&!["brouillon","annulee"].includes(f.statut));
  const totalEncaisse=actives.reduce((s,f)=>s+facPaye(f),0);
  const totalReste=actives.filter(f=>facStatutReel(f)!=="payee").reduce((s,f)=>s+facReste(f),0);
  const enRetard=FACTURES.filter(f=>facEnCompta(f)&&facStatutReel(f)==="retard");
  const resteRetard=enRetard.reduce((s,f)=>s+facReste(f),0);
  return `
    <div class="kpi-grid">
      ${kpi("Encaissé",fMoney(totalEncaisse),"#15803d",true)}
      ${kpi("Reste à encaisser",fMoney(totalReste),"#b45309",true)}
      ${kpi("En retard",fMoney(resteRetard),"#991b1b",true)}
      ${kpi("Factures impayées",actives.filter(f=>!facEstPayee(f)).length,TH.c1)}
    </div>
    ${enRetard.length>0?`<div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:14px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="font-size:22px">⚠️</span>
      <div style="flex:1;min-width:180px"><div style="font-weight:700;color:#991b1b;font-size:14px">${enRetard.length} facture(s) en retard de paiement</div><div style="font-size:12px;color:#b91c1c">${fMoney(resteRetard)} à recouvrer</div></div>
      <button onclick="modalRelancesImpayes()" style="padding:8px 14px;border-radius:9px;border:none;background:#991b1b;color:#fff;cursor:pointer;font-size:13px;font-weight:700;font-family:'Inter',sans-serif">📨 Relancer</button>
    </div>`:""}
    ${renderFacturesCard()}`;
}

// ══════════════════════════════════════════════════════════
// ── BANQUE (Qonto) ────────────────────────────────────────
// ══════════════════════════════════════════════════════════
async function fetchBanque(){
  banqueLoading=true; banqueErreur=null;
  if(currentPage==="banque") document.getElementById("content").innerHTML=renderBanque();
  try{
    const {data,error}=await sbClient.functions.invoke("qonto-solde",{});
    if(error) throw new Error(error.message);
    if(data&&data.error) throw new Error(data.error);
    BANQUE_DATA=data;
  }catch(e){
    banqueErreur=e.message||"Connexion à Qonto impossible.";
  }finally{
    banqueLoading=false;
    if(currentPage==="banque") document.getElementById("content").innerHTML=renderBanque();
  }
}
function fMontantSigne(t){
  const v=Number(t.montant||0);
  return (t.sens==="debit"?"-":"+")+v.toLocaleString("fr-FR",{style:"currency",currency:"EUR"});
}
function fDateTrans(iso){
  if(!iso) return "—";
  const d=new Date(iso);
  if(isNaN(d)) return "—";
  return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
}
function renderBanque(){
  const refreshBtn=`<button onclick="fetchBanque()" ${banqueLoading?"disabled":""} style="padding:8px 14px;border-radius:9px;border:1.5px solid ${TH.c1};background:#fff;color:${TH.c1};cursor:pointer;font-size:13px;font-weight:700;font-family:'Inter',sans-serif">${banqueLoading?"⟳ Actualisation…":"🔄 Actualiser"}</button>`;

  if(banqueLoading&&!BANQUE_DATA){
    return `<div class="section-card"><div style="padding:40px 20px;text-align:center;color:${TH.txt}99">⟳ Connexion à Qonto…</div></div>`;
  }
  if(banqueErreur){
    return `<div class="section-card">
      <div class="section-head"><div class="section-title">🏦 Banque</div>${refreshBtn}</div>
      <div style="padding:20px">
        <div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:11px;padding:14px 16px;color:#991b1b;font-size:13px;margin-bottom:10px">
          <strong>Connexion Qonto impossible.</strong><br/>${banqueErreur}
        </div>
        <div style="font-size:12px;color:${TH.txt}80">Vérifie que la fonction Supabase <code>qonto-solde</code> est déployée et que les identifiants Qonto (QONTO_LOGIN / QONTO_SECRET_KEY) sont bien enregistrés dans ses secrets.</div>
      </div>
    </div>`;
  }
  if(!BANQUE_DATA){
    return `<div class="section-card"><div style="padding:40px 20px;text-align:center;color:${TH.txt}99">Aucune donnée bancaire pour le moment.${refreshBtn}</div></div>`;
  }
  const comptes=BANQUE_DATA.comptes||[];
  const transactions=BANQUE_DATA.transactions||[];
  const soldeTotal=comptes.reduce((s,c)=>s+Number(c.solde||0),0);

  return `
    <div class="kpi-grid">
      ${kpi("Solde total Qonto",fMoney(soldeTotal),"#15803d",true)}
      ${comptes.map(c=>kpi(c.nom||"Compte",fMoney(c.solde),TH.c1,true)).join("")}
    </div>
    <div class="section-card">
      <div class="section-head">
        <div><div class="section-title">🏦 Comptes Qonto</div><div class="section-sub">${comptes.length} compte(s) connecté(s)</div></div>
        ${refreshBtn}
      </div>
      <div style="padding:14px 20px">
        ${comptes.map(c=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)">
          <div><div style="font-weight:700;font-size:13.5px">${c.nom||"Compte"}</div><div style="font-size:11.5px;color:${TH.txt}80;font-family:monospace">${c.iban||""}</div></div>
          <div style="font-weight:800;font-size:16px;color:${Number(c.solde)>=0?"#15803d":"#991b1b"}">${fMoney(c.solde)}</div>
        </div>`).join("")||`<div style="padding:14px 0;color:${TH.txt}80;font-size:13px">Aucun compte trouvé.</div>`}
      </div>
    </div>
    ${renderRapprochement(transactions)}`;
}

// ══════════════════════════════════════════════════════════
// ── CAISSE : journal de toutes les transactions + comptage des espèces ──
// ══════════════════════════════════════════════════════════
// Le journal réunit automatiquement les règlements déjà saisis dans l'appli
// (factures clients, bons de commande non facturés, factures fournisseurs)
// et les mouvements saisis à la main dans la caisse (CAISSE.mouvements).
// Les comptages d'espèces (CAISSE.comptages) comparent le contenu réel de la
// caisse au solde espèces théorique calculé à partir du journal.
let CAISSE={mouvements:[],comptages:[]};
let caisseOnglet="journal";
let caisseFiltre={periode:"mois",du:"",au:"",sens:"tous",mode:"tous",q:""};
const CAISSE_CAT_ENTREE=["Vente comptoir","Encaissement divers","Apport de fonds","Retrait banque vers caisse","Remboursement reçu","Autre recette"];
const CAISSE_CAT_SORTIE=["Achat matériel","Fournitures","Carburant / déplacement","Frais divers","Dépôt en banque","Remboursement versé","Autre dépense"];
const CAISSE_BILLETS=[50000,20000,10000,5000,2000,1000,500];        // en centimes
const CAISSE_PIECES=[200,100,50,20,10,5,2,1];
const CAISSE_TYPES_CPT={ouverture:"Ouverture",cloture:"Clôture",controle:"Contrôle"};

function caisseNorm(){
  if(!CAISSE||typeof CAISSE!=="object") CAISSE={mouvements:[],comptages:[]};
  if(!Array.isArray(CAISSE.mouvements)) CAISSE.mouvements=[];
  if(!Array.isArray(CAISSE.comptages)) CAISSE.comptages=[];
}
function cEur(n){return (Number(n)||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2});}
function cEsc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function cCts(n){return Math.round((Number(n)||0)*100);}
function cDateLong(s){return s?new Date(s+"T00:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}):"—";}
function cCoupureLbl(c){return c>=100?(c/100)+" €":c+" c";}

// Toutes les transactions de l'entreprise, triées de la plus récente à la plus ancienne
function caisseLignes(){
  caisseNorm();
  const L=[];
  FACTURES.forEach(f=>(f.paiements||[]).forEach((p,i)=>L.push({
    id:"fac-"+f.id+"-"+i,date:p.date||f.date||"",sens:"entree",montant:Number(p.montant)||0,mode:p.mode||"Autre",
    cat:"Encaissement client",libelle:"Règlement facture "+(f.num||""),tiers:f.client||"",source:"Facture",ref:f.num||"",auto:true,srcType:"fac",srcId:f.id})));
  BCCLIENTS.filter(b=>b.statut!=="facture").forEach(b=>{
    const cli=CLIENTS.find(c=>c.id===b.clientId);
    (b.paiements||[]).forEach((p,i)=>L.push({
      id:"bcc-"+b.id+"-"+i,date:p.date||b.date||"",sens:"entree",montant:Number(p.montant)||0,mode:p.mode||"Autre",
      cat:"Acompte client",libelle:"Règlement bon de commande "+(b.num||""),tiers:cli?cli.nom:(b.client||""),source:"Bon de commande",ref:b.num||"",auto:true,srcType:"bcc",srcId:b.id}));
  });
  FACFOURN.forEach(f=>(f.paiements||[]).forEach((p,i)=>L.push({
    id:"ff-"+f.id+"-"+i,date:p.date||f.date||"",sens:"sortie",montant:Number(p.montant)||0,mode:p.mode||"Autre",
    cat:"Achat fournisseur",libelle:"Règlement facture fournisseur "+(f.numFour||f.num||""),tiers:f.four||"",source:"Facture fournisseur",ref:f.num||"",auto:true,srcType:"ff",srcId:f.id})));
  CAISSE.mouvements.forEach(m=>L.push({...m,montant:Number(m.montant)||0,source:"Caisse",ref:m.ref||"",auto:false}));
  return L.filter(l=>dateEnCompta(l.date)).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.ts||"").localeCompare(a.ts||""));
}
// Solde espèces théorique (toutes dates confondues, ou jusqu'à une date incluse)
function caisseSoldeEspeces(jusqua){
  return caisseLignes().filter(l=>l.mode==="Espèces"&&(!jusqua||(l.date||"")<=jusqua))
    .reduce((s,l)=>s+(l.sens==="entree"?cCts(l.montant):-cCts(l.montant)),0)/100;
}
function caisseBornes(){
  const t=getToday(),f=caisseFiltre,d=new Date(t+"T00:00:00");
  const iso=x=>x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");
  if(f.periode==="jour") return [t,t];
  if(f.periode==="semaine") return [weekStart(0),t];
  if(f.periode==="mois") return [t.slice(0,7)+"-01",t];
  if(f.periode==="moisprec"){const a=new Date(d.getFullYear(),d.getMonth()-1,1),b=new Date(d.getFullYear(),d.getMonth(),0);return [iso(a),iso(b)];}
  if(f.periode==="annee") return [t.slice(0,4)+"-01-01",t];
  if(f.periode==="perso") return [f.du||"0000-01-01",f.au||"9999-12-31"];
  return ["0000-01-01","9999-12-31"];
}
function caisseLibPeriode(){
  const f=caisseFiltre;
  return {jour:"aujourd'hui",semaine:"cette semaine",mois:"ce mois-ci",moisprec:"le mois dernier",annee:"cette année",tout:"depuis le début",
    perso:(f.du?"du "+cDateLong(f.du):"")+(f.au?" au "+cDateLong(f.au):"")||"période choisie"}[f.periode]||"";
}
function caisseFiltrees(){
  const [du,au]=caisseBornes(),f=caisseFiltre,q=(f.q||"").trim().toLowerCase();
  return caisseLignes().filter(l=>{
    if((l.date||"")<du||(l.date||"")>au) return false;
    if(f.sens!=="tous"&&l.sens!==f.sens) return false;
    if(f.mode!=="tous"&&l.mode!==f.mode) return false;
    if(q&&![l.libelle,l.tiers,l.cat,l.ref,l.mode,l.note].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
}

// ── Page ──────────────────────────────────────────────────
function renderCaisse(){
  caisseNorm();
  const esp=caisseSoldeEspeces();
  const dernier=[...CAISSE.comptages].sort((a,b)=>(b.ts||"").localeCompare(a.ts||""))[0];
  const tab=(id,lbl)=>`<button onclick="caisseOnglet='${id}';renderPage()" style="padding:9px 16px;border-radius:999px;border:1.5px solid ${caisseOnglet===id?TH.c1:"#e2e8f0"};background:${caisseOnglet===id?TH.c1:"#fff"};color:${caisseOnglet===id?"#fff":"#475569"};cursor:pointer;font-size:13px;font-weight:700;font-family:'Inter',sans-serif">${lbl}</button>`;
  return `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center">
      ${tab("journal","📒 Journal des transactions")}${tab("comptage","🪙 Comptage des espèces")}
      <div style="flex:1"></div>
      <button class="btn-add" style="background:#15803d;color:#fff" onclick="modalCaisseMvt(null,'entree')">＋ Entrée</button>
      <button class="btn-add" style="background:#991b1b;color:#fff" onclick="modalCaisseMvt(null,'sortie')">－ Sortie</button>
    </div>
    ${caisseOnglet==="comptage"?renderCaisseComptage(esp,dernier):renderCaisseJournal(esp,dernier)}`;
}

function renderCaisseJournal(esp,dernier){
  const lignes=caisseFiltrees();
  const ent=lignes.filter(l=>l.sens==="entree").reduce((s,l)=>s+cCts(l.montant),0)/100;
  const sor=lignes.filter(l=>l.sens==="sortie").reduce((s,l)=>s+cCts(l.montant),0)/100;
  const modes=[...new Set([...MODES_PAIEMENT,...caisseLignes().map(l=>l.mode)])].filter(Boolean);
  const f=caisseFiltre;
  const sel=(id,val,opts)=>`<select onchange="caisseFiltre.${id}=this.value;renderPage()" style="padding:8px 10px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13px;background:#fff;font-family:'Inter',sans-serif">${opts.map(([v,l])=>`<option value="${v}" ${v===val?"selected":""}>${l}</option>`).join("")}</select>`;
  // Répartition par mode de paiement sur la période
  const parMode={};lignes.forEach(l=>{const k=l.mode||"Autre";parMode[k]=(parMode[k]||0)+(l.sens==="entree"?cCts(l.montant):-cCts(l.montant));});
  // Regroupement par jour
  const jours={};lignes.forEach(l=>{(jours[l.date||"—"]=jours[l.date||"—"]||[]).push(l);});
  const listeJours=Object.keys(jours).sort((a,b)=>b.localeCompare(a));
  return `
    <div class="kpi-grid">
      ${kpi("Entrées "+caisseLibPeriode(),cEur(ent),"#15803d",true)}
      ${kpi("Sorties "+caisseLibPeriode(),cEur(sor),"#991b1b",true)}
      ${kpi("Solde de la période",cEur(ent-sor),ent-sor>=0?TH.c1:"#991b1b",true)}
      ${kpi("Espèces en caisse (théorique)",cEur(esp),"#8a6d3b",true)}
    </div>
    ${dernier?`<div style="font-size:12px;color:#64748b;margin:-10px 0 16px">Dernier comptage : ${CAISSE_TYPES_CPT[dernier.type]||""} du ${cDateLong(dernier.date)} — ${cEur(dernier.total)}${Math.abs(dernier.ecart||0)>=0.005?` · écart ${dernier.ecart>0?"+":""}${cEur(dernier.ecart)}`:" · sans écart"}</div>`:""}
    <div class="section-card">
      <div class="section-head">
        <div><div class="section-title">📒 Journal de caisse</div><div class="section-sub">${lignes.length} transaction(s) ${caisseLibPeriode()}</div></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn-sm" onclick="caisseExportCSV()">⬇️ Export CSV</button>
          <button class="btn-sm" onclick="caisseImprimerJournal()">🖨️ Imprimer / PDF</button>
        </div>
      </div>
      <div style="padding:12px 20px;display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--line);align-items:center">
        ${sel("periode",f.periode,[["jour","Aujourd'hui"],["semaine","Cette semaine"],["mois","Ce mois-ci"],["moisprec","Mois dernier"],["annee","Cette année"],["tout","Tout"],["perso","Dates au choix…"]])}
        ${f.periode==="perso"?`<input type="date" value="${f.du}" onchange="caisseFiltre.du=this.value;renderPage()" style="padding:7px 9px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13px"/><input type="date" value="${f.au}" onchange="caisseFiltre.au=this.value;renderPage()" style="padding:7px 9px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13px"/>`:""}
        ${sel("sens",f.sens,[["tous","Entrées et sorties"],["entree","Entrées"],["sortie","Sorties"]])}
        ${sel("mode",f.mode,[["tous","Tous les modes"],...modes.map(m=>[m,m])])}
        <input id="caisse-q" placeholder="🔍 Rechercher…" value="${cEsc(f.q)}" onchange="caisseFiltre.q=this.value;renderPage()" style="flex:1;min-width:140px;padding:8px 12px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13px;font-family:'Inter',sans-serif"/>
      </div>
      ${Object.keys(parMode).length?`<div style="padding:10px 20px;display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--line)">
        ${Object.entries(parMode).map(([m,v])=>`<span style="font-size:11.5px;padding:4px 10px;border-radius:999px;background:#F7F4ED;color:#475569"><strong>${cEsc(m)}</strong> ${v>=0?"+":""}${cEur(v/100)}</span>`).join("")}
      </div>`:""}
      <div style="padding:4px 20px 14px">
        ${listeJours.length===0?`<div style="padding:30px 0;text-align:center;color:#94a3b8;font-size:13px">Aucune transaction sur cette période.</div>`:
        listeJours.map(j=>{
          const tot=jours[j].reduce((s,l)=>s+(l.sens==="entree"?cCts(l.montant):-cCts(l.montant)),0)/100;
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8">
              <span>${j==="—"?"Sans date":new Date(j+"T00:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span>
              <span style="color:${tot>=0?"#15803d":"#991b1b"}">${tot>=0?"+":""}${cEur(tot)}</span></div>
            ${jours[j].map(caisseLigneHTML).join("")}`;
        }).join("")}
      </div>
    </div>`;
}
function caisseLigneHTML(l){
  const ent=l.sens==="entree";
  const clic=l.auto?`caisseOuvrirSource('${l.srcType}','${l.srcId}')`:`modalCaisseMvt('${l.id}')`;
  return `<div onclick="${clic}" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);cursor:pointer">
    <span style="width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:15px;background:${ent?"#dcfce7":"#fee2e2"}">${l.mode==="Espèces"?"💶":(ent?"↘️":"↗️")}</span>
    <div style="flex:1;min-width:0">
      <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cEsc(l.libelle||l.cat||"—")}${l.piece?" 📎":""}</div>
      <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cEsc(l.mode)} · ${cEsc(l.cat||"")}${l.tiers?" · "+cEsc(l.tiers):""}${l.auto?` · <span style="color:${TH.c1}">${cEsc(l.source)}</span>`:""}</div>
    </div>
    <div style="font-weight:800;font-size:14px;color:${ent?"#15803d":"#991b1b"};white-space:nowrap">${ent?"+":"−"}${cEur(l.montant)}</div>
  </div>`;
}
function caisseOuvrirSource(type,id){
  if(type==="fac") modalPaiement(id);
  else if(type==="bcc") modalPaiementBCC(id);
  else if(type==="ff") modalPaiementFF(id);
}

// ── Saisie d'un mouvement manuel ──────────────────────────
function modalCaisseMvt(id,sens){
  caisseNorm();
  const m=id?CAISSE.mouvements.find(x=>x.id===id):null;
  const s=m?m.sens:(sens||"entree");
  const cats=s==="entree"?CAISSE_CAT_ENTREE:CAISSE_CAT_SORTIE;
  const mode=m?m.mode:"Espèces";
  showModal(m?"Modifier le mouvement":(s==="entree"?"Nouvelle entrée de caisse":"Nouvelle sortie de caisse"),`
    <input type="hidden" id="cm-sens" value="${s}"/>
    <div class="field-row">
      <div class="field"><label>Montant (€)</label><input type="text" id="cm-montant" inputmode="decimal" autocomplete="off" value="${m?String(m.montant).replace(".",","):""}" placeholder="0,00"/></div>
      <div class="field"><label>Date</label><input type="date" id="cm-date" value="${m?m.date:getToday()}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Mode de paiement</label><select id="cm-mode">${MODES_PAIEMENT.map(x=>`<option ${x===mode?"selected":""}>${x}</option>`).join("")}</select></div>
      <div class="field"><label>Catégorie</label><select id="cm-cat">${[...cats,...(m&&!cats.includes(m.cat)?[m.cat]:[])].map(x=>`<option ${m&&x===m.cat?"selected":""}>${cEsc(x)}</option>`).join("")}</select></div>
    </div>
    <div class="field"><label>Libellé</label><input id="cm-lib" value="${cEsc(m?m.libelle:"")}" placeholder="${s==="entree"?"Ex : vente câble au comptoir":"Ex : achat de chevilles chez Mr Bricolage"}"/></div>
    <div class="field-row">
      <div class="field"><label>${s==="entree"?"Client / payeur":"Fournisseur / bénéficiaire"} (optionnel)</label><input id="cm-tiers" list="cm-tiers-list" value="${cEsc(m?m.tiers:"")}"/>
        <datalist id="cm-tiers-list">${(s==="entree"?CLIENTS.map(c=>c.nom):FOURNISSEURS.map(x=>x.nom)).map(n=>`<option value="${cEsc(n)}">`).join("")}</datalist></div>
      <div class="field"><label>N° de pièce (optionnel)</label><input id="cm-ref" value="${cEsc(m?m.ref:"")}" placeholder="Ex : ticket 4521"/></div>
    </div>
    <div class="field"><label>Note (optionnel)</label><input id="cm-note" value="${cEsc(m?m.note:"")}"/></div>
    <div class="field"><label>Justificatif (photo du ticket ou PDF, ${DOCS_MAX_MO} Mo max)</label>
      ${m&&m.piece?`<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;font-size:13px"><span>📎 ${cEsc(m.piece.nom)}</span>
        <button type="button" class="btn-sm" onclick="caisseVoirPiece('${m.id}')">Voir</button></div>`:""}
      <input type="file" id="cm-file" accept="application/pdf,image/*"/></div>
    ${m&&m.comptageId?`<div style="font-size:12px;color:#8a6d3b;background:#DED3BC55;padding:8px 12px;border-radius:9px">Ajustement créé automatiquement par un comptage de caisse.</div>`:""}
    <div id="cm-msg" style="display:none;margin-top:12px;padding:10px 12px;border-radius:9px;font-size:13px"></div>`,
    `${m?`<button class="btn-cancel" style="color:#991b1b;border-color:#fecaca" onclick="supprCaisseMvt('${m.id}')">🗑 Supprimer</button>`:""}
     <button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" id="cm-btn" style="background:${s==="entree"?"#15803d":"#991b1b"}" onclick="saveCaisseMvt(${m?`'${m.id}'`:"null"})">✓ Enregistrer</button>`);
  setTimeout(()=>{const i=document.getElementById("cm-montant");if(i&&!m)i.focus();},50);
}
function cmMsg(t){const b=document.getElementById("cm-msg");if(!b)return;b.style.display="block";b.textContent=t;b.style.background="#fef2f2";b.style.color="#991b1b";b.style.border="1.5px solid #fca5a5";}
async function saveCaisseMvt(id){
  caisseNorm();
  const montant=Math.round((parseFloat(String(document.getElementById("cm-montant").value).replace(/\s/g,"").replace(",","."))||0)*100)/100;
  if(montant<=0){cmMsg("Indiquez un montant supérieur à 0.");return;}
  const ancien=id?CAISSE.mouvements.find(x=>x.id===id):null;
  const obj={
    sens:document.getElementById("cm-sens").value,
    montant,
    date:document.getElementById("cm-date").value||getToday(),
    mode:document.getElementById("cm-mode").value,
    cat:document.getElementById("cm-cat").value,
    libelle:document.getElementById("cm-lib").value.trim(),
    tiers:document.getElementById("cm-tiers").value.trim(),
    ref:document.getElementById("cm-ref").value.trim(),
    note:document.getElementById("cm-note").value.trim(),
  };
  if(!obj.libelle) obj.libelle=obj.cat;
  const mid=ancien?ancien.id:uid();
  const fichier=document.getElementById("cm-file").files[0];
  if(fichier){
    if(fichier.size>DOCS_MAX_MO*1048576){cmMsg(`Fichier trop lourd (${fTaille(fichier.size)}). Maximum ${DOCS_MAX_MO} Mo.`);return;}
    if(!currentUser||!currentUser.tenant_id){cmMsg("Session invalide, reconnectez-vous.");return;}
    const btn=document.getElementById("cm-btn");if(btn){btn.disabled=true;btn.textContent="⟳ Envoi du justificatif…";}
    const ext=(fichier.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"");
    const path=`${currentUser.tenant_id}/caisse/${mid}-${Date.now()}.${ext}`;
    try{
      const {error}=await sbClient.storage.from(DOCS_BUCKET).upload(path,fichier,{contentType:fichier.type||"application/octet-stream",upsert:false});
      if(error) throw error;
      if(ancien&&ancien.piece&&ancien.piece.path) sbClient.storage.from(DOCS_BUCKET).remove([ancien.piece.path]).catch(()=>{});
      obj.piece={path,nom:fichier.name,type:fichier.type,taille:fichier.size};
    }catch(e){
      cmMsg("Envoi du justificatif impossible : "+(e.message||e));
      if(btn){btn.disabled=false;btn.textContent="✓ Enregistrer";}
      return;
    }
  }
  if(ancien){
    Object.assign(ancien,obj);
    logActivity("Caisse — mouvement modifié",`${obj.sens==="entree"?"+":"−"}${cEur(montant)} · ${obj.libelle}`);
  }else{
    CAISSE.mouvements.push({id:mid,ts:new Date().toISOString(),par:currentUser?currentUser.nom:"",...obj});
    logActivity(obj.sens==="entree"?"Caisse — entrée":"Caisse — sortie",`${cEur(montant)} (${obj.mode}) · ${obj.libelle}`);
  }
  saveData();closeModal();renderPage();
}
function supprCaisseMvt(id){
  const m=CAISSE.mouvements.find(x=>x.id===id);if(!m)return;
  if(!confirm(`Supprimer ce mouvement de ${cEur(m.montant)} ?`))return;
  if(m.piece&&m.piece.path) sbClient.storage.from(DOCS_BUCKET).remove([m.piece.path]).catch(()=>{});
  CAISSE.mouvements=CAISSE.mouvements.filter(x=>x.id!==id);
  logActivity("Caisse — mouvement supprimé",`${m.sens==="entree"?"+":"−"}${cEur(m.montant)} · ${m.libelle||""}`);
  saveData();closeModal();renderPage();
}
async function caisseVoirPiece(id){
  const m=CAISSE.mouvements.find(x=>x.id===id);if(!m||!m.piece)return;
  const {data,error}=await sbClient.storage.from(DOCS_BUCKET).createSignedUrl(m.piece.path,3600);
  if(error||!data){alert("Impossible d'ouvrir le justificatif : "+(error?error.message:"introuvable"));return;}
  window.open(data.signedUrl,"_blank");
}

// ── Comptage des espèces ──────────────────────────────────
function renderCaisseComptage(esp,dernier){
  const liste=[...CAISSE.comptages].sort((a,b)=>(b.ts||"").localeCompare(a.ts||""));
  return `
    <div class="kpi-grid">
      ${kpi("Espèces en caisse (théorique)",cEur(esp),"#8a6d3b",true)}
      ${kpi("Dernier comptage",dernier?cEur(dernier.total):"—",TH.c1,true)}
      ${kpi("Écart du dernier comptage",dernier?((dernier.ecart>0?"+":"")+cEur(dernier.ecart||0)):"—",dernier&&Math.abs(dernier.ecart||0)>=0.005?"#991b1b":"#15803d",true)}
      ${kpi("Comptages enregistrés",liste.length,TH.c1)}
    </div>
    <div class="section-card">
      <div class="section-head">
        <div><div class="section-title">🪙 Comptage des espèces</div><div class="section-sub">Comptez billets et pièces : l'appli compare avec le solde théorique</div></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn-add" style="background:#fff;color:${TH.c1};border:1.5px solid ${TH.c1}" onclick="modalComptage('ouverture')">☀️ Ouverture</button>
          <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="modalComptage('cloture')">🌙 Clôture</button>
          <button class="btn-add" style="background:#fff;color:#475569;border:1.5px solid #e2e8f0" onclick="modalComptage('controle')">🔎 Contrôle</button>
        </div>
      </div>
      <div style="padding:4px 20px 14px">
        ${liste.length===0?`<div style="padding:30px 0;text-align:center;color:#94a3b8;font-size:13px">Aucun comptage pour le moment.<br/>Commencez par un comptage d'ouverture pour fixer le fond de caisse.</div>`:
        liste.map(c=>{
          const ok=Math.abs(c.ecart||0)<0.005;
          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)">
            <span style="font-size:20px">${c.type==="ouverture"?"☀️":c.type==="cloture"?"🌙":"🔎"}</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13.5px">${CAISSE_TYPES_CPT[c.type]||"Comptage"} · ${cDateLong(c.date)}${c.heure?" à "+c.heure:""}</div>
              <div style="font-size:11.5px;color:#64748b">Compté par ${cEsc(c.par||"—")} · théorique ${cEur(c.theorique)}${c.note?" · "+cEsc(c.note):""}</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:800;font-size:15px">${cEur(c.total)}</div>
              ${badge(ok?"✓ Juste":(c.ecart>0?"+":"")+cEur(c.ecart),ok?"#dcfce7":"#fee2e2",ok?"#15803d":"#991b1b")}
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <button class="btn-sm" title="Imprimer la fiche" onclick="caisseImprimerComptage('${c.id}')">🖨️</button>
              <button class="btn-sm" title="Supprimer" onclick="supprComptage('${c.id}')">🗑</button>
            </div>
          </div>`;}).join("")}
      </div>
    </div>`;
}
function modalComptage(type){
  const theo=caisseSoldeEspeces();
  const ligne=c=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9">
      <div style="width:64px;font-weight:700;font-size:14px">${cCoupureLbl(c)}</div>
      <button type="button" onclick="cptPas(${c},-1)" style="width:34px;height:34px;border-radius:9px;border:1.5px solid #e2e8f0;background:#fff;font-size:17px;cursor:pointer">−</button>
      <input type="number" inputmode="numeric" min="0" step="1" id="cpt-${c}" value="" placeholder="0" oninput="cptMaj()" style="width:64px;text-align:center;padding:7px 4px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:15px"/>
      <button type="button" onclick="cptPas(${c},1)" style="width:34px;height:34px;border-radius:9px;border:1.5px solid #e2e8f0;background:#fff;font-size:17px;cursor:pointer">＋</button>
      <div id="cpt-st-${c}" style="flex:1;text-align:right;font-size:13px;color:#64748b">—</div>
    </div>`;
  showModal(`🪙 Comptage — ${CAISSE_TYPES_CPT[type]}`,`
    <input type="hidden" id="cpt-type" value="${type}"/>
    <div class="field-row">
      <div class="field"><label>Date</label><input type="date" id="cpt-date" value="${getToday()}"/></div>
      <div class="field"><label>Compté par</label><input id="cpt-par" value="${cEsc(currentUser?currentUser.nom:"")}"/></div>
    </div>
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:4px 0 4px">Billets</div>
    ${CAISSE_BILLETS.map(ligne).join("")}
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:14px 0 4px">Pièces</div>
    ${CAISSE_PIECES.map(ligne).join("")}
    <div style="background:#F7F4ED;border-radius:12px;padding:14px 16px;margin:16px 0 12px;position:sticky;bottom:0">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span style="color:#64748b">Billets</span><span id="cpt-tb" style="font-weight:700">0,00 €</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span style="color:#64748b">Pièces</span><span id="cpt-tp" style="font-weight:700">0,00 €</span></div>
      <div style="display:flex;justify-content:space-between;font-size:16px;padding-top:7px;border-top:1px solid #ddd;margin-bottom:5px"><span style="font-weight:700">Total compté</span><span id="cpt-total" style="font-weight:800">0,00 €</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span style="color:#64748b">Solde théorique</span><span style="font-weight:700">${cEur(theo)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:14px"><span style="font-weight:700">Écart</span><span id="cpt-ecart" style="font-weight:800">—</span></div>
    </div>
    <label id="cpt-adj-wrap" style="display:none;align-items:center;gap:8px;font-size:13px;margin-bottom:10px"><input type="checkbox" id="cpt-adj" checked/> Enregistrer l'écart comme ajustement de caisse (le solde théorique sera recalé sur le montant compté)</label>
    <div class="field"><label>Note (optionnel)</label><input id="cpt-note" placeholder="Ex : fond de caisse pour la semaine"/></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="saveComptage()">✓ Enregistrer le comptage</button>`);
  window._cptTheo=cCts(theo);
  cptMaj();
}
function cptPas(c,d){const i=document.getElementById("cpt-"+c);if(!i)return;i.value=Math.max(0,(parseInt(i.value)||0)+d)||"";cptMaj();}
function cptLire(){
  const det={};let tb=0,tp=0;
  CAISSE_BILLETS.forEach(c=>{const n=Math.max(0,parseInt(document.getElementById("cpt-"+c).value)||0);if(n)det[c]=n;tb+=n*c;});
  CAISSE_PIECES.forEach(c=>{const n=Math.max(0,parseInt(document.getElementById("cpt-"+c).value)||0);if(n)det[c]=n;tp+=n*c;});
  return {det,tb,tp,total:tb+tp};
}
function cptMaj(){
  const r=cptLire();
  [...CAISSE_BILLETS,...CAISSE_PIECES].forEach(c=>{const n=r.det[c]||0;const e=document.getElementById("cpt-st-"+c);if(e){e.textContent=n?cEur(n*c/100):"—";e.style.color=n?"#1A2118":"#94a3b8";e.style.fontWeight=n?"700":"400";}});
  document.getElementById("cpt-tb").textContent=cEur(r.tb/100);
  document.getElementById("cpt-tp").textContent=cEur(r.tp/100);
  document.getElementById("cpt-total").textContent=cEur(r.total/100);
  const ec=r.total-(window._cptTheo||0);
  const e=document.getElementById("cpt-ecart");
  e.textContent=ec===0?"✓ Aucun écart":(ec>0?"+":"")+cEur(ec/100)+(ec>0?" (excédent)":" (manquant)");
  e.style.color=ec===0?"#15803d":"#991b1b";
  document.getElementById("cpt-adj-wrap").style.display=ec===0?"none":"flex";
}
function saveComptage(){
  caisseNorm();
  const r=cptLire();
  const theo=window._cptTheo||0;
  const ecart=r.total-theo;
  if(r.total===0&&!confirm("Le total compté est de 0 €. Enregistrer quand même ?"))return;
  const now=new Date();
  const c={id:uid(),ts:now.toISOString(),type:document.getElementById("cpt-type").value,
    date:document.getElementById("cpt-date").value||getToday(),
    heure:String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0"),
    par:document.getElementById("cpt-par").value.trim(),note:document.getElementById("cpt-note").value.trim(),
    detail:r.det,totalBillets:r.tb/100,totalPieces:r.tp/100,total:r.total/100,theorique:theo/100,ecart:ecart/100,ajustementId:""};
  if(ecart!==0&&document.getElementById("cpt-adj").checked){
    const aid=uid();
    CAISSE.mouvements.push({id:aid,ts:now.toISOString(),par:c.par,sens:ecart>0?"entree":"sortie",montant:Math.abs(ecart)/100,
      date:c.date,mode:"Espèces",cat:"Ajustement de caisse",libelle:`Écart constaté au comptage (${(CAISSE_TYPES_CPT[c.type]||"").toLowerCase()})`,
      tiers:"",ref:"",note:"",comptageId:c.id});
    c.ajustementId=aid;
  }
  CAISSE.comptages.push(c);
  logActivity("Caisse — comptage "+(CAISSE_TYPES_CPT[c.type]||"").toLowerCase(),`${cEur(c.total)} compté · écart ${c.ecart>0?"+":""}${cEur(c.ecart)}`);
  saveData();closeModal();caisseOnglet="comptage";renderPage();
}
function supprComptage(id){
  const c=CAISSE.comptages.find(x=>x.id===id);if(!c)return;
  const adj=c.ajustementId&&CAISSE.mouvements.find(m=>m.id===c.ajustementId);
  if(!confirm(`Supprimer ce comptage du ${cDateLong(c.date)} ?${adj?"\nL'ajustement de caisse qu'il avait créé sera aussi supprimé.":""}`))return;
  CAISSE.comptages=CAISSE.comptages.filter(x=>x.id!==id);
  if(adj) CAISSE.mouvements=CAISSE.mouvements.filter(m=>m.id!==c.ajustementId);
  logActivity("Caisse — comptage supprimé",`${cDateLong(c.date)} · ${cEur(c.total)}`);
  saveData();renderPage();
}

// ── Exports ───────────────────────────────────────────────
function caisseExportCSV(){
  const L=caisseFiltrees();
  const num=n=>(Number(n)||0).toFixed(2).replace(".",",");
  const q=s=>'"'+String(s==null?"":s).replace(/"/g,'""')+'"';
  const rows=[["Date","Sens","Montant","Mode","Catégorie","Libellé","Tiers","Source","Référence","Note"]]
    .concat(L.map(l=>[l.date,l.sens==="entree"?"Entrée":"Sortie",(l.sens==="entree"?"":"-")+num(l.montant),l.mode,l.cat,l.libelle,l.tiers,l.source,l.ref,l.note||""]));
  const csv="﻿"+rows.map(r=>r.map(q).join(";")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  const [du,au]=caisseBornes();
  a.download=`journal-caisse_${caisseFiltre.periode==="tout"?"complet":du+"_"+au}.csv`;
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
}
function caisseEnteteDoc(titre,sousTitre){
  const logoSrc=thLogo();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${cEsc(titre)}</title><style>
    body{font-family:'Inter',Arial,sans-serif;color:#1A2118;padding:36px 42px;font-size:12.5px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${TH.c1};padding-bottom:16px;margin-bottom:22px}
    .logo-zone{display:flex;align-items:center;gap:12px}.logo-zone img{width:56px;height:56px;object-fit:contain}
    .brand-name{font-size:18px;font-weight:800}.brand-sub{font-size:12px;color:${TH.c1}}
    h1{margin:0;font-size:20px;text-align:right}.st{font-size:12px;color:#64748b;text-align:right;margin-top:4px}
    table{width:100%;border-collapse:collapse;margin-bottom:18px}
    th{background:${TH.sidebar};color:#fff;padding:8px 10px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:0.4px}
    td{padding:7px 10px;border-bottom:1px solid #e8e4dc}
    .r{text-align:right}.e{color:#15803d}.s{color:#991b1b}
    .tot td{font-weight:800;background:#F7F4ED}
    .sign{display:flex;gap:30px;margin-top:40px}.sign div{flex:1;border-top:1px solid #94a3b8;padding-top:6px;font-size:11px;color:#64748b}
    .foot{margin-top:30px;font-size:10px;color:#94a3b8;text-align:center}
    @media print{body{padding:20px 26px}}
  </style></head><body>
  <div class="head"><div class="logo-zone">${logoSrc?`<img src="${logoSrc}" onerror="this.style.display='none'"/>`:""}<div><div class="brand-name">${cEsc(TH.nom)}</div><div class="brand-sub">${cEsc(TH.sous||"")}</div></div></div>
  <div><h1>${cEsc(titre)}</h1><div class="st">${sousTitre}</div></div></div>`;
}
function caisseOuvrirImpression(html){
  const w=window.open("","_blank");
  if(!w){alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF.");return;}
  w.document.write(html+`<div class="foot">${cEsc(TH.nom)} ${cEsc(TH.sous||"")} — document généré le ${cDateLong(getToday())}</div><script>window.onload=()=>{setTimeout(()=>window.print(),400);}<\/script></body></html>`);
  w.document.close();
}
function caisseImprimerJournal(){
  const L=[...caisseFiltrees()].reverse();
  const ent=L.filter(l=>l.sens==="entree").reduce((s,l)=>s+cCts(l.montant),0)/100;
  const sor=L.filter(l=>l.sens==="sortie").reduce((s,l)=>s+cCts(l.montant),0)/100;
  caisseOuvrirImpression(caisseEnteteDoc("JOURNAL DE CAISSE",`Période : ${cEsc(caisseLibPeriode())}<br/>${L.length} transaction(s)`)+`
    <table><thead><tr><th>Date</th><th>Libellé</th><th>Tiers</th><th>Mode</th><th>Catégorie</th><th class="r">Entrée</th><th class="r">Sortie</th></tr></thead><tbody>
    ${L.map(l=>`<tr><td>${cDateLong(l.date)}</td><td>${cEsc(l.libelle)}${l.ref?`<br/><span style="color:#94a3b8;font-size:10.5px">${cEsc(l.ref)}</span>`:""}</td><td>${cEsc(l.tiers)}</td><td>${cEsc(l.mode)}</td><td>${cEsc(l.cat)}</td>
      <td class="r e">${l.sens==="entree"?cEur(l.montant):""}</td><td class="r s">${l.sens==="sortie"?cEur(l.montant):""}</td></tr>`).join("")}
    <tr class="tot"><td colspan="5">Totaux</td><td class="r e">${cEur(ent)}</td><td class="r s">${cEur(sor)}</td></tr>
    <tr class="tot"><td colspan="5">Solde de la période</td><td colspan="2" class="r">${cEur(ent-sor)}</td></tr>
    </tbody></table>
    <div style="font-size:12px">Espèces en caisse (solde théorique au ${cDateLong(getToday())}) : <strong>${cEur(caisseSoldeEspeces())}</strong></div>`);
}
function caisseImprimerComptage(id){
  const c=CAISSE.comptages.find(x=>x.id===id);if(!c)return;
  const det=c.detail||{};
  const ligne=v=>{const n=det[v]||0;return `<tr><td>${cCoupureLbl(v)}</td><td class="r">${n||"—"}</td><td class="r">${n?cEur(n*v/100):"—"}</td></tr>`;};
  const ok=Math.abs(c.ecart||0)<0.005;
  caisseOuvrirImpression(caisseEnteteDoc("FICHE DE COMPTAGE DE CAISSE",`${CAISSE_TYPES_CPT[c.type]||""} du ${cDateLong(c.date)}${c.heure?" à "+c.heure:""}<br/>Compté par ${cEsc(c.par||"—")}`)+`
    <div style="display:flex;gap:24px">
      <table style="flex:1"><thead><tr><th>Billets</th><th class="r">Nombre</th><th class="r">Montant</th></tr></thead><tbody>
        ${CAISSE_BILLETS.map(ligne).join("")}<tr class="tot"><td colspan="2">Total billets</td><td class="r">${cEur(c.totalBillets)}</td></tr></tbody></table>
      <table style="flex:1"><thead><tr><th>Pièces</th><th class="r">Nombre</th><th class="r">Montant</th></tr></thead><tbody>
        ${CAISSE_PIECES.map(ligne).join("")}<tr class="tot"><td colspan="2">Total pièces</td><td class="r">${cEur(c.totalPieces)}</td></tr></tbody></table>
    </div>
    <table style="width:340px;margin-left:auto"><tbody>
      <tr class="tot"><td>Total compté</td><td class="r">${cEur(c.total)}</td></tr>
      <tr><td>Solde théorique</td><td class="r">${cEur(c.theorique)}</td></tr>
      <tr class="tot"><td>Écart</td><td class="r ${ok?"e":"s"}">${ok?"Aucun écart":(c.ecart>0?"+":"")+cEur(c.ecart)}</td></tr>
      ${c.ajustementId?`<tr><td colspan="2" style="font-size:11px;color:#64748b">Écart enregistré en ajustement de caisse.</td></tr>`:""}
    </tbody></table>
    ${c.note?`<div style="background:#f8fafc;border-left:3px solid ${TH.c1};padding:10px 14px;font-size:12px">Note : ${cEsc(c.note)}</div>`:""}
    <div class="sign"><div>Signature de la personne ayant compté</div><div>Signature du responsable</div></div>`);
}

// ══════════════════════════════════════════════════════════
// ── RAPPROCHEMENT BANCAIRE QONTO ──────────────────────────
// ══════════════════════════════════════════════════════════
// RAPPRO[idTransaction] = {type:"fac"|"bcc"|"ff"|"ignore", id, ref, ts}
// Associer un crédit Qonto à une facture client y ajoute le règlement (mode Virement) ;
// associer un débit à une facture fournisseur y ajoute le règlement fournisseur.
let rapproFiltre="arapprocher";
function rpE(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function rpNorm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();}
function rpCents(n){return Math.round((Number(n)||0)*100);}
function rpDate(t){return String(t.date||"").slice(0,10)||getToday();}
// Documents encore à régler, dans le sens de la transaction
// Règlements saisis à la main (prélèvement, CB, virement…) pas encore pointés sur une opération bancaire
function rpPaiementsLibres(doc,t){
  const m=rpCents(t.montant);
  return (doc.paiements||[]).map((p,idx)=>({idx,montant:Number(p.montant)||0,date:p.date||"",mode:p.mode||""}))
    .filter((p,i)=>!(doc.paiements[i].qontoId)&&p.mode!=="Espèces"&&Math.abs(rpCents(p.montant)-m)<=1);
}
function rpCandidats(t){
  if(t.sens==="debit"){
    const L=[];
    FACFOURN.filter(f=>f.statut!=="brouillon").forEach(f=>{
      const base={type:"ff",id:f.id,ref:f.numFour||f.num,tiers:f.four||"",refs:[f.num,f.numFour].filter(Boolean),date:f.ech||f.date||""};
      if(ffReste(f)>0) L.push({...base,reste:ffReste(f)});
      rpPaiementsLibres(f,t).forEach(p=>L.push({...base,reste:p.montant,pointage:p.idx,info:`déjà réglée le ${fDate(p.date)} (${p.mode}) — à pointer`}));
    });
    return L;
  }
  const L=FACTURES.filter(f=>facEnCompta(f)&&!["brouillon","annulee"].includes(f.statut)&&facStatutReel(f)!=="payee"&&facReste(f)>0).map(f=>{
    const cli=CLIENTS.find(c=>c.id===f.clientId)||CLIENTS.find(c=>c.nom===f.client);
    return {type:"fac",id:f.id,ref:f.num,tiers:f.client||(cli&&cli.nom)||"",contact:cli&&cli.contact||"",reste:facReste(f),refs:[f.num],date:facDate(f)||""};});
  FACTURES.filter(f=>facEnCompta(f)&&!["brouillon","annulee"].includes(f.statut)).forEach(f=>{
    const cli=CLIENTS.find(c=>c.id===f.clientId)||CLIENTS.find(c=>c.nom===f.client);
    rpPaiementsLibres(f,t).forEach(p=>L.push({type:"fac",id:f.id,ref:f.num,tiers:f.client||(cli&&cli.nom)||"",contact:cli&&cli.contact||"",reste:p.montant,refs:[f.num],date:p.date||"",pointage:p.idx,info:`déjà encaissée le ${fDate(p.date)} (${p.mode}) — à pointer`}));
  });
  BCCLIENTS.filter(b=>b.statut!=="facture"&&bccReste(b)>0).forEach(b=>{const cli=CLIENTS.find(c=>c.id===b.clientId);
    L.push({type:"bcc",id:b.id,ref:b.num,tiers:cli?cli.nom:"",contact:cli&&cli.contact||"",reste:bccReste(b),refs:[b.num,b.devisNum].filter(Boolean),date:b.date||""});});
  return L;
}
// Score de ressemblance : référence citée dans le libellé, montant identique, nom du client
function rpSuggestions(t){
  const lib=rpNorm(t.libelle),libC=lib.replace(/ /g,"");
  const m=rpCents(t.montant);
  return rpCandidats(t).map(d=>{
    let s=0;const raisons=[];
    if(d.refs.some(r=>r&&libC.includes(rpNorm(r).replace(/ /g,"")))){s+=100;raisons.push("référence");}
    else{const num=(d.ref.match(/(\d+)$/)||[])[1];if(num&&num.length>=3&&new RegExp("(^|\\D)0*"+Number(num)+"(\\D|$)").test(lib)&&d.ref.slice(0,3)&&lib.includes(rpNorm(d.ref.split("-")[0]))){s+=60;raisons.push("n°");}}
    if(rpCents(d.reste)===m){s+=60;raisons.push("montant");}
    const mots=[...rpNorm(d.tiers).split(" "),...rpNorm(d.contact).split(" ")].filter(w=>w.length>=4&&!["sarl","sas","eurl","maison","societe","entreprise"].includes(w));
    const nomColle=rpNorm(d.tiers).replace(/ /g,"");
    if(mots.some(w=>lib.includes(w))||(nomColle.length>=4&&libC.includes(nomColle))){s+=40;raisons.push("nom");}
    if(s>0&&d.date){const ecart=Math.abs((new Date(rpDate(t))-new Date(d.date))/864e5);if(ecart<=10){s+=20;raisons.push("date");}}
    return {...d,score:s,raisons};
  }).filter(d=>d.score>0).sort((a,b)=>b.score-a.score);
}
function rpLibelleDoc(r){
  if(!r) return "";
  if(r.type==="ignore") return "Ignorée";
  return r.ref||"";
}
function rpEtat(t){return RAPPRO[t.id]||null;}

function renderRapprochement(transactions){
  const tx=transactions.filter(t=>t.id&&t.statut!=="refusée"&&dateEnCompta(String(t.date||"").slice(0,10)));
  const nonRap=tx.filter(t=>!rpEtat(t));
  const sure=rpPlanSur(nonRap);
  const L=rapproFiltre==="arapprocher"?nonRap:rapproFiltre==="rapproches"?tx.filter(t=>rpEtat(t)&&rpEtat(t).type!=="ignore"):tx;
  const chip=(v,l,n)=>`<button onclick="rapproFiltre='${v}';document.getElementById('content').innerHTML=renderBanque()" style="padding:6px 12px;border-radius:999px;border:1.5px solid ${rapproFiltre===v?TH.c1:"#e2e8f0"};background:${rapproFiltre===v?TH.c1:"#fff"};color:${rapproFiltre===v?"#fff":"#475569"};cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif">${l}${n!=null?` · ${n}`:""}</button>`;
  return `<div class="section-card">
    <div class="section-head">
      <div><div class="section-title">🔗 Rapprochement bancaire</div><div class="section-sub">Associez chaque opération Qonto à sa facture : le règlement est enregistré automatiquement</div></div>
      ${sure.length?`<button class="btn-add" style="background:#15803d;color:#fff" onclick="rapproAuto()">⚡ Valider ${sure.length} correspondance(s) sûre(s)</button>`:""}
    </div>
    <div style="padding:10px 20px;display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--line)">
      ${chip("arapprocher","À rapprocher",nonRap.length)}${chip("rapproches","Rapprochées",tx.filter(t=>rpEtat(t)&&rpEtat(t).type!=="ignore").length)}${chip("toutes","Toutes",tx.length)}
    </div>
    <div style="padding:4px 20px 14px">
      ${L.length===0?`<div style="padding:22px 0;text-align:center;color:#94a3b8;font-size:13px">${rapproFiltre==="arapprocher"?"✓ Tout est rapproché.":"Aucune opération."}</div>`:L.map(rpLigneHTML).join("")}
    </div>
  </div>`;
}
function rpLigneHTML(t){
  const r=rpEtat(t);
  const sug=r?null:rpSuggestions(t)[0];
  const debit=t.sens==="debit";
  let action;
  if(r&&r.type==="ignore") action=`<button class="btn-sm" onclick="rapproDefaire('${rpE(t.id)}')">Ignorée · annuler</button>`;
  else if(r) action=`<button class="btn-sm" style="border-color:#86efac;background:#f0fdf4;color:#15803d" onclick="rapproDetail('${rpE(t.id)}')">✓ ${rpE(r.ref)}</button>`;
  else action=`${sug?`<button class="btn-sm" style="border-color:${TH.c1}55;background:${TH.c1}12;color:${TH.c1};font-weight:700" onclick="rapproAssocier('${rpE(t.id)}','${sug.type}','${sug.id}',false,${sug.pointage!=null?sug.pointage:"null"})" title="${rpE((sug.info?sug.info+" · ":"")+sug.raisons.join(", "))}">${sug.score>=100?"⚡":"?"} ${rpE(sug.ref)}${sug.tiers?" · "+rpE(sug.tiers.slice(0,18)):""}</button>`:""}
    <button class="btn-sm" onclick="rapproChoisir('${rpE(t.id)}')">${sug?"Autre…":"Associer…"}</button>`;
  return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);flex-wrap:wrap">
    <div style="min-width:0;flex:1 1 180px">
      <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${rpE(t.libelle||"—")}</div>
      <div style="font-size:11px;color:#64748b">${fDateTrans(t.date)}${t.statut?" · "+rpE(t.statut):""}${t.compte?" · "+rpE(t.compte):""}</div>
    </div>
    <div style="font-weight:800;font-size:13.5px;color:${debit?"#991b1b":"#15803d"};white-space:nowrap">${fMontantSigne(t)}</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end">${action}</div>
  </div>`;
}
function rpTrouverTx(id){return ((BANQUE_DATA&&BANQUE_DATA.transactions)||[]).find(t=>String(t.id)===String(id));}
// Enregistre le règlement dans le document et note le rapprochement
function rapproAssocier(txId,type,docId,silencieux,pointage){
  const t=rpTrouverTx(txId);if(!t)return false;
  if(RAPPRO[txId]&&RAPPRO[txId].type!=="ignore"){if(!silencieux)alert("Cette opération est déjà rapprochée.");return false;}
  const montant=Math.round(Number(t.montant)*100)/100,date=rpDate(t);
  let doc,ref,reste;
  if(type==="fac"){doc=FACTURES.find(x=>x.id===docId);reste=doc&&facReste(doc);}
  else if(type==="bcc"){doc=BCCLIENTS.find(x=>x.id===docId);reste=doc&&bccReste(doc);}
  else if(type==="ff"){doc=FACFOURN.find(x=>x.id===docId);reste=doc&&ffReste(doc);}
  if(!doc)return false;
  ref=type==="ff"?(doc.numFour||doc.num):doc.num;
  // Facture déjà réglée à la main : on pointe le règlement existant au lieu d'en ajouter un
  const pt=(pointage!==undefined&&pointage!==null&&pointage!=="")?Number(pointage):null;
  if(pt!==null&&doc.paiements&&doc.paiements[pt]&&!doc.paiements[pt].qontoId){
    doc.paiements[pt].qontoId=String(txId);doc.paiements[pt].pointe=true;
    RAPPRO[txId]={type,id:docId,ref,ts:new Date().toISOString(),pointe:true};
    logActivity("Rapprochement bancaire",`${fMoney(montant)} du ${fDate(date)} pointé sur ${ref}`);
    if(!silencieux){saveData();closeModal();document.getElementById("content").innerHTML=renderBanque();renderNav();}
    return true;
  }
  if(!silencieux&&rpCents(montant)>rpCents(reste)+1&&!confirm(`Le virement (${fMoney(montant)}) dépasse le reste dû sur ${ref} (${fMoney(reste)}).\nL'associer quand même ?`))return false;
  doc.paiements=doc.paiements||[];
  doc.paiements.push({date,montant,mode:type==="ff"?(t.categorie&&/card|carte/i.test(t.categorie)?"CB":"Virement"):"Virement",qontoId:String(txId)});
  if(type==="fac"){if(facEstPayee(doc))doc.statut="payee";else if(facPaye(doc)>0&&doc.statut!=="payee")doc.statut="partiel";}
  RAPPRO[txId]={type,id:docId,ref,ts:new Date().toISOString()};
  logActivity("Rapprochement bancaire",`${fMoney(montant)} du ${fDate(date)} → ${ref}`);
  if(!silencieux){saveData();closeModal();document.getElementById("content").innerHTML=renderBanque();renderNav();}
  return true;
}
// Correspondances sûres (crédits clients et débits fournisseurs) : montant identique + référence ou nom
function rpSur(s){ return !!s&&s.raisons.includes("montant")&&(s.raisons.includes("référence")||s.raisons.includes("n°")||s.raisons.includes("nom")); }
function rpPlanSur(txs){
  const pris=new Set();
  return txs.map(t=>({t,s:rpSuggestions(t)[0]})).filter(o=>rpSur(o.s)).filter(o=>{
    // un document (ou un règlement à pointer) ne reçoit qu'une seule opération automatique
    const k=o.s.type+o.s.id+(o.s.pointage!=null?"#"+o.s.pointage:"");if(pris.has(k))return false;pris.add(k);return true;});
}
function rapproAuto(){
  const txs=((BANQUE_DATA&&BANQUE_DATA.transactions)||[]).filter(t=>t.id&&!rpEtat(t)&&t.statut!=="refusée"&&dateEnCompta(String(t.date||"").slice(0,10)));
  const ok=rpPlanSur(txs);
  if(!ok.length)return;
  if(!confirm(`Valider ces ${ok.length} rapprochement(s) ?\n\n`+ok.map(o=>`• ${o.t.sens==="debit"?"−":"+"}${fMoney(o.t.montant)} « ${String(o.t.libelle).slice(0,40)} » → ${o.s.ref}${o.s.type==="ff"?" ("+o.s.tiers+")":""}${o.s.pointage!=null?" [déjà réglée]":""}`).join("\n")))return;
  let n=0;ok.forEach(o=>{if(rapproAssocier(o.t.id,o.s.type,o.s.id,true,o.s.pointage))n++;});
  saveData();document.getElementById("content").innerHTML=renderBanque();renderNav();
  alert(`✅ ${n} règlement(s) enregistré(s).`);
}
function rapproChoisir(txId){
  const t=rpTrouverTx(txId);if(!t)return;
  const sugg=rpSuggestions(t);
  const tous=rpCandidats(t).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const cle=d=>d.type+d.id+(d.pointage!=null?"#"+d.pointage:"");
  const ids=new Set(sugg.map(cle));
  const ligne=d=>`<button onclick="rapproAssocier('${rpE(txId)}','${d.type}','${d.id}',false,${d.pointage!=null?d.pointage:"null"})" style="display:flex;width:100%;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;border-radius:10px;border:1.5px solid ${d.score>=100?TH.c1+"66":"#e2e8f0"};background:#fff;cursor:pointer;text-align:left;font-family:'Inter',sans-serif">
      <span style="font-size:16px">${d.type==="ff"?"📥":d.type==="bcc"?"📋":"🧾"}</span>
      <span style="flex:1;min-width:0"><span style="font-weight:700;font-size:13px;color:${TH.c1}">${rpE(d.ref)}</span> <span style="font-size:12.5px;color:#1A2118">${rpE(d.tiers)}</span>
        ${d.info?`<br/><span style="font-size:11px;color:#b45309">${rpE(d.info)}</span>`:""}
        ${d.raisons&&d.raisons.length?`<br/><span style="font-size:11px;color:#15803d">Correspond : ${rpE(d.raisons.join(", "))}</span>`:""}</span>
      <span style="font-weight:700;font-size:13px;white-space:nowrap">reste ${fMoney(d.reste)}</span></button>`;
  showModal(`${t.sens==="debit"?"Débit":"Crédit"} de ${fMontantSigne(t)}`,`
    <div style="background:#F7F4ED;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:13px"><strong>${rpE(t.libelle)}</strong><br/><span style="color:#64748b">${fDateTrans(t.date)}${t.compte?" · "+rpE(t.compte):""}</span></div>
    ${sugg.length?`<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Suggestions</div>${sugg.slice(0,5).map(ligne).join("")}`:""}
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:12px 0 6px">${t.sens==="debit"?"Factures fournisseurs à payer":"Factures et acomptes clients à encaisser"}</div>
    <input placeholder="🔍 Filtrer…" oninput="const q=this.value.toLowerCase();document.querySelectorAll('#rp-liste>button').forEach(b=>b.style.display=b.textContent.toLowerCase().includes(q)?'flex':'none')" style="width:100%;padding:9px 12px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13px;margin-bottom:8px;box-sizing:border-box"/>
    <div id="rp-liste" style="max-height:40vh;overflow-y:auto">${tous.filter(d=>!ids.has(cle(d))).map(d=>ligne({...d,raisons:[]})).join("")||`<div style="padding:14px;text-align:center;color:#94a3b8;font-size:13px">Aucun document en attente de règlement.</div>`}</div>`,
    `<button class="btn-cancel" style="margin-right:auto" onclick="rapproIgnorer('${rpE(txId)}')">Ignorer cette opération</button>
     <button class="btn-cancel" onclick="closeModal()">Fermer</button>`);
}
function rapproIgnorer(txId){
  RAPPRO[txId]={type:"ignore",ts:new Date().toISOString()};
  saveData();closeModal();document.getElementById("content").innerHTML=renderBanque();
}
function rapproDetail(txId){
  const t=rpTrouverTx(txId),r=RAPPRO[txId];if(!t||!r)return;
  showModal("Opération rapprochée",`
    <div style="background:#F7F4ED;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px"><strong>${rpE(t.libelle)}</strong><br/><span style="color:#64748b">${fDateTrans(t.date)} · ${fMontantSigne(t)}</span></div>
    <div style="font-size:14px">Associée à <strong style="color:${TH.c1}">${rpE(r.ref)}</strong> le ${fDate((r.ts||"").slice(0,10))}.</div>
    <div style="font-size:12px;color:#64748b;margin-top:6px">${r.pointe?"Dissocier garde le règlement saisi à la main, il redevient simplement « non pointé ».":"Dissocier supprime aussi le règlement enregistré sur ce document."}</div>`,
    `<button class="btn-cancel" style="color:#991b1b;border-color:#fecaca;margin-right:auto" onclick="rapproDefaire('${rpE(txId)}')">Dissocier</button>
     <button class="btn-cancel" onclick="closeModal()">Fermer</button>
     ${r.type==="fac"?`<button class="btn-save" style="background:${TH.c1}" onclick="modalPaiement('${r.id}')">Voir la facture</button>`:r.type==="ff"?`<button class="btn-save" style="background:${TH.c1}" onclick="modalPaiementFF('${r.id}')">Voir la facture</button>`:""}`);
}
function rapproDefaire(txId){
  const r=RAPPRO[txId];if(!r)return;
  if(r.type!=="ignore"){
    const doc=r.type==="fac"?FACTURES.find(x=>x.id===r.id):r.type==="bcc"?BCCLIENTS.find(x=>x.id===r.id):FACFOURN.find(x=>x.id===r.id);
    if(doc&&doc.paiements){
      doc.paiements.forEach(p=>{if(p.pointe&&String(p.qontoId||"")===String(txId)){delete p.qontoId;delete p.pointe;}});
      doc.paiements=doc.paiements.filter(p=>String(p.qontoId||"")!==String(txId));
      if(r.type==="fac"&&!facEstPayee(doc)&&doc.statut==="payee")doc.statut=facPaye(doc)>0?"partiel":"envoyee";}
    logActivity("Rapprochement annulé",r.ref||"");
  }
  delete RAPPRO[txId];
  saveData();closeModal();document.getElementById("content").innerHTML=renderBanque();renderNav();
}

// ── Factures fournisseurs : section affichée dans « Administration » ──
function renderFacFournSection(){
      const actives=FACFOURN.filter(f=>ffStatutReel(f)!=="payee");
      const archivees=FACFOURN.filter(f=>ffStatutReel(f)==="payee");
      const q=(ffRecherche||"").toLowerCase().trim();
      const liste=(ffFilter==="archives"?archivees:ffFilter==="toutes"?FACFOURN:actives)
        .filter(f=>!ffCatFiltre||(f.cat||"")===ffCatFiltre)
        .filter(f=>!q||[f.four,f.numFour,f.num,f.cat,f.notes,f.bcRef].filter(Boolean).join(" ").toLowerCase().includes(q))
        .slice().sort((a,b)=>ffFilter==="actives"?(a.ech||"9").localeCompare(b.ech||"9"):(b.date||"").localeCompare(a.date||""));
      const resteTotal=actives.reduce((s,f)=>s+ffReste(f),0);
      const enRetard=actives.filter(f=>ffStatutReel(f)==="retard");
      const sous30=actives.filter(f=>ffStatutReel(f)!=="retard"&&f.ech&&daysDiff(f.ech)<=30);
      const sansFichier=FACFOURN.filter(f=>!f.piece).length;
      // Dépenses de l'année par catégorie (HT)
      const an=getToday().slice(0,4);
      const parCat={};FACFOURN.filter(f=>(f.date||"").startsWith(an)).forEach(f=>{const c=f.cat||"Non classée";parCat[c]=(parCat[c]||0)+ffHT(f);});
      const cats=Object.entries(parCat).sort((a,b)=>b[1]-a[1]);
      const totAn=cats.reduce((s,x)=>s+x[1],0);
      const catsDispo=[...new Set([...ffCats(),...FACFOURN.map(f=>f.cat).filter(Boolean)])];
      const pill=(k,lbl)=>`<button onclick="ffFilter='${k}';renderPage()" style="padding:7px 13px;border-radius:999px;border:1.5px solid ${ffFilter===k?TH.c1:"#e2e8f0"};background:${ffFilter===k?TH.c1:"#fff"};color:${ffFilter===k?"#fff":"#64748b"};cursor:pointer;font-size:12px;font-weight:600;font-family:'Inter',sans-serif">${lbl}</button>`;
      return`
      <div class="section-card" style="background:${TH.card}">
        <div class="section-head">
          <div><div class="section-title" style="color:${TH.txt}">Factures fournisseurs reçues</div>
          <div class="section-sub">${fMoney(resteTotal)} à payer${enRetard.length?` · ${enRetard.length} en retard`:""}${sansFichier?` · ${sansFichier} sans fichier`:""}</div></div>
          <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="modalFF()">📥 Réceptionner une facture</button>
        </div>
        ${actives.length>0&&ffFilter==="actives"?`
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;padding:0 18px 14px">
          <div style="background:#fef2f2;border-radius:10px;padding:11px 14px"><div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#991b1b">En retard</div><div style="font-size:17px;font-weight:800;color:#991b1b">${fMoney(enRetard.reduce((s,f)=>s+ffReste(f),0))}</div></div>
          <div style="background:#fffbeb;border-radius:10px;padding:11px 14px"><div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#b45309">Sous 30 jours</div><div style="font-size:17px;font-weight:800;color:#b45309">${fMoney(sous30.reduce((s,f)=>s+ffReste(f),0))}</div></div>
          <div style="background:${TH.bg};border-radius:10px;padding:11px 14px"><div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:${TH.txt}88">Total dû</div><div style="font-size:17px;font-weight:800;color:${TH.txt}">${fMoney(resteTotal)}</div></div>
        </div>`:""}
        ${cats.length?`<details style="margin:0 18px 14px;background:${TH.bg};border-radius:10px;padding:10px 14px">
          <summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:${TH.txt}">📊 Dépenses ${an} par catégorie · ${fMoney(totAn)} HT</summary>
          <div style="margin-top:10px">${cats.map(([c,v])=>`<div onclick="ffCatFiltre=${JSON.stringify(c==="Non classée"?"":c).replace(/"/g,"&quot;")};ffFilter='toutes';renderPage()" style="cursor:pointer;margin-bottom:7px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:${TH.txt}">${ffEsc(c)}</span><span style="font-weight:700;color:${TH.txt}">${fMoney(v)}</span></div>
            <div style="height:6px;background:#fff;border-radius:3px;overflow:hidden"><div style="height:100%;width:${totAn?Math.max(2,v/totAn*100):0}%;background:${TH.c1}"></div></div>
          </div>`).join("")}</div>
        </details>`:""}
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:0 18px 12px">
          ${pill("actives","À payer")}${pill("archives","📁 Payées"+(archivees.length?" ("+archivees.length+")":""))}${pill("toutes","Toutes")}
          <select onchange="ffCatFiltre=this.value;renderPage()" style="padding:7px 10px;border-radius:999px;border:1.5px solid ${ffCatFiltre?TH.c1:"#e2e8f0"};font-size:12px;font-family:'Inter',sans-serif;background:#fff;max-width:200px">
            <option value="">Toutes catégories</option>${catsDispo.map(c=>`<option value="${ffEsc(c)}"${ffCatFiltre===c?" selected":""}>${ffEsc(c)}</option>`).join("")}
          </select>
          <input id="ff-recherche" type="search" placeholder="🔍 Fournisseur, n°…" value="${ffEsc(ffRecherche)}" onchange="ffRecherche=this.value;renderPage()" style="padding:7px 12px;border-radius:999px;border:1.5px solid #e2e8f0;font-size:16px;font-family:'Inter',sans-serif;flex:1;min-width:140px;max-width:240px"/>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead style="background:${TH.bg}"><tr>
              <th style="color:${TH.txt}77">Fournisseur</th><th style="color:${TH.txt}77">N° facture</th><th style="color:${TH.txt}77">Catégorie</th>
              <th style="color:${TH.txt}77">Date</th><th style="color:${TH.txt}77">Échéance</th><th style="color:${TH.txt}77">TTC</th><th style="color:${TH.txt}77">Reste dû</th>
              <th style="color:${TH.txt}77">Statut</th><th style="color:${TH.txt}77">Actions</th>
            </tr></thead>
            <tbody>${liste.length===0?`<tr><td colspan="9" style="text-align:center;color:${TH.txt}55;padding:24px;font-size:13px">${q||ffCatFiltre?"Aucune facture ne correspond.":ffFilter==="archives"?"Aucune facture payée":"Aucune facture à payer. Cliquez sur « Réceptionner une facture » quand vous en recevez une."}</td></tr>`:liste.map(f=>{
              const sr=ffStatutReel(f),st=FF_STATUTS[sr]||FF_STATUTS.a_payer;
              const jours=f.ech?daysDiff(f.ech):null;
              return`<tr>
                <td style="font-weight:700;color:${TH.c1};cursor:pointer;text-decoration:underline" onclick="modalFF('${f.id}')">${ffEsc(f.four||"—")}${f.bcRef?`<div style="font-size:10px;font-weight:500;color:${TH.txt}77;text-decoration:none">📦 ${ffEsc(f.bcRef)}</div>`:""}</td>
                <td style="color:${TH.txt}BB;font-size:12px">${ffEsc(f.numFour||"—")}<div style="font-size:10px;color:${TH.txt}66">${ffEsc(f.num||"")}</div></td>
                <td style="font-size:12px">${f.cat?badge(ffEsc(f.cat),TH.c1+"18",TH.c1):`<span style="color:#b45309;font-size:11px">À classer</span>`}</td>
                <td style="color:${TH.txt}BB;font-size:12px">${f.date?fDate(f.date):"—"}</td>
                <td style="color:${TH.txt}BB;font-size:12px">${f.ech?fDate(f.ech):"—"}${sr!=="payee"&&jours!==null?`<div style="font-size:10px;font-weight:700;color:${jours<0?"#991b1b":jours<=7?"#b45309":TH.txt+"77"}">${jours<0?`+${-jours} j de retard`:`dans ${jours} j`}</div>`:""}</td>
                <td style="font-weight:700;color:${TH.txt}">${fMoney(ffTTC(f))}</td>
                <td style="font-weight:700;color:${ffReste(f)>0?"#b45309":"#15803d"}">${fMoney(ffReste(f))}</td>
                <td>${badge(st.icon+" "+st.lbl,st.bg,st.col)}${(f.paiements||[]).some(p=>p.qontoId)?`<div style="font-size:10px;font-weight:700;color:#15803d;margin-top:3px">🔗 Rapprochée banque</div>`:(f.paiements||[]).length?`<div style="font-size:10px;color:#b45309;margin-top:3px">Non pointée en banque</div>`:""}</td>
                <td style="white-space:nowrap">
                  ${f.piece?`<button class="btn-sm" style="background:#eff6ff;color:#1d4ed8;border:1.5px solid #bfdbfe" onclick="ffVoirPiece('${f.id}')" title="Voir la facture">📎</button>`:`<button class="btn-sm" style="background:#fff;color:#94a3b8;border:1.5px dashed #cbd5e1" onclick="modalFF('${f.id}')" title="Ajouter le fichier">📎</button>`}
                  ${sr!=="payee"?`<button class="btn-sm" style="margin-left:4px;background:#f0fdf4;color:#15803d;border:1.5px solid #86efac" onclick="modalPaiementFF('${f.id}')" title="Enregistrer un règlement">💰</button>`:""}
                  <button class="btn-sm btn-edit" style="margin-left:4px" onclick="modalFF('${f.id}')">✏️</button>
                  <button class="btn-sm btn-danger" style="margin-left:4px" onclick="delFF('${f.id}')">🗑️</button>
                </td>
              </tr>`;}).join("")}</tbody>
          </table>
        </div>
      </div>`;
}

function renderAdmin(){
  // Les factures clients sont gérées dans la rubrique « Factures » ; les factures fournisseurs sont ici
  return `
    <div class="section-card" style="background:${TH.card}">
      <div class="section-head">
        <div><div class="section-title" style="color:${TH.txt}">Tâches & Échéances</div><div class="section-sub">${TACHES.filter(t=>!t.done).length} en cours</div></div>
        <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="modalTache()">＋ Ajouter</button>
      </div>
      <div id="taches-list">${renderTachesList()}</div>
    </div>
    ${renderFacFournSection()}`;
}

