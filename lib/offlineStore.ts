import { openDB, DBSchema, IDBPDatabase } from "idb";

interface CachedTicket {
  qr_token: string;
  event_id: string;
  ticket_number: string;
  holder_name: string;
  status: "valid" | "used" | "cancelled";
}

interface PendingScan {
  id?: number;
  event_id: string;
  qr_token: string;
  device_info: string;
  scanned_at: string;
}

interface EventProDB extends DBSchema {
  tickets: {
    key: string; // qr_token
    value: CachedTicket;
    indexes: { "by-event": string };
  };
  pendingScans: {
    key: number;
    value: PendingScan;
    indexes: { "by-event": string };
  };
}

let dbPromise: Promise<IDBPDatabase<EventProDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<EventProDB>("eventpro-offline", 1, {
      upgrade(db) {
        const ticketStore = db.createObjectStore("tickets", { keyPath: "qr_token" });
        ticketStore.createIndex("by-event", "event_id");
        const scanStore = db.createObjectStore("pendingScans", { keyPath: "id", autoIncrement: true });
        scanStore.createIndex("by-event", "event_id");
      },
    });
  }
  return dbPromise;
}

export async function cacheTicketsForEvent(eventId: string, tickets: CachedTicket[]) {
  const db = await getDb();
  const tx = db.transaction("tickets", "readwrite");
  await Promise.all(tickets.map((t) => tx.store.put(t)));
  await tx.done;
}

export async function getCachedTicket(qrToken: string) {
  const db = await getDb();
  return db.get("tickets", qrToken);
}

// Accepte soit le qr_token (scan camera), soit le ticket_number lisible (saisie manuelle, ex. EP-XXXXXXXX).
export async function getCachedTicketByCode(eventId: string, code: string) {
  const db = await getDb();
  const trimmed = code.trim();
  const direct = await db.get("tickets", trimmed);
  if (direct && direct.event_id === eventId) return direct;
  const all = await db.getAllFromIndex("tickets", "by-event", eventId);
  const upperCode = trimmed.toUpperCase();
  return all.find((t) => t.ticket_number.toUpperCase() === upperCode);
}

export async function markCachedTicketUsed(qrToken: string) {
  const db = await getDb();
  const ticket = await db.get("tickets", qrToken);
  if (ticket) {
    ticket.status = "used";
    await db.put("tickets", ticket);
  }
}

export async function queueScan(scan: PendingScan) {
  const db = await getDb();
  await db.add("pendingScans", scan);
}

export async function getPendingScans(eventId: string) {
  const db = await getDb();
  return db.getAllFromIndex("pendingScans", "by-event", eventId);
}

export async function removePendingScan(id: number) {
  const db = await getDb();
  await db.delete("pendingScans", id);
}

export async function countCachedTickets(eventId: string) {
  const db = await getDb();
  return (await db.getAllFromIndex("tickets", "by-event", eventId)).length;
}

export type { CachedTicket, PendingScan };
