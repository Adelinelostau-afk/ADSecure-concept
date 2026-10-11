// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

// Fonction Supabase « agenda-ics » : flux d'abonnement calendrier (iPhone, iPad, Google Agenda).
// Accès par lien privé : ?t=<jeton de 48 caractères hexadécimaux> (TH.icsTokens de l'entreprise).
// &test=1 lit la version de test (app_data_test). Aucune connexion requise (verify_jwt désactivé) :
// le jeton fait office de clé, il est révocable depuis l'appli (« Nouveau lien »).

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Plie les lignes à 75 octets (RFC 5545)
function plier(l) {
  const enc = new TextEncoder(); const out = []; let cur = "";
  for (const ch of l) { if (enc.encode(cur + ch).length > 73) { out.push(cur); cur = " " + ch; } else cur += ch; }
  out.push(cur); return out.join("\r\n");
}
function minutes(h) { const m = String(h || "").match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : 540; }
function hhmm(n) { n = Math.max(0, Math.min(1439, n)); return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0"); }
function fin(e) { return e.fin && minutes(e.fin) > minutes(e.heure) ? e.fin : hhmm(minutes(e.heure) + 60); }
// Heure locale (fuseau de l'entreprise) → UTC au format iCalendar
function utc(date, heure, tz) {
  const [y, mo, d] = String(date).split("-").map(Number); const [h, mi] = String(heure || "09:00").split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
  const vu = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  const t = new Date(guess - (vu - guess));
  return t.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function ymd(d) { return d.toISOString().slice(0, 10); }

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const t = u.searchParams.get("t") || "";
  if (!/^[0-9a-f]{48}$/.test(t)) return new Response("Lien invalide", { status: 404 });
  const table = u.searchParams.get("test") === "1" ? "app_data_test" : "app_data";
  const { data: rows, error } = await sb.from(table).select("tenant_id, th:data->TH, events:data->EVENTS").contains("data->TH->icsTokens", { [t]: {} }).limit(1);
  if (error) return new Response("Erreur", { status: 500 });
  const row = rows && rows[0];
  const jet = row?.th?.icsTokens?.[t];
  if (!row || !jet) return new Response("Lien expiré ou inconnu", { status: 404 });

  const TH = row.th || {};
  const tz = TH.fuseau || "America/Martinique";
  const equipe = Array.isArray(TH.equipe) ? TH.equipe : [];
  const nomMembre = (id) => (equipe.find((m) => m.id === id) || {}).nom;
  const now = new Date();
  const debut = ymd(new Date(now.getTime() - 60 * 864e5)), finPeriode = ymd(new Date(now.getTime() + 400 * 864e5));
  const evs = (Array.isArray(row.events) ? row.events : []).filter((e) => e && e.date && e.date >= debut && e.date <= finPeriode)
    .filter((e) => jet.portee === "tous" || !(e.assignes || []).length || (e.assignes || []).includes(jet.uid));
  const ent = `${TH.nom || ""} ${TH.sous || ""}`.trim() || "AD Management";
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AD Management//Agenda//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(ent + (jet.portee === "tous" ? " — équipe" : " — " + (jet.nom || "mon agenda")))}`,
    `X-WR-TIMEZONE:${tz}`, "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"];
  for (const e of evs) {
    const qui = (e.assignes || []).map(nomMembre).filter(Boolean).join(", ");
    const desc = [e.client ? "Client : " + e.client : "", qui ? "Intervenant(s) : " + qui : "", e.notes || ""].filter(Boolean).join("\n");
    L.push("BEGIN:VEVENT", `UID:${esc(e.id)}@admanagement`, `DTSTAMP:${stamp}`,
      `DTSTART:${utc(e.date, e.heure, tz)}`, `DTEND:${utc(e.date, fin(e), tz)}`,
      `SUMMARY:${esc(e.titre || "Rendez-vous")}`);
    if (e.adresse) L.push(`LOCATION:${esc(e.adresse)}`);
    if (desc) L.push(`DESCRIPTION:${esc(desc)}`);
    L.push("BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT30M", `DESCRIPTION:${esc(e.titre || "Rendez-vous")}`, "END:VALARM", "END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return new Response(L.map(plier).join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=900", "Content-Disposition": "inline; filename=agenda.ics" },
  });
});
