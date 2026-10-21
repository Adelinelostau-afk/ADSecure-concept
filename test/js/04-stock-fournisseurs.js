// ── STOCK & FOURNISSEURS ─────────────────────────────────

// Helpers bons de commande
const BC_STATUTS={
  brouillon:{lbl:"Brouillon",bg:"#f1f5f9",col:"#64748b",icon:"📝"},
  envoyee:  {lbl:"Envoyé",   bg:"#fef3c7",col:"#b45309",icon:"📤"},
  recue:    {lbl:"Reçu",     bg:"#dcfce7",col:"#15803d",icon:"📥"}
};
function bcTotal(c){return (c.lignes||[]).reduce((s,l)=>s+(Number(l.qte)||0)*(Number(l.pu)||0),0);}

// ── Factures fournisseurs ────────────────────────────────────────────────
let FACFOURN=[];
const FF_STATUTS={
  brouillon:{lbl:"Brouillon",bg:"#f1f5f9",col:"#64748b",icon:"📝"},
  a_payer:  {lbl:"À payer",  bg:"#fef3c7",col:"#b45309",icon:"⏳"},
  partiel:  {lbl:"Partiel",  bg:"#e8f4f8",col:"#3286A0",icon:"◐"},
  payee:    {lbl:"Payée",    bg:"#dcfce7",col:"#15803d",icon:"✓"},
  retard:   {lbl:"En retard",bg:"#fee2e2",col:"#991b1b",icon:"⚠️"}
};
function ffTauxTVA(f){ return (f.tva!==undefined&&f.tva!==null)?f.tva:20; }
// Factures reçues : montants saisis (montantHT / montantTVA). Anciennes factures : calcul par lignes.
function ffNouveau(f){ return f.montantHT!==undefined&&f.montantHT!==null&&f.montantHT!==""; }
function ffHT(f){ return ffNouveau(f)?(Number(f.montantHT)||0):(f.lignes||[]).reduce((s,l)=>s+(Number(l.qte)||0)*(Number(l.pu)||0),0); }
function ffTVA(f){ return ffNouveau(f)?(Number(f.montantTVA)||0):Math.round(ffHT(f)*ffTauxTVA(f))/100; }
function ffTTC(f){ return ffNouveau(f)?Math.round((ffHT(f)+ffTVA(f))*100)/100:Math.round(ffHT(f)*(1+ffTauxTVA(f)/100)*100)/100; }
function ffPaye(f){ return (f.paiements||[]).reduce((s,p)=>s+(p.montant||0),0); }
function ffReste(f){ return Math.max(0,Math.round((ffTTC(f)-ffPaye(f))*100)/100); }
function ffEstPayee(f){ return ffReste(f)<=0 && ffTTC(f)>0; }
function ffStatutReel(f){
  if(f.statut==="brouillon") return "brouillon";
  if(ffEstPayee(f)) return "payee";
  if(ffPaye(f)>0) return "partiel";
  if(f.ech && f.ech<getToday()) return "retard";
  return "a_payer";
}
function nextFfRef(){
  const y=new Date().getFullYear();
  const nums=FACFOURN.map(f=>{const m=(f.num||"").match(/FF-\d{4}-(\d+)/);return m?parseInt(m[1]):0;});
  return `FF-${y}-${String((nums.length?Math.max(...nums):0)+1).padStart(3,"0")}`;
}
function nextBcRef(){
  const y=new Date().getFullYear();
  const nums=COMMANDES.map(c=>{const m=(c.ref||"").match(/BC-\d{4}-(\d+)/);return m?parseInt(m[1]):0;});
  const max=nums.length?Math.max(...nums):0;
  return `BC-${y}-${String(max+1).padStart(3,"0")}`;
}
// ════════════════════════════════════════════════════════
function renderStock(){
  const alertes=STOCK.filter(s=>s.qte<s.seuil);
  return `
    <div class="kpi-grid">
      ${kpi("Catalogue",CATALOGUE.length,TH.c1)}
      ${kpi("Bons de commande",COMMANDES.length,TH.c1)}
      ${kpi("En attente",COMMANDES.filter(c=>c.statut==="envoyee").length,"#b45309")}
      ${kpi("Références stock",STOCK.length,TH.c1)}
      ${kpi("Alertes",alertes.length,"#991b1b")}
    </div>
    <!-- Catalogue produits -->
    ${renderCatalogueSection()}
    <!-- Fournisseurs -->
    <div class="section-card" style="background:${TH.card}">
      <div class="section-head">
        <div><div class="section-title" style="color:${TH.txt}">Fournisseurs</div><div class="section-sub">${FOURNISSEURS.length} enregistrés</div></div>
        <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="modalFour()">＋ Nouveau fournisseur</button>
      </div>
      <div style="overflow-x:auto">
        <table>
          <thead style="background:${TH.bg}"><tr>
            <th style="color:${TH.txt}77">Nom</th><th style="color:${TH.txt}77">Contact</th><th style="color:${TH.txt}77">Téléphone</th>
            <th style="color:${TH.txt}77">Catégorie</th><th style="color:${TH.txt}77">Notes</th><th style="color:${TH.txt}77">Actions</th>
          </tr></thead>
          <tbody>${FOURNISSEURS.map(f=>`<tr>
            <td style="font-weight:700;color:${TH.txt}">${f.nom}</td>
            <td style="color:${TH.txt}BB;font-size:12px">${f.contact}</td>
            <td style="color:${TH.txt}BB;font-size:12px">${f.tel}</td>
            <td>${badge(f.cat,TH.c1+"18",TH.c1)}</td>
            <td style="color:${TH.txt}BB;font-size:12px;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.notes||"—"}</td>
            <td style="white-space:nowrap">
              <button class="btn-sm btn-edit" onclick="modalFour('${f.id}')">✏️</button>
              <button class="btn-sm btn-danger" style="margin-left:4px" onclick="delFour('${f.id}')">🗑️</button>
            </td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </div>
    <!-- Bons de commande -->
    <div class="section-card" style="background:${TH.card}">
      <div class="section-head">
        <div><div class="section-title" style="color:${TH.txt}">Bons de commande</div><div class="section-sub">${COMMANDES.length} bon(s) · ${fMoney(COMMANDES.reduce((s,c)=>s+bcTotal(c),0))} au total</div></div>
        <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="modalBC()">＋ Nouveau bon</button>
      </div>
      <div style="overflow-x:auto">
        <table>
          <thead style="background:${TH.bg}"><tr>
            <th style="color:${TH.txt}77">Référence</th><th style="color:${TH.txt}77">Fournisseur</th><th style="color:${TH.txt}77">Date</th>
            <th style="color:${TH.txt}77">Articles</th><th style="color:${TH.txt}77">Montant</th><th style="color:${TH.txt}77">Statut</th><th style="color:${TH.txt}77">Actions</th>
          </tr></thead>
          <tbody>${COMMANDES.length===0?`<tr><td colspan="7" style="text-align:center;color:${TH.txt}55;padding:24px;font-size:13px">Aucun bon de commande. Cliquez sur « Nouveau bon » pour en créer un.</td></tr>`:COMMANDES.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(c=>{
            const st=BC_STATUTS[c.statut]||BC_STATUTS.brouillon;
            const nbArt=(c.lignes||[]).length;
            return`<tr>
              <td style="font-weight:700;color:${TH.c1};cursor:pointer;text-decoration:underline" onclick="modalBC('${c.id}')">${c.ref}</td>
              <td style="color:${TH.txt}BB;font-size:12px">${c.four}</td>
              <td style="color:${TH.txt}BB;font-size:12px">${fDate(c.date)}</td>
              <td style="color:${TH.txt}BB;font-size:12px">${nbArt} article${nbArt>1?"s":""}</td>
              <td style="font-weight:700;color:${TH.txt}">${fMoney(bcTotal(c))}</td>
              <td>${badge(st.icon+" "+st.lbl,st.bg,st.col)}</td>
              <td style="white-space:nowrap">
                <button class="btn-sm" style="background:#eff6ff;color:#1d4ed8;border:1.5px solid #bfdbfe" onclick="genererBonCommandePDF('${c.id}')" title="PDF">📄</button>
                ${c.statut==="recue"?`<button class="btn-sm" style="margin-left:4px;background:#fffbeb;color:#b45309;border:1.5px solid #fde68a" onclick="bcVersFactureFournisseur('${c.id}')" title="Enregistrer la facture reçue pour ce bon">🧾</button>`:""}
                <button class="btn-sm btn-edit" style="margin-left:4px" onclick="modalBC('${c.id}')">✏️</button>
                <button class="btn-sm btn-danger" style="margin-left:4px" onclick="delBC('${c.id}')">🗑️</button>
              </td>
            </tr>`;}).join("")}</tbody>
        </table>
      </div>
    </div>
    <!-- Stock -->
    <div class="section-card" style="background:${TH.card}">
      <div class="section-head">
        <div><div class="section-title" style="color:${TH.txt}">Stock de fournitures</div><div class="section-sub">${alertes.length} produit(s) en alerte</div></div>
        <div style="display:flex;gap:8px">
          <button class="btn-add" style="background:#fff;color:${TH.c1};border:1.5px solid ${TH.c1}" onclick="openPanelConfig()">⚙️ Catégories</button>
          <button class="btn-add" style="background:${TH.c1};color:#fff" onclick="modalStock()">＋ Nouveau produit</button>
        </div>
      </div>
      <div style="padding:8px 0">
        ${STOCK.map(s=>{
          const ratio=Math.min(1,s.qte/s.seuil);
          const pct=ratio*100;
          const col=s.qte===0?"#991b1b":ratio<0.5?"#c2410c":ratio<1?"#b45309":"#15803d";
          const lbl=s.qte===0?"Rupture":ratio<1?"Alerte":"OK";
          return`<div style="padding:12px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:14px">
            <!-- Info -->
            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div>
                  <span style="font-weight:700;font-size:13px;color:${TH.txt}">${s.nom}</span>
                  <span style="font-size:11px;color:${TH.txt}66;margin-left:8px">${s.ref}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
                  <span style="font-size:12px;font-weight:700;color:${col}">${s.qte} / ${s.seuil} ${s.unite}</span>
                  ${badge(lbl,col+"20",col)}
                </div>
              </div>
              ${(()=>{const revient=s.prixRevient||s.prixAchat||0;const marge=(s.prix||0)-revient;const margeCol=marge>0?"#15803d":marge<0?"#991b1b":"#94a3b8";const fours=(s.fournisseurs&&s.fournisseurs.length)?s.fournisseurs.join(", "):(s.four||"—");return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:11px;color:${TH.txt}77"><span>🏷️ ${fours}</span><span style="font-weight:700;color:${margeCol}">Marge : ${fMoney(marge)}</span></div>`;})()}
              <!-- Jauge -->
              <div style="height:10px;background:#e2e8f0;border-radius:6px;overflow:hidden;position:relative">
                <div style="height:100%;width:${Math.min(100,pct)}%;background:${col};border-radius:6px;transition:width 0.5s ease;position:relative">
                  ${pct>15?`<div style="position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:9px;font-weight:700;color:#fff">${Math.round(pct)}%</div>`:""}
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:${TH.txt}55">
                <span>0</span>
                <span style="color:${col}66">Seuil: ${s.seuil}</span>
                <span>${Math.round(s.seuil*2)}</span>
              </div>
            </div>
            <!-- Actions -->
            <div style="display:flex;gap:5px;flex-shrink:0">
              <button class="btn-sm btn-edit" onclick="modalStock('${s.id}')">✏️</button>
              <button class="btn-sm btn-danger" onclick="delStock('${s.id}')">🗑️</button>
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
}
function modalFour(id){
  const f=id?FOURNISSEURS.find(x=>x.id===id):{id:"",nom:"",contact:"",tel:"",email:"",cat:"Emballage",notes:""};
  showModal(id?"Modifier le fournisseur":"Nouveau fournisseur",`
    <div class="field-row">
      <div class="field"><label>Nom</label><input id="f-nom" value="${f.nom}"/></div>
      <div class="field"><label>Catégorie</label><select id="f-cat">${CAT_STOCK.map(x=>`<option${f.cat===x?" selected":""}>${x}</option>`).join("")}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Contact</label><input id="f-contact" value="${f.contact}"/></div>
      <div class="field"><label>Téléphone</label><input id="f-tel" value="${f.tel}"/></div>
    </div>
    <div class="field"><label>Email</label><input id="f-email" value="${f.email||""}"/></div>
    <div class="field"><label>Notes</label><textarea id="f-notes">${f.notes}</textarea></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="saveFour('${id||""}')">Enregistrer</button>`
  );
}
function saveFour(id){
  const obj={nom:document.getElementById("f-nom").value,contact:document.getElementById("f-contact").value,tel:document.getElementById("f-tel").value,email:document.getElementById("f-email").value,cat:document.getElementById("f-cat").value,notes:document.getElementById("f-notes").value};
  if(!obj.nom.trim()){alert("Le nom est obligatoire.");return;}
  if(id){FOURNISSEURS=FOURNISSEURS.map(f=>f.id===id?{...f,...obj}:f);}else{FOURNISSEURS.push({...obj,id:uid()});}
  saveData();closeModal();renderPage();
}
function delFour(id){confirmDel("Supprimer ce fournisseur ?",function(){FOURNISSEURS=FOURNISSEURS.filter(f=>f.id!==id);saveData();renderPage();});}

// ══════════════════════════════════════════════════════════
// ── BONS DE COMMANDE FOURNISSEURS ──────────────────────────
// ══════════════════════════════════════════════════════════
let bcDraftLignes=[]; // lignes en cours d'édition dans le modal

function modalBC(id){
  const c=id?COMMANDES.find(x=>x.id===id):null;
  bcDraftLignes=c?JSON.parse(JSON.stringify(c.lignes||[])):[{ref:"",desc:"",qte:1,pu:0}];
  if(bcDraftLignes.length===0)bcDraftLignes=[{ref:"",desc:"",qte:1,pu:0}];
  const fourNom=c?c.four:(FOURNISSEURS[0]?.nom||"");
  const ref=c?c.ref:nextBcRef();
  const date=c?c.date:getToday();
  const statut=c?c.statut:"brouillon";
  const notes=c?(c.notes||""):"";
  showModal(id?"Modifier le bon de commande":"Nouveau bon de commande",`
    <div class="field-row">
      <div class="field"><label>Référence</label><input id="bc-ref" value="${ref}"/></div>
      <div class="field"><label>Date</label><input type="date" id="bc-date" value="${date}"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Fournisseur</label><select id="bc-four">${FOURNISSEURS.map(f=>`<option${fourNom===f.nom?" selected":""}>${f.nom}</option>`).join("")}</select></div>
      <div class="field"><label>Statut</label><select id="bc-statut">${Object.entries(BC_STATUTS).map(([k,v])=>`<option value="${k}"${statut===k?" selected":""}>${v.icon} ${v.lbl}</option>`).join("")}</select></div>
    </div>
    <div class="field">
      <label>Articles</label>
      <div id="bc-lignes"></div>
      <button onclick="bcAddLigne()" style="margin-top:8px;padding:8px 12px;border-radius:8px;border:1.5px dashed ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif;width:100%">＋ Ajouter un article</button>
    </div>
    <div style="text-align:right;font-size:14px;margin-top:6px;color:${TH.txt}">Total : <strong id="bc-total" style="color:${TH.c1};font-size:16px">—</strong></div>
    <div class="field"><label>Notes</label><textarea id="bc-notes" placeholder="Instructions de livraison, conditions…">${notes}</textarea></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="saveBC('${id||""}')">Enregistrer</button>`
  );
  bcRenderLignes();
}
function bcRenderLignes(){
  const box=document.getElementById("bc-lignes");if(!box)return;
  // Liste des produits du stock pour autocomplétion
  const opts=STOCK.map(s=>`<option value="${s.ref}">${s.nom}</option>`).join("");
  box.innerHTML=bcDraftLignes.map((l,i)=>`
    <div style="display:flex;gap:6px;margin-bottom:6px;align-items:center">
      <input list="bc-stock-list" value="${(l.ref||"").replace(/"/g,"&quot;")}" placeholder="Réf" onchange="bcPickRef(${i},this.value)" oninput="bcSetLigne(${i},'ref',this.value)" style="width:80px;padding:8px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:12px"/>
      <input value="${(l.desc||"").replace(/"/g,"&quot;")}" placeholder="Désignation" oninput="bcSetLigne(${i},'desc',this.value)" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:12px"/>
      <input type="number" min="0" step="any" value="${l.qte}" placeholder="Qté" oninput="bcSetLigne(${i},'qte',this.value)" style="width:60px;padding:8px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:12px"/>
      <input type="number" min="0" step="0.01" value="${l.pu}" placeholder="P.U." oninput="bcSetLigne(${i},'pu',this.value)" style="width:74px;padding:8px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:12px"/>
      <button onclick="bcDelLigne(${i})" style="width:30px;height:34px;border:1.5px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:7px;cursor:pointer;font-size:12px;flex-shrink:0">✕</button>
    </div>`).join("")+`<datalist id="bc-stock-list">${opts}</datalist>`;
  bcUpdTotal();
}
function bcUpdTotal(){
  const t=bcDraftLignes.reduce((s,l)=>s+(Number(l.qte)||0)*(Number(l.pu)||0),0);
  const el=document.getElementById("bc-total");if(el)el.textContent=fMoney(t);
}
function bcSetLigne(i,k,v){bcDraftLignes[i][k]=(k==="qte"||k==="pu")?Number(v):v;bcUpdTotal();}
function bcPickRef(i,ref){
  const s=STOCK.find(x=>x.ref===ref);
  if(s){bcDraftLignes[i].desc=s.nom;bcDraftLignes[i].pu=s.prixAchat||s.prix;bcRenderLignes();}
}
function bcAddLigne(){bcDraftLignes.push({ref:"",desc:"",qte:1,pu:0});bcRenderLignes();}
function bcDelLigne(i){bcDraftLignes.splice(i,1);if(bcDraftLignes.length===0)bcDraftLignes.push({ref:"",desc:"",qte:1,pu:0});bcRenderLignes();}
function saveBC(id){
  const ref=document.getElementById("bc-ref").value.trim();
  const four=document.getElementById("bc-four").value;
  const date=document.getElementById("bc-date").value;
  const statut=document.getElementById("bc-statut").value;
  const notes=document.getElementById("bc-notes").value;
  const lignes=bcDraftLignes.filter(l=>(l.desc||l.ref)&&Number(l.qte)>0);
  if(!ref){alert("La référence est obligatoire.");return;}
  if(lignes.length===0){alert("Ajoutez au moins un article.");return;}
  const ancien=id?COMMANDES.find(x=>x.id===id):null;
  const ancienStatut=ancien?ancien.statut:null;
  const obj={ref,four,date,statut,notes,lignes};
  if(id){COMMANDES=COMMANDES.map(c=>c.id===id?{...c,...obj}:c);}
  else{COMMANDES.push({...obj,id:uid()});}
  // Intégration stock : si le bon passe à "Reçu", proposer d'ajouter les quantités au stock
  if(statut==="recue" && ancienStatut!=="recue"){
    closeModal();
    proposerReceptionStock(lignes,ref);
    return;
  }
  logActivity("Bon de commande",`${id?"Modifié":"Créé"} : ${ref}`);
  closeModal();renderPage();
}
function delBC(id){
  const c=COMMANDES.find(x=>x.id===id);
  confirmDel(`Supprimer le bon ${c?c.ref:""} ?`,function(){COMMANDES=COMMANDES.filter(x=>x.id!==id);renderPage();});
}

// ══════════════════════════════════════════════════════════
// ── FACTURES FOURNISSEURS ─────────────────────────────────
// ══════════════════════════════════════════════════════════
let ffDraftLignes=[];
let ffFilter="actives";
let ffCatFiltre="";
let ffRecherche="";

// Catégories de dépenses (personnalisables : TH.ffCats)
const FF_CATS_DEFAUT=["Achats de matériel","Sous-traitance","Carburant et déplacements","Véhicules (entretien, location)","Loyer et charges locatives","Électricité et eau","Téléphone et internet","Logiciels et abonnements","Assurances","Honoraires (comptable, juridique)","Banque et frais financiers","Publicité et communication","Fournitures et petit équipement","Entretien et réparations","Formation","Impôts et taxes","Autre"];
function ffCats(){ return (TH.ffCats&&TH.ffCats.length)?TH.ffCats:FF_CATS_DEFAUT.slice(); }
function ffEsc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ffNum(v){ return Math.round((parseFloat(String(v==null?"":v).replace(/\s/g,"").replace(",","."))||0)*100)/100; }

// ── Réception d'une facture fournisseur (on la reçoit, on ne la crée pas) ──
function modalFF(id,bcId){
  const f=id?FACFOURN.find(x=>x.id===id):null;
  const bc=bcId?COMMANDES.find(c=>c.id===bcId):null;
  const src=f||{num:nextFfRef(),numFour:"",four:bc?bc.four:"",bcId:bc?bc.id:"",bcRef:bc?bc.ref:"",
    date:getToday(),ech:addDays(getToday(),30),cat:bc?"Achats de matériel":"",
    montantHT:bc?Math.round(bcTotal(bc)*100)/100:"",tva:TVA_DEFAUT,montantTVA:"",notes:"",paiements:[]};
  const ht=f?ffHT(f):src.montantHT;
  const taux=ffTauxTVA(src);
  const tvaEur=f?ffTVA(f):(src.montantHT!==""?Math.round(Number(src.montantHT)*taux)/100:"");
  const cats=ffCats(); if(src.cat&&!cats.includes(src.cat)) cats.push(src.cat);
  const bcsFour=COMMANDES.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const ancienne=f&&!ffNouveau(f)&&(f.lignes||[]).length;
  showModal(id?`Facture reçue — ${ffEsc(src.numFour||src.num)}`:(bc?`Facture reçue pour le bon ${ffEsc(bc.ref)}`:"📥 Réceptionner une facture fournisseur"),`
    <div class="field"><label>Facture (PDF ou photo, ${DOCS_MAX_MO} Mo max)</label>
      ${src.piece?`<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:${TH.bg};border-radius:9px;margin-bottom:8px;font-size:12.5px">
        <span style="font-size:18px">${(src.piece.type||"").startsWith("image/")?"🖼️":"📄"}</span>
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ffEsc(src.piece.nom||"Facture")}${src.piece.taille?" · "+fTaille(src.piece.taille):""}</span>
        <button type="button" class="btn-sm" style="border-color:#93c5fd;background:#eff6ff;color:#1d4ed8" onclick="ffVoirPiece('${f.id}')">👁️ Voir</button>
      </div><div style="font-size:11px;color:${TH.txt}77;margin-bottom:6px">Choisir un autre fichier remplacera celui-ci.</div>`:""}
      <input type="file" id="ff-file" accept="application/pdf,image/*"/></div>
    <div class="field"><label>Fournisseur</label>
      <input id="ff-four" list="ff-four-liste" value="${ffEsc(src.four||"")}" placeholder="Nom du fournisseur" autocomplete="off"/>
      <datalist id="ff-four-liste">${FOURNISSEURS.map(x=>`<option value="${ffEsc(x.nom)}"></option>`).join("")}</datalist></div>
    <div class="field-row">
      <div class="field"><label>N° de la facture</label><input id="ff-numfour" value="${ffEsc(src.numFour||"")}" placeholder="Numéro indiqué sur la facture"/></div>
      <div class="field"><label>Catégorie</label>
        <select id="ff-cat" onchange="ffCatChange(this)">
          <option value="">— Choisir —</option>
          ${cats.map(c=>`<option value="${ffEsc(c)}"${src.cat===c?" selected":""}>${ffEsc(c)}</option>`).join("")}
          <option value="__new">＋ Nouvelle catégorie…</option>
        </select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Date de la facture</label><input type="date" id="ff-date" value="${src.date||""}"/></div>
      <div class="field"><label>Échéance</label><input type="date" id="ff-ech" value="${src.ech||""}"/></div>
    </div>
    ${ancienne?`<div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:9px;padding:9px 13px;margin-bottom:12px;font-size:12px;color:#92400e">Facture saisie avec l'ancienne méthode (${f.lignes.length} ligne(s)). Les montants ci-dessous en sont repris ; en enregistrant, ils remplaceront les lignes.</div>`:""}
    <div class="field-row">
      <div class="field"><label>Montant HT (€)</label><input type="text" inputmode="decimal" id="ff-ht" value="${ht===""?"":ht}" oninput="ffCalc('ht')" placeholder="0,00"/></div>
      <div class="field"><label>Taux TVA</label>
        <select id="ff-taux" onchange="ffCalc('taux')">${[...new Set([taux,8.5,2.1,0,20,10,5.5])].map(t=>`<option value="${t}"${t===taux?" selected":""}>${fTaux(t)}</option>`).join("")}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>TVA (€)</label><input type="text" inputmode="decimal" id="ff-tvaeur" value="${tvaEur===""?"":tvaEur}" oninput="ffCalc('tva')" placeholder="0,00"/></div>
      <div class="field"><label>Total TTC (€)</label><input type="text" inputmode="decimal" id="ff-ttc" value="" oninput="ffCalc('ttc')" placeholder="0,00"/></div>
    </div>
    <div style="font-size:11px;color:${TH.txt}77;margin:-4px 0 12px">Saisissez le HT ou directement le TTC : le reste se calcule. La TVA reste modifiable pour coller au centime près à la facture.</div>
    <div class="field"><label>Bon de commande lié (optionnel)</label>
      <select id="ff-bc"><option value="">— Aucun —</option>${bcsFour.map(c=>`<option value="${c.id}"${src.bcId===c.id?" selected":""}>${ffEsc(c.ref)} · ${ffEsc(c.four||"")} · ${fMoney(bcTotal(c))}</option>`).join("")}</select></div>
    ${!id?`<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin:4px 0 8px;cursor:pointer"><input type="checkbox" id="ff-dejapaye" onchange="document.getElementById('ff-paye-box').style.display=this.checked?'flex':'none'" style="width:18px;height:18px"/> Déjà réglée (prélèvement, CB, payée sur place…)</label>
    <div id="ff-paye-box" class="field-row" style="display:none">
      <div class="field"><label>Date du règlement</label><input type="date" id="ff-paye-date" value="${getToday()}"/></div>
      <div class="field"><label>Mode</label><select id="ff-paye-mode">${["Prélèvement","CB","Virement","Chèque","Espèces"].map(m=>`<option>${m}</option>`).join("")}</select></div>
    </div>`:""}
    <div class="field"><label>Notes</label><textarea id="ff-notes" placeholder="Ex : chantier concerné, remarque…">${ffEsc(src.notes||"")}</textarea></div>
    <div style="font-size:11px;color:${TH.txt}66">N° interne : ${ffEsc(src.num)}</div>
    <div id="ff-msg" style="display:none;margin-top:12px;padding:10px 12px;border-radius:9px;font-size:13px"></div>`,
    `${id?`<button class="btn-cancel" style="color:#991b1b;border-color:#fecaca" onclick="delFF('${id}')">🗑 Supprimer</button>`:""}
     <button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" id="ff-btn" style="background:${TH.c1}" onclick="saveFF('${id||""}','${bcId||""}')">📥 Enregistrer</button>`
  );
  if(ht!=="") ffCalc("tva");
}
function ffCalc(source){
  const g=k=>document.getElementById(k);
  const ht=g("ff-ht"),tv=g("ff-tvaeur"),ttc=g("ff-ttc"),tx=g("ff-taux");if(!ht||!tv||!ttc||!tx)return;
  const taux=Number(tx.value)||0;
  const fmt=n=>String(Math.round(n*100)/100).replace(".",",");
  if(source==="ht"||source==="taux"){
    if(ht.value.trim()===""&&source==="taux"&&ttc.value.trim()!==""){ source="ttc"; }
    else{ const h=ffNum(ht.value); tv.value=fmt(h*taux/100); ttc.value=fmt(h+ffNum(tv.value)); return; }
  }
  if(source==="ttc"){ const t=ffNum(ttc.value); const h=Math.round(t/(1+taux/100)*100)/100; ht.value=fmt(h); tv.value=fmt(t-h); return; }
  if(source==="tva"){ ttc.value=fmt(ffNum(ht.value)+ffNum(tv.value)); return; }
}
function ffCatChange(sel){
  if(sel.value!=="__new") return;
  const nom=(prompt("Nom de la nouvelle catégorie :")||"").trim();
  if(!nom){ sel.value=""; return; }
  const l=ffCats(); if(!l.includes(nom)){ const i=l.indexOf("Autre"); if(i>=0) l.splice(i,0,nom); else l.push(nom); TH.ffCats=l; }
  const opt=document.createElement("option"); opt.value=nom; opt.textContent=nom;
  sel.insertBefore(opt,sel.querySelector('option[value="__new"]')); sel.value=nom;
}
function ffMsg(t){const b=document.getElementById("ff-msg");if(!b)return;b.style.display="block";b.textContent=t;b.style.background="#fef2f2";b.style.color="#991b1b";b.style.border="1.5px solid #fca5a5";}
async function saveFF(id,bcId){
  const g=k=>document.getElementById(k);
  const four=g("ff-four").value.trim();
  if(!four){ffMsg("Indiquez le fournisseur.");return;}
  const ht=ffNum(g("ff-ht").value), tvaEur=ffNum(g("ff-tvaeur").value);
  if(ht+tvaEur<=0){ffMsg("Indiquez le montant de la facture.");return;}
  const cat=g("ff-cat").value==="__new"?"":g("ff-cat").value;
  if(!cat){ffMsg("Choisissez une catégorie.");return;}
  const ancien=id?FACFOURN.find(x=>x.id===id):null;
  const bcSel=g("ff-bc").value; const bc=bcSel?COMMANDES.find(c=>c.id===bcSel):null;
  const obj={
    numFour:g("ff-numfour").value.trim(), four, cat,
    date:g("ff-date").value||getToday(), ech:g("ff-ech").value||"",
    montantHT:ht, montantTVA:tvaEur, tva:Number(g("ff-taux").value)||0,
    statut:"a_payer", bcId:bc?bc.id:"", bcRef:bc?bc.ref:"",
    notes:g("ff-notes").value.trim(), lignes:[]
  };
  const fid=ancien?ancien.id:uid();
  const fichier=g("ff-file").files[0];
  if(fichier){
    if(fichier.size>DOCS_MAX_MO*1048576){ffMsg(`Fichier trop lourd (${fTaille(fichier.size)}). Maximum ${DOCS_MAX_MO} Mo.`);return;}
    if(!currentUser||!currentUser.tenant_id){ffMsg("Session invalide, reconnectez-vous.");return;}
    const btn=g("ff-btn");if(btn){btn.disabled=true;btn.textContent="⟳ Envoi de la facture…";}
    const ext=(fichier.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"");
    const path=`${currentUser.tenant_id}/factures-fournisseurs/${fid}-${Date.now()}.${ext}`;
    try{
      const {error}=await sbClient.storage.from(DOCS_BUCKET).upload(path,fichier,{contentType:fichier.type||"application/octet-stream",upsert:false});
      if(error) throw error;
      if(ancien&&ancien.piece&&ancien.piece.path) sbClient.storage.from(DOCS_BUCKET).remove([ancien.piece.path]).catch(()=>{});
      obj.piece={path,nom:fichier.name,type:fichier.type,taille:fichier.size};
    }catch(e){
      ffMsg("Envoi du fichier impossible : "+(e.message||e));
      if(btn){btn.disabled=false;btn.textContent="📥 Enregistrer";}
      return;
    }
  }
  // fournisseur inconnu : on l'ajoute à la liste des fournisseurs
  if(!FOURNISSEURS.some(x=>(x.nom||"").toLowerCase()===four.toLowerCase())){
    FOURNISSEURS.push({id:uid(),nom:four,contact:"",tel:"",cat:cat,notes:"Ajouté depuis une facture reçue"});
  }
  if(ancien){ Object.assign(ancien,obj); }
  else{
    const nv={...obj,id:fid,num:nextFfRef(),recueLe:getToday(),paiements:[]};
    if(g("ff-dejapaye")&&g("ff-dejapaye").checked){
      nv.paiements.push({date:g("ff-paye-date").value||getToday(),montant:ffTTC(nv),mode:g("ff-paye-mode").value});
    }
    FACFOURN.push(nv);
  }
  logActivity("Facture fournisseur",`${ancien?"Modifiée":"Reçue"} : ${obj.numFour||""} — ${four} · ${fMoney(ht+tvaEur)} (${cat})`);
  saveData();closeModal();renderPage();renderNav();
}
async function ffVoirPiece(id){
  const f=FACFOURN.find(x=>x.id===id);if(!f||!f.piece)return;
  const {data,error}=await sbClient.storage.from(DOCS_BUCKET).createSignedUrl(f.piece.path,3600);
  if(error||!data){alert("Impossible d'ouvrir la facture : "+(error?error.message:"introuvable"));return;}
  window.open(data.signedUrl,"_blank");
}

// Met à jour le prix d'achat des produits du stock d'après les lignes facturées
function majPrixAchatDepuisFF(ff){
  const maj=[];
  (ff.lignes||[]).forEach(l=>{
    const pu=Number(l.pu)||0;if(pu<=0)return;
    const s=STOCK.find(x=>(l.ref&&x.ref===l.ref)||(x.nom||"").toLowerCase()===(l.desc||"").toLowerCase());
    if(s && Math.abs((s.prixAchat||0)-pu)>0.001) maj.push({s,ancien:s.prixAchat||0,nouveau:pu});
  });
  if(maj.length===0){saveData();renderPage();renderNav();return;}
  showModal("💶 Mise à jour des prix d'achat",
    `<p style="font-size:13.5px;color:${TH.txt}BB;line-height:1.6;margin-bottom:12px">Les prix facturés diffèrent des prix d'achat enregistrés. Mettre à jour la fiche produit ?</p>
     ${maj.map((m,i)=>`<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;margin-bottom:7px;font-size:13px;cursor:pointer;min-height:44px;box-sizing:border-box">
       <input type="checkbox" class="ffmaj-cb" data-i="${i}" checked style="width:20px;height:20px;min-width:20px;flex:none;accent-color:${TH.c1}"/>
       <span style="min-width:0;overflow-wrap:anywhere"><strong>${m.s.nom}</strong><br/><span style="color:${TH.txt}88">${fMoney(m.ancien)} → <strong style="color:${TH.c1}">${fMoney(m.nouveau)}</strong></span></span>
     </label>`).join("")}
     <p style="font-size:11.5px;color:${TH.txt}77;margin-top:10px">Le prix de revient suivra le prix d'achat s'il n'a pas été personnalisé.</p>`,
    `<button class="btn-cancel" onclick="closeModal();renderPage();renderNav()">Ignorer</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="appliquerMajPrixAchat()">Mettre à jour</button>`
  );
  window._ffMaj=maj;
}
function appliquerMajPrixAchat(){
  const maj=window._ffMaj||[];
  Array.from(document.querySelectorAll(".ffmaj-cb:checked")).forEach(cb=>{
    const m=maj[Number(cb.dataset.i)];if(!m)return;
    const suitAchat=!m.s.prixRevient||Math.abs(m.s.prixRevient-m.ancien)<0.001;
    m.s.prixAchat=m.nouveau;
    if(suitAchat)m.s.prixRevient=m.nouveau;
  });
  window._ffMaj=null;
  saveData();closeModal();renderPage();renderNav();
}

function bcVersFactureFournisseur(bcId){
  const c=COMMANDES.find(x=>x.id===bcId);if(!c)return;
  const deja=FACFOURN.find(f=>f.bcId===bcId);
  if(deja && !confirm(`La facture ${deja.num} existe déjà pour ce bon. En créer une autre ?`))return;
  modalFF("",bcId);
}
function delFF(id){
  const f=FACFOURN.find(x=>x.id===id);
  confirmDel(`Supprimer la facture ${f?(f.numFour||f.num):""} ?`,function(){
    if(f&&f.piece&&f.piece.path) sbClient.storage.from(DOCS_BUCKET).remove([f.piece.path]).catch(()=>{});
    if(f) (f.paiements||[]).forEach(p=>{if(p.qontoId&&RAPPRO[p.qontoId])delete RAPPRO[p.qontoId];});
    FACFOURN=FACFOURN.filter(x=>x.id!==id);saveData();closeModal();renderPage();renderNav();});
}

// ── Règlements fournisseurs ───────────────────────────────
function modalPaiementFF(id){
  const f=FACFOURN.find(x=>x.id===id);if(!f)return;
  const ttc=ffTTC(f),paye=ffPaye(f),reste=ffReste(f);
  const histo=f.paiements||[];
  showModal(`Règlement — ${f.num}`,`
    <div style="background:${TH.bg};border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span style="color:${TH.txt}99">Total facture</span><span style="font-weight:700">${fMoney(ttc)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span style="color:${TH.txt}99">Déjà réglé</span><span style="font-weight:700;color:#15803d">${fMoney(paye)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:15px;padding-top:7px;border-top:1px solid ${TH.txt}22"><span style="font-weight:700">Reste à payer</span><span style="font-weight:800;color:#b45309">${fMoney(reste)}</span></div>
    </div>
    ${histo.length>0?`<div style="margin-bottom:16px">
      <label style="display:block;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${TH.txt}88;margin-bottom:7px">Historique</label>
      ${histo.map((p,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f8fafc;border-radius:8px;margin-bottom:5px;font-size:12.5px">
        <span>${fDate(p.date)} · ${p.mode||"—"}${p.qontoId?` · <span style="color:#15803d;font-weight:700">🔗 banque</span>`:""}</span>
        <span style="display:flex;align-items:center;gap:8px"><strong>${fMoney(p.montant)}</strong>
        <button onclick="delPaiementFF('${id}',${i})" style="border:none;background:transparent;color:#991b1b;cursor:pointer;font-size:13px;padding:4px">🗑️</button></span>
      </div>`).join("")}
    </div>`:""}
    <div class="field-row">
      <div class="field"><label>Date</label><input type="date" id="pff-date" value="${getToday()}"/></div>
      <div class="field"><label>Montant (€)</label><input type="number" id="pff-montant" value="${reste}" step="0.01" min="0"/></div>
    </div>
    <div class="field"><label>Mode</label><select id="pff-mode">${["Virement","Prélèvement","Chèque","CB","Espèces"].map(m=>`<option>${m}</option>`).join("")}</select></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Fermer</button>
     <button class="btn-save" style="background:#15803d" onclick="addPaiementFF('${id}')">Enregistrer le règlement</button>`
  );
}
function addPaiementFF(id){
  const f=FACFOURN.find(x=>x.id===id);if(!f)return;
  const montant=Number(document.getElementById("pff-montant").value)||0;
  if(montant<=0){alert("Montant invalide.");return;}
  if(!f.paiements)f.paiements=[];
  f.paiements.push({date:document.getElementById("pff-date").value,montant,mode:document.getElementById("pff-mode").value});
  logActivity("Règlement fournisseur",`${f.num} — ${fMoney(montant)}`);
  saveData();closeModal();renderPage();renderNav();
}
function delPaiementFF(id,i){
  const f=FACFOURN.find(x=>x.id===id);if(!f)return;
  const p=f.paiements[i];
  if(p&&p.qontoId){
    if(!confirm("Ce règlement est rapproché d'une opération bancaire. Le supprimer remettra l'opération « à rapprocher ». Continuer ?"))return;
    delete RAPPRO[p.qontoId];
  }
  f.paiements.splice(i,1);saveData();modalPaiementFF(id);
}
// À la réception : proposer d'incrémenter le stock
function proposerReceptionStock(lignes,ref){
  const liees=lignes.filter(l=>l.ref&&STOCK.find(s=>s.ref===l.ref));
  if(liees.length===0){logActivity("Bon de commande",`Reçu : ${ref}`);renderPage();return;}
  showModal("📥 Réception — mise à jour du stock",
    `<p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:12px">Le bon <strong>${ref}</strong> est marqué « Reçu ». Voulez-vous ajouter les quantités reçues au stock ?</p>
     <div style="background:#f8fafc;border-radius:10px;padding:12px">
       ${liees.map(l=>{const s=STOCK.find(x=>x.ref===l.ref);return`<div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid #eef2f7"><span>${s.nom}</span><span style="font-weight:700;color:#15803d">${s.qte} → ${s.qte+Number(l.qte)} ${s.unite}</span></div>`;}).join("")}
     </div>`,
    `<button class="btn-cancel" onclick="closeModal();renderPage()">Non, ignorer</button>
     <button class="btn-save" style="background:#15803d" onclick="appliquerReceptionStock(${JSON.stringify(liees).replace(/"/g,"&quot;")},'${ref}')">✓ Ajouter au stock</button>`
  );
}
function appliquerReceptionStock(liees,ref){
  liees.forEach(l=>{STOCK=STOCK.map(s=>s.ref===l.ref?{...s,qte:s.qte+Number(l.qte)}:s);});
  logActivity("Réception stock",`Bon ${ref} : ${liees.length} article(s) ajouté(s) au stock`);
  closeModal();renderPage();
}
// PDF du bon de commande (réutilise le style facture, adapté fournisseur)
function genererBonCommandePDF(id){
  const c=COMMANDES.find(x=>x.id===id);
  if(!c){alert("Bon de commande introuvable");return;}
  const four=FOURNISSEURS.find(f=>f.nom===c.four);
  const total=bcTotal(c);
  const st=BC_STATUTS[c.statut]||BC_STATUTS.brouillon;
  const logoSrc=thLogo();
  const doc=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
  <title>${c.ref}</title>
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
    .doc-title h1{font-size:26px;color:${TH.c1};letter-spacing:1px}
    .doc-title .num{font-size:14px;color:#64748b;margin-top:4px}
    .parties{display:flex;justify-content:space-between;margin-bottom:30px;gap:30px}
    .partie{flex:1}
    .partie .lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;margin-bottom:6px}
    .partie .nom{font-size:15px;font-weight:700;margin-bottom:3px}
    .partie .det{font-size:12px;color:#475569;line-height:1.6}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    thead th{background:${TH.sidebar};color:#fff;padding:11px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
    thead th:last-child,tbody td:last-child{text-align:right}
    tbody td{padding:12px 14px;border-bottom:1px solid #e8e4dc}
    .totaux{display:flex;justify-content:flex-end;margin-bottom:30px}
    .totaux table{width:280px}
    .totaux td{padding:7px 14px;font-size:13px}
    .totaux .ttc{background:${TH.c1};color:#fff;font-weight:800;font-size:16px}
    .totaux .ttc td{padding:12px 14px}
    .notes-box{background:#f8fafc;border-left:3px solid ${TH.c1};padding:12px 16px;margin-bottom:24px;font-size:12px;color:#475569}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e8e4dc;font-size:11px;color:#94a3b8;text-align:center;line-height:1.8}
    .mentions{font-size:10px;color:#94a3b8;margin-top:8px;line-height:1.6}
    @media print{body{padding:30px 36px}}
  </style></head><body>
    <div class="head">
      <div class="logo-zone">
        ${logoSrc?`<img src="${logoSrc}" onerror="this.style.display='none'"/>`:""}
        <div><div class="brand-name">${TH.nom}</div><div class="brand-sub">${TH.sous}</div></div>
      </div>
      <div class="doc-title">
        <h1>BON DE COMMANDE</h1>
        <div class="num">${c.ref}</div>
        <div class="num">Date : ${fDate(c.date)}</div>
      </div>
    </div>
    <div class="parties">
      <div class="partie">
        <div class="lbl">Donneur d'ordre</div>
        <div class="nom">${TH.nom} ${TH.sous}</div>
        <div class="det">${TH.adresse?TH.adresse+"<br/>":""}${TH.email?TH.email+"<br/>":""}${TH.tel||""}</div>
      </div>
      <div class="partie" style="text-align:right">
        <div class="lbl">Fournisseur</div>
        <div class="nom">${c.four}</div>
        <div class="det">${four?(four.contact||""):""}${four&&four.email?"<br/>"+four.email:""}${four&&four.tel?"<br/>"+four.tel:""}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Réf.</th><th>Désignation</th><th style="text-align:center">Qté</th><th style="text-align:right">P.U.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>
        ${(c.lignes||[]).map(l=>`<tr><td>${(l.ref||"—").replace(/</g,"&lt;")}</td><td>${(l.desc||"").replace(/</g,"&lt;")}</td><td style="text-align:center">${l.qte}</td><td style="text-align:right">${fMoney(l.pu)}</td><td style="text-align:right">${fMoney((l.qte||0)*(l.pu||0))}</td></tr>`).join("")}
      </tbody>
    </table>
    <div class="totaux">
      <table>
        <tr class="ttc"><td>TOTAL</td><td style="text-align:right">${fMoney(total)}</td></tr>
      </table>
    </div>
    ${c.notes?`<div class="notes-box"><strong>Notes :</strong> ${c.notes.replace(/</g,"&lt;")}</div>`:""}
    <div class="footer">
      Bon de commande émis par ${TH.nom}.<br/>
      <div class="mentions">${TH.nom} ${TH.sous}${TH.siret?" · SIRET : "+TH.siret:""}${TH.tvaIntra?" · TVA : "+TH.tvaIntra:""}<br/>Document généré le ${fDate(getToday())}</div>
    </div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),400);}<\/script>
  </body></html>`;
  const w=window.open("","_blank");
  if(!w){alert("Veuillez autoriser les fenêtres pop-up pour générer le PDF.");return;}
  w.document.write(doc);
  w.document.close();
  logActivity("Génération bon de commande",`PDF généré : ${c.ref}`);
  logDocument("bcf",c.id,c.ref,c.four||"",bcTotal(c));
}

function modalStock(id){
  const s=id?STOCK.find(x=>x.id===id):{id:"",ref:"",nom:"",cat:"Emballage",unite:"unité",qte:0,seuil:10,prix:0,prixAchat:0,prixRevient:0,four:"",fournisseurs:[]};
  const fournisseursSel=(s.fournisseurs&&s.fournisseurs.length)?s.fournisseurs:(s.four?[s.four]:[]);
  showModal(id?"Modifier le produit":"Nouveau produit",`
    <div class="field-row">
      <div class="field"><label>Référence</label><input id="s-ref" value="${s.ref}" placeholder="EMB-001"/></div>
      <div class="field"><label>Catégorie</label><select id="s-cat">${CAT_STOCK.map(x=>`<option${s.cat===x?" selected":""}>${x}</option>`).join("")}</select></div>
    </div>
    <div class="field"><label>Nom du produit</label><input id="s-nom" value="${s.nom}"/></div>
    <div class="field">
      <label>Fournisseur(s)</label>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
        ${FOURNISSEURS.length===0?`<span style="font-size:12px;color:#94a3b8">Aucun fournisseur enregistré</span>`:
          FOURNISSEURS.map(f=>`<label style="display:flex;align-items:center;gap:8px;padding:9px 11px;border:1.5px solid ${fournisseursSel.includes(f.nom)?TH.c1:"#e2e8f0"};background:${fournisseursSel.includes(f.nom)?TH.c1+"10":"#fff"};border-radius:9px;font-size:12.5px;line-height:1.25;cursor:pointer;min-height:44px;box-sizing:border-box">
            <input type="checkbox" class="s-four-cb" value="${f.nom.replace(/"/g,'&quot;')}" ${fournisseursSel.includes(f.nom)?"checked":""}/>
            <span style="min-width:0;overflow-wrap:anywhere">${f.nom}</span>
          </label>`).join("")}
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>Quantité en stock</label><input type="number" id="s-qte" value="${s.qte}" min="0"/></div>
      <div class="field"><label>Unité</label><select id="s-unite">${UNITES.map(x=>`<option${s.unite===x?" selected":""}>${x}</option>`).join("")}</select></div>
    </div>
    <div class="field"><label>Seuil d'alerte</label><input type="number" id="s-seuil" value="${s.seuil}" min="0"/></div>
    <div class="field-row">
      <div class="field"><label>Prix d'achat (€)</label><input type="number" id="s-prixachat" value="${s.prixAchat||0}" step="0.01" min="0" oninput="stockAchatChanged()"/></div>
      <div class="field"><label>Prix de revient (€)</label><input type="number" id="s-prixrevient" value="${s.prixRevient||s.prixAchat||0}" step="0.01" min="0" oninput="updateStockMarge()" ${s.prixRevient&&s.prixRevient!==s.prixAchat?'data-touched="1"':""}/></div>
    </div>
    <div class="field" style="margin-bottom:4px"><label>Prix de vente (€)</label><input type="number" id="s-prix" value="${s.prix}" step="0.01" min="0" oninput="updateStockMarge()"/></div>
    <div style="font-size:11px;color:${TH.txt}77;margin-bottom:10px">Prix de revient = prix d'achat + frais annexes éventuels (transport, etc.). Sert de base au calcul du bénéfice réel.</div>
    <div id="s-marge-box"></div>`,
    `<button class="btn-cancel" onclick="closeModal()">Annuler</button>
     <button class="btn-save" style="background:${TH.c1}" onclick="saveStock('${id||""}')">Enregistrer</button>`
  );
  updateStockMarge();
}
function stockAchatChanged(){
  const rev=document.getElementById("s-prixrevient");
  const achat=Number(document.getElementById("s-prixachat").value)||0;
  // Si le prix de revient n'a jamais été personnalisé (égal à l'ancien prix d'achat ou vide), on le suit automatiquement
  if(!rev.dataset.touched) rev.value=achat;
  updateStockMarge();
}
function updateStockMarge(){
  const box=document.getElementById("s-marge-box");if(!box)return;
  const revEl=document.getElementById("s-prixrevient");
  if(revEl && document.activeElement===revEl) revEl.dataset.touched="1";
  const revient=Number(document.getElementById("s-prixrevient")?.value)||0;
  const vente=Number(document.getElementById("s-prix")?.value)||0;
  const marge=vente-revient;
  const margePct=vente>0?(marge/vente*100):0;
  const col=marge>0?"#15803d":marge<0?"#991b1b":"#64748b";
  box.innerHTML=`<div style="background:${col}0F;border:1.5px solid ${col}33;border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:12px;font-weight:700;color:${TH.txt}">Bénéfice réel estimé</span>
    <span style="font-size:14px;font-weight:800;color:${col}">${fMoney(marge)} ${vente>0?"· "+margePct.toFixed(1)+"%":""}</span>
  </div>`;
}
function saveStock(id){
  const fournisseurs=Array.from(document.querySelectorAll(".s-four-cb:checked")).map(cb=>cb.value);
  const prixAchat=Number(document.getElementById("s-prixachat").value)||0;
  const prixRevient=Number(document.getElementById("s-prixrevient").value)||prixAchat;
  const obj={ref:document.getElementById("s-ref").value,nom:document.getElementById("s-nom").value,cat:document.getElementById("s-cat").value,unite:document.getElementById("s-unite").value,fournisseurs,four:fournisseurs[0]||"",qte:Number(document.getElementById("s-qte").value),seuil:Number(document.getElementById("s-seuil").value),prixAchat,prixRevient,prix:Number(document.getElementById("s-prix").value)};
  if(id){STOCK=STOCK.map(s=>s.id===id?{...s,...obj}:s);}else{STOCK.push({...obj,id:uid()});}
  closeModal();renderPage();renderNav();
}
function delStock(id){confirmDel("Supprimer ce produit ?",function(){STOCK=STOCK.filter(s=>s.id!==id);renderPage();renderNav();});}

// ── Configuration catégories & unités ──────────────────────────────────────
function openPanelConfig(){
  document.getElementById("panel-container").innerHTML=renderConfigPanel();
}
function closeConfigPanel(){ document.getElementById("panel-container").innerHTML=""; }
function renderConfigPanel(){
  const chip=(val,type,i)=>`<div style="display:inline-flex;align-items:center;gap:6px;background:#fff;border:1.5px solid #e2e8f0;border-radius:999px;padding:5px 6px 5px 13px;margin:0 6px 8px 0">
    <span style="font-size:13px;color:#1A2118">${val}</span>
    <button onclick="delConfigItem('${type}',${i})" style="width:20px;height:20px;border-radius:50%;border:none;background:#fef2f2;color:#991b1b;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0">✕</button>
  </div>`;
  return`<div class="panel-overlay">
    <div class="panel-bg" onclick="closeConfigPanel()"></div>
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">⚙️ Catégories & Unités</div>
        <button class="panel-close" onclick="closeConfigPanel()">✕</button>
      </div>
      <div class="panel-body">
        <div class="info-box">Personnalisez les catégories de produits et les unités utilisées dans votre stock.</div>

        <div style="margin-bottom:8px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em">📂 Catégories de produits</div>
        <div style="margin-bottom:10px">${CAT_STOCK.map((c,i)=>chip(c,"cat",i)).join("")}</div>
        <button onclick="addConfigItem('cat')" style="width:100%;padding:9px;border-radius:8px;border:1.5px dashed ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-weight:600;font-size:13px;font-family:'Inter',sans-serif;margin-bottom:22px">＋ Ajouter une catégorie</button>

        <div style="margin-bottom:8px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em">📏 Unités</div>
        <div style="margin-bottom:10px">${UNITES.map((u,i)=>chip(u,"unite",i)).join("")}</div>
        <button onclick="addConfigItem('unite')" style="width:100%;padding:9px;border-radius:8px;border:1.5px dashed ${TH.c1};background:${TH.c1}08;color:${TH.c1};cursor:pointer;font-weight:600;font-size:13px;font-family:'Inter',sans-serif">＋ Ajouter une unité</button>
      </div>
    </div>
  </div>`;
}
function addConfigItem(type){
  const label=type==="cat"?"catégorie":"unité";
  const val=prompt(`Nouvelle ${label} :`);
  if(!val||!val.trim())return;
  const arr=type==="cat"?CAT_STOCK:UNITES;
  if(arr.includes(val.trim())){alert("Cette valeur existe déjà");return;}
  arr.push(val.trim());
  saveData();openPanelConfig();
}
function delConfigItem(type,i){
  const arr=type==="cat"?CAT_STOCK:UNITES;
  if(arr.length<=1){alert("Vous devez garder au moins une valeur");return;}
  if(!confirm(`Supprimer « ${arr[i]} » ?`))return;
  arr.splice(i,1);
  saveData();openPanelConfig();
}

// ════════════════════════════════════════════════════════
