// ── MODULE DEVIS ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════
let devisFilter="tous";
let bccFilter="actifs";
function devisEstArchive(d){return d.statut==="transforme";}
function bccEstArchive(b){return b.statut==="facture";}
function renderDevis(){
  const th=TH;
  const actifs=DEVIS.filter(d=>!devisEstArchive(d));
  const archives=DEVIS.filter(devisEstArchive);
  const bccActifs=BCCLIENTS.filter(b=>!bccEstArchive(b));
  const bccArchives=BCCLIENTS.filter(bccEstArchive);
  const bccList=[...(bccFilter==="archives"?bccArchives:bccActifs)].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const total=DEVIS.length;
  const acceptes=DEVIS.filter(d=>d.statut==="accepte");
  const envoyes=DEVIS.filter(d=>d.statut==="envoye");
  const caAccepte=acceptes.reduce((s,d)=>s+devisTTC(d),0);
  const caEnCours=envoyes.reduce((s,d)=>s+devisTTC(d),0);
  // Un devis transformé en BC compte comme converti
  const txConv=total>0?Math.round((acceptes.length+archives.length)/total*100):0;
  let list=devisFilter==="tous"?actifs:(devisFilter==="transforme"?archives:actifs.filter(d=>d.statut===devisFilter));
  list=[...list].sort((a,b)=>(b.date||"").localeCompare(a.date||""));

  return`
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap">
      <div style="font-family:'Lora',Georgia,serif;font-size:17px;font-weight:700;color:${th.txt}">📝 Devis</div>
      <div style="display:flex;gap:8px">
        <button class="btn-add" style="background:#fff;color:${th.c1};border:1.5px solid ${th.c1}" onclick="openPanelCatalogue()">📦 Catalogue</button>
        <button class="btn-add" style="background:${th.c1};color:#fff" onclick="modalDevis()">＋ Nouveau devis</button>
      </div>
    </div>

    <div class="kpi-grid" style="margin-bottom:18px">
      ${kpi("Total devis",total,th.c1)}
      ${kpi("CA accepté",fMoney(caAccepte),"#15803d",true)}
      ${kpi("CA en attente",fMoney(caEnCours),"#b45309",true)}
      ${kpi("Taux conversion",txConv+"%",th.c2)}
    </div>

    <div style="display:flex;gap:7px;margin-bottom:14px;flex-wrap:wrap">
      ${[["tous","Tous"],["brouillon","Brouillons"],["envoye","Envoyés"],["accepte","Acceptés"],["refuse","Refusés"],["transforme","📁 Archives"+(archives.length?" ("+archives.length+")":"")]].map(([k,lbl])=>`
        <button onclick="devisFilter='${k}';renderPage()" style="padding:6px 13px;border-radius:999px;border:1.5px solid ${devisFilter===k?th.c1:"#e2e8f0"};background:${devisFilter===k?th.c1:"#fff"};color:${devisFilter===k?"#fff":"#64748b"};cursor:pointer;font-size:12px;font-weight:600;font-family:'Inter',sans-serif">${lbl}</button>
      `).join("")}
    </div>

    <div class="section-card">
      ${list.length===0?`<div style="padding:40px;text-align:center;color:#94a3b8;font-size:14px">${devisFilter==="transforme"?"Aucun devis archivé":"Aucun devis "+(devisFilter!=="tous"?"dans cette catégorie":"")}</div>`:`
      <div style="overflow-x:auto"><table>
        <thead><tr><th>N°</th><th>Client</th><th>Date</th><th>Validité</th><th>Montant TTC</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          ${list.map(d=>{
            const cli=CLIENTS.find(c=>c.id===d.clientId);
            const[bg,col,lbl]=ST_DEVIS[d.statut]||ST_DEVIS.brouillon;
            const expire=d.validite&&d.validite<TODAY&&d.statut==="envoye";
            return`<tr>
              <td style="font-weight:700;color:${th.c1}">${d.num}</td>
              <td>${cli?cli.nom:"—"}</td>
              <td style="font-size:12px;color:#64748b">${d.date?fDate(d.date):"—"}</td>
              <td style="font-size:12px;color:${expire?"#991b1b":"#64748b"};font-weight:${expire?700:400}">${d.validite?fDate(d.validite):"—"}${expire?" ⚠️":""}</td>
              <td style="font-weight:700">${fMoney(devisTTC(d))}</td>
              <td><span class="badge" style="background:${bg};color:${col}">${lbl}</span>${signBadge(d)}</td>
              <td><div style="display:flex;gap:5px">
                <button class="btn-sm" onclick="genererDevisPDF('${d.id}')" title="PDF" style="border-color:#86efac;background:#f0fdf4;color:#15803d">📄</button>
                <button class="btn-sm" onclick="modalEnvoiDevis('${d.id}')" title="Envoyer par e-mail${(d.envois||[]).length?" (déjà envoyé le "+fDate(d.envois[d.envois.length-1].date)+")":""}" style="border-color:#bae6fd;background:#f0f9ff;color:#0369a1">✉️${(d.envois||[]).length?"✓":""}</button>
                ${signBouton(d)}
                <button class="btn-sm btn-edit" onclick="modalDevis('${d.id}')">✏️</button>
                ${vssBouton(d)}
                ${d.statut==="accepte"?`<button class="btn-sm" onclick="devisVersFacture('${d.id}')" title="Convertir en facture" style="border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8">🧾</button>`:""}
                <button class="btn-sm btn-danger" onclick="delDevis('${d.id}')">🗑️</button>
              </div></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table></div>`}
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin:26px 0 12px;flex-wrap:wrap">
      <div style="font-family:'Lora',Georgia,serif;font-size:17px;font-weight:700;color:${th.txt}">📋 Bons de commande clients</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center">
        <button class="btn-add" style="background:${th.c1};color:#fff" onclick="modalBCC()">＋ Nouveau bon de commande</button>
        ${[["actifs","En cours"],["archives","📁 Archives"+(bccArchives.length?" ("+bccArchives.length+")":"")]].map(([k,lbl])=>`
          <button onclick="bccFilter='${k}';renderPage()" style="padding:6px 13px;border-radius:999px;border:1.5px solid ${bccFilter===k?th.c1:"#e2e8f0"};background:${bccFilter===k?th.c1:"#fff"};color:${bccFilter===k?"#fff":"#64748b"};cursor:pointer;font-size:12px;font-weight:600;font-family:'Inter',sans-serif">${lbl}</button>
        `).join("")}
      </div>
    </div>
    <div class="section-card">
      ${bccList.length===0?`<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">${bccFilter==="archives"?"Aucun bon de commande archivé":"Aucun bon de commande en cours. Passez un devis en statut « Accepté » puis cliquez sur 📋 pour en créer un."}</div>`:`
      <div style="overflow-x:auto"><table>
        <thead><tr><th>N°</th><th>Client</th><th>Devis</th><th>Chantier</th><th>Date</th><th>Montant TTC</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          ${bccList.map(b=>{
            const cli=CLIENTS.find(c=>c.id===b.clientId);
            const[bg,col,lbl]=ST_BCC[b.statut]||ST_BCC.en_cours;
            return`<tr>
              <td style="font-weight:700;color:${th.c1}">${b.num}</td>
              <td>${cli?cli.nom:"—"}</td>
              <td style="font-size:12px;color:#64748b">${b.devisNum||"—"}</td>
              <td style="font-size:12px;color:#64748b">${b.refChantier||"—"}</td>
              <td style="font-size:12px;color:#64748b">${b.date?fDate(b.date):"—"}</td>
              <td style="font-weight:700">${fMoney(devisTTC(b))}${bccPaye(b)>0?`<div style="font-size:10px;font-weight:600;color:#15803d">Réglé : ${fMoney(bccPaye(b))}</div>`:""}</td>
              <td><span class="badge" style="background:${bg};color:${col}">${lbl}${b.factureNum?" · "+b.factureNum:""}</span></td>
              <td><div style="display:flex;gap:5px">
                ${b.statut!=="facture"?`<button class="btn-sm" onclick="modalPaiementBCC('${b.id}')" title="Enregistrer un règlement" style="border-color:#86efac;background:#f0fdf4;color:#15803d">💰</button>`:""}
                <button class="btn-sm" onclick="genererBCClientPDF('${b.id}')" title="PDF" style="border-color:#86efac;background:#f0fdf4;color:#15803d">📄</button>
                ${b.statut!=="facture"?`<button class="btn-sm btn-edit" onclick="modalBCC('${b.id}')" title="Modifier">✏️</button>`:""}
                ${b.statut==="en_cours"?`<button class="btn-sm" onclick="bccLivre('${b.id}')" title="Marquer le chantier livré" style="border-color:#fde68a;background:#fffbeb;color:#b45309">🚚</button>`:""}
                ${b.statut==="livre"?`<button class="btn-sm" onclick="bccVersFacture('${b.id}')" title="Transformer en facture" style="border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8">🧾</button>`:""}
                <button class="btn-sm btn-danger" onclick="delBCC('${b.id}')">🗑️</button>
              </div></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table></div>`}
    </div>`;
}

// Réf. chantier : visible uniquement pour les clients de catégorie « Pro »
function clientEstPro(clientId){const c=CLIENTS.find(x=>x.id===clientId);return !!(c&&c.cat==="Pro");}
function toggleChantierField(prefix){
  const sel=document.getElementById(prefix+"-client");
  const wrap=document.getElementById(prefix+"-chantier-wrap");
  if(!sel||!wrap)return;
  wrap.style.display=clientEstPro(sel.value)?"block":"none";
}
function modalDevis(id){
  const d=id?DEVIS.find(x=>x.id===id):{id:"",clientId:selectedClientId||"",num:prochainNumero("DEV",DEVIS),date:TODAY,validite:addDays(TODAY,30),statut:"brouillon",tva:TVA_DEFAUT,notes:"",refChantier:"",lignes:[{desc:"",qte:1,pu:0}]};
  window._devisLignes=JSON.parse(JSON.stringify(d.lignes&&d.lignes.length?d.lignes:[{desc:"",qte:1,pu:0}]));
  showModal(id?"Modifier le devis":"Nouveau devis",`
    <div class="field-row">
      <div class="field"><label>N° devis</label><input id="dv-num" value="${d.num}"/></div>
      <div class="field"><label>Client *</label>
        <div style="display:flex;gap:6px;align-items:center">
          <select id="dv-client" onchange="toggleChantierField('dv')" style="flex:1;min-width:0">
            ${clientSelectOptions(d.clientId)}
          </select>
          <button onclick="quickAddClientOverlay('dv-client','dv')" title="Créer un nouveau client" style="flex-shrink:0;width:44px;height:44px;border-radius:8px;border:1.5px solid ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-size:20px;font-weight:700;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;padding:0">＋</button>
        </div>
      </div>
    </div>
    <div class="field" id="dv-chantier-wrap" style="display:${clientEstPro(d.clientId)?"block":"none"}"><label>Référence chantier (client pro)</label><input id="dv-chantier" value="${(d.refChantier||"").replace(/"/g,'&quot;')}" placeholder="Ex : Chantier rue des Lilas — Lot 3"/></div>
    <div class="field-row">
      <div class="field"><label>Date</label><input type="date" id="dv-date" value="${d.date}"/></div>
      <div class="field"><label>Validité</label><input type="date" id="dv-validite" value="${d.validite}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Statut</label><select id="dv-statut">
        ${Object.entries(ST_DEVIS).map(([k,v])=>`<option value="${k}"${d.statut===k?" selected":""}>${v[2]}</option>`).join("")}
      </select></div>
      <div class="field"><label>TVA (%)</label><input type="number" step="any" id="dv-tva" value="${d.tva}" oninput="updateDevisTotaux()"/></div>
    </div>
    <div class="field">
      <label>Ajout rapide depuis le catalogue <span id="cat-picker-cpt" style="font-weight:600;color:#94a3b8"></span></label>
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <input id="cat-search" placeholder="🔍 Nom, référence, marque..." oninput="renderCataloguePicker(this.value)" style="flex:1;padding:8px 12px;border-radius:8px;border:1.5px solid #e2e8f0;font-size:13px;background:#fff;outline:none;font-family:'Inter',sans-serif;min-width:0"/>
        <button onclick="modalAjoutProduitCatalogue()" style="padding:8px 12px;border-radius:8px;border:1.5px solid ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif;white-space:nowrap">＋ Produit</button>
      </div>
      <div id="cat-picker-chips" style="display:flex;gap:5px;overflow-x:auto;padding-bottom:8px;margin-bottom:6px"></div>
      <div id="cat-picker" style="display:flex;flex-wrap:wrap;gap:6px;max-height:190px;overflow-y:auto;padding:4px"></div>
    </div>
    <div class="field">
      <label>Lignes du devis</label>
      <div id="dv-lignes"></div>
      <button onclick="addDevisLigne()" style="margin-top:8px;padding:7px 12px;border-radius:8px;border:1.5px dashed ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-size:12px;font-weight:600;font-family:'Inter',sans-serif;width:100%">＋ Ligne vide</button>
    </div>
    <div id="dv-totaux" style="background:#F7F4ED;border-radius:10px;padding:12px 16px;margin-bottom:14px"></div>
    <div class="field"><label>Notes</label><textarea id="dv-notes" placeholder="Conditions, remarques...">${d.notes||""}</textarea></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="saveDevis('${id||""}')">Enregistrer</button>`
  );
  renderDevisLignes();
  renderCataloguePicker("");
}
const INPUT_L="padding:8px 10px;border-radius:8px;border:1.5px solid #e2e8f0;font-size:13px;background:#fff;outline:none;font-family:'Inter',sans-serif;min-width:0";
// Bascule l'affichage du descriptif détaillé d'une ligne
function toggleLigneDet(i){
  const l=window._devisLignes[i];
  l._det=!l._det;
  renderDevisLignes();
}
function renderDevisLignes(){
  const box=document.getElementById("dv-lignes");
  if(!box)return;
  const L=window._devisLignes;
  if(L.length===0){box.innerHTML=`<div style="padding:16px;text-align:center;color:#94a3b8;font-size:12.5px">Aucune ligne. Choisissez un produit ci-dessus ou ajoutez une ligne vide.</div>`;updateDevisTotaux();return;}
  box.innerHTML=L.map((l,i)=>{
    const total=(l.qte||0)*(l.pu||0);
    const cout=(l.qte||0)*(l.pa||0);
    const marge=total-cout;
    const pct=total>0?(marge/total*100):0;
    const mCol=marge>0?"#15803d":marge<0?"#991b1b":"#94a3b8";
    const ouvert=l._det||!!(l.det||"").trim();
    return `<div style="border:1.5px solid #e2e8f0;border-radius:10px;padding:9px;margin-bottom:8px;background:#fff">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input value="${(l.ref||"").replace(/"/g,'&quot;')}" placeholder="Réf." oninput="window._devisLignes[${i}].ref=this.value" style="width:82px;${INPUT_L};font-size:11.5px;font-weight:700;color:#64748b;flex-shrink:0"/>
        <input value="${(l.desc||"").replace(/"/g,'&quot;')}" placeholder="Désignation" oninput="window._devisLignes[${i}].desc=this.value;updateDevisTotaux()" style="flex:1;${INPUT_L}"/>
        <button type="button" onclick="toggleLigneDet(${i})" title="Descriptif détaillé" style="width:30px;height:30px;border-radius:7px;border:1.5px solid ${ouvert?TH.c1:"#e2e8f0"};background:${ouvert?TH.c1+"12":"#fff"};color:${ouvert?TH.c1:"#94a3b8"};cursor:pointer;flex-shrink:0;font-size:12px">📄</button>
        <button type="button" onclick="window._devisLignes.splice(${i},1);renderDevisLignes()" style="width:30px;height:30px;border-radius:7px;border:1.5px solid #fecaca;background:#fef2f2;color:#991b1b;cursor:pointer;flex-shrink:0;font-size:13px">✕</button>
      </div>
      ${ouvert?`<textarea placeholder="Descriptif détaillé (imprimé sous la désignation)" oninput="window._devisLignes[${i}].det=this.value" style="width:100%;box-sizing:border-box;${INPUT_L};font-size:12px;min-height:54px;resize:vertical;margin-bottom:6px">${(l.det||"")}</textarea>`:""}
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <input type="number" step="any" value="${l.qte}" placeholder="Qté" oninput="window._devisLignes[${i}].qte=parseFloat(this.value)||0;updateDevisTotaux()" style="width:58px;${INPUT_L};text-align:center;flex-shrink:0"/>
        <input list="dv-unites" value="${(l.unite||"unité").replace(/"/g,'&quot;')}" placeholder="Unité" oninput="window._devisLignes[${i}].unite=this.value" style="width:76px;${INPUT_L};font-size:12px;flex-shrink:0"/>
        <input type="number" step="any" value="${l.pa||0}" placeholder="P.A." title="Prix d'achat HT (interne, non imprimé)" oninput="window._devisLignes[${i}].pa=parseFloat(this.value)||0;updateDevisTotaux()" style="width:70px;${INPUT_L};text-align:right;background:#f8fafc;color:#64748b;flex-shrink:0"/>
        <input type="number" step="any" value="${l.pu}" placeholder="P.U." oninput="window._devisLignes[${i}].pu=parseFloat(this.value)||0;updateDevisTotaux()" style="width:82px;${INPUT_L};text-align:right;font-weight:700;flex-shrink:0"/>
        <div style="flex:1;min-width:110px;text-align:right;font-size:12.5px">
          <span style="font-weight:800;color:${TH.txt}">${fMoney(total)}</span>
          ${cout>0?`<span style="margin-left:7px;font-size:11px;font-weight:700;color:${mCol}">${marge>=0?"+":""}${fMoney(marge)} · ${pct.toFixed(0)} %</span>`:""}
        </div>
      </div>
    </div>`;
  }).join("")+`<datalist id="dv-unites">${UNITES.map(u=>`<option value="${u}"></option>`).join("")}</datalist>`;
  updateDevisTotaux();
}
function addDevisLigne(){ window._devisLignes.push({ref:"",desc:"",det:"",unite:"unité",qte:1,pu:0,pa:0}); renderDevisLignes(); }

// ── Sélecteur de produits (catalogue + stock) ──────────────────────────────
let _pickerProduits=[];
// Fusionne le catalogue et les articles du stock valorisés en une liste unique
function produitsUnifies(){
  return [
    ...CATALOGUE.map(p=>({id:p.id,ref:p.ref,nom:p.nom,cat:p.cat,unite:p.unite,desc:p.desc,marque:p.marque,modele:p.modele,pa:p.pa,pu:p.pu,src:"cat"})),
    ...STOCK.filter(s=>s.prix>0).map(s=>({id:s.id,ref:s.ref,nom:s.nom,cat:s.cat,unite:s.unite,desc:"",pa:(s.prixRevient||s.prixAchat||0),pu:s.prix,src:"stock",qte:s.qte}))
  ];
}
function pickerCard(p,onclick){
  const stock=p.src==="stock";
  const sousTitre=[p.marque,p.modele].filter(Boolean).join(" ");
  const tip=(p.desc||"").replace(/"/g,"&quot;").slice(0,220);
  return `<button type="button" onclick="${onclick}" title="${tip}" style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:8px 11px;border-radius:9px;border:1.5px solid ${stock?"#fcd34d":"#e2e8f0"};background:${stock?"#fffbeb":"#fff"};cursor:pointer;font-family:'Inter',sans-serif;text-align:left;max-width:230px">
    <span style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
      ${p.ref?`<span style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.04em">${p.ref}</span>`:""}
      ${(!stock&&p.cat)?`<span style="font-size:9.5px;color:#64748b;background:#f1f5f9;padding:1px 5px;border-radius:5px">${p.cat}</span>`:""}
      ${stock?`<span style="font-size:9.5px;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:5px">Stock ${p.qte??""}</span>`:""}
    </span>
    <span style="font-size:12px;font-weight:600;color:#1A2118">${p.nom}</span>
    ${sousTitre?`<span style="font-size:10px;color:#94a3b8">${sousTitre}</span>`:""}
    <span style="display:flex;align-items:center;gap:6px">
      <span style="font-size:11px;color:${TH.c1};font-weight:700">${fMoney(p.pu)}${p.unite?`<span style="color:#94a3b8;font-weight:500"> / ${p.unite}</span>`:""}</span>
      ${p.pa>0?margeBadge(p):""}
    </span>
  </button>`;
}
function filtrerProduits(list,filter){
  filter=(filter||"").toLowerCase().trim();
  if(!filter)return list;
  return list.filter(p=>(p.nom||"").toLowerCase().includes(filter)
    ||(p.ref||"").toLowerCase().includes(filter)
    ||(p.cat||"").toLowerCase().includes(filter));
}
// Catégorie sélectionnée dans le sélecteur rapide (devis et factures)
let _pickerCat="";
function setPickerCat(cat,cible){
  _pickerCat=cat;
  if(cible==="fac") renderFacCataloguePicker(document.getElementById("fac-cat-search")?.value||"");
  else renderCataloguePicker(document.getElementById("cat-search")?.value||"");
}
function renderPickerChips(cible){
  const chip=(label,val)=>{
    const on=_pickerCat===val;
    return `<button type="button" onclick="setPickerCat('${val.replace(/'/g,"\\'")}','${cible}')" style="padding:4px 10px;border-radius:999px;border:1.5px solid ${on?TH.c1:"#e2e8f0"};background:${on?TH.c1:"#fff"};color:${on?"#fff":"#475569"};cursor:pointer;font-size:11.5px;font-weight:600;font-family:'Inter',sans-serif;white-space:nowrap">${label}</button>`;
  };
  return chip("Tous","")+CAT_PRODUITS.map(c=>chip(c,c)).join("")+chip("📦 Stock","__stock");
}
// Applique recherche texte + filtre catégorie
function pickerFiltrer(list,filter){
  let out=filtrerProduits(list,filter);
  if(_pickerCat==="__stock") out=out.filter(p=>p.src==="stock");
  else if(_pickerCat) out=out.filter(p=>p.cat===_pickerCat);
  return out;
}
function renderCataloguePicker(filter){
  const box=document.getElementById("cat-picker");
  if(!box)return;
  const chips=document.getElementById("cat-picker-chips");
  if(chips) chips.innerHTML=renderPickerChips("dev");
  _pickerProduits=produitsUnifies();
  const filtered=pickerFiltrer(_pickerProduits.map((p,i)=>({...p,idx:i})),filter);
  const cpt=document.getElementById("cat-picker-cpt");
  if(cpt) cpt.textContent=`${filtered.length} / ${_pickerProduits.length}`;
  if(filtered.length===0){box.innerHTML=`<div style="padding:12px;color:#94a3b8;font-size:12px;width:100%;text-align:center">Aucun produit ne correspond. Cliquez sur « ＋ Produit » pour en créer un.</div>`;return;}
  box.innerHTML=filtered.map(p=>pickerCard(p,`addProduitToDevis(${p.idx})`)).join("");
}
function addProduitToDevis(idx){
  const p=_pickerProduits[idx];
  if(!p)return;
  const det=[p.marque,p.modele].filter(Boolean).join(" ");
  const ligne={
    ref:p.ref||"",
    desc:p.nom,
    det:(p.desc||"")||(det?det:""),
    unite:p.unite||"unité",
    qte:1,
    pu:p.pu,
    pa:p.pa||0
  };
  const empty=window._devisLignes.findIndex(l=>!l.desc&&!l.pu);
  if(empty!==-1){window._devisLignes[empty]=ligne;}
  else{window._devisLignes.push(ligne);}
  renderDevisLignes();
  updateDevisTotaux();
}
function modalAjoutProduitCatalogue(){ editerProduit(null,"picker"); }

// ── Gestion du catalogue produits (panneau) ────────────────────────────────
let _catFiltre={q:"",cat:"",vue:"liste"};
let _catPanelOpen=false;
function openPanelCatalogue(){
  const pc=document.getElementById("panel-container");
  _catPanelOpen=true;
  pc.innerHTML=renderCataloguePanel();
}
function closeCataloguePanel(){ _catPanelOpen=false; document.getElementById("panel-container").innerHTML=""; }
// Rafraîchit le catalogue là où il est affiché : panneau latéral ou page Commandes & Stock
function refreshCatalogueUI(){
  if(_catPanelOpen){ openPanelCatalogue(); return; }
  if(currentPage==="stock"){ renderPage(); return; }
}

function catalogueFiltre(){
  const q=(_catFiltre.q||"").toLowerCase().trim();
  return CATALOGUE.filter(p=>{
    if(_catFiltre.cat && p.cat!==_catFiltre.cat) return false;
    if(!q) return true;
    return (p.nom||"").toLowerCase().includes(q)
      ||(p.ref||"").toLowerCase().includes(q)
      ||(p.marque||"").toLowerCase().includes(q)
      ||(p.modele||"").toLowerCase().includes(q)
      ||(p.desc||"").toLowerCase().includes(q);
  });
}
function setCatFiltre(champ,val){
  _catFiltre[champ]=val;
  const corps=document.getElementById("cat-corps");
  if(champ==="vue"&&corps){ corps.innerHTML=renderCatalogueCorpsInner(); return; }
  const box=document.getElementById("cat-liste");
  if(box) box.innerHTML=renderCatalogueListe();
  const chips=document.getElementById("cat-chips");
  if(chips) chips.innerHTML=renderCatChips();
}
function renderCatChips(){
  const chip=(label,val)=>{
    const on=_catFiltre.cat===val;
    return `<button onclick="setCatFiltre('cat','${val.replace(/'/g,"\\'")}')" style="padding:5px 11px;border-radius:999px;border:1.5px solid ${on?TH.c1:"#e2e8f0"};background:${on?TH.c1:"#fff"};color:${on?"#fff":"#475569"};cursor:pointer;font-size:12px;font-weight:600;font-family:'Inter',sans-serif;white-space:nowrap">${label}</button>`;
  };
  return chip("Tous","")+CAT_PRODUITS.map(c=>chip(c,c)).join("");
}
function renderCatalogueListe(){
  const list=catalogueFiltre();
  if(list.length===0) return `<div style="padding:28px;text-align:center;color:#94a3b8;font-size:13px">Aucun produit ne correspond.</div>`;
  if(_catFiltre.vue==="grille"){
    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">`+list.map(p=>`
      <div style="border:1.5px solid #e2e8f0;border-radius:11px;padding:10px;background:#fff">
        <div style="height:74px;border-radius:8px;background:${p.photo?`url('${p.photo}') center/cover`:"#f8fafc"};display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:8px">${p.photo?"":"📦"}</div>
        ${p.ref?`<div style="font-size:10px;font-weight:700;color:#94a3b8">${p.ref}</div>`:""}
        <div style="font-size:12px;font-weight:600;color:#1A2118;line-height:1.3;margin-bottom:4px">${p.nom}</div>
        <div style="font-size:13px;font-weight:800;color:${TH.c1}">${fMoney(p.pu)}</div>
        <div style="margin:5px 0">${margeBadge(p)}</div>
        <div style="display:flex;gap:5px">
          <button onclick="editerProduit('${p.id}')" style="flex:1;padding:5px;border-radius:7px;border:1.5px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;cursor:pointer;font-size:12px">✏️</button>
          <button onclick="delCatalogueItem('${p.id}')" style="flex:1;padding:5px;border-radius:7px;border:1.5px solid #fecaca;background:#fef2f2;color:#991b1b;cursor:pointer;font-size:12px">🗑️</button>
        </div>
      </div>`).join("")+`</div>`;
  }
  return list.map(p=>`<div style="display:flex;align-items:center;gap:10px;padding:11px 4px;border-bottom:1px solid #f1f5f9">
      <div style="width:42px;height:42px;flex-shrink:0;border-radius:8px;background:${p.photo?`url('${p.photo}') center/cover`:"#f8fafc"};display:flex;align-items:center;justify-content:center;font-size:18px">${p.photo?"":"📦"}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          ${p.ref?`<span style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:0.04em">${p.ref}</span>`:""}
          <span style="font-size:10px;color:#64748b;background:#f1f5f9;padding:1px 6px;border-radius:5px">${p.cat||"Autre"}</span>
        </div>
        <div style="font-size:13px;font-weight:600;color:#1A2118;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.nom}</div>
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:2px">
          <span style="font-size:12px;color:${TH.c1};font-weight:700">${fMoney(p.pu)}<span style="color:#94a3b8;font-weight:500"> / ${p.unite||"unité"}</span></span>
          ${margeBadge(p)}
        </div>
      </div>
      <button onclick="editerProduit('${p.id}')" style="padding:5px 9px;border-radius:7px;border:1.5px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;cursor:pointer;font-size:12px">✏️</button>
      <button onclick="delCatalogueItem('${p.id}')" style="padding:5px 9px;border-radius:7px;border:1.5px solid #fecaca;background:#fef2f2;color:#991b1b;cursor:pointer;font-size:12px">🗑️</button>
    </div>`).join("");
}
// Corps du catalogue (statistiques, recherche, filtres, liste) — partagé entre
// le panneau latéral et la section de la page Commandes & Stock
function renderCatalogueCorps(){ return `<div id="cat-corps">${renderCatalogueCorpsInner()}</div>`; }
function renderCatalogueCorpsInner(){
  const total=CATALOGUE.length;
  const avecPa=CATALOGUE.filter(p=>p.pa>0);
  const margeMoy=avecPa.length?avecPa.reduce((s,p)=>s+prodMargePct(p),0)/avecPa.length:0;
  return `
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <div style="flex:1;background:#f8fafc;border-radius:9px;padding:9px 11px">
        <div style="font-size:11px;color:#64748b;font-weight:600">Produits</div>
        <div style="font-size:18px;font-weight:800;color:${TH.txt}">${total}</div>
      </div>
      <div style="flex:1;background:#f8fafc;border-radius:9px;padding:9px 11px">
        <div style="font-size:11px;color:#64748b;font-weight:600">Marge moyenne</div>
        <div style="font-size:18px;font-weight:800;color:${TH.c1}">${margeMoy.toFixed(0)} %</div>
      </div>
    </div>
    <div style="display:flex;gap:7px;margin-bottom:10px">
      <input id="cat-q" value="${_catFiltre.q}" placeholder="🔍 Rechercher (nom, réf, marque…)" oninput="setCatFiltre('q',this.value)" style="flex:1;padding:9px 12px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13px;outline:none;font-family:'Inter',sans-serif;min-width:0"/>
      <button onclick="setCatFiltre('vue','${_catFiltre.vue==="liste"?"grille":"liste"}')" style="padding:9px 11px;border-radius:9px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;font-size:14px" title="${_catFiltre.vue==="liste"?"Vue grille":"Vue liste"}">${_catFiltre.vue==="liste"?"▦":"☰"}</button>
    </div>
    <div id="cat-chips" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:9px;margin-bottom:9px">${renderCatChips()}</div>
    <div id="cat-liste">${renderCatalogueListe()}</div>`;
}
// Section catalogue intégrée à la page Commandes & Stock
function renderCatalogueSection(){
  return `
    <div class="section-card" style="background:${TH.card}">
      <div class="section-head">
        <div><div class="section-title" style="color:${TH.txt}">Catalogue produits</div><div class="section-sub">${CATALOGUE.length} référence${CATALOGUE.length>1?"s":""} · prix de vente et marges</div></div>
        <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="editerProduit(null)">＋ Nouveau produit</button>
      </div>
      ${renderCatalogueCorps()}
    </div>`;
}
function renderCataloguePanel(){
  const total=CATALOGUE.length;
  const margeMoy=total?CATALOGUE.filter(p=>p.pa>0).reduce((s,p)=>s+prodMargePct(p),0)/(CATALOGUE.filter(p=>p.pa>0).length||1):0;
  return`<div class="panel-overlay">
    <div class="panel-bg" onclick="closeCataloguePanel()"></div>
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">📦 Catalogue produits</div>
        <button class="panel-close" onclick="closeCataloguePanel()">✕</button>
      </div>
      <div class="panel-body">
        <button onclick="editerProduit(null)" style="width:100%;padding:10px;border-radius:9px;border:1.5px dashed ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-weight:700;font-size:13px;font-family:'Inter',sans-serif;margin-bottom:12px">＋ Ajouter un produit</button>
        ${renderCatalogueCorps()}
      </div>
    </div>
  </div>`;
}

// ── Fiche produit (création / édition) ─────────────────────────────────────
let _prodRetour=null;
function editerProduit(id,retour){
  _prodRetour=retour||null;
  const p=id?CATALOGUE.find(x=>x.id===id):null;
  const v=p?normProduit(p):normProduit({});
  const champ=(label,inputHtml)=>`<div class="field"><label>${label}</label>${inputHtml}</div>`;
  const body=`
    <div style="display:flex;gap:10px">
      ${champ("Référence",`<input id="pr-ref" value="${v.ref}" placeholder="CAM-4MP-B"/>`)}
      ${champ("Catégorie",`<select id="pr-cat">${CAT_PRODUITS.map(c=>`<option${v.cat===c?" selected":""}>${c}</option>`).join("")}</select>`)}
    </div>
    ${champ("Désignation *",`<input id="pr-nom" value="${v.nom.replace(/"/g,"&quot;")}" placeholder="${pE(MP().ex.produit)}"/>`)}
    ${champ("Description",`<textarea id="pr-desc" rows="2" placeholder="Caractéristiques, usage, spécificités techniques…">${v.desc}</textarea>`)}
    <div style="display:flex;gap:10px">
      ${champ("Marque",`<input id="pr-marque" value="${v.marque.replace(/"/g,"&quot;")}" placeholder="Hikvision"/>`)}
      ${champ("Modèle",`<input id="pr-modele" value="${v.modele.replace(/"/g,"&quot;")}" placeholder="DS-2CD2043G2"/>`)}
    </div>
    <div style="display:flex;gap:10px">
      ${champ("Prix d'achat HT",`<input id="pr-pa" type="number" step="0.01" value="${v.pa}" oninput="majMargeFiche()"/>`)}
      ${champ("Prix de vente HT *",`<input id="pr-pu" type="number" step="0.01" value="${v.pu}" oninput="majMargeFiche()"/>`)}
    </div>
    <div id="pr-marge" style="padding:9px 12px;border-radius:9px;background:#f8fafc;margin-bottom:12px;font-size:13px"></div>
    <div style="display:flex;gap:10px">
      ${champ("Unité",`<select id="pr-unite">${[...new Set([...UNITES,"heure","forfait","touret","kit","m","ml"])].map(u=>`<option${v.unite===u?" selected":""}>${u}</option>`).join("")}</select>`)}
      ${champ("Fournisseur",`<input id="pr-four" value="${v.four.replace(/"/g,"&quot;")}" placeholder="Nom du fournisseur"/>`)}
    </div>
    ${champ("Photo (URL)",`<input id="pr-photo" value="${v.photo.replace(/"/g,"&quot;")}" placeholder="https://…"/>`)}`;
  const footer=`<button class="btn-cancel" onclick="closeModal();retourCatalogue()">Annuler</button>
    <button class="btn-save" onclick="saveProduit(${id?`'${id}'`:"null"})">Enregistrer</button>`;
  showModal(p?"✏️ Modifier le produit":"📦 Nouveau produit",body,footer);
  majMargeFiche();
}
function majMargeFiche(){
  const box=document.getElementById("pr-marge");
  if(!box)return;
  const pa=parseFloat(document.getElementById("pr-pa")?.value)||0;
  const pu=parseFloat(document.getElementById("pr-pu")?.value)||0;
  if(!pa||!pu){box.innerHTML=`<span style="color:#94a3b8">Renseignez les deux prix pour voir la marge.</span>`;return;}
  const m=pu-pa, pct=pu>0?(m/pu*100):0, coef=pa>0?(pu/pa):0;
  const col=pct>=40?"#15803d":(pct>=20?"#b45309":"#991b1b");
  box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center">
    <span style="color:#64748b">Marge unitaire</span>
    <span style="font-weight:800;color:${col}">${fMoney(m)} · ${pct.toFixed(1)} % · coef ${coef.toFixed(2)}</span>
  </div>`;
}
function retourCatalogue(){
  if(_prodRetour==="picker"){
    renderCataloguePicker(document.getElementById("cat-search")?.value||"");
    renderFacCataloguePicker(document.getElementById("fac-cat-search")?.value||"");
    renderBccCataloguePicker(document.getElementById("bcc-cat-search")?.value||"");
  }
  _prodRetour=null;
}
function saveProduit(id){
  const nom=(document.getElementById("pr-nom").value||"").trim();
  if(!nom){alert("La désignation est obligatoire");return;}
  const obj=normProduit({
    id:id||uid(),
    ref:(document.getElementById("pr-ref").value||"").trim(),
    nom,
    cat:document.getElementById("pr-cat").value,
    unite:document.getElementById("pr-unite").value,
    desc:(document.getElementById("pr-desc").value||"").trim(),
    marque:(document.getElementById("pr-marque").value||"").trim(),
    modele:(document.getElementById("pr-modele").value||"").trim(),
    pa:parseFloat(document.getElementById("pr-pa").value)||0,
    pu:parseFloat(document.getElementById("pr-pu").value)||0,
    four:(document.getElementById("pr-four").value||"").trim(),
    photo:(document.getElementById("pr-photo").value||"").trim(),
  });
  if(id){CATALOGUE=CATALOGUE.map(p=>p.id===id?obj:p);logActivity("Modification produit",obj.nom);}
  else{CATALOGUE.push(obj);logActivity("Création produit",obj.nom);}
  saveData();
  closeModal();
  const wasPicker=_prodRetour==="picker";
  retourCatalogue();
  if(!wasPicker) refreshCatalogueUI();
}
function delCatalogueItem(id){
  const p=CATALOGUE.find(x=>x.id===id);
  confirmDel("Supprimer « "+(p?p.nom:"ce produit")+" » du catalogue ?",function(){
    CATALOGUE=CATALOGUE.filter(x=>x.id!==id);
    logActivity("Suppression produit",p?p.nom:"");
    saveData();refreshCatalogueUI();
  });
}
// Conservé pour compatibilité avec les anciens appels
function addCatalogueItem(){ editerProduit(null); }
function editCatalogueItem(id){ editerProduit(id); }

// Affiche la marge estimée d'un document (devis / facture)
function ligneMarge(ht,cout){
  const m=ht-cout, pct=ht>0?(m/ht*100):0;
  const col=pct>=40?"#15803d":(pct>=20?"#b45309":"#991b1b");
  const bg =pct>=40?"#f0fdf4":(pct>=20?"#fffbeb":"#fef2f2");
  return `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:7px;padding:6px 9px;border-radius:8px;background:${bg}">
    <span style="color:#64748b;font-weight:600">Marge estimée</span>
    <span style="font-weight:800;color:${col}">${fMoney(m)} · ${pct.toFixed(0)} %</span>
  </div>`;
}
function updateDevisTotaux(){
  const box=document.getElementById("dv-totaux");
  if(!box)return;
  const tva=parseFloat(document.getElementById("dv-tva")?.value)||0;
  const ht=window._devisLignes.reduce((s,l)=>s+(l.qte||0)*(l.pu||0),0);
  const cout=window._devisLignes.reduce((s,l)=>s+(l.qte||0)*(l.pa||0),0);
  const mtva=ht*tva/100;
  box.innerHTML=`${cout>0?ligneMarge(ht,cout):""}<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span style="color:#64748b">Total HT</span><span style="font-weight:600">${fMoney(ht)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span style="color:#64748b">TVA ${fTaux(tva)}</span><span style="font-weight:600">${fMoney(mtva)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:15px;padding-top:6px;border-top:1px solid #ddd"><span style="font-weight:700;color:${TH.txt}">Total TTC</span><span style="font-weight:800;color:${TH.c1}">${fMoney(ht+mtva)}</span></div>`;
}
function saveDevis(id){
  const clientId=document.getElementById("dv-client").value;
  if(!clientId){alert("Veuillez choisir un client");return;}
  const lignes=window._devisLignes.filter(l=>l.desc||l.pu).map(l=>{const c={...l};delete c._det;return c;});
  if(lignes.length===0){alert("Ajoutez au moins une ligne");return;}
  const obj={
    num:document.getElementById("dv-num").value.trim(),
    clientId,
    date:document.getElementById("dv-date").value,
    validite:document.getElementById("dv-validite").value,
    statut:document.getElementById("dv-statut").value,
    refChantier:(document.getElementById("dv-chantier")?.value||"").trim(),
    tva:parseFloat(document.getElementById("dv-tva").value)||0,
    notes:document.getElementById("dv-notes").value.trim(),
    lignes
  };
  if(id){DEVIS=DEVIS.map(d=>d.id===id?{...d,...obj}:d);logActivity("Modification devis",obj.num);}
  else{DEVIS.push({...obj,id:uid()});logActivity("Création devis",obj.num);}
  closeModal();renderPage();renderNav();
}
function delDevis(id){const d=DEVIS.find(x=>x.id===id);confirmDel("Supprimer ce devis ?",function(){DEVIS=DEVIS.filter(x=>x.id!==id);logActivity("Suppression devis",d?d.num:"");renderPage();});}

function devisVersFacture(id){
  const d=DEVIS.find(x=>x.id===id);if(!d)return;
  const cli=CLIENTS.find(c=>c.id===d.clientId);
  if(!confirm("Créer une facture à partir de ce devis ?"))return;
  const num=prochainNumero("FAC",FACTURES);
  FACTURES.push({
    id:uid(),num,date:TODAY,
    client:cli?cli.nom:"",
    clientId:d.clientId,
    ech:addDays(TODAY,30),
    statut:"envoyee",
    tva:(d.tva!==undefined&&d.tva!==null)?d.tva:TVA_DEFAUT,
    lignes:JSON.parse(JSON.stringify(d.lignes||[])),  // reprend TOUTES les lignes du devis
    ttc:Math.round(devisTTC(d)*100)/100
  });
  logActivity("Conversion devis→facture",`${d.num} → ${num} (${(d.lignes||[]).length} ligne(s))`);
  alert(`Facture ${num} créée avec le détail des articles ! Retrouvez-la dans Factures.`);
  renderPage();renderNav();
}

