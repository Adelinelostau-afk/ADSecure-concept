// Même code que dans app.html : signature des e-mails + moteur des relances
export const SigMail=(function(){
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

export const RelancesCore=(function(){
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
