# MediProof Setup Instructions

## Quick Start Guide

### 1. Prerequisites
- Node.js 18+ installed
- PostgreSQL database running
- Clerk account created (https://clerk.com)
- Resend account created (https://resend.com)

### 2. Environment Variables
All required environment variables have been added to your Vercel project:
- `CLERK_PUBLISHABLE_KEY` - Clerk frontend key
- `CLERK_SECRET_KEY` - Clerk backend secret
- `RESEND_API_KEY` - Resend email API key
- `DATABASE_URL` - PostgreSQL connection string

### 3. Database Setup
```bash
# Install dependencies
npm install
# or
pnpm install

# Generate Prisma client
npx prisma generate

# Run migrations (apply SQL schema)
npx prisma migrate deploy

# Optional: Open Prisma Studio to view data
npx prisma studio
```

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 5. First-Time Setup Flow

1. **Sign Up**
   - Go to `http://localhost:3000/sign-up`
   - Create account with email
   - This redirects to Clerk's hosted signup

2. **Onboarding**
   - After signup, you'll be redirected to `/onboarding`
   - Select your role (MANUFACTURER, DISTRIBUTOR, or PHARMACY)
   - Connect wallet (optional, click "Skip" if no wallet)
   - Upload business documents (PDF/JPG/PNG, max 10MB each)
   - Submit for approval

3. **Admin Approval**
   - Sign in as an admin (set role to ADMIN in database)
   - Go to `/dashboard/admin`
   - Review pending applications in "Pending Approvals" tab
   - Approve or reject with reason
   - Applicant receives email notification

4. **Access Dashboard**
   - Once approved, user can access role-specific dashboard
   - Access `/dashboard` to see personalized dashboard
   - View analytics, create orders, manage inventory

### 6. Key URLs

**Public Pages:**
- `/` - Home page
- `/verify` - Medicine verification (QR scan or strip code)
- `/contact` - Contact form
- `/report` - Manual anomaly reporting

**Authentication:**
- `/sign-in` - Sign in page
- `/sign-up` - Sign up page
- `/onboarding` - Role selection and document upload

**Protected Routes (require authentication):**
- `/dashboard` - Role-based dashboard
- `/dashboard/admin` - Admin panel (ADMIN role only)
- `/dashboard/manufacturer` - Manufacturer dashboard
- `/dashboard/distributor` - Distributor dashboard
- `/dashboard/pharmacy` - Pharmacy dashboard

### 7. Testing the System

#### Test Onboarding
```bash
1. Visit http://localhost:3000/sign-up
2. Create account
3. Complete onboarding form
4. Submit documents
5. Check admin dashboard for pending approvals
```

#### Test Ordering
```bash
1. Sign in as Distributor
2. Go to Orders tab
3. Select Manufacturer from supplier dropdown
4. Select medicine
5. Enter quantity
6. Submit order
```

#### Test Verification
```bash
1. Visit http://localhost:3000/verify
2. Click "Start Scanning"
3. Grant camera permissions
4. Scan QR code or enter 4-digit strip code
5. View verification result
```

#### Test Admin Features
```bash
1. Set your user role to ADMIN in database
2. Visit /dashboard/admin
3. Review Pending Approvals
4. View Members by role
5. Check Manual Reports
```

### 8. API Testing with cURL

#### Sign In User
```bash
curl -X POST http://localhost:3000/api/onboarding/status \
  -H "Content-Type: application/json"
```

#### Create Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId": "user-id",
    "batchId": "batch-001",
    "quantity": 100
  }'
```

#### Get Suppliers
```bash
curl http://localhost:3000/api/suppliers
```

#### Search Entities for Reporting
```bash
curl "http://localhost:3000/api/entities/search?q=manufacturer&role=MANUFACTURER"
```

### 9. Database Queries

#### View Users
```sql
SELECT id, email, role, status, "createdAt" FROM "User";
```

#### View Pending Applications
```sql
SELECT u.email, m."companyName", u.status FROM "User" u
LEFT JOIN "Manufacturer" m ON u.id = m."userId"
WHERE u.status = 'PENDING';
```

#### View Orders
```sql
SELECT * FROM "Order" ORDER BY "createdAt" DESC;
```

#### View Manual Reports
```sql
SELECT * FROM "ManualReport" WHERE status = 'PENDING';
```

### 10. Troubleshooting

#### Issue: "Unsupported auth config"
**Solution**: Check that CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are set correctly

#### Issue: "Database connection failed"
**Solution**: Verify DATABASE_URL is correct and database is running

#### Issue: "Email not sending"
**Solution**: Check RESEND_API_KEY is valid and email is whitelisted in Resend

#### Issue: "File upload fails"
**Solution**: Ensure file is PDF/JPG/PNG and under 10MB

#### Issue: "Prisma client not found"
**Solution**: Run `npx prisma generate`

#### Issue: "Type errors in components"
**Solution**: Run `npm install` and `npx prisma generate`

### 11. Deploying to Vercel

```bash
# Push code to GitHub
git add .
git commit -m "Add MediProof enhancements"
git push origin main

# Vercel will automatically detect and deploy
# Make sure all environment variables are set in Vercel project settings
```

### 12. Production Checklist

- [ ] Set all environment variables in Vercel project
- [ ] Update DATABASE_URL to production database
- [ ] Configure Clerk for production domain
- [ ] Update Resend from address to your domain
- [ ] Run database migrations on production
- [ ] Test all authentication flows
- [ ] Enable CORS for production domain
- [ ] Set up monitoring and error tracking
- [ ] Create backup strategy for database
- [ ] Test email notifications with real email addresses

## Support

For issues or questions:
1. Check COMPLETION_CHECKLIST.md for implementation status
2. Review IMPLEMENTATION_GUIDE.md for detailed documentation
3. Check error logs in console
4. Verify all environment variables are set
5. Check Clerk and Resend dashboards for service status
