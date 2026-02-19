# API Documentation

## Overview

This document describes the Server Actions and database operations used in the Attendance SaaS application.

## Authentication

### Client Setup

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
```

### Server Setup

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
```

### Admin Setup

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

const admin = createAdminClient()
```

## Server Actions

### Employee Management

#### Add Employee

**Endpoint:** `app/admin/actions.ts` → `addEmployee()`

**Parameters:**
- `email` (string, required) - Employee email
- `fullName` (string, required) - Employee full name
- `role` (string, required) - Either 'admin' or 'employee'

**Returns:**
```typescript
{
  success: true,
  temporaryPassword: string
}
// or
{
  success: false,
  error: string
}
```

**Example:**
```typescript
const formData = new FormData()
formData.append('email', 'john@example.com')
formData.append('fullName', 'John Doe')
formData.append('role', 'employee')

const result = await addEmployee(formData)
```

#### Update Employee

**Endpoint:** `app/admin/actions.ts` → `updateEmployee()`

**Parameters:**
- `employeeId` (string, required) - Employee ID
- `fullName` (string, required) - New full name
- `role` (string, required) - New role ('admin' or 'employee')

**Returns:**
```typescript
{
  success: true
}
// or
{
  success: false,
  error: string
}
```

#### Delete Employee

**Endpoint:** `app/admin/actions.ts` → `deleteEmployee()`

**Parameters:**
- `employeeId` (string, required) - Employee ID to delete

**Returns:**
```typescript
{
  success: true
}
// or
{
  success: false,
  error: string
}
```

**Note:** You cannot delete yourself.

#### Reset Employee Password

**Endpoint:** `app/admin/actions.ts` → `resetEmployeePassword()`

**Parameters:**
- `employeeId` (string, required) - Employee ID

**Returns:**
```typescript
{
  success: true,
  temporaryPassword: string
}
// or
{
  success: false,
  error: string
}
```

### Attendance Management

#### Check In

**Endpoint:** `app/dashboard/actions.ts` → `checkIn()`

**Parameters:**
- `geo` (object, optional) - Geolocation data
  - `latitude` (number)
  - `longitude` (number)

**Returns:**
```typescript
{
  success: true
}
// or
{
  success: false,
  error: string
}
```

**Example:**
```typescript
const geo = await getGeo()
const result = await checkIn(geo)
```

#### Check Out

**Endpoint:** `app/dashboard/actions.ts` → `checkOut()`

**Parameters:**
- `geo` (object, optional) - Geolocation data

**Returns:**
```typescript
{
  success: true
}
// or
{
  success: false,
  error: string
}
```

## Database Tables

### Companies

**Table:** `public.companies`

**Columns:**
- `id` (UUID, primary key)
- `name` (TEXT, required) - Company name
- `created_at` (TIMESTAMPTZ, auto) - Creation timestamp
- `work_start_time` (TIME, optional) - Work start time (e.g., '09:00:00')
- `work_end_time` (TIME, optional) - Work end time (e.g., '17:00:00')
- `allowed_latitude` (DOUBLE PRECISION, optional) - Geofencing latitude
- `allowed_longitude` (DOUBLE PRECISION, optional) - Geofencing longitude
- `allowed_radius_meters` (INTEGER, optional) - Geofencing radius
- `late_threshold_minutes` (INTEGER, optional) - Late threshold in minutes

**Example Query:**
```typescript
const { data } = await supabase
  .from('companies')
  .select('*')
  .eq('id', companyId)
```

### Employees

**Table:** `public.employees`

**Columns:**
- `id` (UUID, primary key)
- `company_id` (UUID, foreign key → companies)
- `user_id` (UUID, foreign key → auth.users)
- `full_name` (TEXT, required)
- `email` (TEXT, optional)
- `role` (employee_role, required) - 'admin' or 'employee'
- `created_at` (TIMESTAMPTZ, auto)

**Example Query:**
```typescript
const { data } = await supabase
  .from('employees')
  .select('*')
  .eq('company_id', companyId)
  .order('created_at', { ascending: true })
```

### Attendance Records

**Table:** `public.attendance_records`

**Columns:**
- `id` (UUID, primary key)
- `employee_id` (UUID, foreign key → employees)
- `check_in_time` (TIMESTAMPTZ, required)
- `check_out_time` (TIMESTAMPTZ, optional)
- `latitude` (DOUBLE PRECISION, required)
- `longitude` (DOUBLE PRECISION, required)
- `status` (attendance_status, required) - 'present', 'late', or 'absent'
- `created_at` (TIMESTAMPTZ, auto)

**Example Query:**
```typescript
const { data } = await supabase
  .from('attendance_records')
  .select('*')
  .eq('employee_id', employeeId)
  .gte('check_in_time', startDate)
  .lte('check_in_time', endDate)
  .order('check_in_time', { ascending: false })
```

### Holidays

**Table:** `public.holidays`

**Columns:**
- `id` (UUID, primary key)
- `company_id` (UUID, foreign key → companies)
- `name` (TEXT, required) - Holiday name
- `date` (DATE, required) - Holiday date
- `is_recurring` (BOOLEAN, default: false) - Yearly recurring
- `created_at` (TIMESTAMPTZ, auto)

**Example Query:**
```typescript
const { data } = await supabase
  .from('holidays')
  .select('*')
  .eq('company_id', companyId)
  .gte('date', new Date().toISOString())
  .order('date', { ascending: true })
```

### Leave Requests

**Table:** `public.leave_requests`

**Columns:**
- `id` (UUID, primary key)
- `company_id` (UUID, foreign key → companies)
- `employee_id` (UUID, foreign key → employees)
- `leave_type` (leave_type, required) - 'annual', 'sick', 'personal', or 'unpaid'
- `start_date` (DATE, required)
- `end_date` (DATE, required)
- `reason` (TEXT, optional)
- `status` (leave_status, default: 'pending') - 'pending', 'approved', 'rejected', or 'cancelled'
- `approved_by` (UUID, foreign key → employees, optional)
- `approved_at` (TIMESTAMPTZ, optional)
- `rejection_reason` (TEXT, optional)
- `created_at` (TIMESTAMPTZ, auto)
- `updated_at` (TIMESTAMPTZ, auto)

**Example Query:**
```typescript
const { data } = await supabase
  .from('leave_requests')
  .select('*')
  .eq('company_id', companyId)
  .eq('status', 'pending')
  .order('created_at', { ascending: false })
```

## Enums

### Employee Role

```typescript
type employee_role = 'admin' | 'employee'
```

### Attendance Status

```typescript
type attendance_status = 'present' | 'late' | 'absent'
```

### Leave Type

```typescript
type leave_type = 'annual' | 'sick' | 'personal' | 'unpaid'
```

### Leave Status

```typescript
type leave_status = 'pending' | 'approved' | 'rejected' | 'cancelled'
```

## Row Level Security (RLS)

All tables have RLS policies that ensure:

1. **Users can only access their own company data**
2. **Admins can manage all company data**
3. **Employees can only manage their own records**
4. **Service role key bypasses RLS for admin operations**

## Error Handling

### Common Errors

#### Authentication Errors

```typescript
{
  message: "Invalid login credentials"
}
```

**Solution:** Verify email and password are correct.

#### Permission Errors

```typescript
{
  message: "new row violates row-level security policy"
}
```

**Solution:** Verify user has appropriate role (admin/employee).

#### Validation Errors

```typescript
{
  message: "null value in column \"full_name\" violates not-null constraint"
}
```

**Solution:** Ensure all required fields are provided.

## Rate Limiting

Supabase has built-in rate limiting. For custom rate limiting, implement middleware:

```typescript
// middleware.ts
const rateLimit = new Map()

export async function middleware(request: NextRequest) {
  const ip = request.ip
  const now = Date.now()
  const requests = rateLimit.get(ip) || []

  // Filter out requests older than 1 minute
  const recentRequests = requests.filter(r => now - r < 60000)

  if (recentRequests.length > 100) {
    return new NextResponse('Too many requests', { status: 429 })
  }

  recentRequests.push(now)
  rateLimit.set(ip, recentRequests)

  // ... rest of middleware
}
```

## Webhooks

### Supabase Webhooks

Configure webhooks in Supabase Dashboard → Database → Webhooks

**Events to listen for:**
- `INSERT` on `attendance_records`
- `UPDATE` on `leave_requests`
- `INSERT` on `holidays`

**Example webhook handler:**
```typescript
// app/api/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const payload = await request.json()

  if (payload.type === 'INSERT' && payload.table === 'attendance_records') {
    // Send notification
    await sendNotification(payload.record)
  }

  return NextResponse.json({ received: true })
}
```

## Best Practices

1. **Always validate input** on both client and server
2. **Use transactions** for multi-step operations
3. **Handle errors gracefully** with user-friendly messages
4. **Log errors** for debugging
5. **Use prepared statements** (Supabase does this automatically)
6. **Implement caching** for frequently accessed data
7. **Use pagination** for large datasets
8. **Optimize queries** with proper indexes

## Support

For API-related issues:
- Check Supabase Dashboard logs
- Review RLS policies
- Verify environment variables
- Check network connectivity
