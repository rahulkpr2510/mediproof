# Quick Reference Guide

## Common Commands

```bash
# Start development
npm run dev

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# View database
npx prisma studio

# Build for production
npm run build
npm start

# Lint code
npm run lint
```

## Key Routes

### Public
- `/` - Home
- `/verify` - QR verification
- `/contact` - Contact form
- `/report` - Report form
- `/sign-in` - Login
- `/sign-up` - Register

### Protected (auth required)
- `/onboarding` - Role selection & docs
- `/dashboard` - Role dashboard
- `/dashboard/admin` - Admin panel
- `/dashboard/manufacturer` - Manufacturer specific
- `/dashboard/distributor` - Distributor specific
- `/dashboard/pharmacy` - Pharmacy specific

## API Endpoints Summary

### Auth & Onboarding
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/onboarding` | Yes | Submit registration |
| GET | `/api/onboarding/status` | Yes | Check status |

### Admin
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/admin/approvals` | Admin | Approve/reject |
| GET | `/api/admin/members` | Admin | List members |
| GET | `/api/admin/reports` | Admin | View reports |

### Orders
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/suppliers` | Yes | List suppliers |
| GET | `/api/suppliers/[id]/medicines` | Yes | Get medicines |
| POST | `/api/orders` | Yes | Create order |

### Analytics
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/analytics/sales` | Yes | Sales data |

### Strip Codes
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/strip-codes` | Yes | Generate codes |
| GET | `/api/strip-codes` | Yes | Get codes |
| PATCH | `/api/strip-codes/[id]` | Yes | Mark used |

### Contact & Reports
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/contact` | No | Contact form |
| POST | `/api/reports/manual` | No | Report issue |
| GET | `/api/entities/search` | No | Search entities |

## Database Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| User | Authentication | clerkId, email, role, status |
| Manufacturer | Company profile | companyName, licenseNumber, gstNumber |
| Distributor | Company profile | companyName, licenseNumber |
| Pharmacy | Company profile | pharmacyName, licenseNumber |
| ManufacturerStock | Inventory | batchId, quantity |
| DistributorStock | Inventory | batchId, quantity |
| PharmacyStock | Inventory | batchId, quantity |
| Order | Orders | buyerId, supplierId, status |
| StripCode | Strip codes | code, batchId, used |
| ManualReport | Reports | entityType, status, description |

## User Roles

| Role | Dashboard | Can Do |
|------|-----------|--------|
| NONE | N/A | Verify, contact, report |
| ADMIN | /dashboard/admin | Approve users, view reports |
| MANUFACTURER | /dashboard/manufacturer | Create batches, manage stock |
| DISTRIBUTOR | /dashboard/distributor | Order, manage inventory |
| PHARMACY | /dashboard/pharmacy | Order, manage stock, sell |

## Testing Scenarios

### Scenario 1: New User Registration
1. Go to /sign-up
2. Create account
3. Redirected to /onboarding
4. Select role → connect wallet → upload docs
5. Redirected to dashboard (pending approval)
6. Admin approves in /dashboard/admin
7. Email notification sent
8. User can now access full dashboard

### Scenario 2: Create Order
1. Go to /dashboard → Orders tab
2. Select supplier from dropdown
3. Select medicine
4. Enter quantity
5. If qty > stock, mark as "special order"
6. Submit
7. Supplier receives order

### Scenario 3: Verify Medicine
1. Go to /verify
2. Click "Start Scanning"
3. Scan QR code OR enter 4-digit strip code
4. View verification result
5. See GREEN/AMBER/RED verdict

### Scenario 4: Report Issue
1. Go to /report
2. Search for entity (company name)
3. Enter description
4. Provide contact info
5. Submit report
6. Admin reviews in /dashboard/admin → Reports tab

## Debugging Tips

### Check Logs
```bash
# Browser console - client-side errors
npm run dev  # Terminal shows server logs
```

### Database Issues
```bash
# Reset database (careful!)
npx prisma migrate reset

# View data
npx prisma studio
```

### Auth Issues
```bash
# Clear browser storage
# Delete Clerk cookies
# Sign in again
```

### Email Not Sending
```bash
# Check RESEND_API_KEY in .env
# Verify email in Resend dashboard
# Check spam folder
```

## File Organization

```
New Files (Phase 1-7 implementation):
- app/(auth)/* - Authentication pages
- app/(app)/onboarding/* - Onboarding
- app/(app)/contact/* - Contact
- app/(app)/report/* - Reporting
- app/components/dashboard/ProfileHeader.tsx
- app/components/dashboard/DashboardTabs.tsx
- app/components/charts/SalesChart.tsx
- app/components/verification/ScanOnlyVerification.tsx
- app/components/orders/ContextAwareOrderForm.tsx
- app/api/onboarding/*
- app/api/admin/*
- app/api/suppliers/*
- app/api/orders/*
- app/api/analytics/*
- app/api/strip-codes/*
- app/api/contact/*
- app/api/reports/*
- app/api/entities/*
- middleware.ts
- lib/server/db.ts
- lib/server/email.ts
- prisma/migrations/0_init/migration.sql

Updated Files:
- app/layout.tsx (ClerkProvider)
- app/(app)/layout.tsx (Route protection)
- app/(app)/verify/page.tsx (ScanOnlyVerification)
- app/components/layout/AppShell.tsx (Auth UI)
- app/components/dashboard/ManufacturerOverview.tsx (Tabs)
- app/components/dashboard/AdminOverview.tsx (Enhanced)
- prisma/schema.prisma (New models)
```

## Environment Variables Checklist

- [ ] CLERK_PUBLISHABLE_KEY - From Clerk dashboard
- [ ] CLERK_SECRET_KEY - From Clerk dashboard
- [ ] RESEND_API_KEY - From Resend dashboard
- [ ] DATABASE_URL - PostgreSQL connection string

## Deployment Checklist

- [ ] All env vars set in Vercel project
- [ ] Database migrations run
- [ ] Clerk configured for production domain
- [ ] Resend configured for production email
- [ ] Test authentication flow
- [ ] Test email delivery
- [ ] Monitor error logs
- [ ] Set up backup strategy

## Getting Help

1. Check SUMMARY.md for overview
2. Read SETUP_INSTRUCTIONS.md for setup
3. Review IMPLEMENTATION_GUIDE.md for details
4. Check COMPLETION_CHECKLIST.md for status
5. Look at API endpoint table above
6. Check database schema in prisma/schema.prisma

---

Keep this file handy while working on MediProof!
