export type TicketType = "gratuit" | "standard" | "vip" | "early_bird" | "groupe";

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  gratuit: "Gratuit",
  standard: "Standard",
  vip: "VIP",
  early_bird: "Early Bird",
  groupe: "Pass groupe",
};

export interface FaqItem {
  question: string;
  answer: string;
}

export interface EventRecord {
  id: string;
  organization_id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  location: string | null;
  event_date: string | null;
  category: string | null;
  status: "draft" | "published" | "cancelled";
  faq: FaqItem[];
  created_at: string;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  type: string | null;
  plan: string;
  logo_url: string | null;
  brand_color: string;
}

export interface TicketCategoryRecord {
  id: string;
  event_id: string;
  name: string;
  type: TicketType;
  price: number;
  currency: string;
  quota: number;
  sold_count: number;
  group_size: number;
  sort_order: number;
}

export interface OrderRecord {
  id: string;
  event_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface TicketRecord {
  id: string;
  order_id: string;
  ticket_category_id: string;
  event_id: string;
  ticket_number: string;
  qr_token: string;
  holder_name: string;
  holder_email: string | null;
  status: "valid" | "used" | "cancelled";
  used_at: string | null;
  created_at: string;
}

export interface SponsorRecord {
  id: string;
  event_id: string;
  kind: "sponsor" | "exhibitor";
  name: string;
  logo_url: string | null;
  level: string | null;
  description: string | null;
  website: string | null;
  sort_order: number;
}

export interface ProgramSessionRecord {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  speaker: string | null;
  room: string | null;
  start_time: string | null;
  end_time: string | null;
  sort_order: number;
}
