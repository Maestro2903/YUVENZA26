/**
 * Hand-written Supabase database types matching supabase/migrations/*.sql.
 * If you change the schema, update this file (or replace it with generated
 * types: `supabase gen types typescript --linked > lib/supabase/types.ts`).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type OrderStatus = "created" | "pending" | "paid" | "failed" | "cancelled";
export type PaymentStatus = "authorized" | "captured" | "failed" | "refunded" | "pending";
export type EventBadge = "Popular" | "New" | "Free";

export type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
};

export type PermissionRow = {
  key: string;
  label: string;
  category: string;
};

export type RolePermissionRow = {
  role_id: string;
  permission_key: string;
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CaseStudyRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  year: string;
  client: string | null;
  description: string;
  story: string | null;
  live_site: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  date_label: string;
  /** Calendar date (YYYY-MM-DD); drives time-clash detection. */
  event_date: string | null;
  /** "HH:MM[:SS]" - clash detection needs both start and end. */
  start_time: string | null;
  end_time: string | null;
  price: number;
  description: string;
  slots: string | null;
  /** Maximum paid registrations; null = unlimited. */
  capacity: number | null;
  /** 4:3 showcase image (media bucket URL) + alt text. */
  image_url: string | null;
  image_alt: string | null;
  /** Long-form write-up for the public events page. */
  details: string | null;
  /** Rules, one per line; rendered on the event's own page. */
  rules: string | null;
  badge: EventBadge | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type EventRegistrationRow = {
  event_slug: string;
  registered: number;
  updated_at: string;
};

export type SiteContentRow = {
  key: string;
  data: Json;
  updated_at: string;
  updated_by: string | null;
};

export type SiteSettingRow = {
  key: string;
  value: Json;
  updated_at: string;
  updated_by: string | null;
};

export type MediaRow = {
  id: string;
  bucket: string;
  path: string;
  alt: string | null;
  caption: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_by: string | null;
  created_at: string;
};

export type OrderRow = {
  id: string;
  razorpay_order_id: string | null;
  amount: number; // paise
  currency: string;
  status: OrderStatus;
  demo: boolean;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_college: string | null;
  event_slugs: string[];
  notes: Json | null;
  /** The signed-in visitor who placed the order (Google auth). */
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  order_id: string;
  razorpay_payment_id: string | null;
  status: PaymentStatus;
  method: string | null;
  amount: number | null; // paise
  error_reason: string | null;
  raw: Json | null;
  created_at: string;
};

export type AppSecretRow = {
  key: string;
  value: string; // AES-256-GCM ciphertext, never plaintext
  updated_at: string;
  updated_by: string | null;
};

type TableDef<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      roles: TableDef<RoleRow, "name">;
      permissions: TableDef<PermissionRow, "key" | "label" | "category">;
      role_permissions: TableDef<RolePermissionRow, "role_id" | "permission_key">;
      profiles: TableDef<ProfileRow, "id" | "email">;
      case_studies: TableDef<CaseStudyRow, "slug" | "title" | "category" | "year" | "description">;
      events: TableDef<EventRow, "slug" | "title" | "category" | "date_label" | "description">;
      event_registrations: TableDef<EventRegistrationRow, "event_slug">;
      site_content: TableDef<SiteContentRow, "key" | "data">;
      site_settings: TableDef<SiteSettingRow, "key" | "value">;
      media: TableDef<MediaRow, "bucket" | "path">;
      orders: TableDef<
        OrderRow,
        "amount" | "customer_name" | "customer_email" | "customer_phone" | "event_slugs"
      >;
      payments: TableDef<PaymentRow, "order_id" | "status">;
      app_secrets: TableDef<AppSecretRow, "key" | "value">;
    };
    Views: Record<string, never>;
    Functions: {
      has_permission: { Args: { perm: string }; Returns: boolean };
      current_role_name: { Args: Record<string, never>; Returns: string | null };
      promote_to_super_admin: { Args: { user_email: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
