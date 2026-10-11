// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";
import { SigMail, RelancesCore } from "./shared.js";

// Fonction Supabase « relances-auto » : relances automatiques (tâche planifiée du matin)
// + envoi des devis/factures/rapports par e-mail depuis l'appli.
// Signature : celle de l'entreprise pour les relances, celle de l'utilisateur qui envoie pour les documents.
// Secrets : SMTP_PASS, CRON_SECRET (SMTP_USER, SMTP_HOST, SMTP_PORT, FUSEAU facultatifs).

const env = (k, d = "") => Deno.env.get(k) || d;
const SMTP_USER = env("SMTP_USER", "contact@adsecureconcept.fr");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

function aujourdhui() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: env("FUSEAU", "America/Martinique") }).format(new Date());
}
function transporteur() {
  const port = Number(env("SMTP_PORT", "465"));
  return nodemailer.createTransport({
    host: env("SMTP_HOST", "smtp.mail.ovh.net"),
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: env("SMTP_PASS") },
  });
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function versHtml(texte, TH, uid) {
  const couleur = TH.c1 || "#3286A0";
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1A2118;max-width:620px">` +
    `<div style="border-top:4px solid ${couleur};padding-top:14px">${esc(texte).replace(/\n/g, "<br>")}</div>${SigMail.html(TH, uid)}</div>`;
}
function versTexte(texte, TH, uid) {
  const s = SigMail.texte(TH, uid);
  return s ? `${texte}\n\n${s}` : texte;
}
function expediteur(TH) {
  const nom = `${TH.nom || ""} ${TH.sous || ""}`.trim().replace(/"/g, "");
  return nom ? `"${nom}" <${SMTP_USER}>` : SMTP_USER;
}

async function traiterTenant(tenantId, today, mail, force = false) {
  const { data: row, error } = await sb.from("app_data").select("data").eq("tenant_id", tenantId).maybeSingle();
  if (error || !row?.data) return { tenantId, envoyes: 0, erreurs: 0, detail: "aucune donnée" };
  const data = row.data;
  const TH = data.TH || {};
  const cfg = RelancesCore.config(TH);
  if (!cfg.actif && !force) return { tenantId, envoyes: 0, erreurs: 0, detail: "relances désactivées" };

  const { data: log } = await sb.from("relances_log").select("cle,statut,created_at").eq("tenant_id", tenantId);
  const envoyees = new Map((log || []).filter((l) => l.statut === "envoye").map((l) => [l.cle, String(l.created_at || "").slice(0, 10)]));
  const { aEnvoyer } = RelancesCore.calculer(data, today, envoyees);

  let envoyes = 0, erreurs = 0;
  const copie = cfg.copie ? (TH.email || SMTP_USER) : undefined;
  for (const r of aEnvoyer) {
    const ligne = {
      tenant_id: tenantId, cle: r.cle, type: r.type, niveau: r.niveau ?? null, ref_id: r.refId,
      client: r.client, email: r.email, sujet: r.sujet, statut: "envoye", erreur: null, created_at: new Date().toISOString(),
    };
    try {
      await mail.sendMail({
        from: expediteur(TH),
        to: r.email,
        bcc: copie,
        replyTo: TH.email || undefined,
        subject: r.sujet,
        text: versTexte(r.texte, TH),
        html: versHtml(r.texte, TH),
      });
      envoyes++;
    } catch (e) {
      ligne.statut = "erreur";
      ligne.erreur = String(e?.message || e).slice(0, 500);
      erreurs++;
    }
    await sb.from("relances_log").upsert(ligne, { onConflict: "tenant_id,cle" });
  }
  return { tenantId, envoyes, erreurs, prevus: aEnvoyer.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!env("SMTP_PASS")) return json({ error: "Mot de passe de la boîte mail manquant : ajoutez le secret SMTP_PASS dans Supabase (Edge Functions → Secrets)" }, 500);
  const body = await req.json().catch(() => ({}));
  const today = aujourdhui();

  // 1. Passage planifié
  const secret = req.headers.get("x-cron-secret");
  if (secret) {
    if (!env("CRON_SECRET") || secret !== env("CRON_SECRET")) return json({ error: "Secret invalide" }, 401);
    const { data: rows, error } = await sb.from("app_data").select("tenant_id");
    if (error) return json({ error: error.message }, 500);
    const autorises = env("RELANCES_TENANTS").split(",").map((s) => s.trim()).filter(Boolean);
    const mail = transporteur();
    const res = [];
    for (const r of rows || []) {
      if (autorises.length && !autorises.includes(r.tenant_id)) continue;
      res.push(await traiterTenant(r.tenant_id, today, mail));
    }
    return json({ ok: true, date: today, resultats: res });
  }

  // 2. Appel depuis l'appli
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u, error: uErr } = await sb.auth.getUser(jwt);
  if (uErr || !u?.user) return json({ error: "Non connecté" }, 401);
  const { data: prof } = await sb.from("profiles").select("tenant_id,role,actif").eq("id", u.user.id).maybeSingle();
  if (!prof || prof.actif === false) return json({ error: "Compte inactif" }, 403);

  // 3. Envoi d'un document : signature personnelle de l'utilisateur connecté
  if (body.action === "email") {
    const to = String(body.to || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "Adresse du destinataire invalide" }, 400);
    const pj = body.pieceJointe;
    if (pj && String(pj.contenu || "").length > 14_000_000) return json({ error: "Pièce jointe trop lourde (10 Mo maximum)" }, 400);
    const { data: row } = await sb.from("app_data").select("data").eq("tenant_id", prof.tenant_id).maybeSingle();
    const TH = row?.data?.TH || {};
    const texte = String(body.text || "").slice(0, 20000);
    try {
      await transporteur().sendMail({
        from: expediteur(TH),
        to,
        bcc: body.copie ? (TH.email || SMTP_USER) : undefined,
        replyTo: TH.email || undefined,
        subject: String(body.subject || "Document").slice(0, 200),
        text: versTexte(texte, TH, u.user.id),
        html: versHtml(texte, TH, u.user.id),
        attachments: pj ? [{ filename: String(pj.nom || "document.pdf").slice(0, 120), content: String(pj.contenu), encoding: "base64", contentType: "application/pdf" }] : [],
      });
      return json({ ok: true, destinataire: to });
    } catch (e) {
      return json({ error: "Envoi impossible : " + String(e?.message || e) }, 500);
    }
  }

  if (!["admin", "super_admin"].includes(prof.role)) {
    return json({ error: "Réservé aux administrateurs" }, 403);
  }
  const mail = transporteur();

  if (body.action === "test") {
    const { data: row } = await sb.from("app_data").select("data").eq("tenant_id", prof.tenant_id).maybeSingle();
    const TH = row?.data?.TH || {};
    const dest = body.email || TH.email || u.user.email;
    const texte = `Bonjour,\n\nCet e-mail confirme que les relances automatiques peuvent être envoyées depuis ${SMTP_USER}.\n\nDate du serveur : ${RelancesCore.dateLongue(today)}.\n\nCordialement,\n${SigMail.cfg(TH, u.user.id).actif ? SigMail.court(TH, u.user.id) : ""}`;
    try {
      await mail.sendMail({
        from: expediteur(TH), to: dest, replyTo: TH.email || undefined,
        subject: "Test — relances automatiques AD Management",
        text: versTexte(texte, TH, u.user.id),
        html: versHtml(texte, TH, u.user.id),
      });
      return json({ ok: true, destinataire: dest });
    } catch (e) {
      return json({ error: "Envoi impossible : " + String(e?.message || e) }, 500);
    }
  }

  const r = await traiterTenant(prof.tenant_id, today, mail);
  return json({ ok: true, date: today, ...r });
});
