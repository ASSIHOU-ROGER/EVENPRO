"use client";
import { useRef, useState } from "react";
import { Download, FileDown } from "lucide-react";
import type { EventRecord } from "@/lib/types";

export interface PurchasedTicket {
  ticket_number: string;
  qr_token: string;
  category: string;
  qrDataUrl?: string;
}

export function TicketCard({
  ticket,
  event,
  brandColor,
}: {
  ticket: PurchasedTicket;
  event: Pick<EventRecord, "name" | "event_date" | "location">;
  brandColor: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloading, setDownloading] = useState<"image" | "pdf" | null>(null);

  async function buildTicketCanvas(): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    const width = 800;
    const height = 380;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, 90);

    ctx.fillStyle = brandColor;
    ctx.font = "bold 14px Arial";
    ctx.fillText("EVENTPRO — BILLET ÉLECTRONIQUE", 32, 34);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px Arial";
    ctx.fillText(event.name, 32, 68);

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 16px Arial";
    ctx.fillText(ticket.category, 32, 130);
    ctx.font = "14px Arial";
    ctx.fillStyle = "#64748b";
    if (event.event_date) {
      ctx.fillText(new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" }), 32, 155);
    }
    if (event.location) {
      ctx.fillText(event.location, 32, 178);
    }

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 18px monospace";
    ctx.fillText(ticket.ticket_number, 32, 230);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Arial";
    ctx.fillText("Présente ce QR code à l'entrée", 32, 254);

    if (ticket.qrDataUrl) {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("qr_load_failed"));
        img.src = ticket.qrDataUrl!;
      });
      ctx.drawImage(img, width - 250, 60, 190, 190);
    }

    ctx.strokeStyle = "#e2e8f0";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(width - 270, 20);
    ctx.lineTo(width - 270, height - 20);
    ctx.stroke();

    return canvas;
  }

  async function handleDownloadImage() {
    setDownloading("image");
    try {
      const canvas = await buildTicketCanvas();
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `billet-${ticket.ticket_number}.png`;
      link.click();
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadPdf() {
    setDownloading("pdf");
    try {
      const canvas = await buildTicketCanvas();
      const imgData = canvas.toDataURL("image/png");
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`billet-${ticket.ticket_number}.pdf`);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        {ticket.qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ticket.qrDataUrl} alt="QR code" className="h-28 w-28" />
        )}
        <div>
          <p className="text-xs uppercase font-semibold" style={{ color: brandColor }}>{ticket.category}</p>
          <p className="font-mono text-sm text-gray-700">{ticket.ticket_number}</p>
          <p className="mt-1 text-xs text-gray-400">Présente ce QR code à l'entrée</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={handleDownloadImage} disabled={downloading !== null} className="btn-secondary py-1.5 px-3 text-[11px]">
          <Download className="w-3.5 h-3.5" />
          <span>{downloading === "image" ? "..." : "Télécharger (image)"}</span>
        </button>
        <button type="button" onClick={handleDownloadPdf} disabled={downloading !== null} className="btn-secondary py-1.5 px-3 text-[11px]">
          <FileDown className="w-3.5 h-3.5" />
          <span>{downloading === "pdf" ? "..." : "Télécharger (PDF)"}</span>
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
