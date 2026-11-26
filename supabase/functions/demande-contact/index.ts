// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

// Formulaire de contact du site (contact.html) : enregistre la demande (table demandes_contact,
// lue par l'appli qui en fait un prospect « Contact initial ») et prévient contact@ par e-mail.
const env = (k, d = "") => Deno.env.get(k) || d;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const TENANT = env("CONTACT_TENANT", "4515fa0d-c1a8-4916-a186-147f431dc465"); // AD Secure Concept
const MAX_PAR_IP_JOUR = 5;
const TYPES = ["Un particulier", "Un commerce", "Une entreprise", "Une copropriété", "Une collectivité", "Autre"];
const txt = (v, max = 120) => String(v ?? "").trim().slice(0, max);

async function prevenir(d) {
  if (!env("SMTP_PASS")) return;
  const user = env("SMTP_USER", "contact@adsecureconcept.fr");
  const port = Number(env("SMTP_PORT", "465"));
  const t = nodemailer.createTransport({ host: env("SMTP_HOST", "smtp.mail.ovh.net"), port, secure: port === 465, auth: { user, pass: env("SMTP_PASS") } });
  await t.sendMail({
    from: `"Site AD Secure Concept" <${user}>`,
    to: env("CONTACT_ALERTE", user),
    replyTo: d.email,
    subject: `Demande de devis — ${d.prenom} ${d.nom}`.trim(),
    text: `Nouvelle demande depuis le site (ajoutée au pipeline de l'appli).\n\nNom : ${d.prenom} ${d.nom}\nEmail : ${d.email}\nTéléphone : ${d.tel || "non précisé"}\nVous êtes : ${d.type_client}\n\n${d.message}`,
  }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  const b = await req.json().catch(() => ({}));
  if (b.site_web) return json({ ok: true }); // piège à robots
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "").split(",")[0].trim().slice(0, 64);
  const d = {
    prenom: txt(b.prenom, 60), nom: txt(b.nom, 80), email: txt(b.email, 160).toLowerCase(), tel: txt(b.tel, 30),
    type_client: TYPES.includes(b.type) ? b.type : "Autre", message: txt(b.message, 3000),
  };
  if (!d.prenom && !d.nom) return json({ error: "Indiquez votre nom." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return json({ error: "Adresse e-mail invalide." }, 400);
  if (d.message.length < 2) return json({ error: "Écrivez votre message." }, 400);
  if (ip) {
    const depuis = new Date(Date.now() - 864e5).toISOString();
    const { count } = await sb.from("demandes_contact").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", depuis);
    if ((count || 0) >= MAX_PAR_IP_JOUR) return json({ error: "Trop de demandes aujourd'hui. Écrivez-nous à contact@adsecureconcept.fr." }, 429);
  }
  const { error } = await sb.from("demandes_contact").insert({ ...d, tenant_id: TENANT, ip: ip || null });
  if (error) return json({ error: "Envoi impossible, réessayez." }, 500);
  await prevenir(d);
  return json({ ok: true });
});
