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
function pipeEsc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
const PIPE_TEMPS={chaud:"🔴 Chaud",tiede:"🟡 Tiède",froid:"🔵 Froid"};
const PIPE_ORIGINES=["Site internet","Bouche-à-oreille","Facebook / Instagram","Google","Appel entrant","Salon / événement","Client existant","Partenaire / apporteur","Autre"];
const PIPE_MOTIFS=["Trop cher","Concurrent choisi","Projet abandonné ou reporté","Plus de nouvelles","Hors zone / hors périmètre","Autre"];
const PIPE_HISTO_TYPES={appel:"📞 Appel",message:"💬 Message",email:"✉️ E-mail",visite:"🏠 Visite",note:"📝 Note",devis:"📄 Devis",etape:"➡️ Étape",site:"🌐 Site"};
const PIPE_ARCHIVE_JOURS=30;
let pipeVoirAnciens=false;
function pipeFilter(list){
  const q=pipeSearch.toLowerCase().trim();
  if(!q) return list;
  return list.filter(p=>[p.name,p.company,p.email,p.phone,p.notes,p.origine].join(" ").toLowerCase().includes(q));
}
function pipeEstOuvert(p){return p.stage!=="perdu"&&p.stage!=="gagne";}
// Gagné / perdu depuis plus de 30 jours : rangé (consultable avec « Anciens »)
function pipeEstArchive(p){return !pipeEstOuvert(p)&&!!p.etapeLe&&p.etapeLe<addDays(getToday(),-PIPE_ARCHIVE_JOURS);}
function pipeRelancesDues(){return PROSPECTS.filter(p=>p.date&&p.date<=getToday()&&pipeEstOuvert(p)).sort((a,b)=>a.date.localeCompare(b.date));}
function pipeStats(){
  const active=PROSPECTS.filter(pipeEstOuvert);
  const won=PROSPECTS.filter(p=>p.stage==="gagne");
  const lost=PROSPECTS.filter(p=>p.stage==="perdu");
  const pipeline=active.reduce((s,p)=>s+(Number(p.amount)||0),0);
  const wonAmt=won.reduce((s,p)=>s+(Number(p.amount)||0),0);
  const total=won.length+lost.length; // prospects dont l'issue est connue
  const txConv=total>0?Math.round(won.length/total*100):0;
  const urgent=pipeRelancesDues().length;
  return{active,won,lost,pipeline,wonAmt,txConv,urgent,total:PROSPECTS.length};
}
// Historique daté d'un prospect
function pipeHisto(p,type,texte){
  if(!p) return;
  p.historique=Array.isArray(p.historique)?p.historique:[];
  p.historique.push({id:uid(),date:getToday(),type,texte:String(texte||"").slice(0,2000),par:(currentUser&&currentUser.nom)||""});
}
function pipeTrouver(id){return PROSPECTS.find(x=>x.id===id);}

// Téléphone → lien d'appel / WhatsApp (Martinique 0696/0697/0596 → +596, sinon 0X → +33)
function pipeTelInt(t){
  let d=String(t||"").replace(/[^\d+]/g,"");
  if(!d) return "";
  if(d.startsWith("+")) return d.slice(1);
  if(d.startsWith("00")) return d.slice(2);
  if(d.length===10&&d[0]==="0") return (/^0(69[0-9]|59[0-9]|97[0-9])/.test(d)?"596":"33")+d.slice(1);
  return d;
}
function pipeLiensContact(p,grand){
  const tel=String(p.phone||"").trim();
  if(!tel) return "";
  const wa=pipeTelInt(tel);
  const st=grand?"padding:9px 14px;font-size:13px;border-radius:9px":"padding:4px 9px;font-size:11px;border-radius:7px";
  return `<a href="tel:${pipeEsc(tel.replace(/\s/g,""))}" onclick="event.stopPropagation()" ontouchstart="event.stopPropagation()" style="${st};border:1.5px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;text-decoration:none;font-weight:700;display:inline-flex;align-items:center;gap:4px">📞 Appeler</a>
    ${wa?`<a href="https://wa.me/${wa}" target="_blank" rel="noopener" onclick="event.stopPropagation()" ontouchstart="event.stopPropagation()" style="${st};border:1.5px solid #bbf7d0;background:#f0fdf4;color:#15803d;text-decoration:none;font-weight:700;display:inline-flex;align-items:center;gap:4px">💬 WhatsApp</a>`:""}`;
}

function renderPipeline(){
  const st=pipeStats();
  const th=TH;
  const nbAnciens=PROSPECTS.filter(pipeEstArchive).length;
  return`
  <style>
    .pipe-board{display:flex;gap:13px;overflow-x:auto;align-items:flex-start;padding-bottom:12px;-webkit-overflow-scrolling:touch}
    .pipe-col{background:${th.card};border-radius:12px;min-width:220px;width:220px;display:flex;flex-direction:column;box-shadow:0 1px 4px rgba(0,0,0,0.07);max-height:calc(100vh - 260px)}
    .pipe-col-hd{padding:11px 13px 9px;border-bottom:1px solid ${th.bg};border-radius:12px 12px 0 0;background:inherit;position:sticky;top:0;z-index:1}
    .pipe-col-title{font-size:12px;font-weight:700;display:flex;align-items:center;gap:7px}
    .pipe-col-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
    .pipe-col-count{background:${th.bg};color:${th.txt};border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700}
    .pipe-col-total{font-size:10px;color:${th.txt}66;padding:3px 13px 7px;font-style:italic}
    .pipe-cards{padding:9px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:7px;min-height:60px}
    .pipe-card{background:${th.bg};border:1.5px solid ${th.sand};border-radius:9px;padding:11px;cursor:grab;transition:box-shadow 0.18s,transform 0.14s;position:relative;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
    .pipe-card:hover{box-shadow:0 5px 14px rgba(50,134,160,0.18);transform:translateY(-1px)}
    .pipe-card.dragging{opacity:0.45;cursor:grabbing}
    .pipe-card-name{font-size:12px;font-weight:700;color:${th.txt};margin-bottom:3px;padding-right:76px}
    .pipe-card-co{font-size:10px;color:${th.txt}77;margin-bottom:7px;font-style:italic}
    .pipe-card-amt{font-size:14px;font-weight:700;color:${th.c1};margin-bottom:5px}
    .pipe-card-meta{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:5px}
    .pipe-card-contact{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
    .pipe-tag{font-size:9px;padding:2px 6px;border-radius:20px;font-weight:700;text-transform:uppercase}
    .pipe-tag-chaud{background:#fdecea;color:#c0392b}
    .pipe-tag-tiede{background:#fef5e7;color:#e67e22}
    .pipe-tag-froid{background:#e8f4f8;color:#3286A0}
    .pipe-tag-client{background:#dcfce7;color:#15803d}
    .pipe-tag-site{background:#ede9fe;color:#6d28d9}
    .pipe-card-date{font-size:9px;color:${th.txt}66;display:flex;align-items:center;gap:3px}
    .pipe-card-acts{position:absolute;top:7px;right:7px;display:flex;gap:3px;opacity:0;transition:opacity 0.18s}
    .pipe-card:hover .pipe-card-acts{opacity:1}
    .pipe-card-btn{background:white;border:1px solid #ddd;border-radius:4px;width:22px;height:22px;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center}
    .pipe-card-btn:hover{background:${th.bg}}
    .pipe-card-btn.del:hover{background:#fdecea;border-color:#c0392b}
    @media (hover:none){
      .pipe-card-acts{opacity:1}
      .pipe-card-btn{width:30px;height:30px;font-size:13px}
      .pipe-card-name{padding-right:100px}
    }
    .pipe-drop-over{background:rgba(50,134,160,0.08)!important;outline:2px dashed ${th.c1}}
    .pipe-add-btn{margin:7px 9px 9px;padding:7px;border:1.5px dashed ${th.sand};border-radius:7px;background:none;color:${th.txt}55;font-size:11px;cursor:pointer;width:calc(100% - 18px);font-family:'${th.police}',Georgia,serif;transition:all 0.2s;text-align:center}
    .pipe-add-btn:hover{border-color:${th.c1};color:${th.c1};background:rgba(50,134,160,0.05)}
    .pipe-empty{padding:14px;text-align:center;color:${th.txt}44;font-size:11px;font-style:italic}
    .pipe-search{padding:8px 13px;border:1.5px solid #ddd;border-radius:8px;font-size:16px;font-family:'${th.police}',Georgia,serif;width:220px;background:${th.bg};color:${th.txt};outline:none}
    .pipe-search:focus{border-color:${th.c1}}
    .pipe-histo{border-left:2px solid #e2e8f0;margin-left:6px;padding-left:12px}
    .pipe-histo-it{position:relative;padding:0 0 10px}
    .pipe-histo-it:before{content:"";position:absolute;left:-17px;top:4px;width:8px;height:8px;border-radius:50%;background:${th.c1}}
    .pipe-ana{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:18px}
  </style>
  <div class="kpi-grid" style="margin-bottom:18px">
    ${kpi("Prospects en cours",st.active.length,th.c1)}
    ${kpi("Montant en cours",fMoney(st.pipeline),th.c2,true)}
    ${kpi("Montant gagné",fMoney(st.wonAmt),"#27ae60",true)}
    ${kpi("Taux de transformation",st.total&&(st.won.length+st.lost.length)?st.txConv+"%":"—","#e67e22")}
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap">
    <input class="pipe-search" type="search" placeholder="🔍 Rechercher un prospect..." value="${pipeEsc(pipeSearch)}" oninput="pipeSearch=this.value;pipeMajTableau()">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      ${st.urgent>0?`<button onclick="pipeVoirRelances()" style="background:#fef2f2;border:1.5px solid #fca5a5;color:#991b1b;font-size:12px;font-weight:700;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit">🔔 ${st.urgent} relance${st.urgent>1?"s":""} à faire</button>`:""}
      ${nbAnciens?`<button onclick="pipeVoirAnciens=!pipeVoirAnciens;renderPage()" style="background:${pipeVoirAnciens?th.c1+"15":"#fff"};border:1.5px solid ${pipeVoirAnciens?th.c1:"#e2e8f0"};color:${pipeVoirAnciens?th.c1:"#64748b"};font-size:12px;font-weight:700;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit">🗄️ ${pipeVoirAnciens?"Masquer les anciens":"Anciens ("+nbAnciens+")"}</button>`:""}
      <button class="btn-add" style="background:${th.c1};color:#fff" onclick="modalProspect()">＋ Nouveau prospect</button>
    </div>
  </div>
  <div id="pipe-tableau">${pipeTableauHTML()}</div>
  ${pipeAnalyseHTML()}`;
}
// Le tableau seul : redessiné pendant la recherche sans toucher au champ (le clavier de l'iPad reste ouvert)
function pipeTableauHTML(){
  return`<div class="pipe-board">
    ${PIPE_STAGES.map(stage=>{
      const filtered=pipeFilter(PROSPECTS.filter(p=>p.stage===stage.id&&(pipeVoirAnciens||!pipeEstArchive(p))));
      const total=filtered.reduce((s,p)=>s+(Number(p.amount)||0),0);
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
          ${filtered.length===0?`<div class="pipe-empty">${pipeSearch.trim()?"Aucun résultat":"Glisser ici"}</div>`:""}
          ${filtered.map(p=>{
            const isUrg=p.date&&p.date<=getToday()&&pipeEstOuvert(p);
            return`<div class="pipe-card" draggable="true" data-pid="${pipeEsc(p.id)}"
              ondragstart="pipeDragId='${pipeEsc(p.id)}';this.classList.add('dragging')"
              ondragend="this.classList.remove('dragging')"
              ontouchstart="pipeTouchStart(event,'${pipeEsc(p.id)}')"
              ontouchmove="pipeTouchMove(event)"
              ontouchend="pipeTouchEnd(event)"
              ontouchcancel="pipeTouchEnd(event)"
              onclick="pipeDetail('${pipeEsc(p.id)}')">
              <div class="pipe-card-acts">
                <button class="pipe-card-btn" onclick="pipeMoveMenu('${pipeEsc(p.id)}');event.stopPropagation()" ontouchstart="event.stopPropagation()" title="Changer d'étape" aria-label="Changer d'étape">↔️</button>
                <button class="pipe-card-btn" onclick="modalProspect('${pipeEsc(p.id)}');event.stopPropagation()" ontouchstart="event.stopPropagation()" title="Modifier" aria-label="Modifier">✏️</button>
                <button class="pipe-card-btn del" onclick="delProspect('${pipeEsc(p.id)}');event.stopPropagation()" ontouchstart="event.stopPropagation()" title="Supprimer" aria-label="Supprimer">🗑️</button>
              </div>
              <div class="pipe-card-name">${pipeEsc(p.name)}</div>
              ${p.company?`<div class="pipe-card-co">${pipeEsc(p.company)}</div>`:""}
              <div class="pipe-card-amt">${p.amount?fMoney(p.amount):"—"}</div>
              <div class="pipe-card-meta">${PIPE_TEMPS[p.temp]?`<span class="pipe-tag pipe-tag-${p.temp}">${PIPE_TEMPS[p.temp]}</span>`:""}${p.demandeId&&pipeEstOuvert(p)&&!(p.historique||[]).some(h=>h.type!=="site")?`<span class="pipe-tag pipe-tag-site">🌐 Nouveau</span>`:""}${p.clientId&&CLIENTS.some(c=>c.id===p.clientId)?`<span class="pipe-tag pipe-tag-client">👤 Client</span>`:""}</div>
              ${p.date&&pipeEstOuvert(p)?`<div class="pipe-card-date" style="${isUrg?"color:#c0392b;font-weight:700":""}">${isUrg?"🔔":"📅"} ${fDate(p.date)}</div>`:""}
              ${pipeEstOuvert(p)&&p.phone?`<div class="pipe-card-contact">${pipeLiensContact(p)}</div>`:""}
            </div>`;
          }).join("")}
        </div>
        <button class="pipe-add-btn" onclick="modalProspect(null,'${stage.id}')">＋ Ajouter</button>
      </div>`;
    }).join("")}
  </div>`;
}
// Origine des prospects et motifs de perte
function pipeAnalyseHTML(){
  if(!PROSPECTS.length) return "";
  const parOrig={};
  PROSPECTS.forEach(p=>{const o=p.origine||"Non renseignée";const r=parOrig[o]||(parOrig[o]={n:0,g:0,ca:0});r.n++;if(p.stage==="gagne"){r.g++;r.ca+=Number(p.amount)||0;}});
  const orig=Object.entries(parOrig).sort((a,b)=>b[1].ca-a[1].ca||b[1].n-a[1].n);
  const perdus=PROSPECTS.filter(p=>p.stage==="perdu");
  const parMotif={};perdus.forEach(p=>{const m=p.motifPerte||"Non renseigné";parMotif[m]=(parMotif[m]||0)+1;});
  const mot=Object.entries(parMotif).sort((a,b)=>b[1]-a[1]);
  const ligne=(g,d)=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px"><span>${g}</span><span style="text-align:right;color:#475569">${d}</span></div>`;
  return `<div class="pipe-ana">
    <div class="section-card" style="background:${TH.card}"><div class="section-head"><div><div class="section-title">🧭 D'où viennent vos prospects</div><div class="section-sub">Prospects, gagnés et montant gagné par origine</div></div></div>
      <div style="padding:4px 18px 12px">${orig.map(([o,r])=>ligne(pipeEsc(o),`${r.n} prospect${r.n>1?"s":""} · <b style="color:#15803d">${r.g} gagné${r.g>1?"s":""}</b>${r.ca?" · "+fMoney(r.ca):""}`)).join("")}</div></div>
    <div class="section-card" style="background:${TH.card}"><div class="section-head"><div><div class="section-title">📉 Pourquoi des prospects sont perdus</div><div class="section-sub">${perdus.length} prospect${perdus.length>1?"s":""} perdu${perdus.length>1?"s":""}</div></div></div>
      <div style="padding:4px 18px 12px">${mot.length?mot.map(([m,n])=>ligne(pipeEsc(m),`${n} (${Math.round(n/perdus.length*100)} %)`)).join(""):`<div style="padding:14px 0;color:#94a3b8;font-size:13px">Aucun prospect perdu.</div>`}</div></div>
  </div>`;
}
function pipeMajTableau(){
  const el=document.getElementById("pipe-tableau");
  if(el) el.innerHTML=pipeTableauHTML(); else renderPage();
}
function pipeVoirRelances(){
  const L=pipeRelancesDues();
  if(!L.length) return;
  showModal("🔔 Relances à faire",`<div style="display:flex;flex-direction:column;gap:8px">${L.map(p=>`
    <button onclick="closeModal();pipeDetail('${pipeEsc(p.id)}')" style="display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px 14px;border-radius:10px;border:1.5px solid #fecaca;background:#fff;cursor:pointer;text-align:left;font-family:inherit">
      <span><b style="font-size:14px">${pipeEsc(p.name)}</b>${p.company?`<br/><span style="font-size:12px;color:#64748b">${pipeEsc(p.company)}</span>`:""}</span>
      <span style="font-size:12px;color:${p.date<getToday()?"#991b1b":"#b45309"};font-weight:700;white-space:nowrap">${p.date<getToday()?"En retard · ":""}${fDate(p.date)}</span>
    </button>`).join("")}</div>`,`<button class="btn-cancel" onclick="closeModal()">Fermer</button>`);
}

// ── Relance prospect ↔ agenda : un événement « Prospection » suit la date de relance ──
function pipeSyncRelanceEvent(p){
  const evId="pr-"+(p&&p.id);
  const ex=EVENTS.find(e=>e.id===evId);
  if(!p||!p.date||!pipeEstOuvert(p)||!PROSPECTS.includes(p)){
    if(ex) EVENTS=EVENTS.filter(e=>e.id!==evId);
    return;
  }
  const obj={id:evId,type:"prospection",titre:"Relance : "+p.name+(p.company?" ("+p.company+")":""),
    client:p.company||p.name,clientId:p.clientId||"",adresse:ex?ex.adresse:"",date:p.date,
    heure:ex?ex.heure:"09:00",fin:ex?ex.fin:"09:30",assignes:ex?ex.assignes:(currentUser&&currentUser.id?[currentUser.id]:[]),
    notes:"Prospect"+(p.phone?" · "+p.phone:"")+(p.email?" · "+p.email:""),prospectId:p.id};
  if(ex) EVENTS=EVENTS.map(e=>e.id===evId?{...e,...obj}:e); else EVENTS.push(obj);
}
// Au chargement : les relances déjà prévues (avant cette version) apparaissent aussi dans l'agenda
function pipeSyncToutesRelances(){
  let modif=false;
  PROSPECTS.forEach(p=>{
    const has=EVENTS.some(e=>e.id==="pr-"+p.id);
    const doit=!!p.date&&pipeEstOuvert(p);
    if(has!==doit){pipeSyncRelanceEvent(p);modif=true;}
  });
  if(modif) saveData();
}
// Appelé par l'agenda quand l'événement de relance est déplacé ou supprimé
function pipeDepuisAgenda(ev,supprime){
  if(!ev||!ev.prospectId) return;
  const p=pipeTrouver(ev.prospectId); if(!p) return;
  p.date=supprime?"":(ev.date||p.date);
}

// Changement d'étape (glisser, appui long, menu ou formulaire) : un seul endroit
function pipeChangerEtape(id,stageId){
  const avant=pipeTrouver(id);
  if(!avant||!PIPE_STAGES.some(s=>s.id===stageId)) return;
  if(avant.stage===stageId) return;
  const st=PIPE_STAGES.find(s=>s.id===stageId);
  PROSPECTS=PROSPECTS.map(p=>p.id===id?{...p,stage:stageId,etapeLe:getToday()}:p);
  const p=pipeTrouver(id);
  pipeHisto(p,"etape",st.label);
  pipeSyncRelanceEvent(p);
  saveData();renderPage();
  if(stageId==="gagne") setTimeout(()=>pipeProposerClient(id),120);
  else if(stageId==="perdu") setTimeout(()=>pipeDemanderMotif(id),120);
}
function pipeDemanderMotif(id){
  const p=pipeTrouver(id); if(!p||p.stage!=="perdu") return;
  showModal("Pourquoi « "+pipeEsc(p.name)+" » est perdu ?",`<div style="display:flex;flex-direction:column;gap:8px">
    ${PIPE_MOTIFS.map(m=>`<button onclick="pipeSetMotif('${pipeEsc(id)}','${pipeEsc(m)}')" style="padding:12px 14px;border-radius:10px;border:1.5px solid ${p.motifPerte===m?"#c0392b":"#e2e8f0"};background:${p.motifPerte===m?"#fdecea":"#fff"};cursor:pointer;font-size:14px;font-weight:600;text-align:left;font-family:inherit">${pipeEsc(m)}</button>`).join("")}
  </div>`,`<button class="btn-cancel" onclick="closeModal()">Passer</button>`);
}
function pipeSetMotif(id,m){
  const p=pipeTrouver(id); if(!p) return;
  p.motifPerte=m; pipeHisto(p,"note","Motif de perte : "+m);
  closeModal(); saveData(); renderPage();
}
function pipeOnDrop(e,stageId){
  e.preventDefault();
  if(!pipeDragId) return;
  const id=pipeDragId; pipeDragId=null;
  pipeChangerEtape(id,stageId);
}

// ── Drag tactile (iPad / mobile) : appui long pour déplacer, sinon défilement normal ──
let pipeTouchMoved=false, pipeTouchX=0, pipeTouchY=0, pipeIgnorerClic=0;
function pipeTouchStart(e,id){
  pipeDragId=id;
  pipeTouchMoved=false;
  const t=e.touches[0]; pipeTouchX=t.clientX; pipeTouchY=t.clientY;
  const card=e.currentTarget;
  clearTimeout(card._holdTimer);
  card._holdTimer=setTimeout(()=>{
    if(pipeDragId!==id) return;
    card.classList.add("dragging");
    pipeTouchMoved=true; // mode déplacement après appui long
    if(navigator.vibrate)navigator.vibrate(30);
  },300);
}
function pipeTouchMove(e){
  if(!pipeDragId)return;
  const t=e.touches[0];
  if(!pipeTouchMoved){
    // Le doigt bouge avant l'appui long : c'est un défilement, on annule le déplacement
    if(Math.abs(t.clientX-pipeTouchX)>10||Math.abs(t.clientY-pipeTouchY)>10){
      clearTimeout(e.currentTarget._holdTimer); pipeDragId=null;
    }
    return;
  }
  e.preventDefault();
  document.querySelectorAll(".pipe-cards").forEach(c=>c.classList.remove("pipe-drop-over"));
  const el=document.elementFromPoint(t.clientX,t.clientY);
  const col=el&&el.closest?el.closest(".pipe-cards"):null;
  if(col)col.classList.add("pipe-drop-over");
}
function pipeTouchEnd(e){
  const card=e.currentTarget;
  if(card._holdTimer)clearTimeout(card._holdTimer);
  card.classList.remove("dragging");
  document.querySelectorAll(".pipe-cards").forEach(c=>c.classList.remove("pipe-drop-over"));
  if(!pipeDragId||!pipeTouchMoved){pipeDragId=null;pipeTouchMoved=false;return;}
  const id=pipeDragId; pipeDragId=null; pipeTouchMoved=false;
  pipeIgnorerClic=Date.now(); // le relâchement ne doit pas ouvrir la fiche
  const t=e.changedTouches[0];
  const el=t?document.elementFromPoint(t.clientX,t.clientY):null;
  const col=el&&el.closest?el.closest(".pipe-cards"):null;
  const stageId=col&&col.getAttribute("data-stage");
  if(stageId) pipeChangerEtape(id,stageId); else renderPage();
}

// ── Menu "déplacer vers" (alternative simple au glisser) ──────
function pipeMoveMenu(id){
  const p=pipeTrouver(id);if(!p)return;
  showModal("Déplacer "+pipeEsc(p.name),
    `<div style="display:flex;flex-direction:column;gap:8px">
      ${PIPE_STAGES.map(s=>`<button onclick="pipeMoveTo('${pipeEsc(id)}','${s.id}')" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;border:1.5px solid ${p.stage===s.id?s.color:"#e2e8f0"};background:${p.stage===s.id?s.color+"15":"#fff"};cursor:pointer;font-size:14px;font-weight:600;font-family:inherit;text-align:left">
        <span style="width:11px;height:11px;border-radius:50%;background:${s.color};flex-shrink:0"></span>
        <span style="flex:1">${s.label}</span>
        ${p.stage===s.id?`<span style="font-size:12px;color:${s.color}">✓ Actuel</span>`:""}
      </button>`).join("")}
    </div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>`
  );
}
function pipeMoveTo(id,stageId){
  closeModal();
  pipeChangerEtape(id,stageId);
}

// ── Prospect → fiche client ──
function pipeClientDe(p){ return p&&p.clientId?CLIENTS.find(c=>c.id===p.clientId):null; }
function pipeProposerClient(id){
  const p=pipeTrouver(id);
  if(!p||p.stage!=="gagne"||pipeClientDe(p)) return;
  if(confirm(`🎉 ${p.name} est gagné !\n\nCréer sa fiche client maintenant, avec ses coordonnées ? Vous pourrez ensuite lui faire un devis ou une facture.`)) pipeCreerClient(id);
}
// Crée (si besoin) la fiche client du prospect et renvoie son id
function pipeAssurerClient(id){
  const p=pipeTrouver(id); if(!p) return null;
  const existant=pipeClientDe(p); if(existant) return existant.id;
  const cid=uid();
  CLIENTS.push({id:cid,nom:p.company||p.name,contact:p.company?p.name:"",adresse:"",tel:p.phone||"",email:p.email||"",
    cat:p.company?"Pro":"Particulier",status:"actif",dernCmd:"",ca:0,dateRelance:"",
    notes:p.notes||"",prospectId:p.id});
  p.clientId=cid;
  pipeSyncRelanceEvent(p);
  logActivity("Prospect → client",p.company||p.name);
  return cid;
}
function pipeCreerClient(id){
  const p=pipeTrouver(id); if(!p) return;
  const cid=pipeAssurerClient(id);
  closeModal(); saveData(); renderNav(); openClientFiche(cid);
}
// ── Devis depuis un prospect : fiche client créée au besoin, devis lié au prospect ──
function pipeFaireDevis(id){
  const p=pipeTrouver(id); if(!p) return;
  const cid=pipeAssurerClient(id);
  saveData(); closeModal();
  const avant=selectedClientId;
  selectedClientId=cid; window._devisProspectNext=id;
  try{ modalDevis(null); } finally{ selectedClientId=avant; }
}
// Après l'enregistrement d'un devis lié : montant estimé = montant HT du devis, étape « Proposition »
function pipeApresDevis(d,nouveau){
  if(!d||!d.prospectId) return;
  const p=pipeTrouver(d.prospectId); if(!p) return;
  p.amount=Math.round(devisHT(d)*100)/100;
  if(nouveau) pipeHisto(p,"devis",`Devis ${d.num} : ${fMoney(devisHT(d))} HT`);
  if(["contact","qualif"].includes(p.stage)){ p.stage="proposition"; p.etapeLe=getToday(); pipeHisto(p,"etape","Proposition"); }
  pipeSyncRelanceEvent(p);
}
function pipeRelanceFaite(id){
  const p=pipeTrouver(id); if(!p) return;
  pipeHisto(p,"appel","Relance faite"+(p.date?" (prévue le "+fDate(p.date)+")":""));
  p.date="";
  pipeSyncRelanceEvent(p);
  saveData(); closeModal(); modalProspect(id,null,true);
}
function pipeAjouterHisto(id){
  const p=pipeTrouver(id); if(!p) return;
  const t=(document.getElementById("ph-texte")?.value||"").trim();
  if(!t){document.getElementById("ph-texte")?.focus();return;}
  pipeHisto(p,document.getElementById("ph-type")?.value||"note",t);
  saveData(); pipeDetail(id);
}
function pipeSupprHisto(id,hid){
  const p=pipeTrouver(id); if(!p||!confirm("Supprimer cette ligne de l'historique ?")) return;
  p.historique=(p.historique||[]).filter(h=>h.id!==hid);
  saveData(); pipeDetail(id);
}
function pipeDetail(id){
  if(Date.now()-pipeIgnorerClic<600) return;
  const p=pipeTrouver(id);if(!p)return;
  const st=PIPE_STAGES.find(s=>s.id===p.stage);
  const cli=pipeClientDe(p);
  const devisLies=DEVIS.filter(d=>d.prospectId===p.id);
  const histo=[...(p.historique||[])].reverse();
  const lbl=t=>`<div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">${t}</div>`;
  showModal(pipeEsc(p.name),`
    ${p.phone?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${pipeLiensContact(p,true)}</div>`:""}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div>${lbl("Entreprise")}<div style="font-size:14px;color:${TH.txt}">${pipeEsc(p.company)||"—"}</div></div>
      <div>${lbl("Montant estimé")}<div style="font-size:20px;font-weight:700;color:${TH.c1}">${p.amount?fMoney(p.amount):"—"}</div></div>
      <div>${lbl("Email")}<div style="font-size:13px;word-break:break-all">${p.email?`<a href="mailto:${pipeEsc(p.email)}" style="color:${TH.c1}">${pipeEsc(p.email)}</a>`:"—"}</div></div>
      <div>${lbl("Téléphone")}<div style="font-size:13px">${p.phone?`<a href="tel:${pipeEsc(p.phone.replace(/\s/g,""))}" style="color:${TH.c1}">${pipeEsc(p.phone)}</a>`:"—"}</div></div>
      <div>${lbl("Étape")}<div style="display:flex;align-items:center;gap:7px"><span style="width:9px;height:9px;border-radius:50%;background:${st?.color};display:inline-block"></span><span style="font-size:13px">${st?.label||"—"}</span></div></div>
      <div>${lbl("Température")}${PIPE_TEMPS[p.temp]?`<span class="pipe-tag pipe-tag-${p.temp}">${PIPE_TEMPS[p.temp]}</span>`:"—"}</div>
      <div>${lbl("Origine")}<div style="font-size:13px">${pipeEsc(p.origine)||"—"}</div></div>
      ${p.stage==="perdu"?`<div>${lbl("Motif de perte")}<div style="font-size:13px">${p.motifPerte?pipeEsc(p.motifPerte):`<a href="#" onclick="event.preventDefault();pipeDemanderMotif('${pipeEsc(id)}')" style="color:${TH.c1}">Indiquer</a>`}</div></div>`:""}
      ${p.date&&pipeEstOuvert(p)?`<div>${lbl("Relance")}<div style="font-size:13px;${p.date<=getToday()?"color:#991b1b;font-weight:700":""}">${p.date<=getToday()?"🔔":"📅"} ${fDate(p.date)}</div></div>`:""}
      ${p.creeLe?`<div>${lbl("Ajouté le")}<div style="font-size:13px">${fDate(p.creeLe)}</div></div>`:""}
    </div>
    ${p.notes?`<div style="padding-top:14px;border-top:1px solid #f1f5f9;margin-bottom:14px">${lbl("Notes")}<div style="font-size:13px;color:${TH.txt};white-space:pre-wrap;line-height:1.6">${pipeEsc(p.notes)}</div></div>`:""}
    ${devisLies.length?`<div style="padding-top:14px;border-top:1px solid #f1f5f9;margin-bottom:14px">${lbl("Devis")}${devisLies.map(d=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0"><span>📄 ${pipeEsc(d.num)} · ${pipeEsc(d.statut)}</span><b>${fMoney(devisHT(d))} HT</b></div>`).join("")}</div>`:""}
    <div style="padding-top:14px;border-top:1px solid #f1f5f9">
      ${lbl("Historique des échanges")}
      <div style="display:flex;gap:6px;margin:6px 0 12px;flex-wrap:wrap">
        <select id="ph-type" style="padding:8px;border-radius:8px;border:1.5px solid #e2e8f0;font-size:14px;font-family:inherit">${["appel","message","email","visite","note"].map(k=>`<option value="${k}">${PIPE_HISTO_TYPES[k]}</option>`).join("")}</select>
        <input id="ph-texte" placeholder="Ex. : rappelé, veut 4 caméras" style="flex:1;min-width:150px;padding:8px 10px;border-radius:8px;border:1.5px solid #e2e8f0;font-size:16px;font-family:inherit" onkeydown="if(event.key==='Enter')pipeAjouterHisto('${pipeEsc(id)}')"/>
        <button onclick="pipeAjouterHisto('${pipeEsc(id)}')" style="padding:8px 14px;border-radius:8px;border:none;background:${TH.c1};color:#fff;font-weight:700;cursor:pointer;font-family:inherit">Ajouter</button>
      </div>
      ${histo.length?`<div class="pipe-histo">${histo.map(h=>`<div class="pipe-histo-it">
        <div style="font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;gap:8px"><span>${fDate(h.date)} · ${PIPE_HISTO_TYPES[h.type]||"📝"}${h.par?" · "+pipeEsc(h.par):""}</span><a href="#" onclick="event.preventDefault();pipeSupprHisto('${pipeEsc(id)}','${pipeEsc(h.id)}')" style="color:#cbd5e1;text-decoration:none" title="Supprimer">✕</a></div>
        <div style="font-size:13px;color:${TH.txt};white-space:pre-wrap;line-height:1.5">${pipeEsc(h.texte)}</div></div>`).join("")}</div>`:`<div style="font-size:12.5px;color:#94a3b8">Aucun échange noté pour l'instant.</div>`}
    </div>
    ${cli?`<div class="info-box" style="margin-top:14px">👤 Fiche client : <b>${pipeEsc(cli.nom)}</b></div>`:""}`,
    `<button class="btn-cancel" onclick="closeModal()">Fermer</button>
     ${p.date&&pipeEstOuvert(p)?`<button class="btn-sm" onclick="pipeRelanceFaite('${pipeEsc(id)}')">✅ Relance faite</button>`:""}
     ${cli?`<button class="btn-sm" onclick="closeModal();openClientFiche('${pipeEsc(cli.id)}')">👤 Fiche client</button>`
       :p.stage==="gagne"?`<button class="btn-save" style="background:#15803d" onclick="pipeCreerClient('${pipeEsc(id)}')">👤 Créer la fiche client</button>`:""}
     ${p.stage!=="perdu"?`<button class="btn-save" style="background:${TH.c2}" onclick="pipeFaireDevis('${pipeEsc(id)}')">📝 Faire un devis</button>`:""}
     <button class="btn-save" style="background:${TH.c1}" onclick="closeModal();modalProspect('${pipeEsc(id)}')">✏️ Modifier</button>`
  );
}
function modalProspect(id,defaultStage,focusRelance){
  const p=id?pipeTrouver(id):{id:"",name:"",company:"",email:"",phone:"",amount:0,temp:"tiede",stage:defaultStage||"contact",date:"",notes:"",origine:"",motifPerte:""};
  if(!p) return;
  const opt=(liste,val)=>`<option value="">—</option>`+liste.map(o=>`<option${val===o?" selected":""}>${pipeEsc(o)}</option>`).join("")+(val&&!liste.includes(val)?`<option selected>${pipeEsc(val)}</option>`:"");
  showModal(id?"Modifier le prospect":"Nouveau prospect",`
    <div class="field-row">
      <div class="field"><label>Prénom Nom *</label><input id="pp-name" value="${pipeEsc(p.name)}" placeholder="Marie Dupont"/></div>
      <div class="field"><label>Entreprise</label><input id="pp-co" value="${pipeEsc(p.company)}" placeholder="Société..."/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Email</label><input type="email" id="pp-email" value="${pipeEsc(p.email)}"/></div>
      <div class="field"><label>Téléphone</label><input type="tel" id="pp-phone" value="${pipeEsc(p.phone)}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Montant estimé (€ HT)</label><input type="number" step="any" min="0" id="pp-amt" value="${p.amount||""}" placeholder="0"/></div>
      <div class="field"><label>Température</label><select id="pp-temp">
        ${Object.entries(PIPE_TEMPS).map(([k,l])=>`<option value="${k}"${p.temp===k?" selected":""}>${l}</option>`).join("")}
      </select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Étape</label><select id="pp-stage" onchange="document.getElementById('pp-motif-w').style.display=this.value==='perdu'?'block':'none'">${PIPE_STAGES.map(s=>`<option value="${s.id}"${p.stage===s.id?" selected":""}>${s.label}</option>`).join("")}</select></div>
      <div class="field"><label>Relance prévue</label><input type="date" id="pp-date" value="${pipeEsc(p.date)}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Origine</label><select id="pp-orig">${opt(PIPE_ORIGINES,p.origine||"")}</select></div>
      <div class="field" id="pp-motif-w" style="display:${p.stage==="perdu"?"block":"none"}"><label>Motif de perte</label><select id="pp-motif">${opt(PIPE_MOTIFS,p.motifPerte||"")}</select></div>
    </div>
    <div class="field"><label>Notes</label><textarea id="pp-notes" style="min-height:72px">${pipeEsc(p.notes)}</textarea></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="saveProspect('${pipeEsc(id||"")}')">Enregistrer</button>`
  );
  if(focusRelance) setTimeout(()=>{const d=document.getElementById("pp-date");if(d){d.scrollIntoView({block:"center"});d.focus();}},80);
}
function saveProspect(id){
  const name=document.getElementById("pp-name").value.trim();
  if(!name){alert("Le nom est obligatoire.");return;}
  const g=k=>document.getElementById(k);
  const obj={name,company:g("pp-co").value.trim(),email:g("pp-email").value.trim(),phone:g("pp-phone").value.trim(),
    amount:Math.max(0,parseFloat(String(g("pp-amt").value).replace(",","."))||0),temp:g("pp-temp").value,stage:g("pp-stage").value,
    date:g("pp-date").value,notes:g("pp-notes").value.trim(),origine:g("pp-orig").value};
  obj.motifPerte=obj.stage==="perdu"?g("pp-motif").value:"";
  const avant=id?pipeTrouver(id):null;
  let pid=id;
  if(avant){
    if(avant.stage!==obj.stage) obj.etapeLe=getToday();
    PROSPECTS=PROSPECTS.map(p=>p.id===id?{...p,...obj}:p);
    const p=pipeTrouver(id);
    if(avant.stage!==obj.stage) pipeHisto(p,"etape",(PIPE_STAGES.find(s=>s.id===obj.stage)||{}).label||obj.stage);
  }else{
    pid="p"+uid(); // identifiant unique (l'ancien compteur pouvait reprendre un numéro déjà utilisé)
    PROSPECTS.push({...obj,id:pid,creeLe:getToday(),etapeLe:getToday(),historique:[]});
  }
  pipeSyncRelanceEvent(pipeTrouver(pid));
  closeModal();saveData();renderPage();
  if(obj.stage==="gagne"&&(!avant||avant.stage!=="gagne")) setTimeout(()=>pipeProposerClient(pid),120);
  else if(obj.stage==="perdu"&&!obj.motifPerte&&(!avant||avant.stage!=="perdu")) setTimeout(()=>pipeDemanderMotif(pid),120);
}
function delProspect(id){confirmDel("Supprimer ce prospect ?",function(){
  PROSPECTS=PROSPECTS.filter(p=>p.id!==id);
  EVENTS=EVENTS.filter(e=>e.id!=="pr-"+id);
  saveData();renderPage();
});}

// ── Demandes du formulaire de contact du site → prospects « Contact initial » ──
// Lecture seule de la table demandes_contact ; les demandes déjà importées sont notées dans TH.demandesImportees
let demandesSyncTs=0, demandesSyncEnCours=false;
async function syncDemandesContact(force){
  if(!currentUser||!currentUser.tenant_id||demandesSyncEnCours||!CLOUD_OK) return;
  if(!force&&Date.now()-demandesSyncTs<60000) return;
  demandesSyncEnCours=true; demandesSyncTs=Date.now();
  try{
    const depuis=new Date(Date.now()-90*864e5).toISOString();
    const {data,error}=await sbClient.from("demandes_contact").select("id,created_at,prenom,nom,email,tel,type_client,message").gte("created_at",depuis).order("created_at",{ascending:true}).limit(200);
    if(error||!data||!data.length) return;
    const vues=new Set([...(TH.demandesImportees||[]),...PROSPECTS.map(p=>p.demandeId).filter(Boolean)]);
    const nouvelles=data.filter(r=>!vues.has(r.id));
    if(!nouvelles.length) return;
    nouvelles.forEach(r=>{
      const nom=[r.prenom,r.nom].filter(Boolean).join(" ").trim()||r.email||"Demande du site";
      const pro=/commerce|entreprise|copropri|collectivit/i.test(r.type_client||"");
      const jour=String(r.created_at||"").slice(0,10)||getToday();
      PROSPECTS.push({id:"p"+uid(),name:nom,company:"",email:r.email||"",phone:r.tel||"",amount:0,temp:"chaud",stage:"contact",
        date:getToday(),notes:"",origine:"Site internet",motifPerte:"",creeLe:jour,etapeLe:jour,demandeId:r.id,typeClient:r.type_client||"",
        historique:[{id:uid(),date:jour,type:"site",texte:"Demande depuis le site"+(r.type_client?" ("+r.type_client.toLowerCase()+")":"")+" :\n"+(r.message||""),par:""}]});
      pipeSyncRelanceEvent(PROSPECTS[PROSPECTS.length-1]);
      vues.add(r.id);
    });
    TH.demandesImportees=[...vues].slice(-500);
    logActivity("Demandes du site",nouvelles.length+" nouvelle(s) demande(s) ajoutée(s) au pipeline");
    saveData();
    if(!saisieEnCours()&&["pipeline","db","plan"].includes(currentPage)) renderPage();
    renderNav();
    pipeAvis(`🌐 ${nouvelles.length>1?nouvelles.length+" nouvelles demandes":"Nouvelle demande"} du site ajoutée${nouvelles.length>1?"s":""} au pipeline`);
  }catch(e){}finally{demandesSyncEnCours=false;}
}
// Petit message qui disparaît tout seul (ne bloque pas la saisie)
function pipeAvis(t){
  const d=document.createElement("div");
  d.textContent=t;
  d.style.cssText="position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10000;background:#1A2118;color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.25);cursor:pointer;max-width:90vw";
  d.onclick=()=>{d.remove();goTo("pipeline");};
  document.body.appendChild(d);
  setTimeout(()=>d.remove(),7000);
}
setInterval(()=>{if(document.visibilityState==="visible")syncDemandesContact();},120000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")syncDemandesContact();});
window.pipeCreerClient=pipeCreerClient; window.pipeMajTableau=pipeMajTableau;

// ══════════════════════════════════════════════════════════
