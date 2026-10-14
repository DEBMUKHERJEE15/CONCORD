# Render Deployment Guide — CONCORD Group Trip Negotiator

This guide details how to deploy **CONCORD** to [Render](https://render.com) using either the Render Web Dashboard or the Infrastructure-as-Code Blueprint (`render.yaml`).

---

## Method 1: Deploy via Render Web Dashboard (Recommended)

### Step 1: Push Repository to GitHub or GitLab
Ensure your code is pushed to a Git repository:
```bash
git init
git add .
git commit -m "feat: complete CONCORD MVP"
git remote add origin https://github.com/your-username/concord-group-trip-negotiator.git
git push -u origin main
```

### Step 2: Create a New Web Service on Render
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect your repository (`concord-group-trip-negotiator`).
4. Configure the service settings:
   - **Name**: `concord-group-trip-negotiator`
   - **Environment**: `Node`
   - **Region**: Any preferred region (e.g., `Oregon (US West)` or `Singapore`)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Starter` (or `Free` for testing)

### Step 3: Configure Environment Variables
Under the **Environment Variables** section, add:

| Key | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Recommended Next.js production mode |
| `GEMMA_API_KEY` | `your_hosted_gemma_api_key` | Obtained from Google AI Studio / Google Gen AI |
| `GEMMA_MODEL` | `gemma-4-26b-a4b-it` | Default supported hosted Gemma 4 model |

> **Important**: Never commit `GEMMA_API_KEY` to Git. Always add it securely via the Render environment variables tab.

### Step 4: Deploy and Verify
1. Click **Create Web Service**.
2. Wait for the build and deployment logs to display:
   ```
   ✓ Compiled successfully
   ✓ Generating static pages (7/7)
   ✓ Finalizing page optimization
   ▲ Next.js 14.2.20
   - Local: http://localhost:10000
   ```
3. Test the deployment:
   - Health check: `https://<your-render-url>.onrender.com/api/health`
   - Dashboard: `https://<your-render-url>.onrender.com/`

---

## Method 2: Deploy via Blueprint (`render.yaml`)

1. Connect your repository to Render.
2. In the Render Dashboard, click **Blueprints** → **New Blueprint Instance**.
3. Select the repository containing `render.yaml`.
4. When prompted, supply the value for `GEMMA_API_KEY`.
5. Click **Apply**. Render will automatically provision the Node web service according to `render.yaml`.

---

## Health Check & Monitoring
- Render automatically monitors the HTTP status of your service.
- The unauthenticated health endpoint is available at `/api/health`.
