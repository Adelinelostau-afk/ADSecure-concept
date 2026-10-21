// ── Paiements ──────────────────────────────────────────────────────────────
const MODES_PAIEMENT=["Virement","Chèque","Espèces","CB","Prélèvement"];
function modalPaiement(id){
  const f=FACTURES.find(x=>x.id===id);if(!f)return;
  const ttc=facTTC(f),paye=facPaye(f),reste=facReste(f);
  const histo=(f.paiements||[]);
  showModal(`Paiement — ${f.num}`,`
    <div style="background:#F7F4ED;border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span style="color:#64748b">Total facture</span><span style="font-weight:700">${fMoney(ttc)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span style="color:#64748b">Déjà réglé</span><span style="font-weight:700;color:#15803d">${fMoney(paye)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:15px;padding-top:7px;border-top:1px solid #ddd"><span style="font-weight:700">Reste dû</span><span style="font-weight:800;color:#b45309">${fMoney(reste)}</span></div>
    </div>
    ${histo.length>0?`<div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Historique</div>
      ${histo.map((p,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9">
        <span style="font-size:14px">💶</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:600">${fMoney(p.montant)}</div><div style="font-size:11px;color:#64748b">${fDate(p.date)} · ${p.mode||"—"}</div></div>
        <button onclick="delPaiement('${f.id}',${i})" style="padding:3px 7px;border-radius:6px;border:1.5px solid #fecaca;background:#fef2f2;color:#991b1b;cursor:pointer;font-size:11px">✕</button>
      </div>`).join("")}
    </div>`:""}
    ${reste>0?`<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Nouveau paiement</div>
    <div class="field-row">
      <div class="field"><label>Montant (€)</label><input type="number" id="pay-montant" value="${reste}" step="0.01" min="0"/></div>
      <div class="field"><label>Date</label><input type="date" id="pay-date" value="${TODAY}"/></div>
    </div>
    <div class="field"><label>Mode de paiement</label><select id="pay-mode">${MODES_PAIEMENT.map(m=>`<option>${m}</option>`).join("")}</select></div>
    <button onclick="addPaiement('${f.id}')" style="width:100%;padding:11px;border-radius:9px;border:none;background:#15803d;color:#fff;cursor:pointer;font-weight:700;font-size:14px;font-family:'Inter',sans-serif;margin-bottom:4px">✓ Enregistrer le paiement</button>`:`<div style="text-align:center;padding:14px;background:#dcfce7;border-radius:10px;color:#15803d;font-weight:700">✓ Facture intégralement payée</div>`}`,
    `<button class="btn-cancel" onclick="closeModal()">Fermer</button>`
  );
}
function addPaiement(id){
  const montant=parseFloat(document.getElementById("pay-montant").value)||0;
  const date=document.getElementById("pay-date").value||TODAY;
  const mode=document.getElementById("pay-mode").value;
  if(montant<=0){alert("Montant invalide");return;}
  const f=FACTURES.find(x=>x.id===id);if(!f)return;
  if(!f.paiements)f.paiements=[];
  f.paiements.push({date,montant,mode});
  // Mise à jour automatique du statut
  if(facEstPayee(f))f.statut="payee";
  else if(facPaye(f)>0&&f.statut!=="payee")f.statut="partiel";
  logActivity("Paiement enregistré",`${fMoney(montant)} sur ${f.num} (${mode})`);
  // Le modal reste ouvert pour permettre d'enchaîner plusieurs règlements (modes différents)
  modalPaiement(id);renderPage();renderNav();
}
function delPaiement(id,idx){
  const f=FACTURES.find(x=>x.id===id);if(!f||!f.paiements)return;
  if(!confirm("Supprimer ce paiement ?"))return;
  f.paiements.splice(idx,1);
  if(!facEstPayee(f)&&f.statut==="payee")f.statut=facPaye(f)>0?"partiel":"envoyee";
  logActivity("Paiement supprimé",f.num);
  modalPaiement(id);renderPage();renderNav();
}
// ══════════════════════════════════════════════════════════
// ── RELANCES AUTOMATIQUES : moteur commun (appli + serveur) ──
// ══════════════════════════════════════════════════════════
// Même code dans app.html (aperçu) et dans la fonction Supabase « relances-auto »
// (envoi). Ne dépend de rien : reçoit les données, la date du jour et les clés
// déjà envoyées, et renvoie la liste des e-mails à envoyer aujourd'hui.
// ── SIGNATURE DES E-MAILS : même code dans app.html (aperçu) et dans « relances-auto » (envoi) ──
const SigMail=(function(){
  const e=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  function cfg(TH,uid){
    TH=TH||{};
    const s=Object.assign({},TH.sigMail||{});
    // signature personnelle de l'utilisateur qui envoie (nom, fonction, téléphones, e-mail)
    const u=uid&&TH.sigMailUsers&&TH.sigMailUsers[uid];
    if(u&&u.actif!==false) ["nom","poste","tel1","tel2","email"].forEach(k=>{if(u[k]!==undefined&&String(u[k]).trim()!=="")s[k]=u[k];else if(k==="tel2"&&u.tel1)s.tel2=u.tel2||"";});
    return {actif:s.actif!==false&&!!TH.sigMail,nom:s.nom||"",poste:s.poste||"",
      societe:s.societe||((TH.nom||"")+" "+(TH.sous||"")).trim(),
      tel1:s.tel1!==undefined?s.tel1:(TH.tel||""),tel2:s.tel2||"",
      email:s.email!==undefined?s.email:(TH.email||""),site:s.site!==undefined?s.site:(TH.site||""),
      adresse:s.adresse!==undefined?s.adresse:(TH.adresse||""),logoUrl:s.logoUrl||"",slogan:s.slogan||"",
      couleur:TH.c1||"#3286A0"};
  }
  // Nom placé sous « Cordialement, » dans le texte quand la signature riche est active
  function court(TH,uid){const c=cfg(TH,uid);return c.nom||c.societe;}
  function lienSite(u){u=String(u||"").trim();if(!u)return"";return /^https?:\/\//i.test(u)?u:"https://"+u;}
  function siteAffiche(u){return String(u||"").replace(/^https?:\/\//i,"").replace(/\/$/,"");}
  function html(TH,uid){
    const c=cfg(TH,uid);if(!c.actif)return"";
    const a=(href,txt)=>`<a href="${e(href)}" style="color:#1A2118;text-decoration:none">${e(txt)}</a>`;
    const tels=[c.tel1,c.tel2].filter(Boolean).map(t=>a("tel:"+t.replace(/[^\d+]/g,""),t)).join(" &nbsp;·&nbsp; ");
    const lignes=[
      tels?`<div>📞 ${tels}</div>`:"",
      c.email?`<div>✉️ ${a("mailto:"+c.email,c.email)}</div>`:"",
      c.site?`<div>🌐 <a href="${e(lienSite(c.site))}" style="color:${c.couleur};text-decoration:none;font-weight:bold">${e(siteAffiche(c.site))}</a></div>`:"",
      c.adresse?`<div style="color:#64748b;font-size:12px">📍 ${e(c.adresse)}</div>`:""
    ].join("");
    return `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#1A2118">
<tr>${c.logoUrl?`<td style="padding:4px 16px 4px 0;border-right:3px solid ${c.couleur};vertical-align:middle"><img src="${e(c.logoUrl)}" alt="${e(c.societe)}" width="80" style="display:block;width:80px;height:auto;border:0"></td>`:""}
<td style="padding:4px 0 4px ${c.logoUrl?16:0}px;vertical-align:middle${c.logoUrl?"":";border-left:3px solid "+c.couleur+";padding-left:14px"}">
${c.nom?`<div style="font-weight:bold;font-size:15px">${e(c.nom)}</div>`:""}
<div style="color:${c.couleur};font-weight:bold;font-size:${c.nom?12:15}px">${e([c.poste,c.societe].filter(Boolean).join(" · "))}</div>
${c.slogan?`<div style="color:#64748b;font-size:12px;font-style:italic">${e(c.slogan)}</div>`:""}
<div style="margin-top:6px">${lignes}</div>
</td></tr></table>`;
  }
  function texte(TH,uid){
    const c=cfg(TH,uid);if(!c.actif)return"";
    return ["--",c.nom,[c.poste,c.societe].filter(Boolean).join(" · "),[c.tel1,c.tel2].filter(Boolean).join(" · "),c.email,siteAffiche(c.site),c.adresse].filter(Boolean).join("\n");
  }
  return {cfg,court,html,texte};
})();

const RelancesCore=(function(){
  const DEFAUT={
    actif:false,
    copie:true,
    factures:{actif:true,j1:7,j2:15,j3:15,miseEnDemeure:false},
    contrats:{reconduction:true,visites:true,visitesJours:7},
    prospects:{actif:true},
    clients:{actif:true},
    objetSuivi:"Nous revenons vers vous",
    texteSuivi:"Bonjour {contact},\n\nNous revenons vers vous suite à notre dernier échange et souhaitions savoir si vous aviez des questions ou des besoins concernant votre projet.\n\nNous restons à votre disposition pour en parler.\n\nCordialement,"
  };
  const FENETRE=3; // jours de rattrapage pour une relance datée (si l'envoi d'un jour a été manqué)
  const MAX_PAR_PASSAGE=40;

  function config(TH){
    const c=(TH&&TH.relancesAuto)||{};
    return {...DEFAUT,...c,
      factures:{...DEFAUT.factures,...(c.factures||{})},
      contrats:{...DEFAUT.contrats,...(c.contrats||{})},
      prospects:{...DEFAUT.prospects,...(c.prospects||{})},
      clients:{...DEFAUT.clients,...(c.clients||{})}};
  }

  // ── Dates (chaînes AAAA-MM-JJ, midi local pour éviter les décalages) ──
  function ymd(x){return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");}
  function addDays(d,n){const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return ymd(x);}
  function diff(a,b){return Math.round((new Date(a+"T12:00:00")-new Date(b+"T12:00:00"))/86400000);} // a - b en jours
  function shiftMonths(d,n){if(!d)return"";const x=new Date(d+"T12:00:00");const j=x.getDate();x.setDate(1);x.setMonth(x.getMonth()+n);const dern=new Date(x.getFullYear(),x.getMonth()+1,0,12).getDate();x.setDate(Math.min(j,dern));return ymd(x);}
  function addMonths(d,n){if(!d)return"";const x=new Date(d+"T12:00:00");const j=x.getDate();x.setDate(1);x.setMonth(x.getMonth()+n);const dern=new Date(x.getFullYear(),x.getMonth()+1,0,12).getDate();if(j>dern){x.setDate(dern);}else{x.setDate(j);x.setDate(x.getDate()-1);}return ymd(x);}
  const MOIS=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  function dateLongue(d){if(!d)return"—";const [y,m,j]=d.split("-").map(Number);return (j===1?"1er":j)+" "+MOIS[m-1]+" "+y;}
  function euros(n){const v=Math.round(Number(n||0)*100)/100;const [e,c]=v.toFixed(2).split(".");return e.replace(/\B(?=(\d{3})+(?!\d))/g," ")+(c==="00"?"":","+c)+" €";}

  // ── Factures ──
  function tauxTVA(f){return(f.tva!==undefined&&f.tva!==null)?f.tva:20;}
  function ht(f){if(f.lignes&&f.lignes.length)return f.lignes.reduce((s,l)=>s+(l.qte||0)*(l.pu||0),0);return Math.round((f.ttc||0)/(1+tauxTVA(f)/100));}
  function ttc(f){if(f.lignes&&f.lignes.length)return ht(f)*(1+tauxTVA(f)/100);return f.ttc||0;}
  function paye(f){return(f.paiements||[]).reduce((s,p)=>s+(p.montant||0),0);}
  function reste(f){return Math.max(0,Math.round((ttc(f)-paye(f))*100)/100);}
  const LIB_FAC=["","1ère relance","2ème relance","Mise en demeure"];

  // ── Contrats (mêmes règles que la fiche client) ──
  function echeance(x,today){let fin=x.dateFin;if(!fin)return"";for(let i=0;i<30&&!x.resilie&&fin<today;i++)fin=addMonths(addDays(fin,1),12);return fin;}
  function infoL215(x,today){
    if(x.version!=="part"||x.resilie||!x.dateFin)return null;
    const ech=echeance(x,today),limite=shiftMonths(ech,-1);
    const debut=shiftMonths(limite,-3),fin=shiftMonths(limite,-1);
    const envoye=(x.infoReconduction||{})[ech];
    if(envoye)return{ech,limite,debut,fin,etat:"envoye"};
    if(today<debut)return null;
    return{ech,limite,debut,fin,etat:today<=fin?"afaire":"retard"};
  }

  function signature(TH){
    if(SigMail.cfg(TH).actif) return SigMail.court(TH); // la signature complète est ajoutée sous le message
    const nom=((TH.nom||"")+" "+(TH.sous||"")).trim();
    const coord=[TH.tel,TH.email].filter(Boolean).join(" · ");
    return nom+(coord?"\n"+coord:"");
  }
  function trouverClient(data,id,nom){
    const L=data.CLIENTS||[];
    return L.find(c=>id&&c.id===id)||L.find(c=>nom&&c.nom===nom)||null;
  }
  function emailOk(e){return typeof e==="string"&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());}

  // data : objet app_data · today : "AAAA-MM-JJ" · envoyees : Map clé → date d'envoi (AAAA-MM-JJ) des relances déjà parties
  // Renvoie {aEnvoyer:[…], sansEmail:[…]}
  function calculer(data,today,envoyees){
    const TH=data.TH||{};
    const cfg=config(TH);
    const sig=signature(TH);
    const out=[],sansEmail=[];
    const deja=k=>envoyees&&envoyees.has(k);
    const ajouter=(r,email)=>{if(deja(r.cle))return;if(!emailOk(email)){sansEmail.push(r);return;}out.push({...r,email:email.trim()});};

    // 1. Factures impayées
    if(cfg.factures.actif){
      (data.FACTURES||[]).forEach(f=>{
        if(["brouillon","annulee","payee"].includes(f.statut)||!f.ech||f.ech>=today)return;
        const r=reste(f);if(r<=0)return;
        // Relances déjà faites : saisies à la main (f.relances) ou envoyées automatiquement
        const faites=(f.relances||[]).map((x,i)=>({n:x.niveau||i+1,date:x.date||""}));
        [1,2,3].forEach(n=>{const k=`fac:${f.id}:${n}`;if(deja(k)&&!faites.some(x=>x.n===n))faites.push({n,date:(envoyees.get&&envoyees.get(k))||today});});
        const nMax=faites.reduce((m,x)=>Math.max(m,x.n),0);
        const derniere=faites.reduce((m,x)=>x.date>m?x.date:m,"");
        const n=nMax+1;
        if(n>3||(n===3&&!cfg.factures.miseEnDemeure))return;
        const due=n===1?addDays(f.ech,cfg.factures.j1):addDays(derniere||f.ech,n===2?cfg.factures.j2:cfg.factures.j3);
        if(today<due)return;
        const cli=trouverClient(data,f.clientId,f.client);
        const contact=cli&&cli.contact?cli.contact:"Madame, Monsieur";
        const retard=diff(today,f.ech);
        let sujet,texte;
        if(n===1){
          sujet=`Relance amiable — Facture ${f.num}`;
          texte=`Bonjour ${contact},\n\nSauf erreur ou omission de notre part, il nous semble que la facture ${f.num} d'un montant de ${euros(r)} (échéance du ${dateLongue(f.ech)}) n'a pas encore été réglée.\n\nNous vous remercions de bien vouloir procéder à son règlement dans les meilleurs délais ou de nous contacter si vous avez la moindre question. Si votre règlement a été effectué entre-temps, merci de ne pas tenir compte de ce message.\n\nCordialement,\n${sig}`;
        }else if(n===2){
          sujet=`2ème relance — Facture ${f.num} impayée`;
          texte=`Bonjour ${contact},\n\nNous revenons vers vous concernant la facture ${f.num} d'un montant de ${euros(r)}, dont l'échéance est dépassée depuis ${retard} jour(s) (${dateLongue(f.ech)}).\n\nMalgré notre première relance, nous n'avons pas reçu votre règlement. Merci de procéder au paiement sans délai ou de nous contacter pour convenir d'un arrangement.\n\nÀ défaut de réponse sous 8 jours, nous serons contraints d'engager une procédure de recouvrement.\n\nCordialement,\n${sig}`;
        }else{
          sujet=`Mise en demeure — Facture ${f.num}`;
          texte=`Bonjour ${contact},\n\nEn l'absence de règlement de la facture ${f.num} d'un montant de ${euros(r)} malgré nos relances successives, nous vous mettons en demeure de procéder au paiement de cette somme dans un délai de 8 jours à compter de la réception de ce message.\n\nPassé ce délai, nous nous réservons le droit d'engager toute procédure judiciaire nécessaire au recouvrement de cette créance.\n\nCordialement,\n${sig}`;
        }
        ajouter({cle:`fac:${f.id}:${n}`,type:"facture",niveau:n,libelle:LIB_FAC[n],refId:f.id,client:f.client||(cli&&cli.nom)||"",sujet,texte},cli&&cli.email);
      });
    }

    // 2. Contrats : information avant reconduction (particuliers) + rappel des visites
    if(cfg.contrats.reconduction){
      (data.CLIENTS||[]).forEach(c=>(c.contratsSignes||[]).forEach(x=>{
        const i=infoL215(x,today);if(!i||i.etat==="envoye")return;
        const prest=((TH.nom||"")+" "+(TH.sous||"")).trim();
        const moyens=`par lettre recommandée avec accusé de réception adressée à ${prest}${TH.contratSiege?", "+TH.contratSiege:""}${TH.email?", ou par courrier électronique à "+TH.email:""}`;
        const prix=Number(x.prixHT||0),prixTTC=Math.round(prix*1.085*100)/100;
        const ctr=TH.contratLibelle||"contrat de maintenance";
        const sujet="Information sur la reconduction de votre "+ctr;
        const texte=`Madame, Monsieur,\n\nLe ${ctr} de votre ${TH.systemeLibelle||"système de vidéosurveillance"}${x.forfaitLabel?` (forfait ${x.forfaitLabel})`:""}, conclu le ${dateLongue(x.dateSignature)}, arrive au terme de sa période en cours le ${dateLongue(i.ech)}.\n\nSauf refus de votre part, il sera reconduit tacitement pour une durée de douze (12) mois, conformément à son article 2, aux conditions en vigueur, soit actuellement ${euros(prix)} HT, soit ${euros(prixTTC)} TTC par mois.\n\nConformément à l'article L. 215-1 du Code de la consommation, nous vous informons que vous pouvez refuser cette reconduction. Il vous suffit de nous faire part de votre décision ${moyens}, au plus tard le :\n\n    ${dateLongue(i.limite).toUpperCase()}\n\nSi vous ne faites rien, votre contrat se poursuivra et nous continuerons à assurer ${TH.contratPrestation||"la maintenance de votre installation"}${TH.contratClauseVisites!==undefined?TH.contratClauseVisites:", dont les visites préventives semestrielles"}.\n\nNous restons à votre disposition pour toute question et vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.\n\n${TH.contratRepresentant||""}${TH.contratQualite?", "+TH.contratQualite:""}\n${sig}`;
        ajouter({cle:`l215:${x.id}:${i.ech}`,type:"reconduction",refId:x.id,clientId:c.id,ech:i.ech,libelle:"Information reconduction",client:c.nom,sujet,texte},c.email);
      }));
    }
    if(cfg.contrats.visites){
      const j=Number(cfg.contrats.visitesJours)||7;
      (data.EVENTS||[]).forEach(e=>{
        if(!e.contratId||!e.date||e.date<today||diff(e.date,today)>j||e.rappelEnvoye===e.date)return;
        const c=trouverClient(data,e.clientId,e.client);
        const contact=c&&c.contact?c.contact:"Madame, Monsieur";
        const sujet=`Rappel : ${TH.visiteLibelle||"visite de maintenance"} le ${dateLongue(e.date)}`;
        const texte=`Bonjour ${contact},\n\nDans le cadre de votre ${TH.contratLibelle||"contrat de maintenance"}, ${TH.equipeLibelle||"notre technicien"} passera pour ${TH.visitePrev||"la visite préventive"} de votre ${TH.systemeLibelle||"système de vidéosurveillance"} le ${dateLongue(e.date)}${e.heure?" à "+e.heure.replace(":","h"):""}.\n\nMerci de vous assurer que ${TH.accesMateriel||"l'accès au matériel (enregistreur, caméras)"} sera possible. Si ce créneau ne vous convient pas, contactez-nous pour le déplacer.\n\nCordialement,\n${sig}`;
        ajouter({cle:`visite:${e.id}:${e.date}`,type:"visite",refId:e.id,libelle:"Rappel de visite",client:(c&&c.nom)||e.client||"",sujet,texte},c&&c.email);
      });
    }

    // 3. Prospects et clients : à la date de relance prévue
    const suivi=(nom,contact)=>({sujet:cfg.objetSuivi||DEFAUT.objetSuivi,
      texte:String(cfg.texteSuivi||DEFAUT.texteSuivi).replace(/\{contact\}/g,contact||"Madame, Monsieur").replace(/\{entreprise\}/g,nom||"")+"\n"+sig});
    const dansFenetre=d=>d&&d<=today&&diff(today,d)<=FENETRE;
    if(cfg.prospects.actif){
      (data.PROSPECTS||[]).forEach(p=>{
        if(["gagne","perdu"].includes(p.stage)||!dansFenetre(p.date)||p.relanceEnvoyee===p.date)return;
        const m=suivi(p.company||p.name,p.name);
        ajouter({cle:`prosp:${p.id}:${p.date}`,type:"prospect",refId:p.id,libelle:"Relance prospect",client:p.company||p.name||"",...m},p.email);
      });
    }
    if(cfg.clients.actif){
      (data.CLIENTS||[]).forEach(c=>{
        if(!dansFenetre(c.dateRelance)||c.relanceEnvoyee===c.dateRelance)return;
        const m=suivi(c.nom,c.contact);
        ajouter({cle:`cli:${c.id}:${c.dateRelance}`,type:"client",refId:c.id,libelle:"Relance client",client:c.nom||"",...m},c.email);
      });
    }
    return{aEnvoyer:out.slice(0,MAX_PAR_PASSAGE),sansEmail,cfg};
  }

  // Reporte dans les données de l'appli les relances envoyées par le serveur.
  // Renvoie le nombre de modifications (0 = rien de nouveau).
  function reporter(data,lignes){
    let n=0;
    (lignes||[]).forEach(l=>{
      if(l.statut!=="envoye")return;
      const d=(l.created_at||"").slice(0,10);
      const [type,ref,extra]=l.cle.split(":");
      if(type==="fac"){
        const f=(data.FACTURES||[]).find(x=>x.id===ref);if(!f)return;
        f.relances=f.relances||[];
        if(f.relances.some(r=>r.cle===l.cle))return;
        const niv=Number(extra);
        f.relances.push({date:d,niveau:niv,label:LIB_FAC[niv]||"Relance",auto:true,cle:l.cle});n++;
      }else if(type==="l215"){
        (data.CLIENTS||[]).forEach(c=>(c.contratsSignes||[]).forEach(x=>{
          if(x.id!==ref)return;x.infoReconduction=x.infoReconduction||{};
          if(!x.infoReconduction[extra]){x.infoReconduction[extra]=d;n++;}
        }));
      }else if(type==="visite"){
        const e=(data.EVENTS||[]).find(x=>x.id===ref);
        if(e&&e.rappelEnvoye!==extra){e.rappelEnvoye=extra;n++;}
      }else if(type==="prosp"){
        const p=(data.PROSPECTS||[]).find(x=>x.id===ref);
        if(p&&p.relanceEnvoyee!==extra){p.relanceEnvoyee=extra;n++;}
      }else if(type==="cli"){
        const c=(data.CLIENTS||[]).find(x=>x.id===ref);
        if(c&&c.relanceEnvoyee!==extra){c.relanceEnvoyee=extra;n++;}
      }
    });
    return n;
  }

  return{DEFAUT,config,calculer,reporter,dateLongue};
})();


// ── Relances automatiques : historique serveur + réglages ──
let RELANCES_LOG=[];      // lignes de la table relances_log (envoyées par le serveur)
let relancesBusy="";      // "test" | "run" pendant un appel à la fonction

// Récupère l'historique des envois et le reporte dans les factures, contrats, prospects…
async function syncRelancesLog(){
  try{
    if(!currentUser||!currentUser.tenant_id) return 0;
    const {data,error}=await sbClient.from("relances_log")
      .select("cle,statut,created_at,type,niveau,client,email,sujet,erreur")
      .eq("tenant_id",currentUser.tenant_id)
      .order("created_at",{ascending:false}).limit(300);
    if(error){ console.warn("relances_log indisponible:",error.message); return 0; }
    RELANCES_LOG=data||[];
    const n=RelancesCore.reporter(getDataObject(),RELANCES_LOG);
    if(n){ logActivity("Relances automatiques",`${n} envoi(s) reporté(s) dans les fiches`); saveData(); }
    return n;
  }catch(e){ console.warn("syncRelancesLog:",e); return 0; }
}

function relCfg(){ return RelancesCore.config(TH); }
function relSet(chemin,valeur){
  const c=JSON.parse(JSON.stringify(relCfg()));
  const k=chemin.split(".");
  let o=c; for(let i=0;i<k.length-1;i++) o=o[k[i]];
  o[k[k.length-1]]=valeur;
  TH.relancesAuto=c;
  if(chemin==="actif") logActivity("Relances automatiques",valeur?"Activées":"Désactivées");
  saveData(); renderPanel();
}
function relApercu(){
  const envoyees=new Map(RELANCES_LOG.filter(l=>l.statut==="envoye").map(l=>[l.cle,(l.created_at||"").slice(0,10)]));
  return RelancesCore.calculer(getDataObject(),getToday(),envoyees);
}
async function relAppel(action){
  if(relancesBusy) return;
  if(action!=="test" && testBloque("l'envoi des relances aux clients")) return;
  relancesBusy=action; renderPanel();
  try{
    await syncPush(); // le serveur lit les données en ligne : on envoie d'abord les dernières modifications
    const {data,error}=await sbClient.functions.invoke("relances-auto",{body:{action}});
    let msg=data&&data.error;
    if(error){
      try{ const b=await error.context.json(); msg=b.error||error.message; }catch(_){ msg=error.message; }
    }
    if(msg){ alert("⚠️ "+msg); }
    else if(action==="test"){ alert(`✅ E-mail de test envoyé à ${data.destinataire}. Vérifiez la boîte de réception (et les indésirables).`); }
    else{
      await syncRelancesLog();
      alert(data.detail?`ℹ️ ${data.detail}`:`✅ ${data.envoyes||0} relance(s) envoyée(s)${data.erreurs?` · ${data.erreurs} erreur(s)`:""}.`);
      renderPage();
    }
  }catch(e){ alert("⚠️ "+(e.message||e)); }
  relancesBusy=""; renderPanel();
}
window.relSet=relSet; window.relAppel=relAppel;

function renderRelancesPanel(){
  const c=relCfg();
  const {aEnvoyer,sansEmail}=relApercu();
  const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const sw=(chemin,val,titre,sous)=>`<label style="display:flex;align-items:center;gap:12px;padding:10px 0;cursor:pointer">
      <input type="checkbox" ${val?"checked":""} onchange="relSet('${chemin}',this.checked)" style="width:20px;height:20px;accent-color:${TH.c1};flex-shrink:0"/>
      <div><div style="font-size:13px;font-weight:700;color:#0f1b35">${titre}</div>${sous?`<div style="font-size:11px;color:#64748b">${sous}</div>`:""}</div></label>`;
  const nb=(chemin,val,avant,apres)=>`<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#475569;padding:4px 0 4px 32px">${avant}
      <input type="number" min="1" max="90" value="${val}" onchange="relSet('${chemin}',Math.max(1,Number(this.value)||1))" style="width:58px;padding:5px 6px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:13px;text-align:center"/> ${apres}</div>`;
  const bloc=(titre,contenu)=>`<div style="border:1.5px solid #e2e8f0;border-radius:12px;padding:6px 14px 10px;margin-bottom:12px;background:#fff">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;padding-top:8px">${titre}</div>${contenu}</div>`;
  const ico={facture:"🧾",reconduction:"📑",visite:"🛠️",prospect:"🎯",client:"👤"};
  const ligneApercu=r=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid #f1f5f9">
      <span style="font-size:16px">${ico[r.type]||"✉️"}</span>
      <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:#0f1b35">${esc(r.client)} <span style="font-weight:600;color:${TH.c1}">· ${esc(r.libelle)}</span></div>
      <div style="font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.email||"⚠️ pas d'e-mail sur la fiche")} — ${esc(r.sujet)}</div></div></div>`;
  const hist=RELANCES_LOG.slice(0,25).map(l=>{
    const d=new Date(l.created_at);
    const ok=l.statut==="envoye";
    return`<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid #f1f5f9">
      <span style="font-size:16px">${ok?"✅":"❌"}</span>
      <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:#0f1b35">${esc(l.client)} <span style="font-weight:500;color:#64748b;font-size:11px">· ${d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})} ${d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span></div>
      <div style="font-size:11px;color:${ok?"#64748b":"#991b1b"}">${esc(ok?(l.sujet+" → "+l.email):(l.erreur||"Erreur d'envoi — nouvel essai au prochain passage"))}</div></div></div>`;
  }).join("");
  const btn=(action,label,plein)=>`<button onclick="relAppel('${action}')" ${relancesBusy?"disabled":""} style="flex:1;padding:11px 12px;border-radius:9px;border:1.5px solid ${TH.c1};background:${plein?TH.c1:"#fff"};color:${plein?"#fff":TH.c1};cursor:pointer;font-size:13px;font-weight:700;font-family:'Inter',sans-serif;opacity:${relancesBusy?0.6:1}">${relancesBusy===action?"⟳ En cours…":label}</button>`;

  return`<div class="panel-overlay">
    <div class="panel-bg" onclick="closePanel()"></div>
    <div class="panel">
      <div class="panel-head">
        <div style="display:flex;align-items:center;gap:10px">
          <button onclick="closePanel();openPanel('settings')" style="width:30px;height:30px;border-radius:8px;border:1.5px solid #e2e8f0;background:#f8fafc;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:#64748b">←</button>
          <div class="panel-title">🔔 Relances automatiques</div>
        </div>
        <button class="panel-close" onclick="closePanel()">✕</button>
      </div>
      <div class="panel-body">
        <div style="border-radius:12px;padding:12px 14px;margin-bottom:14px;background:${c.actif?"#f0fdf4":"#f8fafc"};border:1.5px solid ${c.actif?"#86efac":"#e2e8f0"}">
          ${sw("actif",c.actif,c.actif?"Relances automatiques activées":"Relances automatiques désactivées","Envoi chaque matin en semaine (8 h), depuis votre adresse e-mail professionnelle")}
        </div>

        ${bloc("🧾 Factures impayées",
          sw("factures.actif",c.factures.actif,"Relancer les factures en retard","Aucune relance si la facture est payée entre-temps")+
          (c.factures.actif?
            nb("factures.j1",c.factures.j1,"1ère relance","jours après l'échéance")+
            nb("factures.j2",c.factures.j2,"2ème relance","jours après la 1ère")+
            sw("factures.miseEnDemeure",c.factures.miseEnDemeure,"Envoyer aussi la mise en demeure","Recommandé : laisser décoché et l'envoyer vous-même en recommandé")+
            (c.factures.miseEnDemeure?nb("factures.j3",c.factures.j3,"Mise en demeure","jours après la 2ème"):""):""))}

        ${bloc("📑 "+FV("contrats"),
          sw("contrats.reconduction",c.contrats.reconduction,"Information avant reconduction (particuliers)","Courrier obligatoire (art. L. 215-1), envoyé dès l'ouverture de la période légale")+
          sw("contrats.visites",c.contrats.visites,"Rappel des visites préventives","Prévient le client avant chaque visite du Planning")+
          (c.contrats.visites?nb("contrats.visitesJours",c.contrats.visitesJours,"Envoyer","jours avant la visite"):""))}

        ${bloc("🎯 Prospects et clients",
          sw("prospects.actif",c.prospects.actif,"Prospects du pipeline","À la date « Relance prévue » de la fiche prospect")+
          sw("clients.actif",c.clients.actif,"Clients","À la date « Relance prévue » de la fiche client")+
          `<div class="field" style="margin-top:6px"><label>Objet du message</label><input value="${esc(c.objetSuivi)}" onchange="relSet('objetSuivi',this.value)"/></div>
           <div class="field"><label>Message (votre signature est ajoutée à la fin)</label><textarea style="min-height:130px" onchange="relSet('texteSuivi',this.value)">${esc(c.texteSuivi)}</textarea>
           <div style="font-size:11px;color:#64748b;margin-top:4px">{contact} = nom du contact · {entreprise} = nom de l'entreprise</div></div>`)}

        ${bloc("⚙️ Options",sw("copie",c.copie,"Recevoir une copie de chaque relance",`Copie cachée à ${esc(TH.email||"votre adresse")}`))}

        <div style="display:flex;gap:8px;margin:4px 0 16px">${btn("test","✉️ E-mail de test",false)}${btn("run","▶️ Lancer maintenant",true)}</div>

        ${bloc(`📅 ${c.actif?"Prochain envoi":"Ce qui partirait aujourd'hui"} · ${aEnvoyer.length}`,
          aEnvoyer.length?aEnvoyer.map(ligneApercu).join(""):`<div style="padding:12px 0;font-size:12px;color:#94a3b8">Aucune relance à envoyer aujourd'hui.</div>`)}

        ${sansEmail.length?bloc(`⚠️ Impossible à envoyer · ${sansEmail.length}`,
          `<div style="font-size:11px;color:#b45309;padding-top:6px">Ajoutez une adresse e-mail sur la fiche pour que ces relances partent.</div>`+sansEmail.map(ligneApercu).join("")):""}

        ${bloc(`🕓 Derniers envois · ${RELANCES_LOG.length}`,hist||`<div style="padding:12px 0;font-size:12px;color:#94a3b8">Aucun envoi pour le moment.</div>`)}
      </div>
    </div>
  </div>`;
}

// ── NIVEAUX DE RELANCE ──────────────────────────────────
function niveauRelance(f){
  const retard=Math.abs(daysDiff(f.ech));
  const nb=(f.relances||[]).length;
  if(nb===0&&retard<=15) return 1;
  if(nb<=1&&retard<=30) return 2;
  return 3;
}
function labelRelance(n){return["","1ère relance","2ème relance","Mise en demeure"][n]||"Mise en demeure";}
function colorRelance(n){return["","#b45309","#c2410c","#991b1b"][n]||"#991b1b";}
function bgRelance(n){return["","#fef9c3","#fff7ed","#fef2f2"][n]||"#fef2f2";}
function bordRelance(n){return["","#fcd34d","#fb923c","#fca5a5"][n]||"#fca5a5";}

function texteRelance(f,niveau){
  const cli=CLIENTS.find(c=>c.id===f.clientId)||CLIENTS.find(c=>c.nom===f.client);
  const contact=cli&&cli.contact?cli.contact:"Madame, Monsieur";
  const reste=facReste(f);
  const retard=Math.abs(daysDiff(f.ech));
  const emetteur=TH.nom+(TH.sous?" "+TH.sous:"");
  const email=TH.email||"";
  const tel=TH.tel||"";
  const coordonnees=email||tel?`\n${email}${tel?" · "+tel:""}\n`:"\n";
  if(niveau===1) return `Objet : Relance amiable — Facture ${f.num}\n\nBonjour ${contact},\n\nSauf erreur ou omission de notre part, il nous semble que la facture ${f.num} d'un montant de ${fMoney(reste)} (échéance du ${fDate(f.ech)}) n'a pas encore été réglée.\n\nNous vous remercions de bien vouloir procéder à son règlement dans les meilleurs délais ou de nous contacter si vous avez la moindre question.\n\nCordialement,\n${emetteur}${coordonnees}`;
  if(niveau===2) return `Objet : 2ème relance — Facture ${f.num} impayée\n\nBonjour ${contact},\n\nNous revenons vers vous concernant la facture ${f.num} d'un montant de ${fMoney(reste)}, dont l'échéance est dépassée depuis ${retard} jour(s) (${fDate(f.ech)}).\n\nMalgré notre première relance, nous n'avons pas reçu votre règlement. Merci de procéder au paiement sans délai ou de nous contacter pour convenir d'un arrangement.\n\nÀ défaut de réponse sous 8 jours, nous serons contraints d'engager une procédure de recouvrement.\n\nCordialement,\n${emetteur}${coordonnees}`;
  return `Objet : Mise en demeure — Facture ${f.num}\n\nBonjour ${contact},\n\nEn l'absence de règlement de la facture ${f.num} d'un montant de ${fMoney(reste)} malgré nos relances successives, nous vous mettons en demeure de procéder au paiement de cette somme dans un délai de 8 jours à compter de la réception de ce message.\n\nPassé ce délai, nous nous réservons le droit d'engager toute procédure judiciaire nécessaire au recouvrement de cette créance.\n\nCordialement,\n${emetteur}${coordonnees}`;
}

function modalRelancesImpayes(){
  const enRetard=FACTURES.filter(f=>facEnCompta(f)&&facStatutReel(f)==="retard");
  if(enRetard.length===0){alert("Aucune facture en retard");return;}
  showModal("📨 Relances impayés",`
    <div class="info-box" style="margin-bottom:14px">Sélectionnez une facture pour générer le texte de relance adapté au niveau de retard.</div>
    ${enRetard.map(f=>{
      const reste=facReste(f);
      const retard=Math.abs(daysDiff(f.ech));
      const n=niveauRelance(f);
      const derniereRelance=(f.relances||[]).slice(-1)[0];
      return`<div style="border:1.5px solid ${bordRelance(n)};border-radius:12px;margin-bottom:10px;background:${bgRelance(n)};overflow:hidden">
        <div style="display:flex;align-items:center;gap:10px;padding:12px 14px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-size:13px;font-weight:700;color:${colorRelance(n)}">${f.num} · ${f.client}</span>
              <span style="font-size:10px;font-weight:700;background:${colorRelance(n)};color:#fff;padding:2px 8px;border-radius:20px;text-transform:uppercase">${labelRelance(n)}</span>
            </div>
            <div style="font-size:12px;color:${colorRelance(n)};margin-top:3px">${fMoney(reste)} · Retard de ${retard} jour(s)${derniereRelance?" · Dernière relance : "+fDate(derniereRelance.date):""}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;padding:0 14px 12px;flex-wrap:wrap">
          <button onclick="voirTexteRelance('${f.id}')" style="padding:7px 12px;border-radius:8px;border:1.5px solid ${colorRelance(n)};background:#fff;color:${colorRelance(n)};cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif">📋 Voir & copier</button>
          <button onclick="envoyerRelanceMail('${f.id}')" style="padding:7px 12px;border-radius:8px;border:none;background:${colorRelance(n)};color:#fff;cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif">✉️ Ouvrir dans Mail</button>
          <button onclick="marquerRelanceEnvoyee('${f.id}')" style="padding:7px 12px;border-radius:8px;border:1.5px solid #94a3b8;background:#fff;color:#475569;cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif">✅ Marquer envoyée</button>
        </div>
      </div>`;
    }).join("")}`,
    `<button class="btn-cancel" onclick="closeModal()">Fermer</button>`
  );
}

function voirTexteRelance(id){
  const f=FACTURES.find(x=>x.id===id);if(!f)return;
  const n=niveauRelance(f);
  const texte=texteRelance(f,n);
  const ta=document.createElement("textarea");
  ta.value=texte;ta.style.cssText="width:100%;height:260px;font-size:13px;font-family:'Inter',sans-serif;padding:12px;border-radius:10px;border:1.5px solid #e2e8f0;resize:vertical;line-height:1.6;color:#1A2118;background:#f8fafc";
  const copyBtn=document.createElement("button");
  copyBtn.textContent="📋 Copier le texte";
  copyBtn.style.cssText="margin-top:10px;padding:9px 16px;border-radius:9px;border:none;background:#3286A0;color:#fff;cursor:pointer;font-size:13px;font-weight:700;font-family:'Inter',sans-serif;width:100%";
  copyBtn.onclick=function(){
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(texte).then(()=>{copyBtn.textContent="✅ Copié !";setTimeout(()=>{copyBtn.textContent="📋 Copier le texte";},2000);});
    } else {ta.select();document.execCommand("copy");copyBtn.textContent="✅ Copié !";}
  };
  const wrap=document.createElement("div");wrap.appendChild(ta);wrap.appendChild(copyBtn);
  showModal("📋 "+labelRelance(n)+" — "+f.num,wrap.innerHTML,`<button class="btn-cancel" onclick="closeModal()">Fermer</button>`);
  logActivity("Relance visualisée",f.num);
}

function envoyerRelanceMail(id){
  const f=FACTURES.find(x=>x.id===id);if(!f)return;
  const cli=CLIENTS.find(c=>c.id===f.clientId)||CLIENTS.find(c=>c.nom===f.client);
  const n=niveauRelance(f);
  const texte=texteRelance(f,n);
  const sujet=encodeURIComponent((["","Relance amiable","2ème relance","Mise en demeure"][n]||"Relance")+" — Facture "+f.num);
  const corps=encodeURIComponent(texte);
  const dest=cli&&cli.email?encodeURIComponent(cli.email):"";
  window.open(`mailto:${dest}?subject=${sujet}&body=${corps}`,"_blank");
  logActivity("Relance mail ouvert",f.num);
}

function marquerRelanceEnvoyee(id){
  const f=FACTURES.find(x=>x.id===id);if(!f)return;
  const n=niveauRelance(f);
  if(!f.relances) f.relances=[];
  f.relances.push({date:TODAY,niveau:n,label:labelRelance(n)});
  FACTURES=FACTURES.map(x=>x.id===id?f:x);
  saveData();
  logActivity("Relance marquée envoyée",f.num+" — "+labelRelance(n));
  closeModal();
  setTimeout(()=>modalRelancesImpayes(),100);
}

function copierRelance(id){voirTexteRelance(id);}
function renderTachesList(){
  return TACHES.map((t,i)=>{
    const diff=t.ech?daysDiff(t.ech):null;const urg=diff!==null&&diff<=3&&!t.done;
    return`<div class="tache-row" style="opacity:${t.done?0.4:1};${i===TACHES.length-1?"border-bottom:none":""}">
      <div class="tache-check${t.done?" done":""}" onclick="toggleTache('${t.id}')">${t.done?"✓":""}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:${TH.txt};text-decoration:${t.done?"line-through":"none"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.titre}</div>
        ${t.ech?`<div style="font-size:11px;color:${diff<=0?"#991b1b":urg?"#b45309":TH.txt+"66"};font-weight:${urg?700:400}">${diff<0?`Retard ${Math.abs(diff)}j`:diff===0?"Aujourd'hui":fDate(t.ech)}</div>`:""}
        ${t.notes?`<div style="font-size:11px;color:${TH.txt}66;font-style:italic">${t.notes}</div>`:""}
      </div>
      <div class="prio-dot" style="background:${PR_C[t.prio]};margin-right:6px"></div>
      <button class="btn-sm btn-edit" onclick="modalTache('${t.id}')">✏️</button>
      <button class="btn-sm btn-danger" style="margin-left:4px" onclick="delTache('${t.id}')">🗑️</button>
    </div>`;}).join("");
}
function modalTache(id){
  const t=id?TACHES.find(x=>x.id===id):{id:"",titre:"",ech:"",prio:"moyenne",done:false,notes:""};
  showModal(id?"Modifier la tâche":"Nouvelle tâche",`
    <div class="field"><label>Titre</label><input id="t-titre" value="${t.titre}" placeholder="Ex : Déclarer TVA T2 2026"/></div>
    <div class="field-row">
      <div class="field"><label>Priorité</label><select id="t-prio">${[["haute","Haute"],["moyenne","Moyenne"],["basse","Basse"]].map(([k,l])=>`<option value="${k}"${t.prio===k?" selected":""}>${l}</option>`).join("")}</select></div>
      <div class="field"><label>Échéance</label><input type="date" id="t-ech" value="${t.ech}"/></div>
    </div>
    <div class="field"><label>Notes</label><textarea id="t-notes">${t.notes}</textarea></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="saveTache('${id||""}')">Enregistrer</button>`
  );
}
function saveTache(id){
  const obj={titre:document.getElementById("t-titre").value,ech:document.getElementById("t-ech").value,prio:document.getElementById("t-prio").value,notes:document.getElementById("t-notes").value};
  if(id){TACHES=TACHES.map(t=>t.id===id?{...t,...obj}:t);}else{TACHES.push({...obj,id:uid(),done:false});}
  closeModal();renderPage();renderNav();
}
function delTache(id){confirmDel("Supprimer cette tâche ?",function(){TACHES=TACHES.filter(t=>t.id!==id);renderPage();renderNav();});}
function toggleTache(id){TACHES=TACHES.map(t=>t.id===id?{...t,done:!t.done}:t);const tl=document.getElementById("taches-list");if(tl)tl.innerHTML=renderTachesList();renderNav();}

// ════════════════════════════════════════════════════════
