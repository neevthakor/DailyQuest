# DailyQuest v4 — Vercel & Production Deployment Guide

## 1. Vercel Project Configuration
`vercel.json` is pre-configured at the repository root:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **SPA Rewrites:** All routes rewrite to `/index.html` so refreshing the browser never causes a 404.
- **Security Headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

## 2. Environment Variables (Vercel Dashboard → Settings → Environment Variables)
Configure **only** public client keys in `VITE_*` variables:
- `VITE_SUPABASE_URL` = `https://<your-project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `<your-supabase-anon-public-key>`

> **Security Rule:** NEVER place `SUPABASE_SERVICE_ROLE_KEY` or private AI API keys in `VITE_*` frontend variables.

## 3. Supabase Auth Redirect URLs
In **Supabase Dashboard → Authentication → URL Configuration**:
- Set **Site URL** to your production Vercel domain (`https://<your-domain>.vercel.app`).
- Add `https://<your-domain>.vercel.app/**` and `http://localhost:5173/**` under **Redirect URLs**.

## 4. Deploying via GitHub or Vercel CLI
- **Automatic (Recommended):** Push to `main` on `https://github.com/neevthakor/DailyQuest` — Vercel automatically builds and deploys.
- **Manual via CLI:** Run `npx vercel --prod` from `C:\Users\NEEV\OneDrive\drive\OneDrive\Desktop\DailyQuest-main`.
