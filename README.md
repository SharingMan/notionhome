# Notion Calendar Sync

A premium, glassmorphism-styled application that syncs your Notion databases to Apple Calendar (ICS) in real-time.

## Features
-   **Real-time Sync**: Updates from Notion reflect instantly in your calendar.
-   **Secure**: Uses official Notion OAuth.
-   **Customizable**: Map any Notion database properties to calendar events.
-   **Beautiful UI**: Modern, responsive design.

## Setup Guide

### 1. Notion Integration
1.  Go to [Notion My Integrations](https://www.notion.so/my-integrations).
2.  Create a new integration.
3.  Select "Public" (needed for OAuth) or "Internal" (if self-hosted without OAuth flow, but this app uses OAuth). 
    *   *Note: For personal use, you can skip OAuth and hardcode a token, but this app is built for OAuth.*
    *   If using OAuth:
        *   Redirect URI: `https://your-app.up.railway.app/api/auth/callback/notion` (Replace domain after deployment)
        *   For local dev: `http://localhost:3000/api/auth/callback/notion`
4.  Copy **Client ID** and **Client Secret**.

### 2. Environment Variables
Create a `.env` file (or configure in Railway):

```env
DATABASE_URL="file:./dev.db"  # Or your Postgres URL
NOTION_CLIENT_ID="your_client_id"
NOTION_CLIENT_SECRET="your_client_secret"
NOTION_REDIRECT_URI="http://localhost:3000/api/auth/callback/notion" # Update for production
NEXT_PUBLIC_BASE_URL="http://localhost:3000" # Your public app URL (used when generating feed URL)
```

### 3. Local Development
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 4. Deployment (Railway)
1.  Fork/Push this repo to GitHub.
2.  Login to Railway and "New Project" -> "Deploy from GitHub".
3.  Select this repository.
4.  Add the Environment Variables in Railway settings.
    *   Update `NOTION_REDIRECT_URI` to your Railway domain (e.g., `https://project.up.railway.app/api/auth/callback/notion`).
    *   Set `NEXT_PUBLIC_BASE_URL` to your Railway domain (e.g., `https://project.up.railway.app`).
5.  **Database**:
    *   By default, this uses SQLite. on Railway, user data will be lost on redeploy unless you mount a volume.
    *   **Recommended**: Add a Postgres plugin in Railway, and update `DATABASE_URL` to the Postgres connection string.
    *   The app is compatible with Postgres (Prisma will handle it). You may need to update `prisma/schema.prisma` provider to `postgresql` if you switch.

## Usage
1.  Open the app.
2.  Click "Connect Notion".
3.  Select your workspace and allow access.
4.  Choose the database you want to sync.
5.  Map the Title and Date properties.
6.  Copy the generated URL.
7.  In Apple Calendar (macOS): `File` -> `New Calendar Subscription` -> Paste URL.
8.  In iOS: `Settings` -> `Calendar` -> `Accounts` -> `Add Account` -> `Other` -> `Add Subscribed Calendar`.

## Tech Stack
-   **Framework**: Next.js 16 (App Router)
-   **Styling**: TailwindCSS
-   **Database**: Prisma (SQLite/Postgres)
-   **Calendar Generation**: `ics` package
-   **Notion**: Client SDK
