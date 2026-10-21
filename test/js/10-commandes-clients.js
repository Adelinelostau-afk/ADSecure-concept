// ── Éditeur de bon de commande client ────────────────────────────────────
function nextBccRef(){
  const y=new Date().getFullYear();
  const nums=BCCLIENTS.map(b=>{const m=(b.num||"").match(/BCC-\d{4}-(\d+)/);return m?parseInt(m[1]):0;});
  return `BCC-${y}-${String((nums.length?Math.max(...nums):0)+1).padStart(3,"0")}`;
}
function modalBCC(id){
  const src=id?BCCLIENTS.find(x=>x.id===id):null;
  const b=src||{num:nextBccRef(),clientId:CLIENTS[0]?.id||"",devisNum:"",refChantier:"",date:TODAY,statut:"en_cours",tva:TVA_DEFAUT,lignes:[{ref:"",desc:"",det:"",unite:"unité",qte:1,pu:0,pa:0}],notes:""};
  window._bccLignes=JSON.parse(JSON.stringify(b.lignes&&b.lignes.length?b.lignes:[{ref:"",desc:"",det:"",unite:"unité",qte:1,pu:0,pa:0}]));
  showModal(id?`Bon de commande — ${b.num}`:"Nouveau bon de commande",`
    <div class="field-row">
      <div class="field"><label>N°</label><input id="bcc-num" value="${b.num}"/></div>
      <div class="field"><label>Date</label><input type="date" id="bcc-date" value="${b.date||TODAY}"/></div>
    </div>
    <div class="field"><label>Client</label>
      <select id="bcc-client" onchange="toggleChantierField('bcc')">
        ${CLIENTS.map(c=>`<option value="${c.id}"${b.clientId===c.id?" selected":""}>${c.nom}</option>`).join("")}
      </select>
    </div>
    <div class="field" id="bcc-chantier-wrap" style="display:${clientEstPro(b.clientId)?"block":"none"}"><label>Référence chantier (client pro)</label><input id="bcc-chantier" value="${(b.refChantier||"").replace(/"/g,'&quot;')}" placeholder="Ex : Chantier rue des Lilas — Lot 3"/></div>
    <div class="field-row">
      <div class="field"><label>Statut</label><select id="bcc-statut">
        ${Object.entries(ST_BCC).map(([k,v])=>`<option value="${k}"${b.statut===k?" selected":""}>${v[2]}</option>`).join("")}
      </select></div>
      <div class="field"><label>TVA (%)</label><input type="number" step="any" id="bcc-tva" value="${(b.tva!==undefined&&b.tva!==null)?b.tva:TVA_DEFAUT}" oninput="updateBccTotaux()"/></div>
    </div>
    <div class="field">
      <label>Ajout rapide depuis le catalogue <span id="bcc-cat-picker-cpt" style="font-weight:600;color:#94a3b8"></span></label>
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <input id="bcc-cat-search" placeholder="🔍 Nom, référence, marque..." oninput="renderBccCataloguePicker(this.value)" style="flex:1;padding:8px 12px;border-radius:8px;border:1.5px solid #e2e8f0;font-size:13px;background:#fff;outline:none;font-family:'Inter',sans-serif;min-width:0"/>
        <button onclick="modalAjoutProduitCatalogue()" style="padding:8px 12px;border-radius:8px;border:1.5px solid ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif;white-space:nowrap">＋ Produit</button>
      </div>
      <div id="bcc-cat-picker-chips" style="display:flex;gap:5px;overflow-x:auto;padding-bottom:8px;margin-bottom:6px"></div>
      <div id="bcc-cat-picker" style="display:flex;flex-wrap:wrap;gap:6px;max-height:190px;overflow-y:auto;padding:4px"></div>
    </div>
    <div class="field">
      <label>Lignes du bon de commande</label>
      <div id="bcc-lignes"></div>
      <button onclick="addBccLigne()" style="margin-top:8px;padding:7px 12px;border-radius:8px;border:1.5px dashed ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-size:12px;font-weight:600;font-family:'Inter',sans-serif;width:100%">＋ Ligne vide</button>
    </div>
    <div id="bcc-totaux" style="background:#F7F4ED;border-radius:10px;padding:12px 16px;margin-bottom:14px"></div>
    <div class="field"><label>Notes</label><textarea id="bcc-notes" placeholder="Conditions, remarques...">${b.notes||""}</textarea></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="saveBCC('${id||""}')">Enregistrer</button>`
  );
  renderBccLignes();
  renderBccCataloguePicker("");
}
function renderBccCataloguePicker(filter){
  const box=document.getElementById("bcc-cat-picker");
  if(!box)return;
  const chips=document.getElementById("bcc-cat-picker-chips");
  if(chips) chips.innerHTML=renderPickerChips("bcc");
  _pickerProduits=produitsUnifies();
  const filtered=pickerFiltrer(_pickerProduits.map((p,i)=>({...p,idx:i})),filter);
  const cpt=document.getElementById("bcc-cat-picker-cpt");
  if(cpt) cpt.textContent=`${filtered.length} / ${_pickerProduits.length}`;
  if(filtered.length===0){box.innerHTML=`<div style="padding:12px;color:#94a3b8;font-size:12px;width:100%;text-align:center">Aucun produit ne correspond.</div>`;return;}
  box.innerHTML=filtered.map(p=>pickerCard(p,`addProduitToBCC(${p.idx})`)).join("");
}
function addProduitToBCC(idx){
  const p=_pickerProduits[idx];
  if(!p)return;
  const det=[p.marque,p.modele].filter(Boolean).join(" ");
  const ligne={ref:p.ref||"",desc:p.nom,det:(p.desc||"")||(det?det:""),unite:p.unite||"unité",qte:1,pu:p.pu,pa:p.pa||0};
  const empty=window._bccLignes.findIndex(l=>!l.desc&&!l.pu);
  if(empty!==-1){window._bccLignes[empty]=ligne;}else{window._bccLignes.push(ligne);}
  renderBccLignes();
}
function toggleBccLigneDet(i){ window._bccLignes[i]._det=!window._bccLignes[i]._det; renderBccLignes(); }
function addBccLigne(){ window._bccLignes.push({ref:"",desc:"",det:"",unite:"unité",qte:1,pu:0,pa:0}); renderBccLignes(); }
function renderBccLignes(){
  const box=document.getElementById("bcc-lignes");
  if(!box)return;
  const L=window._bccLignes;
  if(L.length===0){box.innerHTML=`<div style="padding:16px;text-align:center;color:#94a3b8;font-size:12.5px">Aucune ligne. Choisissez un produit ci-dessus ou ajoutez une ligne vide.</div>`;updateBccTotaux();return;}
  box.innerHTML=L.map((l,i)=>{
    const total=(l.qte||0)*(l.pu||0);
    const cout=(l.qte||0)*(l.pa||0);
    const marge=total-cout;
    const pct=total>0?(marge/total*100):0;
    const mCol=marge>0?"#15803d":marge<0?"#991b1b":"#94a3b8";
    const ouvert=l._det||!!(l.det||"").trim();
    return `<div style="border:1.5px solid #e2e8f0;border-radius:10px;padding:9px;margin-bottom:8px;background:#fff">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input value="${(l.ref||"").replace(/"/g,'&quot;')}" placeholder="Réf." oninput="window._bccLignes[${i}].ref=this.value" style="width:82px;${INPUT_L};font-size:11.5px;font-weight:700;color:#64748b;flex-shrink:0"/>
        <input value="${(l.desc||"").replace(/"/g,'&quot;')}" placeholder="Désignation" oninput="window._bccLignes[${i}].desc=this.value;updateBccTotaux()" style="flex:1;${INPUT_L}"/>
        <button type="button" onclick="toggleBccLigneDet(${i})" title="Descriptif détaillé" style="width:30px;height:30px;border-radius:7px;border:1.5px solid ${ouvert?TH.c1:"#e2e8f0"};background:${ouvert?TH.c1+"12":"#fff"};color:${ouvert?TH.c1:"#94a3b8"};cursor:pointer;flex-shrink:0;font-size:12px">📄</button>
        <button type="button" onclick="window._bccLignes.splice(${i},1);renderBccLignes()" style="width:30px;height:30px;border-radius:7px;border:1.5px solid #fecaca;background:#fef2f2;color:#991b1b;cursor:pointer;flex-shrink:0;font-size:13px">✕</button>
      </div>
      ${ouvert?`<textarea placeholder="Descriptif détaillé (imprimé sous la désignation)" oninput="window._bccLignes[${i}].det=this.value" style="width:100%;box-sizing:border-box;${INPUT_L};font-size:12px;min-height:54px;resize:vertical;margin-bottom:6px">${(l.det||"")}</textarea>`:""}
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <input type="number" step="any" value="${l.qte}" placeholder="Qté" oninput="window._bccLignes[${i}].qte=parseFloat(this.value)||0;updateBccTotaux()" style="width:58px;${INPUT_L};text-align:center;flex-shrink:0"/>
        <input list="dv-unites" value="${(l.unite||"unité").replace(/"/g,'&quot;')}" placeholder="Unité" oninput="window._bccLignes[${i}].unite=this.value" style="width:76px;${INPUT_L};font-size:12px;flex-shrink:0"/>
        <input type="number" step="any" value="${l.pa||0}" placeholder="P.A." title="Prix d'achat HT (interne, non imprimé)" oninput="window._bccLignes[${i}].pa=parseFloat(this.value)||0;updateBccTotaux()" style="width:70px;${INPUT_L};text-align:right;background:#f8fafc;color:#64748b;flex-shrink:0"/>
        <input type="number" step="any" value="${l.pu}" placeholder="P.U." oninput="window._bccLignes[${i}].pu=parseFloat(this.value)||0;updateBccTotaux()" style="width:82px;${INPUT_L};text-align:right;font-weight:700;flex-shrink:0"/>
        <div style="flex:1;min-width:110px;text-align:right;font-size:12.5px">
          <span style="font-weight:800;color:${TH.txt}">${fMoney(total)}</span>
          ${cout>0?`<span style="margin-left:7px;font-size:11px;font-weight:700;color:${mCol}">${marge>=0?"+":""}${fMoney(marge)} · ${pct.toFixed(0)} %</span>`:""}
        </div>
      </div>
    </div>`;
  }).join("")+`<datalist id="dv-unites">${UNITES.map(u=>`<option value="${u}"></option>`).join("")}</datalist>`;
  updateBccTotaux();
}
function updateBccTotaux(){
  const box=document.getElementById("bcc-totaux");
  if(!box)return;
  const tva=parseFloat(document.getElementById("bcc-tva")?.value)||0;
  const ht=window._bccLignes.reduce((s,l)=>s+(l.qte||0)*(l.pu||0),0);
  const cout=window._bccLignes.reduce((s,l)=>s+(l.qte||0)*(l.pa||0),0);
  const mtva=ht*tva/100;
  box.innerHTML=`${cout>0?ligneMarge(ht,cout):""}<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span style="color:#64748b">Total HT</span><span style="font-weight:600">${fMoney(ht)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span style="color:#64748b">TVA ${fTaux(tva)}</span><span style="font-weight:600">${fMoney(mtva)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:15px;padding-top:6px;border-top:1px solid #ddd"><span style="font-weight:700;color:${TH.txt}">Total TTC</span><span style="font-weight:800;color:${TH.c1}">${fMoney(ht+mtva)}</span></div>`;
}
function saveBCC(id){
  const clientId=document.getElementById("bcc-client").value;
  if(!clientId){alert("Veuillez choisir un client");return;}
  const lignes=window._bccLignes.filter(l=>l.desc||l.pu).map(l=>{const c={...l};delete c._det;return c;});
  if(lignes.length===0){alert("Ajoutez au moins une ligne");return;}
  const obj={
    num:(document.getElementById("bcc-num").value||"").trim(),
    clientId,
    date:document.getElementById("bcc-date").value,
    statut:document.getElementById("bcc-statut").value,
    refChantier:(document.getElementById("bcc-chantier")?.value||"").trim(),
    tva:parseFloat(document.getElementById("bcc-tva").value)||0,
    notes:(document.getElementById("bcc-notes").value||"").trim(),
    lignes
  };
  if(id){BCCLIENTS=BCCLIENTS.map(b=>b.id===id?{...b,...obj}:b);logActivity("Modification bon de commande",obj.num);}
  else{BCCLIENTS.push({...obj,id:uid(),devisNum:"",paiements:[]});logActivity("Création bon de commande",obj.num);}
  saveData();
  closeModal();renderPage();renderNav();
}

// ── Bons de commande clients : devis accepté → BC → facture ──────────────
function devisVersBC(id){
  const d=DEVIS.find(x=>x.id===id);if(!d)return;
  const deja=BCCLIENTS.some(b=>b.devisId===id);
  if(!confirm(deja?"Un bon de commande existe déjà pour ce devis. En créer un autre ?":"Valider ce devis et créer le bon de commande ?"))return;
  const num=prochainNumero("BCC",BCCLIENTS);
  BCCLIENTS.push({
    id:uid(),num,
    devisId:d.id,devisNum:d.num,
    clientId:d.clientId,
    refChantier:d.refChantier||"",
    date:TODAY,
    statut:"en_cours",
    tva:(d.tva!==undefined&&d.tva!==null)?d.tva:TVA_DEFAUT,
    lignes:JSON.parse(JSON.stringify(d.lignes||[]))
  });
  DEVIS=DEVIS.map(x=>x.id===id?{...x,statut:"transforme",bccNum:num}:x);
  saveData();
  logActivity("Devis→Bon de commande",`${d.num} → ${num} (devis archivé)`);
  alert(`Bon de commande ${num} créé !\nLe devis ${d.num} a été archivé (filtre « Archives »).`);
  renderPage();renderNav();
}
function bccLivre(id){
  const b=BCCLIENTS.find(x=>x.id===id);if(!b)return;
  if(!confirm("Marquer ce chantier comme livré ? Vous pourrez ensuite le transformer en facture."))return;
  b.statut="livre";
  saveData();
  logActivity("Chantier livré",b.num);
  renderPage();
}
function bccVersFacture(id){
  const b=BCCLIENTS.find(x=>x.id===id);if(!b)return;
  const cli=CLIENTS.find(c=>c.id===b.clientId);
  if(!confirm("Créer la facture à partir de ce bon de commande ?"))return;
  const num=prochainNumero("FAC",FACTURES);
  FACTURES.push({
    id:uid(),num,date:TODAY,
    client:cli?cli.nom:"",
    clientId:b.clientId,
    refChantier:b.refChantier||"",
    ech:addDays(TODAY,30),
    statut:"envoyee",
    tva:(b.tva!==undefined&&b.tva!==null)?b.tva:TVA_DEFAUT,
    lignes:JSON.parse(JSON.stringify(b.lignes||[])),
    paiements:JSON.parse(JSON.stringify(b.paiements||[])),  // reprend les règlements du BC
    ttc:Math.round(devisTTC(b)*100)/100
  });
  // Statut cohérent avec les règlements repris
  const nf=FACTURES[FACTURES.length-1];
  if(facEstPayee(nf))nf.statut="payee";
  else if(facPaye(nf)>0)nf.statut="partiel";
  b.statut="facture";
  b.factureNum=num;
  saveData();
  logActivity("BC→Facture",`${b.num} → ${num} (BC archivé)`);
  alert(`Facture ${num} créée !\nLe bon de commande ${b.num} a été archivé.`);
  renderPage();renderNav();
}
function delBCC(id){
  const b=BCCLIENTS.find(x=>x.id===id);
  confirmDel("Supprimer ce bon de commande ?",function(){BCCLIENTS=BCCLIENTS.filter(x=>x.id!==id);logActivity("Suppression bon de commande",b?b.num:"");renderPage();});
}

// ── Règlements enregistrés sur le bon de commande (avant facturation) ──────
function modalPaiementBCC(id){
  const b=BCCLIENTS.find(x=>x.id===id);if(!b)return;
  const ttc=devisTTC(b),paye=bccPaye(b),reste=bccReste(b);
  const histo=(b.paiements||[]);
  showModal(`Règlement — ${b.num}`,`
    <div style="background:#F7F4ED;border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span style="color:#64748b">Total bon de commande</span><span style="font-weight:700">${fMoney(ttc)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span style="color:#64748b">Déjà réglé</span><span style="font-weight:700;color:#15803d">${fMoney(paye)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:15px;padding-top:7px;border-top:1px solid #ddd"><span style="font-weight:700">Reste dû</span><span style="font-weight:800;color:#b45309">${fMoney(reste)}</span></div>
    </div>
    ${histo.length>0?`<div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Historique</div>
      ${histo.map((p,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9">
        <span style="font-size:14px">💶</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:600">${fMoney(p.montant)}</div><div style="font-size:11px;color:#64748b">${fDate(p.date)} · ${p.mode||"—"}</div></div>
        <button onclick="delPaiementBCC('${b.id}',${i})" style="padding:3px 7px;border-radius:6px;border:1.5px solid #fecaca;background:#fef2f2;color:#991b1b;cursor:pointer;font-size:11px">✕</button>
      </div>`).join("")}
    </div>`:""}
    ${reste>0?`<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Nouveau règlement</div>
    <div class="field-row">
      <div class="field"><label>Montant (€)</label><input type="number" id="bcc-pay-montant" value="${reste}" step="0.01" min="0"/></div>
      <div class="field"><label>Date</label><input type="date" id="bcc-pay-date" value="${TODAY}"/></div>
    </div>
    <div class="field"><label>Mode de paiement</label><select id="bcc-pay-mode">${MODES_PAIEMENT.map(m=>`<option>${m}</option>`).join("")}</select></div>
    <button onclick="addPaiementBCC('${b.id}')" style="width:100%;padding:11px;border-radius:9px;border:none;background:#15803d;color:#fff;cursor:pointer;font-weight:700;font-size:14px;font-family:'Inter',sans-serif;margin-bottom:4px">✓ Enregistrer le règlement</button>`:`<div style="text-align:center;padding:14px;background:#dcfce7;border-radius:10px;color:#15803d;font-weight:700">✓ Bon de commande intégralement réglé</div>`}
    <div style="font-size:11px;color:#94a3b8;margin-top:10px;text-align:center">Ces règlements seront automatiquement repris sur la facture lors de la transformation.</div>`,
    `<button class="btn-cancel" onclick="closeModal()">Fermer</button>`
  );
}
function addPaiementBCC(id){
  const montant=parseFloat(document.getElementById("bcc-pay-montant").value)||0;
  const date=document.getElementById("bcc-pay-date").value||TODAY;
  const mode=document.getElementById("bcc-pay-mode").value;
  if(montant<=0){alert("Montant invalide");return;}
  const b=BCCLIENTS.find(x=>x.id===id);if(!b)return;
  if(!b.paiements)b.paiements=[];
  b.paiements.push({date,montant,mode});
  saveData();
  logActivity("Règlement BC enregistré",`${fMoney(montant)} sur ${b.num} (${mode})`);
  modalPaiementBCC(id);renderPage();
}
function delPaiementBCC(id,idx){
  const b=BCCLIENTS.find(x=>x.id===id);if(!b||!b.paiements)return;
  if(!confirm("Supprimer ce règlement ?"))return;
  b.paiements.splice(idx,1);
  saveData();
  logActivity("Règlement BC supprimé",b.num);
  modalPaiementBCC(id);renderPage();
}

function genererBCClientPDF(id){
  const b=BCCLIENTS.find(x=>x.id===id);if(!b){alert("Bon de commande introuvable");return;}
  const cli=CLIENTS.find(c=>c.id===b.clientId);
  const ht=devisHT(b),mtva=devisTVA(b),ttc=devisTTC(b);
  const logoSrc=thLogo();
  const[,,statutLbl]=ST_BCC[b.statut]||ST_BCC.en_cours;
  const doc=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${b.num}</title>
  <style>
    @page{size:A4;margin:0}
    *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1A2118;padding:40px 44px;font-size:13px;line-height:1.5}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${TH.c1};padding-bottom:24px;margin-bottom:30px}
    .logo-zone{display:flex;align-items:center;gap:14px}
    .logo-zone img{width:64px;height:64px;object-fit:contain;border-radius:50%}
    .brand-name{font-size:22px;font-weight:800;color:${TH.sidebar};letter-spacing:-0.5px}
    .brand-sub{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${TH.c1};font-weight:700}
    .doc-title{text-align:right}
    .doc-title h1{font-size:24px;color:${TH.c1};letter-spacing:1px}
    .doc-title .num{font-size:14px;color:#64748b;margin-top:4px}
    .parties{display:flex;justify-content:space-between;margin-bottom:30px;gap:30px}
    .partie{flex:1}
    .partie .lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:6px}
    .partie .nom{font-size:15px;font-weight:700;margin-bottom:3px}
    .partie .det{font-size:12px;color:#475569;line-height:1.6}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    thead th{background:${TH.sidebar};color:#fff;padding:11px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
    thead th:last-child,tbody td:last-child{text-align:right}
    tbody td{padding:12px 14px;border-bottom:1px solid #e8e4dc}
    .totaux{display:flex;justify-content:flex-end;margin-bottom:30px}
    .totaux table{width:280px}
    .totaux td{padding:7px 14px;font-size:13px}
    .totaux .ttc{background:${TH.c1};color:#fff;font-weight:800;font-size:16px}
    .totaux .ttc td{padding:12px 14px}
    .sign{display:flex;gap:30px;margin-top:36px}
    .sign-box{flex:1;border:1.5px solid #e8e4dc;border-radius:10px;padding:14px 16px;min-height:100px}
    .sign-box .lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:6px}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:11px;color:#94a3b8;text-align:center;line-height:1.8}
    @media print{body{padding:30px 36px}}
  </style></head><body>
    <div class="head">
      <div class="logo-zone">
        ${logoSrc?`<img src="${logoSrc}" onerror="this.style.display='none'"/>`:""}
        <div><div class="brand-name">${TH.nom}</div><div class="brand-sub">${TH.sous}</div></div>
      </div>
      <div class="doc-title">
        <h1>BON DE COMMANDE</h1>
        <div class="num">${b.num}</div>
        <div class="num">Date : ${b.date?fDate(b.date):"—"}</div>
        ${b.devisNum?`<div class="num">Devis d'origine : ${b.devisNum}</div>`:""}
        ${b.refChantier?`<div class="num" style="font-weight:700;color:${TH.c1}">Réf. chantier : ${b.refChantier.replace(/</g,"&lt;")}</div>`:""}
      </div>
    </div>
    <div class="parties">
      <div class="partie">
        <div class="lbl">Émetteur</div>
        <div class="nom">${TH.nom} ${TH.sous}</div>
        <div class="det">${TH.adresse?TH.adresse+"<br/>":""}${TH.email?TH.email+"<br/>":""}${TH.tel||""}</div>
      </div>
      <div class="partie" style="text-align:right">
        <div class="lbl">Client</div>
        <div class="nom">${cli?cli.nom:"—"}</div>
        <div class="det">${cli&&cli.adresse?cli.adresse.replace(/</g,"&lt;")+"<br/>":""}${cli?(cli.contact||""):""}${cli&&cli.email?"<br/>"+cli.email:""}${cli&&cli.tel?"<br/>"+cli.tel:""}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Désignation</th><th style="text-align:center">Qté</th><th style="text-align:right">P.U. HT</th><th style="text-align:right">Total HT</th></tr></thead>
      <tbody>
        ${(b.lignes||[]).map(l=>`<tr><td>${l.ref?`<span style="font-size:8.5px;font-weight:700;color:#94a3b8;letter-spacing:.04em">${(l.ref||"").replace(/</g,"&lt;")}</span><br/>`:""}${(l.desc||"").replace(/</g,"&lt;")}${(l.det||"").trim()?`<div style="font-size:9px;color:#64748b;line-height:1.35;margin-top:2px;white-space:pre-line">${(l.det||"").replace(/</g,"&lt;")}</div>`:""}</td><td style="text-align:center">${l.qte}${l.unite?`<div style="font-size:8.5px;color:#94a3b8">${(l.unite||"").replace(/</g,"&lt;")}</div>`:""}</td><td style="text-align:right">${fMoney(l.pu)}</td><td style="text-align:right">${fMoney((l.qte||0)*(l.pu||0))}</td></tr>`).join("")}
      </tbody>
    </table>
    <div class="totaux">
      <table>
        <tr><td>Total HT</td><td style="text-align:right">${fMoney(ht)}</td></tr>
        <tr><td>TVA ${fTaux((b.tva!==undefined&&b.tva!==null)?b.tva:TVA_DEFAUT)}</td><td style="text-align:right">${fMoney(mtva)}</td></tr>
        <tr class="ttc"><td>TOTAL TTC</td><td style="text-align:right">${fMoney(ttc)}</td></tr>
      </table>
    </div>
    ${(b.paiements&&b.paiements.length)?`
    <div style="margin-bottom:24px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:8px">Règlements enregistrés</div>
      <table style="margin-bottom:0">
        <thead><tr><th>Date</th><th>Mode</th><th style="text-align:right">Montant</th></tr></thead>
        <tbody>
          ${b.paiements.map(p=>`<tr><td>${fDate(p.date)}</td><td>${p.mode||"—"}</td><td style="text-align:right">${fMoney(p.montant)}</td></tr>`).join("")}
        </tbody>
      </table>
      <div style="text-align:right;font-size:13px;margin-top:8px;color:#64748b">
        Restant dû : <strong style="color:${TH.c1}">${fMoney(bccReste(b))}</strong>
      </div>
    </div>`:""}
    <div class="sign">
      ${b.validationSansSign?`<div class="sign-box"><div class="lbl">Accord du client</div><div style="font-size:12px;font-weight:700;color:#1A2118;margin-top:4px">Validé sans signature</div><div style="font-size:11px;color:#475569;margin-top:2px">${vssMotifLbl(b.validationSansSign.motif)} — le ${dtFr(b.validationSansSign.date)}</div>${b.validationSansSign.note?`<div style="font-size:10px;color:#64748b;margin-top:3px;white-space:pre-line">${String(b.validationSansSign.note).replace(/</g,"&lt;")}</div>`:""}</div>`:`<div class="sign-box"><div class="lbl">Date et signature client</div><div style="font-size:11px;color:#94a3b8">« Bon pour commande »</div></div>`}
      <div class="sign-box"><div class="lbl">${TH.nom} ${TH.sous}</div></div>
    </div>
    <div class="footer">
      Bon de commande établi le ${fDate(TODAY)} · Statut : ${statutLbl}<br/>
      ${TH.nom} ${TH.sous}${TH.siret?" · SIRET : "+TH.siret:""}${TH.tvaIntra?" · TVA : "+TH.tvaIntra:""}<br/>
      ${TH.mentionsLegales||""}
    </div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),400);}<\/script>
  </body></html>`;
  const w=window.open("","_blank");
  if(!w){alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF.");return;}
  w.document.write(doc);w.document.close();
  logActivity("Génération bon de commande client",`PDF : ${b.num}`);
  logDocument("bcc",b.id,b.num,cli?cli.nom:"",devisTTC(b));
}

// HTML complet du devis (impression ou conversion en PDF pour l'envoi par e-mail)
// ══════════════════════════════════════════════════════════
