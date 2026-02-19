# Attendance Management System

A production-ready SaaS web application for employee attendance tracking with geolocation support.

## 🚀 Tech Stack

- **Frontend**: Next.js 16 (App Router) with TypeScript
- **Backend**: Supabase (Authentication + PostgreSQL Database)
- **Styling**: TailwindCSS
- **Deployment**: Vercel
- **Maps**: Browser Geolocation API

## 📋 Project Structure

```
attendance-saas/
├── app/                    # Next.js App Router pages
├── components/             # React components
├── lib/                   # Utility functions
│   └── supabase/         # Supabase client configurations
├── types/                 # TypeScript type definitions
├── middleware.ts          # Next.js middleware for auth
└── .env.local.example     # Environment variables template
```

## 🛠️ Setup Instructions

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Get your Supabase credentials:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create a new project (or use existing)
   - Go to Settings → API
   - Copy `Project URL` and `anon public` key

3. Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

### Step 3: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Development Phases

- ✅ **Phase 1**: Project initialization
- ⏳ **Phase 2**: Supabase setup & database schema
- ⏳ **Phase 3**: Authentication system
- ⏳ **Phase 4**: Employee dashboard
- ⏳ **Phase 5**: Admin dashboard
- ⏳ **Phase 6**: Testing & deployment

## 🔐 Features (MVP)

- Admin login
- Company creation
- Employee management
- Employee login
- Check-in/Check-out with geolocation
- Attendance records storage
- Admin dashboard with reports

## 📚 Next Steps

After completing Step 1, proceed to Step 2: Supabase Setup & Database Schema.
