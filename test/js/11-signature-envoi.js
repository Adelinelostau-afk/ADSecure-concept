// ── SIGNATURE EN LIGNE DES DEVIS ──────────────────────────
// ══════════════════════════════════════════════════════════
// Un lien secret (signer.html?t=…) permet au client de consulter une copie figée du devis
// et de le signer. La preuve est gardée dans la table devis_signatures ; l'appli la récupère
// et passe le devis en « Accepté ».
let SIGN_CACHE={};      // devisId → dernier lien connu (sans la copie du devis ni l'image de signature)
let signSyncTs=0, signSyncEnCours=false;
const SIGN_COLS="id,token,devis_id,devis_num,statut,created_at,expires_at,consulte_le,signe_le,signataire,ip,snapshot_hash,client_email";
function sgE(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function urlSignature(token){return location.href.split("#")[0].split("?")[0].replace(/[^/]*$/,"")+"signer.html?t="+token;}
async function sha256Hex(txt){
  try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(txt));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}catch(e){return "";}
}
function dtFr(iso){return iso?new Date(iso).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"}):"—";}

// Crée (ou réutilise si le devis n'a pas changé) le lien de signature d'un devis
async function creerLienSignature(devisId){
  if(AD_TEST) throw new Error("Version de test : la signature en ligne est désactivée.");
  const d=DEVIS.find(x=>x.id===devisId);if(!d) throw new Error("Devis introuvable");
  if(!currentUser||!currentUser.tenant_id) throw new Error("Session invalide, reconnectez-vous.");
  const cli=CLIENTS.find(c=>c.id===d.clientId);
  const html=devisDocHTML(d,false);
  const hash=await sha256Hex(html);
  const {data:exist}=await sbClient.from("devis_signatures").select(SIGN_COLS).eq("devis_id",d.id).eq("statut","en_attente");
  const meme=(exist||[]).find(r=>r.snapshot_hash===hash&&(!r.expires_at||new Date(r.expires_at)>new Date()));
  if(meme){SIGN_CACHE[d.id]=meme;return urlSignature(meme.token);}
  // le devis a changé : les anciens liens sont annulés pour qu'une seule version soit signable
  for(const r of (exist||[])) await sbClient.from("devis_signatures").update({statut:"annule"}).eq("id",r.id);
  const fin=d.validite&&d.validite>=getToday()?d.validite+"T23:59:59":new Date(Date.now()+30*864e5).toISOString();
  const {data,error}=await sbClient.from("devis_signatures").insert({tenant_id:currentUser.tenant_id,devis_id:d.id,devis_num:d.num,
    client_nom:cli?cli.nom:"",client_email:cli&&cli.email||null,montant_ttc:Math.round(devisTTC(d)*100)/100,
    snapshot_html:html,snapshot_hash:hash,expires_at:fin}).select(SIGN_COLS).single();
  if(error) throw new Error(error.message.includes("devis_signatures")?"La signature en ligne n'est pas encore activée sur le serveur.":error.message);
  SIGN_CACHE[d.id]=data;
  d.signEnLigne={id:data.id,cree:getToday()};
  logActivity("Lien de signature créé",`${d.num}${cli?" — "+cli.nom:""}`);
  saveData();
  return urlSignature(data.token);
}

// Récupère les signatures faites par les clients et met les devis à jour
async function syncSignaturesDevis(force){
  if(!currentUser||!currentUser.tenant_id||signSyncEnCours) return;
  if(!force&&Date.now()-signSyncTs<60000) return;
  signSyncEnCours=true;signSyncTs=Date.now();
  try{
    const {data,error}=await sbClient.from("devis_signatures").select(SIGN_COLS).order("created_at",{ascending:true}).limit(1000);
    if(error||!data) return;
    const signes=[];
    SIGN_CACHE={};
    data.forEach(r=>{const prev=SIGN_CACHE[r.devis_id];if(!prev||prev.statut!=="signe"||r.statut==="signe")SIGN_CACHE[r.devis_id]=r;});
    data.filter(r=>r.statut==="signe").forEach(r=>{
      const d=DEVIS.find(x=>x.id===r.devis_id);if(!d)return;
      if(d.signatureElec&&d.signatureElec.id===r.id)return;
      d.signatureElec={id:r.id,date:r.signe_le,nom:r.signataire,ip:r.ip||"",hash:r.snapshot_hash||""};
      if(["brouillon","envoye","expire"].includes(d.statut)) d.statut="accepte";
      logActivity("Devis signé en ligne",`${d.num} par ${r.signataire} le ${dtFr(r.signe_le)}`);
      signes.push(d);
    });
    if(signes.length){
      saveData();renderPage();renderNav();
      setTimeout(()=>alert(`✍️ ${signes.length>1?signes.length+" devis signés":"Devis signé"} en ligne :\n\n`+signes.map(d=>{const c=CLIENTS.find(x=>x.id===d.clientId);return `• ${d.num}${c?" — "+c.nom:""} (signé par ${d.signatureElec.nom})`;}).join("\n")+"\n\nIl"+(signes.length>1?"s sont passés":" est passé")+" en « Accepté »."),300);
    }else if(["devis","client-fiche"].includes(currentPage)){
      // mise à jour des pastilles « consulté / en attente »
      const c=document.getElementById("content");if(c&&!document.querySelector(".modal-overlay"))renderPage();
    }
  }catch(e){}finally{signSyncEnCours=false;}
}
setInterval(()=>{if(document.visibilityState==="visible")syncSignaturesDevis();},120000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")syncSignaturesDevis();});

// Pastille affichée à côté du statut du devis
function signBadge(d){
  if(d.validationSansSign&&!d.signatureElec){const v=d.validationSansSign;return ` <span class="badge" title="Validé sans signature (${sgE(vssMotifLbl(v.motif))}) le ${sgE(dtFr(v.date))}${v.par?" par "+sgE(v.par):""}" style="background:#ede9fe;color:#6d28d9">👍 validé sans signature</span>`;}
  if(d.signatureElec) return ` <span class="badge" title="Signé par ${sgE(d.signatureElec.nom)} le ${sgE(dtFr(d.signatureElec.date))}" style="background:#dcfce7;color:#15803d">✍️ signé en ligne</span>`;
  const r=SIGN_CACHE[d.id];
  if(r&&r.statut==="en_attente"){
    if(r.expires_at&&new Date(r.expires_at)<new Date()) return ` <span class="badge" style="background:#f1f5f9;color:#94a3b8">lien expiré</span>`;
    return r.consulte_le?` <span class="badge" title="Ouvert le ${sgE(dtFr(r.consulte_le))}" style="background:#fef9c3;color:#a16207">👁️ consulté</span>`:` <span class="badge" style="background:#e8f4f8;color:#3286A0">🔗 en attente</span>`;
  }
  return "";
}
function signBouton(d){
  const r=SIGN_CACHE[d.id];
  const ico=d.signatureElec?"✅":(r&&r.statut==="en_attente"?"🔗":"🖊️");
  return `<button class="btn-sm" onclick="modalSignEnLigne('${d.id}')" title="Signature en ligne" style="border-color:#a7f3d0;background:#ecfdf5;color:#047857">${ico}</button>`;
}

// ── Validation d'un devis sans signature (accord par téléphone, e-mail, SMS, oral…) ──
const VSS_MOTIFS=[["telephone","Accord par téléphone"],["email","Accord par e-mail"],["sms","Accord par SMS / WhatsApp"],["oral","Accord oral sur place"],["autre","Autre"]];
function vssMotifLbl(k){const m=VSS_MOTIFS.find(x=>x[0]===k);return m?m[1]:(k||"—");}
// Bouton unique « Bon de commande » :
// devis signé ou déjà accepté → bon de commande créé directement ;
// sinon → on note comment le client a accepté, puis le bon de commande est créé.
function vssBouton(d){
  const archive=devisEstArchive(d)||d.statut==="transforme";
  if(archive) return d.validationSansSign?`<button class="btn-sm" onclick="modalValidationSansSign('${d.id}')" title="Validé sans signature — voir le détail" style="border-color:#ddd6fe;background:#f5f3ff;color:#6d28d9">👍✓</button>`:"";
  if(d.statut==="refuse") return "";
  return `<button class="btn-sm" onclick="devisBonDeCommande('${d.id}')" title="Passer en bon de commande" style="border-color:#fde68a;background:#fffbeb;color:#b45309">📋</button>`;
}
function devisBonDeCommande(id){
  const d=DEVIS.find(x=>x.id===id);if(!d)return;
  if(d.signatureElec||d.statut==="accepte") devisVersBC(id);
  else modalValidationSansSign(id);
}
function vssLocalNow(){const d=new Date();const z=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;}
function modalValidationSansSign(devisId){
  const d=DEVIS.find(x=>x.id===devisId);if(!d)return;
  const cli=CLIENTS.find(c=>c.id===d.clientId);
  const v=d.validationSansSign;
  if(v){
    showModal(`👍 ${sgE(d.num)} validé sans signature`,`
      <div style="background:#f5f3ff;border:1.5px solid #ddd6fe;border-radius:12px;padding:14px 16px;margin-bottom:14px">
        <div style="font-weight:800;color:#6d28d9;font-size:15px">${sgE(vssMotifLbl(v.motif))}</div>
        <div style="font-size:13px;color:#6d28d9">le ${sgE(dtFr(v.date))}</div></div>
      ${[["Client",cli?cli.nom:"—"],["Montant",fMoney(devisTTC(d))+" TTC"],["Bon de commande",v.bccNum||d.bccNum||"—"],["Enregistré par",v.par||"—"],["Note",v.note||"—"]]
        .map(([l,x])=>`<div style="display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:7px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b">${l}</span><span style="font-weight:600;text-align:right;white-space:pre-line">${sgE(x)}</span></div>`).join("")}`,
      `${vssAnnulable(d)?`<button class="btn-cancel" style="color:#991b1b;border-color:#fecaca;margin-right:auto" onclick="annulerValidationSansSign('${d.id}')">Annuler la validation</button>`:""}
       <button class="btn-cancel" onclick="closeModal()">Fermer</button>`);
    return;
  }
  showModal(`📋 Bon de commande — ${sgE(d.num)}`,`
    <div style="font-size:14px;font-weight:700;color:#1A2118;margin-bottom:6px">Ce devis n'est pas signé.</div>
    <div style="font-size:13px;color:#475569;margin-bottom:12px;line-height:1.5">Le devis de ${sgE(cli?cli.nom:"ce client")} (${fMoney(devisTTC(d))} TTC) sera validé et <b>le bon de commande créé aussitôt</b> (le devis passe aux archives). La façon dont le client a donné son accord est conservée et figure sur le PDF du devis et du bon de commande.</div>
    ${BCCLIENTS.some(b=>b.devisId===d.id)?`<div style="font-size:12px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:8px 10px;margin-bottom:10px">⚠️ Un bon de commande existe déjà pour ce devis : un second sera créé.</div>`:""}
    <div class="field"><label>Comment le client a-t-il accepté ?</label>
      <select id="vss-motif" style="font-size:16px">${VSS_MOTIFS.map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></div>
    <div class="field"><label>Date et heure de l'accord</label><input type="datetime-local" id="vss-date" value="${vssLocalNow()}" style="font-size:16px"/></div>
    <div class="field"><label>Note (facultatif)</label><textarea id="vss-note" style="font-size:16px;min-height:70px" placeholder="Ex. : accord de M. Dupont au téléphone, acompte prévu à la commande"></textarea></div>
    <div id="vss-msg" style="display:none;margin-top:8px;padding:10px 12px;border-radius:9px;font-size:13px;background:#fef2f2;color:#991b1b"></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:#6d28d9" onclick="enregistrerValidationSansSign('${d.id}')">📋 Valider et créer le bon de commande</button>`);
}
function enregistrerValidationSansSign(devisId){
  const d=DEVIS.find(x=>x.id===devisId);if(!d)return;
  const motif=(document.getElementById("vss-motif")||{}).value||"autre";
  const dt=(document.getElementById("vss-date")||{}).value;
  const note=((document.getElementById("vss-note")||{}).value||"").trim();
  const msg=t=>{const m=document.getElementById("vss-msg");if(m){m.style.display="block";m.textContent=t;}};
  if(!dt){msg("Indiquez la date et l'heure de l'accord.");return;}
  const date=new Date(dt);
  if(isNaN(date)){msg("Date invalide.");return;}
  if(date>new Date(Date.now()+60000)){msg("La date de l'accord ne peut pas être dans le futur.");return;}
  if(motif==="autre"&&!note){msg("Précisez dans la note comment le client a donné son accord.");return;}
  const v={motif,date:date.toISOString(),note,par:currentUser?currentUser.nom:"",saisiLe:new Date().toISOString(),statutAvant:d.statut};
  const num=prochainNumero("BCC",BCCLIENTS);
  const bccId=uid();
  v.bccId=bccId;v.bccNum=num;
  BCCLIENTS.push({
    id:bccId,num,
    devisId:d.id,devisNum:d.num,
    clientId:d.clientId,
    refChantier:d.refChantier||"",
    date:TODAY,
    statut:"en_cours",
    tva:(d.tva!==undefined&&d.tva!==null)?d.tva:TVA_DEFAUT,
    lignes:JSON.parse(JSON.stringify(d.lignes||[])),
    validationSansSign:{motif:v.motif,date:v.date,note:v.note}
  });
  d.validationSansSign=v;
  d.statut="transforme";d.bccNum=num;
  const cli=CLIENTS.find(c=>c.id===d.clientId);
  logActivity("Devis validé sans signature",`${d.num}${cli?" — "+cli.nom:""} · ${vssMotifLbl(motif)} le ${dtFr(v.date)} → ${num}`);
  saveData();closeModal();
  alert(`👍 Devis ${d.num} validé sans signature.\nBon de commande ${num} créé — le devis est passé aux archives.`);
  renderPage();renderNav();
}
// Annulation possible seulement si le bon de commande n'a pas encore avancé (ni règlement, ni livraison, ni facture)
function vssAnnulable(d){
  const v=d.validationSansSign;if(!v)return false;
  const b=v.bccId?BCCLIENTS.find(x=>x.id===v.bccId):null;
  if(!b)return true;
  return b.statut==="en_cours"&&!(b.paiements&&b.paiements.length);
}
function annulerValidationSansSign(devisId){
  const d=DEVIS.find(x=>x.id===devisId);if(!d||!d.validationSansSign)return;
  if(!vssAnnulable(d)){alert("Le bon de commande a déjà avancé (règlement, livraison ou facture) : la validation ne peut plus être annulée.");return;}
  const v=d.validationSansSign;
  if(!confirm(`Annuler la validation sans signature ?${v.bccNum?"\nLe bon de commande "+v.bccNum+" sera supprimé et":"\nLe"} devis repassera à son statut précédent.`))return;
  if(v.bccId) BCCLIENTS=BCCLIENTS.filter(x=>x.id!==v.bccId);
  const avant=v.statutAvant;
  d.statut=(avant&&!["accepte","transforme"].includes(avant))?avant:"envoye";
  delete d.bccNum;
  delete d.validationSansSign;
  logActivity("Validation sans signature annulée",`${d.num}${v.bccNum?" (bon de commande "+v.bccNum+" supprimé)":""}`);
  saveData();closeModal();renderPage();renderNav();
}

async function modalSignEnLigne(devisId){
  const d=DEVIS.find(x=>x.id===devisId);if(!d)return;
  const cli=CLIENTS.find(c=>c.id===d.clientId);
  showModal(`🖊️ Signature en ligne — ${sgE(d.num)}`,`<div style="padding:30px;text-align:center;color:#64748b">⟳ Chargement…</div>`,`<button class="btn-cancel" onclick="closeModal()">Fermer</button>`);
  const {data:rows}=await sbClient.from("devis_signatures").select(SIGN_COLS).eq("devis_id",d.id).order("created_at",{ascending:false});
  const L=rows||[];
  const signe=L.find(r=>r.statut==="signe");
  const attente=L.find(r=>r.statut==="en_attente"&&(!r.expires_at||new Date(r.expires_at)>new Date()));
  if(signe){
    showModal(`✍️ ${sgE(d.num)} signé en ligne`,`
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:14px 16px;margin-bottom:14px">
        <div style="font-weight:800;color:#15803d;font-size:15px">Signé par ${sgE(signe.signataire)}</div>
        <div style="font-size:13px;color:#15803d">le ${sgE(dtFr(signe.signe_le))}</div></div>
      ${[["Client",cli?cli.nom:"—"],["Lien ouvert le",dtFr(signe.consulte_le)],["Adresse IP",signe.ip||"—"],["Empreinte du devis signé",(signe.snapshot_hash||"—").slice(0,32)+"…"]]
        .map(([l,v])=>`<div style="display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:7px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b">${l}</span><span style="font-weight:600;text-align:right;word-break:break-all">${sgE(v)}</span></div>`).join("")}
      <div style="font-size:12px;color:#64748b;margin-top:10px">Le certificat reprend la copie exacte du devis tel que le client l'a signé, avec sa signature et les éléments de preuve.</div>`,
      `<button class="btn-cancel" onclick="closeModal()">Fermer</button>
       <button class="btn-cancel" onclick="window.open('${urlSignature(signe.token)}','_blank')">↗️ Page du client</button>
       <button class="btn-save" style="background:${TH.c1}" onclick="imprimerCertificatSignature('${signe.id}')">📄 Certificat PDF</button>`);
    return;
  }
  if(attente){
    const url=urlSignature(attente.token);
    showModal(`🔗 Lien de signature — ${sgE(d.num)}`,`
      <div style="font-size:13px;color:#475569;margin-bottom:10px">Envoyez ce lien à ${sgE(cli?cli.nom:"votre client")} : il pourra lire le devis et le signer depuis son téléphone ou son ordinateur.</div>
      <div style="display:flex;gap:6px;margin-bottom:12px"><input id="sg-url" readonly value="${sgE(url)}" onclick="this.select()" style="flex:1;padding:10px 12px;border-radius:9px;border:1.5px solid #e2e8f0;font-size:12.5px;background:#F7F4ED"/>
        <button class="btn-sm" onclick="copierLienSign(this)">📋 Copier</button></div>
      ${[["Créé le",dtFr(attente.created_at)],["Valable jusqu'au",dtFr(attente.expires_at)],["Ouvert par le client",attente.consulte_le?"Oui, le "+dtFr(attente.consulte_le):"Pas encore"]]
        .map(([l,v])=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:7px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b">${l}</span><span style="font-weight:600">${sgE(v)}</span></div>`).join("")}
      ${navigator.share?`<button class="btn-sm" style="margin-top:12px" onclick="navigator.share({title:'Devis ${sgE(d.num)}',text:'Votre devis ${sgE(d.num)} à signer en ligne',url:document.getElementById('sg-url').value}).catch(()=>{})">📤 Partager (SMS, WhatsApp…)</button>`:""}`,
      `<button class="btn-cancel" style="color:#991b1b;border-color:#fecaca;margin-right:auto" onclick="annulerLienSign('${attente.id}','${d.id}')">Annuler le lien</button>
       <button class="btn-cancel" onclick="closeModal()">Fermer</button>
       <button class="btn-save" style="background:${TH.c1}" onclick="closeModal();modalEnvoiDevis('${d.id}')">✉️ Envoyer par e-mail</button>`);
    return;
  }
  showModal(`🖊️ Signature en ligne — ${sgE(d.num)}`,`
    <div style="font-size:14px;color:#1A2118;line-height:1.6">Créez un lien sécurisé pour que ${sgE(cli?cli.nom:"le client")} signe ce devis en ligne.</div>
    <ul style="font-size:13px;color:#475569;line-height:1.7;padding-left:18px">
      <li>Le client voit une copie figée du devis (${fMoney(devisTTC(d))} TTC) et signe au doigt ou à la souris.</li>
      <li>Le devis passe en « Accepté » dans l'appli et vous recevez un e-mail.</li>
      <li>Nom, date, IP et empreinte du document sont conservés comme preuve.</li>
      <li>Le lien expire à la date de validité du devis${d.validite?" ("+fDate(d.validite)+")":""}.</li>
    </ul>
    <div id="sg-msg" style="display:none;margin-top:8px;padding:10px 12px;border-radius:9px;font-size:13px;background:#fef2f2;color:#991b1b"></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" id="sg-btn" style="background:${TH.c1}" onclick="creerEtAfficherLien('${d.id}')">🔗 Créer le lien</button>`);
}
async function creerEtAfficherLien(devisId){
  const b=document.getElementById("sg-btn");if(b){b.disabled=true;b.textContent="⟳ Création…";}
  try{await creerLienSignature(devisId);const d=DEVIS.find(x=>x.id===devisId);if(d&&d.statut==="brouillon")d.statut="envoye";saveData();renderPage();modalSignEnLigne(devisId);}
  catch(e){const m=document.getElementById("sg-msg");if(m){m.style.display="block";m.textContent=e.message||String(e);}if(b){b.disabled=false;b.textContent="🔗 Créer le lien";}}
}
function copierLienSign(b){
  const i=document.getElementById("sg-url");if(!i)return;
  const ok=()=>{if(b){const t=b.textContent;b.textContent="✓ Copié";setTimeout(()=>{b.textContent=t;},1500);}};
  if(navigator.clipboard) navigator.clipboard.writeText(i.value).then(ok,()=>{i.select();document.execCommand("copy");ok();});
  else{i.select();document.execCommand("copy");ok();}
}
async function annulerLienSign(id,devisId){
  if(!confirm("Annuler ce lien ? Le client ne pourra plus signer avec."))return;
  const {error}=await sbClient.from("devis_signatures").update({statut:"annule"}).eq("id",id);
  if(error){alert("Annulation impossible : "+error.message);return;}
  delete SIGN_CACHE[devisId];logActivity("Lien de signature annulé",(DEVIS.find(x=>x.id===devisId)||{}).num||"");
  closeModal();renderPage();
}
async function imprimerCertificatSignature(id){
  const w=window.open("","_blank");if(!w){alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF.");return;}
  w.document.write(`<p style="font-family:Arial;padding:30px;color:#64748b">⟳ Préparation du certificat…</p>`);
  const {data:r,error}=await sbClient.from("devis_signatures").select("*").eq("id",id).single();
  if(error||!r){w.document.body.innerHTML="Certificat introuvable.";return;}
  const bloc=`<div style="page-break-before:always;font-family:Inter,Arial,sans-serif;padding:40px 46px;color:#1A2118">
    <div style="border-bottom:3px solid ${TH.c1};padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end">
      <div style="font-size:20px;font-weight:800">CERTIFICAT DE SIGNATURE ÉLECTRONIQUE</div><div style="font-size:12px;color:#64748b">${sgE(r.devis_num)}</div></div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      ${[["Document","Devis "+r.devis_num+" — "+Number(r.montant_ttc||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR"})+" TTC"],["Émetteur",`${TH.nom} ${TH.sous||""}`.trim()],["Client",r.client_nom||"—"],
        ["Lien créé le",dtFr(r.created_at)],["Lien ouvert le",dtFr(r.consulte_le)],["Signé le",dtFr(r.signe_le)],["Signataire",r.signataire||"—"],
        ["Mention acceptée","Bon pour accord — acceptation du devis et des conditions générales de vente"],["Adresse IP",r.ip||"—"],["Navigateur",r.user_agent||"—"],
        ["Empreinte SHA-256 du devis",r.snapshot_hash||"—"]].map(([l,v])=>`<tr><td style="padding:8px 10px;border-bottom:1px solid #e8e4dc;color:#64748b;width:200px;vertical-align:top">${sgE(l)}</td><td style="padding:8px 10px;border-bottom:1px solid #e8e4dc;font-weight:600;word-break:break-all">${sgE(v)}</td></tr>`).join("")}
    </table>
    <div style="margin-top:22px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700">Signature du client</div>
    ${r.signature_png?`<img src="${r.signature_png}" style="height:120px;max-width:100%;object-fit:contain;border:1px solid #e8e4dc;border-radius:8px;margin-top:6px"/>`:""}
    <p style="font-size:11px;color:#64748b;margin-top:20px;line-height:1.6">Signature électronique simple au sens du règlement (UE) n° 910/2014 (eIDAS). Le devis reproduit dans ce document est la copie exacte présentée au signataire ; son empreinte SHA-256 permet d'en vérifier l'intégrité.</p>
  </div>`;
  let html=r.snapshot_html||"";
  html=html.includes("</body>")?html.replace("</body>",bloc+`<script>window.onload=()=>{setTimeout(()=>window.print(),600);}<\/script></body>`):html+bloc;
  w.document.open();w.document.write(html);w.document.close();
}

function devisDocHTML(d,impression){
  const cli=CLIENTS.find(c=>c.id===d.clientId);
  const ht=devisHT(d),mtva=devisTVA(d),ttc=devisTTC(d);
  const logoSrc=thLogo();
  const[,,statutLbl]=ST_DEVIS[d.statut]||ST_DEVIS.brouillon;
  const doc=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><base href="${location.href}"/><title>${d.num}</title>
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
    thead th.r,tbody td.r{text-align:right}
    thead th.c,tbody td.c{text-align:center}
    tbody td{padding:11px 14px;border-bottom:1px solid #e8e4dc}
    .totaux{display:flex;justify-content:flex-end;margin-bottom:24px}
    .totaux table{width:300px}
    .totaux td{padding:8px 14px;font-size:13px}
    .totaux .ttc{background:${TH.c1};color:#fff;font-weight:800;font-size:16px}
    .totaux .ttc td{padding:12px 14px}
    .notes{background:#F7F4ED;border-radius:8px;padding:14px 18px;font-size:12px;color:#475569;margin-bottom:24px}
    .notes .lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:5px}
    .sign{display:flex;justify-content:space-between;margin-top:36px;gap:30px}
    .sign-box{flex:1;border:1px solid #e8e4dc;border-radius:8px;padding:14px;min-height:90px}
    .sign-box .lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:4px}
    .footer{margin-top:30px;padding-top:18px;border-top:1px solid #e8e4dc;font-size:10px;color:#94a3b8;text-align:center;line-height:1.7}
    @media print{body{padding:30px 36px}}
  </style></head><body>
    <div class="head">
      <div class="logo-zone">
        ${logoSrc?`<img src="${logoSrc}" onerror="this.style.display='none'"/>`:""}
        <div><div class="brand-name">${TH.nom}</div><div class="brand-sub">${TH.sous}</div></div>
      </div>
      <div class="doc-title">
        <h1>DEVIS</h1>
        <div class="num">${d.num}</div>
        <div class="num">Date : ${d.date?fDate(d.date):"—"}</div>
        <div class="num">Valable jusqu'au : ${d.validite?fDate(d.validite):"—"}</div>
        ${d.refChantier?`<div class="num" style="font-weight:700;color:${TH.c1}">Réf. chantier : ${d.refChantier.replace(/</g,"&lt;")}</div>`:""}
      </div>
    </div>
    <div class="parties">
      <div class="partie">
        <div class="lbl">Émetteur</div>
        <div class="nom">${TH.nom} ${TH.sous}</div>
        <div class="det">${TH.adresse?TH.adresse+"<br/>":""}${TH.email?TH.email+"<br/>":""}${TH.tel||""}</div>
      </div>
      <div class="partie" style="text-align:right">
        <div class="lbl">Destinataire</div>
        <div class="nom">${cli?cli.nom:"—"}</div>
        <div class="det">${cli&&cli.adresse?cli.adresse.replace(/</g,"&lt;")+"<br/>":""}${cli?(cli.contact||""):""}${cli&&cli.email?"<br/>"+cli.email:""}${cli&&cli.tel?"<br/>"+cli.tel:""}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Désignation</th><th class="c">Qté</th><th class="r">P.U. HT</th><th class="r">Total HT</th></tr></thead>
      <tbody>
        ${(d.lignes||[]).map(l=>`<tr><td>${l.ref?`<span style="font-size:8.5px;font-weight:700;color:#94a3b8;letter-spacing:.04em">${(l.ref||"").replace(/</g,"&lt;")}</span><br/>`:""}${(l.desc||"").replace(/</g,"&lt;")}${(l.det||"").trim()?`<div style="font-size:9px;color:#64748b;line-height:1.35;margin-top:2px;white-space:pre-line">${(l.det||"").replace(/</g,"&lt;")}</div>`:""}</td><td class="c">${l.qte}${l.unite?`<div style="font-size:8.5px;color:#94a3b8">${(l.unite||"").replace(/</g,"&lt;")}</div>`:""}</td><td class="r">${fMoney(l.pu)}</td><td class="r">${fMoney((l.qte||0)*(l.pu||0))}</td></tr>`).join("")}
      </tbody>
    </table>
    <div class="totaux">
      <table>
        <tr><td>Total HT</td><td style="text-align:right">${fMoney(ht)}</td></tr>
        <tr><td>TVA ${fTaux(d.tva||0)}</td><td style="text-align:right">${fMoney(mtva)}</td></tr>
        <tr class="ttc"><td>TOTAL TTC</td><td style="text-align:right">${fMoney(ttc)}</td></tr>
      </table>
    </div>
    ${d.notes?`<div class="notes"><div class="lbl">Notes</div>${d.notes.replace(/</g,"&lt;")}</div>`:""}
    <div class="sign">
      ${d.validationSansSign&&!d.signatureElec?`<div class="sign-box"><div class="lbl">Accord du client</div><div style="font-size:12px;font-weight:700;color:#1A2118;margin-top:4px">Validé sans signature</div><div style="font-size:11px;color:#475569;margin-top:2px">${vssMotifLbl(d.validationSansSign.motif)} — le ${dtFr(d.validationSansSign.date)}</div>${d.validationSansSign.note?`<div style="font-size:10px;color:#64748b;margin-top:3px;white-space:pre-line">${String(d.validationSansSign.note).replace(/</g,"&lt;")}</div>`:""}</div>`:`<div class="sign-box"><div class="lbl">Date et signature client</div><div style="font-size:11px;color:#94a3b8">« Bon pour accord »</div></div>`}
      <div class="sign-box"><div class="lbl">${TH.nom} ${TH.sous}</div></div>
    </div>
    <div class="footer">
      Devis valable jusqu'au ${d.validite?fDate(d.validite):"—"} · Établi le ${fDate(TODAY)}<br/>
      ${TH.nom} ${TH.sous}${TH.siret?" · SIRET : "+TH.siret:""} · Ce devis ne vaut engagement qu'après acceptation signée.<br/>
      ${TH.mentionsLegales||""}
    </div>
    ${impression?`<script>window.onload=()=>{setTimeout(()=>window.print(),400);}<\/script>`:""}
  </body></html>`;
  return doc;
}
function genererDevisPDF(id){
  const d=DEVIS.find(x=>x.id===id);if(!d){alert("Devis introuvable");return;}
  const cli=CLIENTS.find(c=>c.id===d.clientId);
  const doc=devisDocHTML(d,true);
  const w=window.open("","_blank");
  if(!w){alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF.");return;}
  w.document.write(doc);w.document.close();
  logActivity("Génération devis",`PDF : ${d.num}`);
  logDocument("devis",d.id,d.num,cli?cli.nom:"",devisTTC(d));
}

// ══════════════════════════════════════════════════════════
// ── ENVOI DES DEVIS ET FACTURES PAR E-MAIL (PDF joint) ──
// ══════════════════════════════════════════════════════════
// Le PDF est fabriqué dans l'appli (html2canvas + jsPDF), puis la fonction Supabase
// « relances-auto » (action "email") l'envoie depuis l'adresse professionnelle.
const PDF_LIBS=[
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];
let pdfLibsPromise=null;
function chargerLibsPDF(){
  if(pdfLibsPromise) return pdfLibsPromise;
  pdfLibsPromise=PDF_LIBS.reduce((p,src)=>p.then(()=>new Promise((ok,ko)=>{
    const sc=document.createElement("script"); sc.src=src; sc.onload=ok;
    sc.onerror=()=>{pdfLibsPromise=null;ko(new Error("Chargement de l'outil PDF impossible (connexion internet ?)"));};
    document.head.appendChild(sc);
  })),Promise.resolve());
  return pdfLibsPromise;
}
// Charge dans le document à convertir les polices de l'appli (Inter, Lora)
const PDF_POLICES="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;0,700;1,600&family=Inter:wght@400;500;600;700;800&display=block";
async function pdfChargerPolices(doc){
  const delai=ms=>new Promise(ok=>setTimeout(ok,ms));
  try{
    const lk=doc.createElement("link"); lk.rel="stylesheet"; lk.href=PDF_POLICES;
    const charge=new Promise(ok=>{lk.onload=lk.onerror=ok;});
    doc.head.appendChild(lk);
    await Promise.race([charge,delai(6000)]);
    if(doc.fonts&&doc.fonts.load){
      await Promise.race([Promise.all(["400","500","600","700","800"].map(w=>doc.fonts.load(`${w} 12px Inter`,"Aéz")).concat(
        ["500","600","700"].map(w=>doc.fonts.load(`${w} 12px Lora`,"Aéz")))),delai(6000)]);
    }
    if(doc.fonts&&doc.fonts.ready) await Promise.race([doc.fonts.ready,delai(6000)]);
  }catch(e){ console.warn("Polices PDF",e); }
}
// Convertit un document HTML A4 en PDF (base64, sans en-tête data:)
async function htmlVersPdfBase64(html,opts){
  opts=opts||{};
  await chargerLibsPDF();
  const LARG=794, HAUT=1123; // A4 à 96 dpi
  const ifr=document.createElement("iframe");
  ifr.style.cssText=`position:fixed;left:-10000px;top:0;width:${LARG}px;height:${HAUT}px;border:0;visibility:hidden`;
  document.body.appendChild(ifr);
  try{
    await new Promise(ok=>{ ifr.onload=ok; ifr.srcdoc=html; });
    const doc=ifr.contentDocument;
    // Mise en page et dessin doivent utiliser la même police : sinon html2canvas dessine
    // chaque mot avec Inter (chargée dans l'appli) à des positions calculées avec Arial,
    // et les mots se chevauchent (« fixationdes », « contac@ »…).
    await pdfChargerPolices(doc);
    await Promise.all([...doc.images].map(im=>im.complete?null:new Promise(ok=>{im.onload=im.onerror=ok;})));
    const hauteur=Math.max(doc.documentElement.scrollHeight,doc.body.scrollHeight);
    ifr.style.height=hauteur+"px";
    const {jsPDF}=window.jspdf;
    const pdf=new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
    let premiere=true;
    // Ajoute un rendu au PDF, en le coupant sur plusieurs pages A4 s'il est trop haut
    const ajouter=canvas=>{
      const pxParPage=Math.floor(canvas.width*HAUT/LARG);
      const nbPages=Math.max(1,Math.ceil((canvas.height-8)/pxParPage));
      for(let i=0;i<nbPages;i++){
        const h=Math.min(pxParPage,canvas.height-i*pxParPage);
        const part=document.createElement("canvas"); part.width=canvas.width; part.height=h;
        const ctx=part.getContext("2d"); ctx.fillStyle="#fff"; ctx.fillRect(0,0,part.width,h);
        ctx.drawImage(canvas,0,i*pxParPage,canvas.width,h,0,0,canvas.width,h);
        if(!premiere) pdf.addPage(); premiere=false;
        pdf.addImage(part.toDataURL("image/jpeg",0.9),"JPEG",0,0,210,210*h/canvas.width);
      }
    };
    const blocs=opts.pages?[...doc.querySelectorAll(opts.pages)]:[];
    if(blocs.length){
      // Une section = une nouvelle page (les sauts de page CSS ne sont pas lus par html2canvas)
      for(const el of blocs){
        ajouter(await html2canvas(el,{scale:2,useCORS:true,backgroundColor:"#ffffff",windowWidth:LARG,windowHeight:hauteur}));
      }
    }else{
      ajouter(await html2canvas(doc.body,{scale:2,useCORS:true,backgroundColor:"#ffffff",width:LARG,windowWidth:LARG,height:hauteur,windowHeight:hauteur}));
    }
    return pdf.output("datauristring").split(",")[1];
  }finally{ ifr.remove(); }
}

// Types de documents envoyables : devis et factures
const DOC_ENVOI={
  devis:{
    titre:"le devis", liste:()=>DEVIS, html:d=>devisDocHTML(d,false), apercu:id=>genererDevisPDF(id),
    client:d=>CLIENTS.find(c=>c.id===d.clientId), ttc:d=>devisTTC(d), prefixe:"Devis",
    cleModele:"modeleMailDevis", reperes:["contact","entreprise","numero","montant","validite","signature"],
    modele:"Bonjour {contact},\n\nVeuillez trouver ci-joint notre devis {numero} d'un montant de {montant} TTC, valable jusqu'au {validite}.\n\nPour l'accepter, il vous suffit de nous le retourner signé avec la mention « Bon pour accord », ou de répondre simplement à cet e-mail.\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\n{signature}",
    valeurs:d=>({validite:d.validite?RelancesCore.dateLongue(d.validite):"—"}),
    apresEnvoi:d=>{ if(d.statut==="brouillon") d.statut="envoye"; }
  },
  facture:{
    titre:"la facture", liste:()=>FACTURES, html:f=>factureDocHTML(f,false), apercu:id=>genererFacturePDF(id),
    client:f=>CLIENTS.find(c=>c.id===f.clientId)||CLIENTS.find(c=>c.nom===f.client), ttc:f=>facTTC(f), prefixe:"Facture",
    cleModele:"modeleMailFacture", reperes:["contact","entreprise","numero","montant","reste","echeance","signature"],
    modele:"Bonjour {contact},\n\nVeuillez trouver ci-joint notre facture {numero} d'un montant de {montant} TTC, à régler au plus tard le {echeance}.\n\nNous vous remercions de votre confiance et restons à votre disposition pour toute question.\n\nCordialement,\n{signature}",
    valeurs:f=>({echeance:f.ech?RelancesCore.dateLongue(f.ech):"—",reste:fMoney(facReste(f))}),
    apresEnvoi:f=>{ if(f.statut==="brouillon") f.statut="envoyee"; }
  },
  intervention:{
    titre:"le rapport", liste:()=>INTERVENTIONS, html:r=>riDocHTML(r,false), apercu:id=>genererRIPDF(id),
    client:r=>CLIENTS.find(c=>c.id===r.clientId), ttc:()=>0, prefixe:"Rapport d'intervention",
    cleModele:"modeleMailRI", reperes:["contact","entreprise","numero","date","type","signature"],
    modele:"Bonjour {contact},\n\nVeuillez trouver ci-joint le rapport {numero} de notre intervention du {date} ({type}).\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\n{signature}",
    valeurs:r=>({date:r.date?RelancesCore.dateLongue(r.date):"—",type:(RI_TYPES[r.type]||"intervention").toLowerCase()}),
    apresEnvoi:()=>{}
  },
  remise:{
    get titre(){ return "le "+FV("remiseLbl").toLowerCase(); }, liste:()=>CLIENTS, num:c=>c.nom||"",
    html:c=>{const o=remiseDefauts(c);const ri=o.sections.pv&&o.riId?INTERVENTIONS.find(x=>x.id===o.riId):null;return dossierRemiseHTML(c,o,ri,false);},
    pages:"section.page", apercu:id=>genererDossierRemise(id),
    client:c=>c, ttc:()=>0, prefixe:"Dossier de remise", envois:c=>{c.dossierRemise=c.dossierRemise||{};return c.dossierRemise.envois=c.dossierRemise.envois||[];},
    cleModele:"modeleMailRemise", reperes:["contact","entreprise","signature"],
    get modele(){ return MP().video
      ?"Bonjour {contact},\n\nVeuillez trouver ci-joint le dossier de remise de votre installation : fiche du matériel, guide d'utilisation, informations légales, procès-verbal de mise en service, garanties et contacts SAV.\n\nNous vous conseillons de le conserver précieusement. Vos identifiants de connexion vous ont été remis séparément.\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\n{signature}"
      :`Bonjour {contact},\n\nVeuillez trouver ci-joint votre ${FV("remiseLbl").toLowerCase()} : récapitulatif des éléments réalisés, conseils d'utilisation et d'entretien, procès-verbal, garanties et contacts.\n\nNous vous conseillons de le conserver précieusement.\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\n{signature}`; },
    valeurs:()=>({}), apresEnvoi:()=>{}
  }
};
const docNum=(T,d)=>T.num?T.num(d):d.num;
const docEnvois=(T,d)=>T.envois?T.envois(d):(d.envois=d.envois||[]);
function docValeursMail(type,d){
  const T=DOC_ENVOI[type], cli=T.client(d);
  const emetteur=`${TH.nom} ${TH.sous||""}`.trim();
  const coord=[TH.tel,TH.email].filter(Boolean).join(" · ");
  return {contact:cli&&cli.contact?cli.contact:"Madame, Monsieur",entreprise:cli?cli.nom:(d.client||""),numero:docNum(T,d),
    montant:fMoney(T.ttc(d)),signature:SigMail.cfg(TH).actif?SigMail.court(TH,currentUser&&currentUser.id):emetteur+(coord?"\n"+coord:""),...T.valeurs(d)};
}
function docMessageDefaut(type,d){
  const T=DOC_ENVOI[type], v=docValeursMail(type,d);
  return String(TH[T.cleModele]||T.modele).replace(/\{(\w+)\}/g,(m,k)=>v[k]!==undefined?v[k]:m);
}
// Garde le texte saisi comme modèle : les valeurs du document redeviennent des {repères}
function garderModeleDoc(type,id){
  const T=DOC_ENVOI[type], d=T.liste().find(x=>x.id===id); if(!d) return;
  const v=docValeursMail(type,d);
  let t=document.getElementById("ev-msg").value;
  const ordre=[...T.reperes].sort((a,b)=>String(v[b]||"").length-String(v[a]||"").length); // valeurs longues d'abord
  ordre.forEach(k=>{ if(v[k]&&v[k]!=="—") t=t.split(v[k]).join("{"+k+"}"); });
  TH[T.cleModele]=t; saveData();
  logActivity("Modèle d'e-mail",`Modèle ${T.prefixe.toLowerCase()} enregistré`);
  const b=document.getElementById("ev-modele"); if(b){ b.textContent="✅ Modèle enregistré"; setTimeout(()=>{ if(b) b.textContent="💾 Garder comme modèle"; },2000); }
}
function resetModeleDoc(type,id){
  if(!confirm("Revenir au message d'origine ?")) return;
  const T=DOC_ENVOI[type]; delete TH[T.cleModele]; saveData();
  const d=T.liste().find(x=>x.id===id); if(d) document.getElementById("ev-msg").value=docMessageDefaut(type,d);
}
function modalEnvoiDoc(type,id){
  const T=DOC_ENVOI[type], d=T.liste().find(x=>x.id===id); if(!d){alert("Document introuvable");return;}
  const cli=T.client(d);
  const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
  const deja=docEnvois(T,d).slice(-1)[0];
  const fichier=`${T.prefixe} ${docNum(T,d)}.pdf`;
  showModal(`✉️ Envoyer ${T.titre}${T.num?"":" "+esc(d.num)}`,`
    ${deja?`<div class="info-box" style="margin-bottom:12px">Déjà envoyé${type==="facture"?"e":""} le ${fDate(deja.date)} à ${esc(deja.to)}.</div>`:""}
    <div class="field"><label>Destinataire</label><input id="ev-to" type="email" value="${esc(cli&&cli.email)}" placeholder="adresse@client.fr"/></div>
    <div class="field"><label>Objet</label><input id="ev-sujet" value="${esc(`${T.prefixe} ${T.num?"":d.num+" "}— ${`${TH.nom} ${TH.sous||""}`.trim()}`.replace("  "," "))}"/></div>
    <div class="field"><label>Message (modifiable avant l'envoi)</label><textarea id="ev-msg" style="min-height:220px">${esc(docMessageDefaut(type,d))}</textarea>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
        <button class="btn-sm" id="ev-modele" onclick="garderModeleDoc('${type}','${d.id}')" title="Réutiliser ce texte pour les prochains envois">💾 Garder comme modèle</button>
        ${TH[T.cleModele]?`<button class="btn-sm" onclick="resetModeleDoc('${type}','${d.id}')">↺ Message d'origine</button>`:""}
      </div></div>
    ${SigMail.cfg(TH).actif?`<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin:2px 0 4px">Signature ajoutée sous le message</div>
      <div style="border:1.5px dashed #e2e8f0;border-radius:10px;padding:2px 12px 10px;margin-bottom:12px;background:#fff;overflow-x:auto">${SigMail.html(TH,currentUser&&currentUser.id)}</div>`:""}
    <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#475569;margin:4px 0 10px">📎 <b>${esc(fichier)}</b> joint automatiquement
      <button class="btn-sm" onclick="DOC_ENVOI['${type}'].apercu('${d.id}')" style="margin-left:auto">👁️ Aperçu</button></div>
    ${type==="devis"&&!d.signatureElec&&!["refuse","transforme"].includes(d.statut)?`<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#475569;cursor:pointer;margin-bottom:8px"><input type="checkbox" id="ev-signer" checked style="width:18px;height:18px;accent-color:${TH.c1}"/> ✍️ Ajouter un lien pour signer le devis en ligne</label>`:""}
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#475569;cursor:pointer"><input type="checkbox" id="ev-copie" checked style="width:18px;height:18px;accent-color:${TH.c1}"/> M'envoyer une copie</label>
    <div id="ev-msg-err" style="display:none;margin-top:10px;padding:10px 12px;border-radius:8px;background:#fef2f2;color:#991b1b;font-size:13px"></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button id="ev-btn" onclick="envoyerDoc('${type}','${d.id}')" style="padding:9px 20px;border-radius:8px;border:none;background:${TH.c1};color:#fff;cursor:pointer;font-weight:700;font-size:13px;font-family:'Inter',sans-serif">✉️ Envoyer</button>`);
}
async function envoyerDoc(type,id){
  const T=DOC_ENVOI[type], d=T.liste().find(x=>x.id===id); if(!d) return;
  const cli=T.client(d);
  const to=document.getElementById("ev-to").value.trim();
  const sujet=document.getElementById("ev-sujet").value.trim()||`${T.prefixe} ${docNum(T,d)}`;
  let texte=document.getElementById("ev-msg").value;
  const copie=document.getElementById("ev-copie").checked;
  const avecLien=type==="devis"&&document.getElementById("ev-signer")&&document.getElementById("ev-signer").checked;
  const err=document.getElementById("ev-msg-err"), btn=document.getElementById("ev-btn");
  const erreur=m=>{err.textContent="⚠️ "+m; err.style.display="block"; btn.disabled=false; btn.textContent="✉️ Envoyer";};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return erreur("Adresse e-mail du destinataire invalide.");
  err.style.display="none"; btn.disabled=true; btn.textContent="⟳ Préparation du PDF…";
  try{
    if(avecLien){
      btn.textContent="⟳ Création du lien de signature…";
      const url=await creerLienSignature(d.id);
      texte=texte.replace(/\s+$/,"");
      const i=texte.search(/\n\s*Cordialement/i);
      const ajout=`\n\n✍️ Pour accepter ce devis, vous pouvez le signer en ligne en quelques secondes :\n${url}`;
      texte=i>=0?texte.slice(0,i)+ajout+texte.slice(i):texte+ajout;
    }
    const pdf=await htmlVersPdfBase64(T.html(d),{pages:T.pages});
    btn.textContent="⟳ Envoi…";
    const nomFichier=`${T.prefixe} ${docNum(T,d)}.pdf`.replace(/[\\/:*?"<>|]/g,"-");
    const destReel=AD_TEST?(currentUser.email||""):to;
    const sujetReel=AD_TEST?"[TEST — destiné à "+to+"] "+sujet:sujet;
    const {data,error}=await sbClient.functions.invoke("relances-auto",{body:{action:"email",to:destReel,subject:sujetReel,text:texte,copie:AD_TEST?false:copie,pieceJointe:{nom:nomFichier,contenu:pdf}}});
    let msg=data&&data.error;
    if(error){ try{ const b=await error.context.json(); msg=b.error||error.message; }catch(_){ msg=error.message; } }
    if(msg) return erreur(msg);
    docEnvois(T,d).push({date:getToday(),to});
    T.apresEnvoi(d);
    if(cli&&!cli.email) cli.email=to;
    logActivity(`${T.prefixe} envoyé${type==="facture"?"e":""} par e-mail`,`${docNum(T,d)} → ${to}`);
    logDocument(type,d.id,docNum(T,d),cli?cli.nom:(d.client||""),T.ttc(d));
    saveData(); closeModal(); renderPage();
    alert(`✅ ${T.prefixe} ${T.num?"de "+docNum(T,d)+" ":docNum(T,d)+" "}envoyé${type==="facture"?"e":""} à ${to}.`);
  }catch(e){ erreur(e.message||String(e)); }
}
function modalEnvoiDevis(id){ modalEnvoiDoc("devis",id); }
window.modalEnvoiDoc=modalEnvoiDoc; window.envoyerDoc=envoyerDoc; window.modalEnvoiDevis=modalEnvoiDevis;
window.garderModeleDoc=garderModeleDoc; window.resetModeleDoc=resetModeleDoc; window.DOC_ENVOI=DOC_ENVOI;

// ════════════════════════════════════════════════════════
