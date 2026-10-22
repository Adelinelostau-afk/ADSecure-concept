// ── CLIENTS ─────────────────────────────────────────────
// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// ── CLIENTS : recherche, filtres, vue kanban ou liste ───
// ════════════════════════════════════════════════════════
let cliVue="kanban";        // "kanban" ou "liste"
let cliQ="";                // recherche
let cliCat="";              // filtre catégorie
let cliStatut="";           // filtre statut (vue liste)
let cliTri="nom";           // nom | ca | date | trans

// CA réel d'un client, calculé sur ses factures et devis acceptés
function cliCA(c){
  const facs=FACTURES.filter(f=>facEnCompta(f)&&(f.clientId===c.id||(!f.clientId&&f.client&&f.client===c.nom))&&!["brouillon","annulee"].includes(f.statut)).reduce((s,f)=>s+facTTC(f),0);
  return facs>0?Math.round(facs*100)/100:(c.ca||0);
}
// Devis acceptés (y compris passés en bon de commande) et commandes en cours non facturées
function cliDevisAcceptes(c){ return DEVIS.filter(d=>d.clientId===c.id&&(["accepte","transforme"].includes(d.statut)||BCCLIENTS.some(b=>b.devisId===d.id))); }
function cliEnCommande(c){ return Math.round(BCCLIENTS.filter(b=>b.clientId===c.id&&b.statut!=="facture").reduce((s,b)=>s+devisTTC(b),0)*100)/100; }
function cliDerniereCommande(c){
  const d=[c.dernCmd||"",...BCCLIENTS.filter(b=>b.clientId===c.id).map(b=>b.date||""),...cliDevisAcceptes(c).map(x=>x.date||""),
    ...FACTURES.filter(f=>f.clientId===c.id).map(f=>facDate(f)||"")].filter(Boolean).sort();
  return d.pop()||"";
}
function cliDernierContact(c){
  const tr=transDuClient(c.id);
  const dates=[c.dernCmd||"",...(tr.length?[(tr[0].date||"").slice(0,10)]:[])].filter(Boolean);
  return dates.sort().pop()||"";
}
function clientsFiltres(){
  const q=(cliQ||"").toLowerCase().trim();
  let L=CLIENTS.filter(c=>{
    if(cliCat && c.cat!==cliCat) return false;
    if(cliStatut && c.status!==cliStatut) return false;
    if(!q) return true;
    return [c.nom,c.contact,c.tel,c.email,c.adresse,c.cat].filter(Boolean).join(" ").toLowerCase().includes(q);
  });
  const cmp={
    nom:(a,b)=>(a.nom||"").localeCompare(b.nom||""),
    ca:(a,b)=>cliCA(b)-cliCA(a),
    date:(a,b)=>(cliDernierContact(b)||"").localeCompare(cliDernierContact(a)||""),
    trans:(a,b)=>transDuClient(b.id).length-transDuClient(a.id).length
  }[cliTri]||((a,b)=>0);
  return [...L].sort(cmp);
}
function setCliFiltre(champ,val){
  if(champ==="q") cliQ=val;
  else if(champ==="cat") cliCat=(cliCat===val?"":val);
  else if(champ==="statut") cliStatut=(cliStatut===val?"":val);
  else if(champ==="tri") cliTri=val;
  else if(champ==="vue") cliVue=val;
  if(champ==="q"){
    const z=document.getElementById("cli-zone"); if(z) z.innerHTML=renderClientsZone();
    const cpt=document.getElementById("cli-cpt"); if(cpt) cpt.textContent=renderClientsCompteur();
    return;
  }
  renderPage();
}
function resetCliFiltres(){ cliQ="";cliCat="";cliStatut="";cliTri="nom"; renderPage(); }

function renderClientsCompteur(){
  const n=clientsFiltres().length;
  return `${n} client${n>1?"s":""} affiché${n>1?"s":""} sur ${CLIENTS.length}`;
}
// Une carte client, utilisée par le kanban
function cliCarte(c){
  const tr=transDuClient(c.id);
  const devisN=DEVIS.filter(d=>d.clientId===c.id).length;
  return `<div class="cli-card" draggable="true" data-cid="${c.id}"
    ondragstart="cliDragId='${c.id}';this.classList.add('dragging')"
    ondragend="this.classList.remove('dragging')"
    ontouchstart="cliTouchStart(event,'${c.id}')"
    ontouchmove="cliTouchMove(event)"
    ontouchend="cliTouchEnd(event)">
    <div class="cli-card-acts">
      <button class="cli-card-btn" onclick="cliMoveMenu('${c.id}');event.stopPropagation()" title="Déplacer">↔️</button>
      <button class="cli-card-btn" onclick="modalClient('${c.id}');event.stopPropagation()" title="Modifier">✏️</button>
      <button class="cli-card-btn" onclick="delClient('${c.id}');event.stopPropagation()" style="border-color:#fecaca" title="Supprimer">🗑️</button>
    </div>
    <div class="cli-card-name" onclick="openClientFiche('${c.id}')">${c.nom}</div>
    <div class="cli-card-contact">${c.contact||"—"}</div>
    <div class="cli-card-ca">${fMoney(cliCA(c))}</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-top:4px">
      ${badge(c.cat,TH.c1+"18",TH.c1)}
      ${devisN?`<span style="font-size:10px;color:${TH.txt}77">📝 ${devisN}</span>`:""}
      ${tr.length?`<span style="font-size:10px;color:${TH.txt}77">🗒️ ${tr.length}</span>`:""}
    </div>
    ${tr.length?`<div style="font-size:10px;color:${TH.txt}66;margin-top:4px;font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">« ${(tr[0].texte||"").slice(0,48)} »</div>`:""}
    <div style="display:flex;gap:6px;margin-top:7px">
      ${c.tel?`<a href="tel:${c.tel}" onclick="event.stopPropagation()" style="flex:1;text-align:center;padding:4px;border-radius:6px;background:${TH.c1}10;color:${TH.c1};font-size:11px;font-weight:700;text-decoration:none">📞</a>`:""}
      ${c.email?`<a href="mailto:${c.email}" onclick="event.stopPropagation()" style="flex:1;text-align:center;padding:4px;border-radius:6px;background:${TH.c1}10;color:${TH.c1};font-size:11px;font-weight:700;text-decoration:none">✉️</a>`:""}
      <button onclick="openClientFiche('${c.id}');event.stopPropagation()" style="flex:2;padding:4px;border-radius:6px;border:none;background:${TH.c1};color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif">Fiche →</button>
    </div>
  </div>`;
}
function renderClientsKanban(){
  const L=clientsFiltres();
  return `<div class="cli-board">
    ${Object.entries(ST_CLI).map(([statusKey,[bg,col,lbl]])=>{
      const clients=L.filter(c=>c.status===statusKey);
      return`<div class="cli-col">
        <div class="cli-col-hd">
          <span class="dot" style="background:${col}"></span>
          <span style="color:${col}">${lbl}</span>
          <span style="background:${col}22;color:${col};border-radius:20px;padding:1px 7px;font-size:10px">${clients.length}</span>
        </div>
        <div class="cli-col-cards" data-status="${statusKey}"
          ondragover="event.preventDefault();this.classList.add('cli-col-drop')"
          ondragleave="this.classList.remove('cli-col-drop')"
          ondrop="cliOnDrop(event,'${statusKey}');this.classList.remove('cli-col-drop')">
          ${clients.length===0?`<div class="cli-col-empty">Glisser ici</div>`:""}
          ${clients.map(cliCarte).join("")}
        </div>
      </div>`;
    }).join("")}
  </div>`;
}
function renderClientsListe(){
  const L=clientsFiltres();
  if(L.length===0) return `<div style="padding:40px;text-align:center;color:#94a3b8;font-size:13px">Aucun client ne correspond à cette recherche.</div>`;
  return `<div style="overflow-x:auto"><table>
    <thead><tr><th>Client</th><th>Contact</th><th>Catégorie</th><th>CA</th><th>Dernier contact</th><th>Suivi</th><th>Statut</th><th>Actions</th></tr></thead>
    <tbody>
      ${L.map(c=>{
        const [bg,col,lbl]=ST_CLI[c.status]||["#f1f5f9","#64748b","—"];
        const tr=transDuClient(c.id);
        const devisN=DEVIS.filter(d=>d.clientId===c.id).length;
        const dc=cliDernierContact(c);
        return `<tr>
          <td><span onclick="openClientFiche('${c.id}')" style="font-weight:700;color:${TH.c1};cursor:pointer;text-decoration:underline">${c.nom}</span>${c.adresse?`<div style="font-size:11px;color:#94a3b8">${c.adresse}</div>`:""}</td>
          <td style="font-size:12px">${c.contact||"—"}${c.tel?`<div style="font-size:11px;color:#94a3b8">${c.tel}</div>`:""}</td>
          <td>${badge(c.cat,TH.c1+"18",TH.c1)}</td>
          <td style="font-weight:700">${fMoney(cliCA(c))}</td>
          <td style="font-size:12px;color:#64748b">${dc?fDate(dc):"—"}</td>
          <td style="font-size:12px;color:#64748b">${devisN?`📝 ${devisN} `:""}${tr.length?`🗒️ ${tr.length}`:""}${(!devisN&&!tr.length)?"—":""}</td>
          <td><span class="badge" style="background:${bg};color:${col}">${lbl}</span></td>
          <td><div style="display:flex;gap:5px">
            ${c.tel?`<a class="btn-sm" href="tel:${c.tel}" title="Appeler" style="border-color:#86efac;background:#f0fdf4;color:#15803d;text-decoration:none;display:inline-flex;align-items:center;justify-content:center">📞</a>`:""}
            <button class="btn-sm btn-edit" onclick="modalClient('${c.id}')" title="Modifier">✏️</button>
            <button class="btn-sm btn-danger" onclick="delClient('${c.id}')" title="Supprimer">🗑️</button>
          </div></td>
        </tr>`;
      }).join("")}
    </tbody>
  </table></div>`;
}
function renderClientsZone(){ return cliVue==="kanban"?renderClientsKanban():renderClientsListe(); }

function renderClients(){
  const L=clientsFiltres();
  const caTotal=CLIENTS.reduce((s,c)=>s+cliCA(c),0);
  const aRelancer=CLIENTS.filter(c=>c.status==="relance1"||c.status==="relance2");
  const sansSuivi=CLIENTS.filter(c=>transDuClient(c.id).length===0&&DEVIS.filter(d=>d.clientId===c.id).length===0);
  const actifs=cliQ||cliCat||cliStatut;
  const chip=(label,on,onclick)=>`<button onclick="${onclick}" style="padding:6px 13px;border-radius:999px;border:1.5px solid ${on?TH.c1:"#e2e8f0"};background:${on?TH.c1:"#fff"};color:${on?"#fff":"#64748b"};cursor:pointer;font-size:12px;font-weight:600;font-family:'Inter',sans-serif;white-space:nowrap">${label}</button>`;
  return `
    <div class="kpi-grid">
      ${kpi("Total clients",CLIENTS.length,TH.c1)}
      ${kpi("Actifs",CLIENTS.filter(c=>c.status==="actif").length,"#15803d")}
      ${kpi("À relancer",aRelancer.length,"#b45309")}
      ${kpi("CA total",fMoney(caTotal),TH.c1,true)}
    </div>

    ${sansSuivi.length?`<div class="alert-bar" style="background:#fffbeb;border-color:#fcd34d;margin-bottom:16px" onclick="setCliFiltre('tri','trans')"><span style="font-size:18px">🗒️</span><div><div style="font-weight:700;font-size:13px;color:#78350f">${sansSuivi.length} client(s) sans aucun suivi</div><div style="font-size:11px;color:#b45309">Ni devis, ni transmission enregistrée</div></div></div>`:""}

    <div class="section-card" style="background:${TH.card}">
      <div class="section-head">
        <div><div class="section-title" style="color:${TH.txt}">Clients</div><div class="section-sub" id="cli-cpt">${renderClientsCompteur()}</div></div>
        <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
          <div style="display:flex;border:1.5px solid #e2e8f0;border-radius:9px;overflow:hidden">
            <button onclick="setCliFiltre('vue','kanban')" style="padding:7px 12px;border:none;background:${cliVue==="kanban"?TH.c1:"#fff"};color:${cliVue==="kanban"?"#fff":"#64748b"};cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif">▦ Kanban</button>
            <button onclick="setCliFiltre('vue','liste')" style="padding:7px 12px;border:none;background:${cliVue==="liste"?TH.c1:"#fff"};color:${cliVue==="liste"?"#fff":"#64748b"};cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif">☰ Liste</button>
          </div>
          <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="modalClient()">＋ Nouveau client</button>
        </div>
      </div>

      <!-- Barre de recherche et filtres -->
      <div style="padding:14px 18px 4px;border-bottom:1px solid #f1f5f9">
        <div style="display:flex;gap:7px;margin-bottom:10px">
          <input id="cli-q" value="${(cliQ||"").replace(/"/g,'&quot;')}" placeholder="🔍 Nom, contact, téléphone, email, adresse…" oninput="setCliFiltre('q',this.value)" style="flex:1;padding:9px 13px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13px;outline:none;font-family:'Inter',sans-serif;min-width:0"/>
          <button onclick="resetCliFiltres()" title="Effacer la recherche et les filtres" style="padding:9px 12px;border-radius:9px;border:1.5px solid ${actifs?"#fecaca":"#e2e8f0"};background:${actifs?"#fef2f2":"#fff"};color:${actifs?"#991b1b":"#94a3b8"};cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif;white-space:nowrap">✕ Effacer</button>
        </div>
        <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:10px;align-items:center">
          <span style="font-size:11px;font-weight:700;color:#94a3b8;white-space:nowrap;text-transform:uppercase;letter-spacing:0.06em">Catégorie</span>
          ${["Particulier","Pro","VIP"].map(x=>chip(x,cliCat===x,`setCliFiltre('cat','${x}')`)).join("")}
          <span style="width:1px;height:20px;background:#e2e8f0;flex-shrink:0;margin:0 3px"></span>
          <span style="font-size:11px;font-weight:700;color:#94a3b8;white-space:nowrap;text-transform:uppercase;letter-spacing:0.06em">Statut</span>
          ${Object.entries(ST_CLI).map(([k,[,,lbl]])=>chip(lbl,cliStatut===k,`setCliFiltre('statut','${k}')`)).join("")}
        </div>
        <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:12px;align-items:center">
          <span style="font-size:11px;font-weight:700;color:#94a3b8;white-space:nowrap;text-transform:uppercase;letter-spacing:0.06em">Trier par</span>
          ${[["nom","Nom A→Z"],["ca","CA décroissant"],["date","Contact récent"],["trans","Suivi"]].map(([k,lbl])=>chip(lbl,cliTri===k,`setCliFiltre('tri','${k}')`)).join("")}
        </div>
      </div>

      <style>
        .cli-board{display:flex;gap:12px;overflow-x:auto;padding:14px;align-items:flex-start}
        .cli-col{background:${TH.bg};border-radius:11px;min-width:210px;flex:1;display:flex;flex-direction:column;border:1.5px solid ${TH.sand}}
        .cli-col-hd{padding:10px 12px 8px;border-bottom:1.5px solid ${TH.sand};font-size:11px;font-weight:700;display:flex;align-items:center;gap:7px;border-radius:11px 11px 0 0}
        .cli-col-hd .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
        .cli-col-cards{padding:8px;display:flex;flex-direction:column;gap:6px;min-height:50px}
        .cli-card{background:${TH.card};border:1.5px solid ${TH.sand};border-radius:9px;padding:10px;cursor:grab;transition:box-shadow 0.18s,transform 0.13s;position:relative}
        .cli-card:hover{box-shadow:0 4px 12px rgba(50,134,160,0.15);transform:translateY(-1px)}
        .cli-card.dragging{opacity:0.4;cursor:grabbing}
        .cli-card-name{font-size:13px;font-weight:700;color:${TH.c1};margin-bottom:2px;padding-right:48px;cursor:pointer;text-decoration:underline}
        .cli-card-contact{font-size:11px;color:${TH.txt}99;margin-bottom:5px}
        .cli-card-ca{font-size:12px;font-weight:700;color:${TH.txt};margin-bottom:4px}
        .cli-card-acts{position:absolute;top:7px;right:7px;display:flex;gap:3px;opacity:0;transition:opacity 0.15s}
        .cli-card:hover .cli-card-acts{opacity:1}
        .cli-card-btn{background:white;border:1px solid #ddd;border-radius:4px;width:22px;height:22px;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center}
        .cli-col-drop{background:rgba(50,134,160,0.07)!important;outline:2px dashed ${TH.c1}}
        .cli-col-empty{padding:14px;text-align:center;color:${TH.txt}44;font-size:11px;font-style:italic}
        @media (max-width:768px){ .cli-card-acts{opacity:1} }
      </style>
      <div id="cli-zone">${renderClientsZone()}</div>
    </div>`;
}

let cliDragId=null;
function cliOnDrop(e,statusKey){
  e.preventDefault();
  if(!cliDragId) return;
  CLIENTS=CLIENTS.map(c=>c.id===cliDragId?{...c,status:statusKey}:c);
  cliDragId=null;
  saveData();
  renderPage();renderNav();
}
// ── Drag tactile clients ──────────────────────────────────────
let cliTouchMoved=false;
function cliTouchStart(e,id){
  cliDragId=id;cliTouchMoved=false;
  const card=e.currentTarget;
  card._holdTimer=setTimeout(()=>{
    card.classList.add("dragging");cliTouchMoved=true;
    if(navigator.vibrate)navigator.vibrate(30);
  },180);
}
function cliTouchMove(e){
  if(!cliDragId||!cliTouchMoved)return;
  e.preventDefault();
  const t=e.touches[0];
  document.querySelectorAll(".cli-col-cards").forEach(c=>c.classList.remove("cli-col-drop"));
  const el=document.elementFromPoint(t.clientX,t.clientY);
  const col=el&&el.closest?el.closest(".cli-col-cards"):null;
  if(col)col.classList.add("cli-col-drop");
}
function cliTouchEnd(e){
  const card=e.currentTarget;
  if(card._holdTimer)clearTimeout(card._holdTimer);
  card.classList.remove("dragging");
  if(!cliDragId||!cliTouchMoved){cliDragId=null;return;}
  const t=e.changedTouches[0];
  const el=document.elementFromPoint(t.clientX,t.clientY);
  const col=el&&el.closest?el.closest(".cli-col-cards"):null;
  document.querySelectorAll(".cli-col-cards").forEach(c=>c.classList.remove("cli-col-drop"));
  if(col){
    const statusKey=col.getAttribute("data-status");
    if(statusKey){CLIENTS=CLIENTS.map(c=>c.id===cliDragId?{...c,status:statusKey}:c);saveData();}
  }
  cliDragId=null;cliTouchMoved=false;renderPage();renderNav();
}
// ── Menu "déplacer vers" clients ──────────────────────────────
function cliMoveMenu(id){
  const c=CLIENTS.find(x=>x.id===id);if(!c)return;
  showModal("Déplacer "+c.nom,
    `<div style="display:flex;flex-direction:column;gap:8px">
      ${Object.entries(ST_CLI).map(([k,[bg,col,lbl]])=>`<button onclick="cliMoveTo('${id}','${k}')" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;border:1.5px solid ${c.status===k?col:"#e2e8f0"};background:${c.status===k?col+"15":"#fff"};cursor:pointer;font-size:14px;font-weight:600;font-family:'Inter',sans-serif;text-align:left;width:100%">
        <span style="width:11px;height:11px;border-radius:50%;background:${col};flex-shrink:0"></span>
        <span style="flex:1">${lbl}</span>
        ${c.status===k?`<span style="font-size:12px;color:${col}">✓ Actuel</span>`:""}
      </button>`).join("")}
    </div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>`
  );
}
function cliMoveTo(id,statusKey){
  CLIENTS=CLIENTS.map(c=>c.id===id?{...c,status:statusKey}:c);
  saveData();closeModal();renderPage();renderNav();
}
function modalClient(id){
  const c=id?CLIENTS.find(x=>x.id===id):{id:"",nom:"",contact:"",tel:"",email:"",status:"actif",dernCmd:TODAY,ca:0,cat:"Particulier",adresse:"",formeJuridique:"",siret:"",representantQualite:"",nbCameras:""};
  showModal(id?"Modifier le client":"Nouveau client",`
    <div class="field-row">
      <div class="field"><label>Nom entreprise</label><input id="c-nom" value="${c.nom}"/></div>
      <div class="field"><label>Contact</label><input id="c-contact" value="${c.contact}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Téléphone</label><input id="c-tel" value="${c.tel}"/></div>
      <div class="field"><label>Email</label><input id="c-email" value="${c.email}"/></div>
    </div>
    <div class="field"><label>Adresse</label><input id="c-adresse" value="${(c.adresse||"").replace(/"/g,'&quot;')}" placeholder="12 rue Exemple, 75000 Paris"/></div>
    <div class="field-row">
      <div class="field"><label>Catégorie</label><select id="c-cat">${["Particulier","Pro","VIP"].map(x=>`<option${c.cat===x?" selected":""}>${x}</option>`).join("")}</select></div>
      <div class="field"><label>Statut</label><select id="c-status">${Object.entries(ST_CLI).map(([k,[,,l]])=>`<option value="${k}"${c.status===k?" selected":""}>${l}</option>`).join("")}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Dernière commande</label><input type="date" id="c-date" value="${c.dernCmd}"/></div>
      <div class="field"><label>CA total (€)</label><input type="number" step="any" id="c-ca" value="${c.ca}"/></div>
    </div>
    <div class="field"><label>Relance prévue</label><input type="date" id="c-relance" value="${c.dateRelance||""}"/>${c.relanceEnvoyee&&c.relanceEnvoyee===c.dateRelance?`<div style="font-size:11px;color:#15803d;margin-top:4px">✅ Relance automatique envoyée</div>`:""}</div>
    <hr style="border:none;border-top:1px solid #f1f5f9;margin:6px 0"/>
    <div class="section-sub" style="margin-bottom:4px">Pour le ${FV("contrat").toLowerCase()}</div>
    <div class="field-row">
      <div class="field"><label>Forme juridique</label><input id="c-forme" value="${(c.formeJuridique||"").replace(/"/g,'&quot;')}" placeholder="SAS, SARL… (laisser vide si particulier)"/></div>
      <div class="field"><label>SIRET</label><input id="c-siret" value="${(c.siret||"").replace(/"/g,'&quot;')}" placeholder="000 000 000 00000"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Qualité du représentant</label><input id="c-qualite" value="${(c.representantQualite||"").replace(/"/g,'&quot;')}" placeholder="Gérant, Directeur…"/></div>
      <div class="field"><label>Nombre de ${MP().unite[1]}</label><input type="number" min="0" id="c-nbcam" value="${c.nbCameras||""}" placeholder="Ex : 6"/></div>
    </div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="saveClient('${id||""}')">Enregistrer</button>`
  );
}
function saveClient(id){
  const obj={nom:document.getElementById("c-nom").value,contact:document.getElementById("c-contact").value,adresse:document.getElementById("c-adresse").value.trim(),tel:document.getElementById("c-tel").value,email:document.getElementById("c-email").value,cat:document.getElementById("c-cat").value,status:document.getElementById("c-status").value,dernCmd:document.getElementById("c-date").value,ca:Number(document.getElementById("c-ca").value),
    formeJuridique:document.getElementById("c-forme").value.trim(),siret:document.getElementById("c-siret").value.trim(),representantQualite:document.getElementById("c-qualite").value.trim(),nbCameras:document.getElementById("c-nbcam").value?Number(document.getElementById("c-nbcam").value):"",dateRelance:document.getElementById("c-relance").value||""};
  if(id){CLIENTS=CLIENTS.map(c=>c.id===id?{...c,...obj}:c);}else{CLIENTS.push({...obj,id:uid()});}
  closeModal();renderPage();renderNav();
}
function delClient(id){confirmDel("Supprimer ce client ?",function(){CLIENTS=CLIENTS.filter(c=>c.id!==id);renderPage();renderNav();});}
function clientSelectOptions(selectedId){
  return `<option value="">— Choisir —</option>`+CLIENTS.map(c=>`<option value="${c.id}"${selectedId===c.id?" selected":""}>${c.nom}</option>`).join("");
}
function quickAddClientOverlay(targetSelectId,prefix){
  const div=document.createElement("div");
  div.id="quick-client-overlay";
  div.className="modal-overlay";
  div.style.zIndex=9999;
  div.onclick=function(e){if(e.target===this)closeQuickClient();};
  div.innerHTML=`
    <div class="modal" style="max-width:420px">
      <div class="modal-head"><div class="modal-title">Nouveau client rapide</div><button class="modal-close" onclick="closeQuickClient()">✕</button></div>
      <div class="modal-body">
        <style>#quick-client-overlay .field input,#quick-client-overlay .field select{font-size:16px}</style>
        <div class="field"><label>Nom entreprise *</label><input id="qc-nom" placeholder="Nom du client"/></div>
        <div class="field-row">
          <div class="field"><label>Contact</label><input id="qc-contact"/></div>
          <div class="field"><label>Téléphone</label><input id="qc-tel"/></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Email</label><input id="qc-email"/></div>
          <div class="field"><label>Catégorie</label><select id="qc-cat">${["Particulier","Pro","VIP"].map(x=>`<option${x==="Particulier"?" selected":""}>${x}</option>`).join("")}</select></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" onclick="closeQuickClient()">Annuler</button>
        <button class="btn-save" style="background:${TH.c1}" onclick="saveQuickClient('${targetSelectId}','${prefix}')">Créer le client</button>
      </div>
    </div>`;
  document.body.appendChild(div);
  setTimeout(()=>{const el=document.getElementById("qc-nom");if(el)el.focus();},50);
}
function closeQuickClient(){
  const el=document.getElementById("quick-client-overlay");
  if(el)el.remove();
}
function saveQuickClient(targetSelectId,prefix){
  const nom=document.getElementById("qc-nom").value.trim();
  if(!nom){alert("Le nom du client est obligatoire");return;}
  const obj={id:uid(),nom,contact:document.getElementById("qc-contact").value,tel:document.getElementById("qc-tel").value,email:document.getElementById("qc-email").value,cat:document.getElementById("qc-cat").value,status:"actif",dernCmd:TODAY,ca:0,adresse:""};
  CLIENTS.push(obj);
  closeQuickClient();
  const sel=document.getElementById(targetSelectId);
  if(sel){
    sel.innerHTML=clientSelectOptions(obj.id);
    sel.value=obj.id;
    toggleChantierField(prefix);
  }
  renderNav();
}

// ════════════════════════════════════════════════════════
