// ── Relance rapide ────────────────────────────────────────────────────────────
function modalRelance(clientId){
  const c=CLIENTS.find(x=>x.id===clientId);
  if(!c)return;
  const msg=`Bonjour ${c.contact},\n\nNous revenons vers vous suite à notre dernier échange et souhaitions savoir si vous aviez des questions ou besoins.\n\nNous restons à votre disposition.\n\nCordialement,\n${TH.nom}`;
  showModal("Envoyer une relance",`
    <div style="background:#f0f4ff;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#1d3d8f">
      Destinataire : <strong>${c.contact}</strong> — <a href="mailto:${c.email}" style="color:#1d3d8f">${c.email}</a>
    </div>
    <div class="field"><label>Message</label><textarea id="relance-msg" style="min-height:160px">${msg}</textarea></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <a href="mailto:${c.email}?subject=Nous revenons vers vous&body=" id="relance-link" style="padding:9px 20px;border-radius:8px;border:none;background:#d97706;color:#fff;cursor:pointer;font-weight:700;font-size:13px;text-decoration:none;display:inline-flex;align-items:center;gap:6px" onclick="document.getElementById('relance-link').href='mailto:${c.email}?subject=Nous revenons vers vous&body='+encodeURIComponent(document.getElementById('relance-msg').value)">✉️ Ouvrir dans Mail</a>`
  );
}

// ── Render page ───────────────────────────────────────────────────────────────
function renderPage(){
  const c=document.getElementById("content");
  if(currentPage==="db")           c.innerHTML=renderDashboard();
  else if(currentPage==="clients")      c.innerHTML=renderClients();
  else if(currentPage==="client-fiche") c.innerHTML=renderClientFiche();
  else if(currentPage==="plan")         c.innerHTML=renderPlanning();
  else if(currentPage==="stock")        c.innerHTML=renderStock();
  else if(currentPage==="admin")        c.innerHTML=renderAdmin();
  else if(currentPage==="factures")     c.innerHTML=renderFactures();
  else if(currentPage==="banque"){ c.innerHTML=renderBanque(); if(!BANQUE_DATA&&!banqueLoading) fetchBanque(); }
  else if(currentPage==="caisse")       c.innerHTML=renderCaisse();
  else if(currentPage==="interventions") c.innerHTML=renderInterventions();
  else if(currentPage==="pipeline")     c.innerHTML=renderPipeline();
  else if(currentPage==="devis")        c.innerHTML=renderDevis();
  else if(currentPage==="stats")        c.innerHTML=renderStats();
  // Re-bind global functions for taches
  window.toggleTache=toggleTache;
  if(["devis","client-fiche","db"].includes(currentPage)) setTimeout(()=>syncSignaturesDevis(),0);
  if(currentPage==="db") planifierMasonry();
  // Sauvegarde automatique des données à chaque rendu
  saveData();
}

// ── Panels ────────────────────────────────────────────────────────────────────
function openPanel(id){
  activePanel=id;
  renderPanel();
  // Les profils viennent de Supabase : on affiche le panneau puis on rafraîchit.
  if((id==="settings"||id==="emails")&&hasRole("admin")){
    loadProfiles().then(()=>{ if(activePanel===id){ renderPanel(); } });
  }
  if(id==="relances"){
    syncRelancesLog().then(()=>{ if(activePanel==="relances"){ renderPanel(); } });
  }
}
function closePanel(){activePanel=null;document.getElementById("panel-container").innerHTML="";}
function renderPanel(){
  const pc=document.getElementById("panel-container");
  if(activePanel==="theme")    pc.innerHTML=renderThemePanel();
  else if(activePanel==="entreprise") pc.innerHTML=renderEntreprisePanel();
  else if(activePanel==="emails")     pc.innerHTML=renderEmailsPanel();
  else if(activePanel==="contrats")   pc.innerHTML=renderContratsPanel();
  else if(activePanel==="metier")     pc.innerHTML=renderMetierPanel();
  else if(activePanel==="rubs")     pc.innerHTML=renderRubsPanel();
  else if(activePanel==="settings") pc.innerHTML=renderSettingsPanel();
  else if(activePanel==="journal")  pc.innerHTML=renderJournalPanel();
  else if(activePanel==="docs")     pc.innerHTML=renderDocsPanel();
  else if(activePanel==="backups")  {pc.innerHTML=renderBackupsPanel([],true);loadBackupsList();}
  else if(activePanel==="relances") pc.innerHTML=renderRelancesPanel();
  else {pc.innerHTML="";return;}
  bindPanel();
}
// Charge la liste des sauvegardes puis rafraîchit le panneau
async function loadBackupsList(){
  const list=await listBackups();
  if(activePanel!=="backups")return;
  const pc=document.getElementById("panel-container");
  pc.innerHTML=renderBackupsPanel(list,false);
  bindPanel();
}
function renderBackupsPanel(list,loading){
  const isAdmin=hasRole("admin");
  const rows=loading
    ?`<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">⟳ Chargement des sauvegardes…</div>`
    :(list.length===0
      ?`<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">Aucune sauvegarde pour le moment.<br/>La première sera créée automatiquement aujourd'hui.</div>`
      :list.map((b,i)=>{
        const d=new Date(b.created_at);
        const dateStr=d.toLocaleDateString("fr-FR",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
        const timeStr=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
        const lblColor=b.label==="Manuelle"?"#3286A0":b.label==="Avant restauration"?"#b45309":"#94a3b8";
        return`<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:10px;margin-bottom:8px;background:${i===0?"#f0fdf4":"#fff"}">
          <div style="width:36px;height:36px;border-radius:9px;background:${TH.c1}15;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🕓</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:#0f1b35">${dateStr}${i===0?` <span style="font-size:9px;background:#dcfce7;color:#15803d;padding:1px 6px;border-radius:10px;font-weight:700">RÉCENTE</span>`:""}</div>
            <div style="font-size:11px;color:#64748b">${timeStr} · <span style="color:${lblColor};font-weight:600">${b.label||"Automatique"}</span></div>
          </div>
          ${isAdmin?`<button onclick="confirmRestoreBackup('${b.id}','${dateStr} ${timeStr}')" style="padding:7px 12px;border-radius:8px;border:1.5px solid ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif;white-space:nowrap;flex-shrink:0">↩️ Restaurer</button>`:""}
        </div>`;
      }).join(""));
  return`<div class="panel-overlay">
    <div class="panel-bg" onclick="closePanel()"></div>
    <div class="panel">
      <div class="panel-head">
        <div style="display:flex;align-items:center;gap:10px"><button onclick="closePanel();openPanel('settings')" style="width:30px;height:30px;border-radius:8px;border:1.5px solid #e2e8f0;background:#f8fafc;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:#64748b">←</button><div class="panel-title">🕓 Historique des sauvegardes</div></div>
        <button class="panel-close" onclick="closePanel()">✕</button>
      </div>
      <div class="panel-body">
        <div class="info-box">☁️ Sauvegardes automatiques (1 par jour) conservées dans le cloud. Les 30 plus récentes sont gardées. ${isAdmin?"Une sauvegarde de sécurité est créée avant chaque restauration.":"⚠️ Seul un administrateur peut restaurer."}</div>
        ${rows}
      </div>
      ${isAdmin?`<div class="panel-footer">
        <button class="btn-reset" onclick="closePanel();openPanel('settings')">← Retour</button>
        <button class="btn-apply" onclick="doManualBackup(this)">＋ Sauvegarder maintenant</button>
      </div>`:""}
    </div>
  </div>`;
}
function confirmRestoreBackup(id,when){
  showModal("Restaurer cette sauvegarde ?",
    `<p style="font-size:14px;color:#475569;line-height:1.6">Vous allez remplacer <strong>toutes les données actuelles</strong> par la sauvegarde du <strong>${when}</strong>.<br/><br/>Une sauvegarde de sécurité de l'état actuel sera créée automatiquement avant — l'opération reste donc réversible.</p>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:#b45309" onclick="closeModal();restoreBackup('${id}')">↩️ Restaurer</button>`
  );
}
async function doManualBackup(btn){
  if(btn){btn.disabled=true;btn.textContent="⟳ Sauvegarde…";}
  const ok=await createBackupSnapshot(true,"Manuelle");
  if(ok){ logActivity("Sauvegarde manuelle","Snapshot créé"); }
  if(activePanel==="backups") loadBackupsList();
  if(!ok) alert("La sauvegarde a échoué. Vérifiez votre connexion.");
}
function renderJournalPanel(){
  const icons={"Connexion":"🔓","Déconnexion":"🔒","Création utilisateur":"➕","Modification utilisateur":"✏️","Suppression utilisateur":"🗑️"};
  return`<div class="panel-overlay">
    <div class="panel-bg" onclick="closePanel()"></div>
    <div class="panel">
      <div class="panel-head">
        <div style="display:flex;align-items:center;gap:10px"><button onclick="closePanel();openPanel('settings')" style="width:30px;height:30px;border-radius:8px;border:1.5px solid #e2e8f0;background:#f8fafc;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:#64748b">←</button><div class="panel-title">📜 Journal d'activité</div></div>
        <button class="panel-close" onclick="closePanel()">✕</button>
      </div>
      <div class="panel-body">
        <div class="info-box">📋 Historique des ${JOURNAL.length} dernières actions (connexions, gestion des comptes). Conservé sur cet appareil.</div>
        ${JOURNAL.length===0?`<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">Aucune activité enregistrée pour le moment.</div>`:
          JOURNAL.map(j=>{
            const d=new Date(j.ts);
            const date=d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short"});
            const heure=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
            return`<div style="display:flex;gap:11px;padding:11px 4px;border-bottom:1px solid #f1f5f9">
              <div style="font-size:18px;flex-shrink:0;width:28px;text-align:center">${icons[j.action]||"•"}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:#0f1b35">${j.action}</div>
                ${j.details?`<div style="font-size:12px;color:#475569;margin-top:1px">${j.details}</div>`:""}
                <div style="font-size:11px;color:#94a3b8;margin-top:3px">${j.user} · ${date} à ${heure}</div>
              </div>
            </div>`;
          }).join("")}
        ${JOURNAL.length>0?`<button onclick="clearJournal()" style="margin-top:16px;width:100%;padding:9px;border-radius:8px;border:1.5px solid #fcd34d;background:#fffbeb;color:#b45309;cursor:pointer;font-weight:600;font-size:13px;font-family:'Lora',Georgia,serif">🗑️ Vider le journal</button>`:""}
      </div>
    </div>
  </div>`;
}
function renderDocsPanel(){
  const list=docsFilter==="tous"?DOCSHIST:DOCSHIST.filter(h=>h.type===docsFilter);
  return`<div class="panel-overlay">
    <div class="panel-bg" onclick="closePanel()"></div>
    <div class="panel">
      <div class="panel-head">
        <div style="display:flex;align-items:center;gap:10px"><button onclick="closePanel();openPanel('settings')" style="width:30px;height:30px;border-radius:8px;border:1.5px solid #e2e8f0;background:#f8fafc;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:#64748b">←</button><div class="panel-title">📚 Historique des documents</div></div>
        <button class="panel-close" onclick="closePanel()">✕</button>
      </div>
      <div class="panel-body">
        <div class="info-box">🗂️ Les ${DOCSHIST.length} derniers documents PDF générés (devis, factures, bons de commande). Cliquez sur 📄 pour régénérer un document.</div>
        <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
          ${[["tous","Tous"],["devis","📝 Devis"],["facture","🧾 Factures"],["bcc","📋 BC clients"],["bcf","📦 BC fournisseurs"]].map(([k,lbl])=>`
            <button onclick="docsFilter='${k}';renderPanel()" style="padding:5px 11px;border-radius:999px;border:1.5px solid ${docsFilter===k?TH.c1:"#e2e8f0"};background:${docsFilter===k?TH.c1:"#fff"};color:${docsFilter===k?"#fff":"#64748b"};cursor:pointer;font-size:11px;font-weight:600;font-family:'Inter',sans-serif">${lbl}</button>
          `).join("")}
        </div>
        ${list.length===0?`<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">Aucun document ${docsFilter!=="tous"?"de ce type ":""}généré pour le moment.</div>`:
          list.map(h=>{
            const t=DOC_TYPES[h.type]||{icon:"📄",lbl:h.type};
            const d=new Date(h.ts);
            const date=d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
            const heure=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
            return`<div style="display:flex;gap:11px;padding:11px 4px;border-bottom:1px solid #f1f5f9;align-items:center">
              <div style="font-size:18px;flex-shrink:0;width:28px;text-align:center">${t.icon}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:700;color:#0f1b35">${h.ref} <span style="font-weight:500;color:#64748b;font-size:11px">· ${t.lbl}</span></div>
                <div style="font-size:12px;color:#475569;margin-top:1px">${h.tiers||"—"} · ${fMoney(h.montant)}</div>
                <div style="font-size:11px;color:#94a3b8;margin-top:3px">${h.user} · ${date} à ${heure}</div>
              </div>
              <button onclick="regenDocument('${h.id}')" title="Régénérer le PDF" style="padding:6px 10px;border-radius:8px;border:1.5px solid #86efac;background:#f0fdf4;color:#15803d;cursor:pointer;font-size:13px;flex-shrink:0">📄</button>
            </div>`;
          }).join("")}
        ${DOCSHIST.length>0?`<button onclick="clearDocsHist()" style="margin-top:16px;width:100%;padding:9px;border-radius:8px;border:1.5px solid #fcd34d;background:#fffbeb;color:#b45309;cursor:pointer;font-weight:600;font-size:13px;font-family:'Lora',Georgia,serif">🗑️ Vider l'historique</button>`:""}
      </div>
    </div>
  </div>`;
}
function clearDocsHist(){
  if(!confirm("Vider tout l'historique des documents ? (les documents eux-mêmes ne sont pas supprimés)"))return;
  DOCSHIST=[];
  saveData();
  renderPanel();
}
function clearJournal(){
  if(!confirm("Vider tout le journal d'activité ?"))return;
  JOURNAL=[];
  saveData();
  renderPanel();
}


// ── Gestion utilisateurs (table profiles + Supabase Auth) ───────────────────
// Lecture/écriture scopées au tenant par les policies profiles_admin_*_tenant.

let profilesLoading=false;

async function loadProfiles(){
  if(!currentUser||!currentUser.tenant_id) { PROFILES=[]; return; }
  profilesLoading=true;
  try{
    const {data,error}=await sbClient.from("profiles")
      .select("id,tenant_id,role,nom,actif,email,tel,poste,avatar,created_at")
      .eq("tenant_id",currentUser.tenant_id)
      .order("nom");
    if(error){ console.warn("loadProfiles échec:",error); PROFILES=[]; }
    else PROFILES=data||[];
  }catch(e){ console.warn("loadProfiles échec:",e); PROFILES=[]; }
  profilesLoading=false;
}

function previewAvatar(ev){
  const file=ev.target.files[0];if(!file)return;
  if(file.size>500000){alert("Image trop lourde (max 500 Ko)");return;}
  const reader=new FileReader();
  reader.onload=e=>{
    document.getElementById("u-avatar").value=e.target.result;
    const prev=document.getElementById("u-avatar-preview");
    if(prev)prev.innerHTML=`<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover"/>`;
  };
  reader.readAsDataURL(file);
}
function updateAvatarInitial(name){
  const prev=document.getElementById("u-avatar-preview");
  const av=document.getElementById("u-avatar");
  if(prev&&av&&!av.value){prev.textContent=name?name.charAt(0).toUpperCase():"?";}
}

// Modification d'un profil existant. La création passe par une invitation (à venir).
function modalUser(id){
  const u=PROFILES.find(x=>x.id===id);
  if(!u){alert("Profil introuvable. Rouvrez les réglages pour rafraîchir la liste.");return;}
  const isMe=currentUser&&id===currentUser.id;
  // Un admin ne peut pas promouvoir quelqu'un super_admin : réservé à un super_admin.
  const roles=hasRole("super_admin")
    ?[["user","Utilisateur"],["admin","Administrateur"],["super_admin","Super administrateur"]]
    :[["user","Utilisateur"],["admin","Administrateur"]];
  showModal("Modifier l'utilisateur",`
    <div style="text-align:center;margin-bottom:18px">
      <div id="u-avatar-preview" style="width:72px;height:72px;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;overflow:hidden;background:linear-gradient(135deg,#3286A0,#299AC3)">
        ${u.avatar?`<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover"/>`:((u.nom||"?").charAt(0).toUpperCase())}
      </div>
      <label style="font-size:12px;color:#3286A0;font-weight:600;cursor:pointer">
        📷 Photo
        <input type="file" accept="image/*" style="display:none" onchange="previewAvatar(event)"/>
      </label>
      <input type="hidden" id="u-avatar" value="${u.avatar||""}"/>
    </div>
    <div style="background:#f8fafc;border-radius:9px;padding:10px 13px;margin-bottom:14px;font-size:12px;color:#64748b">
      🔑 Compte : <strong style="color:#0f1b35">${u.email||"—"}</strong><br/>
      L'adresse et le mot de passe se gèrent dans Supabase Auth, pas ici.
    </div>
    <div class="field"><label>Nom complet *</label><input id="u-nom" value="${(u.nom||"").replace(/"/g,"&quot;")}" placeholder="Prénom Nom" oninput="updateAvatarInitial(this.value)"/></div>
    <div class="field-row">
      <div class="field"><label>Poste / Fonction</label><input id="u-poste" value="${(u.poste||"").replace(/"/g,"&quot;")}" placeholder="Gérant, Commercial..."/></div>
      <div class="field"><label>Téléphone</label><input id="u-tel" type="tel" value="${(u.tel||"").replace(/"/g,"&quot;")}" placeholder="06 00 00 00 00"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Rôle</label><select id="u-role" ${isMe?"disabled":""}>
        ${roles.map(([k,l])=>`<option value="${k}"${u.role===k?" selected":""}>${l}</option>`).join("")}
      </select></div>
      <div class="field"><label>Statut</label><select id="u-actif" ${isMe?"disabled":""}>
        <option value="true"${u.actif!==false?" selected":""}>✓ Actif</option>
        <option value="false"${u.actif===false?" selected":""}>✗ Désactivé</option>
      </select></div>
    </div>
    ${isMe?`<div style="font-size:11.5px;color:#b45309;background:#fffbeb;border-radius:8px;padding:9px 12px">⚠️ Vous ne pouvez pas modifier votre propre rôle ni vous désactiver.</div>`:""}`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:#3286A0" onclick="saveUser('${id}')">Enregistrer</button>`
  );
}

async function saveUser(id){
  if(testBloque("la modification des utilisateurs")) return;
  const u=PROFILES.find(x=>x.id===id);
  if(!u)return;
  const isMe=currentUser&&id===currentUser.id;
  const nom=document.getElementById("u-nom").value.trim();
  if(!nom){alert("Le nom est obligatoire");return;}
  const patch={
    nom,
    poste:document.getElementById("u-poste").value.trim(),
    tel:document.getElementById("u-tel").value.trim(),
    avatar:document.getElementById("u-avatar").value
  };
  // Rôle et statut : jamais sur soi-même, pour éviter de se verrouiller dehors
  if(!isMe){
    patch.role=document.getElementById("u-role").value;
    patch.actif=document.getElementById("u-actif").value==="true";
  }
  const {error}=await sbClient.from("profiles").update(patch).eq("id",id);
  if(error){ alert("Enregistrement impossible : "+error.message); return; }
  logActivity("Modification utilisateur",`Profil de ${nom} mis à jour`);
  if(isMe){
    currentUser={...currentUser,nom,poste:patch.poste,tel:patch.tel,avatar:patch.avatar};
    sessionStorage.setItem("gp_user",JSON.stringify(currentUser));
  }
  closeModal();
  await loadProfiles();
  renderPanel();
  renderNav();
}

// Désactivation plutôt que suppression : effacer un profil casserait les références
// dans le journal et les documents, et le compte Auth resterait actif.
async function delUser(id){
  if(testBloque("la désactivation des utilisateurs")) return;
  const u=PROFILES.find(x=>x.id===id);
  if(!u)return;
  if(currentUser&&id===currentUser.id){alert("Vous ne pouvez pas désactiver votre propre compte.");return;}
  const actifs=PROFILES.filter(p=>p.actif!==false&&(p.role==="admin"||p.role==="super_admin"));
  if(u.actif!==false&&actifs.length<=1&&actifs[0]&&actifs[0].id===id){
    alert("Impossible de désactiver le dernier administrateur actif.");return;
  }
  confirmDel(`Désactiver le compte de ${u.nom||"cet utilisateur"} ? Il ne pourra plus se connecter, mais son historique est conservé.`,async function(){
    const {error}=await sbClient.from("profiles").update({actif:false}).eq("id",id);
    if(error){ alert("Action impossible : "+error.message); return; }
    logActivity("Désactivation utilisateur",`${u.nom||"Utilisateur"} désactivé`);
    await loadProfiles();
    renderPanel();
  });
}

// Réactivation d'un compte désactivé
async function reactivateUser(id){
  if(testBloque("la réactivation des utilisateurs")) return;
  const u=PROFILES.find(x=>x.id===id);
  if(!u)return;
  const {error}=await sbClient.from("profiles").update({actif:true}).eq("id",id);
  if(error){ alert("Action impossible : "+error.message); return; }
  logActivity("Réactivation utilisateur",`${u.nom||"Utilisateur"} réactivé`);
  await loadProfiles();
  renderPanel();
}

function modalInviteUser(){
  const roles=hasRole("super_admin")
    ?[["user","Utilisateur"],["admin","Administrateur"],["super_admin","Super administrateur"]]
    :[["user","Utilisateur"],["admin","Administrateur"]];
  showModal("Inviter un utilisateur",`
    <div class="info-box" style="margin-bottom:16px">✉️ Un email d'invitation sera envoyé. L'utilisateur choisira son mot de passe lui-même et rejoindra automatiquement votre entreprise.</div>
    <div class="field"><label>Email *</label><input id="inv-email" type="email" placeholder="prenom.nom@exemple.fr"/></div>
    <div class="field"><label>Nom complet *</label><input id="inv-nom" placeholder="Prénom Nom"/></div>
    <div class="field-row">
      <div class="field"><label>Poste / Fonction</label><input id="inv-poste" placeholder="Commercial, Technicien..."/></div>
      <div class="field"><label>Rôle</label><select id="inv-role">
        ${roles.map(([k,l])=>`<option value="${k}"${k==="user"?" selected":""}>${l}</option>`).join("")}
      </select></div>
    </div>
    <div id="inv-msg" style="display:none;font-size:12.5px;font-weight:600;padding:10px 13px;border-radius:9px;margin-top:4px"></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" id="inv-btn" style="background:${TH.c1}" onclick="sendInvite()">✉️ Envoyer l'invitation</button>`
  );
}

function invMsg(texte,type){
  const box=document.getElementById("inv-msg");
  if(!box)return;
  const st=type==="ok"
    ?{c:"#15803d",bg:"#f0fdf4",bd:"#86efac"}
    :{c:"#991b1b",bg:"#fef2f2",bd:"#fca5a5"};
  box.textContent=texte;
  box.style.display="block";
  box.style.color=st.c;box.style.background=st.bg;box.style.border="1.5px solid "+st.bd;
}

async function sendInvite(){
  if(testBloque("l'invitation d'utilisateurs")) return;
  const email=document.getElementById("inv-email").value.trim();
  const nom=document.getElementById("inv-nom").value.trim();
  const poste=document.getElementById("inv-poste").value.trim();
  const role=document.getElementById("inv-role").value;
  if(!email||!email.includes("@")){invMsg("Adresse email invalide.","err");return;}
  if(!nom){invMsg("Le nom est obligatoire.","err");return;}

  const btn=document.getElementById("inv-btn");
  if(btn){btn.disabled=true;btn.textContent="⟳ Envoi…";}
  try{
    const {data,error}=await sbClient.functions.invoke("Invite-user",{
      body:{email,nom,poste,role,redirectTo:location.origin+location.pathname}
    });
    // L'erreur métier est renvoyée dans le corps de la réponse
    const msg=(data&&data.error)||(error&&error.message);
    if(msg){ invMsg(msg,"err"); if(btn){btn.disabled=false;btn.textContent="✉️ Envoyer l'invitation";} return; }
    invMsg("✓ Invitation envoyée à "+email,"ok");
    logActivity("Invitation utilisateur",`${nom} (${email}) — ${roleLabel(role)}`);
    await loadProfiles();
    renderPanel();
    setTimeout(closeModal,1400);
  }catch(e){
    invMsg("Envoi impossible : "+e.message,"err");
    if(btn){btn.disabled=false;btn.textContent="✉️ Envoyer l'invitation";}
  }
}

function reglageItem(ico,titre,sous,panel){
  return `<button onclick="closePanel();openPanel('${panel}')" style="width:100%;padding:11px 14px;border:none;border-bottom:1px solid #f1f5f9;background:#fff;cursor:pointer;display:flex;align-items:center;gap:12px;font-family:'Inter',sans-serif;text-align:left"
    onmouseover="this.style.background='${TH.c1}08'" onmouseout="this.style.background='#fff'">
    <span style="font-size:19px;width:26px;text-align:center">${ico}</span>
    <span style="flex:1;min-width:0"><span style="display:block;font-weight:700;font-size:13.5px;color:#0f1b35">${titre}</span><span style="display:block;font-size:11.5px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sous}</span></span>
    <span style="color:#cbd5e1;font-size:18px">›</span></button>`;
}
function reglageGroupe(titre,items){
  const L=items.filter(Boolean);if(!L.length)return "";
  return `<div style="margin-bottom:18px"><div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px">${titre}</div>
    <div style="border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:-1px">${L.join("")}</div></div>`;
}
function renderSettingsPanel(){
  const u=currentUser||{nom:"—",login:"—",email:"",role:"—"};
  return`<div class="panel-overlay">
    <div class="panel-bg" onclick="closePanel()"></div>
    <div class="panel">
      <div class="panel-head">
        <div style="display:flex;align-items:center;gap:10px">
          <button onclick="closePanel()" style="width:30px;height:30px;border-radius:8px;border:1.5px solid #e2e8f0;background:#f8fafc;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:#64748b">←</button>
          <div class="panel-title">⚙️ Réglages</div>
        </div>
        <button class="panel-close" onclick="closePanel()">✕</button>
      </div>
      <div class="panel-body">

        <!-- Logo -->
        <div style="text-align:center;margin-bottom:20px">
          <div onclick="closePanel();openPanel('entreprise')" style="cursor:pointer;display:inline-block;position:relative">
            ${thLogo()
              ?`<img src="${thLogo()}" style="width:80px;height:80px;object-fit:contain;border-radius:50%;border:3px solid ${TH.c1};padding:8px;background:#f8fafc;filter:${TH.logo?TH.logoF:"none"}"/>`
              :`<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,${TH.c1},${TH.c2});display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto">🛡️</div>`
            }
            <div style="position:absolute;bottom:0;right:0;width:24px;height:24px;background:${TH.c1};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff">✏️</div>
          </div>
          <div style="margin-top:10px;font-weight:700;font-size:16px;color:${TH.txt}">${TH.nom}</div>
          <div style="font-size:11px;color:${TH.txt}77;letter-spacing:0.15em;text-transform:uppercase">${TH.sous}</div>
        </div>

        <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 16px"/>

        <!-- Compte connecté -->
        <div style="margin-bottom:20px">
          <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px">Compte connecté</div>
          <div style="background:#f8fafc;border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px">
            <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,${TH.c1},${TH.c2});display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0">${u.nom.charAt(0)}</div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:14px;color:#0f1b35">${u.nom}</div>
              <div style="font-size:12px;color:#64748b">${u.email||u.login||"—"} · ${roleLabel(u.role)}</div>
            </div>
          </div>
        </div>

        <!-- Navigation réglages -->
        ${reglageGroupe("Entreprise",[
          reglageItem("🏢","Informations de l'entreprise","Nom, logo, coordonnées, mentions légales, comptabilité","entreprise"),
          hasRole("admin")?reglageItem(METIERS[metierId()].icone,"Métier",METIERS[metierId()].label,"metier"):"",
          reglageItem("🎨","Apparence","Thème, couleurs, police","theme"),
          reglageItem("📋","Menu","Ordre, icônes et rubriques affichées","rubs")])}
        ${reglageGroupe("Documents et e-mails",[
          reglageItem("✉️","E-mails et signatures",SigMail.cfg(TH).actif?"Signature avec logo activée":"Signature désactivée","emails"),
          hasRole("admin")?reglageItem("🔔","Relances automatiques",RelancesCore.config(TH).actif?"Activées · envoi chaque matin":"Désactivées","relances"):"",
          reglageItem("📄",FV("contrats"),"Cocontractant, engagements, grille tarifaire","contrats"),
          reglageItem("📚","Historique des documents",DOCSHIST.length+" document(s) généré(s)","docs")])}
        ${hasRole("admin")?reglageGroupe("Sécurité et données",[
          reglageItem("📜","Journal d'activité",JOURNAL.length+" événement(s) enregistré(s)","journal"),
          reglageItem("🕓","Sauvegardes","Restaurer une version antérieure (cloud)","backups")]):""}

        <!-- Gestion utilisateurs (admin only) -->
        ${hasRole("admin")?`
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em">Équipe · ${PROFILES.length} utilisateur(s)</div>
            <button onclick="modalInviteUser()" style="padding:5px 10px;border-radius:7px;border:none;background:#3286A0;color:#fff;cursor:pointer;font-size:12px;font-weight:700;font-family:'Lora',Georgia,serif">＋ Ajouter</button>
          </div>
          <div style="background:#f8fafc;border-radius:10px;overflow:hidden">
            ${profilesLoading?`<div style="padding:18px;text-align:center;color:#94a3b8;font-size:12px">⟳ Chargement…</div>`
              :(PROFILES.length===0?`<div style="padding:18px;text-align:center;color:#94a3b8;font-size:12px">Aucun profil trouvé pour cette entreprise.</div>`
              :PROFILES.map((us,i)=>{
                const estAdmin=us.role==="admin"||us.role==="super_admin";
                const inactif=us.actif===false;
                return`<div style="padding:11px 16px;border-bottom:${i<PROFILES.length-1?"1px solid #f1f5f9":"none"};display:flex;align-items:center;gap:10px;${inactif?"opacity:0.55":""}">
              <div style="width:38px;height:38px;border-radius:50%;background:${estAdmin?"linear-gradient(135deg,#3286A0,#299AC3)":"#e2e8f0"};display:flex;align-items:center;justify-content:center;color:${estAdmin?"#fff":"#64748b"};font-weight:700;font-size:15px;flex-shrink:0;overflow:hidden">${us.avatar?`<img src="${us.avatar}" style="width:100%;height:100%;object-fit:cover"/>`:((us.nom||"?").charAt(0).toUpperCase())}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:#0f1b35;display:flex;align-items:center;gap:6px">${us.nom||"—"}${inactif?`<span style="font-size:9px;background:#fee2e2;color:#991b1b;padding:1px 6px;border-radius:10px;font-weight:700">DÉSACTIVÉ</span>`:""}</div>
                <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${us.email||"—"}${us.poste?" · "+us.poste:""} · <span style="color:${estAdmin?"#3286A0":"#94a3b8"}">${roleLabel(us.role)}</span></div>
              </div>
              <div style="display:flex;gap:5px;flex-shrink:0">
                <button onclick="modalUser('${us.id}')" style="padding:4px 8px;border-radius:6px;border:1.5px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;cursor:pointer;font-size:12px">✏️</button>
                ${us.id!==currentUser?.id?(inactif
                  ?`<button onclick="reactivateUser('${us.id}')" title="Réactiver" style="padding:4px 8px;border-radius:6px;border:1.5px solid #86efac;background:#f0fdf4;color:#15803d;cursor:pointer;font-size:12px">↩️</button>`
                  :`<button onclick="delUser('${us.id}')" title="Désactiver" style="padding:4px 8px;border-radius:6px;border:1.5px solid #fecaca;background:#fef2f2;color:#991b1b;cursor:pointer;font-size:12px">🚫</button>`):""}
              </div>
            </div>`;}).join(""))}
          </div>
        </div>`:""}

        <!-- App info -->
        <div style="background:#f8fafc;border-radius:10px;padding:14px 16px">
          <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px">Application</div>
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:#64748b">Version</span><span style="font-weight:600;color:#0f1b35">1.2.0</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:#64748b">Clients</span><span style="font-weight:600;color:#0f1b35">${CLIENTS.length}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:#64748b">Prospects</span><span style="font-weight:600;color:#0f1b35">${PROSPECTS.length}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:#64748b">Événements</span><span style="font-weight:600;color:#0f1b35">${EVENTS.length}</span></div>
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e8e8e8;display:flex;align-items:center;gap:6px;font-size:11px;color:#15803d"><span>💾</span><span>Données sauvegardées automatiquement sur cet appareil</span></div>
          <div style="margin-top:6px;display:flex;align-items:center;gap:6px;font-size:11px;color:#15803d"><span>🔒</span><span>Mots de passe chiffrés (SHA-256)</span></div>
        </div>
      </div>

      <div class="panel-footer" style="flex-direction:column;gap:8px">
        <div style="display:flex;gap:8px;width:100%">
          <button onclick="exportData()" style="flex:1;padding:9px;border-radius:8px;border:1.5px solid #3286A0;background:#3286A008;color:#3286A0;cursor:pointer;font-weight:700;font-size:13px;font-family:'Lora',Georgia,serif">⬇️ Exporter</button>
          <label style="flex:1;padding:9px;border-radius:8px;border:1.5px solid #3286A0;background:#3286A008;color:#3286A0;cursor:pointer;font-weight:700;font-size:13px;font-family:'Lora',Georgia,serif;text-align:center;box-sizing:border-box">
            ⬆️ Importer
            <input type="file" accept=".json,application/json" style="display:none" onchange="importData(event)"/>
          </label>
        </div>
        ${TH.site?`<a href="${TH.site}" target="_blank" rel="noopener" style="display:block;width:100%;box-sizing:border-box;text-align:center;padding:9px;border-radius:8px;border:1.5px solid #e2e8f0;background:#fff;color:#475569;cursor:pointer;font-weight:600;font-size:13px;font-family:'Lora',Georgia,serif">🌐 Voir mon site</a>`:""}
        ${hasRole("admin")?`<button onclick="resetData()" style="width:100%;padding:9px;border-radius:8px;border:1.5px solid #fcd34d;background:#fffbeb;color:#b45309;cursor:pointer;font-weight:600;font-size:13px;font-family:'Lora',Georgia,serif">↺ Réinitialiser les données</button>`:""}
        <button onclick="doLogout()" style="width:100%;padding:9px;border-radius:8px;border:1.5px solid #fca5a5;background:#fef2f2;color:#991b1b;cursor:pointer;font-weight:700;font-size:13px;font-family:'Lora',Georgia,serif">🚪 Se déconnecter</button>
      </div>
    </div>
  </div>`;
}
// ── Réglages de la signature des e-mails ──
function sigSet(k,v){
  if(!TH.sigMail||typeof TH.sigMail!=="object"){const c=SigMail.cfg(TH);TH.sigMail={actif:true,nom:"",poste:"",societe:c.societe,tel1:c.tel1,tel2:"",email:c.email,site:c.site,adresse:c.adresse,logoUrl:"",slogan:""};}
  TH.sigMail[k]=v;saveData();
  const ap=document.getElementById("sig-apercu");
  if(ap) ap.innerHTML=SigMail.cfg(TH).actif?SigMail.html(TH):`<div style="padding:12px 0;color:#94a3b8;font-size:12px">Signature désactivée : seuls le nom de l'entreprise et ses coordonnées figurent en texte simple.</div>`;
}
// Signatures personnelles : chaque utilisateur signe les devis et factures qu'il envoie
function sigUserSet(uid,k,v){
  TH.sigMailUsers=TH.sigMailUsers||{};TH.sigMailUsers[uid]=TH.sigMailUsers[uid]||{};
  TH.sigMailUsers[uid][k]=v;saveData();
  const ap=document.getElementById("sig-ap-"+uid);if(ap)ap.innerHTML=SigMail.html(TH,uid);
}
function renderSigUsers(){
  const L=(PROFILES&&PROFILES.length?PROFILES:(currentUser?[{id:currentUser.id,nom:currentUser.nom,poste:currentUser.poste,tel:currentUser.tel}]:[]));
  if(!L.length) return "";
  const v=x=>String(x==null?"":x).replace(/&/g,"&amp;").replace(/"/g,"&quot;");
  return `<div class="section-sub" style="margin:4px 0 6px">👤 Signatures personnelles</div>
    <div style="font-size:11px;color:#94a3b8;margin-bottom:10px;line-height:1.4">Quand un utilisateur envoie un devis, une facture ou un rapport, sa signature remplace le nom, la fonction et les téléphones ci-dessus. Les relances automatiques gardent la signature de l'entreprise. Champ vide = valeur de l'entreprise.</div>
    ${L.map(p=>{const u=(TH.sigMailUsers||{})[p.id]||{};const f=(k,lbl,ph)=>`<div class="p-field" style="margin-bottom:8px"><label class="field-label">${lbl}</label><input value="${v(u[k])}" placeholder="${v(ph)}" oninput="sigUserSet('${p.id}','${k}',this.value)"/></div>`;
      return `<details style="border:1.5px solid #e2e8f0;border-radius:10px;padding:8px 12px;margin-bottom:8px"${u.nom?"":" open"}><summary style="cursor:pointer;font-weight:700;font-size:13px">${v(p.nom||"Utilisateur")}${p.id===(currentUser&&currentUser.id)?" (vous)":""}</summary>
        <div style="margin-top:10px">${f("nom","Nom affiché",p.nom||"")}${f("poste","Fonction",p.poste||"")}${f("tel1","Téléphone",p.tel||"")}${f("tel2","Téléphone 2","")}${f("email","E-mail",SigMail.cfg(TH).email)}
        <div class="field-label" style="margin:6px 0 4px">Aperçu</div><div id="sig-ap-${p.id}" style="border:1.5px dashed #e2e8f0;border-radius:10px;padding:2px 10px 10px;background:#fff;overflow-x:auto">${SigMail.html(TH,p.id)}</div></div></details>`;}).join("")}`;
}
function renderSigMailReglages(){
  const c=SigMail.cfg(TH);
  const v=x=>String(x==null?"":x).replace(/&/g,"&amp;").replace(/"/g,"&quot;");
  const f=(k,lbl,ph,type)=>`<div class="p-field"><label class="field-label">${lbl}</label><input type="${type||"text"}" value="${v(c[k])}" placeholder="${ph||""}" oninput="sigSet('${k}',this.value)"/></div>`;
  return `<div class="section-sub" style="margin-bottom:8px">✉️ Signature des e-mails</div>
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:12px;cursor:pointer"><input type="checkbox" ${c.actif?"checked":""} onchange="sigSet('actif',this.checked)" style="width:18px;height:18px;accent-color:${TH.c1}"/> Ajouter la signature (logo et coordonnées) à la fin de tous les e-mails envoyés par l'appli</label>
    ${f("nom","Nom du signataire","Prénom NOM")}
    ${f("poste","Fonction","Présidente, Gérant…")}
    ${f("societe","Entreprise","")}
    ${f("slogan","Accroche (facultatif)",MP().ex.slogan)}
    ${f("tel1","Téléphone 1","0696 00 00 00","tel")}
    ${f("tel2","Téléphone 2 (facultatif)","","tel")}
    ${f("email","E-mail","contact@votre-entreprise.fr","email")}
    ${f("site","Site internet","www.votre-entreprise.fr")}
    ${f("adresse","Adresse","")}
    ${f("logoUrl","Adresse web du logo","https://www.votre-entreprise.fr/logo.png","url")}
    <div style="font-size:11px;color:#94a3b8;margin:-6px 0 12px;line-height:1.4">Le logo doit être une image en ligne (lien https) : les messageries n'affichent pas les images intégrées.</div>
    <div class="field-label" style="margin-bottom:4px">Aperçu</div>
    <div id="sig-apercu" style="border:1.5px dashed #e2e8f0;border-radius:10px;padding:2px 12px 12px;background:#fff;overflow-x:auto;margin-bottom:14px">${c.actif?SigMail.html(TH):`<div style="padding:12px 0;color:#94a3b8;font-size:12px">Signature désactivée.</div>`}</div>
    ${c.actif?renderSigUsers():""}`;
}
function panelShell(icone,titre,corps,pied){
  return `<div class="panel-overlay">
    <div class="panel-bg" onclick="closePanel()"></div>
    <div class="panel">
      <div class="panel-head">
        <div style="display:flex;align-items:center;gap:10px"><button onclick="closePanel();openPanel('settings')" style="width:30px;height:30px;border-radius:8px;border:1.5px solid #e2e8f0;background:#f8fafc;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:#64748b">←</button><div class="panel-title">${icone} ${titre}</div></div>
        <button class="panel-close" onclick="closePanel()">✕</button>
      </div>
      <div class="panel-body">${corps}</div>
      <div class="panel-footer">${pied||`<button class="btn-reset" onclick="closePanel();openPanel('settings')">← Réglages</button><button class="btn-apply" onclick="closePanel()">Terminé ✓</button>`}</div>
    </div>
  </div>`;
}
function reglageTitre(t,sous){return `<div style="font-size:11px;font-weight:800;color:${TH.c1};text-transform:uppercase;letter-spacing:0.08em;margin:18px 0 10px;padding-bottom:6px;border-bottom:1.5px solid ${TH.c1}22">${t}${sous?`<div style="font-size:11px;font-weight:400;color:#94a3b8;text-transform:none;letter-spacing:0;margin-top:3px">${sous}</div>`:""}</div>`;}
// 🏢 Entreprise : identité, coordonnées, mentions légales, comptabilité
function renderEntreprisePanel(){
  return panelShell("🏢","Entreprise",`
    ${reglageTitre("Identité","Nom et logo affichés dans l'appli et sur les documents")}
        <div class="p-field"><label class="field-label">Nom</label><input type="text" value="${TH.nom}" oninput="TH.nom=this.value;applyTheme()"/></div>
        <div class="p-field"><label class="field-label">Sous-titre</label><input type="text" value="${TH.sous}" oninput="TH.sous=this.value;applyTheme()"/></div>
        <div class="p-field">
          <label class="field-label">Logo</label>
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
            ${TH.logo?`<img src="${TH.logo}" style="width:50px;height:50px;object-fit:contain;border-radius:8px;border:1px solid #e2e8f0;padding:4px;background:#f8fafc;filter:${TH.logoF}"/>`:`<div style="width:50px;height:50px;border-radius:8px;border:1.5px dashed #e2e8f0;background:#f8fafc;display:flex;align-items:center;justify-content:center;font-size:22px">🖼️</div>`}
            <label class="logo-upload">📤 ${TH.logo?"Changer":"Ajouter"}<input type="file" accept="image/*" onchange="handleLogo(event)" style="display:none"/></label>
          </div>
          ${TH.logo?`<select onchange="TH.logoF=this.value;applyTheme()"><option value="none">Original</option><option value="brightness(0) invert(1)">Blanc</option><option value="brightness(0)">Noir</option><option value="brightness(0) saturate(100%) invert(45%) sepia(60%) saturate(400%) hue-rotate(165deg)">Bleu</option></select>`:""}
        </div>

    ${reglageTitre("Coordonnées")}
        <div class="p-field"><label class="field-label">Adresse</label><input type="text" value="${TH.adresse||''}" placeholder="Adresse de votre entreprise" oninput="TH.adresse=this.value;saveData()"/></div>
        <div class="p-field"><label class="field-label">Email</label><input type="email" value="${TH.email||''}" placeholder="contact@votre-entreprise.fr" oninput="TH.email=this.value;saveData()"/></div>
        <div class="p-field"><label class="field-label">Site web</label><input type="url" value="${TH.site||''}" placeholder="https://www.votre-entreprise.fr" oninput="TH.site=this.value;saveData()"/></div>
        <div class="p-field"><label class="field-label">T&eacute;l&eacute;phone</label><input type="text" value="${TH.tel||''}" placeholder="06 00 00 00 00" oninput="TH.tel=this.value;saveData()"/></div>
        <div class="p-field"><label class="field-label">Horaires d'ouverture / SAV</label><input type="text" value="${(TH.horaires||'').replace(/"/g,'&quot;')}" placeholder="Lun–ven 8h30–16h" oninput="TH.horaires=this.value;saveData()"/></div>
    ${reglageTitre("Mentions légales","Reprises en pied de page des devis et factures")}
        <div class="p-field"><label class="field-label">SIRET</label><input type="text" value="${TH.siret||''}" placeholder="000 000 000 00000" oninput="TH.siret=this.value;saveData()"/></div>
        <div class="p-field"><label class="field-label">N&deg; TVA intracom.</label><input type="text" value="${TH.tvaIntra||''}" placeholder="FR00000000000" oninput="TH.tvaIntra=this.value;saveData()"/></div>
        <div class="p-field"><label class="field-label">Mentions l&eacute;gales PDF</label><input type="text" value="${TH.mentionsLegales||''}" placeholder="Auto-entrepreneur &middot; Dispen..." oninput="TH.mentionsLegales=this.value;saveData()"/></div>

    ${reglageTitre("Comptabilité")}
        <div class="p-field"><label class="field-label">D&eacute;marrage de la comptabilit&eacute;</label>
          <div style="display:flex;gap:6px"><input type="date" value="${TH.compteDepuis||''}" onchange="TH.compteDepuis=this.value;saveData();renderPage();renderNav()" style="flex:1"/>
          ${TH.compteDepuis?`<button class="btn-sm" onclick="TH.compteDepuis='';saveData();renderPanel();renderPage();renderNav()">Effacer</button>`:""}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px;line-height:1.4">Factures, r&egrave;glements, caisse, banque et statistiques ant&eacute;rieurs &agrave; cette date sont ignor&eacute;s dans les chiffres (ils restent consultables dans leurs listes).</div></div>
`);
}
// 🎨 Apparence : thème, couleurs, police
function renderThemePanel(){
  return panelShell("🎨","Apparence",`
        <div style="margin-bottom:14px">
          <label class="field-label">Thèmes prédéfinis</label>
          <div class="preset-grid">${PRESETS.map((p,i)=>`<button class="preset-btn" onclick="applyPreset(${i})" style="background:${p.c1}11;border-color:${p.c1}33"><div class="preset-dots"><div class="preset-dot" style="background:${p.sb}"></div><div class="preset-dot" style="background:${p.c1}"></div><div class="preset-dot" style="background:${p.c2}"></div></div>${p.label}</button>`).join("")}</div>
        </div>

    ${reglageTitre("Couleurs")}
        ${[["Couleur principale","c1"],["Couleur secondaire","c2"],["Fond sidebar","sidebar"],["Fond page","bg"],["Fond cartes","card"],["Texte","txt"],["Accent","sand"]].map(([l,k])=>`
          <div class="p-field"><label class="field-label">${l}</label><div class="color-row">
            <input type="color" value="${TH[k]}" oninput="TH.${k}=this.value;applyTheme();renderNav()"/>
            <input type="text" value="${TH[k]}" oninput="TH.${k}=this.value;applyTheme();renderNav()"/>
          </div></div>`).join("")}

    ${reglageTitre("Police et aperçu")}
        <div class="p-field"><label class="field-label">Police</label><select onchange="TH.police=this.value;applyTheme();renderNav()">
          ${POLICES.map(p=>`<option${TH.police===p?" selected":""}>${p}</option>`).join("")}
        </select></div>
        <div class="sidebar-preview" style="background:${TH.sidebar}">
          ${TH.logo?`<img src="${TH.logo}" style="width:38px;height:38px;object-fit:contain;margin:0 auto 8px;display:block;filter:${TH.logoF}"/>`:""}
          <div style="color:${TH.sand};font-weight:700;font-size:17px">${TH.nom}</div>
          <div style="color:${TH.c2};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;margin-top:3px">${TH.sous}</div>
        </div>
`,
    `<button class="btn-reset" onclick="resetThemeColors()">↺ Couleurs d'origine</button><button class="btn-apply" onclick="closePanel()">Terminé ✓</button>`);
}
// ✉️ E-mails : signature de l'entreprise + signatures personnelles
function renderEmailsPanel(){
  return panelShell("✉️","E-mails et signatures",`${renderSigMailReglages()}
    ${hasRole("admin")?`<button onclick="closePanel();openPanel('relances')" class="btn-sm" style="width:100%;margin-top:6px;padding:10px">🔔 Régler les relances automatiques ›</button>`:""}`);
}
// 📄 Contrats de maintenance
function renderContratsPanel(){
  return panelShell("📄",FV("contrats"),`
    ${reglageTitre("Cocontractant","Informations reprises dans les contrats générés")}
        <div class="p-field"><label class="field-label">Si&egrave;ge social (contrat)</label><input type="text" value="${TH.contratSiege||''}" oninput="TH.contratSiege=this.value;saveData()"/></div>
        <div class="p-field"><label class="field-label">SIREN (contrat)</label><input type="text" value="${TH.contratSiren||''}" oninput="TH.contratSiren=this.value;saveData()"/></div>
        <div class="p-field"><label class="field-label">Repr&eacute;sentant</label><input type="text" value="${TH.contratRepresentant||''}" oninput="TH.contratRepresentant=this.value;saveData()"/></div>
        <div class="p-field"><label class="field-label">Qualit&eacute; du repr&eacute;sentant</label><input type="text" value="${TH.contratQualite||''}" oninput="TH.contratQualite=this.value;saveData()"/></div>

    ${reglageTitre("Engagements et conditions")}
        <div class="p-field"><label class="field-label">D&eacute;lai panne bloquante</label><input type="text" value="${TH.contratDelaiBloquant||''}" oninput="TH.contratDelaiBloquant=this.value;saveData()"/></div>
        <div class="p-field"><label class="field-label">D&eacute;lai panne partielle</label><input type="text" value="${TH.contratDelaiPartiel||''}" oninput="TH.contratDelaiPartiel=this.value;saveData()"/></div>
        <div class="p-field"><label class="field-label">Tribunal comp&eacute;tent (clients pros commer&ccedil;ants)</label><input type="text" value="${TH.contratTribunal||''}" oninput="TH.contratTribunal=this.value;saveData()"/></div>
        <div class="p-field"><label class="field-label">M&eacute;diateur de la consommation (particuliers)</label><input type="text" value="${(TH.contratMediateur||'').replace(/"/g,'&quot;')}" placeholder="Nom, adresse, site internet" oninput="TH.contratMediateur=this.value;saveData()"/></div>
        <div class="p-field"><label class="field-label">Indemnit&eacute; r&eacute;siliation anticip&eacute;e particulier (% des mensualit&eacute;s restantes)</label><input type="number" min="0" max="100" value="${TH.contratIndemnitePart!=null?TH.contratIndemnitePart:20}" oninput="TH.contratIndemnitePart=Number(this.value);saveData()"/></div>
        <div class="p-field"><label class="field-label">Texte l&eacute;gal &mdash; Annexe 4 (particuliers)</label><div style="font-size:11px;color:#94a3b8;margin-bottom:4px;line-height:1.4">Copiez depuis L&eacute;gifrance le texte int&eacute;gral de l&rsquo;article L. 215-4 du Code de la consommation et des articles qu&rsquo;il cite, puis collez-le ici (un paragraphe par ligne).</div><textarea rows="6" style="width:100%;font-size:12px" oninput="TH.contratTexteL215=this.value;saveData()">${ctrEsc(TH.contratTexteL215||"")}</textarea></div>

    ${reglageTitre("Grille tarifaire",`Mini et maxi de ${MP().unite[1]}, prix HT par mois`)}
        <div class="p-field">
          ${(TH.contratForfaits||[]).map((f,i)=>`
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
              <input type="text" value="${f.label}" style="flex:1.3" oninput="TH.contratForfaits[${i}].label=this.value;saveData()" placeholder="Nom"/>
              <input type="number" min="0" value="${f.min}" style="width:52px" title="Mini ${MP().unite[1]}" oninput="TH.contratForfaits[${i}].min=Number(this.value);saveData()"/>
              <span style="color:#94a3b8;font-size:12px">à</span>
              <input type="number" min="0" value="${f.max==null?'':f.max}" style="width:52px" placeholder="∞" title="Maxi ${MP().unite[1]} (vide = illimité)" oninput="TH.contratForfaits[${i}].max=this.value===''?null:Number(this.value);saveData()"/>
              <input type="number" min="0" step="any" value="${f.prix}" style="width:66px" title="€ HT / mois" oninput="TH.contratForfaits[${i}].prix=Number(this.value);saveData()"/>
              <span style="color:#94a3b8;font-size:11px">€/mois</span>
            </div>`).join("")}
        </div>
`);
}
function renderRubsPanel(){
  const sorted=[...RUBS].sort((a,b)=>a.ordre-b.ordre);
  return`<div class="panel-overlay">
    <div class="panel-bg" onclick="closePanel()"></div>
    <div class="panel">
      <div class="panel-head">
        <div style="display:flex;align-items:center;gap:10px"><button onclick="closePanel();openPanel('settings')" style="width:30px;height:30px;border-radius:8px;border:1.5px solid #e2e8f0;background:#f8fafc;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:#64748b">←</button><div class="panel-title">📋 Rubriques</div></div>
        <button class="panel-close" onclick="closePanel()">✕</button>
      </div>
      <div class="panel-body">
        <div class="info-box">💡 Glissez pour réordonner · Cliquez sur l'emoji pour changer · 👁 pour masquer</div>
        ${sorted.map((r,i)=>`
          <div class="rub-item" draggable="${r.id!=="db"}" ondragstart="dragStart(${i})" ondragover="dragOver(event,${i})" ondragend="dragEnd()" style="opacity:${r.actif?1:0.5}">
            <div class="rub-row">
              <span style="cursor:${r.id==="db"?"default":"grab"};color:#cbd5e1;font-size:14px">${r.id==="db"?"🏠":"⠿"}</span>
              <button class="rub-icon-btn" onclick="toggleEmojiPicker('${r.id}')">${r.icon}</button>
              <input class="rub-name-inp" value="${r.label}" oninput="setRubLabel('${r.id}',this.value)"/>
              <button class="rub-toggle" onclick="toggleRub('${r.id}')" ${r.id==="db"?"disabled":""} style="border-color:${r.actif?TH.c1:"#e2e8f0"};background:${r.actif?TH.c1+"15":"#f8fafc"}">${r.actif?"👁":"🚫"}</button>
            </div>
            ${emojiPickerOpen===r.id?`<div class="emoji-picker-grid">${EMOJIS.map(em=>`<button class="emoji-pick-btn${r.icon===em?" sel":""}" onclick="setRubIcon('${r.id}','${em}')">${em}</button>`).join("")}</div>`:""}
          </div>`).join("")}
      </div>
      <div class="panel-footer">
        <button class="btn-reset" onclick="RUBS=JSON.parse(JSON.stringify(DEF_RUBS));emojiPickerOpen=null;renderPanel();renderNav()">↺ Réinitialiser</button>
        <button class="btn-apply" onclick="closePanel();renderNav();renderPage()">Appliquer ✓</button>
      </div>
    </div>
  </div>`;
}
function bindPanel(){
  window.applyPreset=function(i){const p=PRESETS[i];Object.assign(TH,{c1:p.c1,c2:p.c2,sidebar:p.sb,bg:p.bg,card:p.card,txt:p.txt,sand:p.sand});applyTheme();renderNav();renderPanel();};
  window.handleLogo=function(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{TH.logo=ev.target.result;applyTheme();renderPanel();};r.readAsDataURL(f);};
  window.dragStart=function(i){dragIdx=i;};
  window.dragOver=function(e,i){e.preventDefault();if(dragIdx===null||dragIdx===i)return;const sorted=[...RUBS].sort((a,b)=>a.ordre-b.ordre);const[m]=sorted.splice(dragIdx,1);sorted.splice(i,0,m);RUBS=sorted.map((r,idx)=>({...r,ordre:idx}));dragIdx=i;renderPanel();};
  window.dragEnd=function(){dragIdx=null;};
  window.toggleEmojiPicker=function(id){emojiPickerOpen=emojiPickerOpen===id?null:id;renderPanel();};
  window.setRubIcon=function(id,em){RUBS=RUBS.map(r=>r.id===id?{...r,icon:em}:r);emojiPickerOpen=null;renderPanel();};
  window.setRubLabel=function(id,v){RUBS=RUBS.map(r=>r.id===id?{...r,label:v}:r);};
  window.toggleRub=function(id){RUBS=RUBS.map(r=>r.id===id&&r.id!=="db"?{...r,actif:!r.actif}:r);renderPanel();};
}

// ── Sidebar toggle ──────────────────────────────────────────────────────────
function getSidebarW(){return 240;}

function setSidebarVisuals(open){
  const labels=document.querySelectorAll(".sidebar-label");
  const appName=document.getElementById("app-name");
  const appSub=document.getElementById("app-sub");
  const div=document.getElementById("sidebar-divider");
  const logo=document.getElementById("logo-placeholder")||document.getElementById("logo-img");
  const bot=document.getElementById("sidebar-bottom");
  const v=open?"1":"0";
  labels.forEach(l=>{l.style.opacity=v;l.style.maxWidth=open?"200px":"0";});
  if(appName){appName.style.opacity=v;appName.style.maxHeight=open?"40px":"0";}
  if(appSub){appSub.style.opacity=v;appSub.style.maxHeight=open?"30px":"0";}
  if(div)div.style.opacity=v;
  if(logo){logo.style.opacity=v;logo.style.maxHeight=open?"70px":"0";}
  if(bot)bot.style.opacity=v;
}

// Réduction/expansion sur DESKTOP uniquement (bouton ☰ dans la sidebar)
function toggleSidebar(){
  if(window.innerWidth<=768) return;
  document.getElementById("app-screen").classList.toggle("collapsed");
}

// Applique le bon layout selon la largeur d'écran
function applyLayout(){
  const sb=document.getElementById("sidebar");
  const main=document.getElementById("main");
  const app=document.getElementById("app-screen");
  if(window.innerWidth<=768){
    // MOBILE : effacer styles inline, retirer collapsed, laisser le CSS gérer
    sb.style.width="";
    main.style.marginLeft="";
    sb.classList.remove("open");
    if(app)app.classList.remove("collapsed");
    const ov=document.getElementById("sidebar-overlay");
    if(ov)ov.classList.remove("open");
    setSidebarVisuals(true);
  } else {
    // DESKTOP/TABLETTE : effacer les inline pour laisser le CSS gérer
    sb.style.width="";
    main.style.marginLeft="";
  }
}

function initSidebar(){ applyLayout(); }

let resizeTimer=null;
window.addEventListener("resize",function(){
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(applyLayout,150);
});

// Aucune donnée en mémoire tant qu'on ne sait pas quelle entreprise est connectée
const DEF_LISTES={CAT_STOCK:JSON.stringify(CAT_STOCK),CAT_PRODUITS:JSON.stringify(CAT_PRODUITS),UNITES:JSON.stringify(UNITES)};
function viderDonnees(){
  CLIENTS=[];EVENTS=[];STOCK=[];COMMANDES=[];FACTURES=[];FACFOURN=[];TACHES=[];PROSPECTS=[];DEVIS=[];BCCLIENTS=[];
  DOCSHIST=[];CATALOGUE=[];TRANSMISSIONS=[];JOURNAL=[];INTERVENTIONS=[];RAPPRO={};FOURNISSEURS=[];
  CAISSE={mouvements:[],comptages:[]};pipeNextId=10;BANQUE_DATA=null;
  CAT_STOCK=JSON.parse(DEF_LISTES.CAT_STOCK);CAT_PRODUITS=JSON.parse(DEF_LISTES.CAT_PRODUITS);UNITES=JSON.parse(DEF_LISTES.UNITES);
  TH=mergeTH({});RUBS=mergeRubs([]);
}
viderDonnees();
try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}   // ancienne copie commune à tous les comptes
appliquerMetier();

// Vérifier la session Supabase Auth, puis synchroniser (scopé au tenant) avant d'afficher
async function bootApp(){
  if(AD_TEST){ const l=document.getElementById("lien-essai"); if(l) l.href="inscription.html?test"; }
  if(AUTH_LIEN.type==="invite"||AUTH_LIEN.type==="recovery"){ sessionStorage.removeItem("gp_user"); await afficherChoixMdp(); return; }
  if(AUTH_LIEN.mdpOk||AUTH_LIEN.erreur){
    history.replaceState(null,"",location.pathname);
    if(AUTH_LIEN.email) document.getElementById("login-input").value=AUTH_LIEN.email;
    setTimeout(()=>{
      if(AUTH_LIEN.mdpOk){ loginMsg("✓ Mot de passe enregistré. Connectez-vous avec votre nouveau mot de passe.",true); document.getElementById("pwd-input").focus(); }
      else loginMsg("Ce lien n'est plus valable. Touchez « Mot de passe oublié ? » pour en recevoir un nouveau.");
    },50);
  }
  if(checkLogin()){
    // La session sessionStorage existe : on vérifie qu'elle est toujours valide côté Supabase Auth
    const {data:sessionData}=await sbClient.auth.getSession();
    if(!sessionData || !sessionData.session){
      // Session expirée/invalide : retour à l'écran de connexion
      isLoggedIn=false;currentUser=null;CURRENT_TENANT=null;DBWIDGETS=[];dbEditMode=false;
      sessionStorage.removeItem("gp_user");
      document.getElementById("login-screen").style.display="flex";
      document.getElementById("app-screen").style.display="none";
      return;
    }
    document.getElementById("login-screen").style.display="none";
    document.getElementById("app-screen").style.display="flex";
    // Copie locale de CETTE entreprise (hors ligne), puis données du cloud (scopées au tenant courant)
    loadData();appliquerMetier();
    await syncPull();
    if(CLOUD_OK&&hasRole("admin")) loadProfiles().then(syncEquipe);
    applyTheme();
    initSidebar();
    renderNav();
    renderPage();
    verifierMetier();
    // Snapshot quotidien automatique (1 par jour max, en arrière-plan)
    createBackupSnapshot(false);
  } else {
    document.getElementById("login-screen").style.display="flex";
    document.getElementById("app-screen").style.display="none";
  }
  // Mettre à jour le logo de connexion avec le thème synchronisé
  if(TH.logo){
    const ll=document.getElementById("login-logo");
    if(ll)ll.innerHTML=`<img src="${TH.logo}" style="width:60px;height:60px;object-fit:contain;filter:${TH.logoF}"/>`;
  }
}

// Afficher d'abord l'écran de connexion immédiatement (pas d'attente),
// puis synchroniser en arrière-plan
if(checkLogin()){
  document.getElementById("login-screen").style.display="none";
  document.getElementById("app-screen").style.display="flex";
  applyTheme();
  initSidebar();
  renderNav();
  renderPage();
} else {
  document.getElementById("login-screen").style.display="flex";
  document.getElementById("app-screen").style.display="none";
}
if(TH.logo){
  const ll=document.getElementById("login-logo");
  if(ll)ll.innerHTML=`<img src="${TH.logo}" style="width:60px;height:60px;object-fit:contain;filter:${TH.logoF}"/>`;
}
// Puis on synchronise le cloud (récupère les utilisateurs créés ailleurs)
bootApp();
