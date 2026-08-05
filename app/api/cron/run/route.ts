import { NextRequest, NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/publicServerClient";
import { sendEmail, emailShell } from "@/lib/email";

// Endpoint à appeler périodiquement (Vercel Cron, cron-job.org, tâche planifiée locale...)
// pour envoyer les rappels avant événement et les remerciements après événement.
// Protégé par CRON_SECRET : header "Authorization: Bearer <CRON_SECRET>" (format attendu
// par Vercel Cron) ou paramètre ?secret=<CRON_SECRET>.

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === expected) return true;
  return false;
}

interface DueTicket { ticket_number: string; category: string }
interface DueReminder {
  order_id: string;
  buyer_name: string;
  buyer_email: string;
  event_name: string;
  event_date: string;
  location: string | null;
  tickets: DueTicket[];
}
interface DueThankYou {
  order_id: string;
  buyer_name: string;
  buyer_email: string;
  event_name: string;
  event_date: string;
  location: string | null;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "not_authorized" }, { status: 401 });
  }
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET non configuré côté serveur" }, { status: 500 });
  }

  const supabase = createPublicServerClient();
  const secret = process.env.CRON_SECRET;
  const results = { reminders: { due: 0, sent: 0, errors: [] as string[] }, thankyous: { due: 0, sent: 0, errors: [] as string[] } };

  const { data: reminderBatch, error: reminderError } = await supabase.rpc("send_reminder_batch", { p_secret: secret });
  if (reminderError) {
    results.reminders.errors.push(reminderError.message);
  } else {
    const due = (reminderBatch as DueReminder[]) ?? [];
    results.reminders.due = due.length;
    for (const order of due) {
      const ticketsHtml = order.tickets
        .map((t) => `<li>${t.category} — <span style="font-family:monospace;">${t.ticket_number}</span></li>`)
        .join("");
      const html = emailShell(
        `Rappel — ${order.event_name} approche !`,
        `
          <p>Bonjour ${order.buyer_name},</p>
          <p>Petit rappel : <strong>${order.event_name}</strong> a lieu bientôt.</p>
          <p><strong>Date :</strong> ${new Date(order.event_date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}</p>
          ${order.location ? `<p><strong>Lieu :</strong> ${order.location}</p>` : ""}
          <p>Tes billets :</p>
          <ul>${ticketsHtml}</ul>
          <p>N'oublie pas de présenter le QR code de chaque billet à l'entrée.</p>
        `
      );
      try {
        await sendEmail({ to: order.buyer_email, subject: `Rappel : ${order.event_name} approche`, html });
        results.reminders.sent++;
      } catch (err: any) {
        results.reminders.errors.push(`${order.order_id}: ${err.message}`);
      }
    }
  }

  const { data: thankyouBatch, error: thankyouError } = await supabase.rpc("send_thankyou_batch", { p_secret: secret });
  if (thankyouError) {
    results.thankyous.errors.push(thankyouError.message);
  } else {
    const due = (thankyouBatch as DueThankYou[]) ?? [];
    results.thankyous.due = due.length;
    for (const order of due) {
      const html = emailShell(
        `Merci d'avoir participé à ${order.event_name} !`,
        `
          <p>Bonjour ${order.buyer_name},</p>
          <p>Merci d'avoir participé à <strong>${order.event_name}</strong> ! On espère que ça t'a plu.</p>
          <p>À très bientôt pour un prochain événement.</p>
        `
      );
      try {
        await sendEmail({ to: order.buyer_email, subject: `Merci d'avoir participé à ${order.event_name}`, html });
        results.thankyous.sent++;
      } catch (err: any) {
        results.thankyous.errors.push(`${order.order_id}: ${err.message}`);
      }
    }
  }

  return NextResponse.json(results);
}
