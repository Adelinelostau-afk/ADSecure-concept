// ── PARC INSTALLÉ (équipements posés chez chaque client) ──
// ══════════════════════════════════════════════════════════
// Stocké dans la fiche client : c.parc = [{id,type,marque,modele,ref,serie,mac,ip,emplacement,dateInstall,garantieMois,statut,notes,source}]
let PARC_TYPES=["Caméra","Enregistreur","Disque dur","Switch / réseau","Alarme","Domotique","Écran","Onduleur","Autre"];
let PARC_ICON={"Caméra":"📷","Enregistreur":"📼","Disque dur":"💽","Switch / réseau":"🔌","Alarme":"🚨","Domotique":"💡","Écran":"🖥️","Onduleur":"🔋","Autre":"🔧"};
const PARC_ST={actif:["#dcfce7","#15803d","En service"],surveiller:["#fef9c3","#a16207","À surveiller"],hs:["#fee2e2","#991b1b","Hors service"],remplace:["#f1f5f9","#64748b","Remplacé"],retire:["#f1f5f9","#94a3b8","Retiré"]};
let PARC_CAT_TYPE={"Caméras":"Caméra","Enregistreurs":"Enregistreur","Réseau":"Switch / réseau","Alarme":"Alarme","Domotique":"Domotique"};
function pE(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function parcGarantieFin(x){
  if(!x.dateInstall) return "";
  const m=Number(x.garantieMois!=null&&x.garantieMois!==""?x.garantieMois:24)||0;
  const d=new Date(x.dateInstall+"T12:00:00");d.setMonth(d.getMonth()+m);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function parcGarantieBadge(x){
  const fin=parcGarantieFin(x);
  if(!fin) return `<span style="font-size:11px;color:#94a3b8">garantie n.c.</span>`;
  const j=daysDiff(fin);
  if(j<0) return badge("Garantie expirée","#f1f5f9","#64748b");
  if(j<=60) return badge("Garantie → "+fDate(fin),"#fef9c3","#a16207");
  return badge("Garantie → "+fDate(fin)+" "+fin.slice(0,4),"#e8f4f8","#3286A0");
}
function parcActifs(c){return (c.parc||[]).filter(x=>!["remplace","retire"].includes(x.statut));}

function renderParcSection(c){
  const parc=(c.parc||[]);
  const actifs=parcActifs(c);
  const anciens=parc.filter(x=>["remplace","retire"].includes(x.statut));
  const parType={};actifs.forEach(x=>{(parType[x.type||"Autre"]=parType[x.type||"Autre"]||[]).push(x);});
  const resume=PARC_TYPES.filter(t=>parType[t]).map(t=>`${PARC_ICON[t]} ${parType[t].length} ${t.toLowerCase()}${parType[t].length>1&&!/s$/.test(t)?"s":""}`).join(" · ");
  const sousGarantie=actifs.filter(x=>{const f=parcGarantieFin(x);return f&&f>=getToday();}).length;
  const ligne=x=>{const st=PARC_ST[x.statut||"actif"]||PARC_ST.actif;return `<div onclick="modalParc('${c.id}','${x.id}')" style="padding:10px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:10px;cursor:pointer;flex-wrap:wrap">
      <span style="font-size:20px">${PARC_ICON[x.type]||"🔧"}</span>
      <div style="flex:1;min-width:170px">
        <div style="font-weight:700;font-size:13px;color:${TH.txt}">${pE([x.marque,x.modele].filter(Boolean).join(" ")||x.type)}${x.emplacement?` <span style="font-weight:400;color:#64748b">— ${pE(x.emplacement)}</span>`:""}</div>
        <div style="font-size:11px;color:#64748b">${x.serie?"S/N "+pE(x.serie):"N° de série non renseigné"}${x.ip?" · IP "+pE(x.ip):""}${x.dateInstall?" · posé le "+fDate(x.dateInstall)+" "+x.dateInstall.slice(0,4):""}</div>
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end">${badge(st[2],st[0],st[1])}${parcGarantieBadge(x)}</div>
    </div>`;};
  return `<div class="section-card" style="background:${TH.card}">
    <div class="section-head">
      <div><div class="section-title" style="color:${TH.txt}">${FV("parcIcone")} ${FV("parc")}</div><div class="section-sub">${actifs.length} ${FV("parcSub")}${sousGarantie?" · "+sousGarantie+" sous garantie":""}</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${parc.length?`<button class="btn-sm" onclick="imprimerParc('${c.id}')">📄 Fiche PDF</button>`:""}
        ${FV("remise")?`<button class="btn-sm" onclick="modalDossierRemise('${c.id}')" style="border-color:${TH.c1}55;color:${TH.c1};font-weight:700">📘 ${FV("remiseLbl")}</button>`:""}
        ${FV("importFacture")?`<button class="btn-sm" onclick="modalImportParc('${c.id}')">⬇️ Depuis une facture</button>`:""}
        <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="modalParc('${c.id}','')">＋ ${FV("parcUnite")}</button>
      </div>
    </div>
    ${resume?`<div style="padding:10px 18px;font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9">${resume}</div>`:""}
    ${parc.length===0?`<div style="padding:26px;text-align:center;color:${TH.txt}66;font-size:13px">${FV("parcVide")}</div>`:""}
    ${PARC_TYPES.filter(t=>parType[t]).map(t=>parType[t].map(ligne).join("")).join("")}
    ${anciens.length?`<details style="padding:6px 18px 10px"><summary style="cursor:pointer;font-size:12px;color:#64748b;padding:6px 0">${anciens.length} équipement(s) remplacé(s) ou retiré(s)</summary>${anciens.map(ligne).join("")}</details>`:""}
  </div>`;
}

function modalParc(clientId,id){
  const c=CLIENTS.find(x=>x.id===clientId);if(!c)return;
  const x=id?(c.parc||[]).find(p=>p.id===id):{type:PARC_TYPES[0],marque:"",modele:"",ref:"",serie:"",mac:"",ip:"",emplacement:"",dateInstall:getToday(),garantieMois:TH.garantieMois||24,statut:"actif",notes:""};
  if(!x)return;
  const prods=CATALOGUE.filter(p=>PARC_CAT_TYPE[p.cat]);
  showModal(id?"Modifier l'équipement":"Nouvel équipement",`
    ${!id&&prods.length?`<div class="field"><label>Depuis le catalogue (facultatif)</label><select id="pa-cat" onchange="parcDepuisCatalogue(this.value)"><option value="">— Choisir un produit —</option>${prods.map(p=>`<option value="${p.id}">${pE(p.nom)}${p.marque?" · "+pE(p.marque):""}</option>`).join("")}</select></div>`:""}
    <div class="field-row">
      <div class="field"><label>Type</label><select id="pa-type">${PARC_TYPES.map(t=>`<option ${t===x.type?"selected":""}>${t}</option>`).join("")}</select></div>
      <div class="field"><label>État</label><select id="pa-statut">${Object.entries(PARC_ST).map(([k,v])=>`<option value="${k}" ${k===(x.statut||"actif")?"selected":""}>${v[2]}</option>`).join("")}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Marque</label><input id="pa-marque" value="${pE(x.marque)}" placeholder="Hikvision, Dahua…"/></div>
      <div class="field"><label>Modèle</label><input id="pa-modele" value="${pE(x.modele)}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>N° de série</label><input id="pa-serie" value="${pE(x.serie)}" autocapitalize="characters"/></div>
      <div class="field"><label>Emplacement</label><input id="pa-empl" value="${pE(x.emplacement)}" placeholder="Entrée, parking, caisse…"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Adresse IP</label><input id="pa-ip" value="${pE(x.ip)}" inputmode="decimal" placeholder="192.168.1.64"/></div>
      <div class="field"><label>Adresse MAC</label><input id="pa-mac" value="${pE(x.mac)}" autocapitalize="characters"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>${FV("parcDate")}</label><input type="date" id="pa-date" value="${pE(x.dateInstall)}"/></div>
      <div class="field"><label>Garantie (mois)</label><input type="number" id="pa-gar" min="0" value="${x.garantieMois!=null?x.garantieMois:24}"/></div>
    </div>
    <div class="field"><label>Notes</label><textarea id="pa-notes" style="min-height:60px" placeholder="Identifiants stockés ailleurs, particularités…">${pE(x.notes)}</textarea></div>
    <input type="hidden" id="pa-ref" value="${pE(x.ref)}"/>
    ${id?`<div style="font-size:11px;color:#94a3b8">Évitez de noter ici les mots de passe des équipements.</div>`:""}`,
    `${id?`<button class="btn-cancel" style="color:#991b1b;border-color:#fecaca;margin-right:auto" onclick="supprParc('${c.id}','${id}')">🗑 Supprimer</button>`:""}
     <button class="btn-cancel" onclick="closeModal()">Annuler</button>
     ${!id?`<button class="btn-cancel" onclick="saveParc('${c.id}','',true)">＋ Enregistrer et ajouter</button>`:""}
     <button class="btn-save" style="background:${TH.c1}" onclick="saveParc('${c.id}','${id||""}')">✓ Enregistrer</button>`);
}
function parcDepuisCatalogue(pid){
  const p=CATALOGUE.find(x=>x.id===pid);if(!p)return;
  document.getElementById("pa-type").value=PARC_CAT_TYPE[p.cat]||"Autre";
  document.getElementById("pa-marque").value=p.marque||"";
  document.getElementById("pa-modele").value=p.modele||p.nom||"";
  document.getElementById("pa-ref").value=p.ref||"";
}
function saveParc(clientId,id,encore){
  const c=CLIENTS.find(x=>x.id===clientId);if(!c)return;
  const v=k=>document.getElementById(k).value.trim();
  const obj={type:v("pa-type"),statut:v("pa-statut"),marque:v("pa-marque"),modele:v("pa-modele"),serie:v("pa-serie").toUpperCase(),
    emplacement:v("pa-empl"),ip:v("pa-ip"),mac:v("pa-mac").toUpperCase(),dateInstall:v("pa-date"),garantieMois:Number(v("pa-gar")||0),notes:v("pa-notes"),ref:v("pa-ref")};
  c.parc=c.parc||[];
  if(id){const x=c.parc.find(p=>p.id===id);if(x)Object.assign(x,obj);logActivity("Parc modifié",`${c.nom} — ${obj.marque} ${obj.modele}`);}
  else{c.parc.push({id:uid(),source:"manuel",...obj});logActivity("Équipement ajouté",`${c.nom} — ${obj.type} ${obj.marque} ${obj.modele}`);}
  saveData();renderPage();
  if(encore){modalParc(c.id,"");const t=document.getElementById("pa-type");if(t)t.value=obj.type;["pa-marque","pa-modele","pa-date","pa-gar","pa-ref"].forEach(k=>{const e=document.getElementById(k);if(e)e.value=k==="pa-marque"?obj.marque:k==="pa-modele"?obj.modele:k==="pa-date"?obj.dateInstall:k==="pa-gar"?obj.garantieMois:obj.ref;});}
  else closeModal();
}
function supprParc(clientId,id){
  const c=CLIENTS.find(x=>x.id===clientId);if(!c)return;
  const x=(c.parc||[]).find(p=>p.id===id);if(!x)return;
  if(!confirm(`Supprimer définitivement « ${[x.marque,x.modele].filter(Boolean).join(" ")||x.type} » ?\nPour garder l'historique, choisissez plutôt l'état « Retiré ».`))return;
  c.parc=c.parc.filter(p=>p.id!==id);
  logActivity("Équipement supprimé",`${c.nom} — ${x.type} ${x.marque||""} ${x.modele||""}`);
  saveData();closeModal();renderPage();
}
// Import des équipements d'une facture (produits du catalogue de type matériel)
function modalImportParc(clientId){
  const c=CLIENTS.find(x=>x.id===clientId);if(!c)return;
  const facs=FACTURES.filter(f=>(f.clientId===c.id||(!f.clientId&&f.client===c.nom))&&f.statut!=="annulee").sort((a,b)=>(facDate(b)||"").localeCompare(facDate(a)||""));
  if(!facs.length){alert("Aucune facture pour ce client.");return;}
  showModal("Importer le matériel d'une facture",`
    <div class="field"><label>Facture</label><select id="ip-fac" onchange="importParcLignes('${c.id}',this.value)">${facs.map(f=>`<option value="${f.id}">${pE(f.num)} · ${fDate(facDate(f))} · ${fMoney(facTTC(f))}</option>`).join("")}</select></div>
    <div id="ip-lignes"></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="validerImportParc('${c.id}')">⬇️ Importer</button>`);
  importParcLignes(c.id,facs[0].id);
}
function parcProduitDeLigne(l){
  return CATALOGUE.find(p=>(l.ref&&p.ref===l.ref))||CATALOGUE.find(p=>l.desc&&p.nom===l.desc)||CATALOGUE.find(p=>l.desc&&p.nom&&String(l.desc).toLowerCase().startsWith(p.nom.toLowerCase()));
}
function importParcLignes(clientId,facId){
  const f=FACTURES.find(x=>x.id===facId);const box=document.getElementById("ip-lignes");if(!f||!box)return;
  const L=(f.lignes||[]).map((l,i)=>{const p=parcProduitDeLigne(l);const type=p?PARC_CAT_TYPE[p.cat]:"";return {i,l,p,type,qte:Math.max(0,Math.round(Number(l.qte)||0))};});
  window._ipFac=f;window._ipLignes=L;
  box.innerHTML=`<div style="font-size:12px;color:#64748b;margin-bottom:8px">Cochez le matériel posé. Une fiche est créée par unité (le n° de série se complète ensuite).</div>`+
    (L.length?L.map(x=>`<label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;cursor:pointer">
      <input type="checkbox" id="ip-c-${x.i}" ${x.type&&x.qte?"checked":""} style="width:18px;height:18px;accent-color:${TH.c1}"/>
      <span style="flex:1">${pE(x.l.desc||x.l.ref||"Ligne "+(x.i+1))}<br/><span style="font-size:11px;color:#94a3b8">${x.type?PARC_ICON[x.type]+" "+x.type:"Prestation / non reconnu"}${x.p&&x.p.marque?" · "+pE(x.p.marque):""}</span></span>
      <input type="number" id="ip-q-${x.i}" min="0" value="${x.qte}" style="width:56px;padding:6px;border-radius:8px;border:1.5px solid #e2e8f0;text-align:center"/>
      <select id="ip-t-${x.i}" style="padding:6px;border-radius:8px;border:1.5px solid #e2e8f0;font-size:12px">${PARC_TYPES.map(t=>`<option ${t===(x.type||"Autre")?"selected":""}>${t}</option>`).join("")}</select>
    </label>`).join(""):`<div style="padding:16px;text-align:center;color:#94a3b8">Facture sans lignes détaillées.</div>`);
}
function validerImportParc(clientId){
  const c=CLIENTS.find(x=>x.id===clientId);const f=window._ipFac;if(!c||!f)return;
  c.parc=c.parc||[];let n=0;
  (window._ipLignes||[]).forEach(x=>{
    if(!document.getElementById("ip-c-"+x.i).checked)return;
    const q=Math.min(100,Math.max(0,parseInt(document.getElementById("ip-q-"+x.i).value)||0));
    const type=document.getElementById("ip-t-"+x.i).value;
    for(let k=0;k<q;k++){c.parc.push({id:uid(),type,marque:x.p?x.p.marque||"":"",modele:x.p?(x.p.modele||x.p.nom):(x.l.desc||""),ref:x.p?x.p.ref:(x.l.ref||""),
      serie:"",mac:"",ip:"",emplacement:"",dateInstall:facDate(f)||getToday(),garantieMois:TH.garantieMois||24,statut:"actif",notes:"",source:"facture "+f.num});n++;}
  });
  if(!n){alert("Aucun équipement coché.");return;}
  logActivity("Parc importé",`${c.nom} — ${n} équipement(s) depuis ${f.num}`);
  saveData();closeModal();renderPage();
  alert(`✅ ${n} équipement(s) ajouté(s) au parc. Pensez à compléter les numéros de série et emplacements.`);
}
function riEnteteHTML(titre,sous){
  const logo=thLogo();
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${TH.c1};padding-bottom:14px;margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:12px">${logo?`<img src="${logo}" style="width:62px;height:auto" onerror="this.style.display='none'"/>`:""}
      <div><div style="font-size:18px;font-weight:800">${pE(TH.nom)}</div><div style="font-size:12px;color:${TH.c1}">${pE(TH.sous||"")}</div>
      <div style="font-size:10.5px;color:#64748b;margin-top:3px">${pE([TH.adresse||TH.contratSiege,TH.tel,TH.email].filter(Boolean).join(" · "))}</div></div></div>
    <div style="text-align:right"><div style="font-size:19px;font-weight:800">${titre}</div><div style="font-size:12px;color:#64748b;margin-top:4px">${sous}</div></div></div>`;
}
const RI_CSS=`body{font-family:'Inter',Arial,sans-serif;color:#1A2118;padding:34px 40px;font-size:12px;margin:0;background:#fff}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:${"#1A2118"};color:#fff;padding:7px 9px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.4px}
  td{padding:6px 9px;border-bottom:1px solid #e8e4dc;vertical-align:top}h2{font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin:18px 0 8px}
  .box{background:#F7F4ED;border-radius:8px;padding:10px 14px;white-space:pre-wrap;line-height:1.55}.foot{margin-top:26px;font-size:10px;color:#94a3b8;text-align:center}
  @media print{body{padding:18px 24px}.nobreak{page-break-inside:avoid}}`;
function imprimerParc(clientId){
  const c=CLIENTS.find(x=>x.id===clientId);if(!c)return;
  const L=(c.parc||[]).slice().sort((a,b)=>PARC_TYPES.indexOf(a.type)-PARC_TYPES.indexOf(b.type));
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${pE(FV("parc"))} — ${pE(c.nom)}</title><style>${RI_CSS}</style></head><body>
    ${riEnteteHTML("FICHE PARC INSTALLÉ",`${pE(c.nom)}<br/>au ${fDate(getToday())} ${getToday().slice(0,4)}`)}
    <div style="margin-bottom:14px"><strong>${pE(c.nom)}</strong>${c.contact?" — "+pE(c.contact):""}${c.adresse?"<br/>"+pE(c.adresse):""}${c.tel?"<br/>"+pE(c.tel):""}</div>
    <table><thead><tr><th>Type</th><th>Marque / modèle</th><th>N° de série</th><th>Emplacement</th><th>IP</th><th>Installé le</th><th>Garantie</th><th>État</th></tr></thead><tbody>
    ${L.map(x=>{const g=parcGarantieFin(x);return `<tr><td>${pE(x.type)}</td><td>${pE([x.marque,x.modele].filter(Boolean).join(" "))}</td><td>${pE(x.serie)||"—"}</td><td>${pE(x.emplacement)||"—"}</td><td>${pE(x.ip)||"—"}</td><td>${x.dateInstall?fDate(x.dateInstall)+" "+x.dateInstall.slice(0,4):"—"}</td><td>${g?(g<getToday()?"expirée":"→ "+fDate(g)+" "+g.slice(0,4)):"—"}</td><td>${(PARC_ST[x.statut||"actif"]||PARC_ST.actif)[2]}</td></tr>`;}).join("")}
    </tbody></table>
    <div class="foot">${pE(TH.nom)} ${pE(TH.sous||"")} — document généré le ${fDate(getToday())} ${getToday().slice(0,4)}</div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),400);}<\/script></body></html>`;
  const w=window.open("","_blank");if(!w){alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF.");return;}
  w.document.write(html);w.document.close();
}

// ══════════════════════════════════════════════════════════
// ── RAPPORTS D'INTERVENTION ───────────────────────────────
// ══════════════════════════════════════════════════════════
let riFiltre={statut:"tous",type:"tous",q:""};
const RI_TYPES=Object.assign({},FICHE_DEF.riTypes); // recalculé par appliquerMetier()
const RI_CHECK={
  maintenance:["Nettoyage des optiques et des dômes","Contrôle de l'image jour et nuit (infrarouge)","Vérification de l'enregistrement et de la durée de conservation","Contrôle de l'état du disque dur","Mise à l'heure et mise à jour des firmwares","Test de l'accès à distance (application)","Test des détections et alertes (IA)","Contrôle des alimentations et de l'onduleur","Vérification des câbles et connectiques","Contrôle des panneaux d'information (RGPD)"],
  installation:["Pose et fixation des équipements","Raccordement et tests réseau","Paramétrage de l'enregistreur","Réglage des angles de vue et zones de détection","Configuration de l'accès à distance","Création des comptes utilisateurs","Formation du client à l'utilisation","Remise des identifiants et de la documentation","Pose des panneaux d'information (RGPD)"],
  depannage:["Diagnostic de la panne","Réparation ou remplacement","Tests de bon fonctionnement","Vérification de l'enregistrement"],
  audit:["Relevé des besoins du client","Repérage des emplacements","Vérification du réseau et des alimentations","Photos du site"]
};
const RI_ETATS={ok:["#dcfce7","#15803d","OK"],surveiller:["#fef9c3","#a16207","À surveiller"],hs:["#fee2e2","#991b1b","HS"],remplace:["#e8f4f8","#3286A0","Remplacé"]};
const RI_URLS={};      // chemin → URL signée (affichage)
const RI_DATA={};      // chemin → image en data: (PDF / envoi)
function riClient(r){return CLIENTS.find(c=>c.id===r.clientId);}
function riEtatPhoto(p){return RI_DATA[p.path]||RI_URLS[p.path]||"";}

function renderInterventions(){
  const q=(riFiltre.q||"").toLowerCase();
  const L=INTERVENTIONS.filter(r=>(riFiltre.statut==="tous"||r.statut===riFiltre.statut)&&(riFiltre.type==="tous"||r.type===riFiltre.type)
    &&(!q||[r.num,(riClient(r)||{}).nom,r.technicien,r.travaux].join(" ").toLowerCase().includes(q)))
    .sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.num||"").localeCompare(a.num||""));
  const mois=getToday().slice(0,7);
  const sel=(k,opts)=>`<select onchange="riFiltre.${k}=this.value;renderPage()" style="padding:8px 10px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13px;background:#fff">${opts.map(([v,l])=>`<option value="${v}" ${riFiltre[k]===v?"selected":""}>${l}</option>`).join("")}</select>`;
  const visites=EVENTS.filter(e=>(e.contratId||e.type==="maintenance"||e.type==="chantier")&&e.date>=addDays(getToday(),-7)&&e.date<=addDays(getToday(),14)&&!INTERVENTIONS.some(r=>r.eventId===e.id)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6);
  return `
    <div class="kpi-grid">
      ${kpi("Rapports ce mois-ci",INTERVENTIONS.filter(r=>(r.date||"").slice(0,7)===mois).length,TH.c1)}
      ${kpi("Signés",INTERVENTIONS.filter(r=>r.statut==="signe").length,"#15803d")}
      ${kpi("Brouillons",INTERVENTIONS.filter(r=>r.statut!=="signe").length,"#b45309")}
      ${kpi("Équipements HS signalés",CLIENTS.reduce((s,c)=>s+(c.parc||[]).filter(x=>x.statut==="hs").length,0),"#991b1b")}
    </div>
    ${visites.length?`<div class="section-card"><div class="section-head"><div><div class="section-title">📅 Interventions planifiées sans rapport</div><div class="section-sub">7 derniers jours et 14 prochains</div></div></div>
      ${visites.map(e=>`<div style="padding:10px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px"><div style="font-weight:700;font-size:13px">${pE(e.titre)}</div><div style="font-size:11px;color:#64748b">${fDate(e.date)} ${e.heure||""} · ${pE(e.client||"")}</div></div>
        <button class="btn-add" style="background:${TH.c1};color:#fff;font-size:12px;padding:6px 12px" onclick="nouveauRIDepuisEvent('${e.id}')">🛠️ Faire le rapport</button></div>`).join("")}</div>`:""}
    <div class="section-card">
      <div class="section-head">
        <div><div class="section-title">🛠️ ${FV("riSection")}</div><div class="section-sub">${L.length} ${FV("riUnite")}</div></div>
        <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="choisirClientRI()">＋ Nouveau rapport</button>
      </div>
      <div style="padding:12px 18px;display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--line)">
        ${sel("statut",[["tous","Tous"],["brouillon","Brouillons"],["signe","Signés"]])}
        ${sel("type",[["tous","Tous les types"],...Object.entries(RI_TYPES)])}
        <input placeholder="🔍 Client, n°, technicien…" value="${pE(riFiltre.q)}" onchange="riFiltre.q=this.value;renderPage()" style="flex:1;min-width:140px;padding:8px 12px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13px"/>
      </div>
      ${L.length?L.map(riLigneHTML).join(""):`<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">Aucun rapport pour le moment.</div>`}
    </div>`;
}
function riLigneHTML(r){
  const c=riClient(r);
  const hs=(r.equipements||[]).filter(e=>e.etat==="hs").length;
  return `<div style="padding:12px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <div onclick="modalRI('${r.id}')" style="flex:1;min-width:180px;cursor:pointer">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="font-weight:700;font-size:13px;color:${TH.c1}">${pE(r.num)}</span>
        ${r.statut==="signe"?badge("✍️ Signé","#dcfce7","#15803d"):badge("Brouillon","#f1f5f9","#64748b")}${hs?badge(hs+" HS","#fee2e2","#991b1b"):""}</div>
      <div style="font-size:13px;margin-top:2px">${pE(RI_TYPES[r.type]||"Intervention")} — ${pE(c?c.nom:"Client supprimé")}</div>
      <div style="font-size:11px;color:#64748b">${fDate(r.date)} ${(r.date||"").slice(0,4)}${r.hDebut?" · "+r.hDebut+(r.hFin?"–"+r.hFin:""):""}${r.technicien?" · "+pE(r.technicien):""}${(r.photos||[]).length?" · 📷 "+r.photos.length:""}</div>
    </div>
    <div style="display:flex;gap:5px">
      <button class="btn-sm" title="PDF" onclick="genererRIPDF('${r.id}')" style="border-color:#86efac;background:#f0fdf4;color:#15803d">📄</button>
      <button class="btn-sm" title="Envoyer au client" onclick="modalEnvoiRI('${r.id}')" style="border-color:#bae6fd;background:#f0f9ff;color:#0369a1">✉️${(r.envois||[]).length?"✓":""}</button>
    </div></div>`;
}
function renderRIClientSection(c){
  const L=INTERVENTIONS.filter(r=>r.clientId===c.id).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  return `<div class="section-card" style="background:${TH.card}">
    <div class="section-head">
      <div><div class="section-title" style="color:${TH.txt}">🛠️ ${FV("interventions")}</div><div class="section-sub">${L.length} ${FV("riUnite")}${L[0]?" · dernière le "+fDate(L[0].date)+" "+(L[0].date||"").slice(0,4):""}</div></div>
      <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="nouveauRI('${c.id}')">＋ ${FV("riBtn")}</button>
    </div>
    ${L.length?L.slice(0,8).map(riLigneHTML).join(""):`<div style="padding:24px;text-align:center;color:${TH.txt}66;font-size:13px">${FV("riVide")}</div>`}
    ${L.length>8?`<div style="padding:10px;text-align:center"><button class="btn-sm" onclick="riFiltre.q='${pE(c.nom).replace(/'/g,"\\'")}';goTo('interventions')">Voir les ${L.length} rapports</button></div>`:""}
  </div>`;
}
function choisirClientRI(){
  const L=[...CLIENTS].sort((a,b)=>a.nom.localeCompare(b.nom));
  showModal("Nouveau rapport d'intervention",`
    <div class="field"><label>Client</label><select id="ri-cli">${L.map(c=>`<option value="${c.id}">${pE(c.nom)}</option>`).join("")}</select></div>
    <div class="field"><label>Type d'intervention</label><select id="ri-type0">${Object.entries(RI_TYPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="nouveauRI(document.getElementById('ri-cli').value,document.getElementById('ri-type0').value)">Continuer →</button>`);
}
function nouveauRI(clientId,type,ev){
  const c=CLIENTS.find(x=>x.id===clientId);if(!c){alert("Choisissez un client.");return;}
  type=type||(ev&&(ev.contratId||ev.type==="maintenance")?"maintenance":ev&&ev.type==="chantier"?"installation":"maintenance");
  const now=new Date();
  window._ri={id:"",_nouveau:true,num:prochainNumero("RI",INTERVENTIONS),clientId:c.id,date:ev?ev.date:getToday(),
    hDebut:ev&&ev.heure?ev.heure:String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0"),hFin:"",
    type,technicien:currentUser?currentUser.nom:"",eventId:ev?ev.id:"",contratId:ev?ev.contratId||"":"",statut:"brouillon",
    checklist:(RI_CHECK[type]||[]).map(lib=>({lib,ok:null})),
    equipements:parcActifs(c).map(x=>({parcId:x.id,etat:"",note:""})),
    travaux:"",pieces:"",observations:"",photos:[],sigClient:"",sigNom:c.contact||"",sigDate:"",envois:[]};
  ouvrirFormRI();
}
function nouveauRIDepuisEvent(eventId){
  const e=EVENTS.find(x=>x.id===eventId);if(!e)return;
  const c=CLIENTS.find(x=>x.id===e.clientId)||CLIENTS.find(x=>x.nom&&e.client&&x.nom.toLowerCase()===String(e.client).toLowerCase());
  if(!c){alert("Le client de cet événement n'est pas reconnu. Créez le rapport depuis la fiche client.");return;}
  nouveauRI(c.id,null,e);
}
function modalRI(id){
  const r=INTERVENTIONS.find(x=>x.id===id);if(!r)return;
  window._ri=JSON.parse(JSON.stringify(r));
  // équipements du parc ajoutés depuis : on les propose aussi
  const c=riClient(r);
  if(c&&r.statut!=="signe") parcActifs(c).forEach(x=>{if(!window._ri.equipements.some(e=>e.parcId===x.id))window._ri.equipements.push({parcId:x.id,etat:"",note:""});});
  ouvrirFormRI();
  riChargerURLs(window._ri).then(()=>{const b=document.getElementById("ri-photos");if(b&&window._ri)b.innerHTML=riPhotosHTML();});
}
function ouvrirFormRI(){
  const r=window._ri,c=riClient(r);
  const signe=r.statut==="signe";
  showModal(`🛠️ ${pE(r.num)} — ${pE(c?c.nom:"")}`,`
    ${signe?`<div style="background:#f0fdf4;border:1.5px solid #86efac;color:#15803d;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px">✍️ Rapport signé par ${pE(r.sigNom||"le client")} le ${fDate(r.sigDate)} ${(r.sigDate||"").slice(0,4)}. Les modifications restent possibles mais la signature est conservée.</div>`:""}
    <div class="field-row">
      <div class="field"><label>Type</label><select id="ri-type" onchange="riChangerType(this.value)">${Object.entries(RI_TYPES).map(([k,v])=>`<option value="${k}" ${k===r.type?"selected":""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label>Date</label><input type="date" id="ri-date" value="${pE(r.date)}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Arrivée</label><input type="time" id="ri-hd" value="${pE(r.hDebut)}"/></div>
      <div class="field"><label>Départ</label><div style="display:flex;gap:6px"><input type="time" id="ri-hf" value="${pE(r.hFin)}" style="flex:1"/><button type="button" class="btn-sm" onclick="const n=new Date();document.getElementById('ri-hf').value=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')">Maintenant</button></div></div>
    </div>
    <div class="field"><label>${FV("intervenant")}</label><input id="ri-tech" value="${pE(r.technicien)}"/></div>
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:6px 0 6px">Points de contrôle</div>
    <div id="ri-check">${riCheckHTML()}</div>
    <div style="display:flex;gap:6px;margin:6px 0 14px"><input id="ri-newcheck" placeholder="Ajouter un point de contrôle…" style="flex:1;padding:8px 10px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:13px"/><button type="button" class="btn-sm" onclick="riAjouterCheck()">＋</button></div>
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:6px 0 6px">État des équipements</div>
    <div id="ri-eq">${riEqHTML()}</div>
    <div class="field" style="margin-top:12px"><label>Travaux réalisés</label><textarea id="ri-trav" style="min-height:90px" placeholder="Décrivez l'intervention…">${pE(r.travaux)}</textarea></div>
    <div class="field"><label>Pièces fournies / remplacées</label><textarea id="ri-pieces" style="min-height:50px" placeholder="${pE(MP().ex.pieces)}">${pE(r.pieces)}</textarea></div>
    <div class="field"><label>Observations et recommandations</label><textarea id="ri-obs" style="min-height:60px">${pE(r.observations)}</textarea></div>
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:6px 0 6px">Photos</div>
    <div id="ri-photos">${riPhotosHTML()}</div>
    <label class="btn-sm" style="display:inline-flex;align-items:center;gap:6px;margin:8px 0 16px;cursor:pointer">📷 Ajouter des photos<input type="file" accept="image/*" multiple onchange="riAjouterPhotos(this.files);this.value=''" style="display:none"/></label>
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:6px 0 6px">Signature du client</div>
    <div class="field"><label>Nom du signataire</label><input id="ri-signom" value="${pE(r.sigNom)}"/></div>
    <div id="ri-sigzone">${riSigZoneHTML()}</div>
    <div id="ri-msg" style="display:none;margin-top:10px;padding:10px 12px;border-radius:9px;font-size:13px;background:#fef2f2;color:#991b1b;border:1.5px solid #fca5a5"></div>`,
    `${r.id?`<button class="btn-cancel" style="color:#991b1b;border-color:#fecaca;margin-right:auto" onclick="supprRI('${r.id}')">🗑</button>`:""}
     <button class="btn-cancel" onclick="closeModal()">Fermer</button>
     <button class="btn-cancel" id="ri-btn-brouillon" onclick="saveRI(false)">💾 Enregistrer</button>
     <button class="btn-save" id="ri-btn-final" style="background:#15803d" onclick="saveRI(true)">${signe?"✓ Enregistrer":"✍️ Valider et signer"}</button>`);
  riInitSignature();
}
function riLireChamps(){
  const r=window._ri;const v=k=>{const e=document.getElementById(k);return e?e.value:"";};
  Object.assign(r,{type:v("ri-type"),date:v("ri-date")||getToday(),hDebut:v("ri-hd"),hFin:v("ri-hf"),technicien:v("ri-tech").trim(),
    travaux:v("ri-trav").trim(),pieces:v("ri-pieces").trim(),observations:v("ri-obs").trim(),sigNom:v("ri-signom").trim()});
}
function riChangerType(t){
  const r=window._ri;
  const coches=r.checklist.some(x=>x.ok!==null);
  if(coches&&!confirm("Remplacer la liste des points de contrôle par celle de ce type ?")){document.getElementById("ri-type").value=r.type;return;}
  r.type=t;r.checklist=(RI_CHECK[t]||[]).map(lib=>({lib,ok:null}));
  document.getElementById("ri-check").innerHTML=riCheckHTML();
}
function riCheckHTML(){
  const r=window._ri;
  if(!r.checklist.length) return `<div style="font-size:12px;color:#94a3b8;padding:6px 0">Aucun point de contrôle.</div>`;
  const b=(i,val,lbl,col)=>{const on=r.checklist[i].ok===val;return `<button type="button" onclick="riCocher(${i},${val})" style="min-width:38px;height:34px;border-radius:9px;border:1.5px solid ${on?col:"#e2e8f0"};background:${on?col:"#fff"};color:${on?"#fff":"#64748b"};font-weight:700;font-size:13px;cursor:pointer">${lbl}</button>`;};
  return r.checklist.map((x,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #f1f5f9">
    <div style="flex:1;font-size:13px">${pE(x.lib)}</div>${b(i,true,"✓","#15803d")}${b(i,false,"✗","#991b1b")}${b(i,"na","N/A","#94a3b8")}</div>`).join("")+
    `<div style="text-align:right;margin-top:6px"><button type="button" class="btn-sm" onclick="riToutOK()">Tout cocher ✓</button></div>`;
}
function riCocher(i,val){const x=window._ri.checklist[i];x.ok=x.ok===val?null:val;document.getElementById("ri-check").innerHTML=riCheckHTML();}
function riToutOK(){window._ri.checklist.forEach(x=>{if(x.ok===null)x.ok=true;});document.getElementById("ri-check").innerHTML=riCheckHTML();}
function riAjouterCheck(){const i=document.getElementById("ri-newcheck");const t=i.value.trim();if(!t)return;window._ri.checklist.push({lib:t,ok:null});i.value="";document.getElementById("ri-check").innerHTML=riCheckHTML();}
function riEqHTML(){
  const r=window._ri,c=riClient(r);
  if(!r.equipements.length) return `<div style="font-size:12px;color:#94a3b8;padding:6px 0">Aucun équipement dans le parc de ce client. Ajoutez-les depuis sa fiche (${FV("parcIcone")} ${FV("parc")}).</div>`;
  return r.equipements.map((e,i)=>{const x=c&&(c.parc||[]).find(p=>p.id===e.parcId);if(!x)return "";
    return `<div style="padding:7px 0;border-bottom:1px solid #f1f5f9">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <div style="flex:1;min-width:150px;font-size:13px">${PARC_ICON[x.type]||"🔧"} <strong>${pE([x.marque,x.modele].filter(Boolean).join(" ")||x.type)}</strong>${x.emplacement?` <span style="color:#64748b">— ${pE(x.emplacement)}</span>`:""}</div>
        ${Object.entries(RI_ETATS).map(([k,v])=>`<button type="button" onclick="riEtat(${i},'${k}')" style="padding:5px 9px;border-radius:999px;border:1.5px solid ${e.etat===k?v[1]:"#e2e8f0"};background:${e.etat===k?v[0]:"#fff"};color:${e.etat===k?v[1]:"#64748b"};font-size:11.5px;font-weight:700;cursor:pointer">${v[2]}</button>`).join("")}
      </div>
      ${e.etat&&e.etat!=="ok"?`<input value="${pE(e.note)}" oninput="window._ri.equipements[${i}].note=this.value" placeholder="Précision (panne constatée, n° de série du remplaçant…)" style="width:100%;margin-top:6px;padding:7px 10px;border-radius:8px;border:1.5px solid #e2e8f0;font-size:12.5px;box-sizing:border-box"/>`:""}
    </div>`;}).join("")+`<div style="text-align:right;margin-top:6px"><button type="button" class="btn-sm" onclick="riToutEqOK()">Tout OK</button></div>`;
}
function riEtat(i,k){const e=window._ri.equipements[i];e.etat=e.etat===k?"":k;document.getElementById("ri-eq").innerHTML=riEqHTML();}
function riToutEqOK(){window._ri.equipements.forEach(e=>{if(!e.etat)e.etat="ok";});document.getElementById("ri-eq").innerHTML=riEqHTML();}

// ── Photos (compressées puis stockées dans Supabase Storage) ──
function riPhotosHTML(){
  const r=window._ri;
  if(!r.photos.length) return `<div style="font-size:12px;color:#94a3b8">Aucune photo.</div>`;
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">${r.photos.map((p,i)=>`<div style="position:relative">
    <div style="aspect-ratio:4/3;border-radius:9px;overflow:hidden;background:#f1f5f9;display:flex;align-items:center;justify-content:center">${riEtatPhoto(p)?`<img src="${riEtatPhoto(p)}" style="width:100%;height:100%;object-fit:cover"/>`:`<span style="font-size:11px;color:#94a3b8">${p.envoi?"⟳ envoi…":"⟳"}</span>`}</div>
    <input value="${pE(p.legende)}" oninput="window._ri.photos[${i}].legende=this.value" placeholder="Légende" style="width:100%;margin-top:4px;padding:5px 7px;border-radius:7px;border:1.5px solid #e2e8f0;font-size:11.5px;box-sizing:border-box"/>
    <button type="button" onclick="riSupprPhoto(${i})" style="position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;border:none;background:rgba(0,0,0,0.55);color:#fff;cursor:pointer;font-size:12px">✕</button></div>`).join("")}</div>`;
}
function riCompresser(file){
  return new Promise((ok,ko)=>{
    const img=new Image();const url=URL.createObjectURL(file);
    img.onload=()=>{const max=1400;let w=img.naturalWidth,h=img.naturalHeight;const k=Math.min(1,max/Math.max(w,h));w=Math.round(w*k);h=Math.round(h*k);
      const cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);URL.revokeObjectURL(url);
      const data=cv.toDataURL("image/jpeg",0.78);cv.toBlob(b=>b?ok({blob:b,data}):ko(new Error("Compression impossible")),"image/jpeg",0.78);};
    img.onerror=()=>{URL.revokeObjectURL(url);ko(new Error("Image illisible"));};img.src=url;
  });
}
async function riAjouterPhotos(files){
  const r=window._ri;if(!files||!files.length)return;
  if(!currentUser||!currentUser.tenant_id){alert("Session invalide, reconnectez-vous.");return;}
  if(!r._tmpId) r._tmpId=r.id||uid();
  for(const f of [...files].slice(0,12)){
    const p={id:uid(),path:"",legende:"",envoi:true};r.photos.push(p);
    document.getElementById("ri-photos").innerHTML=riPhotosHTML();
    try{
      const {blob,data}=await riCompresser(f);
      p.path=`${currentUser.tenant_id}/interventions/${r._tmpId}/${p.id}.jpg`;
      RI_DATA[p.path]=data;
      const {error}=await sbClient.storage.from(DOCS_BUCKET).upload(p.path,blob,{contentType:"image/jpeg",upsert:false});
      if(error) throw error;
      delete p.envoi;
    }catch(e){
      r.photos=r.photos.filter(x=>x!==p);
      alert("Photo non enregistrée : "+(e.message||e));
    }
    const box=document.getElementById("ri-photos");if(box&&window._ri===r)box.innerHTML=riPhotosHTML();
  }
}
function riSupprPhoto(i){
  const r=window._ri,p=r.photos[i];if(!p)return;
  if(!confirm("Retirer cette photo ?"))return;
  if(p.path) sbClient.storage.from(DOCS_BUCKET).remove([p.path]).catch(()=>{});
  r.photos.splice(i,1);document.getElementById("ri-photos").innerHTML=riPhotosHTML();
  if(r.id){const o=INTERVENTIONS.find(x=>x.id===r.id);if(o){o.photos=(o.photos||[]).filter(x=>x.path!==p.path);saveData();}}
}
async function riChargerURLs(r){
  const manquants=(r.photos||[]).map(p=>p.path).filter(p=>p&&!RI_URLS[p]&&!RI_DATA[p]);
  if(!manquants.length)return;
  try{const {data}=await sbClient.storage.from(DOCS_BUCKET).createSignedUrls(manquants,3600);(data||[]).forEach(x=>{if(x.signedUrl)RI_URLS[x.path]=x.signedUrl;});}catch(e){}
}
// Images en data: pour fabriquer le PDF (évite les blocages d'images externes)
async function riPrechargerPhotos(r){
  await riChargerURLs(r);
  await Promise.all((r.photos||[]).filter(p=>p.path&&!RI_DATA[p.path]&&RI_URLS[p.path]).map(async p=>{
    try{const b=await (await fetch(RI_URLS[p.path])).blob();RI_DATA[p.path]=await new Promise(ok=>{const fr=new FileReader();fr.onload=()=>ok(fr.result);fr.readAsDataURL(b);});}catch(e){}
  }));
}

// ── Signature tactile ──
function riSigZoneHTML(){
  const r=window._ri;
  if(r.sigClient) return `<div style="border:1.5px solid #e2e8f0;border-radius:12px;background:#fff;padding:8px;text-align:center"><img src="${r.sigClient}" style="max-width:100%;height:140px;object-fit:contain"/>
    <div style="font-size:11px;color:#64748b">Signé le ${fDate(r.sigDate)} ${(r.sigDate||"").slice(0,4)}</div>
    <button type="button" class="btn-sm" style="margin-top:6px" onclick="window._ri.sigClient='';window._ri.sigDate='';document.getElementById('ri-sigzone').innerHTML=riSigZoneHTML();riInitSignature()">↺ Refaire la signature</button></div>`;
  return `<div style="position:relative"><canvas id="ri-canvas" style="width:100%;height:170px;border:2px dashed #cbd5e1;border-radius:12px;background:#fff;touch-action:none;display:block"></canvas>
    <div id="ri-canvas-hint" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:14px;pointer-events:none">Le client signe ici avec le doigt</div></div>
    <div style="display:flex;justify-content:space-between;margin-top:6px"><span style="font-size:11px;color:#94a3b8">En signant, le client atteste de la réalisation de l'intervention.</span><button type="button" class="btn-sm" onclick="riEffacerSig()">Effacer</button></div>`;
}
function riInitSignature(){
  const cv=document.getElementById("ri-canvas");if(!cv)return;
  const ratio=Math.max(1,window.devicePixelRatio||1);
  const rect=cv.getBoundingClientRect();cv.width=Math.round(rect.width*ratio);cv.height=Math.round(rect.height*ratio);
  const ctx=cv.getContext("2d");ctx.scale(ratio,ratio);ctx.lineWidth=2.4;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#1A2118";
  let dessin=false,dernier=null;window._riSigVide=true;
  const pos=e=>{const b=cv.getBoundingClientRect();return {x:e.clientX-b.left,y:e.clientY-b.top};};
  cv.onpointerdown=e=>{dessin=true;dernier=pos(e);cv.setPointerCapture(e.pointerId);const h=document.getElementById("ri-canvas-hint");if(h)h.style.display="none";
    ctx.beginPath();ctx.arc(dernier.x,dernier.y,1.2,0,Math.PI*2);ctx.fillStyle="#1A2118";ctx.fill();window._riSigVide=false;e.preventDefault();};
  cv.onpointermove=e=>{if(!dessin)return;const p=pos(e);ctx.beginPath();ctx.moveTo(dernier.x,dernier.y);ctx.lineTo(p.x,p.y);ctx.stroke();dernier=p;e.preventDefault();};
  cv.onpointerup=cv.onpointercancel=()=>{dessin=false;};
}
function riEffacerSig(){const cv=document.getElementById("ri-canvas");if(!cv)return;cv.getContext("2d").clearRect(0,0,cv.width,cv.height);window._riSigVide=true;const h=document.getElementById("ri-canvas-hint");if(h)h.style.display="flex";}
function riLireSignature(){
  const cv=document.getElementById("ri-canvas");if(!cv||window._riSigVide)return "";
  // version réduite (PNG) pour rester léger
  const out=document.createElement("canvas");const w=600,h=Math.round(600*cv.height/cv.width);out.width=w;out.height=h;
  const ctx=out.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.drawImage(cv,0,0,w,h);
  return out.toDataURL("image/png");
}

function riMsg(t){const b=document.getElementById("ri-msg");if(!b)return;b.style.display="block";b.textContent=t;b.scrollIntoView({behavior:"smooth",block:"center"});}
function saveRI(final){
  const r=window._ri;if(!r)return;
  riLireChamps();
  if(r.photos.some(p=>p.envoi)){riMsg("Patientez : des photos sont encore en cours d'envoi.");return;}
  const sig=riLireSignature();
  if(sig){r.sigClient=sig;r.sigDate=getToday();}
  if(final&&r.statut!=="signe"){
    if(!r.travaux&&!r.checklist.some(x=>x.ok!==null)){riMsg("Renseignez au moins les travaux réalisés ou les points de contrôle.");return;}
    if(!r.sigClient){riMsg("La signature du client est nécessaire pour valider le rapport (ou enregistrez-le en brouillon).");return;}
    if(!r.sigNom){riMsg("Indiquez le nom du signataire.");return;}
    if(!r.hFin){const n=new Date();r.hFin=String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0");}
    r.statut="signe";
  }
  const c=riClient(r);
  // Report de l'état des équipements dans le parc du client
  if(c&&r.statut==="signe"){
    (r.equipements||[]).forEach(e=>{const x=(c.parc||[]).find(p=>p.id===e.parcId);if(!x)return;
      if(e.etat==="hs")x.statut="hs";else if(e.etat==="remplace")x.statut="remplace";else if(e.etat==="surveiller")x.statut="surveiller";else if(e.etat==="ok"&&["hs","surveiller"].includes(x.statut))x.statut="actif";});
  }
  const rec={...r};delete rec._nouveau;
  rec.equipements=(rec.equipements||[]).filter(e=>e.etat||e.note);
  rec.photos=(rec.photos||[]).map(p=>({id:p.id,path:p.path,legende:p.legende||""}));
  if(!rec.id){rec.id=r._tmpId||uid();delete rec._tmpId;INTERVENTIONS.push(rec);logActivity("Rapport d'intervention créé",`${rec.num} — ${c?c.nom:""}`);}
  else{delete rec._tmpId;const i=INTERVENTIONS.findIndex(x=>x.id===rec.id);if(i>=0)INTERVENTIONS[i]=rec;else INTERVENTIONS.push(rec);logActivity("Rapport d'intervention "+(final?"validé":"enregistré"),`${rec.num} — ${c?c.nom:""}`);}
  // L'intervention planifiée est marquée comme faite
  if(rec.eventId){const ev=EVENTS.find(x=>x.id===rec.eventId);if(ev){ev.riId=rec.id;}}
  saveData();renderPage();
  if(final&&rec.statut==="signe"){
    showModal("✅ Rapport validé",`<div style="text-align:center;padding:10px 0"><div style="font-size:40px">✍️</div>
      <div style="font-weight:700;font-size:15px;margin:6px 0">${pE(rec.num)} signé par ${pE(rec.sigNom)}</div>
      <div style="font-size:13px;color:#64748b">Le parc du client a été mis à jour.</div></div>`,
      `<button class="btn-cancel" onclick="closeModal()">Fermer</button>
       <button class="btn-cancel" onclick="genererRIPDF('${rec.id}')">📄 PDF</button>
       <button class="btn-save" style="background:${TH.c1}" onclick="modalEnvoiRI('${rec.id}')">✉️ Envoyer au client</button>`);
  }else{closeModal();}
}
function supprRI(id){
  const r=INTERVENTIONS.find(x=>x.id===id);if(!r)return;
  if(!confirm(`Supprimer définitivement le rapport ${r.num} et ses photos ?`))return;
  const paths=(r.photos||[]).map(p=>p.path).filter(Boolean);
  if(paths.length) sbClient.storage.from(DOCS_BUCKET).remove(paths).catch(()=>{});
  INTERVENTIONS=INTERVENTIONS.filter(x=>x.id!==id);
  EVENTS.forEach(e=>{if(e.riId===id)delete e.riId;});
  logActivity("Rapport d'intervention supprimé",r.num);
  saveData();closeModal();renderPage();
}

// ── Document PDF ──
function riDocHTML(r,impression){
  const c=riClient(r)||{};
  const ico=v=>v===true?`<span style="color:#15803d;font-weight:800">✓ Conforme</span>`:v===false?`<span style="color:#991b1b;font-weight:800">✗ Non conforme</span>`:v==="na"?`<span style="color:#94a3b8">Non applicable</span>`:`<span style="color:#cbd5e1">—</span>`;
  const eqs=(r.equipements||[]).filter(e=>e.etat).map(e=>({e,x:(c.parc||[]).find(p=>p.id===e.parcId)})).filter(o=>o.x);
  const duree=(r.hDebut&&r.hFin)?(()=>{const [a,b]=r.hDebut.split(":").map(Number),[d,f]=r.hFin.split(":").map(Number);const m=(d*60+f)-(a*60+b);return m>0?` (${Math.floor(m/60)}h${String(m%60).padStart(2,"0")})`:"";})():"";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${pE(r.num)}</title><style>${RI_CSS}</style></head><body>
    ${riEnteteHTML("RAPPORT D'INTERVENTION",`${pE(r.num)}<br/>${fDate(r.date)} ${(r.date||"").slice(0,4)}`)}
    <table style="margin-bottom:6px"><tbody>
      <tr><td style="width:50%;border:none;padding:0 12px 0 0"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:4px">Client</div>
        <strong style="font-size:14px">${pE(c.nom||"")}</strong><br/>${pE(c.contact||"")}${c.adresse?"<br/>"+pE(c.adresse):""}${c.tel?"<br/>"+pE(c.tel):""}</td>
      <td style="border:none;padding:0"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:4px">Intervention</div>
        <strong>${pE(RI_TYPES[r.type]||"Intervention")}</strong><br/>Le ${fDate(r.date)} ${(r.date||"").slice(0,4)}${r.hDebut?", de "+r.hDebut.replace(":","h"):""}${r.hFin?" à "+r.hFin.replace(":","h"):""}${duree}<br/>Technicien : ${pE(r.technicien||"—")}</td></tr>
    </tbody></table>
    ${r.checklist&&r.checklist.some(x=>x.ok!==null)?`<h2>Points de contrôle</h2><table class="nobreak"><thead><tr><th>Contrôle</th><th style="width:150px">Résultat</th></tr></thead><tbody>
      ${r.checklist.filter(x=>x.ok!==null).map(x=>`<tr><td>${pE(x.lib)}</td><td>${ico(x.ok)}</td></tr>`).join("")}</tbody></table>`:""}
    ${eqs.length?`<h2>État des équipements</h2><table><thead><tr><th>Équipement</th><th>N° de série</th><th>Emplacement</th><th>État</th></tr></thead><tbody>
      ${eqs.map(({e,x})=>`<tr><td>${pE(x.type)} — ${pE([x.marque,x.modele].filter(Boolean).join(" "))}</td><td>${pE(x.serie)||"—"}</td><td>${pE(x.emplacement)||"—"}</td>
        <td><strong style="color:${(RI_ETATS[e.etat]||[])[1]||"#1A2118"}">${(RI_ETATS[e.etat]||[])[2]||""}</strong>${e.note?`<br/><span style="font-size:11px;color:#475569">${pE(e.note)}</span>`:""}</td></tr>`).join("")}</tbody></table>`:""}
    ${r.travaux?`<h2>Travaux réalisés</h2><div class="box">${pE(r.travaux)}</div>`:""}
    ${r.pieces?`<h2>Pièces fournies ou remplacées</h2><div class="box">${pE(r.pieces)}</div>`:""}
    ${r.observations?`<h2>Observations et recommandations</h2><div class="box">${pE(r.observations)}</div>`:""}
    ${(r.photos||[]).length?`<h2>Photos</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${r.photos.map(p=>`<div class="nobreak">${riEtatPhoto(p)?`<img src="${riEtatPhoto(p)}" style="width:100%;height:220px;object-fit:cover;border-radius:6px"/>`:`<div style="height:220px;background:#f1f5f9;border-radius:6px"></div>`}${p.legende?`<div style="font-size:11px;color:#475569;margin-top:3px">${pE(p.legende)}</div>`:""}</div>`).join("")}</div>`:""}
    <div class="nobreak" style="display:flex;gap:24px;margin-top:26px">
      <div style="flex:1;border:1px solid #e8e4dc;border-radius:8px;padding:10px 12px;min-height:120px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700">Le technicien</div>
        <div style="margin-top:6px;font-weight:700">${pE(r.technicien||"")}</div><div style="font-size:11px;color:#64748b">${pE(TH.nom)} ${pE(TH.sous||"")}</div></div>
      <div style="flex:1;border:1px solid #e8e4dc;border-radius:8px;padding:10px 12px;min-height:120px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700">Le client — bon pour réalisation</div>
        ${r.sigClient?`<img src="${r.sigClient}" style="height:80px;max-width:100%;object-fit:contain;display:block;margin-top:4px"/>`:`<div style="height:80px"></div>`}
        <div style="font-size:11px;color:#475569">${pE(r.sigNom||"")}${r.sigDate?" — signé le "+fDate(r.sigDate)+" "+r.sigDate.slice(0,4):""}</div></div>
    </div>
    <div class="foot">${pE(TH.nom)} ${pE(TH.sous||"")}${TH.contratSiren?" · SIREN "+pE(TH.contratSiren):""} — ${pE(r.num)}</div>
    ${impression?`<script>window.onload=()=>{setTimeout(()=>window.print(),600);}<\/script>`:""}
  </body></html>`;
}
async function genererRIPDF(id){
  const r=INTERVENTIONS.find(x=>x.id===id);if(!r)return;
  const w=window.open("","_blank");if(!w){alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF.");return;}
  w.document.write(`<p style="font-family:Arial;padding:30px;color:#64748b">⟳ Préparation du rapport…</p>`);
  await riChargerURLs(r);
  w.document.open();w.document.write(riDocHTML(r,true));w.document.close();
}
async function modalEnvoiRI(id){
  const r=INTERVENTIONS.find(x=>x.id===id);if(!r)return;
  if(r.statut!=="signe"&&!confirm("Ce rapport n'est pas encore signé. L'envoyer quand même ?"))return;
  showModal("Préparation…",`<div style="padding:30px;text-align:center;color:#64748b">⟳ Chargement des photos…</div>`,`<button class="btn-cancel" onclick="closeModal()">Annuler</button>`);
  await riPrechargerPhotos(r);
  modalEnvoiDoc("intervention",id);
}

// ══════════════════════════════════════════════════════════
