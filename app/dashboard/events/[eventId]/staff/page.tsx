"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BackLink from "@/components/BackLink";
import { UserPlus, Trash2, Mail, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/lib/confirm";
import type { EventRecord } from "@/lib/types";

interface StaffRow {
  id: string;
  invited_email: string;
  status: "pending" | "active" | "revoked";
  created_at: string;
  accepted_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  active: "Actif",
  revoked: "Révoqué",
};

export default function StaffPage() {
  const params = useParams();
  const confirmDialog = useConfirm();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const [{ data: eventData }, { data: staffData }] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
      supabase
        .from("event_staff")
        .select("id, invited_email, status, created_at, accepted_at")
        .eq("event_id", eventId)
        .neq("status", "revoked")
        .order("created_at", { ascending: false }),
    ]);
    setEvent(eventData as EventRecord);
    setStaff((staffData as StaffRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSentTo(null);
    setInviting(true);
    const supabase = createClient();

    const { data, error: rpcError } = await supabase.rpc("invite_event_staff", {
      p_event_id: eventId,
      p_email: email,
    });

    if (rpcError) {
      setError(
        rpcError.message === "already_active"
          ? "Cette personne a déjà accepté l'invitation."
          : rpcError.message === "invalid_email"
          ? "Adresse email invalide."
          : rpcError.message
      );
      setInviting(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("organizations(name)")
        .eq("id", user!.id)
        .maybeSingle();
      const organizerName = (profile as any)?.organizations?.name;

      const res = await fetch("/api/staff/invite-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          eventName: event?.name ?? "l'événement",
          organizerName,
          inviteToken: data.invite_token,
        }),
      });
      const emailResult = await res.json().catch(() => null);
      if (!res.ok || emailResult?.sent === false) {
        setError(
          `Invitation créée, mais l'envoi de l'email a échoué${emailResult?.error ? ` : ${emailResult.error}` : "."} L'invité peut quand même utiliser le lien si tu le lui transmets autrement.`
        );
      } else {
        setSentTo(data.email);
      }
    } catch {
      // L'invitation est créée même si l'email échoue à partir ; l'organisateur peut réessayer.
      setError("Invitation créée, mais l'envoi de l'email a échoué. Vérifie ta config email.");
    }

    setEmail("");
    setInviting(false);
    load();
  }

  async function handleRevoke(id: string) {
    const ok = await confirmDialog({
      title: "Révoquer cet accès ?",
      message: "Cette personne ne pourra plus scanner les billets de cet événement.",
      confirmLabel: "Révoquer",
    });
    if (!ok) return;
    const supabase = createClient();
    await supabase.rpc("revoke_event_staff", { p_staff_id: id });
    load();
  }

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  return (
    <div className="space-y-6">
      <BackLink href={`/dashboard/events/${eventId}`} label="Retour à la gestion de l'événement" />
      <div>
        <h1 className="text-2xl font-bold text-navy dark:text-white">Personnel — {event?.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Invite des personnes pour scanner les billets à l'entrée. Elles créent leur propre compte,
          mais n'ont accès qu'au scanner de cet événement — rien d'autre.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-navy dark:text-white flex items-center gap-1.5">
          <UserPlus className="w-4 h-4" /> Inviter une personne
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            className="input"
            placeholder="email@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={inviting}>
            {inviting ? "Envoi..." : "Envoyer l'invitation"}
          </button>
        </form>
        {sentTo && <p className="mt-2 text-sm text-green-600">Invitation envoyée à {sentTo}.</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold text-navy dark:text-white">Équipe ({staff.length})</h2>
        {staff.length === 0 ? (
          <p className="text-gray-400">Aucun membre du personnel pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-slate-700 p-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{s.invited_email}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-gray-500">
                      {s.status === "active" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                      )}
                      {STATUS_LABELS[s.status]}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleRevoke(s.id)} className="text-red-600 hover:underline text-sm inline-flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" />
                  Révoquer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
