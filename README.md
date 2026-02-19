# Attendance Management System

A production-ready SaaS web application for employee attendance tracking with geolocation support.

## 🚀 Tech Stack

- **Frontend**: Next.js 16 (App Router) with TypeScript
- **Backend**: Supabase (Authentication + PostgreSQL Database)
- **Styling**: TailwindCSS 4
- **Deployment**: Vercel
- **Maps**: Browser Geolocation API

## 📋 Project Structure

```
attendance-saas/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                 # Landing page
│   ├── login/                    # Authentication
│   ├── logout/                   # Logout handler
│   ├── setup/                    # Initial company setup
│   ├── dashboard/                # Employee dashboard
│   │   ├── page.tsx            # Check-in/check-out
│   │   ├── history/             # Attendance history
│   │   └── leave/               # Leave requests
│   ├── admin/                    # Admin dashboard
│   │   ├── page.tsx            # Employee management
│   │   ├── actions.ts           # Server actions
│   │   ├── settings/            # Company settings
│   │   ├── reports/             # Reports & analytics
│   │   ├── holidays/            # Holidays management
│   │   └── leave-requests/      # Leave requests management
│   └── profile/                  # Profile settings
├── components/                   # React components
│   └── navbar.tsx              # Navigation bar
├── lib/                         # Utility functions
│   └── supabase/             # Supabase client configurations
├── types/                       # TypeScript type definitions
│   ├── database.types.ts        # Database schema types
│   └── auth.types.ts           # Authentication types
├── supabase/                   # Database schema and migrations
│   ├── schema.sql              # Main database schema
│   └── migrations/             # Database migrations
├── DEPLOYMENT.md               # Deployment guide
├── API.md                      # API documentation
└── FEATURES.md                 # Feature documentation
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
   - Copy `service_role` key (for admin operations)

3. Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Step 3: Setup Database

1. Go to Supabase Dashboard → SQL Editor
2. Run the main schema: [`supabase/schema.sql`](supabase/schema.sql:1)
3. Run migrations in order:
   - [`supabase/migrations/20250218000000_add_employee_email.sql`](supabase/migrations/20250218000000_add_employee_email.sql:1)
   - [`supabase/migrations/20250219000000_add_company_settings.sql`](supabase/migrations/20250219000000_add_company_settings.sql:1)
   - [`supabase/migrations/20250219000001_add_holidays_table.sql`](supabase/migrations/20250219000001_add_holidays_table.sql:1)
   - [`supabase/migrations/20250219000002_add_leave_requests_table.sql`](supabase/migrations/20250219000002_add_leave_requests_table.sql:1)

### Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Development Status

- ✅ **Phase 1**: Project initialization
- ✅ **Phase 2**: Supabase setup & database schema
- ✅ **Phase 3**: Authentication system
- ✅ **Phase 4**: Employee dashboard
- ✅ **Phase 5**: Admin dashboard
- ✅ **Phase 6**: Advanced features (Reports, Holidays, Leave Requests)
- ✅ **Phase 7**: Documentation & Deployment

## 🔐 Features (Complete)

### Core Features
- ✅ User authentication & authorization
- ✅ Role-based access control (Admin/Employee)
- ✅ Company creation & setup
- ✅ Employee management (Add/Edit/Delete/Reset Password)
- ✅ Check-in/Check-out with geolocation
- ✅ Attendance records storage
- ✅ Admin dashboard with reports
- ✅ Employee dashboard with history
- ✅ Profile management
- ✅ Password change functionality
- ✅ Company settings (Working hours, Geofencing)
- ✅ Reports & analytics
- ✅ Holidays management
- ✅ Leave requests system
- ✅ Responsive design
- ✅ Dark mode support

### Advanced Features
- ✅ Row Level Security (RLS)
- ✅ Geofencing support
- ✅ Late detection threshold
- ✅ Multiple leave types
- ✅ Leave approval workflow
- ✅ Comprehensive analytics
- ✅ Data export ready structure

## 📚 Documentation

- **[FEATURES.md](FEATURES.md:1)** - Complete feature documentation
- **[API.md](API.md:1)** - API reference and usage
- **[DEPLOYMENT.md](DEPLOYMENT.md:1)** - Deployment guide

## 🚀 Deployment

### Quick Deploy to Vercel

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

For detailed deployment instructions, see [`DEPLOYMENT.md`](DEPLOYMENT.md:1).

## 🎯 User Roles

### Admin
- Create and manage company settings
- Add, edit, delete employees
- Reset employee passwords
- View all attendance records
- Generate reports and analytics
- Manage holidays
- Approve/reject leave requests

### Employee
- Check in and check out
- View attendance history
- Submit leave requests
- Cancel pending requests
- Manage profile settings

## 🔒 Security

- Row Level Security (RLS) on all tables
- Service role key for admin operations
- Secure session management
- Password hashing (handled by Supabase)
- Geolocation data encryption in transit
- Input validation on all forms

## 📊 Database Schema

### Tables
- `companies` - Company information and settings
- `employees` - Employee profiles and roles
- `attendance_records` - Check-in/check-out records
- `holidays` - Company holidays
- `leave_requests` - Employee leave requests

### Enums
- `employee_role` - admin, employee
- `attendance_status` - present, late, absent
- `leave_type` - annual, sick, personal, unpaid
- `leave_status` - pending, approved, rejected, cancelled

## 🧪 Testing

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Company creation
- [ ] Employee addition
- [ ] Check-in with geolocation
- [ ] Check-out with geolocation
- [ ] Attendance history view
- [ ] Report generation
- [ ] Holiday management
- [ ] Leave request submission
- [ ] Leave request approval/rejection
- [ ] Profile update
- [ ] Password change
- [ ] Logout functionality
- [ ] Dark mode toggle
- [ ] Mobile responsiveness

## 🐛 Troubleshooting

### Common Issues

**Issue: "NEXT_PUBLIC_SUPABASE_URL is not defined"**
- **Solution**: Ensure `.env.local` file exists with all required variables

**Issue: "RLS policy violation"**
- **Solution**: Verify RLS policies are applied in Supabase Dashboard

**Issue: "Geolocation not working"**
- **Solution**: Geolocation requires HTTPS in production. Use localhost for development.

**Issue: "Build fails with TypeScript errors"**
- **Solution**: Run `npm run build` to check for type errors

## 📈 Performance

- Optimized database queries with indexes
- Server-side rendering for initial load
- Client-side navigation for fast transitions
- Lazy loading for heavy components
- Efficient state management

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support:
- Review documentation in [`FEATURES.md`](FEATURES.md:1)
- Check API docs in [`API.md`](API.md:1)
- Follow deployment guide in [`DEPLOYMENT.md`](DEPLOYMENT.md:1)

---

**Built with ❤️ using Next.js and Supabase**
