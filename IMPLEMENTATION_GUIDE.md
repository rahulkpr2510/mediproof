# MediProof Enhanced Implementation Guide

## Overview
This guide documents all the major enhancements made to MediProof across 7 implementation phases.

## Phase 1: Auth & Onboarding (Clerk + Database Schema)

### Database Schema Updates
- **User Model**: Core authentication with Clerk integration, email, wallet address, role, and status
- **Role Models**: Manufacturer, Distributor, Pharmacy with company details, license numbers, and verified badges
- **Inventory Models**: ManufacturerStock, DistributorStock, PharmacyStock for tracking batch quantities
- **Strip Codes**: Unique 4-digit codes for loose medicine verification
- **Manual Reports**: User-submitted anomaly reports with admin review workflow
- **Orders**: Context-aware ordering system with special order flagging for stock overages

### Authentication Implementation
- **Clerk Integration**: `/app/(auth)/sign-in` and `/app/(auth)/sign-up` pages with dark theme
- **Middleware**: Route protection via `middleware.ts` - all `/app` routes require authentication
- **ClerkProvider**: Wrapped in root layout with custom dark theme styling
- **Protected Routes**: `/app` routes automatically redirect unauthenticated users to sign-in

### Onboarding Flow
- **Onboarding Page** (`/app/onboarding`): Multi-step form for role selection, wallet connection, and document uploads
- **Document Upload**: File validation (PDF/JPG/PNG, max 10MB), type checking on backend
- **Status Tracking**: Real-time status checking via `/api/onboarding/status`
- **Email Notifications**: Resend integration for approval/rejection notifications

## Phase 2: Admin Dashboard Enhancements

### Admin Dashboard Features
- **Pending Approvals Tab**: 
  - Lists all pending user registrations with company details
  - Approve/reject with reason tracking
  - Email notifications sent to applicants
  
- **Members Tab**:
  - View all approved members by role
  - See verified badges and company information
  - Revoke permissions action
  
- **Reports Tab**:
  - View manual anomaly reports (pending/reviewing/resolved/dismissed)
  - Filter by status
  - Admin notes and resolution tracking

### Admin API Routes
- `POST /api/admin/approvals` - Approve/reject applications
- `GET /api/admin/members` - List all members by role
- `GET /api/admin/reports` - View manual reports

## Phase 3: Enhanced Role Dashboards with Charts

### Dashboard Components
- **ProfileHeader**: Displays verified badge, company name, and role
- **DashboardTabs**: Tabbed navigation (Products, Orders, Inventory, Analytics)
- **SalesChart**: Time-series sales analytics with week/month/year filters using Recharts

### Role Dashboard Updates
- **ManufacturerOverview**: Tabs for products/batches, orders, inventory, and production analytics
- **DistributorOverview**: Similar structure with distributor-specific data
- **PharmacyOverview**: Pharmacy sales and inventory tracking

### Analytics API
- `GET /api/analytics/sales?role=X&timeframe=Y` - Sales data by role and timeframe

## Phase 4: Context-Aware Ordering System

### Ordering Features
- **Supplier Selection**: Dropdown list of approved suppliers by role
- **Medicine Availability**: Dynamically fetch medicines available from selected supplier
- **Quantity Validation**: Cap quantities based on available stock
- **Special Orders**: Flag orders exceeding available stock for manual approval

### API Routes
- `GET /api/suppliers` - List approved suppliers by role
- `GET /api/suppliers/[id]/medicines` - Get medicines available from supplier with stock
- `POST /api/orders` - Create order with validation

### ContextAwareOrderForm Component
- Role-aware supplier filtering
- Dynamic medicine list based on supplier selection
- Quantity validation with special order flagging
- Zod schema validation for all inputs

## Phase 5: Loose Medicine Strip Codes

### Strip Code Generation
- Generate N unique 4-digit codes per unit batch
- Track strip number and usage status
- Verify codes during pharmacy sales

### Strip Code API
- `POST /api/strip-codes` - Generate strip codes for batch
- `GET /api/strip-codes?batchId=X` - Retrieve codes
- `PATCH /api/strip-codes/[id]` - Mark code as used

## Phase 6: Verification Page Overhaul

### Scan-Only Verification
- **QR Code Scanning**: Camera-based scanning using jsQR library
- **Manual Strip Code Entry**: For loose medicine verification
- **No Manual Inputs**: Removed all manual batch/unit ID entry
- **Verification Flow**:
  1. Scan QR code OR enter strip code
  2. System fetches blockchain data
  3. Checks supply chain, cold-chain, anomalies
  4. Returns GREEN/AMBER/RED verdict

### Verification Routes
- `GET /api/verify?qrCode=X` - Verify scanned QR code
- `GET /api/verify?stripCode=X` - Verify strip code

## Phase 7: Contact & Manual Reporting

### Contact Page (`/app/contact`)
- Email form for general inquiries
- Integrated with Resend for email delivery
- `POST /api/contact` - Submit contact form

### Report Page (`/app/report`)
- Manual anomaly report form for non-authenticated users
- Entity search with autocomplete (role + name)
- Description and contact info submission
- `POST /api/reports/manual` - Submit report
- `GET /api/entities/search?q=X` - Search entities for reporting

### Features
- Reporter name/email/phone capture
- Status tracking (PENDING/REVIEWING/RESOLVED/DISMISSED)
- Admin review workflow with notes

## Security Implementation

### Backend Validation
- **Zod Schemas**: All API inputs validated with Zod
- **File Upload**: MIME type and size validation on backend
- **SQL Injection Prevention**: Parameterized queries with Prisma
- **Authentication**: Clerk for user verification, session tokens for API

### Route Protection
- Middleware checks authentication on all `/app` routes
- Role-based access control via Clerk custom claims
- Admin routes require ADMIN role

### Environment Variables
- `CLERK_PUBLISHABLE_KEY`: Frontend Clerk key
- `CLERK_SECRET_KEY`: Backend verification
- `RESEND_API_KEY`: Email service
- `DATABASE_URL`: PostgreSQL connection

## Database Setup

### Running Migrations
```bash
npx prisma migrate deploy
npx prisma generate
```

### Prisma Schema Tables
- User, Manufacturer, Distributor, Pharmacy
- ManufacturerStock, DistributorStock, PharmacyStock
- Order, StripCode, ManualReport

## File Structure

```
app/
├── (auth)/               # Authentication pages
│   ├── sign-in/
│   ├── sign-up/
│   └── layout.tsx
├── (app)/                # Protected application routes
│   ├── onboarding/       # New user onboarding
│   ├── contact/          # New contact form
│   ├── report/           # New manual reporting
│   ├── verify/           # Enhanced verification (scan-only)
│   ├── dashboard/
│   └── layout.tsx        # Route protection
├── api/
│   ├── admin/            # Admin endpoints
│   ├── onboarding/       # Onboarding flow
│   ├── orders/           # Ordering system
│   ├── suppliers/        # Supplier lookup
│   ├── strip-codes/      # Strip code management
│   ├── analytics/        # Sales analytics
│   ├── contact/          # Contact form
│   ├── reports/          # Report management
│   └── entities/         # Entity search
├── components/
│   ├── dashboard/
│   │   ├── ProfileHeader.tsx
│   │   ├── DashboardTabs.tsx
│   │   ├── AdminOverview.tsx
│   │   └── ...
│   ├── orders/
│   │   └── ContextAwareOrderForm.tsx
│   ├── charts/
│   │   └── SalesChart.tsx
│   ├── verification/
│   │   └── ScanOnlyVerification.tsx
│   └── ...
└── lib/
    └── server/
        ├── db.ts         # Prisma client
        ├── email.ts      # Resend integration
        └── ...

prisma/
├── schema.prisma         # Updated with new models
└── migrations/           # Database migrations
```

## Key Implementation Details

### Onboarding Workflow
1. User signs up with Clerk
2. Redirected to `/onboarding` if no role selected
3. Choose role (Manufacturer/Distributor/Pharmacy)
4. Connect wallet (optional but recommended)
5. Upload documents (PDF/JPG/PNG)
6. Submit for approval
7. Admin reviews and approves/rejects via dashboard
8. Approved users can access their role-specific dashboards

### Ordering Workflow
1. Distributor/Pharmacy user navigates to Orders tab
2. Select supplier from dropdown (role-filtered)
3. System loads available medicines from supplier's stock
4. Enter quantity (capped by available stock)
5. If quantity > available, flag as special order
6. Submit order
7. Supplier receives and can approve/reject
8. Approved orders transition to shipped

### Verification Workflow
1. User visits `/verify` page
2. Scans QR code using camera OR enters 4-digit strip code
3. System fetches blockchain batch data
4. Checks supply chain timeline, cold-chain logs, anomalies
5. Computes GREEN/AMBER/RED verdict
6. Displays detailed verification summary

## Next Steps & Customization

1. **Blockchain Integration**: Wire up the blockchain endpoints in verification APIs
2. **Cold Chain Monitoring**: Integrate IoT sensor data for cold-chain validation
3. **Email Templates**: Create branded email templates in Resend
4. **Role Dashboards**: Complete DistributorOverview and PharmacyOverview with analytics
5. **Anomaly Detection**: Implement 6 anomaly rules (GEO, DUPLICATE, PRE_SALE, DEVICE, SHIPMENT_MISMATCH, UNAUTHORIZED)
6. **Testing**: Add comprehensive unit and integration tests
7. **Performance**: Add caching layer for frequently accessed data (Upstash Redis recommended)

## Support & Troubleshooting

- **Clerk Issues**: Check CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in environment
- **Email Issues**: Verify RESEND_API_KEY and check Resend dashboard
- **Database Issues**: Run `npx prisma db push` or `npx prisma migrate resolve`
- **Authentication**: Clear browser cookies and re-authenticate
