"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  cacheTicketsForEvent,
  getCachedTicketByCode,
  markCachedTicketUsed,
  queueScan,
  getPendingScans,
  removePendingScan,
  countCachedTickets,
} from "@/lib/offlineStore";

type ScanResult = {
  result: "valid" | "already_used" | "invalid";
  ticket_number?: string;
  holder_name?: string;
  message?: string;
  offline?: boolean;
} | null;

const RESULT_STYLES: Record<string, string> = {
  valid: "bg-green-100 border-green-500 text-green-800",
  already_used: "bg-orange-100 border-orange-500 text-orange-800",
  invalid: "bg-red-100 border-red-500 text-red-800",
};
const RESULT_LABELS: Record<string, string> = {
  valid: "Billet valide",
  already_used: "Déjà utilisé",
  invalid: "Faux billet",
};
const RESULT_ICONS: Record<string, typeof CheckCircle2> = {
  valid: CheckCircle2,
  already_used: XCircle,
  invalid: XCircle,
};

export default function ScanPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [lastResult, setLastResult] = useState<ScanResult>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [cachedCount, setCachedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const busyRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const pending = await getPendingScans(eventId);
    setPendingCount(pending.length);
  }, [eventId]);

  const syncPendingScans = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    const supabase = createClient();
    const pending = await getPendingScans(eventId);
    for (const scan of pending) {
      const { error } = await supabase.rpc("check_in_ticket", {
        p_event_id: scan.event_id,
        p_qr_token: scan.qr_token,
        p_device_info: scan.device_info + " (sync différée)",
      });
      if (error) {
        // erreur réseau ou autre : on arrête et on réessaiera plus tard
        break;
      }
      if (scan.id !== undefined) await removePendingScan(scan.id);
    }
    await refreshPendingCount();
    setSyncing(false);
  }, [eventId, refreshPendingCount]);

  const downloadTicketsForOffline = useCallback(async () => {
    if (!navigator.onLine) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("tickets")
      .select("qr_token, event_id, ticket_number, holder_name, status")
      .eq("event_id", eventId);
    if (data) {
      await cacheTicketsForEvent(eventId, data as any);
      setCachedCount(await countCachedTickets(eventId));
    }
  }, [eventId]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingScans();
      downloadTicketsForOffline();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    downloadTicketsForOffline();
    syncPendingScans();
    refreshPendingCount();
    countCachedTickets(eventId).then(setCachedCount);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function processToken(token: string) {
    if (busyRef.current) return;
    busyRef.current = true;

    if (navigator.onLine) {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("check_in_ticket", {
        p_event_id: eventId,
        p_qr_token: token,
        p_device_info: navigator.userAgent,
      });
      if (error) {
        setLastResult({ result: "invalid", message: error.message });
      } else {
        setLastResult(data);
        if (data.result === "valid") await markCachedTicketUsed(token);
      }
    } else {
      // Mode hors ligne : on consulte le cache local (par qr_token OU par numéro de billet) et on met le scan en file d'attente.
      const cached = await getCachedTicketByCode(eventId, token);
      if (!cached) {
        setLastResult({ result: "invalid", message: "Faux billet (hors ligne)", offline: true });
      } else if (cached.status !== "valid") {
        setLastResult({
          result: "already_used",
          ticket_number: cached.ticket_number,
          holder_name: cached.holder_name,
          offline: true,
        });
      } else {
        await markCachedTicketUsed(cached.qr_token);
        await queueScan({
          event_id: eventId,
          qr_token: cached.qr_token,
          device_info: navigator.userAgent,
          scanned_at: new Date().toISOString(),
        });
        await refreshPendingCount();
        setLastResult({
          result: "valid",
          ticket_number: cached.ticket_number,
          holder_name: cached.holder_name,
          offline: true,
        });
      }
    }

    setTimeout(() => {
      busyRef.current = false;
    }, 1200);
  }

  useEffect(() => {
    let html5QrCode: any;
    let cancelled = false;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        html5QrCode = new Html5Qrcode("qr-reader");
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText: string) => processToken(decodedText),
          () => {}
        );
        setCameraReady(true);
      } catch (err: any) {
        setCameraError("Impossible d'accéder à la caméra : " + err.message + ". Utilise la saisie manuelle ci-dessous.");
      }
    }
    start();

    return () => {
      cancelled = true;
      if (html5QrCode) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/dashboard/events/${eventId}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy hover:underline"
      >
        ← Retour à la gestion de l'événement
      </Link>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy dark:text-white">Scanner de contrôle</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {isOnline ? "En ligne" : "Hors ligne"}
        </span>
      </div>

      <div className="mb-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
        <p>{cachedCount} billet(s) disponibles hors ligne sur cet appareil.</p>
        {pendingCount > 0 && (
          <div className="mt-1 flex items-center justify-between">
            <p className="text-orange-600">{pendingCount} scan(s) en attente de synchronisation.</p>
            <button
              onClick={syncPendingScans}
              disabled={!isOnline || syncing}
              className="btn-secondary py-1 text-xs disabled:opacity-50"
            >
              {syncing ? "Synchronisation..." : "Synchroniser"}
            </button>
          </div>
        )}
      </div>

      <div id="qr-reader" className="w-full overflow-hidden rounded-2xl border border-gray-300" />
      {cameraError && <p className="mt-3 text-sm text-red-600">{cameraError}</p>}
      {!cameraReady && !cameraError && <p className="mt-3 text-sm text-gray-500">Activation de la caméra...</p>}

      {lastResult && (
        <div className={`mt-4 rounded-2xl border-2 p-4 ${RESULT_STYLES[lastResult.result]}`}>
          <p className="flex items-center gap-2 text-lg font-bold">
            {(() => {
              const Icon = RESULT_ICONS[lastResult.result] ?? XCircle;
              return <Icon className="w-5 h-5" />;
            })()}
            {RESULT_LABELS[lastResult.result]} {lastResult.offline && <span className="text-xs font-normal">(hors ligne)</span>}
          </p>
          {lastResult.ticket_number && <p className="text-sm">Billet : {lastResult.ticket_number}</p>}
          {lastResult.holder_name && <p className="text-sm">Nom : {lastResult.holder_name}</p>}
          {lastResult.message && <p className="text-sm">{lastResult.message}</p>}
        </div>
      )}

      <div className="mt-6 card">
        <p className="label">Saisie manuelle (si la caméra n'est pas disponible)</p>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Numéro du billet (EP-XXXXXXXX) ou code QR"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
          />
          <button className="btn-secondary" onClick={() => manualToken && processToken(manualToken)}>
            Vérifier
          </button>
        </div>
      </div>
    </div>
  );
}
