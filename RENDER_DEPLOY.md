#!/bin/bash
set -euo pipefail

# Render One-Click Deployment Blueprint Generator
# This creates a deployment-ready configuration for Render.com

cat > /tmp/render-deploy-instructions.md << 'EOF'
# 🚀 One-Click Render Deployment

## Step 1: Go to Render (Takes 30 seconds)
1. Open https://render.com
2. Click "Get Started" (top right)
3. Sign up with GitHub (authorize Mayhem1380/wages-of-war-casino repo)

## Step 2: Deploy from Blueprint (Takes 2 minutes)
1. In your Render dashboard, click **"New +"** → **"Blueprint"**
2. Select your GitHub repo: `Mayhem1380/wages-of-war-casino`
3. Click **"Deploy"** 

Render will automatically:
- ✅ Build your frontend (React)
- ✅ Build your backend (Python/FastAPI)
- ✅ Deploy both services
- ✅ Generate a live URL

## Step 3: Configure Environment (If needed for payments)
After deployment, go to each service in your Render dashboard:

**Backend Service Settings:**
- Add `STRIPE_SECRET_KEY` (if using live Stripe)
- Add `NOWPAYMENTS_API_KEY` (if using crypto payments)
- Add database URL if using external MongoDB

**Frontend Service Settings:**
- It will auto-detect your backend URL

## Step 4: Go Live
Your casino is now live at the URL Render provides!

---

## What Render Does For You:
- Free SSL certificate
- Auto-deploys on every push to main
- Automatic health checks
- Database options available
- CDN included

## Cost:
- **Free tier** = perfect for testing, small traffic
- **Paid tier** = $7-12/month for production traffic

---

## If You Need Help:
- Render support: support.render.com
- Your repo health: github.com/Mayhem1380/wages-of-war-casino/actions

**That's literally it. Your platform will be live in under 5 minutes.**
EOF

cat /tmp/render-deploy-instructions.md
