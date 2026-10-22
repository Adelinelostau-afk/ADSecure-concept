// ── DOSSIER DE REMISE CLIENT (fin d'installation) ─────────
// ══════════════════════════════════════════════════════════
// PDF unique : page de garde, fiche parc, guide d'utilisation, obligations RGPD, PV signé, SAV.
// + fiche identifiants à remplir à la main (aucun mot de passe n'est stocké dans l'appli).
const REMISE_APPS=["Hik-Connect","DMSS (Dahua)","Ajax Security System","UniFi Protect","Autre"];
function remiseDefauts(c){
  const r=c.dossierRemise||{};
  const riInst=INTERVENTIONS.filter(x=>x.clientId===c.id&&x.statut==="signe").sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const marques=parcActifs(c).map(x=>String(x.marque||"").toLowerCase());
  const appAuto=marques.some(m=>m.includes("hik"))?"Hik-Connect":marques.some(m=>m.includes("dahua"))?"DMSS (Dahua)":marques.some(m=>m.includes("ajax"))?"Ajax Security System":marques.some(m=>m.includes("ubiquiti")||m.includes("unifi"))?"UniFi Protect":"Hik-Connect";
  return {app:r.app||appAuto,appAutre:r.appAutre||"",conservation:r.conservation||30,
    pro:r.pro!=null?r.pro:/pro|vip|entreprise|sarl|sas/i.test((c.cat||"")+" "+(c.nom||"")),
    salaries:r.salaries!=null?r.salaries:false,public:r.public!=null?r.public:false,
    riId:r.riId||(riInst[0]&&riInst[0].id)||"",horaires:r.horaires||TH.horaires||"",
    sections:Object.assign({garde:true,parc:true,guide:true,rgpd:true,pv:true,sav:true},r.sections||{})};
}
function modalDossierRemise(clientId){
  const c=CLIENTS.find(x=>x.id===clientId);if(!c)return;
  const o=remiseDefauts(c);
  const ris=INTERVENTIONS.filter(x=>x.clientId===c.id).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const ck=(id,lbl,on,sub)=>`<label style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;font-size:13.5px;cursor:pointer;border-bottom:1px solid #f1f5f9"><input type="checkbox" id="${id}" ${on?"checked":""} style="width:19px;height:19px;flex-shrink:0;accent-color:${TH.c1}"/><span>${lbl}${sub?`<br/><span style="font-size:11.5px;color:#94a3b8">${sub}</span>`:""}</span></label>`;
  showModal(`📘 Dossier de remise — ${pE(c.nom)}`,`
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Contenu du dossier</div>
    ${ck("dr-garde","Page de garde",o.sections.garde)}
    ${ck("dr-parc","Fiche du parc installé",o.sections.parc,`${parcActifs(c).length} équipement(s)`+(parcActifs(c).length?"":" — complétez le parc d'abord"))}
    ${ck("dr-guide",MP().video?"Guide d'utilisation":"Conseils d'utilisation et d'entretien",o.sections.guide,MP().video?"Direct, relecture, export d'une vidéo, alertes, bonnes pratiques":"Adaptés à votre métier")}
    ${MP().video?ck("dr-rgpd","Obligations légales et RGPD",o.sections.rgpd,"Adapté à la situation du client (cases ci-dessous)"):""}
    ${ck("dr-pv","Procès-verbal de mise en service",o.sections.pv,ris.length?"":"Aucun rapport d'intervention pour ce client")}
    ${ck("dr-sav","Garanties, maintenance et contacts SAV",o.sections.sav)}
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:16px 0 6px">Paramètres</div>
    ${MP().video?`    <div class="field-row">
      <div class="field"><label>Application mobile</label><select id="dr-app" onchange="document.getElementById('dr-app-autre-w').style.display=this.value==='Autre'?'block':'none'">${REMISE_APPS.map(a=>`<option ${a===o.app?"selected":""}>${a}</option>`).join("")}</select>
        <div id="dr-app-autre-w" style="display:${o.app==="Autre"?"block":"none"};margin-top:6px"><input id="dr-app-autre" value="${pE(o.appAutre)}" placeholder="Nom de l'application"/></div></div>
      <div class="field"><label>Conservation des images (jours)</label><input type="number" id="dr-cons" min="1" max="90" value="${o.conservation}"/></div>
    </div>
`:""}
    ${ris.length?`<div class="field"><label>Rapport servant de PV</label><select id="dr-ri">${ris.map(r=>`<option value="${r.id}" ${r.id===o.riId?"selected":""}>${pE(r.num)} · ${pE(RI_TYPES[r.type]||"")} · ${fDate(r.date)}${r.statut==="signe"?" ✍️":" (brouillon)"}</option>`).join("")}</select></div>`:""}
    ${MP().video?ck("dr-pro","Client professionnel (entreprise, commerce, association)",o.pro)+ck("dr-sal","Le client emploie des salariés",o.salaries)+ck("dr-pub","Des caméras filment un lieu ouvert au public",o.public,"Commerce, accueil, parking client… : autorisation préfectorale"):""}
    <div class="field" style="margin-top:12px"><label>Horaires du SAV</label><input id="dr-hor" value="${pE(o.horaires)}" placeholder="Lun, mar, jeu 8h30–16h · mer, ven 8h30–13h30"/></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Fermer</button>
     ${MP().video?`<button class="btn-cancel" onclick="imprimerFicheIdentifiants('${c.id}')">🔐 Fiche identifiants</button>`:""}
     <button class="btn-cancel" onclick="envoyerDossierRemise('${c.id}')">✉️ Envoyer par e-mail</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="genererDossierRemise('${c.id}')">📘 Générer le dossier</button>`);
}
async function envoyerDossierRemise(clientId){
  const c=CLIENTS.find(x=>x.id===clientId);if(!c)return;
  const o=lireRemise(c);
  if(!Object.values(o.sections).some(Boolean)){alert("Cochez au moins une partie du dossier.");return;}
  showModal("Préparation…",`<div style="padding:30px;text-align:center;color:#64748b">⟳ Chargement du dossier…</div>`,`<button class="btn-cancel" onclick="closeModal()">Annuler</button>`);
  const ri=o.sections.pv&&o.riId?INTERVENTIONS.find(x=>x.id===o.riId):null;
  if(ri) await riPrechargerPhotos(ri);
  modalEnvoiDoc("remise",c.id);
}
window.envoyerDossierRemise=envoyerDossierRemise;
function lireRemise(c){
  const v=id=>{const e=document.getElementById(id);return e?(e.type==="checkbox"?e.checked:e.value):null;};
  const o={app:v("dr-app"),appAutre:(v("dr-app-autre")||"").trim(),conservation:Math.min(90,Math.max(1,parseInt(v("dr-cons"))||30)),
    pro:v("dr-pro"),salaries:v("dr-sal"),public:v("dr-pub"),riId:v("dr-ri")||"",horaires:(v("dr-hor")||"").trim(),
    sections:{garde:v("dr-garde"),parc:v("dr-parc"),guide:v("dr-guide"),rgpd:v("dr-rgpd"),pv:v("dr-pv"),sav:v("dr-sav")}};
  c.dossierRemise=o;if(o.horaires&&!TH.horaires)TH.horaires=o.horaires;
  saveData();return o;
}
function remiseNomApp(o){return o.app==="Autre"?(o.appAutre||"l'application de votre système"):o.app;}

async function genererDossierRemise(clientId){
  const c=CLIENTS.find(x=>x.id===clientId);if(!c)return;
  const o=lireRemise(c);
  const w=window.open("","_blank");if(!w){alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF.");return;}
  w.document.write(`<p style="font-family:Arial;padding:30px;color:#64748b">⟳ Préparation du dossier…</p>`);
  const ri=o.sections.pv&&o.riId?INTERVENTIONS.find(x=>x.id===o.riId):null;
  if(ri) await riChargerURLs(ri);
  logActivity("Dossier de remise généré",c.nom);logDocument("remise",c.id,"Dossier de remise",c.nom,0);
  w.document.open();w.document.write(dossierRemiseHTML(c,o,ri));w.document.close();
}
function dossierRemiseHTML(c,o,ri,impression){
  if(impression===undefined) impression=true;
  const app=remiseNomApp(o);
  const ent=`${TH.nom||""} ${TH.sous||""}`.trim();
  const logo=thLogo();
  const parc=parcActifs(c).slice().sort((a,b)=>PARC_TYPES.indexOf(a.type)-PARC_TYPES.indexOf(b.type));
  const nb=t=>parc.filter(x=>x.type===t).length;
  const today=getToday(), dLong=RelancesCore.dateLongue(today);
  const page=(titre,contenu,num)=>`<section class="page"><div class="ph"><span>${pE(ent)}</span><span>Dossier de remise — ${pE(c.nom)}</span></div>
    <h1>${num?`<span class="num">${num}</span>`:""}${titre}</h1>${contenu}</section>`;
  const sections=[];let n=0;
  // 1. Page de garde
  if(o.sections.garde) sections.push(`<section class="page garde">
    <div style="text-align:center;margin-top:90px">${logo?`<img src="${logo}" style="width:150px;height:auto" onerror="this.style.display='none'"/>`:""}
      <div style="font-size:15px;color:${TH.c1};font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-top:24px">${pE(ent)}</div>
      <div style="font-size:34px;font-weight:800;margin-top:40px;line-height:1.2">Dossier de remise<br/>de votre installation</div>
      <div style="width:70px;height:4px;background:${TH.c1};margin:26px auto"></div>
      <div style="font-size:20px;font-weight:700">${pE(c.nom)}</div>
      ${c.adresse?`<div style="font-size:14px;color:#64748b;margin-top:6px">${pE(c.adresse)}</div>`:""}
      <div style="font-size:14px;color:#64748b;margin-top:30px">Remis le ${pE(dLong)}</div></div>
    <div class="sommaire"><div style="font-weight:800;margin-bottom:8px">Contenu</div>
      ${[["parc","Votre matériel"],["guide",MP().video?"Guide d'utilisation":"Conseils d'utilisation et d'entretien"],["rgpd","Vos obligations légales"],["pv","Procès-verbal de mise en service"],["sav","Garanties, maintenance et assistance"]].filter(([k])=>o.sections[k]&&(k!=="pv"||ri)&&(k!=="rgpd"||MP().video)&&(k!=="guide"||MP().video||(MP().guide||[]).length)).map(([,l],i)=>`<div>${i+1}. ${l}</div>`).join("")}</div>
    <div style="position:absolute;bottom:40px;left:0;right:0;text-align:center;font-size:11px;color:#94a3b8">${pE([TH.adresse||TH.contratSiege,TH.tel,TH.email,TH.site].filter(Boolean).join(" · "))}</div>
  </section>`);
  // 2. Parc
  if(o.sections.parc) sections.push(page("Votre matériel",`
    <p>${MP().video?"Votre système":"Votre installation"} comprend ${(MP().video?[["Caméra","caméra"],["Enregistreur","enregistreur"],["Switch / réseau","équipement réseau"],["Disque dur","disque dur"],["Alarme","élément d'alarme"],["Domotique","module domotique"],["Écran","écran"],["Onduleur","onduleur"]].filter(([t])=>nb(t)).map(([t,l])=>`<strong>${nb(t)} ${l}${nb(t)>1&&!/s$/.test(l)?"s":""}</strong>`):PARC_TYPES.filter(t=>nb(t)).map(t=>`<strong>${nb(t)} × ${pE(t.toLowerCase())}</strong>`)).join(", ")||"les équipements listés ci-dessous"}.</p>
    ${parc.length?`<table><thead><tr><th>Équipement</th><th>N° de série</th><th>Emplacement</th><th>Installé le</th><th>Garantie jusqu'au</th></tr></thead><tbody>
      ${parc.map(x=>{const g=parcGarantieFin(x);return `<tr><td>${PARC_ICON[x.type]||""} ${pE(x.type)} — ${pE([x.marque,x.modele].filter(Boolean).join(" "))}</td><td>${pE(x.serie)||"—"}</td><td>${pE(x.emplacement)||"—"}</td><td>${x.dateInstall?pE(RelancesCore.dateLongue(x.dateInstall)):"—"}</td><td>${g?pE(RelancesCore.dateLongue(g)):"—"}</td></tr>`;}).join("")}</tbody></table>`:`<p class="note">La liste détaillée du matériel vous sera transmise séparément.</p>`}
    <p class="note">Conservez ce document : les numéros de série sont demandés en cas de garantie ou de déclaration à votre assurance.</p>`,++n));
  // 3. Guide
  if(o.sections.guide&&!MP().video&&(MP().guide||[]).length) sections.push(page("Conseils d'utilisation et d'entretien",MP().guide.map(([t,h])=>`<div class="bloc"><h2>${t}</h2>${h}</div>`).join(""),++n));
  if(o.sections.guide&&MP().video) sections.push(page("Guide d'utilisation",`
    <div class="bloc"><h2>📱 Installer l'application</h2><ol>
      <li>Téléchargez <strong>${pE(app)}</strong> depuis l'App Store (iPhone, iPad) ou Google Play (Android).</li>
      <li>Connectez-vous avec l'identifiant remis lors de l'installation (fiche identifiants séparée).</li>
      <li>À la première connexion, <strong>remplacez le mot de passe</strong> par un mot de passe personnel et activez la double authentification si elle est proposée.</li></ol></div>
    <div class="bloc"><h2>👁️ Voir les caméras en direct</h2><ol>
      <li>Ouvrez l'application et touchez votre enregistreur ou votre site.</li>
      <li>Touchez une caméra pour l'afficher en plein écran. Écartez deux doigts pour zoomer.</li>
      <li>Sur l'écran branché à l'enregistreur, toutes les caméras s'affichent en mosaïque.</li></ol></div>
    <div class="bloc"><h2>⏪ Revoir un enregistrement</h2><ol>
      <li>Dans l'application, choisissez la caméra puis l'icône <em>Lecture</em> (ou <em>Playback</em>).</li>
      <li>Sélectionnez la date ; faites glisser la frise horaire jusqu'au moment voulu. Les zones colorées signalent un mouvement détecté.</li>
      <li>Les images sont conservées environ <strong>${o.conservation} jours</strong>, puis remplacées automatiquement par les plus récentes.</li></ol></div>
    <div class="bloc"><h2>💾 Extraire une vidéo (vol, dégradation, sinistre)</h2><ol>
      <li><strong>Agissez vite</strong> : passé ${o.conservation} jours, la séquence est effacée.</li>
      <li>En relecture, utilisez l'icône <em>Ciseaux</em> ou <em>Enregistrer</em> pour sauvegarder l'extrait sur votre téléphone, ou exportez-le sur clé USB depuis l'enregistreur.</li>
      <li>Ne remettez les images qu'aux forces de l'ordre ou à votre assureur, sur demande. En cas de difficulté, nous pouvons réaliser l'extraction pour vous.</li></ol></div>
    <div class="bloc"><h2>🔔 Les alertes</h2><p>Les notifications vous préviennent d'une détection (personne, véhicule). Elles se règlent dans l'application : plages horaires, caméras concernées, sensibilité. Si vous en recevez trop, contactez-nous : nous ajustons les zones de détection.</p></div>
    <div class="bloc"><h2>✅ Bonnes pratiques</h2><ul>
      <li>Ne débranchez pas l'enregistreur ni la box internet : sans courant, rien n'est enregistré.</li>
      <li>Ne communiquez jamais vos identifiants ; créez des comptes séparés pour chaque utilisateur.</li>
      <li>Signalez-nous toute caméra noire, floue ou déplacée.</li>
      <li>Après une coupure de courant, vérifiez dans l'application que les caméras sont revenues en ligne.</li></ul></div>`,++n));
  // 4. RGPD
  if(o.sections.rgpd&&MP().video){
    const pts=[];
    pts.push(`<div class="bloc"><h2>Ce que vous pouvez filmer</h2><ul>
      <li>Uniquement l'<strong>intérieur de votre propriété</strong> : terrain, bâtiment, parking privé.</li>
      <li><strong>Pas la voie publique</strong> ni les propriétés voisines (fenêtres, jardins). Les caméras ont été orientées en ce sens ; des masques de confidentialité peuvent être ajoutés.</li>
      ${o.pro?`<li>Jamais les lieux de pause, vestiaires ou sanitaires.</li>`:""}</ul></div>`);
    pts.push(`<div class="bloc"><h2>Informer les personnes filmées</h2><p>Un panneau doit signaler la vidéoprotection à chaque accès de la zone filmée${o.pro?", en indiquant le responsable du dispositif, la finalité, la durée de conservation, le contact pour exercer ses droits et la possibilité de saisir la CNIL":""}. Les panneaux posés lors de l'installation répondent à cette obligation : laissez-les visibles.</p></div>`);
    pts.push(`<div class="bloc"><h2>Durée de conservation</h2><p>La CNIL recommande de ne pas conserver les images plus d'<strong>un mois</strong>, sauf procédure en cours (images extraites pour la police ou l'assurance). Votre système est réglé sur <strong>${o.conservation} jours</strong> environ.</p></div>`);
    pts.push(`<div class="bloc"><h2>Accès aux images</h2><p>Seules les personnes habilitées${o.pro?" (dirigeant, responsable désigné)":" du foyer"} doivent pouvoir consulter les images. Toute personne filmée peut demander à voir les images la concernant, dans la limite de la durée de conservation et du respect des autres personnes.</p></div>`);
    if(o.pro) pts.push(`<div class="bloc"><h2>Registre des traitements</h2><p>En tant que professionnel, inscrivez ce dispositif dans votre <strong>registre des activités de traitement</strong> (modèle disponible sur cnil.fr) : finalité (sécurité des biens et des personnes), personnes concernées, durée de conservation, destinataires, mesures de sécurité.</p></div>`);
    if(o.salaries) pts.push(`<div class="bloc"><h2>Vos salariés</h2><ul>
      <li>Informez <strong>individuellement</strong> chaque salarié avant la mise en service (note de service, avenant ou affichage nominatif).</li>
      <li>Si l'entreprise a un CSE, il doit être <strong>informé et consulté</strong> avant la mise en place.</li>
      <li>Les caméras ne doivent pas surveiller un salarié à son poste de travail de façon continue, sauf circonstance particulière justifiée (manipulation d'argent, par exemple).</li></ul></div>`);
    if(o.public) pts.push(`<div class="bloc alerte"><h2>⚠️ Lieu ouvert au public : autorisation préfectorale</h2><p>Les caméras filmant un lieu ouvert au public (surface de vente, accueil, parking client…) nécessitent une <strong>autorisation préalable du préfet</strong> (articles L. 251-1 et suivants du Code de la sécurité intérieure). La demande se fait en ligne sur le site du ministère de l'Intérieur ; l'autorisation est accordée pour cinq ans renouvelables. Le numéro et la date de l'arrêté se reportent ensuite sur les panneaux. Nous pouvons vous accompagner dans cette démarche.</p></div>`);
    pts.push(`<p class="note">Ces informations sont un rappel général à la date du document. Pour une situation particulière, consultez cnil.fr ou un conseil juridique.</p>`);
    sections.push(page(o.pro?"Vos obligations légales":"Vos obligations légales (particulier)",(o.pro?"":`<p>Pour un particulier, aucune déclaration n'est nécessaire dès lors que seule la propriété privée est filmée. Quelques règles s'appliquent néanmoins :</p>`)+pts.join(""),++n));
  }
  // 5. PV
  if(o.sections.pv&&ri){
    const ok=ri.checklist.filter(x=>x.ok!==null);
    sections.push(page("Procès-verbal de mise en service",`
      <table><tbody>
        <tr><td style="width:180px;color:#64748b">Rapport</td><td><strong>${pE(ri.num)}</strong> — ${pE(RI_TYPES[ri.type]||"")}</td></tr>
        <tr><td style="color:#64748b">Date</td><td>${pE(RelancesCore.dateLongue(ri.date))}${ri.hDebut?", de "+ri.hDebut.replace(":","h"):""}${ri.hFin?" à "+ri.hFin.replace(":","h"):""}</td></tr>
        <tr><td style="color:#64748b">Technicien</td><td>${pE(ri.technicien||"—")}</td></tr></tbody></table>
      ${ok.length?`<h2>Contrôles réalisés</h2><table><tbody>${ok.map(x=>`<tr><td>${pE(x.lib)}</td><td style="width:130px;font-weight:700;color:${x.ok===true?"#15803d":x.ok===false?"#991b1b":"#94a3b8"}">${x.ok===true?"✓ Conforme":x.ok===false?"✗ Réserve":"N/A"}</td></tr>`).join("")}</tbody></table>`:""}
      ${ri.travaux?`<h2>Travaux réalisés</h2><div class="box">${pE(ri.travaux)}</div>`:""}
      ${ri.observations?`<h2>Observations</h2><div class="box">${pE(ri.observations)}</div>`:""}
      <p style="margin-top:18px">Le client reconnaît que l'installation a été mise en service, que son fonctionnement lui a été présenté et qu'il a reçu le présent dossier${ok.some(x=>x.ok===false)?", sous les réserves indiquées ci-dessus":", sans réserve"}.</p>
      <div style="display:flex;gap:24px;margin-top:16px">
        <div class="sig"><div class="lbl">Pour ${pE(ent)}</div><div style="margin-top:8px;font-weight:700">${pE(ri.technicien||"")}</div></div>
        <div class="sig"><div class="lbl">Le client</div>${ri.sigClient?`<img src="${ri.sigClient}" style="height:80px;max-width:100%;object-fit:contain;display:block"/>`:`<div style="height:80px"></div>`}<div style="font-size:11px;color:#475569">${pE(ri.sigNom||"")}${ri.sigDate?" — le "+pE(RelancesCore.dateLongue(ri.sigDate)):""}</div></div>
      </div>`,++n));
  }
  // 6. SAV
  if(o.sections.sav){
    const garMin=parc.map(parcGarantieFin).filter(Boolean).sort()[0];
    const contrat=(c.contratsSignes||[]).find(x=>!x.resilie);
    sections.push(page("Garanties, maintenance et assistance",`
      <div class="bloc"><h2>Garantie du matériel</h2><p>Le matériel est garanti ${garMin?`jusqu'au <strong>${pE(RelancesCore.dateLongue(garMin))}</strong> au minimum (détail par équipement dans la fiche du matériel)`:"selon les durées indiquées par équipement"}. La garantie couvre les défauts de fabrication ; elle ne couvre pas les dommages dus à la foudre, aux surtensions, aux chocs, à l'humidité ou à une intervention extérieure.</p></div>
      <div class="bloc"><h2>${FV("contrat")==="Contrat de maintenance"?"Maintenance":"Entretien"}</h2><p>${contrat?`Votre ${FV("contrat").toLowerCase()}${contrat.forfaitLabel?" (forfait "+pE(contrat.forfaitLabel)+")":""} prévoit une visite préventive tous les six mois : ${pE(MP().resumeVisite)}. Vous êtes prévenu par e-mail avant chaque visite.`:`Une visite préventive tous les six mois (nettoyage des optiques, contrôle de l'enregistrement, mises à jour) prolonge la durée de vie de votre installation. Demandez-nous notre contrat de maintenance.`}</p></div>
      <div class="bloc contact"><h2>Nous contacter</h2>
        <div style="font-size:16px;font-weight:800;margin-bottom:6px">${pE(ent)}</div>
        ${TH.tel?`<div>📞 ${pE(TH.tel)}</div>`:""}${TH.email?`<div>✉️ ${pE(TH.email)}</div>`:""}${TH.site?`<div>🌐 ${pE(String(TH.site).replace(/^https?:\/\//,""))}</div>`:""}
        ${o.horaires?`<div style="margin-top:6px">🕘 ${pE(o.horaires)}</div>`:""}
        <p style="margin-top:10px;font-size:12px;color:#475569">Pour un dépannage plus rapide, indiquez ${pE(MP().ex.equipement)} et, si possible, le numéro de série figurant dans la fiche du matériel.</p></div>`,++n));
  }
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><base href="${location.href}"/><title>Dossier de remise — ${pE(c.nom)}</title><style>
    @page{size:A4;margin:0}
    body{font-family:'Inter',Arial,sans-serif;color:#1A2118;margin:0;font-size:11.8px;line-height:1.48;background:#fff}
    .page{position:relative;padding:30px 42px 30px;page-break-after:always;min-height:1040px;box-sizing:border-box}
    .page:last-child{page-break-after:auto}
    .ph{display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;border-bottom:1px solid #e8e4dc;padding-bottom:8px;margin-bottom:22px;text-transform:uppercase;letter-spacing:0.06em}
    h1{font-size:22px;margin:0 0 16px;display:flex;align-items:center;gap:12px}
    h1 .num{display:inline-flex;width:34px;height:34px;border-radius:50%;background:${TH.c1};color:#fff;font-size:16px;align-items:center;justify-content:center}
    h2{font-size:13.5px;margin:0 0 6px;color:${TH.c1}}
    .bloc{border-left:3px solid ${TH.c1};background:#F7F4ED;border-radius:0 8px 8px 0;padding:8px 13px;margin-bottom:9px;page-break-inside:avoid}
    .bloc p,.bloc ul,.bloc ol{margin:4px 0}.bloc li{margin:3px 0}
    .alerte{border-left-color:#b45309;background:#fffbeb}.alerte h2{color:#b45309}
    .contact{border-left-color:${TH.c1};background:#e8f4f8}
    table{width:100%;border-collapse:collapse;margin:8px 0 14px}th{background:#1A2118;color:#fff;padding:7px 9px;text-align:left;font-size:10px;text-transform:uppercase}
    td{padding:6px 9px;border-bottom:1px solid #e8e4dc;vertical-align:top}
    .note{font-size:11px;color:#64748b;font-style:italic}
    .box{background:#F7F4ED;border-radius:8px;padding:10px 14px;white-space:pre-wrap}
    .sig{flex:1;border:1px solid #e8e4dc;border-radius:8px;padding:10px 12px;min-height:120px}.sig .lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700}
    .garde .sommaire{margin:60px auto 0;max-width:340px;background:#F7F4ED;border-radius:12px;padding:16px 20px;font-size:13px;line-height:1.9}
  </style></head><body>${sections.join("")}
  ${impression?`<script>window.onload=()=>{setTimeout(()=>window.print(),700);}<\/script>`:""}</body></html>`;
}
// Fiche à remplir à la main : rien n'est enregistré dans l'application
function imprimerFicheIdentifiants(clientId){
  const c=CLIENTS.find(x=>x.id===clientId);if(!c)return;
  const o=document.getElementById("dr-app")?lireRemise(c):remiseDefauts(c);
  const app=remiseNomApp(o);
  const nvr=parcActifs(c).filter(x=>["Enregistreur","Switch / réseau","Alarme"].includes(x.type));
  const ligne=l=>`<tr><td style="width:190px;color:#475569">${l}</td><td style="border-bottom:1px solid #94a3b8;height:30px"></td></tr>`;
  const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><base href="${location.href}"/><title>Fiche identifiants — ${pE(c.nom)}</title><style>${RI_CSS}
    .cadre{border:2px solid #1A2118;border-radius:10px;padding:14px 18px;margin-bottom:16px;page-break-inside:avoid}.cadre h3{margin:0 0 8px;font-size:14px}
    td{border-bottom:none}</style></head><body>
    ${riEnteteHTML("FICHE IDENTIFIANTS — CONFIDENTIEL",`${pE(c.nom)}<br/>remise le ${fDate(getToday())} ${getToday().slice(0,4)}`)}
    <div style="background:#fef2f2;border:1.5px solid #fca5a5;color:#991b1b;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px">🔒 Document confidentiel à conserver en lieu sûr, séparément du dossier de remise. Changez les mots de passe à la première connexion. ${pE(`${TH.nom} ${TH.sous||""}`.trim())} ne conserve pas vos mots de passe.</div>
    <div class="cadre"><h3>📱 Application ${pE(app)}</h3><table><tbody>${ligne("Identifiant (e-mail)")}${ligne("Mot de passe provisoire")}${ligne("Code de vérification de l'appareil")}</tbody></table></div>
    ${(nvr.length?nvr:[{type:"Enregistreur",marque:"",modele:"",ip:""}]).map(x=>`<div class="cadre"><h3>${PARC_ICON[x.type]||"🔧"} ${pE(x.type)} ${pE([x.marque,x.modele].filter(Boolean).join(" "))}${x.emplacement?` — ${pE(x.emplacement)}`:""}</h3><table><tbody>
      <tr><td style="width:190px;color:#475569">Adresse IP locale</td><td style="border-bottom:1px solid #94a3b8;height:30px">${pE(x.ip||"")}</td></tr>${ligne("Utilisateur administrateur")}${ligne("Mot de passe")}${x.type==="Enregistreur"?ligne("Code de déverrouillage / schéma"):""}</tbody></table></div>`).join("")}
    <div class="cadre"><h3>👥 Autres utilisateurs créés</h3><table><tbody>${ligne("Nom — identifiant")}${ligne("Nom — identifiant")}</tbody></table></div>
    <div class="foot">Assistance : ${pE([TH.tel,TH.email].filter(Boolean).join(" · "))}</div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),400);}<\/script></body></html>`;
  const w=window.open("","_blank");if(!w){alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF.");return;}
  w.document.write(html);w.document.close();
}

function renderClientFiche(){
  const c=CLIENTS.find(x=>x.id===selectedClientId);
  if(!c) return `<div style="padding:40px;text-align:center;color:#64748b">Client introuvable</div>`;
  const devisClient=DEVIS.filter(d=>d.clientId===c.id).sort((a,b)=>b.date.localeCompare(a.date));
  const [stBg,stCol,stLbl]=ST_CLI[c.status]||["#f1f5f9","#64748b","—"];
  const accClient=cliDevisAcceptes(c);
  const caDevis=accClient.reduce((s,d)=>s+devisTTC(d),0);
  const caFiche=cliCA(c), enCmd=cliEnCommande(c), dernCmdFiche=cliDerniereCommande(c);

  return `
    <!-- Header fiche -->
    <div style="background:linear-gradient(135deg,${TH.sidebar} 0%,${TH.c1} 100%);border-radius:16px;padding:24px 28px;margin-bottom:20px;color:#fff;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
      <div>
        <div style="font-size:11px;color:${TH.sand}99;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">${c.cat}</div>
        <div style="font-size:26px;font-weight:700;margin-bottom:4px">${c.nom}</div>
        <div style="font-size:14px;color:${TH.sand}BB">${c.contact}</div>
        <div style="margin-top:12px;display:flex;gap:16px;flex-wrap:wrap">
          ${c.tel?`<a href="tel:${c.tel}" style="color:#fff;font-size:13px;display:flex;align-items:center;gap:5px">📞 ${c.tel}</a>`:""}
          ${c.email?`<a href="mailto:${c.email}" style="color:#fff;font-size:13px;display:flex;align-items:center;gap:5px">✉️ ${c.email}</a>`:""}
        </div>
      </div>
      <div style="text-align:right">
        <div style="margin-bottom:8px">${badge(stLbl,stBg,stCol)}</div>
        <div style="font-size:11px;color:${TH.sand}77;margin-bottom:3px">CA facturé</div>
        <div style="font-size:24px;font-weight:700">${fMoney(caFiche)}</div>
        ${enCmd>0?`<div style="font-size:12px;color:${TH.sand}CC">+ ${fMoney(enCmd)} en commande</div>`:""}
        <div style="font-size:11px;color:${TH.sand}77;margin-top:8px">Dernière commande</div>
        <div style="font-size:13px">${dernCmdFiche?fDate(dernCmdFiche)+" "+dernCmdFiche.slice(0,4):"—"}</div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid" style="margin-bottom:20px">
      ${kpi("Devis total",devisClient.length,TH.c1)}
      ${kpi("Acceptés",accClient.length,"#15803d")}
      ${kpi("En attente",devisClient.filter(d=>["brouillon","envoye"].includes(d.statut)&&!accClient.includes(d)).length,"#b45309")}
      ${kpi("CA devis acceptés",fMoney(caDevis),TH.c1,true)}
    </div>

    <!-- Infos + Actions rapides -->
    <div class="two-col" style="margin-bottom:20px">
      <div class="section-card" style="background:${TH.card}">
        <div class="section-head">
          <div class="section-title" style="color:${TH.txt}">Informations</div>
          <button class="btn-add" style="background:${TH.c1};color:#fff;font-size:12px;padding:5px 10px" onclick="modalClient('${c.id}')">✏️ Modifier</button>
        </div>
        <div style="padding:16px 18px;display:grid;gap:12px">
          ${[
            ["👤 Contact",c.contact||"—"],
            ["📞 Téléphone",c.tel||"—"],
            ["✉️ Email",c.email||"—"],
            ["🏷️ Catégorie",c.cat],
            ["📅 Dernière commande",dernCmdFiche?fDate(dernCmdFiche)+" "+dernCmdFiche.slice(0,4):"—"],
            ["💰 CA facturé",fMoney(caFiche)+(enCmd>0?` <span style="font-weight:400;color:#64748b">(+ ${fMoney(enCmd)} en commande)</span>`:"")],
          ].map(([l,v])=>`<div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;padding-bottom:10px;border-bottom:1px solid #f1f5f9">
            <span style="color:${TH.txt}77">${l}</span>
            <span style="font-weight:600;color:${TH.txt}">${v}</span>
          </div>`).join("")}
        </div>
      </div>
      <div class="section-card" style="background:${TH.card}">
        <div class="section-head"><div class="section-title" style="color:${TH.txt}">Actions rapides</div></div>
        <div style="padding:12px 18px;display:grid;gap:8px">
          <button onclick="modalRelance('${c.id}')" style="padding:11px 16px;border-radius:9px;border:1.5px solid ${TH.c1}22;background:${TH.c1}10;color:${TH.c1};cursor:pointer;font-size:13px;font-weight:600;font-family:'Lora',Georgia,serif;text-align:left;display:flex;align-items:center;gap:8px">✉️ Envoyer une relance</button>
          <button onclick="modalDevis('',selectedClientId)" style="padding:11px 16px;border-radius:9px;border:1.5px solid #15803d22;background:#15803d10;color:#15803d;cursor:pointer;font-size:13px;font-weight:600;font-family:'Lora',Georgia,serif;text-align:left;display:flex;align-items:center;gap:8px">📋 Nouveau devis</button>
          <button onclick="modalEvent('',null,'','${c.id}')" style="padding:11px 16px;border-radius:9px;border:1.5px solid #b0890722;background:#b0890710;color:#b08d57;cursor:pointer;font-size:13px;font-weight:600;font-family:'Lora',Georgia,serif;text-align:left;display:flex;align-items:center;gap:8px">📅 Planifier un RDV</button>
          <button onclick="modalContrat('${c.id}')" style="padding:11px 16px;border-radius:9px;border:1.5px solid #6d28d922;background:#6d28d910;color:#6d28d9;cursor:pointer;font-size:13px;font-weight:600;font-family:'Lora',Georgia,serif;text-align:left;display:flex;align-items:center;gap:8px">📄 ${FV("contrat")}</button>
        </div>
      </div>
    </div>

    ${renderGrandLivreClient(c)}

    ${renderParcSection(c)}

    ${renderRIClientSection(c)}

    ${renderTransClientSection(c)}

    ${renderContratsSignesSection(c)}

    ${renderDocsSignesSection(c)}

    <!-- Devis -->
    <div class="section-card" style="background:${TH.card}">
      <div class="section-head">
        <div><div class="section-title" style="color:${TH.txt}">Devis</div><div class="section-sub">${devisClient.length} devis · ${accClient.length} accepté(s)</div></div>
        <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="modalDevis('','${c.id}')">＋ Nouveau devis</button>
      </div>
      ${devisClient.length===0?`<div style="padding:32px;text-align:center;color:${TH.txt}66;font-size:13px">Aucun devis pour ce client</div>`:""}
      ${devisClient.map(d=>{
        const [bg,col,lbl]=ST_DEVIS[d.statut]||["#f1f5f9","#64748b","—"];
        const ttc=devisTTC(d);
        const expired=d.statut==="envoye"&&daysDiff(d.validite)<0;
        const resume=(d.lignes&&d.lignes.length)?(d.lignes[0].desc||"Devis")+(d.lignes.length>1?` (+${d.lignes.length-1} ligne${d.lignes.length>2?"s":""})`:""):"Devis";
        return`<div style="padding:14px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-weight:700;font-size:13px;color:${TH.c1}">${d.num}</span>
              ${badge(expired?"Expiré":lbl,expired?"#f1f5f9":bg,expired?"#94a3b8":col)}${signBadge(d)}
            </div>
            <div style="font-size:13px;color:${TH.txt};margin-bottom:3px">${resume}</div>
            <div style="font-size:11px;color:${TH.txt}66">Émis le ${fDate(d.date)} · Valide jusqu'au ${fDate(d.validite)}</div>
            ${d.notes?`<div style="font-size:11px;color:${TH.txt}88;font-style:italic;margin-top:3px">${d.notes}</div>`:""}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:11px;color:${TH.txt}66;margin-bottom:2px">HT · TTC</div>
            <div style="font-weight:700;font-size:14px;color:${TH.txt}">${fMoney(devisHT(d))} · ${fMoney(ttc)}</div>
          </div>
          <div style="display:flex;gap:5px;flex-shrink:0">
            <button class="btn-sm" onclick="genererDevisPDF('${d.id}')" title="PDF" style="border-color:#86efac;background:#f0fdf4;color:#15803d">📄</button>
            <button class="btn-sm" onclick="modalEnvoiDevis('${d.id}')" title="Envoyer par e-mail" style="border-color:#bae6fd;background:#f0f9ff;color:#0369a1">✉️${(d.envois||[]).length?"✓":""}</button>
            ${signBouton(d)}
            ${vssBouton(d)}
            <button class="btn-sm" onclick="modalDocSigne('${c.id}','${d.id}')" title="Joindre le devis signé" style="border-color:#c4b5fd;background:#f5f3ff;color:#6d28d9">${(c.docsSignes||[]).some(x=>x.devisId===d.id)?"✅":"✍️"}</button>
            <button class="btn-sm btn-edit" onclick="modalDevis('${d.id}')">✏️</button>
            <button class="btn-sm btn-danger" onclick="delDevis('${d.id}')">🗑️</button>
          </div>
        </div>`;
      }).join("")}
    </div>
  `;
}

// ══════════════════════════════════════════════════════════
