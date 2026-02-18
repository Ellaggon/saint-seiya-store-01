# Environment Provisioning Blueprint

Purpose:
Define all external services and environment requirements.

---

## 1. Services Used

Infrastructure:
- Supabase (PostgreSQL + Auth)
- Vercel (Deployment)
- Cloudflare R2 (Storage)
- Resend (Transactional Email)

Repository:
- GitHub

Observability:
- Sentry (optional)

---

## 2. Required Environment Variables

DATABASE_URL
DIRECT_URL
SUPABASE_URL
SUPABASE_ANON_KEY
RESEND_API_KEY
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_ENDPOINT

---

## 3. Secret Handling Rules

Agent must never:
- print secrets
- commit secrets
- modify environment configuration
- rotate credentials

---

## 4. Environment Types

Development:
- Local database allowed
- Debug logging enabled

Staging:
- Separate Supabase project
- Limited storage bucket

Production:
- Production Supabase project
- Production R2 bucket
- Production Resend domain

---

## 5. Deployment Flow

Local change
→ GitHub push
→ Vercel deploy
→ Prisma migrate deploy
→ Runtime monitored by Sentry