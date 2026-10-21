// ── DASHBOARD ────────────────────────────────────────────
// ════════════════════════════════════════════════════════
// ── Transmissions : widget du tableau de bord ─────────────────────────────
function renderTransTypeChips(){
  return Object.entries(TYPES_TRANS).map(([k,v])=>{
    const on=_transType===k;
    return `<button type="button" onclick="_transType='${k}';document.getElementById('trans-types').innerHTML=renderTransTypeChips()" style="padding:5px 11px;border-radius:999px;border:1.5px solid ${on?v.col:"#e2e8f0"};background:${on?v.bg:"#fff"};color:${on?v.col:"#64748b"};cursor:pointer;font-size:11.5px;font-weight:700;font-family:'Inter',sans-serif;white-space:nowrap">${v.icon} ${v.label}</button>`;
  }).join("");
}
function transLigne(t,montrerClient){
  const ty=TYPES_TRANS[t.type]||TYPES_TRANS.note;
  const cli=CLIENTS.find(c=>c.id===t.clientId);
  return `<div style="padding:11px 14px;border-left:3px solid ${t.important?"#991b1b":ty.col};background:${t.important?"#fef2f2":"#fff"};border-radius:0 9px 9px 0;margin-bottom:7px;border:1.5px solid #f1f5f9;border-left-width:3px">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;flex-wrap:nowrap">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;flex:1">
        <span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:5px;background:${ty.bg};color:${ty.col};white-space:nowrap">${ty.icon} ${ty.label}</span>
        ${(montrerClient&&cli)?`<span onclick="openClientFiche('${cli.id}')" style="font-size:11.5px;font-weight:700;color:${TH.c1};cursor:pointer;text-decoration:underline;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cli.nom}</span>`:""}
        <span style="font-size:10.5px;color:#94a3b8;white-space:nowrap">${fDateHeure(t.date)}</span>
      </div>
      <div style="display:flex;gap:3px;flex-shrink:0">
        <button onclick="toggleTransImportant('${t.id}')" title="Marquer important" style="border:none;background:none;cursor:pointer;font-size:13px;line-height:1;padding:2px;opacity:${t.important?1:0.3}">🚩</button>
        <button onclick="delTransmission('${t.id}')" title="Supprimer" style="border:none;background:none;cursor:pointer;font-size:12px;line-height:1;padding:2px;opacity:0.4">🗑️</button>
      </div>
    </div>
    <div style="font-size:13px;color:${TH.txt};line-height:1.45;white-space:pre-line">${(t.texte||"").replace(/</g,"&lt;")}</div>
  </div>`;
}
function renderTransListe(){
  let list=[...TRANSMISSIONS].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  if(_transFiltre==="jour") list=list.filter(t=>(t.date||"").slice(0,10)===getToday());
  else if(_transFiltre==="important") list=list.filter(t=>t.important);
  list=list.slice(0,25);
  if(list.length===0) return `<div style="padding:22px;text-align:center;color:#94a3b8;font-size:12.5px">Aucune transmission${_transFiltre==="jour"?" aujourd'hui":_transFiltre==="important"?" marquée importante":""}.</div>`;
  return list.map(t=>transLigne(t,true)).join("");
}
function setTransFiltre(f){
  _transFiltre=f;
  const l=document.getElementById("trans-liste"); if(l) l.innerHTML=renderTransListe();
  const c=document.getElementById("trans-filtres"); if(c) c.innerHTML=renderTransFiltres();
  planifierMasonry();
}
function renderTransFiltres(){
  return [["jour","Aujourd'hui"],["tous","Toutes"],["important","🚩 Importantes"]].map(([k,lbl])=>{
    const on=_transFiltre===k;
    return `<button type="button" onclick="setTransFiltre('${k}')" style="padding:5px 11px;border-radius:999px;border:1.5px solid ${on?TH.c1:"#e2e8f0"};background:${on?TH.c1:"#fff"};color:${on?"#fff":"#64748b"};cursor:pointer;font-size:11.5px;font-weight:600;font-family:'Inter',sans-serif;white-space:nowrap">${lbl}</button>`;
  }).join("");
}
function submitTransmission(){
  const ta=document.getElementById("trans-input");
  const sel=document.getElementById("trans-client");
  const imp=document.getElementById("trans-imp");
  if(!ta||!ta.value.trim()){ ta&&ta.focus(); return; }
  addTransmission(ta.value,sel?sel.value:"",_transType,imp?imp.checked:false);
  ta.value="";
  if(imp) imp.checked=false;
  const l=document.getElementById("trans-liste"); if(l) l.innerHTML=renderTransListe();
  const cpt=document.getElementById("trans-cpt"); if(cpt) cpt.textContent=`${transDuJour().length} aujourd'hui · ${TRANSMISSIONS.length} au total`;
  ta.focus();
  planifierMasonry();
}
// Raccourci : Ctrl/Cmd + Entrée pour enregistrer
function transKey(e){ if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){ e.preventDefault(); submitTransmission(); } }
function renderTransWidget(){
  return `
    <div class="section-card" style="margin-bottom:18px;background:${TH.card}">
      <div class="section-head">
        <div>
          <div class="section-title" style="color:${TH.txt}">🗒️ Transmissions</div>
          <div class="section-sub" id="trans-cpt">${transDuJour().length} aujourd'hui · ${TRANSMISSIONS.length} au total</div>
        </div>
      </div>
      <div style="padding:14px 18px">
        <div id="trans-types" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:9px;margin-bottom:9px">${renderTransTypeChips()}</div>
        <textarea id="trans-input" onkeydown="transKey(event)" placeholder="Ex : ${pE(MP().ex.trans)}" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13.5px;font-family:'Inter',sans-serif;outline:none;min-height:84px;resize:vertical;margin-bottom:8px"></textarea>
        <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
          <select id="trans-client" style="flex:1;min-width:150px;padding:8px 11px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:12.5px;background:#fff;font-family:'Inter',sans-serif">
            <option value="">— Sans client lié —</option>
            ${CLIENTS.map(c=>`<option value="${c.id}">${c.nom}</option>`).join("")}
          </select>
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:#64748b;font-weight:600;cursor:pointer;white-space:nowrap"><input type="checkbox" id="trans-imp" style="width:15px;height:15px;cursor:pointer"/> 🚩 Important</label>
          <button onclick="submitTransmission()" style="padding:9px 16px;border-radius:9px;border:none;background:${TH.c1};color:#fff;cursor:pointer;font-size:12.5px;font-weight:700;font-family:'Inter',sans-serif;white-space:nowrap">Enregistrer</button>
        </div>
        <div id="trans-filtres" style="display:flex;gap:6px;margin:14px 0 9px;flex-wrap:wrap">${renderTransFiltres()}</div>
        <div id="trans-liste" style="max-height:340px;overflow-y:auto">${renderTransListe()}</div>
      </div>
    </div>`;
}
// ── Transmissions : section de la fiche client ────────────────────────────
function submitTransClient(clientId){
  const ta=document.getElementById("trans-cli-input");
  if(!ta||!ta.value.trim()){ ta&&ta.focus(); return; }
  const imp=document.getElementById("trans-cli-imp");
  addTransmission(ta.value,clientId,_transType,imp?imp.checked:false);
  ta.value="";
  if(imp) imp.checked=false;
  const l=document.getElementById("trans-cli-liste"); if(l) l.innerHTML=renderTransClientListe(clientId);
  const sub=document.getElementById("trans-cli-cpt"); if(sub) sub.textContent=`${transDuClient(clientId).length} transmission(s)`;
  ta.focus();
}
function renderTransCliTypeChips(){
  return Object.entries(TYPES_TRANS).map(([k,v])=>{
    const on=_transType===k;
    return `<button type="button" onclick="_transType='${k}';document.getElementById('trans-cli-types').innerHTML=renderTransCliTypeChips()" style="padding:5px 11px;border-radius:999px;border:1.5px solid ${on?v.col:"#e2e8f0"};background:${on?v.bg:"#fff"};color:${on?v.col:"#64748b"};cursor:pointer;font-size:11.5px;font-weight:700;font-family:'Inter',sans-serif;white-space:nowrap">${v.icon} ${v.label}</button>`;
  }).join("");
}
function renderTransClientListe(clientId){
  const list=transDuClient(clientId);
  if(list.length===0) return `<div style="padding:22px;text-align:center;color:#94a3b8;font-size:12.5px">Aucune transmission pour ce client.</div>`;
  return list.map(t=>transLigne(t,false)).join("");
}
function renderTransClientSection(c){
  return `
    <div class="section-card" style="background:${TH.card};margin-bottom:20px">
      <div class="section-head">
        <div>
          <div class="section-title" style="color:${TH.txt}">🗒️ Transmissions</div>
          <div class="section-sub" id="trans-cli-cpt">${transDuClient(c.id).length} transmission(s)</div>
        </div>
      </div>
      <div style="padding:14px 18px">
        <div id="trans-cli-types" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:9px;margin-bottom:9px">${renderTransCliTypeChips()}</div>
        <textarea id="trans-cli-input" placeholder="Ex : Rappelée ce jour, valide le devis la semaine prochaine." style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13.5px;font-family:'Inter',sans-serif;outline:none;min-height:80px;resize:vertical;margin-bottom:8px"></textarea>
        <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:#64748b;font-weight:600;cursor:pointer"><input type="checkbox" id="trans-cli-imp" style="width:15px;height:15px;cursor:pointer"/> 🚩 Important</label>
          <button onclick="submitTransClient('${c.id}')" style="margin-left:auto;padding:9px 16px;border-radius:9px;border:none;background:${TH.c1};color:#fff;cursor:pointer;font-size:12.5px;font-weight:700;font-family:'Inter',sans-serif">Enregistrer</button>
        </div>
        <div id="trans-cli-liste" style="max-height:420px;overflow-y:auto">${renderTransClientListe(c.id)}</div>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════
// ── TABLEAU DE BORD MODULABLE (config propre à chaque utilisateur) ───────
// ════════════════════════════════════════════════════════
const DBW_DEF={
  hero:      {icon:"👋", label:"En-tête & indicateurs", col:"full"},
  alertes:   {icon:"⚠️", label:"Alertes",               col:"full"},
  agenda:    {icon:"📅", label:"Agenda",                col:"half"},
  taches:    {icon:"✅", label:"Tâches urgentes",       col:"half"},
  trans:     {icon:"🗒️", label:"Transmissions",         col:"full"},
  pipeline:  {icon:"🎯", label:"Pipeline prospects",    col:"full"},
  raccourcis:{icon:"🚀", label:"Accès rapides",         col:"full"}
};
const DBW_ORDRE=["hero","alertes","agenda","taches","trans","pipeline","raccourcis"];
let DBWIDGETS=[];
let dbEditMode=false;

// La disposition est stockée en local, par utilisateur connecté
function dbwKey(){
  const u=(typeof currentUser!=="undefined"&&currentUser&&(currentUser.id||currentUser.login||currentUser.email))||"local";
  return "adsecure_dbwidgets_"+u;
}
function dbwDefaut(){ return DBW_ORDRE.map(id=>({id,on:true,col:DBW_DEF[id].col,reduit:false})); }
// Fusionne la config enregistrée avec les widgets connus (ajoute les nouveaux, retire les obsolètes)
function mergeWidgets(saved){
  const out=[];
  (Array.isArray(saved)?saved:[]).forEach(w=>{
    if(w&&DBW_DEF[w.id]&&!out.some(x=>x.id===w.id))
      out.push({id:w.id,on:w.on!==false,col:(w.col==="half"||w.col==="full")?w.col:DBW_DEF[w.id].col,reduit:!!w.reduit});
  });
  DBW_ORDRE.forEach(id=>{ if(!out.some(x=>x.id===id)) out.push({id,on:true,col:DBW_DEF[id].col,reduit:false}); });
  return out;
}
function loadWidgets(){
  try{ DBWIDGETS=mergeWidgets(JSON.parse(localStorage.getItem(dbwKey())||"null")); }
  catch(e){ DBWIDGETS=dbwDefaut(); }
  if(!DBWIDGETS.length) DBWIDGETS=dbwDefaut();
  return DBWIDGETS;
}
function saveWidgets(){
  try{ localStorage.setItem(dbwKey(),JSON.stringify(DBWIDGETS)); }
  catch(e){ console.warn("Disposition non enregistrée :",e); }
}
function dbwConf(){ if(!DBWIDGETS.length) loadWidgets(); return DBWIDGETS; }
function dbwMove(id,delta){
  const L=dbwConf();
  const i=L.findIndex(w=>w.id===id);
  const j=i+delta;
  if(i<0||j<0||j>=L.length) return;
  [L[i],L[j]]=[L[j],L[i]];
  saveWidgets();renderPage();
}
function dbwToggle(id){
  const w=dbwConf().find(x=>x.id===id); if(!w)return;
  w.on=!w.on; saveWidgets(); renderPage();
}
function dbwLargeur(id){
  const w=dbwConf().find(x=>x.id===id); if(!w)return;
  w.col=w.col==="full"?"half":"full"; saveWidgets(); renderPage();
}
function dbwReduire(id){
  const w=dbwConf().find(x=>x.id===id); if(!w)return;
  w.reduit=!w.reduit; saveWidgets(); renderPage();
}
function dbwReset(){
  confirmDel("Rétablir la disposition par défaut du tableau de bord ?",function(){
    DBWIDGETS=dbwDefaut(); saveWidgets(); renderPage();
  });
}
function dbwEdit(){ dbEditMode=!dbEditMode; renderPage(); }

// ── Contenu de chaque widget ──────────────────────────────────────────────
function dbwHero(){
  const aR=CLIENTS.filter(c=>c.status==="relance1"||c.status==="relance2");
  const ws=weekStart(0);const we=addDays(ws,6);
  const evSem=EVENTS.filter(e=>e.date>=ws&&e.date<=we);
  const stAl=STOCK.filter(s=>s.qte<s.seuil);
  const facR=FACTURES.filter(f=>facEnCompta(f)&&facStatutReel(f)==="retard");
  const ca=FACTURES.filter(f=>facEnCompta(f)&&!["brouillon","annulee","payee"].includes(facStatutReel(f))).reduce((s,f)=>s+facReste(f),0);
  const tUrg=TACHES.filter(t=>!t.done&&t.prio==="haute");
  return `<div class="db-hero" style="background:linear-gradient(135deg,${TH.sidebar} 0%,${TH.c1} 55%,${TH.c2} 100%)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;position:relative;z-index:1">
        <div>
          <div style="font-size:10.5px;color:rgba(222,211,188,0.7);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;font-weight:600">${new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
          <div style="font-family:'Lora',Georgia,serif;font-size:26px;font-weight:700;letter-spacing:-0.01em">Bonjour${(typeof currentUser!=="undefined"&&currentUser&&currentUser.nom)?" "+currentUser.nom.split(" ")[0]:""} 👋</div>
          <div style="font-size:13px;color:rgba(222,211,188,0.75);margin-top:5px">${facR.length>0||stAl.length>0?`${facR.length+stAl.length} point(s) à traiter.`:"Tout est en ordre aujourd'hui."}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:rgba(222,211,188,0.6);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;font-weight:600">CA à encaisser</div>
          <div style="font-family:'Lora',Georgia,serif;font-size:28px;font-weight:700">${fMoney(ca)}</div>
        </div>
      </div>
      <div class="hero-kpi-grid" style="position:relative;z-index:1">
        ${[{l:"Clients à relancer",v:aR.length,page:"clients"},{l:"Événements semaine",v:evSem.length,page:"plan"},{l:"Factures en retard",v:facR.length,page:"factures"},{l:"Tâches urgentes",v:tUrg.length,page:"admin"}].map(k=>`
          <div class="hero-kpi" onclick="goTo('${k.page}')">
            <div class="hero-kpi-label">${k.l}</div>
            <div class="hero-kpi-value">${k.v}</div>
          </div>`).join("")}
      </div>
    </div>`;
}
function dbwAlertes(){
  const stAl=STOCK.filter(s=>s.qte<s.seuil);
  const facR=FACTURES.filter(f=>facEnCompta(f)&&facStatutReel(f)==="retard");
  const ctrAl=contratsAlertesL215();
  if(!facR.length&&!stAl.length&&!ctrAl.length) return `<div class="section-card"><div class="section-head"><div><div class="section-title">⚠️ Alertes</div><div class="section-sub">Rien à signaler</div></div></div><div style="padding:22px;text-align:center;font-size:13px;color:rgba(26,33,24,0.38)">Aucune alerte en cours 🎉</div></div>`;
  return `<div class="section-card"><div class="section-head"><div><div class="section-title">⚠️ Alertes</div><div class="section-sub">${facR.length+stAl.length+ctrAl.length} point(s) à traiter</div></div></div>
    <div style="padding:12px 16px">
      ${ctrAl.slice(0,5).map(({c,info})=>{const r=info.etat==="retard";return `<div class="alert-bar" style="background:${r?"#fef2f2":"#fffbeb"};border-color:${r?"#fca5a5":"#fcd34d"}" onclick="openClientFiche('${c.id}')"><span style="font-size:18px">✉️</span><div><div style="font-weight:700;font-size:13px;color:${r?"#7f1d1d":"#78350f"}">Courrier de reconduction — ${ctrEsc(c.nom)}</div><div style="font-size:11px;color:${r?"#991b1b":"#b45309"}">${r?"Délai dépassé — à envoyer au plus vite":"À envoyer avant le "+fDate(info.fin)} →</div></div></div>`;}).join("")}
      ${ctrAl.length>5?`<div style="font-size:11px;color:#b45309;margin:4px 0 8px">+ ${ctrAl.length-5} autre(s) courrier(s) de reconduction</div>`:""}
      ${facR.length>0?`<div class="alert-bar" style="background:#fef2f2;border-color:#fca5a5" onclick="goTo('factures')"><span style="font-size:18px">⚠️</span><div><div style="font-weight:700;font-size:13px;color:#7f1d1d">${facR.length} facture(s) en retard</div><div style="font-size:11px;color:#991b1b">Voir les factures →</div></div></div>`:""}
      ${stAl.length>0?`<div class="alert-bar" style="background:#fffbeb;border-color:#fcd34d" onclick="goTo('stock')"><span style="font-size:18px">📦</span><div><div style="font-weight:700;font-size:13px;color:#78350f">${stAl.length} produit(s) en alerte stock</div><div style="font-size:11px;color:#b45309">Voir le stock →</div></div></div>`:""}
    </div></div>`;
}
function dbwAgenda(){
  const todayEvs=EVENTS.filter(e=>e.date===getToday()).sort((a,b)=>a.heure.localeCompare(b.heure));
  const nextEvs=EVENTS.filter(e=>e.date>getToday()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);
  const dispEvs=todayEvs.length?todayEvs:nextEvs;
  return `<div class="section-card">
      <div class="section-head" style="cursor:pointer" onclick="goTo('plan')">
        <div><div class="section-title">📅 Agenda</div><div class="section-sub">${todayEvs.length?todayEvs.length+" aujourd'hui":"Prochains événements"}</div></div>
        <span style="font-size:12px;font-weight:600;color:${TH.c1}">Voir le planning →</span>
      </div>
      <div>
        ${dispEvs.map(ev=>{const[bg,bdr]=EV_STYLE[ev.type]||["#f1f5f9","#94a3b8"];return`<div style="display:flex;gap:12px;padding:10px 20px;border-bottom:1px solid rgba(26,33,24,0.06)"><div style="font-weight:700;font-size:12px;color:rgba(26,33,24,0.62);min-width:36px;flex-shrink:0">${ev.heure}</div><div style="flex:1;background:${bg};border-left:3px solid ${bdr};border-radius:8px;padding:7px 11px"><div style="font-weight:700;font-size:13px">${ev.titre}</div><div style="font-size:11px;color:rgba(26,33,24,0.38);margin-top:2px">${ev.client}</div></div></div>`;}).join("")}
        ${!dispEvs.length?`<div style="padding:24px;text-align:center;font-size:13px;color:rgba(26,33,24,0.38)">Aucun événement</div>`:""}
      </div>
    </div>`;
}
function dbwTaches(){
  const tUrg=TACHES.filter(t=>!t.done&&t.prio==="haute");
  return `<div class="section-card">
      <div class="section-head">
        <div><div class="section-title">✅ Tâches urgentes</div><div class="section-sub">${tUrg.length} en cours</div></div>
        <button class="btn-add" style="background:${TH.c1};color:#fff;font-size:12px;padding:6px 14px" onclick="goTo('admin')">Voir tout</button>
      </div>
      <div>
        ${tUrg.slice(0,4).map((t,i)=>{const diff=t.ech?daysDiff(t.ech):null;return`<div class="tache-row" style="${i===Math.min(tUrg.length,4)-1?"border-bottom:none":""}"><div class="prio-dot" style="background:#991b1b"></div><div style="flex:1"><div style="font-size:13px;font-weight:600">${t.titre}</div>${t.ech?`<div style="font-size:11px;color:${diff<=0?"#991b1b":diff<=3?"#b45309":"rgba(26,33,24,0.38)"};font-weight:${diff<=3?700:400}">${diff<0?`Retard ${Math.abs(diff)}j`:diff===0?"Aujourd'hui":`Dans ${diff}j`}</div>`:""}</div></div>`;}).join("")}
        ${tUrg.length===0?`<div style="padding:24px;text-align:center;font-size:13px;color:rgba(26,33,24,0.38)">Aucune tâche urgente 🎉</div>`:""}
      </div>
    </div>`;
}
function dbwPipeline(){
  return `<div class="section-card">
      <div class="section-head" style="cursor:pointer" onclick="goTo('pipeline')">
        <div>
          <div class="section-title">🎯 Pipeline Prospects</div>
          <div class="section-sub">${(()=>{const s=pipeStats();return s.active.length+" actif(s) · "+fMoney(s.pipeline)+" en cours";})()}</div>
        </div>
        <span style="font-size:12px;font-weight:600;color:${TH.c1}">Voir le pipeline →</span>
      </div>
      <div style="padding:12px 20px 16px;display:flex;gap:8px;overflow-x:auto">
        ${PIPE_STAGES.filter(s=>s.id!=="perdu").map(s=>{
          const n=PROSPECTS.filter(p=>p.stage===s.id).length;
          const amt=PROSPECTS.filter(p=>p.stage===s.id).reduce((x,p)=>x+p.amount,0);
          return`<div style="flex:1;min-width:88px;background:#F7F4ED;border-radius:10px;padding:11px;border-top:3px solid ${s.color};text-align:center">
            <div style="font-family:'Lora',Georgia,serif;font-size:20px;font-weight:700;color:${s.color}">${n}</div>
            <div style="font-size:10px;font-weight:700;color:rgba(26,33,24,0.38);margin-bottom:3px;line-height:1.3">${s.label}</div>
            ${amt?`<div style="font-size:10px;color:rgba(26,33,24,0.38)">${fMoney(amt)}</div>`:""}
          </div>`;
        }).join("")}
      </div>
      ${(()=>{const urg=PROSPECTS.filter(p=>p.date&&p.date<=TODAY&&p.stage!=="gagne"&&p.stage!=="perdu");
        return urg.length?`<div style="padding:10px 20px 14px;border-top:1px solid rgba(26,33,24,0.1);display:flex;gap:8px;align-items:center"><span style="font-size:13px">🔔</span><span style="font-size:12px;font-weight:700;color:#991b1b">${urg.length} relance${urg.length>1?"s":""} urgente${urg.length>1?"s":""} : ${urg.slice(0,2).map(p=>p.name).join(", ")}${urg.length>2?" …":""}</span></div>`:"";
      })()}
    </div>`;
}
function dbwRaccourcis(){
  const actRubs=activeRubs().filter(r=>r.id!=="db");
  if(!actRubs.length) return `<div class="section-card"><div class="section-head"><div class="section-title">🚀 Accès rapides</div></div><div style="padding:22px;text-align:center;font-size:13px;color:rgba(26,33,24,0.38)">Aucune rubrique active</div></div>`;
  return `<div class="section-card">
      <div class="section-head"><div><div class="section-title">🚀 Accès rapides</div><div class="section-sub">${actRubs.length} rubrique(s)</div></div></div>
      <div style="padding:14px 18px">
        <div class="quick-grid" style="grid-template-columns:repeat(${Math.min(actRubs.length,4)},1fr)">
          ${actRubs.map(r=>`<button class="quick-btn" onclick="goTo('${r.id}')">
            <div style="font-size:26px;margin-bottom:12px">${r.icon}</div>
            <div style="font-family:'Lora',Georgia,serif;font-weight:700;font-size:14px;color:#1A2118;margin-bottom:4px">${r.label}</div>
            <div style="font-size:11.5px;font-weight:600;color:${TH.c1};margin-top:10px;display:flex;align-items:center;gap:4px">Ouvrir <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>
          </button>`).join("")}
        </div>
      </div>
    </div>`;
}
const DBW_RENDER={hero:dbwHero,alertes:dbwAlertes,agenda:dbwAgenda,taches:dbwTaches,trans:renderTransWidget,pipeline:dbwPipeline,raccourcis:dbwRaccourcis};

// ── Barre d'outils d'un widget en mode personnalisation ───────────────────
function dbwBarre(w,i,n){
  return `<div class="db-w-bar">
    <button class="db-w-btn" onclick="dbwMove('${w.id}',-1)" title="Monter"${i===0?" disabled":""}>↑</button>
    <button class="db-w-btn" onclick="dbwMove('${w.id}',1)" title="Descendre"${i===n-1?" disabled":""}>↓</button>
    <button class="db-w-btn" onclick="dbwLargeur('${w.id}')" title="${w.col==="full"?"Passer en demi-largeur":"Passer en pleine largeur"}">${w.col==="full"?"⬛":"◧"}</button>
    <button class="db-w-btn" onclick="dbwToggle('${w.id}')" title="Masquer" style="background:#fee2e2;color:#991b1b">✕</button>
  </div>`;
}

// Les widgets en demi-largeur s'apparient deux par deux ; un demi resté seul
// sur sa ligne s'étire sur toute la largeur pour ne pas laisser de trou.
function dbwClasseLargeur(visibles,i){
  if(visibles[i].col!=="half") return "full";
  let debut=i;
  while(debut>0 && visibles[debut-1].col==="half") debut--;
  // position du widget dans sa série de demis
  const rang=i-debut;
  const serieFin=(()=>{let j=i;while(j+1<visibles.length && visibles[j+1].col==="half") j++;return j;})();
  const taille=serieFin-debut+1;
  // un demi orphelin en fin de série impaire passe en pleine largeur
  if(rang===taille-1 && taille%2===1) return "full";
  return "half";
}
// Mosaïque : chaque widget occupe le nombre de rangées de 8px correspondant à sa
// hauteur réelle, si bien qu'un widget court ne laisse plus de trou sous lui.
let _masonryRaf=null;
function dbwMasonry(){
  const grid=document.querySelector(".db-grid");
  if(!grid) return;
  const uneCol=window.matchMedia("(max-width:620px)").matches;
  grid.querySelectorAll(".db-w").forEach(el=>{
    if(uneCol){ el.style.gridRowEnd=""; return; }
    const h=el.getBoundingClientRect().height;
    el.style.gridRowEnd="span "+Math.max(1,Math.ceil(h/8));
  });
}
function planifierMasonry(){
  if(_masonryRaf) cancelAnimationFrame(_masonryRaf);
  _masonryRaf=requestAnimationFrame(()=>{ dbwMasonry(); requestAnimationFrame(dbwMasonry); });
}
window.addEventListener("resize",()=>{ if(currentPage==="db") planifierMasonry(); });

function renderDashboardModulable(){
  const conf=dbwConf();
  const visibles=conf.filter(w=>w.on);
  const masques=conf.filter(w=>!w.on);
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <div style="font-family:'Lora',Georgia,serif;font-size:17px;font-weight:700;color:${TH.txt}">Tableau de bord</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        ${dbEditMode?`<button onclick="dbwReset()" style="padding:7px 13px;border-radius:999px;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;cursor:pointer;font-size:12px;font-weight:600;font-family:'Inter',sans-serif">↺ Par défaut</button>`:""}
        <button onclick="dbwEdit()" style="padding:7px 15px;border-radius:999px;border:1.5px solid ${TH.c1};background:${dbEditMode?TH.c1:"#fff"};color:${dbEditMode?"#fff":TH.c1};cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif">${dbEditMode?"✓ Terminé":"⚙️ Personnaliser"}</button>
      </div>
    </div>
    ${dbEditMode?`<div style="background:${TH.c1}0D;border:1.5px solid ${TH.c1}33;border-radius:11px;padding:11px 15px;margin-bottom:16px;font-size:12.5px;color:${TH.txt};line-height:1.5">Réorganisez vos widgets avec ↑ ↓, changez leur largeur avec ⬛ / ◧, masquez-les avec ✕. Votre disposition est enregistrée pour votre compte uniquement.</div>`:""}
    <div class="db-grid${dbEditMode?" db-edit":""}">
      ${visibles.map((w,i)=>{
        const def=DBW_DEF[w.id];
        const fn=DBW_RENDER[w.id];
        if(!def||!fn) return "";
        return `<div class="db-w ${dbwClasseLargeur(visibles,i)}${w.reduit?" reduit":""}">
          ${dbEditMode?dbwBarre(w,i,visibles.length):`<button class="db-reduce" onclick="dbwReduire('${w.id}')" title="${w.reduit?"Déplier":"Réduire"}">${w.reduit?"▾":"▴"}</button>`}
          ${w.reduit&&w.id==="hero"?`<div class="section-card"><div class="section-head"><div><div class="section-title">${def.icon} ${def.label}</div><div class="section-sub">Réduit</div></div></div></div>`:fn()}
        </div>`;
      }).join("")}
    </div>
    ${(dbEditMode&&masques.length)?`
      <div style="margin-top:22px">
        <div style="font-size:10.5px;font-weight:700;color:rgba(26,33,24,0.38);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:11px">Widgets masqués</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${masques.map(w=>{const d=DBW_DEF[w.id];return `<button onclick="dbwToggle('${w.id}')" style="padding:9px 14px;border-radius:11px;border:1.5px dashed ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-size:12.5px;font-weight:700;font-family:'Inter',sans-serif">＋ ${d.icon} ${d.label}</button>`;}).join("")}
        </div>
      </div>`:""}
  `;
}

function renderDashboard(){ return renderDashboardModulable(); }


function modalFacture(id){
  const f=id?FACTURES.find(x=>x.id===id):{id:"",num:prochainNumero("FAC",FACTURES),date:TODAY,client:"",clientId:"",ech:addDays(TODAY,30),statut:"brouillon",tva:TVA_DEFAUT,refChantier:"",lignes:[{desc:"",qte:1,pu:0}]};
  // Rétrocompat : ancienne facture sans lignes → on en crée une à partir du ttc
  let lignesInit=(f.lignes&&f.lignes.length)?f.lignes:[{desc:"Prestation",qte:1,pu:Math.round((f.ttc||0)/(1+(facTauxTVA(f)/100))*100)/100}];
  window._facLignes=JSON.parse(JSON.stringify(lignesInit));
  showModal(id?"Modifier la facture":"Nouvelle facture",
    `<div class="field-row">
      <div class="field"><label>N° Facture</label><input id="fac-num" value="${f.num}"/></div>
      <div class="field"><label>Client *</label>
        <div style="display:flex;gap:6px;align-items:center">
          <select id="fac-client" onchange="toggleChantierField('fac')" style="flex:1;min-width:0">
            ${clientSelectOptions(f.clientId)}
          </select>
          <button onclick="quickAddClientOverlay('fac-client','fac')" title="Créer un nouveau client" style="flex-shrink:0;width:44px;height:44px;border-radius:8px;border:1.5px solid ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-size:20px;font-weight:700;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;padding:0">＋</button>
        </div>
      </div>
    </div>
    <div class="field" id="fac-chantier-wrap" style="display:${clientEstPro(f.clientId)?"block":"none"}"><label>Référence chantier (client pro)</label><input id="fac-chantier" value="${(f.refChantier||"").replace(/"/g,'&quot;')}" placeholder="Ex : Chantier rue des Lilas — Lot 3"/></div>
    <div class="field-row">
      <div class="field"><label>Date d'émission</label><input type="date" id="fac-date" value="${f.date||""}"/>${f.date?"":`<div style="font-size:11px;color:#b45309;margin-top:3px">À compléter (obligatoire sur une facture)</div>`}</div>
      <div class="field"><label>Échéance</label><input type="date" id="fac-ech" value="${f.ech}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Statut</label><select id="fac-statut">${Object.entries(ST_FAC).map(([k,v])=>`<option value="${k}"${f.statut===k?" selected":""}>${v[2]}</option>`).join("")}</select></div>
    </div>
    <div class="field"><label>TVA (%)</label><input type="number" step="any" id="fac-tva" value="${facTauxTVA(f)}" oninput="updateFacTotaux()"/></div>
    <div class="field">
      <label>Ajout rapide depuis le catalogue <span id="fac-cat-picker-cpt" style="font-weight:600;color:#94a3b8"></span></label>
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <input id="fac-cat-search" placeholder="🔍 Nom, référence, marque..." oninput="renderFacCataloguePicker(this.value)" style="flex:1;padding:8px 12px;border-radius:8px;border:1.5px solid #e2e8f0;font-size:13px;background:#fff;outline:none;font-family:'Inter',sans-serif;min-width:0"/>
        <button onclick="modalAjoutProduitCatalogue()" style="padding:8px 12px;border-radius:8px;border:1.5px solid ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif;white-space:nowrap">＋ Produit</button>
      </div>
      <div id="fac-cat-picker-chips" style="display:flex;gap:5px;overflow-x:auto;padding-bottom:8px;margin-bottom:6px"></div>
      <div id="fac-cat-picker" style="display:flex;flex-wrap:wrap;gap:6px;max-height:190px;overflow-y:auto;padding:4px"></div>
    </div>
    <div class="field">
      <label>Lignes de la facture</label>
      <div id="fac-lignes"></div>
      <button onclick="addFacLigne()" style="margin-top:8px;padding:7px 12px;border-radius:8px;border:1.5px dashed ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-size:12px;font-weight:600;font-family:'Inter',sans-serif;width:100%">＋ Ligne vide</button>
    </div>
    <div id="fac-totaux" style="background:#F7F4ED;border-radius:10px;padding:12px 16px;margin-bottom:14px"></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="saveFacture('${id||""}')">Enregistrer</button>`
  );
  renderFacLignes();
  renderFacCataloguePicker("");
}
function renderFacLignes(){
  const box=document.getElementById("fac-lignes");
  if(!box)return;
  const L=window._facLignes;
  if(L.length===0){box.innerHTML=`<div style="padding:16px;text-align:center;color:#94a3b8;font-size:12.5px">Aucune ligne. Choisissez un produit ci-dessus ou ajoutez une ligne vide.</div>`;updateFacTotaux();return;}
  box.innerHTML=L.map((l,i)=>{
    const total=(l.qte||0)*(l.pu||0);
    const cout=(l.qte||0)*(l.pa||0);
    const marge=total-cout;
    const pct=total>0?(marge/total*100):0;
    const mCol=marge>0?"#15803d":marge<0?"#991b1b":"#94a3b8";
    const ouvert=l._det||!!(l.det||"").trim();
    return `<div style="border:1.5px solid #e2e8f0;border-radius:10px;padding:9px;margin-bottom:8px;background:#fff">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input value="${(l.ref||"").replace(/"/g,'&quot;')}" placeholder="Réf." oninput="window._facLignes[${i}].ref=this.value" style="width:82px;${INPUT_L};font-size:11.5px;font-weight:700;color:#64748b;flex-shrink:0"/>
        <input value="${(l.desc||"").replace(/"/g,'&quot;')}" placeholder="Désignation" oninput="window._facLignes[${i}].desc=this.value;updateFacTotaux()" style="flex:1;${INPUT_L}"/>
        <button type="button" onclick="toggleFacLigneDet(${i})" title="Descriptif détaillé" style="width:30px;height:30px;border-radius:7px;border:1.5px solid ${ouvert?TH.c1:"#e2e8f0"};background:${ouvert?TH.c1+"12":"#fff"};color:${ouvert?TH.c1:"#94a3b8"};cursor:pointer;flex-shrink:0;font-size:12px">📄</button>
        <button type="button" onclick="window._facLignes.splice(${i},1);renderFacLignes()" style="width:30px;height:30px;border-radius:7px;border:1.5px solid #fecaca;background:#fef2f2;color:#991b1b;cursor:pointer;flex-shrink:0;font-size:13px">✕</button>
      </div>
      ${ouvert?`<textarea placeholder="Descriptif détaillé (imprimé sous la désignation)" oninput="window._facLignes[${i}].det=this.value" style="width:100%;box-sizing:border-box;${INPUT_L};font-size:12px;min-height:54px;resize:vertical;margin-bottom:6px">${(l.det||"")}</textarea>`:""}
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <input type="number" step="any" value="${l.qte}" placeholder="Qté" oninput="window._facLignes[${i}].qte=parseFloat(this.value)||0;updateFacTotaux()" style="width:58px;${INPUT_L};text-align:center;flex-shrink:0"/>
        <input list="dv-unites" value="${(l.unite||"unité").replace(/"/g,'&quot;')}" placeholder="Unité" oninput="window._facLignes[${i}].unite=this.value" style="width:76px;${INPUT_L};font-size:12px;flex-shrink:0"/>
        <input type="number" step="any" value="${l.pa||0}" placeholder="P.A." title="Prix d'achat HT (interne, non imprimé)" oninput="window._facLignes[${i}].pa=parseFloat(this.value)||0;updateFacTotaux()" style="width:70px;${INPUT_L};text-align:right;background:#f8fafc;color:#64748b;flex-shrink:0"/>
        <input type="number" step="any" value="${l.pu}" placeholder="P.U." oninput="window._facLignes[${i}].pu=parseFloat(this.value)||0;updateFacTotaux()" style="width:82px;${INPUT_L};text-align:right;font-weight:700;flex-shrink:0"/>
        <div style="flex:1;min-width:110px;text-align:right;font-size:12.5px">
          <span style="font-weight:800;color:${TH.txt}">${fMoney(total)}</span>
          ${cout>0?`<span style="margin-left:7px;font-size:11px;font-weight:700;color:${mCol}">${marge>=0?"+":""}${fMoney(marge)} · ${pct.toFixed(0)} %</span>`:""}
        </div>
      </div>
    </div>`;
  }).join("")+`<datalist id="dv-unites">${UNITES.map(u=>`<option value="${u}"></option>`).join("")}</datalist>`;
  updateFacTotaux();
}
function toggleFacLigneDet(i){ window._facLignes[i]._det=!window._facLignes[i]._det; renderFacLignes(); }
function addFacLigne(){ window._facLignes.push({ref:"",desc:"",det:"",unite:"unité",qte:1,pu:0,pa:0}); renderFacLignes(); }
function updateFacTotaux(){
  const box=document.getElementById("fac-totaux");
  if(!box)return;
  const tva=parseFloat(document.getElementById("fac-tva")?.value)||0;
  const ht=window._facLignes.reduce((s,l)=>s+(l.qte||0)*(l.pu||0),0);
  const cout=window._facLignes.reduce((s,l)=>s+(l.qte||0)*(l.pa||0),0);
  const mtva=ht*tva/100;
  box.innerHTML=`${cout>0?ligneMarge(ht,cout):""}<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span style="color:#64748b">Total HT</span><span style="font-weight:600">${fMoney(ht)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span style="color:#64748b">TVA ${fTaux(tva)}</span><span style="font-weight:600">${fMoney(mtva)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:15px;padding-top:6px;border-top:1px solid #ddd"><span style="font-weight:700;color:${TH.txt}">Total TTC</span><span style="font-weight:800;color:${TH.c1}">${fMoney(ht+mtva)}</span></div>`;
}
function renderFacCataloguePicker(filter){
  const box=document.getElementById("fac-cat-picker");
  if(!box)return;
  const chips=document.getElementById("fac-cat-picker-chips");
  if(chips) chips.innerHTML=renderPickerChips("fac");
  _pickerProduits=produitsUnifies();
  const filtered=pickerFiltrer(_pickerProduits.map((p,i)=>({...p,idx:i})),filter);
  const cpt=document.getElementById("fac-cat-picker-cpt");
  if(cpt) cpt.textContent=`${filtered.length} / ${_pickerProduits.length}`;
  if(filtered.length===0){box.innerHTML=`<div style="padding:12px;color:#94a3b8;font-size:12px;width:100%;text-align:center">Aucun produit ne correspond.</div>`;return;}
  box.innerHTML=filtered.map(p=>pickerCard(p,`addProduitToFacture(${p.idx})`)).join("");
}
function addProduitToFacture(idx){
  const p=_pickerProduits[idx];
  if(!p)return;
  const det=[p.marque,p.modele].filter(Boolean).join(" ");
  const ligne={ref:p.ref||"",desc:p.nom,det:(p.desc||"")||(det?det:""),unite:p.unite||"unité",qte:1,pu:p.pu,pa:p.pa||0};
  const empty=window._facLignes.findIndex(l=>!l.desc&&!l.pu);
  if(empty!==-1){window._facLignes[empty]=ligne;}
  else{window._facLignes.push(ligne);}
  renderFacLignes();
}
function saveFacture(id){
  const clientId=document.getElementById("fac-client").value;
  const cli=CLIENTS.find(c=>c.id===clientId);
  const lignes=window._facLignes.filter(l=>l.desc||l.pu).map(l=>{const c={...l};delete c._det;return c;});
  if(lignes.length===0){alert("Ajoutez au moins une ligne");return;}
  const tva=parseFloat(document.getElementById("fac-tva").value)||0;
  const ht=lignes.reduce((s,l)=>s+(l.qte||0)*(l.pu||0),0);
  const obj={
    num:document.getElementById("fac-num").value,
    client:cli?cli.nom:"",
    clientId,
    date:document.getElementById("fac-date").value||"",
    ech:document.getElementById("fac-ech").value,
    statut:document.getElementById("fac-statut").value,
    refChantier:(document.getElementById("fac-chantier")?.value||"").trim(),
    tva,lignes,
    ttc:Math.round(ht*(1+tva/100)*100)/100
  };
  if(id){FACTURES=FACTURES.map(f=>f.id===id?{...f,...obj}:f);logActivity("Modification facture",obj.num);}
  else{FACTURES.push({...obj,id:uid()});logActivity("Création facture",obj.num);}
  closeModal();renderPage();renderNav();
}
function delFacture(id){confirmDel("Supprimer cette facture ?",function(){FACTURES=FACTURES.filter(f=>f.id!==id);renderPage();renderNav();});}

// ══════════════════════════════════════════════════════════
