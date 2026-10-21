// ── DEVIS SIGNÉS (fichiers stockés dans Supabase Storage) ──
// ══════════════════════════════════════════════════════════
// Les fichiers vont dans le bucket privé "devis-signes", dossier = tenant_id.
// Seules les métadonnées (nom, chemin, date, devis lié) sont enregistrées dans la fiche client.
const DOCS_BUCKET="devis-signes";
const DOCS_MAX_MO=10;

function fTaille(o){ if(!o) return ""; return o>1048576?(o/1048576).toFixed(1)+" Mo":Math.round(o/1024)+" Ko"; }

function renderDocsSignesSection(c){
  const docs=(c.docsSignes||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  return `<div class="section-card" style="background:${TH.card}">
    <div class="section-head">
      <div><div class="section-title" style="color:${TH.txt}">✍️ Devis signés</div><div class="section-sub">${docs.length} document(s)</div></div>
      <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="modalDocSigne('${c.id}','')">＋ Ajouter un devis signé</button>
    </div>
    ${docs.length===0?`<div style="padding:28px;text-align:center;color:${TH.txt}66;font-size:13px">Aucun devis signé pour ce client.<br/>Photographiez ou importez le devis signé (PDF ou photo).</div>`:
    docs.map(x=>`<div style="padding:12px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="font-size:22px">${(x.type||"").startsWith("image/")?"🖼️":"📄"}</span>
      <div style="flex:1;min-width:180px">
        <div style="font-weight:700;font-size:13px;color:${TH.txt}">${x.devisNum?x.devisNum+" — ":""}${x.nom||"Document"}</div>
        <div style="font-size:11px;color:${TH.txt}77">Signé le ${fDate(x.dateSignature||x.date)} · ajouté le ${fDate(x.date)}${x.taille?" · "+fTaille(x.taille):""}</div>
        ${x.note?`<div style="font-size:11px;color:${TH.txt}88;font-style:italic;margin-top:2px">${x.note}</div>`:""}
      </div>
      <div style="display:flex;gap:5px;flex-shrink:0">
        <button class="btn-sm" onclick="voirDocSigne('${c.id}','${x.id}')" title="Voir" style="border-color:#93c5fd;background:#eff6ff;color:#1d4ed8">👁️</button>
        <button class="btn-sm btn-danger" onclick="supprDocSigne('${c.id}','${x.id}')" title="Supprimer">🗑️</button>
      </div>
    </div>`).join("")}
  </div>`;
}

function modalDocSigne(clientId,devisId){
  const c=CLIENTS.find(x=>x.id===clientId); if(!c) return;
  const devisClient=DEVIS.filter(d=>d.clientId===c.id).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const opts=`<option value="">— Aucun (devis hors application) —</option>`+
    devisClient.map(d=>`<option value="${d.id}" ${d.id===devisId?"selected":""}>${d.num} · ${fMoney(devisTTC(d))} · ${fDate(d.date)}</option>`).join("");
  showModal("Ajouter un devis signé",`
    <div class="field"><label>Devis concerné</label><select id="ds-devis">${opts}</select></div>
    <div class="field"><label>Date de signature</label><input type="date" id="ds-date" value="${getToday()}"/></div>
    <div class="field"><label>Fichier (PDF ou photo, ${DOCS_MAX_MO} Mo max)</label>
      <input type="file" id="ds-file" accept="application/pdf,image/*"/></div>
    <div class="field"><label>Note (optionnel)</label><input id="ds-note" placeholder="Ex : signé sur place, acompte versé…"/></div>
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-top:4px"><input type="checkbox" id="ds-accepte" checked/> Marquer le devis comme « Accepté »</label>
    <div id="ds-msg" style="display:none;margin-top:12px;padding:10px 12px;border-radius:9px;font-size:13px"></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" id="ds-btn" style="background:${TH.c1}" onclick="saveDocSigne('${c.id}')">📎 Enregistrer</button>`);
}

function dsMsg(t,ok){const b=document.getElementById("ds-msg");if(!b)return;b.style.display="block";b.textContent=t;
  b.style.background=ok?"#f0fdf4":"#fef2f2";b.style.color=ok?"#15803d":"#991b1b";b.style.border="1.5px solid "+(ok?"#86efac":"#fca5a5");}

async function saveDocSigne(clientId){
  const c=CLIENTS.find(x=>x.id===clientId); if(!c) return;
  const f=document.getElementById("ds-file").files[0];
  if(!f){dsMsg("Choisissez un fichier.");return;}
  if(f.size>DOCS_MAX_MO*1048576){dsMsg(`Fichier trop lourd (${fTaille(f.size)}). Maximum ${DOCS_MAX_MO} Mo.`);return;}
  if(!currentUser||!currentUser.tenant_id){dsMsg("Session invalide, reconnectez-vous.");return;}
  const devisId=document.getElementById("ds-devis").value;
  const d=DEVIS.find(x=>x.id===devisId);
  const btn=document.getElementById("ds-btn"); if(btn){btn.disabled=true;btn.textContent="⟳ Envoi…";}
  const ext=(f.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"");
  const id=uid();
  const path=`${currentUser.tenant_id}/${c.id}/${id}.${ext}`;
  try{
    const {error}=await sbClient.storage.from(DOCS_BUCKET).upload(path,f,{contentType:f.type||"application/octet-stream",upsert:false});
    if(error) throw error;
    c.docsSignes=c.docsSignes||[];
    c.docsSignes.push({id,devisId:d?d.id:"",devisNum:d?d.num:"",path,nom:f.name,type:f.type,taille:f.size,
      date:getToday(),dateSignature:document.getElementById("ds-date").value||getToday(),
      note:document.getElementById("ds-note").value.trim()});
    if(d&&document.getElementById("ds-accepte").checked&&["brouillon","envoye","expire"].includes(d.statut)) d.statut="accepte";
    logActivity("Devis signé ajouté",`${c.nom}${d?" — "+d.num:""} (${f.name})`);
    saveData(); closeModal(); renderPage();
  }catch(e){
    dsMsg("Envoi impossible : "+(e.message||e)+" — vérifiez que le stockage « devis-signes » est bien créé dans Supabase.");
    if(btn){btn.disabled=false;btn.textContent="📎 Enregistrer";}
  }
}

async function voirDocSigne(clientId,docId){
  const c=CLIENTS.find(x=>x.id===clientId); const x=c&&(c.docsSignes||[]).find(y=>y.id===docId); if(!x) return;
  showModal("Devis signé",`<div style="padding:30px;text-align:center;color:#64748b">⟳ Ouverture…</div>`,`<button class="btn-cancel" onclick="closeModal()">Fermer</button>`);
  const {data,error}=await sbClient.storage.from(DOCS_BUCKET).createSignedUrl(x.path,3600);
  if(error||!data){showModal("Devis signé",`<div style="color:#991b1b">Impossible d'ouvrir le document : ${error?error.message:"introuvable"}</div>`,`<button class="btn-cancel" onclick="closeModal()">Fermer</button>`);return;}
  const url=data.signedUrl;
  const apercu=(x.type||"").startsWith("image/")
    ?`<img src="${url}" style="max-width:100%;border-radius:10px;border:1px solid #e2e8f0"/>`
    :`<div style="padding:18px;text-align:center;font-size:40px">📄</div>`;
  showModal(x.devisNum||"Devis signé",`
    <div style="font-size:13px;margin-bottom:10px"><strong>${x.nom}</strong><br/><span style="color:#64748b">Signé le ${fDate(x.dateSignature||x.date)}</span></div>
    ${apercu}`,
    `<button class="btn-cancel" onclick="closeModal()">Fermer</button>
     <a href="${url}" target="_blank" rel="noopener" style="padding:9px 18px;border-radius:8px;background:${TH.c1};color:#fff;font-weight:700;font-size:13px;text-decoration:none">↗️ Ouvrir / Télécharger</a>`);
}

function supprDocSigne(clientId,docId){
  const c=CLIENTS.find(x=>x.id===clientId); const x=c&&(c.docsSignes||[]).find(y=>y.id===docId); if(!x) return;
  if(!confirm(`Supprimer définitivement « ${x.nom} » ?`)) return;
  sbClient.storage.from(DOCS_BUCKET).remove([x.path]).then(({error})=>{
    if(error){alert("Suppression impossible : "+error.message);return;}
    c.docsSignes=c.docsSignes.filter(y=>y.id!==docId);
    logActivity("Devis signé supprimé",`${c.nom} — ${x.nom}`);
    saveData(); renderPage();
  });
}
window.modalDocSigne=modalDocSigne; window.saveDocSigne=saveDocSigne; window.voirDocSigne=voirDocSigne; window.supprDocSigne=supprDocSigne;

// ══════════════════════════════════════════════════════════
// ── CONTRATS DE MAINTENANCE SIGNÉS ─────────────────────────
// ══════════════════════════════════════════════════════════
// Même bucket privé que les devis signés (chemin tenant_id/client_id/contrat-xxx.ext,
// donc mêmes règles d'accès). Métadonnées dans c.contratsSignes.
const CONTRAT_DUREE_MOIS=60;
const CONTRAT_NB_VISITES=10; // 2 visites / an pendant 60 mois
function ctrYMD(x){ return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0"); }
// Même quantième n mois plus tard (ramené au dernier jour du mois si besoin)
function ctrShiftMonths(d,n){ if(!d) return ""; const x=new Date(d+"T12:00:00"); const j=x.getDate(); x.setDate(1); x.setMonth(x.getMonth()+n); const dernier=new Date(x.getFullYear(),x.getMonth()+1,0,12).getDate(); x.setDate(Math.min(j,dernier)); return ctrYMD(x); }
// Dernier jour d'une période de n mois commençant le jour d
function ctrAddMonths(d,n){ if(!d) return ""; const x=new Date(d+"T12:00:00"); const j=x.getDate(); x.setDate(1); x.setMonth(x.getMonth()+n); const dernier=new Date(x.getFullYear(),x.getMonth()+1,0,12).getDate(); if(j>dernier){ x.setDate(dernier); } else { x.setDate(j); x.setDate(x.getDate()-1); } return ctrYMD(x); }
// Échéance de la période en cours (période ferme de 60 mois, puis reconductions de 12 mois)
function ctrEcheance(x){
  let fin=x.dateFin; if(!fin) return "";
  for(let i=0;i<30&&!x.resilie&&fin<getToday();i++) fin=ctrAddMonths(addDays(fin,1),12);
  return fin;
}
// Information obligatoire avant reconduction (art. L. 215-1 C. conso) — contrats particuliers.
// Date limite de refus = 1 mois avant l'échéance (art. 2 du contrat). Le courrier part
// au plus tôt 3 mois et au plus tard 1 mois avant cette date limite.
function ctrInfoL215(x){
  if(x.version!=="part"||x.resilie||!x.dateFin) return null;
  const ech=ctrEcheance(x);
  const limite=ctrShiftMonths(ech,-1);
  const debut=ctrShiftMonths(limite,-3), fin=ctrShiftMonths(limite,-1);
  const envoye=(x.infoReconduction||{})[ech];
  const t=getToday();
  const o={ech,limite,debut,fin,envoye};
  if(envoye) return {...o,etat:"envoye"};
  if(t<ctrShiftMonths(debut,-1)) return null;
  if(t<debut) return {...o,etat:"bientot"};
  if(t<=fin) return {...o,etat:"afaire"};
  return {...o,etat:"retard"};
}
function contratStatut(x){
  if(x.resilie) return ["#f1f5f9","#64748b","Résilié"];
  const ech=ctrEcheance(x);
  if(daysDiff(ech)<=90) return ["#fffbeb","#b45309","Échéance proche"];
  if(x.dateFin<getToday()) return ["#eff6ff","#1d4ed8","Reconduit"];
  return ["#f0fdf4","#15803d","En cours"];
}
function contratsAlertesL215(){
  const out=[];
  CLIENTS.forEach(c=>(c.contratsSignes||[]).forEach(x=>{const info=ctrInfoL215(x); if(info&&(info.etat==="afaire"||info.etat==="retard")) out.push({c,x,info});}));
  return out.sort((a,b)=>a.info.fin.localeCompare(b.info.fin));
}

// ── Visites préventives au Planning ──
function ctrJourOuvre(d){ const w=new Date(d+"T12:00:00").getDay(); return w===6?addDays(d,2):(w===0?addDays(d,1):d); }
function visitesContrat(x){ return EVENTS.filter(e=>e.contratId===x.id).sort((a,b)=>a.date.localeCompare(b.date)); }
// Visites à 3, 9, 15… 57 mois : 10 visites espacées de 6 mois, toutes dans la période ferme
function planifierVisitesContrat(c,x,depuis){
  let n=0;
  for(let k=1;k<=CONTRAT_NB_VISITES;k++){
    const d=ctrJourOuvre(ctrShiftMonths(x.dateSignature,6*k-3));
    if(depuis&&d<depuis) continue;
    if(EVENTS.some(e=>e.contratId===x.id&&e.visiteNum===k)) continue;
    EVENTS.push({id:uid(),type:"maintenance",titre:`Visite préventive ${k}/${CONTRAT_NB_VISITES}`,client:c.nom,date:d,heure:"09:00",
      notes:`${FV("contrat")}${x.forfaitLabel?" "+x.forfaitLabel:""}${c.adresse?" — "+c.adresse:""}`,contratId:x.id,clientId:c.id,visiteNum:k});
    n++;
  }
  return n;
}
function supprimerVisitesFutures(x){ const avant=EVENTS.length; EVENTS=EVENTS.filter(e=>!(e.contratId===x.id&&e.date>=getToday())); return avant-EVENTS.length; }
function planifierVisitesBtn(clientId,docId){
  const c=CLIENTS.find(y=>y.id===clientId); const x=c&&(c.contratsSignes||[]).find(y=>y.id===docId); if(!x) return;
  const n=planifierVisitesContrat(c,x,getToday());
  logActivity("Visites planifiées",`${c.nom} — ${n} visite(s)`);
  saveData(); renderPage();
  alert(n?`${n} visite(s) préventive(s) ajoutée(s) au Planning.`:"Toutes les visites à venir sont déjà au Planning.");
}

function renderContratL215Box(c,x){
  const i=ctrInfoL215(x); if(!i) return "";
  if(i.etat==="envoye") return `<div style="font-size:11px;color:#15803d;margin-top:3px">✉️ Courrier de reconduction envoyé le ${fDate(i.envoye)} (échéance du ${fDate(i.ech)})</div>`;
  const st={
    bientot:["#eff6ff","#93c5fd","#1e40af",`✉️ Courrier de reconduction à envoyer entre le ${fDate(i.debut)} et le ${fDate(i.fin)}`],
    afaire:["#fffbeb","#fcd34d","#92400e",`✉️ Courrier de reconduction à envoyer avant le ${fDate(i.fin)} (obligation légale)`],
    retard:["#fef2f2","#fca5a5","#991b1b",`⚠️ Courrier de reconduction non envoyé dans les délais : sans lui, le client pourra résilier sans frais à tout moment après le ${fDate(i.ech)}. Envoyez-le au plus vite.`],
  }[i.etat];
  return `<div style="background:${st[0]};border:1.5px solid ${st[1]};color:${st[2]};border-radius:9px;padding:8px 10px;font-size:12px;margin-top:6px">
    ${st[3]}<div style="font-size:11px;opacity:.85;margin-top:2px">Date limite de refus par le client : ${fDate(i.limite)} · échéance : ${fDate(i.ech)}</div>
    <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
      <button class="btn-sm" style="border-color:${st[1]};background:#fff;color:${st[2]};width:auto;padding:4px 10px" onclick="genererCourrierReconduction('${c.id}','${x.id}')">📄 Préparer le courrier</button>
      ${i.etat!=="bientot"?`<button class="btn-sm" style="border-color:#86efac;background:#f0fdf4;color:#15803d;width:auto;padding:4px 10px" onclick="marquerInfoEnvoyee('${c.id}','${x.id}')">✓ Marquer envoyé</button>`:""}
    </div>
  </div>`;
}

function renderContratsSignesSection(c){
  const list=(c.contratsSignes||[]).slice().sort((a,b)=>(b.dateSignature||"").localeCompare(a.dateSignature||""));
  return `<div class="section-card" style="background:${TH.card};margin-bottom:20px">
    <div class="section-head">
      <div><div class="section-title" style="color:${TH.txt}">📑 ${FV("contrats")} signés</div><div class="section-sub">${list.length} contrat(s)</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn-add" style="background:#6d28d910;color:#6d28d9;border:1.5px solid #6d28d933" onclick="modalContrat('${c.id}')">📄 Générer</button>
        <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="modalContratSigne('${c.id}')">＋ Ajouter un contrat signé</button>
      </div>
    </div>
    ${list.length===0?`<div style="padding:28px;text-align:center;color:${TH.txt}66;font-size:13px">Aucun contrat signé pour ce client.<br/>Photographiez ou importez le contrat signé (PDF ou photo).</div>`:
    list.map(x=>{
      const [bg,col,lbl]=contratStatut(x);
      const ech=ctrEcheance(x);
      const vis=visitesContrat(x);
      const proch=vis.find(e=>e.date>=getToday());
      const peutPlanifier=!x.resilie&&vis.length<CONTRAT_NB_VISITES&&x.dateFin>=getToday();
      return `<div style="padding:12px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <span style="font-size:22px">${(x.type||"").startsWith("image/")?"🖼️":"📑"}</span>
      <div style="flex:1;min-width:200px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap">
          <span style="font-weight:700;font-size:13px;color:${TH.txt}">${ctrEsc(x.forfaitLabel||"Contrat")} · ${fMoney(x.prixHT||0)} HT/mois</span>
          ${badge(lbl,bg,col)}
        </div>
        <div style="font-size:11px;color:${TH.txt}77">${x.version==="pro"?"Pro":"Particulier"} · du ${fDate(x.dateSignature)} au ${fDate(x.dateFin)}${!x.resilie&&ech!==x.dateFin?` · reconduit jusqu'au ${fDate(ech)}`:""}${x.taille?" · "+fTaille(x.taille):""}</div>
        <div style="font-size:11px;color:${TH.txt}77;margin-top:2px">📅 ${vis.length} visite(s) au Planning${proch?` · prochaine le ${fDate(proch.date)}`:""}
          ${peutPlanifier?` · <button style="border:none;background:none;color:${TH.c1};text-decoration:underline;cursor:pointer;font:inherit;padding:0" onclick="planifierVisitesBtn('${c.id}','${x.id}')">planifier les visites manquantes</button>`:""}</div>
        ${x.note?`<div style="font-size:11px;color:${TH.txt}88;font-style:italic;margin-top:2px">${ctrEsc(x.note)}</div>`:""}
        ${renderContratL215Box(c,x)}
      </div>
      <div style="display:flex;gap:5px;flex-shrink:0">
        <button class="btn-sm" onclick="voirContratSigne('${c.id}','${x.id}')" title="Voir" style="border-color:#93c5fd;background:#eff6ff;color:#1d4ed8">👁️</button>
        <button class="btn-sm" onclick="toggleResilContrat('${c.id}','${x.id}')" title="${x.resilie?"Réactiver":"Marquer résilié"}" style="border-color:#e2e8f0;background:#f8fafc;color:#64748b">${x.resilie?"↺":"⏹️"}</button>
        <button class="btn-sm btn-danger" onclick="supprContratSigne('${c.id}','${x.id}')" title="Supprimer">🗑️</button>
      </div>
    </div>`;}).join("")}
  </div>`;
}
function modalContratSigne(clientId){
  const c=CLIENTS.find(x=>x.id===clientId); if(!c) return;
  const forfaits=TH.contratForfaits||[];
  const autoId=contratForfaitAuto(c.nbCameras);
  showModal("Ajouter un contrat signé",`
    <div class="field-row">
      <div class="field"><label>Version</label><select id="cs-version">
        <option value="part"${c.cat!=="Pro"?" selected":""}>Particulier</option>
        <option value="pro"${c.cat==="Pro"?" selected":""}>Professionnel</option>
      </select></div>
      <div class="field"><label>Date de signature</label><input type="date" id="cs-date" value="${getToday()}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Forfait</label><select id="cs-forfait">
        ${forfaits.map(f=>`<option value="${f.id}"${f.id===autoId?" selected":""}>${f.label} — ${f.prix} € HT</option>`).join("")}
      </select></div>
      <div class="field"><label>Mensualité HT (si différente)</label><input type="number" min="0" step="0.01" id="cs-prix" placeholder="Vide = tarif du forfait"/></div>
    </div>
    <div class="field"><label>Fichier (PDF ou photo, ${DOCS_MAX_MO} Mo max)</label>
      <input type="file" id="cs-file" accept="application/pdf,image/*"/></div>
    <div class="field"><label>Note (optionnel)</label><input id="cs-note" placeholder="Ex : signé sur place, mandat SEPA remis…"/></div>
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-top:4px"><input type="checkbox" id="cs-visites" checked/> Planifier les ${CONTRAT_NB_VISITES} visites préventives au Planning (tous les 6 mois)</label>
    <div id="cs-msg" style="display:none;margin-top:12px;padding:10px 12px;border-radius:9px;font-size:13px"></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" id="cs-btn" style="background:${TH.c1}" onclick="saveContratSigne('${c.id}')">📎 Enregistrer</button>`);
}
function csMsg(t,ok){const b=document.getElementById("cs-msg");if(!b)return;b.style.display="block";b.textContent=t;
  b.style.background=ok?"#f0fdf4":"#fef2f2";b.style.color=ok?"#15803d":"#991b1b";b.style.border="1.5px solid "+(ok?"#86efac":"#fca5a5");}
async function saveContratSigne(clientId){
  const c=CLIENTS.find(x=>x.id===clientId); if(!c) return;
  const f=document.getElementById("cs-file").files[0];
  if(!f){csMsg("Choisissez un fichier.");return;}
  if(f.size>DOCS_MAX_MO*1048576){csMsg(`Fichier trop lourd (${fTaille(f.size)}). Maximum ${DOCS_MAX_MO} Mo.`);return;}
  if(!currentUser||!currentUser.tenant_id){csMsg("Session invalide, reconnectez-vous.");return;}
  const dateSignature=document.getElementById("cs-date").value||getToday();
  const forfait=(TH.contratForfaits||[]).find(x=>x.id===document.getElementById("cs-forfait").value);
  const prixSaisi=document.getElementById("cs-prix").value;
  const avecVisites=document.getElementById("cs-visites").checked;
  const btn=document.getElementById("cs-btn"); if(btn){btn.disabled=true;btn.textContent="⟳ Envoi…";}
  const ext=(f.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"");
  const id=uid();
  const path=`${currentUser.tenant_id}/${c.id}/contrat-${id}.${ext}`;
  try{
    const {error}=await sbClient.storage.from(DOCS_BUCKET).upload(path,f,{contentType:f.type||"application/octet-stream",upsert:false});
    if(error) throw error;
    c.contratsSignes=c.contratsSignes||[];
    const x={id,path,nom:f.name,type:f.type,taille:f.size,date:getToday(),
      version:document.getElementById("cs-version").value,
      forfaitId:forfait?forfait.id:"",forfaitLabel:forfait?forfait.label:"",
      prixHT:prixSaisi!==""?Number(prixSaisi):(forfait?forfait.prix:0),
      dateSignature,dateFin:ctrAddMonths(dateSignature,CONTRAT_DUREE_MOIS),resilie:false,infoReconduction:{},
      note:document.getElementById("cs-note").value.trim()};
    c.contratsSignes.push(x);
    const n=avecVisites?planifierVisitesContrat(c,x,getToday()):0;
    logActivity("Contrat signé ajouté",`${c.nom}${forfait?" — "+forfait.label:""} (${f.name})${n?` · ${n} visite(s) planifiée(s)`:""}`);
    saveData(); closeModal(); renderPage();
  }catch(e){
    csMsg("Envoi impossible : "+(e.message||e)+" — vérifiez que le stockage « devis-signes » est bien créé dans Supabase.");
    if(btn){btn.disabled=false;btn.textContent="📎 Enregistrer";}
  }
}
async function voirContratSigne(clientId,docId){
  const c=CLIENTS.find(x=>x.id===clientId); const x=c&&(c.contratsSignes||[]).find(y=>y.id===docId); if(!x) return;
  showModal("Contrat signé",`<div style="padding:30px;text-align:center;color:#64748b">⟳ Ouverture…</div>`,`<button class="btn-cancel" onclick="closeModal()">Fermer</button>`);
  const {data,error}=await sbClient.storage.from(DOCS_BUCKET).createSignedUrl(x.path,3600);
  if(error||!data){showModal("Contrat signé",`<div style="color:#991b1b">Impossible d'ouvrir le document : ${error?error.message:"introuvable"}</div>`,`<button class="btn-cancel" onclick="closeModal()">Fermer</button>`);return;}
  const url=data.signedUrl;
  const apercu=(x.type||"").startsWith("image/")
    ?`<img src="${url}" style="max-width:100%;border-radius:10px;border:1px solid #e2e8f0"/>`
    :`<div style="padding:18px;text-align:center;font-size:40px">📑</div>`;
  showModal(`Contrat ${ctrEsc(x.forfaitLabel||"")}`,`
    <div style="font-size:13px;margin-bottom:10px"><strong>${ctrEsc(x.nom)}</strong><br/><span style="color:#64748b">Du ${fDate(x.dateSignature)} au ${fDate(x.dateFin)} · ${fMoney(x.prixHT||0)} HT/mois</span></div>
    ${apercu}`,
    `<button class="btn-cancel" onclick="closeModal()">Fermer</button>
     <a href="${url}" target="_blank" rel="noopener" style="padding:9px 18px;border-radius:8px;background:${TH.c1};color:#fff;font-weight:700;font-size:13px;text-decoration:none">↗️ Ouvrir / Télécharger</a>`);
}
function toggleResilContrat(clientId,docId){
  const c=CLIENTS.find(x=>x.id===clientId); const x=c&&(c.contratsSignes||[]).find(y=>y.id===docId); if(!x) return;
  if(!x.resilie&&!confirm("Marquer ce contrat comme résilié ? Les visites à venir seront retirées du Planning.")) return;
  x.resilie=!x.resilie;
  const n=x.resilie?supprimerVisitesFutures(x):planifierVisitesContrat(c,x,getToday());
  logActivity(x.resilie?"Contrat résilié":"Contrat réactivé",`${c.nom} — ${x.forfaitLabel||""}${n?` (${n} visite(s) ${x.resilie?"retirée(s)":"replanifiée(s)"})`:""}`);
  saveData(); renderPage();
}
function supprContratSigne(clientId,docId){
  const c=CLIENTS.find(x=>x.id===clientId); const x=c&&(c.contratsSignes||[]).find(y=>y.id===docId); if(!x) return;
  if(!confirm(`Supprimer définitivement « ${x.nom} » ? Les visites à venir seront retirées du Planning.`)) return;
  sbClient.storage.from(DOCS_BUCKET).remove([x.path]).then(({error})=>{
    if(error){alert("Suppression impossible : "+error.message);return;}
    c.contratsSignes=c.contratsSignes.filter(y=>y.id!==docId);
    supprimerVisitesFutures(x);
    logActivity("Contrat signé supprimé",`${c.nom} — ${x.nom}`);
    saveData(); renderPage();
  });
}

// ── Courrier d'information avant reconduction (art. L. 215-1 C. conso) ──
function marquerInfoEnvoyee(clientId,docId){
  const c=CLIENTS.find(y=>y.id===clientId); const x=c&&(c.contratsSignes||[]).find(y=>y.id===docId); if(!x) return;
  const i=ctrInfoL215(x); if(!i) return;
  const d=prompt("Date d'envoi du courrier (JJ/MM/AAAA) :",fDate(getToday()));
  if(d===null) return;
  const m=d.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso=m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:getToday();
  x.infoReconduction=x.infoReconduction||{};
  x.infoReconduction[i.ech]=iso;
  logActivity("Courrier de reconduction envoyé",`${c.nom} — échéance du ${fDate(i.ech)}`);
  saveData(); renderPage();
}
function genererCourrierReconduction(clientId,docId){
  const c=CLIENTS.find(y=>y.id===clientId); const x=c&&(c.contratsSignes||[]).find(y=>y.id===docId); if(!x) return;
  const i=ctrInfoL215(x); if(!i) return;
  const prest=`${TH.nom} ${TH.sous}`.trim();
  const contactPrest=[TH.contratSiege,TH.tel,TH.email].filter(Boolean).map(ctrEsc).join("<br/>");
  const moyens=`par lettre recommandée avec accusé de réception adressée à ${ctrEsc(prest)}, ${ctrEsc(TH.contratSiege)}${TH.email?`, ou par courrier électronique à ${ctrEsc(TH.email)}`:""}`;
  const doc=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Information reconduction — ${ctrEsc(c.nom)}</title>
  <style>
    @page{size:A4;margin:0}
    *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1A2118;padding:50px 60px;font-size:13px;line-height:1.6}
    .exp{margin-bottom:34px}.exp .nom{font-weight:800;font-size:16px;color:${TH.sidebar}}
    .dest{margin-left:55%;margin-bottom:34px}
    .date{text-align:right;margin-bottom:24px}
    .objet{font-weight:700;margin-bottom:22px}
    p{margin-bottom:12px;text-align:justify}
    .encadre{border:3px solid ${TH.c1};border-radius:8px;padding:16px 20px;margin:20px 0;text-align:center}
    .encadre .lbl{font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:${TH.c1}}
    .encadre .dt{font-size:22px;font-weight:800;margin-top:4px}
    .sign{margin-top:36px;margin-left:55%}
    @media print{body{padding:40px 50px}}
  </style></head><body>
    <div class="exp"><div class="nom">${ctrEsc(prest)}</div><div>${contactPrest}</div></div>
    <div class="dest"><strong>${ctrEsc(c.nom)}</strong><br/>${ctrEsc(c.adresse||"")}</div>
    <div class="date">Le ${fDate(getToday())}</div>
    <div class="objet">Objet : information sur la reconduction de votre ${ctrEsc(FV("contrat").toLowerCase())} (article L. 215-1 du Code de la consommation)</div>
    <p>Madame, Monsieur,</p>
    <p>Le ${ctrEsc(FV("contrat").toLowerCase())} de votre ${ctrEsc(MP().systeme)}${x.forfaitLabel?` (forfait ${ctrEsc(x.forfaitLabel)})`:""}, conclu le ${fDate(x.dateSignature)}, arrive au terme de sa période en cours le <strong>${fDate(i.ech)}</strong>.</p>
    <p>Sauf refus de votre part, il sera reconduit tacitement pour une durée de douze (12) mois, conformément à son article 2, aux conditions en vigueur, soit actuellement ${ctrEur(x.prixHT)} HT, soit ${ctrEur(ctrTTC(x.prixHT))} TTC par mois.</p>
    <p>Conformément à l'article L. 215-1 du Code de la consommation, nous vous informons que vous pouvez refuser cette reconduction. Il vous suffit de nous faire part de votre décision ${moyens}, au plus tard à la date indiquée ci-dessous.</p>
    <div class="encadre"><div class="lbl">Date limite de non-reconduction</div><div class="dt">${fDate(i.limite)}</div></div>
    <p>Si vous ne faites rien, votre contrat se poursuivra et nous continuerons à assurer ${TH.contratPrestation||"la maintenance de votre installation"}${TH.contratClauseVisites!==undefined?TH.contratClauseVisites:", dont les visites préventives semestrielles"}.</p>
    <p>Nous restons à votre disposition pour toute question et vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.</p>
    <div class="sign">${ctrEsc(TH.contratRepresentant)}<br/>${ctrEsc(TH.contratQualite)}, ${ctrEsc(prest)}</div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),400);}<\/script>
  </body></html>`;
  const w=window.open("","_blank");
  if(!w){alert("Veuillez autoriser les fenêtres pop-up pour générer le courrier.");return;}
  w.document.write(doc);w.document.close();
  logActivity("Courrier de reconduction préparé",`${c.nom} — échéance du ${fDate(i.ech)}`);
}
window.modalContratSigne=modalContratSigne; window.saveContratSigne=saveContratSigne; window.voirContratSigne=voirContratSigne; window.toggleResilContrat=toggleResilContrat; window.supprContratSigne=supprContratSigne;
window.planifierVisitesBtn=planifierVisitesBtn; window.marquerInfoEnvoyee=marquerInfoEnvoyee; window.genererCourrierReconduction=genererCourrierReconduction;

// ══════════════════════════════════════════════════════════
// ── CONTRAT DE MAINTENANCE VIDÉOSURVEILLANCE (PDF + Word) ──
// ══════════════════════════════════════════════════════════
// Deux versions : « part » (client particulier = consommateur) et « pro ».
// La version est choisie selon la catégorie du client (Pro → pro, sinon particulier),
// modifiable dans le modal. Le texte est partagé entre le rendu PDF et le rendu Word.
// Types de bloc : ["p", texte] · ["sub", sous-titre] · ["bullets", [items]]
const CONTRAT_TVA=8.5;
function ctrEur(n){ const s=(Math.round(Number(n||0)*100)/100).toFixed(2).replace(".",","); return (s.endsWith(",00")?s.slice(0,-3):s)+" €"; }
function ctrTTC(ht){ return Math.round(Number(ht||0)*(1+CONTRAT_TVA/100)*100)/100; }
function ctrPrixTxt(m){ return (m.forfait||m.prixPerso)?`${ctrEur(m.prixHT)} HT, soit ${ctrEur(ctrTTC(m.prixHT))} TTC`:"________ € HT, soit ________ € TTC"; }
function ctrEsc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function CONTRAT_TEXTE(m){
  const part=m.part;
  const P=MP(), V=!!P.video;
  const arts=[
    {n:1,t:"Objet du contrat",b:[
      ["p",`Le présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire assure ${P.contratObjet}, afin d'en garantir le bon fonctionnement, la disponibilité et la conformité réglementaire pendant toute la durée du contrat.`],
      ["p",`Le Système concerné est décrit en Annexe 1 (liste et localisation du matériel : ${P.composants}).`],
    ]},
    {n:2,t:"Durée du contrat",b:part?[
      ["p","Le présent contrat est conclu pour une durée ferme de SOIXANTE (60) mois à compter de sa date de signature (ou de la date de réception du Système si celle-ci est postérieure), mentionnée en fin de document."],
      ["p","À l'échéance de cette période, le contrat est reconduit tacitement pour des périodes successives de douze (12) mois, sauf dénonciation par l'une des Parties par écrit (lettre recommandée avec accusé de réception ou courrier électronique), au moins un (1) mois avant l'échéance."],
      ["p","Conformément à l'article L. 215-1 du Code de la consommation, le Prestataire informe le Client par écrit, au plus tôt trois (3) mois et au plus tard un (1) mois avant le terme de la période autorisant le rejet de la reconduction, de la possibilité de ne pas reconduire le contrat. À défaut de cette information, le Client peut mettre gratuitement un terme au contrat, à tout moment à compter de la date de reconduction."],
      ["p","Les dispositions du Code de la consommation relatives à la reconduction des contrats de prestation de services sont reproduites intégralement en Annexe 4, conformément à l'article L. 215-4 du Code de la consommation."],
    ]:[
      ["p","Le présent contrat est conclu pour une durée ferme de SOIXANTE (60) mois à compter de sa date de signature (ou de la date de réception du Système si celle-ci est postérieure), mentionnée en fin de document."],
      ["p","À l'échéance de cette période, le contrat pourra être reconduit par tacite reconduction pour des périodes successives de douze (12) mois, sauf dénonciation par l'une des Parties par lettre recommandée avec accusé de réception, adressée au moins trois (3) mois avant l'échéance."],
    ]},
    {n:3,t:"Description des prestations de maintenance",b:[
      ["sub","3.1 Maintenance préventive"],
      ["p","Le Prestataire réalise des visites de contrôle périodiques selon la fréquence définie en Annexe 2, comprenant notamment :"],
      ["bullets",P.preventif],
      ["sub","3.2 Maintenance corrective"],
      ["p","En cas de dysfonctionnement signalé par le Client ou détecté par le Prestataire, ce dernier intervient afin de diagnostiquer la panne et procéder à sa remise en état, par intervention sur site ou, lorsque la nature de l'incident le permet, par diagnostic téléphonique préalable."],
      ["sub","3.3 Délais d'intervention"],
      ["p","Sauf stipulation contraire de l'Annexe 2, les délais indicatifs sont les suivants :"],
      ["bullets",[
        `Panne bloquante (arrêt total du Système) : intervention sous ${m.delaiBloquant} ;`,
        `Panne partielle (dysfonctionnement d'un ou plusieurs éléments sans arrêt total) : intervention sous ${m.delaiPartiel}.`,
      ]],
      V?["p","Le Prestataire ne propose pas de prestation de télésurveillance ni de télémaintenance à distance ; toute intervention corrective nécessite un déplacement sur site, sauf simple échange téléphonique de premier niveau."]:null,
    ]},
    {n:4,t:"Exclusions",b:[
      ["p","Sont exclus du présent contrat, sauf devis accepté séparément :"],
      ["bullets",[
        "Le remplacement de matériel hors d'usage suite à vandalisme, vol, foudre, dégât des eaux, incendie, ou tout sinistre relevant de l'assurance du Client ;",
        P.extension,
        "Les dommages résultant d'une mauvaise utilisation, d'une intervention par un tiers non habilité, ou du non-respect des préconisations du Prestataire ;",
        "Les frais liés à un abonnement internet/télécom défaillant ou insuffisant pour le fonctionnement du Système ;",
        "Les mises à niveau majeures de logiciel ou de matériel non liées à un dysfonctionnement.",
      ]],
    ]},
    {n:5,t:"Obligations du Prestataire",b:[
      ["bullets",[
        "Assurer les prestations avec diligence et selon les règles de l'art ;",
        "Intervenir dans les délais convenus à l'Article 3.3 ;",
        "Tenir un registre des interventions (fiches d'intervention/rapports) tenu à disposition du Client ;",
        V?"Informer le Client de toute anomalie constatée susceptible d'affecter la conformité RGPD/CSI du dispositif ;":"Informer le Client de toute anomalie constatée lors des visites ;",
        V?"Respecter la confidentialité des données et images auxquelles il pourrait avoir accès dans le cadre de ses interventions.":"Respecter la confidentialité des informations auxquelles il pourrait avoir accès dans le cadre de ses interventions.",
      ]],
    ]},
    {n:6,t:"Obligations du Client",b:[
      ["bullets",[
        "Permettre l'accès aux locaux et aux équipements pour la réalisation des visites et interventions ;",
        "Signaler dans les meilleurs délais tout dysfonctionnement constaté ;",
        "Ne pas faire intervenir de tiers non habilité sur le Système sans accord préalable du Prestataire ;",
        "Maintenir une alimentation électrique et une connexion réseau/internet conformes aux prérequis techniques du Système ;",
        "Régler les sommes dues dans les conditions prévues à l'Article 7.",
      ]],
    ]},
    {n:7,t:"Conditions financières",b:[
      ["p",`En contrepartie des prestations décrites au présent contrat, le Client verse au Prestataire une redevance mensuelle de ${ctrPrixTxt(m)} (TVA ${String(CONTRAT_TVA).replace(".",",")} %), correspondant au forfait précisé en Annexe 2.`],
      ["bullets",part?[
        "Périodicité de facturation : mensuelle, terme à échoir ;",
        "Modalité de paiement : par virement bancaire ou par prélèvement SEPA (mandat signé par le Client), à réception de facture ;",
        "Révision tarifaire : le tarif pourra être révisé chaque année à la date anniversaire du contrat, notamment en fonction de l'évolution de l'indice Syntec ou de tout indice de référence équivalent, avec préavis écrit d'au moins un (1) mois ; en cas de refus de la révision, le Client peut résilier le contrat sans frais dans le mois suivant cette notification ;",
        "En cas de retard de paiement, et après mise en demeure restée sans effet, les sommes dues pourront être majorées d'intérêts au taux légal.",
      ]:[
        "Périodicité de facturation : mensuelle, terme à échoir ;",
        "Modalité de paiement : par virement bancaire ou par prélèvement SEPA (mandat signé par le Client), à réception de facture ;",
        "Révision tarifaire : le tarif pourra être révisé chaque année à la date anniversaire du contrat, notamment en fonction de l'évolution de l'indice Syntec ou de tout indice de référence équivalent, avec préavis écrit d'au moins un (1) mois ;",
        "En cas de retard de paiement, des pénalités seront appliquées conformément aux articles L. 441-10 et suivants du Code de commerce, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 €.",
      ]],
    ]},
    {n:8,t:"Responsabilité et assurance",b:[
      ["p","Le Prestataire est tenu à une obligation de moyens dans l'exécution des prestations de maintenance. Sa responsabilité ne pourra être engagée en cas de dommage résultant d'un cas de force majeure, d'un fait du Client ou d'un tiers, ou d'une cause étrangère au Système."],
      ["p","Le Prestataire déclare être couvert par une assurance responsabilité civile professionnelle pour l'ensemble de son activité."],
      V?["p","Le Client demeure seul responsable de la conformité de l'usage du Système au regard de la réglementation applicable (RGPD, Code de la sécurité intérieure), notamment, le cas échéant, de l'autorisation préfectorale préalable, de l'information des personnes concernées et de la durée de conservation des images."]:null,
    ]},
    !V?null:{n:9,t:"Protection des données personnelles",b:[
      ["p",(part?"Dans la mesure où le traitement des images captées par le Système relève du règlement (UE) 2016/679 (RGPD), notamment lorsque le Système filme des tiers ou un espace ouvert au public, le Client":"Le Client")+" agit en qualité de responsable de traitement et le Prestataire en qualité de sous-traitant au sens de l'article 28 du RGPD. Le traitement confié au Prestataire a pour seule finalité la maintenance du Système, pour la durée du contrat ; il porte sur les images et enregistrements vidéo des personnes se trouvant dans le champ des caméras (occupants, salariés, visiteurs, passants)."],
      ["p","Le Prestataire s'engage à :"],
      ["bullets",[
        "Ne traiter ces données que sur instruction documentée du Client, le présent contrat valant instruction, et dans la stricte mesure nécessaire à l'exécution de ses prestations ;",
        "Veiller à ce que les personnes autorisées à intervenir soient soumises à une obligation de confidentialité ;",
        "Mettre en œuvre les mesures de sécurité appropriées (article 32 du RGPD), notamment accès restreints, mots de passe robustes et mises à jour de sécurité ;",
        "Ne pas faire appel à un autre sous-traitant sans l'autorisation écrite préalable du Client ;",
        "Aider le Client, dans la mesure du possible, à répondre aux demandes d'exercice des droits des personnes concernées et à respecter ses propres obligations (sécurité, analyse d'impact) ;",
        "Notifier au Client toute violation de données personnelles dans un délai maximal de quarante-huit (48) heures après en avoir pris connaissance ;",
        "Ne conserver, copier, extraire ni divulguer aucun enregistrement, et supprimer toute copie éventuelle à l'issue de chaque intervention et au terme du contrat ;",
        "Ne procéder à aucun transfert de données en dehors de l'Union européenne ;",
        "Mettre à la disposition du Client les informations nécessaires pour démontrer le respect de ces obligations et permettre la réalisation d'audits.",
      ]],
    ]},
    {n:10,t:"Suspension et résiliation",b:[
      ["sub","10.1 Résiliation pour manquement"],
      ["p","En cas de manquement de l'une des Parties à l'une de ses obligations, non réparé dans un délai de trente (30) jours suivant une mise en demeure restée sans effet, l'autre Partie pourra résilier le présent contrat de plein droit, sans préjudice de tous dommages et intérêts."],
      ["sub","10.2 Résiliation anticipée"],
      ["p",part
        ?`Le Client peut résilier le contrat avant son terme, par écrit, moyennant un préavis d'un (1) mois. En cas de motif légitime dûment justifié (notamment déménagement, vente du bien équipé, décès, perte d'emploi ou situation de surendettement), la résiliation intervient sans frais. À défaut, elle donne lieu au versement d'une indemnité égale à ${m.indemnitePct} % des mensualités restant à courir jusqu'au terme de la période en cours.`
        :"Toute résiliation anticipée à l'initiative du Client avant le terme des 60 mois pourra donner lieu au paiement d'une indemnité correspondant aux mensualités restant dues, sauf accord contraire entre les Parties."],
    ]},
    {n:11,t:"Force majeure",b:[
      ["p","Aucune des Parties ne pourra être tenue responsable de l'inexécution de ses obligations résultant d'un cas de force majeure tel que défini par l'article 1218 du Code civil et la jurisprudence des tribunaux français, notamment événement climatique majeur (cyclone), catastrophe naturelle, coupure prolongée de réseau, ou décision administrative."],
    ]},
    {n:12,t:"Confidentialité",b:[
      ["p","Chacune des Parties s'engage à conserver strictement confidentielles les informations de nature technique, commerciale ou financière dont elle pourrait avoir connaissance à l'occasion de l'exécution du présent contrat, et à ne les divulguer à aucun tiers sans accord préalable écrit de l'autre Partie."],
    ]},
    {n:13,t:"Cession",b:[
      ["p","Le présent contrat ne pourra être cédé, en tout ou partie, par l'une des Parties sans l'accord écrit préalable de l'autre Partie, sauf en cas de cession à une société du même groupe ou dans le cadre d'une restructuration (fusion, apport partiel d'actif)."],
    ]},
    part
      ?{n:14,t:"Droit applicable, médiation et litiges",b:[
        ["p","Le présent contrat est soumis au droit français."],
        ["p",`En cas de litige, le Client adresse d'abord une réclamation écrite au Prestataire. À défaut de réponse satisfaisante dans un délai de deux (2) mois, il peut recourir gratuitement, conformément aux articles L. 611-1 et suivants du Code de la consommation, au médiateur de la consommation suivant : ${m.mediateur}.`],
        ["p","Le Client peut également saisir la juridiction compétente selon les règles de droit commun."],
      ]}
      :{n:14,t:"Droit applicable et juridiction compétente",b:[
        ["p",`Le présent contrat est soumis au droit français. En cas de litige relatif à sa validité, son interprétation ou son exécution, et à défaut de résolution amiable dans un délai de trente (30) jours, lorsque les Parties ont toutes deux la qualité de commerçant, le différend sera soumis aux tribunaux compétents du ressort de ${m.tribunal}. À défaut, la juridiction compétente est déterminée selon les règles de droit commun.`],
      ]},
    {n:15,t:"Dispositions diverses",b:[
      ["bullets",[
        "Le présent contrat, avec ses annexes, constitue l'intégralité de l'accord entre les Parties et annule tout accord antérieur portant sur le même objet ;",
        "Si l'une des clauses du contrat était déclarée nulle ou inapplicable, les autres dispositions resteraient en vigueur ;",
        "Toute modification du présent contrat devra faire l'objet d'un avenant écrit signé par les deux Parties.",
      ]],
    ]},
  ];
  if(part) arts.push({n:16,t:"Droit de rétractation",b:[
    ["p","Lorsque le présent contrat est conclu hors établissement (notamment au domicile du Client) ou à distance, le Client dispose, conformément aux articles L. 221-18 et suivants du Code de la consommation, d'un délai de quatorze (14) jours à compter de sa conclusion pour exercer son droit de rétractation, sans avoir à motiver sa décision ni à supporter d'autres coûts que ceux prévus ci-dessous."],
    ["p","Le Client exerce ce droit en adressant au Prestataire, avant l'expiration de ce délai, le formulaire figurant en Annexe 3 ou toute autre déclaration dénuée d'ambiguïté exprimant sa volonté de se rétracter, par courrier ou par courrier électronique."],
    ["p","Si le Client souhaite que les prestations commencent avant la fin du délai de rétractation, il en fait la demande expresse ci-dessous. En cas de rétractation, il reste alors redevable d'un montant proportionnel aux prestations fournies jusqu'à la communication de sa décision de se rétracter (article L. 221-25 du Code de la consommation)."],
    ["p","☐ Je demande expressément que les prestations commencent avant la fin du délai de rétractation."],
    ["p","Le Prestataire rembourse la totalité des sommes versées, déduction faite le cas échéant du montant proportionnel ci-dessus, au plus tard quatorze (14) jours à compter de la réception de la décision de rétractation."],
  ]});
  return arts.filter(Boolean).map((a,i)=>({...a,n:i+1,b:a.b.filter(Boolean)}));
}

// Annexe 3 (particulier uniquement) : formulaire type de rétractation (annexe à l'article R. 221-1 du Code de la consommation)
function CONTRAT_FORMULAIRE(m){
  const contact=[m.prestataire.siege,TH.email].filter(Boolean).join(", ");
  return [
    ["p","(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)"],
    ["p",`À l'attention de ${m.prestataire.nom}, ${contact} :`],
    ["p",`Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessous : ${MP().video?"contrat de maintenance du système de vidéosurveillance":"contrat de maintenance — "+MP().contratSous}.`],
    ["p","Conclu le : ______________________________"],
    ["p","Nom du consommateur : ______________________________"],
    ["p","Adresse du consommateur : ______________________________"],
    ["p","Signature du consommateur (uniquement en cas de notification du présent formulaire sur papier) :"],
    ["p","Date : ______________________________"],
  ];
}

// Annexe 4 (particulier uniquement) : texte légal collé depuis Légifrance dans Paramètres › Apparence
function CONTRAT_ANNEXE_L215(){
  const t=(TH.contratTexteL215||"").split(/\n+/).map(s=>s.trim()).filter(Boolean);
  return t.length?t.map(s=>["p",s]):[["p","[À compléter : texte intégral des articles du Code de la consommation visés par l'article L. 215-4 (reconduction des contrats de prestation de services), à coller une fois pour toutes dans Paramètres › Apparence.]"]];
}
function contratForfaitAuto(nbCameras){
  if(nbCameras===""||nbCameras===null||nbCameras===undefined) return "";
  const n=Number(nbCameras); const fs=TH.contratForfaits||[];
  if(!n||!fs.length) return "";
  const f=fs.find(f=>n>=f.min&&(f.max==null||n<=f.max));
  if(f) return f.id;
  const last=fs[fs.length-1];
  return (last&&last.max!=null&&n>last.max)?last.id:"";
}
function contratMaxCameras(){ const fs=TH.contratForfaits||[]; const last=fs[fs.length-1]; return last&&last.max!=null?last.max:null; }
function forfaitLabel(f){
  const u=MP().unite;
  if(f.max==null) return `${f.min} ${u[1]} et plus`;
  return f.min===f.max?`${f.min} ${f.min>1?u[1]:u[0]}`:`${f.min} à ${f.max} ${u[1]}`;
}
function buildContratModel(clientId,opts){
  const c=CLIENTS.find(x=>x.id===clientId)||{};
  const part=opts.version?opts.version==="part":(c.cat!=="Pro");
  const forfaits=TH.contratForfaits||[];
  const forfaitId=opts.forfaitId||contratForfaitAuto(c.nbCameras)||(forfaits[0]&&forfaits[0].id)||"";
  const forfait=forfaits.find(f=>f.id===forfaitId);
  const perso=opts.prixPerso!==undefined&&opts.prixPerso!==null&&String(opts.prixPerso).trim()!==""&&!isNaN(Number(opts.prixPerso));
  const prixHT=perso?Number(opts.prixPerso):(forfait?forfait.prix:0);
  const prestNom=`${TH.nom} ${TH.sous}`.trim();
  const contactPrest=[TH.tel,TH.email].filter(Boolean).join(" · ");
  const contactCli=[c.tel,c.email].filter(Boolean).join(" · ");
  const adresse=opts.adresseSite||c.adresse||"[Adresse complète du site]";
  return {
    c, part, forfaits, forfaitId, forfait, prixHT, prixPerso:perso,
    prestataire:{nom:prestNom,siege:TH.contratSiege},
    prestRows:[
      ["Raison sociale",prestNom],
      ["Forme juridique","SAS"],
      ["Siège social",TH.contratSiege],
      ["SIREN",TH.contratSiren],
      ...(contactPrest?[["Téléphone / e-mail",contactPrest]]:[]),
      ["Représentée par",`${TH.contratRepresentant}, en qualité de ${TH.contratQualite}`],
      ["Ci-après dénommée","« le Prestataire »"],
    ],
    clientNom:c.nom||(part?"[Nom et prénom du Client]":"[Nom du Client]"),
    clientRows:part?[
      ["Nom et prénom",c.nom||"[Nom et prénom]"],
      ["Adresse",adresse],
      ["Téléphone / e-mail",contactCli||"—"],
      ["Ci-après dénommé","« le Client »"],
    ]:[
      ["Raison sociale / Nom",c.nom||"[Raison sociale]"],
      ["Forme juridique",c.formeJuridique||"—"],
      ["Adresse",adresse],
      ["SIRET",c.siret||"—"],
      ["Représenté par",c.contact?(c.contact+(c.representantQualite?", "+c.representantQualite:"")):"[Nom, Prénom – qualité]"],
      ["Ci-après dénommé","« le Client »"],
    ],
    dateEffet:opts.dateEffet||getToday(),
    delaiBloquant:TH.contratDelaiBloquant,
    delaiPartiel:TH.contratDelaiPartiel,
    tribunal:TH.contratTribunal,
    mediateur:TH.contratMediateur||"[nom, adresse et site internet du médiateur]",
    indemnitePct:TH.contratIndemnitePart!=null?TH.contratIndemnitePart:20,
  };
}
function contratRecapRows(m){
  const maxC=contratMaxCameras();
  return [
    ["Forfait souscrit par le Client",m.forfait?m.forfait.label:"—"],
    ["Mensualité appliquée",`${ctrPrixTxt(m)}${m.prixPerso?" (tarif sur devis)":""}`],
    ["Fréquence des visites préventives","2 visites / an (tous les 6 mois)"],
    ["TVA applicable",`${String(CONTRAT_TVA).replace(".",",")} % (Martinique)`],
    ["Délai panne bloquante",m.delaiBloquant],
    ["Délai panne partielle",m.delaiPartiel],
  ].concat(MP().video?[["Télésurveillance / télémaintenance","Non proposée — interventions sur site uniquement"]]:[]).concat(maxC&&m.c.nbCameras>maxC?[[`Nombre de ${MP().unite[1]}`,`${m.c.nbCameras} (au-delà de ${maxC} : tarification sur devis)`]]:[]);
}
function contratNoteGrille(){
  const maxC=contratMaxCameras();
  return (maxC?`Au-delà de ${maxC} ${MP().unite[1]}, une tarification sur devis est établie. `:"")+"Chaque forfait comprend l'ensemble des prestations décrites à l'Article 3 du présent contrat.";
}
function contratAnnexe1(m){
  const P=MP();
  return `${m.c.nbCameras?`Système composé de ${m.c.nbCameras} ${uniteTxt(m.c.nbCameras)}. `:""}${P.video?"[Compléter : marques/modèles, localisation, enregistreur(s), capacité de stockage, durée de conservation, schéma d'implantation le cas échéant.]":`[Compléter : description et localisation des éléments couverts (${P.composants}).]`}`;
}

function modalContrat(clientId){
  const c=CLIENTS.find(x=>x.id===clientId); if(!c) return;
  const forfaits=TH.contratForfaits||[];
  const autoId=contratForfaitAuto(c.nbCameras);
  const maxC=contratMaxCameras();
  const surDevis=maxC&&c.nbCameras>maxC;
  const versionAuto=c.cat==="Pro"?"pro":"part";
  showModal(`${FV("contrat")} — ${c.nom}`,`
    ${!c.nbCameras?`<div style="background:#fffbeb;border:1.5px solid #fcd34d;color:#92400e;border-radius:9px;padding:10px 12px;font-size:12.5px;margin-bottom:10px">Nombre de ${MP().unite[1]} non renseigné sur la fiche client — choisissez le forfait manuellement, ou <button style="border:none;background:none;color:#6d28d9;text-decoration:underline;cursor:pointer;font:inherit;padding:0" onclick="closeModal();modalClient('${c.id}')">complétez la fiche</button>.</div>`:""}
    ${surDevis?`<div style="background:#eff6ff;border:1.5px solid #93c5fd;color:#1e40af;border-radius:9px;padding:10px 12px;font-size:12.5px;margin-bottom:10px">${c.nbCameras} ${MP().unite[1]} : au-delà de ${maxC}, tarif sur devis — indiquez la mensualité personnalisée ci-dessous.</div>`:""}
    <div class="field"><label>Version du contrat</label>
      <select id="ctr-version">
        <option value="part"${versionAuto==="part"?" selected":""}>Client particulier (consommateur)</option>
        <option value="pro"${versionAuto==="pro"?" selected":""}>Client professionnel</option>
      </select>
    </div>
    <div class="field-row">
      <div class="field"><label>Forfait</label>
        <select id="ctr-forfait">
          ${forfaits.map(f=>`<option value="${f.id}"${f.id===autoId?" selected":""}>${f.label} (${forfaitLabel(f)}) — ${f.prix} € HT/mois</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Mensualité personnalisée (€ HT)</label><input type="number" min="0" step="0.01" id="ctr-prix" placeholder="Vide = tarif du forfait"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Date de signature</label><input type="date" id="ctr-date" value="${getToday()}"/></div>
      <div class="field"><label>Adresse du site (si différente)</label><input id="ctr-adresse" value="${(c.adresse||"").replace(/"/g,'&quot;')}"/></div>
    </div>
    <div style="font-size:11.5px;color:#94a3b8;margin-top:4px">Version choisie selon la catégorie du client (${c.cat||"—"}). Délais, tribunal, médiateur et grille modifiables dans Paramètres › Apparence.</div>
    ${!TH.contratMediateur?`<div style="font-size:11.5px;color:#b45309;margin-top:6px">⚠️ Médiateur de la consommation non renseigné (obligatoire pour la version particulier).</div>`:""}
    ${!(TH.contratTexteL215||"").trim()?`<div style="font-size:11.5px;color:#b45309;margin-top:6px">⚠️ Texte légal de l'Annexe 4 non renseigné (obligatoire pour la version particulier) — Paramètres › Apparence.</div>`:""}
  `,`
    <button class="btn-cancel" onclick="closeModal()">Annuler</button>
    <button class="btn-save" style="background:#6d28d9" onclick="genererContratWord('${c.id}')">📝 Word</button>
    <button class="btn-save" style="background:${TH.c1}" onclick="genererContratPDF('${c.id}')">📄 PDF</button>
  `);
}
function contratOptsFromModal(){
  return {
    version:document.getElementById("ctr-version").value,
    forfaitId:document.getElementById("ctr-forfait").value,
    prixPerso:document.getElementById("ctr-prix").value,
    dateEffet:document.getElementById("ctr-date").value,
    adresseSite:document.getElementById("ctr-adresse").value.trim(),
  };
}
function blocksToHTML(blocks){
  return blocks.map(([type,val])=>{
    if(type==="p") return `<p class="art-p">${ctrEsc(val)}</p>`;
    if(type==="sub") return `<p class="art-sub">${ctrEsc(val)}</p>`;
    if(type==="bullets") return `<ul class="art-ul">${val.map(x=>`<li>${ctrEsc(x)}</li>`).join("")}</ul>`;
    return "";
  }).join("");
}
function rowsToHTML(rows,cls){ return `<table class="${cls}">${rows.map(([l,v])=>`<tr><td class="lbl">${ctrEsc(l)}</td><td>${ctrEsc(v)}</td></tr>`).join("")}</table>`; }

function genererContratPDF(clientId){
  const opts=contratOptsFromModal();
  if(!opts.forfaitId){alert("Choisissez un forfait.");return;}
  const m=buildContratModel(clientId,opts);
  const articles=CONTRAT_TEXTE(m);
  const doc=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${ctrEsc(FV("contrat"))} — ${ctrEsc(m.clientNom)}</title>
  <style>
    @page{size:A4;margin:0}
    *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1A2118;padding:40px 46px;font-size:12.5px;line-height:1.55}
    h1.title{text-align:center;font-size:24px;color:${TH.sidebar};margin-bottom:4px}
    .sub{text-align:center;font-size:15px;color:${TH.c1};margin-bottom:4px}
    .duree{text-align:center;font-style:italic;color:#64748b;font-size:12px;margin-bottom:22px}
    h2.entre{color:${TH.c1};font-size:15px;margin:18px 0 10px;border-bottom:2px solid ${TH.c1}33;padding-bottom:4px}
    table.party,table.recap{width:100%;border-collapse:collapse;margin-bottom:14px}
    table.party td,table.recap td{border:1px solid #e2e8f0;padding:7px 10px;font-size:12px;vertical-align:top}
    table.party td.lbl{background:${TH.sand}55;font-weight:700;width:32%}
    table.recap td.lbl{background:${TH.sand}55;font-weight:700;width:40%}
    .et{text-align:center;font-weight:700;margin:10px 0}
    h3.art{color:${TH.sidebar};font-size:13.5px;margin:16px 0 6px;page-break-after:avoid}
    p.art-p{margin-bottom:8px;text-align:justify}
    p.art-sub{font-weight:700;margin:8px 0 5px}
    ul.art-ul{margin:0 0 8px 18px}
    ul.art-ul li{margin-bottom:4px}
    .annexe{color:${TH.c1};font-size:15px;margin:22px 0 10px;border-bottom:2px solid ${TH.c1}33;padding-bottom:4px}
    table.grille{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:12px}
    table.grille th{background:${TH.sidebar};color:#fff;padding:8px 10px;text-align:left}
    table.grille td{border:1px solid #e2e8f0;padding:7px 10px}
    tr.sel td{background:${TH.c1}15;font-weight:700}
    .sign{display:flex;justify-content:space-between;margin-top:30px;gap:30px;page-break-inside:avoid}
    .sign-box{flex:1}
    @media print{body{padding:30px 36px}}
  </style></head><body>
    <h1 class="title">${ctrEsc(FV("contrat").toUpperCase())}</h1>
    <div class="sub">${ctrEsc(MP().contratSous)}</div>
    <div class="duree">Durée : 60 mois · ${m.part?"Client particulier":"Client professionnel"}</div>

    <h2 class="entre">Entre les soussignés</h2>
    <p style="font-weight:700;margin-bottom:6px">LE PRESTATAIRE :</p>
    ${rowsToHTML(m.prestRows,"party")}
    <div class="et">ET</div>
    <p style="font-weight:700;margin-bottom:6px">LE CLIENT :</p>
    ${rowsToHTML(m.clientRows,"party")}
    <p style="margin-bottom:10px">Ci-après désignés ensemble « les Parties ».</p>

    ${articles.map(a=>`<h3 class="art">Article ${a.n} – ${ctrEsc(a.t)}</h3>${blocksToHTML(a.b)}`).join("")}

    <p style="font-style:italic;margin:20px 0 30px">Fait à ______________________, le ${fDate(m.dateEffet)}, en deux exemplaires originaux.</p>
    <div class="sign">
      <div class="sign-box"><strong>Pour le Prestataire</strong><br/>${ctrEsc(m.prestataire.nom)}<br/>${ctrEsc(TH.contratRepresentant)}, ${ctrEsc(TH.contratQualite)}<br/><br/>Signature :</div>
      <div class="sign-box"><strong>Pour le Client</strong><br/>${ctrEsc(m.clientNom)}<br/><br/>Signature :</div>
    </div>

    <div style="page-break-before:always"></div>
    <h2 class="annexe">Annexe 1 – Description du système</h2>
    <p class="art-p">${ctrEsc(contratAnnexe1(m))}</p>

    <h2 class="annexe">Annexe 2 – Grille tarifaire et fréquence des visites</h2>
    <p style="margin-bottom:8px">Le forfait applicable au Client est précisé ci-dessous, en fonction du nombre de ${ctrEsc(MP().unite[1])} composant le Système :</p>
    <table class="grille">
      <tr><th>Forfait</th><th>Système</th><th>Mensualité HT</th><th>Mensualité TTC</th><th>Sélection</th></tr>
      ${m.forfaits.map(f=>`<tr${f.id===m.forfaitId?' class="sel"':""}><td>${ctrEsc(f.label)}</td><td>${forfaitLabel(f)}</td><td>${ctrEur(f.prix)}</td><td>${ctrEur(ctrTTC(f.prix))}</td><td>${f.id===m.forfaitId?"☑":"☐"}</td></tr>`).join("")}
    </table>
    <p style="font-style:italic;color:#64748b;font-size:11.5px;margin-bottom:14px">${ctrEsc(contratNoteGrille())}</p>
    ${rowsToHTML(contratRecapRows(m),"recap")}

    ${m.part?`<div style="page-break-before:always"></div>
    <h2 class="annexe">Annexe 3 – Formulaire de rétractation</h2>
    ${blocksToHTML(CONTRAT_FORMULAIRE(m))}
    <div style="page-break-before:always"></div>
    <h2 class="annexe">Annexe 4 – Dispositions du Code de la consommation relatives à la reconduction</h2>
    ${blocksToHTML(CONTRAT_ANNEXE_L215())}`:""}
    <script>window.onload=()=>{setTimeout(()=>window.print(),400);}<\/script>
  </body></html>`;
  const w=window.open("","_blank");
  if(!w){alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF.");return;}
  w.document.write(doc);w.document.close();
  logActivity("Génération contrat",`Contrat maintenance ${m.part?"particulier":"pro"} (PDF) : ${m.clientNom}${m.forfait?" — "+m.forfait.label:""}`);
  closeModal();
}

// Le module docx (bundle navigateur UMD) est chargé à la demande, comme XLSX pour l'export Excel.
function genererContratWord(clientId){
  const opts=contratOptsFromModal();
  if(!opts.forfaitId){alert("Choisissez un forfait.");return;}
  if(typeof docx==="undefined"){
    const script=document.createElement("script");
    script.src="https://cdn.jsdelivr.net/npm/docx@9.6.1/dist/index.umd.cjs";
    script.onload=()=>doGenererContratWord(clientId,opts);
    script.onerror=()=>alert("Impossible de charger le module Word (vérifiez votre connexion).");
    document.head.appendChild(script);
  } else {
    doGenererContratWord(clientId,opts);
  }
}
function buildContratDocx(m){
  const {Document,Paragraph,TextRun,HeadingLevel,AlignmentType,Table,TableRow,TableCell,WidthType,ShadingType,BorderStyle,Header,Footer,PageNumber,LevelFormat,convertInchesToTwip}=docx;
  const articles=CONTRAT_TEXTE(m);
  const NAVY=(TH.txt||"#37301F").replace("#",""),BLUE=(TH.c1||"#3286A0").replace("#",""),BEIGE=(TH.sand||"#DED3BC").replace("#","");
  const borders=()=>({top:{style:BorderStyle.SINGLE,size:2,color:"CCCCCC"},bottom:{style:BorderStyle.SINGLE,size:2,color:"CCCCCC"},left:{style:BorderStyle.SINGLE,size:2,color:"CCCCCC"},right:{style:BorderStyle.SINGLE,size:2,color:"CCCCCC"},insideHorizontal:{style:BorderStyle.SINGLE,size:2,color:"CCCCCC"},insideVertical:{style:BorderStyle.SINGLE,size:2,color:"CCCCCC"}});
  const heading=(text,pageBreakBefore)=>new Paragraph({heading:HeadingLevel.HEADING_1,pageBreakBefore:!!pageBreakBefore,spacing:{before:300,after:150},children:[new TextRun({text,bold:true,color:BLUE})]});
  const p=(text)=>new Paragraph({spacing:{after:120,line:300},children:[new TextRun({text})]});
  const bullet=(text)=>new Paragraph({numbering:{reference:"main-bullets",level:0},spacing:{after:80},children:[new TextRun({text})]});
  const sub=(text)=>new Paragraph({spacing:{before:100,after:80},children:[new TextRun({text,bold:true})]});
  const artNum=(n,title)=>new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{before:260,after:120},children:[new TextRun({text:`Article ${n} – ${title}`,bold:true,color:NAVY})]});
  const fieldRow=(label,value)=>new TableRow({children:[
    new TableCell({width:{size:3000,type:WidthType.DXA},shading:{type:ShadingType.CLEAR,fill:BEIGE},margins:{top:80,bottom:80,left:120,right:120},children:[new Paragraph({children:[new TextRun({text:label,bold:true,size:20})]})]}),
    new TableCell({width:{size:6200,type:WidthType.DXA},margins:{top:80,bottom:80,left:120,right:120},children:[new Paragraph({children:[new TextRun({text:String(value),size:20})]})]}),
  ]});
  const rowsTable=(rows)=>new Table({width:{size:9200,type:WidthType.DXA},columnWidths:[3000,6200],borders:borders(),rows:rows.map(([l,v])=>fieldRow(l,v))});
  const blocksToDocx=(blocks)=>{const out=[];blocks.forEach(([type,val])=>{
    if(type==="p") out.push(p(val)); else if(type==="sub") out.push(sub(val)); else if(type==="bullets") val.forEach(x=>out.push(bullet(x)));
  });return out;};
  const articleParas=[];
  articles.forEach(a=>{articleParas.push(artNum(a.n,a.t));blocksToDocx(a.b).forEach(x=>articleParas.push(x));});

  const W=[1900,2100,1750,1750,1700];
  const headCell=(text,i)=>new TableCell({width:{size:W[i],type:WidthType.DXA},shading:{type:ShadingType.CLEAR,fill:BLUE},margins:{top:80,bottom:80,left:120,right:120},children:[new Paragraph({children:[new TextRun({text,bold:true,color:"FFFFFF",size:20})]})]});
  const cell=(text,i,bold)=>new TableCell({width:{size:W[i],type:WidthType.DXA},margins:{top:80,bottom:80,left:120,right:120},children:[new Paragraph({children:[new TextRun({text:String(text),bold:!!bold,size:20})]})]});
  const forfaitRows=[
    new TableRow({tableHeader:true,children:["Forfait","Système","Mensualité HT","Mensualité TTC","Sélection"].map((t,i)=>headCell(t,i))}),
    ...m.forfaits.map(f=>{const s=f.id===m.forfaitId;return new TableRow({children:[f.label,forfaitLabel(f),ctrEur(f.prix),ctrEur(ctrTTC(f.prix)),s?"☑":"☐"].map((t,i)=>cell(t,i,s))});}),
  ];
  const noBorders={top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE},insideHorizontal:{style:BorderStyle.NONE},insideVertical:{style:BorderStyle.NONE}};

  return new Document({
    numbering:{config:[{reference:"main-bullets",levels:[{level:0,format:LevelFormat.BULLET,text:"•",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:convertInchesToTwip(0.3),hanging:convertInchesToTwip(0.15)}}}}]}]},
    sections:[{
      properties:{page:{size:{width:11906,height:16838},margin:{top:1000,bottom:1000,left:1100,right:1100}}},
      headers:{default:new Header({children:[new Paragraph({alignment:AlignmentType.RIGHT,border:{bottom:{style:BorderStyle.SINGLE,size:6,color:BLUE,space:4}},children:[new TextRun({text:"AD SECURE CONCEPT",bold:true,color:BLUE,size:20})]})]})},
      footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[
        new TextRun({text:`${FV("contrat")} – ${(TH.nom+" "+(TH.sous||"")).trim()}   |   Page `,size:16,color:"888888"}),
        new TextRun({children:[PageNumber.CURRENT],size:16,color:"888888"}),
        new TextRun({text:" / ",size:16,color:"888888"}),
        new TextRun({children:[PageNumber.TOTAL_PAGES],size:16,color:"888888"}),
      ]})]})},
      children:[
        new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:100},children:[new TextRun({text:FV("contrat").toUpperCase(),bold:true,size:40,color:NAVY})]}),
        new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:100},children:[new TextRun({text:MP().contratSous,size:26,color:BLUE})]}),
        new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:300},children:[new TextRun({text:`Durée : 60 mois · ${m.part?"Client particulier":"Client professionnel"}`,italics:true,size:22,color:"555555"})]}),
        heading("Entre les soussignés"),
        p("LE PRESTATAIRE :"),
        rowsTable(m.prestRows),
        new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:100,after:100},children:[new TextRun({text:"ET",bold:true})]}),
        p("LE CLIENT :"),
        rowsTable(m.clientRows),
        p("Ci-après désignés ensemble « les Parties »."),
        ...articleParas,
        new Paragraph({spacing:{before:300,after:150},children:[new TextRun({text:`Fait à ______________________, le ${fDate(m.dateEffet)}, en deux exemplaires originaux.`,italics:true})]}),
        new Table({width:{size:9200,type:WidthType.DXA},columnWidths:[4600,4600],borders:noBorders,rows:[new TableRow({children:[
          new TableCell({width:{size:4600,type:WidthType.DXA},children:[
            new Paragraph({children:[new TextRun({text:"Pour le Prestataire",bold:true,color:BLUE})]}),
            new Paragraph({children:[new TextRun({text:m.prestataire.nom,size:20})]}),
            new Paragraph({children:[new TextRun({text:`${TH.contratRepresentant}, ${TH.contratQualite}`,size:20})]}),
            new Paragraph({spacing:{before:600},children:[new TextRun({text:"Signature :",size:20})]}),
          ]}),
          new TableCell({width:{size:4600,type:WidthType.DXA},children:[
            new Paragraph({children:[new TextRun({text:"Pour le Client",bold:true,color:BLUE})]}),
            new Paragraph({children:[new TextRun({text:m.clientNom,size:20})]}),
            new Paragraph({spacing:{before:600},children:[new TextRun({text:"Signature :",size:20})]}),
          ]}),
        ]})]}),
        heading("Annexe 1 – Description du système",true),
        p(contratAnnexe1(m)),
        heading("Annexe 2 – Grille tarifaire et fréquence des visites"),
        p(`Le forfait applicable au Client est précisé ci-dessous, en fonction du nombre de ${MP().unite[1]} composant le Système :`),
        new Table({width:{size:9200,type:WidthType.DXA},columnWidths:W,borders:borders(),rows:forfaitRows}),
        new Paragraph({spacing:{before:100,after:150},children:[new TextRun({text:contratNoteGrille(),italics:true,size:20,color:"555555"})]}),
        rowsTable(contratRecapRows(m)),
        ...(m.part?[heading("Annexe 3 – Formulaire de rétractation",true),...blocksToDocx(CONTRAT_FORMULAIRE(m)),heading("Annexe 4 – Dispositions du Code de la consommation relatives à la reconduction",true),...blocksToDocx(CONTRAT_ANNEXE_L215())]:[]),
      ],
    }],
  });
}
function doGenererContratWord(clientId,opts){
  try{
    const m=buildContratModel(clientId,opts);
    docx.Packer.toBlob(buildContratDocx(m)).then(blob=>{
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;
      a.download=`Contrat_Maintenance_${m.part?"Particulier":"Pro"}_${(m.clientNom||"Client").replace(/[^a-z0-9]+/gi,"_")}.docx`;
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),4000);
      logActivity("Génération contrat",`Contrat maintenance ${m.part?"particulier":"pro"} (Word) : ${m.clientNom}${m.forfait?" — "+m.forfait.label:""}`);
      closeModal();
    }).catch(e=>alert("Erreur lors de la génération du fichier Word : "+(e.message||e)));
  }catch(e){
    alert("Erreur lors de la génération du contrat Word : "+(e.message||e));
  }
}
window.modalContrat=modalContrat; window.genererContratPDF=genererContratPDF; window.genererContratWord=genererContratWord;

