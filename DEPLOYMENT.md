# Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- Node.js 18+ installed
- A Supabase account and project
- Git (optional, for version control)

## Environment Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd attendance-saas
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file:

```bash
cp .env.local.example .env.local
```

Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important:** Get these values from your Supabase Dashboard → Settings → API

## Database Setup

### 1. Apply the Main Schema

1. Go to Supabase Dashboard → SQL Editor
2. Open [`supabase/schema.sql`](supabase/schema.sql:1)
3. Copy and paste the entire SQL script
4. Click "Run" to execute

### 2. Apply Migrations

Run the following migrations in order:

#### Migration 1: Add Employee Email
```sql
-- Copy content from supabase/migrations/20250218000000_add_employee_email.sql
```

#### Migration 2: Add Company Settings
```sql
-- Copy content from supabase/migrations/20250219000000_add_company_settings.sql
```

#### Migration 3: Add Holidays Table
```sql
-- Copy content from supabase/migrations/20250219000001_add_holidays_table.sql
```

#### Migration 4: Add Leave Requests Table
```sql
-- Copy content from supabase/migrations/20250219000002_add_leave_requests_table.sql
```

### 3. Verify Tables

After applying all migrations, verify the following tables exist:
- `companies`
- `employees`
- `attendance_records`
- `holidays`
- `leave_requests`

## Local Development

### Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Push to GitHub**

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

2. **Deploy to Vercel**

- Go to [vercel.com](https://vercel.com)
- Click "Add New Project"
- Import your GitHub repository
- Configure environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Click "Deploy"

### Option 2: Netlify

1. **Build the Project**

```bash
npm run build
```

2. **Deploy**

- Install Netlify CLI: `npm install -g netlify-cli`
- Run: `netlify deploy --prod --dir=.next`

### Option 3: Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t attendance-saas .
docker run -p 3000:3000 attendance-saas
```

## Post-Deployment Checklist

- [ ] Test user registration/login
- [ ] Test company creation
- [ ] Test employee check-in/check-out
- [ ] Test geolocation tracking
- [ ] Test admin dashboard
- [ ] Test employee dashboard
- [ ] Test leave requests
- [ ] Test holiday management
- [ ] Test reports generation
- [ ] Verify dark mode works
- [ ] Test mobile responsiveness
- [ ] Check all RLS policies are working

## Troubleshooting

### Issue: "Missing NEXT_PUBLIC_SUPABASE_URL"

**Solution:** Ensure `.env.local` exists and contains all required variables.

### Issue: "RLS Policy Violation"

**Solution:** Verify all RLS policies are applied in Supabase Dashboard → Authentication → Policies.

### Issue: "Geolocation not working"

**Solution:** Ensure HTTPS is enabled (geolocation requires secure context in production).

### Issue: "Build fails"

**Solution:**
1. Clear cache: `rm -rf .next node_modules`
2. Reinstall: `npm install`
3. Rebuild: `npm run build`

## Monitoring

### Enable Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to Logs
3. Monitor for errors and performance issues

### Enable Vercel Analytics

1. Go to Vercel Dashboard
2. Navigate to Analytics
3. Monitor traffic and performance

## Security Best Practices

1. **Never commit `.env.local`** - Add it to `.gitignore`
2. **Rotate API keys** - Regularly update service role keys
3. **Enable 2FA** - On Supabase account
4. **Monitor access logs** - Review suspicious activity
5. **Keep dependencies updated** - Run `npm audit` regularly

## Backup Strategy

### Database Backups

Supabase automatically backs up your database. To manually backup:

1. Go to Supabase Dashboard
2. Navigate to Database → Backups
3. Click "Create backup"

### Application Backups

```bash
# Backup code
git push origin main

# Backup environment variables
cp .env.local .env.local.backup
```

## Support

For issues or questions:
- Check [Supabase Documentation](https://supabase.com/docs)
- Check [Next.js Documentation](https://nextjs.org/docs)
- Review project README.md
