# Guía de Despliegue en Vercel - THE SANCTUARY

Esta guía detalla los pasos para desplegar el proyecto "Saint Seiya Store" en Vercel de forma automática y segura.

## Preparación del Repositorio

1. Asegúrate de que todos los cambios estén en la rama principal (`main` o la que prefieras).
2. El proyecto ya incluye el adaptador `@astrojs/vercel` y los scripts necesarios en `package.json`.

## Pasos para el Despliegue

1. **Conectar a Vercel**:
   - Ve al [Dashboard de Vercel](https://vercel.com/dashboard).
   - Haz clic en **"Add New..."** -> **"Project"**.
   - Importa el repositorio desde GitHub/GitLab.

2. **Configuración del Proyecto**:
   - Vercel debería detectar automáticamente que es un proyecto de **Astro**.
   - **Root Directory**: `./` (Raíz).
   - **Build Command**: `npm run build` (Esto ejecutará `prisma generate && astro build`).
   - **Install Command**: `npm install`.

3. **Variables de Entorno**:
   Debes configurar las siguientes variables en el Dashboard de Vercel (**Settings -> Environment Variables**):

| Variable                   | Descripción                                                                                            | Ejemplo                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `DATABASE_URL`             | URL de conexión a la base de datos (PostgreSQL). Para Supabase con pooling, usa el modo `transaction`. | `postgres://user:pass@host:6543/db?pgbouncer=true` |
| `DIRECT_URL`               | URL de conexión directa a la base de datos (necesaria para migraciones de Prisma).                     | `postgres://user:pass@host:5432/db`                |
| `SUPABASE_URL`             | URL del proyecto Supabase.                                                                             | `https://xxxx.supabase.co`                         |
| `SUPABASE_ANON_KEY`        | Key anónima de Supabase.                                                                               | `eyJhbGci...`                                      |
| `PUBLIC_SUPABASE_URL`      | Igual que `SUPABASE_URL` (para uso en el cliente).                                                     | `https://xxxx.supabase.co`                         |
| `PUBLIC_SUPABASE_ANON_KEY` | Igual que `SUPABASE_ANON_KEY` (para uso en el cliente).                                                | `eyJhbGci...`                                      |
| `RESEND_API_KEY`           | API Key de Resend para envío de correos.                                                               | `re_...`                                           |
| `R2_ACCESS_KEY_ID`         | Access Key ID de Cloudflare R2.                                                                        | `...`                                              |
| `R2_SECRET_ACCESS_KEY`     | Secret Access Key de Cloudflare R2.                                                                    | `...`                                              |
| `R2_BUCKET`                | Nombre del bucket en R2.                                                                               | `saint-seiya-store`                                |
| `R2_ENDPOINT`              | Endpoint S3 de tu bucket R2.                                                                           | `https://xxxx.r2.cloudflarestorage.com`            |

## Consideraciones Post-Despliegue

- **Base de Datos**: Si usas Supabase, asegúrate de activar el Connection Pooling si esperas mucho tráfico, y usa la `DATABASE_URL` correspondiente.
- **Prisma Client**: El comando de build genera automáticamente el cliente de Prisma para que esté disponible en las Serverless Functions de Vercel.
- **Analytics**: Se ha habilitado Vercel Web Analytics en `astro.config.mjs`.

---

_Desarrollado con cosmos y precisión por el equipo de DevOps del Santuario._
