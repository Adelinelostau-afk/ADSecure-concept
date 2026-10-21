// ── GÉNÉRATION FACTURE / DEVIS PDF (impression navigateur) ─
// ══════════════════════════════════════════════════════════
// HTML complet de la facture (impression ou conversion en PDF pour l'envoi par e-mail)
function factureDocHTML(f,impression){
  // Retrouver le client (par id en priorité, sinon par nom)
  const cli=CLIENTS.find(c=>c.id===f.clientId)||CLIENTS.find(c=>c.nom===f.client);
  const ht=facHT(f);
  const tva=facTVA(f);
  const ttc=facTTC(f);
  const tauxTva=facTauxTVA(f);
  const logoSrc=thLogo();
  const doc=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><base href="${location.href}"/>
  <title>${f.num}</title>
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
    .doc-title h1{font-size:28px;color:${TH.c1};letter-spacing:1px}
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
    .statut{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:11px;color:#94a3b8;text-align:center;line-height:1.8}
    .mentions{font-size:10px;color:#94a3b8;margin-top:8px;line-height:1.6}
    @media print{body{padding:30px 36px}}
  </style></head><body>
    <div class="head">
      <div class="logo-zone">
        ${logoSrc?`<img src="${logoSrc}" onerror="this.style.display='none'"/>`:""}
        <div><div class="brand-name">${TH.nom}</div><div class="brand-sub">${TH.sous}</div></div>
      </div>
      <div class="doc-title">
        <h1>FACTURE</h1>
        <div class="num">${f.num}</div>
        ${f.date?`<div class="num">Date : ${RelancesCore.dateLongue(f.date)}</div>`:""}
        <div class="num">Échéance : ${f.ech?RelancesCore.dateLongue(f.ech):"—"}</div>
        ${f.refChantier?`<div class="num" style="font-weight:700;color:${TH.c1}">Réf. chantier : ${f.refChantier.replace(/</g,"&lt;")}</div>`:""}
      </div>
    </div>
    <div class="parties">
      <div class="partie">
        <div class="lbl">Émetteur</div>
        <div class="nom">${TH.nom} ${TH.sous}</div>
        <div class="det">${TH.adresse?TH.adresse+"<br/>":""}${TH.email?TH.email+"<br/>":""}${TH.tel||""}</div>
      </div>
      <div class="partie" style="text-align:right">
        <div class="lbl">Facturé à</div>
        <div class="nom">${f.client}</div>
        <div class="det">${cli&&cli.adresse?cli.adresse.replace(/</g,"&lt;")+"<br/>":""}${cli?(cli.contact||""):""}${cli&&cli.email?"<br/>"+cli.email:""}${cli&&cli.tel?"<br/>"+cli.tel:""}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Désignation</th><th style="text-align:center">Qté</th><th style="text-align:right">P.U. HT</th><th style="text-align:right">Total HT</th></tr></thead>
      <tbody>
        ${(f.lignes&&f.lignes.length)
          ?f.lignes.map(l=>`<tr><td>${l.ref?`<span style="font-size:8.5px;font-weight:700;color:#94a3b8;letter-spacing:.04em">${(l.ref||"").replace(/</g,"&lt;")}</span><br/>`:""}${(l.desc||"").replace(/</g,"&lt;")}${(l.det||"").trim()?`<div style="font-size:9px;color:#64748b;line-height:1.35;margin-top:2px;white-space:pre-line">${(l.det||"").replace(/</g,"&lt;")}</div>`:""}</td><td style="text-align:center">${l.qte}${l.unite?`<div style="font-size:8.5px;color:#94a3b8">${(l.unite||"").replace(/</g,"&lt;")}</div>`:""}</td><td style="text-align:right">${fMoney(l.pu)}</td><td style="text-align:right">${fMoney((l.qte||0)*(l.pu||0))}</td></tr>`).join("")
          :`<tr><td>Prestation / Fourniture — ${f.num}</td><td style="text-align:center">1</td><td style="text-align:right">${fMoney(ht)}</td><td style="text-align:right">${fMoney(ht)}</td></tr>`}
      </tbody>
    </table>
    <div class="totaux">
      <table>
        <tr><td>Total HT</td><td style="text-align:right">${fMoney(ht)}</td></tr>
        <tr><td>TVA ${fTaux(tauxTva)}</td><td style="text-align:right">${fMoney(tva)}</td></tr>
        <tr class="ttc"><td>TOTAL TTC</td><td style="text-align:right">${fMoney(ttc)}</td></tr>
      </table>
    </div>
    ${(f.paiements&&f.paiements.length)?`
    <div style="margin-bottom:24px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:8px">Historique des paiements</div>
      <table style="margin-bottom:0">
        <thead><tr><th>Date</th><th>Mode</th><th style="text-align:right">Montant</th></tr></thead>
        <tbody>
          ${f.paiements.map(p=>`<tr><td>${fDate(p.date)}</td><td>${p.mode||"—"}</td><td style="text-align:right">${fMoney(p.montant)}</td></tr>`).join("")}
        </tbody>
      </table>
      <div style="text-align:right;font-size:13px;margin-top:8px;color:#64748b">
        Restant dû : <strong style="color:#3286A0">${fMoney(facReste(f))}</strong>
      </div>
    </div>`:""}
    <div class="footer">
      Merci de votre confiance.<br/>
      <div class="mentions">${TH.nom} ${TH.sous}${TH.siret?" · SIRET : "+TH.siret:""}${TH.tvaIntra?" · TVA : "+TH.tvaIntra:""}<br/>${TH.mentionsLegales||"Paiement à réception · En cas de retard, pénalités au taux légal en vigueur."}<br/>Document généré le ${fDate(TODAY)}</div>
    </div>
    ${impression?`<script>window.onload=()=>{setTimeout(()=>window.print(),400);}<\/script>`:""}
  </body></html>`;
  return doc;
}
function genererFacturePDF(id){
  const f=FACTURES.find(x=>x.id===id);
  if(!f){alert("Facture introuvable");return;}
  const cli=CLIENTS.find(c=>c.id===f.clientId)||CLIENTS.find(c=>c.nom===f.client);
  const doc=factureDocHTML(f,true);
  const w=window.open("","_blank");
  if(!w){alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF.");return;}
  w.document.write(doc);
  w.document.close();
  logActivity("Génération facture",`PDF généré : ${f.num}`);
  logDocument("facture",f.id,f.num,f.client||(cli?cli.nom:""),facTTC(f));
}



// ════════════════════════════════════════════════════════
// ── PIPELINE PROSPECTS ──────────────────────────────────
// ════════════════════════════════════════════════════════
function pipeFilter(list){
  const q=pipeSearch.toLowerCase().trim();
  if(!q) return list;
  return list.filter(p=>[p.name,p.company,p.email,p.notes].join(" ").toLowerCase().includes(q));
}
function pipeStats(){
  const active=PROSPECTS.filter(p=>p.stage!=="perdu"&&p.stage!=="gagne");
  const won=PROSPECTS.filter(p=>p.stage==="gagne");
  const pipeline=active.reduce((s,p)=>s+p.amount,0);
  const wonAmt=won.reduce((s,p)=>s+p.amount,0);
  const total=PROSPECTS.filter(p=>p.stage==="gagne"||p.stage==="perdu").length;
  const txConv=total>0?Math.round(won.length/total*100):0;
  const urgent=PROSPECTS.filter(p=>p.date&&p.date<=TODAY&&p.stage!=="gagne"&&p.stage!=="perdu").length;
  return{active,won,pipeline,wonAmt,txConv,urgent,total:PROSPECTS.length};
}
function renderPipeline(){
  const st=pipeStats();
  const th=TH;
  return`
  <style>
    .pipe-board{display:flex;gap:13px;overflow-x:auto;align-items:flex-start;padding-bottom:12px}
    .pipe-col{background:${th.card};border-radius:12px;min-width:220px;width:220px;display:flex;flex-direction:column;box-shadow:0 1px 4px rgba(0,0,0,0.07);max-height:calc(100vh - 260px)}
    .pipe-col-hd{padding:11px 13px 9px;border-bottom:1px solid ${th.bg};border-radius:12px 12px 0 0;background:inherit;position:sticky;top:0;z-index:1}
    .pipe-col-title{font-size:12px;font-weight:700;display:flex;align-items:center;gap:7px}
    .pipe-col-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
    .pipe-col-count{background:${th.bg};color:${th.txt};border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700}
    .pipe-col-total{font-size:10px;color:${th.txt}66;padding:3px 13px 7px;font-style:italic}
    .pipe-cards{padding:9px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:7px;min-height:60px}
    .pipe-card{background:${th.bg};border:1.5px solid ${th.sand};border-radius:9px;padding:11px;cursor:grab;transition:box-shadow 0.18s,transform 0.14s;position:relative}
    .pipe-card:hover{box-shadow:0 5px 14px rgba(50,134,160,0.18);transform:translateY(-1px)}
    .pipe-card.dragging{opacity:0.45;cursor:grabbing}
    .pipe-card-name{font-size:12px;font-weight:700;color:${th.txt};margin-bottom:3px;padding-right:50px}
    .pipe-card-co{font-size:10px;color:${th.txt}77;margin-bottom:7px;font-style:italic}
    .pipe-card-amt{font-size:14px;font-weight:700;color:${th.c1};margin-bottom:5px}
    .pipe-card-meta{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:5px}
    .pipe-tag{font-size:9px;padding:2px 6px;border-radius:20px;font-weight:700;text-transform:uppercase}
    .pipe-tag-chaud{background:#fdecea;color:#c0392b}
    .pipe-tag-tiede{background:#fef5e7;color:#e67e22}
    .pipe-tag-froid{background:#e8f4f8;color:#3286A0}
    .pipe-card-date{font-size:9px;color:${th.txt}66;display:flex;align-items:center;gap:3px}
    .pipe-card-acts{position:absolute;top:7px;right:7px;display:flex;gap:3px;opacity:0;transition:opacity 0.18s}
    .pipe-card:hover .pipe-card-acts{opacity:1}
    .pipe-card-btn{background:white;border:1px solid #ddd;border-radius:4px;width:22px;height:22px;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center}
    .pipe-card-btn:hover{background:${th.bg}}
    .pipe-card-btn.del:hover{background:#fdecea;border-color:#c0392b}
    .pipe-drop-over{background:rgba(50,134,160,0.08)!important;outline:2px dashed ${th.c1}}
    .pipe-add-btn{margin:7px 9px 9px;padding:7px;border:1.5px dashed ${th.sand};border-radius:7px;background:none;color:${th.txt}55;font-size:11px;cursor:pointer;width:calc(100% - 18px);font-family:'${th.police}',Georgia,serif;transition:all 0.2s;text-align:center}
    .pipe-add-btn:hover{border-color:${th.c1};color:${th.c1};background:rgba(50,134,160,0.05)}
    .pipe-empty{padding:14px;text-align:center;color:${th.txt}44;font-size:11px;font-style:italic}
    .pipe-search{padding:8px 13px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;font-family:'${th.police}',Georgia,serif;width:200px;background:${th.bg};color:${th.txt};outline:none}
    .pipe-search:focus{border-color:${th.c1}}
  </style>
  <div class="kpi-grid" style="margin-bottom:18px">
    ${kpi("Prospects actifs",st.active.length,th.c1)}
    ${kpi("Pipeline",fMoney(st.pipeline),th.c2,true)}
    ${kpi("CA gagné",fMoney(st.wonAmt),"#27ae60",true)}
    ${kpi("Taux de conv.",st.txConv+"%","#e67e22")}
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap">
    <input class="pipe-search" placeholder="🔍 Rechercher un prospect..." value="${pipeSearch}" oninput="pipeSearch=this.value;renderPage()">
    <div style="display:flex;gap:8px;align-items:center">
      ${st.urgent>0?`<span style="background:#fef2f2;border:1.5px solid #fca5a5;color:#991b1b;font-size:12px;font-weight:700;padding:6px 12px;border-radius:8px">🔔 ${st.urgent} relance${st.urgent>1?"s":""} urgente${st.urgent>1?"s":""}</span>`:""}
      <button class="btn-add" style="background:${th.c1};color:#fff" onclick="modalProspect()">＋ Nouveau prospect</button>
    </div>
  </div>
  <div class="pipe-board">
    ${PIPE_STAGES.map(stage=>{
      const filtered=pipeFilter(PROSPECTS.filter(p=>p.stage===stage.id));
      const total=filtered.reduce((s,p)=>s+p.amount,0);
      return`<div class="pipe-col">
        <div class="pipe-col-hd">
          <div class="pipe-col-title">
            <span class="pipe-col-dot" style="background:${stage.color}"></span>
            ${stage.label}
            <span class="pipe-col-count">${filtered.length}</span>
          </div>
        </div>
        ${total>0?`<div class="pipe-col-total">${fMoney(total)}</div>`:""}
        <div class="pipe-cards" data-stage="${stage.id}"
          ondragover="event.preventDefault();this.classList.add('pipe-drop-over')"
          ondragleave="this.classList.remove('pipe-drop-over')"
          ondrop="pipeOnDrop(event,'${stage.id}');this.classList.remove('pipe-drop-over')">
          ${filtered.length===0?`<div class="pipe-empty">Glisser ici</div>`:""}
          ${filtered.map(p=>{
            const isUrg=p.date&&p.date<=TODAY&&p.stage!=="gagne"&&p.stage!=="perdu";
            return`<div class="pipe-card" draggable="true" data-pid="${p.id}"
              ondragstart="pipeDragId='${p.id}';this.classList.add('dragging')"
              ondragend="this.classList.remove('dragging')"
              ontouchstart="pipeTouchStart(event,'${p.id}')"
              ontouchmove="pipeTouchMove(event)"
              ontouchend="pipeTouchEnd(event)"
              onclick="pipeDetail('${p.id}')">
              <div class="pipe-card-acts">
                <button class="pipe-card-btn" onclick="pipeMoveMenu('${p.id}');event.stopPropagation()" title="Déplacer">↔️</button>
                <button class="pipe-card-btn" onclick="modalProspect('${p.id}');event.stopPropagation()">✏️</button>
                <button class="pipe-card-btn del" onclick="delProspect('${p.id}');event.stopPropagation()">🗑️</button>
              </div>
              <div class="pipe-card-name">${p.name}</div>
              ${p.company?`<div class="pipe-card-co">${p.company}</div>`:""}
              <div class="pipe-card-amt">${p.amount?fMoney(p.amount):"—"}</div>
              <div class="pipe-card-meta"><span class="pipe-tag pipe-tag-${p.temp}">${{chaud:"🔴 Chaud",tiede:"🟡 Tiède",froid:"🔵 Froid"}[p.temp]}</span></div>
              ${p.date?`<div class="pipe-card-date" style="${isUrg?"color:#c0392b;font-weight:700":""}">${isUrg?"🔔":"📅"} ${fDate(p.date)}</div>`:""}
            </div>`;
          }).join("")}
        </div>
        <button class="pipe-add-btn" onclick="modalProspect(null,'${stage.id}')">＋ Ajouter</button>
      </div>`;
    }).join("")}
  </div>`;
}
function pipeOnDrop(e,stageId){
  e.preventDefault();
  if(!pipeDragId) return;
  PROSPECTS=PROSPECTS.map(p=>p.id===pipeDragId?{...p,stage:stageId}:p);
  pipeDragId=null;saveData();renderPage();
}

// ── Drag tactile (iPad / mobile) ──────────────────────────────
let pipeTouchMoved=false;
function pipeTouchStart(e,id){
  pipeDragId=id;
  pipeTouchMoved=false;
  const card=e.currentTarget;
  card._holdTimer=setTimeout(()=>{
    card.classList.add("dragging");
    pipeTouchMoved=true; // active le mode déplacement après appui long
    if(navigator.vibrate)navigator.vibrate(30);
  },180);
}
function pipeTouchMove(e){
  if(!pipeDragId)return;
  if(!pipeTouchMoved)return; // pas encore en mode drag → laisser le scroll
  e.preventDefault();
  const t=e.touches[0];
  document.querySelectorAll(".pipe-cards").forEach(c=>c.classList.remove("pipe-drop-over"));
  const el=document.elementFromPoint(t.clientX,t.clientY);
  const col=el&&el.closest?el.closest(".pipe-cards"):null;
  if(col)col.classList.add("pipe-drop-over");
}
function pipeTouchEnd(e){
  const card=e.currentTarget;
  if(card._holdTimer)clearTimeout(card._holdTimer);
  card.classList.remove("dragging");
  if(!pipeDragId||!pipeTouchMoved){pipeDragId=null;return;}
  const t=e.changedTouches[0];
  const el=document.elementFromPoint(t.clientX,t.clientY);
  const col=el&&el.closest?el.closest(".pipe-cards"):null;
  document.querySelectorAll(".pipe-cards").forEach(c=>c.classList.remove("pipe-drop-over"));
  if(col){
    const stageId=col.getAttribute("data-stage");
    if(stageId){PROSPECTS=PROSPECTS.map(p=>p.id===pipeDragId?{...p,stage:stageId}:p);saveData();}
  }
  pipeDragId=null;pipeTouchMoved=false;renderPage();
}

// ── Menu "déplacer vers" (alternative simple au glisser) ──────
function pipeMoveMenu(id){
  const p=PROSPECTS.find(x=>x.id===id);if(!p)return;
  showModal("Déplacer "+p.name,
    `<div style="display:flex;flex-direction:column;gap:8px">
      ${PIPE_STAGES.map(s=>`<button onclick="pipeMoveTo('${id}','${s.id}')" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;border:1.5px solid ${p.stage===s.id?s.color:"#e2e8f0"};background:${p.stage===s.id?s.color+"15":"#fff"};cursor:pointer;font-size:14px;font-weight:600;font-family:'Inter',sans-serif;text-align:left;width:100%">
        <span style="width:11px;height:11px;border-radius:50%;background:${s.color};flex-shrink:0"></span>
        <span style="flex:1">${s.label}</span>
        ${p.stage===s.id?`<span style="font-size:12px;color:${s.color}">✓ Actuel</span>`:""}
      </button>`).join("")}
    </div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>`
  );
}
function pipeMoveTo(id,stageId){
  PROSPECTS=PROSPECTS.map(p=>p.id===id?{...p,stage:stageId}:p);
  saveData();closeModal();renderPage();
}
function pipeDetail(id){
  const p=PROSPECTS.find(x=>x.id===id);if(!p)return;
  const st=PIPE_STAGES.find(s=>s.id===p.stage);
  showModal(p.name,`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Entreprise</div><div style="font-size:14px;color:${TH.txt}">${p.company||"—"}</div></div>
      <div><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Montant</div><div style="font-size:20px;font-weight:700;color:${TH.c1}">${p.amount?fMoney(p.amount):"—"}</div></div>
      <div><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Email</div><div style="font-size:13px">${p.email?`<a href="mailto:${p.email}" style="color:${TH.c1}">${p.email}</a>`:"—"}</div></div>
      <div><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Téléphone</div><div style="font-size:13px">${p.phone?`<a href="tel:${p.phone}" style="color:${TH.c1}">${p.phone}</a>`:"—"}</div></div>
      <div><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Étape</div><div style="display:flex;align-items:center;gap:7px"><span style="width:9px;height:9px;border-radius:50%;background:${st?.color};display:inline-block"></span><span style="font-size:13px">${st?.label}</span></div></div>
      <div><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Température</div><span class="pipe-tag pipe-tag-${p.temp}">${{chaud:"🔴 Chaud",tiede:"🟡 Tiède",froid:"🔵 Froid"}[p.temp]}</span></div>
      ${p.date?`<div><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Relance</div><div style="font-size:13px">📅 ${fDate(p.date)}</div></div>`:""}
    </div>
    ${p.notes?`<div style="padding-top:14px;border-top:1px solid #f1f5f9"><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">Notes</div><div style="font-size:13px;color:${TH.txt};white-space:pre-wrap;line-height:1.6">${p.notes}</div></div>`:""}`,
    `<button class="btn-cancel" onclick="closeModal()">Fermer</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="closeModal();modalProspect('${id}')">✏️ Modifier</button>`
  );
}
function modalProspect(id,defaultStage){
  const p=id?PROSPECTS.find(x=>x.id===id):{id:"",name:"",company:"",email:"",phone:"",amount:0,temp:"tiede",stage:defaultStage||"contact",date:"",notes:""};
  showModal(id?"Modifier le prospect":"Nouveau prospect",`
    <div class="field-row">
      <div class="field"><label>Prénom Nom *</label><input id="pp-name" value="${p.name}" placeholder="Marie Dupont"/></div>
      <div class="field"><label>Entreprise</label><input id="pp-co" value="${p.company}" placeholder="Société..."/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Email</label><input type="email" id="pp-email" value="${p.email}"/></div>
      <div class="field"><label>Téléphone</label><input type="tel" id="pp-phone" value="${p.phone}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Montant estimé (€)</label><input type="number" step="any" id="pp-amt" value="${p.amount||""}" placeholder="0"/></div>
      <div class="field"><label>Température</label><select id="pp-temp">
        <option value="chaud"${p.temp==="chaud"?" selected":""}>🔴 Chaud</option>
        <option value="tiede"${p.temp==="tiede"?" selected":""}>🟡 Tiède</option>
        <option value="froid"${p.temp==="froid"?" selected":""}>🔵 Froid</option>
      </select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Étape</label><select id="pp-stage">${PIPE_STAGES.map(s=>`<option value="${s.id}"${p.stage===s.id?" selected":""}>${s.label}</option>`).join("")}</select></div>
      <div class="field"><label>Relance prévue</label><input type="date" id="pp-date" value="${p.date||""}"/></div>
    </div>
    <div class="field"><label>Notes</label><textarea id="pp-notes" style="min-height:72px">${p.notes}</textarea></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="saveProspect('${id||""}')">Enregistrer</button>`
  );
}
function saveProspect(id){
  const name=document.getElementById("pp-name").value.trim();
  if(!name){alert("Le nom est obligatoire.");return;}
  const obj={name,company:document.getElementById("pp-co").value.trim(),email:document.getElementById("pp-email").value.trim(),phone:document.getElementById("pp-phone").value.trim(),amount:parseFloat(document.getElementById("pp-amt").value)||0,temp:document.getElementById("pp-temp").value,stage:document.getElementById("pp-stage").value,date:document.getElementById("pp-date").value,notes:document.getElementById("pp-notes").value.trim()};
  if(id){PROSPECTS=PROSPECTS.map(p=>p.id===id?{...p,...obj}:p);}else{PROSPECTS.push({...obj,id:"p"+pipeNextId++});}
  closeModal();renderPage();
}
function delProspect(id){confirmDel("Supprimer ce prospect ?",function(){PROSPECTS=PROSPECTS.filter(p=>p.id!==id);renderPage();});}

// ══════════════════════════════════════════════════════════
