/// <reference types="astro/client" />

import type { User } from "@prisma/client";

declare global {
  namespace App {
    interface Locals {
      user: User | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly SUPABASE_PUBLISHABLE_KEY: string;
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  readonly NEXT_PUBLIC_SUPABASE_URL: string;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  readonly DATABASE_URL: string;
  readonly DIRECT_URL: string;
  readonly RESEND_API_KEY: string;
  readonly R2_ACCESS_KEY_ID: string;
  readonly R2_SECRET_ACCESS_KEY: string;
  readonly R2_BUCKET: string;
  readonly R2_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
