// ── AGENDA : vues jour / semaine / mois / liste ─────────
// ════════════════════════════════════════════════════════
// Événement : {id,type,titre,client,clientId,adresse,date,heure,fin,assignes:[userId],notes,...}
let planningVue=(function(){try{return localStorage.getItem("ad_planning_vue")||"semaine";}catch(e){return "semaine";}})();
let planningDate=null;          // date affichée (AAAA-MM-JJ), aujourd'hui par défaut
let planningPersonne="tous";    // "tous" ou id d'un membre de l'équipe
const EQUIPE_COULEURS=["#3286A0","#c2410c","#15803d","#7c3aed","#b45309","#0e7490","#be185d","#4d7c0f"];
const AG_H_DEBUT=7, AG_H_FIN=20, AG_PX_H=52;

function agE(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function agYmd(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function agDate(){return planningDate||getToday();}
function agMin(h){const m=String(h||"").match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):9*60;}
function agHeure(min){min=Math.max(0,Math.min(23*60+59,min));return String(Math.floor(min/60)).padStart(2,"0")+":"+String(min%60).padStart(2,"0");}
function evFin(e){ return e.fin&&agMin(e.fin)>agMin(e.heure)?e.fin:agHeure(agMin(e.heure)+60); }
function agSemaine(d){const x=new Date(d+"T12:00:00");const j=x.getDay()===0?6:x.getDay()-1;x.setDate(x.getDate()-j);return agYmd(x);}
function agLibJour(d,opt){return new Date(d+"T12:00:00").toLocaleDateString("fr-FR",opt||{weekday:"long",day:"numeric",month:"long"});}

// ── Équipe (lue par tous ; mise à jour par un administrateur à la connexion) ──
function equipe(){
  const L=Array.isArray(TH.equipe)?TH.equipe.slice():[];
  if(currentUser&&!L.some(m=>m.id===currentUser.id)) L.push({id:currentUser.id,nom:currentUser.nom||"Moi"});
  return L.map((m,i)=>({...m,couleur:m.couleur||EQUIPE_COULEURS[i%EQUIPE_COULEURS.length]}));
}
function membre(id){return equipe().find(m=>m.id===id);}
function initiales(nom){return String(nom||"?").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join("");}
function syncEquipe(){
  if(!Array.isArray(PROFILES)||!PROFILES.length) return;
  const ancien=Array.isArray(TH.equipe)?TH.equipe:[];
  const nv=PROFILES.filter(p=>p.actif!==false).map((p,i)=>{const a=ancien.find(x=>x.id===p.id);
    return {id:p.id,nom:p.nom||p.email||"Membre",couleur:(a&&a.couleur)||EQUIPE_COULEURS[i%EQUIPE_COULEURS.length]};});
  if(JSON.stringify(nv)!==JSON.stringify(ancien)){TH.equipe=nv;saveData();}
}
function pastillesAssignes(e,taille){
  const t=taille||18;
  return (e.assignes||[]).map(id=>membre(id)).filter(Boolean).map(m=>`<span title="${agE(m.nom)}" style="display:inline-flex;align-items:center;justify-content:center;width:${t}px;height:${t}px;border-radius:50%;background:${m.couleur};color:#fff;font-size:${Math.round(t*0.5)}px;font-weight:800;flex-shrink:0">${agE(initiales(m.nom))}</span>`).join("");
}

// ── Filtres ──
function agTypes(){return [
  {id:"tous",label:"Tous",color:TH.c1},
  {id:"rdv",label:"RDV",color:"#299AC3"},
  {id:"chantier",label:"Chantiers",color:"#b08d57"},
  {id:"maintenance",label:FV("visite").charAt(0).toUpperCase()+FV("visite").slice(1),color:"#6d28d9"},
  {id:"prospection",label:"Prospection",color:"#3286A0"},
  {id:"autre",label:"Autre",color:"#64748b"}];}
function agFiltre(e){
  if(planningFilter!=="tous"&&e.type!==planningFilter) return false;
  if(planningPersonne!=="tous"&&!(e.assignes||[]).includes(planningPersonne)) return false;
  return true;
}
function agEvents(d){return EVENTS.filter(e=>e.date===d&&agFiltre(e)).sort((a,b)=>agMin(a.heure)-agMin(b.heure));}
function agStyle(e){const s=EV_STYLE[e.type]||["#f1f5f9","#64748b"];const m=(e.assignes||[]).length===1?membre(e.assignes[0]):null;return {bg:s[0],bord:m?m.couleur:s[1]};}

function agChangerVue(v){planningVue=v;try{localStorage.setItem("ad_planning_vue",v);}catch(e){}renderPage();}
function agDeplacer(sens){
  const d=new Date(agDate()+"T12:00:00");
  if(planningVue==="jour") d.setDate(d.getDate()+sens);
  else if(planningVue==="mois"){d.setDate(1);d.setMonth(d.getMonth()+sens);}
  else if(planningVue==="liste") d.setDate(d.getDate()+30*sens);
  else d.setDate(d.getDate()+7*sens);
  planningDate=agYmd(d);renderPage();
}
function agAller(d,vue){planningDate=d;if(vue)planningVue=vue;try{localStorage.setItem("ad_planning_vue",planningVue);}catch(e){}renderPage();}

function renderPlanning(){
  const d=agDate();
  const ws=agSemaine(d),we=addDays(ws,6);
  let titre;
  if(planningVue==="jour") titre=agLibJour(d,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  else if(planningVue==="mois") titre=new Date(d+"T12:00:00").toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
  else if(planningVue==="liste") titre=`À venir à partir du ${agLibJour(d,{day:"numeric",month:"long"})}`;
  else titre=`${agLibJour(ws,{day:"numeric",month:"short"})} — ${agLibJour(we,{day:"numeric",month:"short",year:"numeric"})}`;
  const auj=getToday();
  const semaineEvs=EVENTS.filter(e=>e.date>=ws&&e.date<=we);
  const mesEvs=currentUser?EVENTS.filter(e=>e.date>=auj&&(e.assignes||[]).includes(currentUser.id)):[];
  const btnVue=(v,l)=>`<button onclick="agChangerVue('${v}')" style="padding:7px 12px;border:none;background:${planningVue===v?TH.c1:"transparent"};color:${planningVue===v?"#fff":TH.txt};cursor:pointer;font-size:12.5px;font-weight:700;font-family:'Inter',sans-serif;border-radius:8px">${l}</button>`;
  const chip=(actif,col,lbl,onclick)=>`<button onclick="${onclick}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:999px;border:1.5px solid ${actif?col:"#e2e8f0"};background:${actif?col+"18":"#fff"};color:${actif?col:"#64748b"};cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif">${lbl}</button>`;
  const eq=equipe();
  let corps;
  if(planningVue==="jour") corps=agVueJour(d);
  else if(planningVue==="mois") corps=agVueMois(d);
  else if(planningVue==="liste") corps=agVueListe(d);
  else corps=agVueSemaine(ws);
  return `
    <div class="kpi-grid">
      ${kpi("Cette semaine",semaineEvs.length,TH.c1)}
      ${kpi("Aujourd'hui",EVENTS.filter(e=>e.date===auj).length,"#299AC3")}
      ${currentUser?kpi("Mes prochains RDV",mesEvs.length,"#15803d"):""}
      ${kpi(FV("visitesPl")+" à venir",EVENTS.filter(e=>e.type==="maintenance"&&e.date>=auj).length,"#6d28d9")}
    </div>
    <div class="section-card" style="background:${TH.card}">
      <div class="section-head" style="flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <button class="btn-sm" onclick="agDeplacer(-1)" aria-label="Précédent">◀</button>
          <button class="btn-sm" onclick="planningDate=null;renderPage()">Aujourd'hui</button>
          <button class="btn-sm" onclick="agDeplacer(1)" aria-label="Suivant">▶</button>
          <span style="font-weight:700;font-size:14px;color:${TH.txt};margin-left:6px">${titre.charAt(0).toUpperCase()+titre.slice(1)}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <div style="display:flex;background:${TH.bg};border-radius:10px;padding:3px">${btnVue("jour","Jour")}${btnVue("semaine","Semaine")}${btnVue("mois","Mois")}${btnVue("liste","Liste")}</div>
          <button class="btn-sm" onclick="modalSynchroAgenda()" title="Voir l'agenda sur votre téléphone">📲 Synchro</button>
          <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="modalEvent('',agDate())">＋ Ajouter</button>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;padding:0 18px 10px">
        ${agTypes().map(f=>chip(planningFilter===f.id,f.color,f.label,`planningFilter='${f.id}';renderPage()`)).join("")}
      </div>
      ${eq.length>1?`<div style="display:flex;gap:6px;flex-wrap:wrap;padding:0 18px 12px;align-items:center">
        <span style="font-size:11px;font-weight:700;color:${TH.txt}88;text-transform:uppercase;letter-spacing:.05em;margin-right:2px">Qui</span>
        ${chip(planningPersonne==="tous",TH.c1,"Toute l'équipe",`planningPersonne='tous';renderPage()`)}
        ${eq.map(m=>chip(planningPersonne===m.id,m.couleur,`<span style="width:10px;height:10px;border-radius:50%;background:${m.couleur};display:inline-block"></span>${agE(m.nom)}${currentUser&&m.id===currentUser.id?" (moi)":""}`,`planningPersonne='${m.id}';renderPage()`)).join("")}
      </div>`:""}
      ${corps}
    </div>`;
}

function agPill(ev){
  const st=agStyle(ev);
  return `<div class="ev-pill" style="background:${st.bg};border-left-color:${st.bord}" draggable="true"
      ondragstart="dragEvent(event,'${ev.id}')" ondragend="this.style.opacity='1'" onclick="modalEvent('${ev.id}')">
    <div class="ev-title" style="color:${TH.txt}">${agE(ev.titre||"(sans titre)")}</div>
    <div class="ev-time" style="color:${TH.txt}99">${agE(ev.heure)}–${agE(evFin(ev))}${ev.client?" · "+agE(ev.client):""}</div>
    ${(ev.assignes||[]).length||ev.adresse?`<div style="display:flex;gap:3px;align-items:center;margin-top:3px">${pastillesAssignes(ev,15)}${ev.adresse?`<span style="font-size:10px" title="${agE(ev.adresse)}">📍</span>`:""}</div>`:""}
  </div>`;
}
function agVueSemaine(ws){
  const week=Array.from({length:7},(_,i)=>addDays(ws,i));
  return `<div class="week-grid" id="week-grid-container">
    ${week.map((day,i)=>{const isT=day===getToday();
      return `<div class="day-col" ondragover="event.preventDefault();this.style.background='${TH.c1}18'" ondragleave="this.style.background=''" ondrop="dropEvent(event,'${day}');this.style.background=''">
        <div class="day-header" style="cursor:pointer" onclick="agAller('${day}','jour')" title="Voir la journée">
          <div class="day-name" style="color:${TH.txt}77">${JOURS[i]}</div>
          <div class="day-num${isT?" today":""}" style="${isT?`background:${TH.c1};color:#fff`:`color:${TH.txt}`}">${new Date(day+"T12:00:00").getDate()}</div>
        </div>
        ${agEvents(day).map(agPill).join("")}
        <div onclick="modalEvent('','${day}')" style="text-align:center;font-size:16px;cursor:pointer;color:#cbd5e1;margin-top:4px;padding:2px" title="Ajouter un événement">＋</div>
      </div>`;}).join("")}
  </div>`;
}
function agVueJour(d){
  const evs=agEvents(d);
  let h0=AG_H_DEBUT,h1=AG_H_FIN;
  evs.forEach(e=>{h0=Math.min(h0,Math.floor(agMin(e.heure)/60));h1=Math.max(h1,Math.ceil(agMin(evFin(e))/60));});
  // Colonnes pour les événements qui se chevauchent
  const voies=[];const pos=evs.map(e=>{const a=agMin(e.heure),b=agMin(evFin(e));let v=voies.findIndex(fin=>fin<=a);if(v<0){v=voies.length;voies.push(b);}else voies[v]=b;return {e,a,b,v};});
  const nb=Math.max(1,voies.length);
  const H=(h1-h0)*AG_PX_H;
  const now=new Date();const nowMin=now.getHours()*60+now.getMinutes();
  return `<div style="padding:4px 14px 18px">
    <div style="position:relative;height:${H}px;margin-left:46px;border-left:1px solid #e2e8f0">
      ${Array.from({length:h1-h0},(_,i)=>{const h=h0+i;return `<div onclick="modalEvent('','${d}','${String(h).padStart(2,"0")}:00')" style="position:absolute;left:0;right:0;top:${i*AG_PX_H}px;height:${AG_PX_H}px;border-top:1px solid #f1f5f9;cursor:pointer" title="Ajouter à ${h}h">
        <span style="position:absolute;left:-46px;top:-7px;font-size:11px;color:#94a3b8;width:40px;text-align:right">${h}h</span></div>`;}).join("")}
      ${d===getToday()&&nowMin>=h0*60&&nowMin<=h1*60?`<div style="position:absolute;left:0;right:0;top:${(nowMin-h0*60)*AG_PX_H/60}px;border-top:2px solid #dc2626;z-index:3;pointer-events:none"></div>`:""}
      ${pos.map(({e,a,b,v})=>{const st=agStyle(e);const top=(a-h0*60)*AG_PX_H/60,haut=Math.max(26,(b-a)*AG_PX_H/60-2);
        return `<div onclick="event.stopPropagation();modalEvent('${e.id}')" style="position:absolute;top:${top}px;height:${haut}px;left:calc(${v*100/nb}% + 4px);width:calc(${100/nb}% - 8px);background:${st.bg};border-left:4px solid ${st.bord};border-radius:8px;padding:5px 8px;box-sizing:border-box;overflow:hidden;cursor:pointer;z-index:2;box-shadow:0 1px 3px rgba(0,0,0,.08)">
          <div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start">
            <div style="min-width:0"><div style="font-weight:700;font-size:12.5px;color:${TH.txt};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${agE(e.titre||"(sans titre)")}</div>
            <div style="font-size:11px;color:${TH.txt}99">${agE(e.heure)}–${agE(evFin(e))}${e.client?" · "+agE(e.client):""}</div>
            ${haut>60&&e.adresse?`<div style="font-size:11px;color:${TH.txt}88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📍 ${agE(e.adresse)}</div>`:""}</div>
            <div style="display:flex;gap:2px;flex-shrink:0">${pastillesAssignes(e,18)}</div>
          </div></div>`;}).join("")}
    </div>
    ${evs.length===0?`<div style="text-align:center;color:${TH.txt}66;font-size:13px;margin-top:10px">Aucun événement ce jour. Touchez une heure pour en ajouter un.</div>`:""}
  </div>`;
}
function agVueMois(d){
  const x=new Date(d+"T12:00:00");x.setDate(1);
  const mois=x.getMonth();
  const debut=agSemaine(agYmd(x));
  const jours=Array.from({length:42},(_,i)=>addDays(debut,i));
  const lignes=jours[35]&&new Date(jours[35]+"T12:00:00").getMonth()!==mois?35:42;
  return `<div style="padding:4px 12px 16px">
    <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">
      ${JOURS.map(j=>`<div style="text-align:center;font-size:10.5px;font-weight:700;text-transform:uppercase;color:${TH.txt}77;padding:4px 0">${j}</div>`).join("")}
      ${jours.slice(0,lignes).map(day=>{const dd=new Date(day+"T12:00:00");const dans=dd.getMonth()===mois;const isT=day===getToday();const evs=agEvents(day);
        return `<div onclick="agAller('${day}','jour')" style="min-height:82px;border-radius:8px;padding:4px;background:${dans?TH.bg:"transparent"};opacity:${dans?1:.45};cursor:pointer;overflow:hidden">
          <div style="font-size:12px;font-weight:700;${isT?`background:${TH.c1};color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center`:`color:${TH.txt}`}">${dd.getDate()}</div>
          ${evs.slice(0,3).map(e=>{const st=agStyle(e);return `<div style="margin-top:3px;font-size:10.5px;line-height:1.25;padding:2px 4px;border-radius:4px;background:${st.bg};border-left:3px solid ${st.bord};color:${TH.txt};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${agE(e.heure)} ${agE(e.titre||"")}</div>`;}).join("")}
          ${evs.length>3?`<div style="font-size:10.5px;color:${TH.txt}88;margin-top:2px">+${evs.length-3} autre(s)</div>`:""}
        </div>`;}).join("")}
    </div></div>`;
}
function agVueListe(d){
  const fin=addDays(d,30);
  const evs=EVENTS.filter(e=>e.date>=d&&e.date<=fin&&agFiltre(e)).sort((a,b)=>(a.date+a.heure).localeCompare(b.date+b.heure));
  if(!evs.length) return `<div style="padding:28px;text-align:center;color:${TH.txt}66;font-size:13px">Aucun événement sur les 30 prochains jours.</div>`;
  const parJour={};evs.forEach(e=>{(parJour[e.date]=parJour[e.date]||[]).push(e);});
  return `<div style="padding:0 18px 16px">${Object.entries(parJour).map(([day,L])=>`
    <div style="font-size:12px;font-weight:800;color:${day===getToday()?TH.c1:TH.txt};text-transform:capitalize;margin:14px 0 6px">${day===getToday()?"Aujourd'hui · ":""}${agLibJour(day)}</div>
    ${L.map(e=>{const st=agStyle(e);const c=e.clientId?CLIENTS.find(x=>x.id===e.clientId):null;const tel=c&&c.tel;
      return `<div style="display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:10px;background:${st.bg};border-left:4px solid ${st.bord};margin-bottom:6px;flex-wrap:wrap">
        <div style="min-width:86px;font-weight:800;font-size:13px;color:${TH.txt}">${agE(e.heure)}–${agE(evFin(e))}</div>
        <div style="flex:1;min-width:160px;cursor:pointer" onclick="modalEvent('${e.id}')">
          <div style="font-weight:700;font-size:13px;color:${TH.txt}">${agE(e.titre||"(sans titre)")}</div>
          <div style="font-size:12px;color:${TH.txt}99">${agE(e.client||"")}${e.adresse?" · 📍 "+agE(e.adresse):""}</div>
        </div>
        <div style="display:flex;gap:4px;align-items:center">${pastillesAssignes(e,20)}
          ${e.adresse?`<button class="btn-sm" onclick="agItineraire('${e.id}')" title="Itinéraire">🧭</button>`:""}
          ${tel?`<a class="btn-sm" href="tel:${agE(String(tel).replace(/[^\d+]/g,""))}" style="text-decoration:none" title="Appeler">📞</a>`:""}
        </div>
      </div>`;}).join("")}`).join("")}</div>`;
}

// Glisser-déposer (vue semaine)
function dragEvent(event,id){event.dataTransfer.setData("evId",id);event.target.style.opacity="0.4";}
function dropEvent(event,newDate){
  event.preventDefault();
  const id=event.dataTransfer.getData("evId");if(!id)return;
  EVENTS=EVENTS.map(e=>e.id===id?{...e,date:newDate}:e);
  renderPage();
}

// ── Fiche événement ──
function modalEvent(id,defaultDate,defaultHeure,defaultClient){
  const cliParDefaut=defaultClient?CLIENTS.find(c=>c.id===defaultClient||c.nom===defaultClient):null;
  const e=id?EVENTS.find(x=>x.id===id):{id:"",type:"rdv",titre:"",client:cliParDefaut?cliParDefaut.nom:(defaultClient||""),clientId:cliParDefaut?cliParDefaut.id:"",adresse:"",date:defaultDate||getToday(),heure:defaultHeure||"09:00",fin:"",assignes:currentUser?[currentUser.id]:[],notes:""};
  if(!e) return;
  const cliDef=!e.clientId&&e.client?CLIENTS.find(c=>c.nom===e.client):null;
  const cid=e.clientId||(cliDef?cliDef.id:"");
  const eq=equipe();
  const types=[["rdv","RDV client"],["chantier","Chantier"],["maintenance",FV("visite").charAt(0).toUpperCase()+FV("visite").slice(1)],["prospection","Prospection"],["autre","Autre"]];
  showModal(id?"Modifier l'événement":"Nouvel événement",`
    <div class="field-row">
      <div class="field"><label>Type</label><select id="e-type">${types.map(([k,l])=>`<option value="${k}"${e.type===k?" selected":""}>${l}</option>`).join("")}</select></div>
      <div class="field"><label>Date</label><input type="date" id="e-date" value="${agE(e.date)}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Début</label><input type="time" id="e-heure" value="${agE(e.heure)}" onchange="agAjusterFin()"/></div>
      <div class="field"><label>Fin</label><input type="time" id="e-fin" value="${agE(evFin(e))}"/></div>
    </div>
    <div class="field"><label>Titre</label><input id="e-titre" value="${agE(e.titre)}" placeholder="Ex : Pose caméras, visite technique…"/></div>
    <div class="field"><label>Client</label>
      <select id="e-cli" onchange="agClientChoisi(this.value)">
        <option value="">— Aucun client / autre —</option>
        ${CLIENTS.slice().sort((a,b)=>(a.nom||"").localeCompare(b.nom||"")).map(c=>`<option value="${c.id}"${c.id===cid?" selected":""}>${agE(c.nom)}</option>`).join("")}
      </select></div>
    <div class="field" id="e-client-wrap" style="${cid?"display:none":""}"><label>Nom (si pas dans la liste)</label><input id="e-client" value="${agE(cid?"":e.client)}" placeholder="Prospect, fournisseur, réunion…"/></div>
    <div class="field"><label>Adresse</label>
      <div style="display:flex;gap:6px"><input id="e-adresse" value="${agE(e.adresse||"")}" placeholder="Adresse du rendez-vous" style="flex:1"/>
      <button type="button" class="btn-sm" onclick="agItineraire(null)" title="Itinéraire">🧭</button></div>
      <div id="e-cli-infos" style="font-size:12px;color:${TH.txt}88;margin-top:5px">${agInfosClient(cid)}</div></div>
    ${eq.length?`<div class="field"><label>Qui intervient</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${eq.map(m=>{const on=(e.assignes||[]).includes(m.id);
        return `<label style="display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:999px;border:1.5px solid ${on?m.couleur:"#e2e8f0"};cursor:pointer;font-size:13px;min-height:40px;box-sizing:border-box;text-transform:none;letter-spacing:normal;font-weight:600;color:#1A2118;margin:0">
          <input type="checkbox" class="e-assigne" value="${m.id}"${on?" checked":""} onchange="this.parentNode.style.borderColor=this.checked?'${m.couleur}':'#e2e8f0'" style="width:18px;height:18px;accent-color:${m.couleur}"/>
          <span style="width:10px;height:10px;border-radius:50%;background:${m.couleur}"></span>${agE(m.nom)}</label>`;}).join("")}</div></div>`:""}
    <div class="field"><label>Notes</label><textarea id="e-notes">${agE(e.notes||"")}</textarea></div>
    ${id?`<button type="button" class="btn-sm" onclick="telechargerICS('${id}')" style="margin-top:2px">📅 Ajouter à mon calendrier</button>`:""}`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     ${id?`<button class="btn-save" style="background:#991b1b;margin-right:auto" onclick="delEvent('${id}')">Supprimer</button>`:""}
     ${id&&e.riId&&INTERVENTIONS.some(r=>r.id===e.riId)?`<button class="btn-cancel" onclick="modalRI('${e.riId}')">🛠️ Voir le rapport</button>`:id&&["chantier","maintenance"].includes(e.type)||id&&e.contratId?`<button class="btn-cancel" onclick="nouveauRIDepuisEvent('${id}')">🛠️ Rapport</button>`:""}
     <button class="btn-save" style="background:${TH.c1}" onclick="saveEvent('${id||""}')">Enregistrer</button>`
  );
  if(!id&&cid) agClientChoisi(cid,true);
}
function agInfosClient(cid){
  const c=cid?CLIENTS.find(x=>x.id===cid):null;if(!c) return "";
  const tel=c.tel?`<a href="tel:${agE(String(c.tel).replace(/[^\d+]/g,""))}" style="color:${TH.c1};font-weight:700">📞 ${agE(c.tel)}</a>`:"";
  return [c.contact?agE(c.contact):"",tel].filter(Boolean).join(" · ");
}
function agClientChoisi(cid,garderAdresse){
  const c=cid?CLIENTS.find(x=>x.id===cid):null;
  const w=document.getElementById("e-client-wrap");if(w)w.style.display=c?"none":"";
  const ad=document.getElementById("e-adresse");
  if(c&&ad&&(!garderAdresse||!ad.value)&&c.adresse) ad.value=c.adresse;
  const inf=document.getElementById("e-cli-infos");if(inf)inf.innerHTML=agInfosClient(cid);
  const t=document.getElementById("e-titre");if(c&&t&&!t.value) t.placeholder="Ex : RDV "+c.nom;
}
function agAjusterFin(){
  const h=document.getElementById("e-heure"),f=document.getElementById("e-fin");if(!h||!f)return;
  if(!f.value||agMin(f.value)<=agMin(h.value)) f.value=agHeure(agMin(h.value)+60);
}
function modalEventDate(date){modalEvent(null,date);}
function saveEvent(id){
  const g=k=>document.getElementById(k);
  const cid=g("e-cli").value;const c=cid?CLIENTS.find(x=>x.id===cid):null;
  const heure=g("e-heure").value||"09:00";let fin=g("e-fin").value;
  if(!fin||agMin(fin)<=agMin(heure)) fin=agHeure(agMin(heure)+60);
  const obj={type:g("e-type").value,titre:g("e-titre").value.trim()||(c?"RDV "+c.nom:""),
    client:c?c.nom:g("e-client").value.trim(),clientId:c?c.id:"",adresse:g("e-adresse").value.trim(),
    date:g("e-date").value||getToday(),heure,fin,
    assignes:Array.from(document.querySelectorAll(".e-assigne:checked")).map(x=>x.value),
    notes:g("e-notes").value};
  if(id){EVENTS=EVENTS.map(e=>e.id===id?{...e,...obj}:e);}else{EVENTS.push({...obj,id:uid()});}
  closeModal();renderPage();
}
function delEvent(id){if(!confirm("Supprimer cet événement ?"))return;EVENTS=EVENTS.filter(e=>e.id!==id);closeModal();renderPage();}

// ── Itinéraire ──
function agItineraire(id){
  const e=id?EVENTS.find(x=>x.id===id):null;
  const adr=e?e.adresse:(document.getElementById("e-adresse")||{}).value;
  if(!adr||!String(adr).trim()){alert("Indiquez d'abord une adresse.");return;}
  const q=encodeURIComponent(String(adr).trim());
  const liens=[["🍎 Plans (Apple)",`https://maps.apple.com/?daddr=${q}`],["🗺️ Google Maps",`https://www.google.com/maps/dir/?api=1&destination=${q}`],["🚗 Waze",`https://waze.com/ul?q=${q}&navigate=yes`]];
  const html=`<div id="ag-iti" style="position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:10050;display:flex;align-items:flex-end;justify-content:center" onclick="if(event.target===this)this.remove()">
    <div style="background:#fff;border-radius:16px 16px 0 0;padding:18px 18px 26px;width:100%;max-width:440px;box-sizing:border-box">
      <div style="font-weight:800;font-size:15px;margin-bottom:4px">Itinéraire</div>
      <div style="font-size:12.5px;color:#64748b;margin-bottom:14px">${agE(adr)}</div>
      ${liens.map(([l,u])=>`<a href="${u}" target="_blank" rel="noopener" onclick="document.getElementById('ag-iti').remove()" style="display:block;padding:13px 14px;border-radius:10px;border:1.5px solid #e2e8f0;margin-bottom:8px;text-decoration:none;color:#1A2118;font-weight:700;font-size:14px">${l}</a>`).join("")}
      <button onclick="document.getElementById('ag-iti').remove()" style="width:100%;padding:12px;border-radius:10px;border:none;background:#f1f5f9;font-weight:700;font-size:14px;cursor:pointer;font-family:'Inter',sans-serif">Annuler</button>
    </div></div>`;
  document.body.insertAdjacentHTML("beforeend",html);
}

// ── Calendrier du téléphone ──
function icsEsc(s){return String(s==null?"":s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");}
function icsUTC(date,heure){const d=new Date(date+"T"+(heure||"09:00")+":00");return d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");}
function icsEvenement(e){
  const ent=((TH.nom||"")+" "+(TH.sous||"")).trim();
  const qui=(e.assignes||[]).map(id=>membre(id)).filter(Boolean).map(m=>m.nom).join(", ");
  const desc=[e.client?"Client : "+e.client:"",qui?"Intervenant(s) : "+qui:"",e.notes||""].filter(Boolean).join("\n");
  return ["BEGIN:VEVENT",`UID:${e.id}@admanagement`,`DTSTAMP:${icsUTC(getToday(),"00:00")}`,
    `DTSTART:${icsUTC(e.date,e.heure)}`,`DTEND:${icsUTC(e.date,evFin(e))}`,
    `SUMMARY:${icsEsc(e.titre||"Rendez-vous")}`,e.adresse?`LOCATION:${icsEsc(e.adresse)}`:"",desc?`DESCRIPTION:${icsEsc(desc)}`:"",
    `ORGANIZER;CN=${icsEsc(ent||"AD Management")}:mailto:${TH.email||"contact@adsecureconcept.fr"}`,
    "BEGIN:VALARM","ACTION:DISPLAY","TRIGGER:-PT30M",`DESCRIPTION:${icsEsc(e.titre||"Rendez-vous")}`,"END:VALARM","END:VEVENT"].filter(Boolean).join("\r\n");
}
function telechargerICS(id){
  const e=EVENTS.find(x=>x.id===id);if(!e)return;
  const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//AD Management//Agenda//FR","CALSCALE:GREGORIAN","METHOD:PUBLISH",icsEvenement(e),"END:VCALENDAR"].join("\r\n");
  const url=URL.createObjectURL(new Blob([ics],{type:"text/calendar;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download=(e.titre||"rendez-vous").replace(/[^\w\- ]+/g,"").slice(0,40)+".ics";
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);
}
// Abonnement : lien privé par utilisateur, lu par la fonction Supabase « agenda-ics »
const ICS_FONCTION="https://tcszogqlvqpxrtdirkto.supabase.co/functions/v1/agenda-ics";
function icsLien(tok){return ICS_FONCTION+"?t="+tok+(AD_TEST?"&test=1":"");}
function monJetonICS(){
  if(!currentUser) return null;
  const T=TH.icsTokens||{};
  return Object.keys(T).find(k=>T[k]&&T[k].uid===currentUser.id)||null;
}
function modalSynchroAgenda(){
  const tok=monJetonICS();const T=tok?TH.icsTokens[tok]:null;
  const lien=tok?icsLien(tok):"";
  const webcal=lien.replace(/^https:/,"webcal:");
  showModal("📲 Voir l'agenda sur votre téléphone",`
    <p style="font-size:13.5px;color:#475569;line-height:1.6;margin:0 0 12px">Abonnez votre calendrier (iPhone, iPad, Google Agenda) à votre agenda AD Management. Les rendez-vous s'y ajoutent et se mettent à jour tout seuls, avec un rappel 30 minutes avant.</p>
    ${tok?`
      <div class="field"><label>Ce que le calendrier affiche</label>
        <select id="ics-portee" onchange="changerPorteeICS(this.value)">
          <option value="moi"${T.portee!=="tous"?" selected":""}>Mes rendez-vous (et ceux sans intervenant)</option>
          <option value="tous"${T.portee==="tous"?" selected":""}>Tous les rendez-vous de l'équipe</option>
        </select></div>
      <a href="${agE(webcal)}" style="display:block;text-align:center;padding:13px;border-radius:10px;background:${TH.c1};color:#fff;font-weight:800;text-decoration:none;font-size:14px;margin-bottom:10px">📅 S'abonner sur cet appareil (iPhone / iPad)</a>
      <div class="field"><label>Lien pour Google Agenda ou un autre appareil</label>
        <div style="display:flex;gap:6px"><input id="ics-lien" value="${agE(lien)}" readonly style="flex:1;font-size:12px"/>
        <button type="button" class="btn-sm" onclick="const i=document.getElementById('ics-lien');i.select();try{navigator.clipboard.writeText(i.value);this.textContent='✓ Copié';}catch(e){document.execCommand('copy');}">Copier</button></div>
        <div style="font-size:11.5px;color:#64748b;margin-top:6px">Google Agenda (sur ordinateur) : Autres agendas → ＋ → À partir de l'URL → collez ce lien. Le calendrier se met à jour toutes les quelques heures selon l'application.</div></div>
      <div style="font-size:11.5px;color:#92400e;background:#fffbeb;border:1.5px solid #fde68a;border-radius:9px;padding:9px 11px">Ce lien est personnel : toute personne qui l'a peut voir vos rendez-vous. En cas de doute, créez-en un nouveau (l'ancien cessera de fonctionner).</div>`
    :`<button type="button" onclick="creerJetonICS()" style="width:100%;padding:13px;border-radius:10px;border:none;background:${TH.c1};color:#fff;font-weight:800;font-size:14px;cursor:pointer;font-family:'Inter',sans-serif">Créer mon lien d'abonnement</button>`}`,
    `${tok?`<button class="btn-cancel" style="color:#991b1b;border-color:#fecaca;margin-right:auto" onclick="creerJetonICS(true)">Nouveau lien</button>`:""}
     <button class="btn-cancel" onclick="closeModal()">Fermer</button>`);
}
function creerJetonICS(remplacer){
  if(!currentUser) return;
  if(remplacer&&!confirm("Créer un nouveau lien ? L'ancien cessera de fonctionner sur les appareils abonnés.")) return;
  const T=Object.assign({},TH.icsTokens||{});
  let portee="moi";
  Object.keys(T).forEach(k=>{if(T[k]&&T[k].uid===currentUser.id){portee=T[k].portee||portee;delete T[k];}});
  const a=new Uint8Array(24);crypto.getRandomValues(a);
  const tok=Array.from(a,b=>b.toString(16).padStart(2,"0")).join("");
  T[tok]={uid:currentUser.id,nom:currentUser.nom||"",portee,cree:getToday()};
  TH.icsTokens=T;saveData();modalSynchroAgenda();
}
function changerPorteeICS(v){const tok=monJetonICS();if(!tok)return;TH.icsTokens[tok].portee=v==="tous"?"tous":"moi";saveData();}


// ════════════════════════════════════════════════════════
