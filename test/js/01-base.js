// ── Helpers ───────────────────────────────────────────────────────────────────
// ── Utilisateurs ─────────────────────────────────────────────────────────────
// ── Mobile sidebar ───────────────────────────────────────────────────────────
function toggleMobileSidebar(){
  const sb=document.getElementById("sidebar");
  const ov=document.getElementById("sidebar-overlay");
  if(sb.classList.contains("open")){
    sb.classList.remove("open");
    ov.classList.remove("open");
  } else {
    setSidebarVisuals(true);
    sb.classList.add("open");
    ov.classList.add("open");
  }
}
function closeSidebar(){
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("open");
}


// Les comptes vivent dans Supabase Auth + la table profiles.
// PROFILES est un cache local rechargé à l'ouverture des réglages — jamais synchronisé.
let PROFILES=[];
let currentUser=null;
let isLoggedIn=false;

// ── Hiérarchie des rôles : super_admin > admin > user ───────────────────────
const ROLE_RANK={user:1,admin:2,super_admin:3};
// hasRole("admin") est vrai pour un admin ET pour un super_admin
function hasRole(min){
  if(!currentUser) return false;
  return (ROLE_RANK[currentUser.role]||0) >= (ROLE_RANK[min]||99);
}
function roleLabel(r){
  return {super_admin:"Super administrateur",admin:"Administrateur",user:"Utilisateur"}[r]||r||"—";
}

// ── Journal d'activité ──────────────────────────────────────────────────────
let JOURNAL=[];
let INTERVENTIONS=[]; // rapports d'intervention
let RAPPRO={};        // rapprochement bancaire Qonto : idTransaction → document
function logActivity(action,details){
  JOURNAL.unshift({
    id:uid(),
    ts:new Date().toISOString(),
    user:currentUser?currentUser.nom:"Système",
    login:currentUser?(currentUser.login||currentUser.email||"—"):"—",
    action,
    details:details||""
  });
  if(JOURNAL.length>200) JOURNAL=JOURNAL.slice(0,200); // garder les 200 derniers
  saveData();
}

// ── Historique des documents générés (PDF) ──────────────────────────────────
let DOCSHIST=[];
let docsFilter="tous";
const DOC_TYPES={
  devis:  {icon:"📝",lbl:"Devis"},
  facture:{icon:"🧾",lbl:"Facture"},
  bcc:    {icon:"📋",lbl:"BC client"},
  bcf:    {icon:"📦",lbl:"BC fournisseur"},
  intervention:{icon:"🛠️",lbl:"Rapport d'intervention"},
  remise:{icon:"📘",lbl:"Dossier de remise"}
};
function logDocument(type,sourceId,ref,tiers,montant){
  DOCSHIST.unshift({
    id:uid(),
    ts:new Date().toISOString(),
    user:currentUser?currentUser.nom:"Système",
    type,sourceId,
    ref:ref||"",
    tiers:tiers||"",
    montant:montant||0
  });
  if(DOCSHIST.length>300) DOCSHIST=DOCSHIST.slice(0,300); // garder les 300 derniers
  saveData();
}
// Re-générer un document depuis l'historique (si la source existe encore)
function regenDocument(histId){
  const h=DOCSHIST.find(x=>x.id===histId);if(!h)return;
  if(h.type==="facture"){ if(FACTURES.some(f=>f.id===h.sourceId)) return genererFacturePDF(h.sourceId); }
  else if(h.type==="devis"){ if(DEVIS.some(d=>d.id===h.sourceId)) return genererDevisPDF(h.sourceId); }
  else if(h.type==="bcc"){ if(BCCLIENTS.some(b=>b.id===h.sourceId)) return genererBCClientPDF(h.sourceId); }
  else if(h.type==="bcf"){ if(COMMANDES.some(c=>c.id===h.sourceId)) return genererBonCommandePDF(h.sourceId); }
  else if(h.type==="intervention"){ if(INTERVENTIONS.some(r=>r.id===h.sourceId)) return genererRIPDF(h.sourceId); }
  else if(h.type==="remise"){ if(CLIENTS.some(c=>c.id===h.sourceId)) return modalDossierRemise(h.sourceId); }
  alert("Le document d'origine a été supprimé : impossible de le régénérer.");
}

function checkLogin(){
  const saved=sessionStorage.getItem("gp_user");
  if(saved){currentUser=JSON.parse(saved);isLoggedIn=true;loadWidgets();return true;}
  return false;
}
async function loadProfileAndTenant(userId){
  // Récupère le profil (rôle, tenant) et les infos du tenant associé — protégé par RLS
  const {data:profile,error}=await sbClient.from("profiles")
    .select("id,tenant_id,role,nom,actif,tenants(id,nom,plan,statut_abonnement,theme,essai_fin)")
    .eq("id",userId).maybeSingle();
  if(error || !profile) return null;
  return profile;
}

// ── Mot de passe oublié / choix du mot de passe ──
function loginMsg(txt,ok){
  const err=document.getElementById("login-error");if(!err)return;
  err.textContent=txt;err.style.display="block";
  err.style.color=ok?"#15803d":"";err.style.background=ok?"#f0fdf4":"";err.style.borderColor=ok?"#86efac":"";
}
async function motDePasseOublie(){
  const email=(document.getElementById("login-input").value||"").trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ loginMsg("Saisissez d'abord votre adresse e-mail, puis touchez « Mot de passe oublié ? »."); document.getElementById("login-input").focus(); return; }
  loginMsg("Envoi en cours…",true);
  const {error}=await sbClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  // Même message que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites
  if(error&&/rate|limit|seconds/i.test(error.message)) loginMsg("Trop d'e-mails ont été envoyés ces derniers temps. Utilisez le dernier lien reçu, ou réessayez un peu plus tard (jusqu'à une heure).");
  else loginMsg("Si un compte existe pour "+email+", un e-mail vient de vous être envoyé avec un lien pour choisir un nouveau mot de passe. Pensez à regarder dans les courriers indésirables.",true);
}
window.motDePasseOublie=motDePasseOublie;

async function afficherChoixMdp(){
  document.getElementById("login-screen").style.display="flex";
  document.getElementById("app-screen").style.display="none";
  const {data}=await sbClient.auth.getSession();
  const session=data&&data.session;
  const card=document.querySelector("#login-screen .login-card");
  const champ="width:100%;padding:12px 16px;border-radius:11px;border:1.5px solid rgba(26,33,24,0.15);font-size:14px;color:#1A2118;background:#F7F4ED;outline:none;font-family:inherit;box-sizing:border-box;margin-bottom:12px";
  const titre=AUTH_LIEN.type==="invite"?"Bienvenue ! Choisissez votre mot de passe":"Choisissez un nouveau mot de passe";
  if(!session){
    card.innerHTML=`<div style="text-align:center;font-family:'Lora',Georgia,serif;font-size:21px;font-weight:700;margin-bottom:12px">Lien expiré</div>
      <p style="font-size:14px;color:#475569;text-align:center;margin-bottom:18px">Ce lien n'est plus valable (il ne sert qu'une fois et expire au bout de 24 heures). Revenez à la connexion et touchez « Mot de passe oublié ? » pour en recevoir un nouveau.</p>
      <a href="${location.pathname}" style="display:block;text-align:center;padding:13px;border-radius:999px;background:#1A2118;color:#F7F4ED;font-weight:700">Retour à la connexion</a>`;
    return;
  }
  card.innerHTML=`<div style="text-align:center;font-family:'Lora',Georgia,serif;font-size:21px;font-weight:700;margin-bottom:6px">${titre}</div>
    <p style="font-size:13px;color:#64748b;text-align:center;margin-bottom:18px">${pE(session.user.email||"")}</p>
    <input id="mdp1" type="password" placeholder="Nouveau mot de passe (8 caractères minimum)" autocomplete="new-password" style="${champ}"/>
    <input id="mdp2" type="password" placeholder="Confirmez le mot de passe" autocomplete="new-password" style="${champ}" onkeydown="if(event.key==='Enter')enregistrerMdp()"/>
    <div id="mdp-err" style="display:none;color:#991b1b;font-size:12.5px;font-weight:600;margin-bottom:12px;padding:9px 14px;background:#fef2f2;border-radius:9px;border:1px solid #fecaca"></div>
    <button id="mdp-btn" onclick="enregistrerMdp()" style="width:100%;padding:14px;border-radius:999px;border:none;background:#1A2118;color:#F7F4ED;cursor:pointer;font-weight:700;font-size:14.5px;font-family:inherit">Enregistrer mon mot de passe</button>`;
  document.getElementById("mdp1").focus();
}
async function enregistrerMdp(){
  const a=document.getElementById("mdp1").value,b=document.getElementById("mdp2").value;
  const err=document.getElementById("mdp-err"),btn=document.getElementById("mdp-btn");
  const e=m=>{err.textContent="⚠️ "+m;err.style.display="block";btn.disabled=false;btn.textContent="Enregistrer mon mot de passe";};
  if(a.length<8) return e("Le mot de passe doit contenir au moins 8 caractères.");
  if(!/[A-Za-z]/.test(a)||!/[0-9]/.test(a)) return e("Utilisez au moins une lettre et un chiffre.");
  if(a!==b) return e("Les deux mots de passe ne sont pas identiques.");
  btn.disabled=true;btn.textContent="Enregistrement…";
  const {data,error}=await sbClient.auth.updateUser({password:a});
  if(error) return e(/weak|pwned|leaked|compromised/i.test(error.message)?"Ce mot de passe est trop courant ou est apparu dans une fuite de données : choisissez-en un autre.":"Enregistrement impossible : "+error.message);
  const email=(data&&data.user&&data.user.email)||"";
  await sbClient.auth.signOut();
  location.replace(location.pathname+"?mdp=ok&e="+encodeURIComponent(email));
}
window.enregistrerMdp=enregistrerMdp;

async function doLogin(){
  const email=document.getElementById("login-input").value.trim();
  const pwd=document.getElementById("pwd-input").value.trim();
  const err=document.getElementById("login-error");
  err.textContent="Vérification…";err.style.display="block";err.style.color="#64748b";err.style.background="#f1f5f9";err.style.borderColor="#cbd5e1";

  const {data:authData,error:authErr}=await sbClient.auth.signInWithPassword({email,password:pwd});
  if(authErr || !authData || !authData.user){
    err.textContent="Identifiants incorrects";err.style.display="block";err.style.color="";err.style.background="";err.style.borderColor="";
    document.getElementById("pwd-input").value="";
    return;
  }

  const profile=await loadProfileAndTenant(authData.user.id);
  if(!profile || profile.actif===false || !profile.tenant_id){
    err.textContent=!profile?"Compte non configuré, contactez l'administrateur"
      :(profile.actif===false?"Ce compte est désactivé"
      :"Compte non rattaché à une entreprise, contactez l'administrateur");
    err.style.display="block";err.style.color="";err.style.background="";err.style.borderColor="";
    await sbClient.auth.signOut();
    document.getElementById("pwd-input").value="";
    return;
  }
  const T=profile.tenants||{};
  if(T.statut_abonnement==="essai" && T.essai_fin && new Date(T.essai_fin)<new Date()){
    err.textContent="Votre essai gratuit est terminé. Pour continuer avec AD Management et retrouver vos données, contactez-nous : contact@adsecureconcept.fr";
    err.style.display="block";err.style.color="";err.style.background="";err.style.borderColor="";
    await sbClient.auth.signOut();
    return;
  }
  if(profile.tenants && profile.tenants.statut_abonnement==="suspendu"){
    err.textContent="Abonnement suspendu, contactez le support";err.style.display="block";
    await sbClient.auth.signOut();
    return;
  }

  err.style.display="none";err.style.color="";err.style.background="";err.style.borderColor="";
  currentUser={id:profile.id,email,nom:profile.nom,role:profile.role,tenant_id:profile.tenant_id};
  CURRENT_TENANT=profile.tenants||null;
  isLoggedIn=true;
  sessionStorage.setItem("gp_user",JSON.stringify(currentUser));
  logActivity("Connexion","Connexion réussie");
  document.getElementById("login-screen").style.display="none";
  document.getElementById("app-screen").style.display="flex";
  loadData();appliquerMetier();   // uniquement la copie locale de cette entreprise
  applyTheme();
  initSidebar();
  loadWidgets();   // disposition du tableau de bord propre à cet utilisateur
  renderNav();renderPage();
  // Récupérer les données du cloud après connexion
  syncPull().then(ok=>{ if(ok){ applyTheme(); renderNav(); renderPage(); verifierMetier(); if(hasRole("admin")) loadProfiles().then(syncEquipe); } });
}
async function doLogout(){
  logActivity("Déconnexion","");
  saveDataLocal();
  if(syncTimer){ clearTimeout(syncTimer); syncTimer=null; }
  CLOUD_OK=false; CLOUD_TENANT=null;
  await sbClient.auth.signOut();
  viderDonnees();
  isLoggedIn=false;currentUser=null;CURRENT_TENANT=null;DBWIDGETS=[];dbEditMode=false;
  sessionStorage.removeItem("gp_user");
  document.getElementById("app-screen").style.display="none";
  document.getElementById("login-screen").style.display="flex";
  document.getElementById("login-input").value="";
  document.getElementById("pwd-input").value="";
  document.getElementById("login-error").style.display="none";
}

function addDays(d,n){const x=new Date(d+"T00:00:00");x.setDate(x.getDate()+n);return x.toISOString().split("T")[0];}
function getToday(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
const TODAY=getToday();
function daysDiff(s){return Math.ceil((new Date(s+"T00:00:00")-new Date(getToday()+"T00:00:00"))/86400000);}
function fDate(s){return s?new Date(s+"T00:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"short"}):"—";}
function fMoney(n){return (Number(n)||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2});}
function uid(){return Date.now()+Math.random().toString(36).slice(2);}
function getW0(){const d=new Date();const day=d.getDay()===0?6:d.getDay()-1;d.setDate(d.getDate()-day);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
const w0=getW0();

// ── Données ───────────────────────────────────────────────────────────────────
let CLIENTS=[
  {id:"c1",nom:"Dupont Maison",  contact:"Marie Dupont",  tel:"06 11 22 33 44",email:"marie@dupont.fr", status:"relance1",dernCmd:"2025-04-10",ca:4200, cat:"VIP"},
  {id:"c2",nom:"BricoMart SARL",contact:"Paul Lemaire",   tel:"06 98 76 54 32",email:"paul@brico.fr",   status:"actif",   dernCmd:"2025-05-22",ca:12800,cat:"Pro"},
  {id:"c3",nom:"Atelier Léa",   contact:"Léa Martin",    tel:"07 11 22 33 44",email:"lea@atelier.fr",  status:"inactif", dernCmd:"2025-01-15",ca:980,  cat:"Particulier"},
  {id:"c4",nom:"Maison Soleil", contact:"Jean Roux",      tel:"06 55 44 33 22",email:"jean@soleil.fr",  status:"actif",   dernCmd:"2025-05-30",ca:3100, cat:"VIP"},
  {id:"c5",nom:"Studio K",      contact:"Karine Blanc",   tel:"07 66 77 88 99",email:"k@studiok.fr",   status:"relance2",dernCmd:"2025-03-01",ca:640,  cat:"Particulier"},
  {id:"c6",nom:"Déco et Sens",  contact:"Ahmed Benali",   tel:"06 10 20 30 40",email:"ahmed@deco.fr",   status:"actif",   dernCmd:"2025-05-05",ca:7650, cat:"Pro"},
  {id:"c7",nom:"Creativ Home",  contact:"Sophie Girard",  tel:"07 22 33 44 55",email:"sophie@crh.fr",  status:"relance1",dernCmd:"2025-02-20",ca:1500, cat:"Particulier"},
];
let EVENTS=[
  {id:"e1", type:"rdv",        titre:"Présentation catalogue",    client:"Maison Soleil", date:addDays(w0,0),heure:"09:00",notes:""},
  {id:"e2", type:"chantier",   titre:"Pose rayon nouveautés",     client:"BricoMart SARL",date:addDays(w0,0),heure:"14:00",notes:""},
  {id:"e3", type:"rdv",        titre:"Point commande trimestriel",client:"Déco et Sens",  date:addDays(w0,1),heure:"10:30",notes:""},
  {id:"e5", type:"chantier",   titre:"Réaménagement caisse",      client:"BricoMart SARL",date:addDays(w0,2),heure:"07:30",notes:""},
  {id:"e6", type:"rdv",        titre:"Signature contrat annuel",  client:"Atelier Léa",   date:addDays(w0,3),heure:"11:00",notes:""},
  {id:"e8", type:"chantier",   titre:"Installation LED",          client:"Maison Soleil", date:addDays(w0,4),heure:"09:00",notes:""},
  {id:"e9", type:"rdv",        titre:"Suivi SAV",                 client:"Creativ Home",  date:addDays(w0,4),heure:"16:00",notes:""},
  {id:"e10",type:"prospection", titre:"Visite prospect",          client:"—",             date:addDays(w0,1),heure:"08:00",notes:""},
];
let FOURNISSEURS=[
  {id:"f1",nom:"PackPro",     contact:"Marc Dupuis",   tel:"01 23 45 67 89",email:"marc@packpro.fr",  cat:"Emballage",notes:"Livraison 5-7j"},
  {id:"f2",nom:"CleanSup",    contact:"Nadia Ali",     tel:"01 34 56 78 90",email:"nadia@cleansup.fr",cat:"Entretien",notes:""},
  {id:"f3",nom:"OfficeMax",   contact:"Pierre Blanc",  tel:"01 45 67 89 01",email:"p@officemax.fr",   cat:"Bureautique",notes:"Remise 10% >500€"},
  {id:"f4",nom:"LabelFast",   contact:"Julia Torres",  tel:"01 56 78 90 12",email:"j@labelfast.fr",   cat:"Étiquetage",notes:""},
];
let STOCK=[
  {id:"s1", ref:"EMB-001",nom:"Boîtes carton S",    cat:"Emballage",  unite:"unité", qte:340,seuil:100,prix:0.45,four:"PackPro"},
  {id:"s2", ref:"EMB-002",nom:"Boîtes carton M",    cat:"Emballage",  unite:"unité", qte:85, seuil:100,prix:0.72,four:"PackPro"},
  {id:"s3", ref:"EMB-003",nom:"Papier bulle",       cat:"Emballage",  unite:"rouleau",qte:12,seuil:20, prix:8.50,four:"PackPro"},
  {id:"s4", ref:"NET-001",nom:"Spray nettoyant",    cat:"Entretien",  unite:"flacon",qte:6,  seuil:10, prix:3.20,four:"CleanSup"},
  {id:"s5", ref:"NET-002",nom:"Sacs poubelle 100L", cat:"Entretien",  unite:"rouleau",qte:4, seuil:5,  prix:6.80,four:"CleanSup"},
  {id:"s6", ref:"BUR-001",nom:"Ramette papier A4",  cat:"Bureautique",unite:"ramette",qte:22,seuil:10, prix:4.90,four:"OfficeMax"},
  {id:"s7", ref:"BUR-002",nom:"Stylos bille",       cat:"Bureautique",unite:"boîte", qte:3,  seuil:5,  prix:5.50,four:"OfficeMax"},
  {id:"s8", ref:"ETI-001",nom:"Étiquettes prix",    cat:"Étiquetage", unite:"rouleau",qte:18,seuil:10, prix:2.30,four:"LabelFast"},
  {id:"s10",ref:"SAC-001",nom:"Sacs kraft boutique",cat:"Emballage",  unite:"unité", qte:520,seuil:200,prix:0.18,four:"PackPro"},
];
let COMMANDES=[
  {id:"cmd1",ref:"BC-2026-001",four:"PackPro",  date:"2026-05-10",statut:"recue",     lignes:[{ref:"EMB-001",desc:"Boîtes carton S",qte:500,pu:0.45},{ref:"SAC-001",desc:"Sacs kraft boutique",qte:1000,pu:0.18}],notes:""},
  {id:"cmd2",ref:"BC-2026-002",four:"CleanSup", date:"2026-05-28",statut:"envoyee",   lignes:[{ref:"NET-001",desc:"Spray nettoyant",qte:20,pu:3.20},{ref:"NET-002",desc:"Sacs poubelle 100L",qte:5,pu:6.80}],notes:"Livraison souhaitée avant fin de mois"},
  {id:"cmd3",ref:"BC-2026-003",four:"OfficeMax",date:"2026-06-01",statut:"envoyee",   lignes:[{ref:"BUR-001",desc:"Ramette papier A4",qte:20,pu:4.90},{ref:"BUR-002",desc:"Stylos bille",qte:5,pu:5.50}],notes:""},
  {id:"cmd4",ref:"BC-2026-004",four:"PackPro",  date:"2026-06-10",statut:"brouillon", lignes:[{ref:"EMB-002",desc:"Boîtes carton M",qte:200,pu:0.72},{ref:"EMB-003",desc:"Papier bulle",qte:10,pu:8.50}],notes:""},
];
let DEVIS=[
  {id:"d1",clientId:"c2",num:"DEV-2026-001",date:"2026-04-10",validite:"2026-05-10",statut:"accepte",tva:20,notes:"Acompte 30% reçu",lignes:[
    {desc:"Rayonnage métallique 2m",qte:10,pu:650},
    {desc:"Pose et installation",qte:1,pu:4000}
  ]},
  {id:"d2",clientId:"c4",num:"DEV-2026-002",date:"2026-05-01",validite:"2026-06-01",statut:"envoye",tva:20,notes:"",lignes:[
    {desc:"Réaménagement espace accueil",qte:1,pu:2800}
  ]},
  {id:"d3",clientId:"c1",num:"DEV-2026-003",date:"2026-05-15",validite:"2026-06-15",statut:"brouillon",tva:20,notes:"En attente validation",lignes:[
    {desc:"Conception catalogue printemps-été",qte:1,pu:1200}
  ]},
  {id:"d4",clientId:"c6",num:"DEV-2026-004",date:"2026-04-20",validite:"2026-05-20",statut:"refuse",tva:20,notes:"Client demande révision prix",lignes:[
    {desc:"Spots LED encastrables",qte:30,pu:45},
    {desc:"Main d'œuvre installation",qte:1,pu:3150}
  ]},
  {id:"d5",clientId:"c2",num:"DEV-2026-005",date:"2026-06-01",validite:"2026-07-01",statut:"envoye",tva:20,notes:"",lignes:[
    {desc:"Extension rayon nouveautés",qte:1,pu:3200}
  ]},
];
// Helpers de calcul devis
function devisHT(d){return (d.lignes||[]).reduce((s,l)=>s+(l.qte||0)*(l.pu||0),0);}
function devisTVA(d){return devisHT(d)*((d.tva||0)/100);}
function devisTTC(d){return devisHT(d)+devisTVA(d);}

// Bons de commande clients (issus des devis acceptés)
let BCCLIENTS=[];
// ── Transmissions : petites annotations horodatées, liables à un client ───
let TRANSMISSIONS=[];
const TYPES_TRANS={
  note:   {icon:"📝", label:"Note",     bg:"#f1f5f9", col:"#475569"},
  appel:  {icon:"📞", label:"Appel",    bg:"#e0f2fe", col:"#0369a1"},
  visite: {icon:"🏠", label:"Visite",   bg:"#dcfce7", col:"#15803d"},
  mail:   {icon:"✉️", label:"Mail",     bg:"#ede9fe", col:"#6d28d9"},
  relance:{icon:"🔔", label:"Relance",  bg:"#fef3c7", col:"#b45309"},
  sav:    {icon:"🛠️", label:"SAV",      bg:"#fee2e2", col:"#991b1b"}
};
let _transType="note";
let _transClientId="";
let _transFiltre="tous";
function transDuJour(){ return TRANSMISSIONS.filter(t=>(t.date||"").slice(0,10)===getToday()); }
function transDuClient(id){ return TRANSMISSIONS.filter(t=>t.clientId===id).sort((a,b)=>(b.date||"").localeCompare(a.date||"")); }
function fDateHeure(iso){
  if(!iso) return "—";
  const d=new Date(iso);
  if(isNaN(d)) return iso;
  return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit"})+" à "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
}
function addTransmission(texte,clientId,type,important){
  texte=(texte||"").trim();
  if(!texte) return null;
  const t={id:uid(),date:new Date().toISOString(),texte,clientId:clientId||"",type:type||"note",important:!!important};
  TRANSMISSIONS.unshift(t);
  saveData();
  return t;
}
function delTransmission(id){
  confirmDel("Supprimer cette transmission ?",function(){
    TRANSMISSIONS=TRANSMISSIONS.filter(t=>t.id!==id);
    saveData();renderPage();
  });
}
function toggleTransImportant(id){
  const t=TRANSMISSIONS.find(x=>x.id===id);
  if(!t)return;
  t.important=!t.important;
  saveData();renderPage();
}
const ST_BCC={en_cours:["#e8f4f8","#3286A0","Chantier en cours"],livre:["#fef9c3","#a16207","Livré"],facture:["#dcfce7","#15803d","Facturé"]};
function bccPaye(b){ return (b.paiements||[]).reduce((s,p)=>s+(p.montant||0),0); }
function bccReste(b){ return Math.max(0,Math.round((devisTTC(b)-bccPaye(b))*100)/100); }

// Catalogue de produits/prestations réutilisables pour les devis et factures
// Modèle : {id, ref, nom, cat, unite, desc, marque, modele, pa (prix achat HT), pu (prix vente HT), four, photo}
let CAT_PRODUITS=["Caméras","Enregistreurs","Réseau","Câblage","Domotique","Alarme","Main d'œuvre","Autre"];
let CATALOGUE=[
  {id:"cat1",ref:"CAM-4MP-B",nom:"Caméra IP bullet 4MP IR 30m",cat:"Caméras",unite:"unité",desc:"Caméra extérieure IP67, vision nocturne infrarouge 30 m, objectif 2.8 mm.",marque:"Hikvision",modele:"DS-2CD2043G2",pa:98,pu:180,four:"",photo:""},
  {id:"cat2",ref:"CAM-4MP-D",nom:"Caméra IP dôme 4MP IA",cat:"Caméras",unite:"unité",desc:"Dôme intérieur/extérieur avec détection de personnes et véhicules par IA.",marque:"Dahua",modele:"IPC-HDBW3441E",pa:132,pu:240,four:"",photo:""},
  {id:"cat3",ref:"NVR-08",nom:"Enregistreur NVR 8 voies PoE 2 To",cat:"Enregistreurs",unite:"unité",desc:"NVR 8 canaux avec 8 ports PoE intégrés, disque dur 2 To inclus.",marque:"Hikvision",modele:"DS-7608NI",pa:310,pu:540,four:"",photo:""},
  {id:"cat4",ref:"NVR-16",nom:"Enregistreur NVR 16 voies PoE 4 To",cat:"Enregistreurs",unite:"unité",desc:"NVR 16 canaux PoE, 4 To, sortie 4K, accès distant.",marque:"Hikvision",modele:"DS-7616NI",pa:520,pu:890,four:"",photo:""},
  {id:"cat5",ref:"SW-POE8",nom:"Switch PoE+ 8 ports gigabit",cat:"Réseau",unite:"unité",desc:"Switch administrable 8 ports PoE+ 120 W, 2 uplinks gigabit.",marque:"Ubiquiti",modele:"USW-Lite-8-PoE",pa:115,pu:210,four:"",photo:""},
  {id:"cat6",ref:"CBL-C6-305",nom:"Câble réseau Cat6 U/UTP (touret 305 m)",cat:"Câblage",unite:"touret",desc:"Câble cuivre Cat6 pour installation intérieure, touret de 305 m.",marque:"",modele:"",pa:78,pu:145,four:"",photo:""},
  {id:"cat7",ref:"CBL-RJ45",nom:"Connecteur RJ45 Cat6 blindé",cat:"Câblage",unite:"unité",desc:"Connecteur à sertir Cat6 blindé, vendu à l'unité.",marque:"",modele:"",pa:0.55,pu:1.20,four:"",photo:""},
  {id:"cat8",ref:"ALM-KIT",nom:"Centrale d'alarme sans fil (kit complet)",cat:"Alarme",unite:"kit",desc:"Centrale GSM/WiFi, 3 détecteurs de mouvement, 2 contacts d'ouverture, sirène et 2 télécommandes.",marque:"Ajax",modele:"StarterKit Plus",pa:690,pu:1200,four:"",photo:""},
  {id:"cat9",ref:"DOM-INT",nom:"Interrupteur connecté encastré",cat:"Domotique",unite:"unité",desc:"Module WiFi pour pilotage d'éclairage, compatible assistants vocaux.",marque:"Shelly",modele:"Plus 1PM",pa:18,pu:39,four:"",photo:""},
  {id:"cat10",ref:"DOM-PORT",nom:"Motorisation de portail avec contrôle à distance",cat:"Domotique",unite:"unité",desc:"Kit de motorisation battant avec module de commande à distance.",marque:"",modele:"",pa:480,pu:850,four:"",photo:""},
  {id:"cat11",ref:"MO-INST",nom:"Main d'œuvre installation (heure)",cat:"Main d'œuvre",unite:"heure",desc:"Pose, câblage et mise en service par technicien qualifié.",marque:"",modele:"",pa:28,pu:55,four:"",photo:""},
  {id:"cat12",ref:"MO-CONF",nom:"Configuration et paramétrage système",cat:"Main d'œuvre",unite:"forfait",desc:"Paramétrage du NVR, des accès distants, des comptes et des notifications.",marque:"",modele:"",pa:90,pu:250,four:"",photo:""},
  {id:"cat13",ref:"MO-DEPL",nom:"Déplacement et étude technique",cat:"Main d'œuvre",unite:"forfait",desc:"Visite sur site, relevé des besoins et préconisation d'implantation.",marque:"",modele:"",pa:40,pu:120,four:"",photo:""},
];
// Normalise un produit (compatibilité avec les anciens catalogues {id,nom,pu})
function normProduit(p){
  return {id:p.id||uid(),ref:p.ref||"",nom:p.nom||"",cat:p.cat||"Autre",unite:p.unite||"unité",
    desc:p.desc||"",marque:p.marque||"",modele:p.modele||"",
    pa:Number(p.pa)||0,pu:Number(p.pu)||0,four:p.four||"",photo:p.photo||""};
}
function migrerCatalogue(){ CATALOGUE=(CATALOGUE||[]).map(normProduit); }
// Marge unitaire en euros et en %
function prodMarge(p){ return (Number(p.pu)||0)-(Number(p.pa)||0); }
function prodMargePct(p){ const pu=Number(p.pu)||0; return pu>0?((pu-(Number(p.pa)||0))/pu*100):0; }
function margeBadge(p){
  const m=prodMarge(p), pct=prodMargePct(p);
  if(!p.pa) return `<span style="font-size:11px;color:#94a3b8">marge n.c.</span>`;
  const col = pct>=40?"#15803d":(pct>=20?"#b45309":"#991b1b");
  const bg  = pct>=40?"#f0fdf4":(pct>=20?"#fffbeb":"#fef2f2");
  return `<span style="font-size:11px;font-weight:700;color:${col};background:${bg};padding:2px 7px;border-radius:6px">+${fMoney(m)} · ${pct.toFixed(0)}%</span>`;
}

let FACTURES=[
  {id:"fac1",num:"FAC-2026-001",client:"BricoMart SARL",clientId:"c2",ech:"2026-05-15",statut:"retard",tva:20,lignes:[{desc:"Rayonnage métallique 2m",qte:4,pu:650},{desc:"Pose et installation",qte:1,pu:600}]},
  {id:"fac2",num:"FAC-2026-002",client:"Maison Soleil",clientId:"c4",ech:"2026-06-01",statut:"envoyee",tva:20,lignes:[{desc:"Réaménagement espace accueil",qte:1,pu:1850}]},
  {id:"fac3",num:"FAC-2026-003",client:"Déco et Sens",clientId:"c6",ech:"2026-06-10",statut:"envoyee",tva:20,lignes:[{desc:"Spots LED encastrables",qte:30,pu:45},{desc:"Main d'œuvre (heure)",qte:60,pu:55}]},
  {id:"fac4",num:"FAC-2026-004",client:"Dupont Maison",clientId:"c1",ech:"2026-05-01",statut:"payee",tva:20,lignes:[{desc:"Conception catalogue",qte:1,pu:980}]},
  {id:"fac5",num:"FAC-2026-005",client:"Studio K",clientId:"",ech:"2026-07-01",statut:"brouillon",tva:20,lignes:[{desc:"Prestation",qte:1,pu:560}]},
  {id:"fac6",num:"FAC-2026-006",client:"Atelier Léa",clientId:"",ech:"2026-01-12",statut:"payee",tva:20,lignes:[{desc:"Aménagement",qte:1,pu:2000}]},
  {id:"fac7",num:"FAC-2026-007",client:"BricoMart SARL",clientId:"c2",ech:"2026-02-08",statut:"payee",tva:20,lignes:[{desc:"Équipement sécurité",qte:1,pu:3417}]},
  {id:"fac8",num:"FAC-2026-008",client:"Maison Soleil",clientId:"c4",ech:"2026-03-20",statut:"payee",tva:20,lignes:[{desc:"Installation rayonnage",qte:1,pu:2667}]},
  {id:"fac9",num:"FAC-2026-009",client:"Déco et Sens",clientId:"c6",ech:"2026-04-15",statut:"payee",tva:20,lignes:[{desc:"Éclairage LED complet",qte:1,pu:4833}]},
  {id:"fac10",num:"FAC-2026-010",client:"Studio K",clientId:"",ech:"2026-06-05",statut:"payee",tva:20,lignes:[{desc:"Extension rayon",qte:1,pu:2458}]},
];
// Helpers de calcul facture (compatibles avec anciennes factures à montant global)
// Prochain numéro de document : plus grand numéro de l'année + 1 (jamais de doublon, même après une suppression)
function prochainNumero(prefixe,liste){
  const an=new Date().getFullYear(), re=new RegExp("^"+prefixe+"-"+an+"-(\\d+)$");
  const max=(liste||[]).reduce((m,x)=>{const r=re.exec(String(x.num||"").trim());return r?Math.max(m,Number(r[1])):m;},0);
  return prefixe+"-"+an+"-"+String(max+1).padStart(3,"0");
}
// Date d'émission d'une facture (anciennes factures sans date : estimée à 30 jours avant l'échéance)
function facDate(f){ return f.date||(f.ech?addDays(f.ech,-30):""); }
// Date de démarrage de la comptabilité (Réglages) : ce qui est antérieur est ignoré dans les chiffres
function comptaDepuis(){ return (typeof TH!=="undefined"&&TH&&TH.compteDepuis)||""; }
function dateEnCompta(d){ const dd=comptaDepuis(); return !dd||!d||String(d).slice(0,10)>=dd; }
function facEnCompta(f){ return dateEnCompta(facDate(f)); }
// Taux de TVA par défaut des ventes (Martinique : 8,5 %)
const TVA_DEFAUT=8.5;
function fTaux(t){ return String(Number(t)||0).replace(".",",")+" %"; }
function facTauxTVA(f){ return (f.tva!==undefined&&f.tva!==null)?f.tva:TVA_DEFAUT; }
function facHT(f){
  if(f.lignes&&f.lignes.length) return f.lignes.reduce((s,l)=>s+(l.qte||0)*(l.pu||0),0);
  return Math.round((f.ttc||0)/(1+(facTauxTVA(f)/100))*100)/100; // rétrocompat : déduit le HT du TTC (au centime)
}
function facTVA(f){ return facHT(f)*(facTauxTVA(f)/100); }
function facTTC(f){
  if(f.lignes&&f.lignes.length) return facHT(f)+facTVA(f);
  return f.ttc||0; // ancienne facture : on garde le ttc stocké
}
// Helpers paiements
function facPaye(f){ return (f.paiements||[]).reduce((s,p)=>s+(p.montant||0),0); }
function facReste(f){ return Math.max(0,Math.round((facTTC(f)-facPaye(f))*100)/100); }
function facEstPayee(f){ return facReste(f)<=0 && facTTC(f)>0; }
// Détermine le statut réel d'une facture selon ses paiements et son échéance
function facStatutReel(f){
  if(f.statut==="brouillon"||f.statut==="annulee") return f.statut;
  if(facEstPayee(f)||f.statut==="payee") return "payee"; // « Payée » choisi à la main = réglée
  if(facPaye(f)>0) return "partiel";
  if(f.ech && f.ech<getToday()) return "retard";
  return "envoyee";
}
let TACHES=[
  {id:"t1",titre:"Déclarer TVA T2 2026",       ech:addDays(TODAY,5), prio:"haute",  done:false,notes:"Via impots.gouv"},
  {id:"t2",titre:"Renouveler assurance RC Pro", ech:addDays(TODAY,30),prio:"haute",  done:false,notes:"Contacter AXA"},
  {id:"t3",titre:"Envoyer FAC-2026-005",        ech:addDays(TODAY,2), prio:"moyenne",done:false,notes:""},
  {id:"t4",titre:"Relancer BricoMart",          ech:addDays(TODAY,0), prio:"haute",  done:false,notes:"2ème relance"},
  {id:"t5",titre:"Archiver documents Q1",       ech:addDays(TODAY,14),prio:"basse",  done:false,notes:""},
  {id:"t7",titre:"Mettre à jour CGV",           ech:addDays(TODAY,45),prio:"basse",  done:true, notes:"Fait par le cabinet"},
];

// ── PIPELINE PROSPECTS ────────────────────────────────────────────────────────
const PIPE_STAGES=[
  {id:"contact",    label:"Contact initial",   color:"#95a5a6"},
  {id:"qualif",     label:"Qualification",     color:"#3286A0"},
  {id:"proposition",label:"Proposition",       color:"#299AC3"},
  {id:"nego",       label:"Négociation",       color:"#e67e22"},
  {id:"gagne",      label:"Gagné ✓",           color:"#27ae60"},
  {id:"perdu",      label:"Perdu ✗",           color:"#c0392b"},
];
let PROSPECTS=[
  {id:"p1",name:"Sophie Renard",   company:"Bijouterie Renard",   email:"sophie@bijoux.fr",    phone:"06 12 34 56 78",amount:3200,temp:"chaud",stage:"qualif",    date:addDays(TODAY,6), notes:"Intéressée par notre offre premium. Rappeler lundi matin."},
  {id:"p2",name:"Marc Lefèvre",    company:"Agence Lumière",      email:"marc@lumiere.com",    phone:"07 00 11 22 33",amount:1500,temp:"tiede",stage:"contact",   date:addDays(TODAY,13),notes:"Premier contact par email. À relancer."},
  {id:"p3",name:"Clara Morin",     company:"Studio Clar",         email:"clara@studio.fr",     phone:"06 55 44 33 22",amount:4800,temp:"chaud",stage:"proposition",date:addDays(TODAY,3), notes:"Devis envoyé. En attente de validation."},
  {id:"p4",name:"Paul Girard",     company:"",                    email:"paul.girard@mail.fr", phone:"",              amount:800, temp:"froid",stage:"contact",   date:addDays(TODAY,23),notes:"Prospect froid. Garder dans le radar."},
  {id:"p5",name:"Nadia Bouzid",    company:"Nadia B. Conseil",    email:"nadia@conseil.fr",    phone:"06 78 90 12 34",amount:6000,temp:"chaud",stage:"nego",      date:addDays(TODAY,1), notes:"Négociation avancée. Accord verbal probable."},
  {id:"p6",name:"Antoine Vidal",   company:"Vidal & Fils",        email:"",                    phone:"04 91 00 00 00",amount:2200,temp:"tiede",stage:"gagne",     date:"",               notes:"Contrat signé."},
  {id:"p7",name:"Lucie Perrin",    company:"L'Atelier Perrin",    email:"lucie@atelier.fr",    phone:"06 33 22 11 00",amount:950, temp:"froid",stage:"perdu",     date:"",               notes:"N'avait pas le budget. Recontacter en septembre."},
];
let pipeNextId=10;
let pipeDragId=null;
let pipeSearch="";

// ── Thème & rubriques ─────────────────────────────────────────────────────────
let TH={nom:"Mon entreprise",sous:"",c1:"#475569",c2:"#64748b",sidebar:"#0f172a",bg:"#f1f5f9",card:"#ffffff",txt:"#0f172a",sand:"#e2e8f0",police:"Inter",logo:"",logoF:"none",adresse:"",email:"",tel:"",siret:"",tvaIntra:"",mentionsLegales:"",site:"",
  // Paramètres spécifiques au contrat de maintenance vidéosurveillance
  contratSiege:"",
  contratSiren:"",
  contratRepresentant:"",
  contratQualite:"",
  contratDelaiBloquant:"48 heures ouvrées",
  contratDelaiPartiel:"5 jours ouvrés",
  contratTribunal:"",
  contratMediateur:"",
  contratIndemnitePart:20,
  contratTexteL215:"",
  contratForfaits:[
    {id:"essentiel",label:"Essentiel",min:1,max:4,prix:35},
    {id:"standard", label:"Standard", min:5,max:8,prix:55},
    {id:"premium",  label:"Premium",  min:9,max:16,prix:85},
  ],
};
let RUBS=[
  {id:"db",       label:"Tableau de bord",  icon:"🏠",actif:true, ordre:0},
  {id:"clients",  label:"Clients",          icon:"👥",actif:true, ordre:1},
  {id:"pipeline", label:"Pipeline",         icon:"🎯",actif:true, ordre:2},
  {id:"devis",    label:"Devis",            icon:"📝",actif:true, ordre:3},
  {id:"plan",     label:"Planning",         icon:"📅",actif:true, ordre:4},
  {id:"interventions",label:"Interventions", icon:"🛠️",actif:true, ordre:4.5},
  {id:"stock",    label:"Commandes & Stock",icon:"📦",actif:true, ordre:5},
  {id:"admin",    label:"Administration",   icon:"🗂️",actif:true, ordre:6},
  {id:"factures", label:"Factures",         icon:"🧾",actif:true, ordre:6.5},
  {id:"banque",   label:"Banque",           icon:"🏦",actif:true, ordre:6.8},
  {id:"caisse",   label:"Caisse",           icon:"💶",actif:true, ordre:6.9},
  {id:"stats",    label:"Statistiques",     icon:"📊", actif:true, ordre:7},
];
const DEF_TH={...TH};
// Profil AD Secure Concept : complète les réglages de ce compte s'il en manque (aucun effet sur les autres entreprises)
const ADS_TH={metier:"securite",nom:"AD Secure",sous:"Concept",c1:"#3286A0",c2:"#299AC3",sidebar:"#1A2118",bg:"#F7F4ED",card:"#FFFFFF",txt:"#1A2118",sand:"#DED3BC",site:"index.html",
  contratSiege:"Quartier Bellay, 97228 Sainte-Luce, Martinique",contratSiren:"108 443 326",contratRepresentant:"Adeline LOSTAU",contratQualite:"Présidente",contratTribunal:"Fort-de-France",horaires:"Lun, mar, jeu 8h30–16h · mer, ven 8h30–13h30",
  sigMail:{actif:true,nom:"Adeline LOSTAU",poste:"Présidente",societe:"AD Secure Concept",tel1:"0696 43 95 84",tel2:"0696 34 23 04",email:"contact@adsecureconcept.fr",site:"www.adsecureconcept.fr",adresse:"Quartier Bellay, 97228 Sainte-Luce, Martinique",logoUrl:"https://www.adsecureconcept.fr/logo.png",slogan:"Vidéosurveillance · IA"},
  sigMailUsers:{"8d0d5004-4a33-46da-8b0f-76e97be2894c":{nom:"Daniel VICTORNI",poste:"Directeur",tel1:"0696 43 95 84",tel2:"",email:""},
    "f9d1e601-8ef2-4371-bd02-8c0592870672":{nom:"Adeline LOSTAU",poste:"Présidente",tel1:"0696 34 23 04",tel2:"",email:""}}};
function isADS(t){return /^AD\s*Secure/i.test((t&&t.nom)||"");}
function mergeTH(saved){
  const t=Object.assign({},DEF_TH,isADS(saved)?ADS_TH:{},saved);
  // Ancienne accroche de signature : « Domotique » retiré
  if(t.sigMail&&t.sigMail.slogan==="Vidéosurveillance · IA · Domotique") t.sigMail={...t.sigMail,slogan:"Vidéosurveillance · IA"};
  return t;
}
function resetThemeColors(){const d=mergeTH({nom:TH.nom});["c1","c2","sidebar","bg","card","txt","sand","police","logoF"].forEach(k=>TH[k]=d[k]);applyTheme();renderNav();renderPanel();}
function thLogo(){return TH.logo||(isADS(TH)?"logo.png":"");}
const DEF_RUBS=JSON.parse(JSON.stringify(RUBS));

// Fusionne les rubriques sauvegardées avec celles du code :
// garde les personnalisations existantes, ajoute les nouvelles rubriques manquantes
function mergeRubs(savedRubs){
  if(!Array.isArray(savedRubs)||savedRubs.length===0) return JSON.parse(JSON.stringify(DEF_RUBS));
  const result=savedRubs.map(r=>({...r}));
  DEF_RUBS.forEach(defRub=>{
    if(!result.some(r=>r.id===defRub.id)){
      result.push({...defRub}); // rubrique nouvelle (ex: Devis) → on l'ajoute
    }
  });
  return result;
}

// ══════════════════════════════════════════════════════════
// ── PWA : Manifest + Service Worker en ligne (sans fichier) ─
// ══════════════════════════════════════════════════════════
(function setupPWA(){
  try{
    // Manifest généré dynamiquement (data URL)
    const manifest={
      name:"AD Management",
      short_name:"AD Management",
      description:"AD Management — logiciel de gestion",
      start_url:".",
      display:"standalone",
      background_color:"#1A2118",
      theme_color:"#1A2118",
      orientation:"any",
      icons:[
        {src:"logo.png",sizes:"192x192",type:"image/png",purpose:"any maskable"},
        {src:"logo.png",sizes:"512x512",type:"image/png",purpose:"any maskable"}
      ]
    };
    const blob=new Blob([JSON.stringify(manifest)],{type:"application/json"});
    const link=document.createElement("link");
    link.rel="manifest";
    link.href=URL.createObjectURL(blob);
    document.head.appendChild(link);

    // Service worker minimal (cache de l'app pour fonctionnement hors-ligne)
    if("serviceWorker" in navigator){
      const swCode=`
        const CACHE="adsecure-v1";
        self.addEventListener("install",e=>{self.skipWaiting();});
        self.addEventListener("activate",e=>{e.waitUntil(clients.claim());});
        self.addEventListener("fetch",e=>{
          if(e.request.method!=="GET")return;
          e.respondWith(
            fetch(e.request).then(res=>{
              const copy=res.clone();
              caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
              return res;
            }).catch(()=>caches.match(e.request))
          );
        });
      `;
      const swBlob=new Blob([swCode],{type:"application/javascript"});
      const swUrl=URL.createObjectURL(swBlob);
      navigator.serviceWorker.register(swUrl).catch(err=>console.warn("SW non enregistré:",err));
    }
  }catch(e){ console.warn("PWA setup échec:",e); }
})();


// ── Version de test : activée quand la page s'appelle test*.html ──
// Elle lit et écrit dans app_data_test (copie séparée), jamais dans les vraies données.
const AD_TEST=/\/test[^/]*\.html$/i.test(location.pathname);
const DATA_TABLE=AD_TEST?"app_data_test":"app_data";
function testBloque(quoi){
  if(!AD_TEST) return false;
  alert("🧪 Version de test : "+quoi+" est désactivé ici pour ne pas toucher aux vraies données ni écrire à de vrais clients.");
  return true;
}
// Lien reçu par e-mail (invitation ou mot de passe oublié) : lu avant que Supabase ne l'efface
const AUTH_LIEN=(function(){
  const h=new URLSearchParams((location.hash||"").replace(/^#/,""));
  const q=new URLSearchParams(location.search);
  return {type:h.get("type")||"",erreur:h.get("error_description")||q.get("error_description")||"",mdpOk:q.get("mdp")==="ok",email:q.get("e")||""};
})();
const SUPABASE_URL="https://tcszogqlvqpxrtdirkto.supabase.co";
const SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjc3pvZ3FsdnFweHJ0ZGlya3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzQ0MzMsImV4cCI6MjEwNTc1MDQzM30.nw3AhyUqsvlvYSDQCzx8eLFBMIvK2I1QUtgFD-t7Qyo";
const sbClient=supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
let CURRENT_TENANT=null; // {id, nom, plan, statut_abonnement, theme, ...}
let syncStatus="idle"; // idle | syncing | ok | error | offline
let syncTimer=null;

const STORAGE_KEY=AD_TEST?"adsecure_data_test_v1":"adsecure_data_v1"; // ancienne clé commune (purgée au démarrage)
// Copie locale propre à chaque entreprise : jamais partagée entre deux comptes sur le même appareil
function cleLocale(){ return (currentUser&&currentUser.tenant_id)?STORAGE_KEY+"_"+currentUser.tenant_id:null; }
function saveDataLocal(){
  try{
    const k=cleLocale(); if(!k) return;
    localStorage.setItem(k, JSON.stringify({...getDataObject()}));
  }catch(e){ console.warn("Sauvegarde locale impossible:", e); }
}

// Fournisseurs : enregistrés avec les données. Anciennes données (liste jamais sauvegardée) :
// on reconstitue la liste à partir des bons de commande et des factures reçues.
function chargerFournisseurs(d){
  if(Array.isArray(d.FOURNISSEURS)){ FOURNISSEURS=d.FOURNISSEURS; return; }
  const noms=[];
  [...(d.COMMANDES||[]),...(d.FACFOURN||[])].forEach(x=>{const n=(x&&x.four||"").trim();if(n&&!noms.some(m=>m.toLowerCase()===n.toLowerCase()))noms.push(n);});
  FOURNISSEURS=noms.map((n,i)=>({id:"f"+Date.now().toString(36)+i,nom:n,contact:"",tel:"",email:"",cat:"",notes:""}));
}
function getDataObject(){
  return {
    CLIENTS, EVENTS, STOCK, COMMANDES, FACTURES, FACFOURN, TACHES, PROSPECTS, DEVIS, BCCLIENTS, DOCSHIST, CATALOGUE, CAT_PRODUITS, CAT_STOCK, UNITES, TRANSMISSIONS,
    TH, RUBS, pipeNextId, JOURNAL, CAISSE, INTERVENTIONS, RAPPRO, FOURNISSEURS
  };
}
function applyDataObject(d){
  if(!d) return;
  // Les données reçues REMPLACENT tout : rien de l'entreprise précédente ne doit subsister
  viderDonnees();
  if(d.CLIENTS) CLIENTS=d.CLIENTS;
  if(d.EVENTS) EVENTS=d.EVENTS;
  if(d.STOCK) STOCK=d.STOCK;
  if(d.COMMANDES) COMMANDES=d.COMMANDES;
  if(d.FACTURES) FACTURES=d.FACTURES;
  if(d.FACFOURN && Array.isArray(d.FACFOURN)) FACFOURN=d.FACFOURN;
  chargerFournisseurs(d);
  if(d.TACHES) TACHES=d.TACHES;
  if(d.PROSPECTS) PROSPECTS=d.PROSPECTS;
  if(d.DEVIS) DEVIS=d.DEVIS;
  if(d.BCCLIENTS) BCCLIENTS=d.BCCLIENTS;
  if(d.DOCSHIST && Array.isArray(d.DOCSHIST)) DOCSHIST=d.DOCSHIST;
  if(d.TRANSMISSIONS && Array.isArray(d.TRANSMISSIONS)) TRANSMISSIONS=d.TRANSMISSIONS;
  if(d.CATALOGUE) CATALOGUE=d.CATALOGUE.map(normProduit);
  if(d.CAT_STOCK && Array.isArray(d.CAT_STOCK) && d.CAT_STOCK.length) CAT_STOCK=d.CAT_STOCK;
  if(d.CAT_PRODUITS && Array.isArray(d.CAT_PRODUITS) && d.CAT_PRODUITS.length) CAT_PRODUITS=d.CAT_PRODUITS;
  if(d.UNITES && Array.isArray(d.UNITES) && d.UNITES.length) UNITES=d.UNITES;
  if(d.TH) TH=mergeTH(d.TH);
  if(d.RUBS) RUBS=mergeRubs(d.RUBS);
  if(typeof d.pipeNextId==="number") pipeNextId=d.pipeNextId;
  if(d.JOURNAL && Array.isArray(d.JOURNAL)) JOURNAL=d.JOURNAL;
  if(d.CAISSE && typeof d.CAISSE==="object") CAISSE=d.CAISSE;
  if(d.INTERVENTIONS && Array.isArray(d.INTERVENTIONS)) INTERVENTIONS=d.INTERVENTIONS;
  if(d.RAPPRO && typeof d.RAPPRO==="object") RAPPRO=d.RAPPRO;
  appliquerMetier();
}

function setSyncBadge(status){
  syncStatus=status;
  const b=document.getElementById("sync-badge");
  if(!b) return;
  const map={
    syncing:{t:"⟳ Synchro…",c:"#b45309",bg:"#fffbeb",bd:"#fcd34d"},
    ok:{t:"☁️ Synchronisé",c:"#15803d",bg:"#f0fdf4",bd:"#86efac"},
    error:{t:"⚠️ Erreur synchro",c:"#991b1b",bg:"#fef2f2",bd:"#fca5a5"},
    offline:{t:"📴 Hors-ligne",c:"#64748b",bg:"#f1f5f9",bd:"#cbd5e1"},
    idle:{t:"☁️ Cloud",c:"#64748b",bg:"#f1f5f9",bd:"#cbd5e1"}
  };
  const s=map[status]||map.idle;
  b.textContent=s.t; b.style.color=s.c; b.style.background=s.bg; b.style.borderColor=s.bd;
}

// Envoyer les données vers Supabase (scopé au tenant courant, protégé par RLS)
// Vrai seulement quand les données de l'entreprise connectée ont bien été lues en ligne :
// tant que ce n'est pas le cas, on n'envoie rien (évite d'écraser les données en ligne avec une mémoire vide)
let CLOUD_OK=false, CLOUD_TENANT=null;
async function syncPush(){
  if(!currentUser || !currentUser.tenant_id){ setSyncBadge("error"); return false; }
  if(!CLOUD_OK || CLOUD_TENANT!==currentUser.tenant_id){ setSyncBadge("error"); return false; }
  setSyncBadge("syncing");
  try{
    const {data:upd,error}=await sbClient.from(DATA_TABLE)
      .update({data:getDataObject(),updated_at:new Date().toISOString()})
      .eq("tenant_id",currentUser.tenant_id)
      .select("tenant_id");
    if(error){ console.warn("Sync push échec:",error); setSyncBadge("error"); return false; }
    // Aucune ligne existante (nouveau projet) → on la crée
    if(!upd || upd.length===0){
      const ins=await syncInsert();
      if(!ins){ setSyncBadge("error"); return false; }
    }
    setSyncBadge("ok");
    return true;
  }catch(e){
    console.warn("Sync push échec:",e);
    setSyncBadge("offline");
    return false;
  }
}
async function syncInsert(){
  if(!currentUser || !currentUser.tenant_id) return false;
  const {error}=await sbClient.from(DATA_TABLE).insert({
    tenant_id:currentUser.tenant_id,
    data:getDataObject(),
    updated_at:new Date().toISOString()
  });
  return !error;
}

// Récupérer les données depuis Supabase (scopé au tenant courant)
async function syncPull(){
  if(!currentUser || !currentUser.tenant_id){ setSyncBadge("error"); return false; }
  CLOUD_OK=false; CLOUD_TENANT=null;
  const tenantVise=currentUser.tenant_id;
  setSyncBadge("syncing");
  try{
    const {data:rows,error}=await sbClient.from(DATA_TABLE)
      .select("data")
      .eq("tenant_id",currentUser.tenant_id)
      .maybeSingle();
    if(error){setSyncBadge("error");return false;}
    if(!currentUser || currentUser.tenant_id!==tenantVise) return false; // changement de compte entre-temps
    if(rows && rows.data){
      applyDataObject(rows.data);
      CLOUD_OK=true; CLOUD_TENANT=tenantVise;
      await syncRelancesLog();
      saveDataLocal();
      setSyncBadge("ok");
      return true;
    }
    // Version de test vide → on part d'une copie des vraies données de CETTE entreprise
    if(AD_TEST && await copierVraiesDonneesVersTest(false)){ CLOUD_OK=true; CLOUD_TENANT=tenantVise; setSyncBadge("ok"); return true; }
    // Aucune donnée en ligne → on crée la ligne de cette entreprise avec ses données locales
    CLOUD_OK=true; CLOUD_TENANT=tenantVise;
    await syncInsert();
    setSyncBadge("ok");
    return true;
  }catch(e){
    console.warn("Sync pull échec:",e);
    setSyncBadge("offline");
    return false;
  }
}

// Version de test : remplace les données de test par une copie des vraies données
async function copierVraiesDonneesVersTest(demander){
  if(!AD_TEST||!currentUser||!currentUser.tenant_id) return false;
  if(demander&&!confirm("Remplacer toutes les données de test par une copie des vraies données actuelles ?\n\nLes essais faits dans la version de test seront effacés. Les vraies données ne sont pas modifiées.")) return false;
  const {data:vrai,error}=await sbClient.from("app_data").select("data").eq("tenant_id",currentUser.tenant_id).maybeSingle();
  if(error||!vrai||!vrai.data){ if(demander) alert("Impossible de lire les vraies données."); return false; }
  const {error:e2}=await sbClient.from("app_data_test").upsert({tenant_id:currentUser.tenant_id,data:vrai.data,updated_at:new Date().toISOString()});
  if(e2){ if(demander) alert("Copie impossible : "+e2.message); return false; }
  applyDataObject(vrai.data); saveDataLocal();
  if(demander){ applyTheme(); renderNav(); renderPage(); alert("✓ Données de test remplacées par une copie des vraies données."); }
  return true;
}
window.copierVraiesDonneesVersTest=copierVraiesDonneesVersTest;

// Synchro manuelle complète (pull puis re-render)
async function manualSync(){
  const ok=await syncPull();
  if(ok){ applyTheme(); renderNav(); renderPage(); }
  else { alert("Synchronisation impossible. Vérifiez votre connexion internet."); }
}

// ══════════════════════════════════════════════════════════
// ── SAUVEGARDES DATÉES (historique versionné Supabase) ─────
// ══════════════════════════════════════════════════════════
const BACKUP_KEEP=30; // nombre de sauvegardes conservées

// Toutes les requêtes passent par sbClient : le JWT de session est utilisé,
// jamais la clé anon. Les données restent cloisonnées par tenant via RLS.

// Liste les sauvegardes (date desc), sans le champ data (léger)
async function listBackups(){
  try{
    if(!currentUser||!currentUser.tenant_id) return [];
    const {data,error}=await sbClient.from("app_backups")
      .select("id,created_at,label")
      .eq("tenant_id",currentUser.tenant_id)
      .order("created_at",{ascending:false});
    if(error){ console.warn("listBackups échec:",error); return []; }
    return data||[];
  }catch(e){ console.warn("listBackups échec:",e); return []; }
}

// Crée un snapshot horodaté (1 par jour max sauf si force=true)
async function createBackupSnapshot(force,label){
  if(AD_TEST) return false;
  try{
    if(!currentUser||!currentUser.tenant_id) return false;
    const existing=await listBackups();
    if(!force && existing.length>0){
      const lastDay=(existing[0].created_at||"").split("T")[0];
      if(lastDay===getToday()) return false; // déjà une sauvegarde aujourd'hui
    }
    const {error}=await sbClient.from("app_backups").insert({
      tenant_id:currentUser.tenant_id,
      data:getDataObject(),
      label:label||(force?"Manuelle":"Automatique")
    });
    if(error){ console.warn("createBackupSnapshot échec:",error); return false; }
    // Purge : ne garder que les BACKUP_KEEP plus récentes
    await purgeOldBackups();
    return true;
  }catch(e){ console.warn("createBackupSnapshot échec:",e); return false; }
}

// Supprime les sauvegardes au-delà des BACKUP_KEEP plus récentes
async function purgeOldBackups(){
  try{
    const all=await listBackups();
    if(all.length<=BACKUP_KEEP) return;
    const ids=all.slice(BACKUP_KEEP).map(b=>b.id); // les plus anciennes
    if(!ids.length) return;
    const {error}=await sbClient.from("app_backups").delete().in("id",ids);
    if(error) console.warn("purgeOldBackups échec:",error);
  }catch(e){ console.warn("purgeOldBackups échec:",e); }
}

// Récupère le contenu complet d'une sauvegarde
async function fetchBackupData(id){
  try{
    const {data,error}=await sbClient.from("app_backups")
      .select("data")
      .eq("id",id)
      .maybeSingle();
    if(error){ console.warn("fetchBackupData échec:",error); return null; }
    return data?data.data:null;
  }catch(e){ console.warn("fetchBackupData échec:",e); return null; }
}

// Restaure une sauvegarde (admin uniquement)
async function restoreBackup(id){
  if(testBloque("la restauration de sauvegarde")) return;
  if(!hasRole("admin")){alert("Action réservée aux administrateurs.");return;}
  const data=await fetchBackupData(id);
  if(!data){alert("Impossible de récupérer cette sauvegarde.");return;}
  // Filet de sécurité : snapshot de l'état courant AVANT de remplacer
  await createBackupSnapshot(true,"Avant restauration");
  applyDataObject(data);
  saveDataLocal();
  await syncPush(); // pousse l'état restauré vers app_data
  logActivity("Restauration sauvegarde","Sauvegarde #"+id+" restaurée");
  closePanel();
  applyTheme();renderNav();renderPage();
  alert("✓ Sauvegarde restaurée avec succès.");
}

function saveData(){
  // 1. Sauvegarde locale immédiate (toujours, même hors-ligne)
  saveDataLocal();
  // 2. Synchro Supabase différée (regroupe les modifications rapprochées)
  if(syncTimer) clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>{ syncPush(); }, 1500);
}

function loadData(){
  try{
    viderDonnees();
    const k=cleLocale(); if(!k) return;
    const raw=localStorage.getItem(k);
    if(!raw) return;
    const d=JSON.parse(raw);
    if(d.CLIENTS) CLIENTS=d.CLIENTS;
    if(d.EVENTS) EVENTS=d.EVENTS;
    if(d.STOCK) STOCK=d.STOCK;
    if(d.COMMANDES) COMMANDES=d.COMMANDES;
    if(d.FACTURES) FACTURES=d.FACTURES;
    if(d.TACHES) TACHES=d.TACHES;
    if(d.PROSPECTS) PROSPECTS=d.PROSPECTS;
    if(d.DEVIS) DEVIS=d.DEVIS;
    if(d.BCCLIENTS) BCCLIENTS=d.BCCLIENTS;
    if(d.DOCSHIST && Array.isArray(d.DOCSHIST)) DOCSHIST=d.DOCSHIST;
    if(d.TRANSMISSIONS && Array.isArray(d.TRANSMISSIONS)) TRANSMISSIONS=d.TRANSMISSIONS;
    if(d.CATALOGUE) CATALOGUE=d.CATALOGUE.map(normProduit);
    if(d.CAT_STOCK && Array.isArray(d.CAT_STOCK) && d.CAT_STOCK.length) CAT_STOCK=d.CAT_STOCK;
    if(d.CAT_PRODUITS && Array.isArray(d.CAT_PRODUITS) && d.CAT_PRODUITS.length) CAT_PRODUITS=d.CAT_PRODUITS;
    if(d.UNITES && Array.isArray(d.UNITES) && d.UNITES.length) UNITES=d.UNITES;
    if(d.TH) TH=mergeTH(d.TH);
    if(d.RUBS) RUBS=mergeRubs(d.RUBS);
    if(typeof d.pipeNextId==="number") pipeNextId=d.pipeNextId;
    if(d.JOURNAL && Array.isArray(d.JOURNAL)) JOURNAL=d.JOURNAL;
    if(d.FACFOURN && Array.isArray(d.FACFOURN)) FACFOURN=d.FACFOURN;
    chargerFournisseurs(d);
    if(d.CAISSE && typeof d.CAISSE==="object") CAISSE=d.CAISSE;
    if(d.INTERVENTIONS && Array.isArray(d.INTERVENTIONS)) INTERVENTIONS=d.INTERVENTIONS;
    if(d.RAPPRO && typeof d.RAPPRO==="object") RAPPRO=d.RAPPRO;
  }catch(e){ console.warn("Chargement impossible:", e); }
}

function resetData(){
  if(!confirm("Réinitialiser toutes les données ? Cette action est irréversible.")) return;
  const k=cleLocale(); if(k) localStorage.removeItem(k);
  location.reload();
}

// ── EXPORT / IMPORT ─────────────────────────────────────────────────────────
function exportData(){
  const data={
    _meta:{app:"AD Management",version:"1.4.0",exportLe:new Date().toISOString(),complet:true},
    ...getDataObject()
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  const date=new Date().toISOString().split("T")[0];
  a.href=url; a.download=`adsecure-sauvegarde-${date}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  logActivity("Export","Sauvegarde exportée");
}

function importData(ev){
  const file=ev.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=async e=>{
    try{
      const d=JSON.parse(e.target.result);
      if(!d.CLIENTS && !d.PROSPECTS){alert("Fichier invalide : ce n'est pas une sauvegarde AD Management.");return;}
      if(!confirm("Importer cette sauvegarde ? Vos données actuelles seront remplacées.")) return;
      applyDataObject(d);
      saveDataLocal();
      logActivity("Import","Sauvegarde importée");
      // Envoi immédiat vers le cloud AVANT rechargement (sinon la synchro écraserait l'import)
      const ok=await syncPush();
      alert(ok?"Importation réussie et synchronisée ! L'application va se recharger.":"Import appliqué sur cet appareil, mais la synchronisation cloud a échoué. Vérifiez la connexion puis réessayez.");
      if(ok) location.reload();
    }catch(err){
      alert("Erreur lors de la lecture du fichier : "+err.message);
    }
  };
  reader.readAsText(file);
}

let currentPage="db";
let activePanel=null;
let BANQUE_DATA=null;      // { comptes:[...], transactions:[...] } renvoyé par la fonction Supabase "qonto-solde"
let banqueLoading=false;
let banqueErreur=null;
let dragIdx=null;
let emojiPickerOpen=null;
let currentWeekOffset=0;
let sidebarOpen=true;
let pageHistory=[];
let selectedClientId=null;
let planningFilter="tous";

const PRESETS=[
  {label:"🌊 Ocean",  c1:"#3286A0",c2:"#299AC3",sb:"#2a2318",bg:"#f5f1ea",card:"#fefcf8",txt:"#37301F",sand:"#DED3BC"},
  {label:"🌙 Nuit",   c1:"#6366f1",c2:"#818cf8",sb:"#0f0f1a",bg:"#f0f0fa",card:"#fafaff",txt:"#1e1b4b",sand:"#e0e7ff"},
  {label:"🌿 Forêt",  c1:"#2d6a4f",c2:"#40916c",sb:"#1b2f20",bg:"#f0f5f1",card:"#f8faf8",txt:"#1b2f20",sand:"#d8f3dc"},
  {label:"🟤 Terre",  c1:"#9c6b30",c2:"#c8862b",sb:"#2c1a0e",bg:"#faf5ee",card:"#fefcf8",txt:"#2c1a0e",sand:"#f0e0c8"},
  {label:"🌸 Rose",   c1:"#be185d",c2:"#db2777",sb:"#1f0a14",bg:"#fdf2f8",card:"#fff9fc",txt:"#500724",sand:"#fce7f3"},
  {label:"⚫ Ardoise",c1:"#475569",c2:"#64748b",sb:"#0f172a",bg:"#f1f5f9",card:"#ffffff",txt:"#0f172a",sand:"#e2e8f0"},
];
const EMOJIS=["🏠","👥","📅","📦","🗂️","💼","📊","🔔","⭐","❤️","🚀","🎯","💡","🔑","📋","✅","🛡️","📈","💰","🌐"];
const POLICES=["Lora","Inter","Montserrat","Playfair Display","Raleway"];
const JOURS=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const EV_STYLE={rdv:["#e8f4f8","#299AC3"],chantier:["#fef3c7","#b08d57"],prospection:["#f0f4ff","#3286A0"],autre:["#f1f5f9","#64748b"],maintenance:["#f5f3ff","#6d28d9"]};
const ST_CLI={actif:["#dcfce7","#15803d","Actif"],relance1:["#fef9c3","#b45309","1ère relance"],relance2:["#fff7ed","#c2410c","2ème relance"],inactif:["#fee2e2","#991b1b","Inactif"],prospect:["#f1f5f9","#64748b","Prospect"]};
const ST_CMD={brouillon:"#94a3b8",envoyee:"#3286A0",confirmee:"#15803d",recue:"#0e7a4d",annulee:"#94a3b8"};
const NM_CMD={brouillon:"Brouillon",envoyee:"Envoyée",confirmee:"Confirmée",recue:"Reçue",annulee:"Annulée"};
const ST_DEVIS={
  brouillon:["#f1f5f9","#64748b","Brouillon"],
  envoye:   ["#e8f4f8","#3286A0","Envoyé"],
  accepte:  ["#dcfce7","#15803d","Accepté"],
  refuse:   ["#fee2e2","#991b1b","Refusé"],
  expire:   ["#f1f5f9","#94a3b8","Expiré"],
  transforme:["#DED3BC66","#8a6d3b","Transformé en BC"],
};
const ST_FAC={brouillon:["#f1f5f9","#64748b","Brouillon"],envoyee:["#e8f4f8","#3286A0","Envoyée"],partiel:["#fef9c3","#a16207","Acompte"],payee:["#dcfce7","#15803d","Payée"],retard:["#fee2e2","#991b1b","En retard"],annulee:["#f1f5f9","#94a3b8","Annulée"]};
const PR_C={haute:"#991b1b",moyenne:"#b45309",basse:"#15803d"};
let CAT_STOCK=["Emballage","Entretien","Bureautique","Étiquetage","Autre"];
let UNITES=["unité","forfait","heure","jour","m","m²","ml (mètre linéaire)","lot","boîte","carton","rouleau","flacon","sac","kg","L"];

// ── Utils ─────────────────────────────────────────────────────────────────────
function badge(label,bg,color){return `<span class="badge" style="background:${bg};color:${color}">${label}</span>`;}
function alertCount(){return FACTURES.filter(f=>facEnCompta(f)&&facStatutReel(f)==="retard").length+STOCK.filter(s=>s.qte<s.seuil).length+TACHES.filter(t=>!t.done&&t.prio==="haute").length;}
function activeRubs(){return [...RUBS].sort((a,b)=>a.ordre-b.ordre).filter(r=>r.actif);}
function kpi(label,value,color,small){return`<div class="kpi"><div class="kpi-label">${label}</div><div class="kpi-value${small?" small":""}" style="color:${color||TH.c1}">${value}</div></div>`;}
function weekStart(offset){const d=new Date();const day=d.getDay()===0?6:d.getDay()-1;d.setDate(d.getDate()-day+(offset||0)*7);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}

// ── Theme ─────────────────────────────────────────────────────────────────────
function applyTheme(){
  document.body.style.color=TH.txt;
  document.getElementById("sidebar").style.background=TH.sidebar;
  const topbar=document.getElementById("topbar");
  if(topbar){topbar.style.background="";topbar.style.borderColor="";}
  const an=document.getElementById("app-name"),asub=document.getElementById("app-sub");
  an.style.color=TH.sand;an.textContent=TH.nom||"Mon entreprise";
  asub.style.color=TH.c2;asub.textContent=TH.sous||"";asub.style.display=TH.sous?"":"none";
  const rs=document.documentElement.style;rs.setProperty("--teal1",TH.c1);rs.setProperty("--teal2",TH.c2);
  document.title=(TH.nom?`${TH.nom}${TH.sous?" "+TH.sous:""} — `:"")+"AD Management";
  document.getElementById("sidebar-divider").style.background=`linear-gradient(90deg,transparent,${TH.c1},transparent)`;
  const lp=document.getElementById("logo-placeholder");
  const li=document.getElementById("logo-img");
  if(TH.logo){
    if(!li){const img=document.createElement("img");img.id="logo-img";img.style.width="64px";img.style.height="64px";img.style.objectFit="contain";img.style.margin="0 auto 12px";img.style.display="block";img.style.cursor="pointer";img.title="Réglages";img.onclick=function(){openPanel('settings');};img.src=TH.logo;img.style.filter=TH.logoF;if(lp)lp.parentNode.insertBefore(img,lp);}
    else{li.src=TH.logo;li.style.filter=TH.logoF;li.style.display="block";}
    if(lp)lp.style.display="none";
  } else {
    if(lp){lp.style.display="flex";lp.style.background=`linear-gradient(135deg,${TH.c1},${TH.c2})`;lp.style.color="#fff";lp.style.fontWeight="700";lp.textContent=((TH.nom||"M").trim().charAt(0)||"M").toUpperCase();}
    if(li)li.style.display="none";
  }
  saveData();
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function renderNav(){
  const nav=document.getElementById("nav");
  const ac=alertCount();
  nav.innerHTML=activeRubs().map(r=>{
    const isAct=currentPage===r.id;
    const bc=isAct?`background:${TH.c1}28`:"";
    const tc=isAct?TH.c2:`${TH.sand}80`;
    const bdg=r.id==="db"&&ac>0?`<span class="nav-badge">${ac}</span>`:"";
    return`<button class="nav-btn${isAct?" active":""}" onclick="goTo('${r.id}')" style="color:${tc};${bc};font-family:'${TH.police}',Georgia,serif">
      <span>${r.icon}</span><span class="sidebar-label" style="flex:1">${r.label}</span>${bdg}
    </button>`;}).join("");
  const ab=document.getElementById("alert-btn");
  if(ab){ab.style.display=ac>0?"flex":"none";const span=document.getElementById("alert-count");if(span)span.textContent=ac;}
  const bb=document.getElementById("back-btn");
  if(bb){bb.style.opacity=pageHistory.length>0?"1":"0.3";bb.style.cursor=pageHistory.length>0?"pointer":"default";}
  const av=document.getElementById("user-avatar");
  if(av&&currentUser){
    if(currentUser.avatar){
      av.innerHTML=`<img src="${currentUser.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
      av.style.padding="0";av.style.overflow="hidden";
    } else {
      av.textContent=currentUser.nom.charAt(0).toUpperCase();
    }
    av.title=currentUser.nom+" · Réglages";
  }
  const pt=document.getElementById("page-title");
  if(pt){
    let title="Tableau de bord";
    if(currentPage==="client-fiche"&&selectedClientId){const c=CLIENTS.find(x=>x.id===selectedClientId);title=c?c.nom:"Fiche client";}
    else if(currentPage==="client-fiche"&&selectedClientId){const cli=CLIENTS.find(x=>x.id===selectedClientId);title=cli?cli.nom:"Fiche client";}
    else title=RUBS.find(r=>r.id===currentPage)?.label||"Tableau de bord";
    pt.textContent=title;pt.style.fontFamily=`'${TH.police}',Georgia,serif`;pt.style.color=TH.txt;
  }
  saveData();
}
// ══════════════════════════════════════════════════════════
// ── RECHERCHE GLOBALE ─────────────────────────────────────
// ══════════════════════════════════════════════════════════
function openSearch(){
  const m=document.getElementById("modal-container");
  m.innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)closeSearch()">
    <div class="modal" style="max-width:560px;align-self:flex-start;margin-top:8vh">
      <div style="padding:16px 20px;border-bottom:1px solid rgba(26,33,24,0.1);position:sticky;top:0;background:#fff;z-index:1">
        <input id="global-search-input" placeholder="🔍 Rechercher un client, prospect, facture..."
          style="width:100%;padding:12px 16px;border-radius:11px;border:1.5px solid #3286A0;font-size:15px;color:#1A2118;background:#F7F4ED;outline:none;font-family:'Inter',sans-serif;box-sizing:border-box"
          oninput="runSearch(this.value)"/>
      </div>
      <div id="search-results" style="padding:8px 12px;max-height:60vh;overflow-y:auto">
        <div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">Tapez pour rechercher dans tous vos modules</div>
      </div>
    </div>
  </div>`;
  setTimeout(()=>{const inp=document.getElementById("global-search-input");if(inp)inp.focus();},100);
}
function closeSearch(){ document.getElementById("modal-container").innerHTML=""; }
function runSearch(q){
  q=q.toLowerCase().trim();
  const box=document.getElementById("search-results");
  if(!q||q.length<2){box.innerHTML=`<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">Tapez au moins 2 caractères</div>`;return;}
  const results=[];
  CLIENTS.forEach(c=>{if([c.nom,c.contact,c.email,c.tel].filter(Boolean).join(" ").toLowerCase().includes(q))results.push({icon:"👥",label:c.nom,sub:(c.contact||"")+" · "+fMoney(c.ca||0),type:"Client",action:`openClientFiche('${c.id}')`});});
  PROSPECTS.forEach(p=>{if([p.name,p.company,p.email].filter(Boolean).join(" ").toLowerCase().includes(q))results.push({icon:"🎯",label:p.name,sub:(p.company||"")+" · "+fMoney(p.amount||0),type:"Prospect",action:`goTo('pipeline')`});});
  FACTURES.forEach(f=>{if([f.num,f.client].filter(Boolean).join(" ").toLowerCase().includes(q))results.push({icon:"🧾",label:f.num,sub:f.client+" · "+fMoney(f.ttc||0),type:"Facture",action:`goTo('factures')`});});
  (typeof COMMANDES!=="undefined"?COMMANDES:[]).forEach(c=>{if([c.ref,c.four].filter(Boolean).join(" ").toLowerCase().includes(q))results.push({icon:"📦",label:c.ref||"Bon de commande",sub:(c.four||"")+" · "+fMoney(bcTotal(c)),type:"Bon de commande",action:`goTo('stock')`});});
  (typeof TRANSMISSIONS!=="undefined"?TRANSMISSIONS:[]).forEach(t=>{const cli=CLIENTS.find(c=>c.id===t.clientId);if((t.texte||"").toLowerCase().includes(q)||(cli&&cli.nom.toLowerCase().includes(q))){const ty=TYPES_TRANS[t.type]||TYPES_TRANS.note;results.push({icon:ty.icon,label:(t.texte||"").slice(0,60),sub:(cli?cli.nom+" · ":"")+fDateHeure(t.date),type:"Transmission",action:cli?`openClientFiche('${cli.id}')`:`goTo('db')`});}});
  (typeof BCCLIENTS!=="undefined"?BCCLIENTS:[]).forEach(b=>{const cli=CLIENTS.find(c=>c.id===b.clientId);if([b.num,b.refChantier,b.devisNum,cli?cli.nom:""].filter(Boolean).join(" ").toLowerCase().includes(q))results.push({icon:"📋",label:b.num,sub:(cli?cli.nom:"")+" · "+fMoney(devisTTC(b)),type:"BC client",action:`goTo('devis')`});});
  STOCK.forEach(s=>{if((s.nom||"").toLowerCase().includes(q))results.push({icon:"📦",label:s.nom,sub:"Qté "+s.qte+" · "+fMoney(s.prix||0),type:"Stock",action:`goTo('stock')`});});
  EVENTS.forEach(e=>{if([e.titre,e.client].filter(Boolean).join(" ").toLowerCase().includes(q))results.push({icon:"📅",label:e.titre,sub:(e.client||"")+" · "+(e.date||""),type:"Événement",action:`goTo('plan')`});});
  if(results.length===0){box.innerHTML=`<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">Aucun résultat pour "${q}"</div>`;return;}
  box.innerHTML=results.slice(0,30).map(r=>`<button onclick="closeSearch();${r.action}" style="width:100%;display:flex;align-items:center;gap:12px;padding:11px 14px;border:none;background:none;cursor:pointer;border-radius:9px;text-align:left;font-family:'Inter',sans-serif" onmouseover="this.style.background='#F7F4ED'" onmouseout="this.style.background='none'">
    <span style="font-size:18px;flex-shrink:0">${r.icon}</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:14px;font-weight:600;color:#1A2118">${r.label}</div>
      <div style="font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.sub}</div>
    </div>
    <span style="font-size:10px;font-weight:700;color:#94a3b8;background:#f1f5f9;padding:2px 8px;border-radius:10px;flex-shrink:0">${r.type}</span>
  </button>`).join("")+(results.length>30?`<div style="padding:10px;text-align:center;color:#94a3b8;font-size:11px">${results.length-30} autre(s) résultat(s)…</div>`:"");
}

function goTo(id){
  closeSidebar();
  const r=RUBS.find(x=>x.id===id);
  const newPage=(r&&r.actif)?id:"db";
  if(newPage!==currentPage) pageHistory.push(currentPage);
  currentPage=newPage;
  if(newPage!=="client-fiche") selectedClientId=null;
  closeModal();
  renderNav();
  renderPage();
}
function openClientFiche(clientId){
  selectedClientId=clientId;
  pageHistory.push(currentPage);
  currentPage="client-fiche";
  closeModal();
  renderNav();
  renderPage();
}
function goBack(){
  if(pageHistory.length===0) return;
  currentPage=pageHistory.pop();
  renderNav();
  renderPage();
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function showModal(title,body,footer){
  document.getElementById("modal-container").innerHTML=`
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-head"><div class="modal-title">${title}</div><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="modal-body">${body}</div>
        <div class="modal-footer">${footer}</div>
      </div>
    </div>`;
}
function closeModal(){document.getElementById("modal-container").innerHTML="";}
let _pendingDel=null;
function confirmDel(msg,fn){
  _pendingDel=fn;
  showModal("Confirmer la suppression",`<p style="font-size:14px;color:#475569">${msg}</p>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:#991b1b" onclick="closeModal();if(_pendingDel){_pendingDel();_pendingDel=null;}">Supprimer</button>`);
}

// ════════════════════════════════════════════════════════
