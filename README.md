# StayHaven 🏢
### Full-Stack PG & Hostel Management Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

StayHaven is a modern, responsive full-stack PG and hostel management application. It handles room and bed inventory, strict single-occupancy server verification, mid-month pro-rated rent calculations, partial payments with balance ledgers, tenant self-service portal, maintenance complaint ticketing, security deposit deduction settlements, and printable/downloadable rent receipts.

---

## ⚡ Quick Demo Logins

All accounts use the password: `password123`

The UI also includes **1-Click Quick Demo Login** buttons on the login page and an in-app **User Switcher Pill** in the navbar for immediate role testing!

| Role | Name | Email | Password | Persona & Highlights |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Owner** | Vikramaditya | `owner@stayhaven.com` | `password123` | Full PG admin: KPI dashboard, room allocations, check-ins, check-outs, part-payments, and batch billing |
| **👤 Tenant** | Rahul Sharma | `rahul@gmail.com` | `password123` | Room 101 (Bed A). Full paid rent, receipt download, resolved WiFi complaint |
| **👤 Tenant** | Priya Verma | `priya@gmail.com` | `password123` | Room 102 (Bed A). Overdue rent (unpaid), open AC water leakage complaint |
| **👤 Tenant** | Amit Kumar | `amit@gmail.com` | `password123` | Room 201 (Bed A). Mid-month pro-rated check-in (21 days), part payment paid (₹2,000 paid / ₹2,403 remaining) |
| **👤 Tenant** | Neha Gupta | `neha@gmail.com` | `password123` | Unassigned tenant ready for 1-click check-in demonstration |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+ recommended; tested on v24)
- **npm** (v9+)

### 1. Installation

Clone the repository and install dependencies for both the backend server and frontend client:

```bash
# Install backend dependencies
cd server
npm install

# Generate Prisma Client & initialize database
npx prisma generate
npx prisma db push

# Seed the database with rich realistic demo data
npm run seed

# Install frontend dependencies
cd ../client
npm install
```

### 2. Running the Application

Open two terminal windows:

**Terminal 1 — Backend API Server (Port 5000):**
```bash
cd server
npm run dev
```
> Server runs on `http://localhost:5000`

**Terminal 2 — Frontend Client (Port 5173):**
```bash
cd client
npm run dev
```
> Open your browser at `http://localhost:5173`

*(Alternatively, run from root: `npm run server:dev` and `npm run client:dev`)*

---

## 🧪 Running Automated Tests

We wrote **18 automated unit and integration tests** covering critical business logic:
- Bed double-booking prevention on server
- Mid-month check-in pro-rated rent calculation
- Mid-month check-out pro-rated rent calculation & bed release
- Leap year (29 days) and non-leap year (28 days) edge cases
- Partial payments ledger & balance calculation
- Overpayment prevention
- Security deposit deductions at check-out
- Tenant role-based authorization

To run the full automated test suite:
```bash
cd server
npm test
```

---

## 📐 Architecture & Data Model

StayHaven follows a clean decoupled client-server architecture:
- **Backend API**: Node.js, Express, TypeScript, Zod schema validation, Prisma ORM, SQLite.
- **Frontend SPA**: React 18, Vite, TypeScript, Tailwind CSS, Lucide icons.
- **Zero External DB Requirement**: Uses self-contained SQLite (`file:./dev.db`), ensuring zero database installation hassle for evaluators.

### Entity-Relationship Diagram

```
+--------------------+        1:N        +--------------------+
|        User        | ----------------> |      Tenant        |
|  (Owner / Tenant)  |                   +--------------------+
+--------------------+                             |
                                                   | 1:N
+--------------------+        1:N                  v
|        Room        | ----------------> +--------------------+
| (Single/Double/etc)|                   |    BedOccupancy    |
+--------------------+                   |  (Stay history)    |
          | 1:N                          +--------------------+
          v                                        | 1:N
+--------------------+        1:N                  v
|        Bed         | ----------------> +--------------------+
| (Available/Occupied|                   |     RentRecord     |
+--------------------+                   | (Due/Paid/Overdue) |
                                         +--------------------+
                                                   | 1:N
                                                   v
                                         +--------------------+
                                         |      Payment       |
                                         |  (Receipt # & UTR) |
                                         +--------------------+
```

### Key Models
1. **User**: Authentication, bcrypt password hashing, roles (`OWNER`, `TENANT`).
2. **Room**: Room number, floor, room type (Single, Double, Triple, Four Sharing), AC flag, base monthly rent.
3. **Bed**: Belongs to a Room, tracked with status `AVAILABLE`, `OCCUPIED`, or `MAINTENANCE`.
4. **BedOccupancy**: Represents an exact tenant stay period (`checkInDate`, optional `checkOutDate`, `monthlyRent`, `securityDeposit`, `depositRefundAmount`, `depositDeductions`, `depositStatus`).
5. **RentRecord**: Monthly billing record (`month`, `year`, `dueDate`, `amount`, `paidAmount`, `balance`, `isProRated`, `proRatedDays`, `proRatedCalculationNotes`, `status`: `DUE`, `PAID`, `OVERDUE`).
6. **Payment**: Payment ledger entry (`amount`, `paymentMethod`: `UPI`/`CASH`/`BANK_TRANSFER`/`CARD`, `receiptNumber`, `transactionRef`, `notes`).
7. **Complaint**: Maintenance ticket (`category`, `priority`, `status`: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `resolutionNotes`).

---

## 🔍 Core Logic & What Evaluators Look For Closely

### 1. Bed Double-Booking Prevention (Server Validated)
- Located in `server/src/routes/tenants.ts` (`POST /api/tenants/check-in`).
- Before assigning a tenant to a bed, the server executes two strict checks:
  1. Checks if the bed currently has an `ACTIVE` occupancy record in `BedOccupancy`.
  2. Runs interval collision check: `isOccupancyOverlapping()` ensuring no dates overlap.
- If already occupied, the request is immediately rejected with **HTTP 409 Conflict** and a descriptive error message indicating the current occupant's name.
- Executed inside an atomic Prisma `$transaction` to prevent race conditions.

### 2. Accurate Mid-Month Pro-Rated Rent Calculation
- Pure business logic in `server/src/utils/rentCalculator.ts`.
- Formula:
  $$\text{Daily Rate} = \frac{\text{Monthly Rent}}{\text{Total Days in Target Month}}$$
  $$\text{Active Days} = \text{End Day} - \text{Start Day} + 1$$
  $$\text{Pro-Rated Rent} = \text{round}\left(\text{Daily Rate} \times \text{Active Days}\right)$$
- Correctly handles:
  - 31-day months (January, March, May, July, August, October, December)
  - 30-day months (April, June, September, November)
  - 28-day February vs. 29-day Leap Year February
  - Mid-month check-in: tenant moving in on Oct 11 in a 31-day month gets billed for $(31 - 11 + 1) = 21$ days: $\frac{6500}{31} \times 21 = ₹4,403$.
  - Mid-month check-out: if moving out on Oct 15, rent is adjusted for 15 days, bed is freed, and deposit refunded.

### 3. Partial Payments & Outstanding Balance Tracking
- Located in `server/src/routes/payments.ts`.
- Every payment updates:
  $$\text{paidAmount} = \text{paidAmount} + \text{paymentAmount}$$
  $$\text{balance} = \text{amount} - \text{paidAmount}$$
- If $\text{balance} == 0$, status becomes `PAID`.
- If $\text{balance} > 0$ and current date past `dueDate`, status becomes `OVERDUE`.
- Accidental overpayments (paying more than outstanding balance) are rejected by the server.

### 4. Stretch Feature 1: Downloadable / Printable Rent Receipts
- Accessible for every recorded payment via `GET /api/payments/receipt/:receiptNumber`.
- Built-in printable receipt template with hostel header, official payment confirmed badge, invoice breakdown, transaction method/UTR, and print CSS formatting for 1-click **Save as PDF** or physical printing.

### 5. Stretch Feature 2: Security Deposit Tracking & Check-Out Deductions
- Check-in records the security deposit held.
- At check-out, the owner enters any itemized deductions (e.g. wall painting, deep cleaning, utility bills).
- Server calculates:
  $$\text{Net Refund} = \max\left(0, \text{Deposit Held} - \text{Deductions}\right)$$
- Updates deposit status to `REFUNDED` or `PARTIALLY_REFUNDED`, records deduction notes, and frees the bed (`status = AVAILABLE`).

---

## 📱 Mobile & Laptop Responsiveness
The frontend is built with Tailwind CSS mobile-first guidelines:
- Mobile drawer navigation with responsive hamburger menu.
- Horizontal scroll tables with fixed badges.
- Touch-friendly cards and buttons.
- Desktop wide-screen layouts featuring multi-column KPI dashboard widgets.

---

## 📋 What is Finished, What Isn't, and Future Work

### Finished
- [x] Room and Bed inventory management with visual bed statuses (Available, Occupied).
- [x] Tenant check-in with live pro-rated rent preview in the modal.
- [x] Strict server-side bed double-booking prevention with HTTP 409 error responses.
- [x] Mid-month move-in and move-out pro-rated rent calculations covered by automated tests.
- [x] Monthly rent record generation (batch tool) with Due, Paid, Overdue statuses.
- [x] Partial payments recording and live outstanding balance updates.
- [x] Owner Dashboard with occupancy gauge, rent collected this month, and overdue tenants table.
- [x] Tenant self-service portal (view room/bed, rent ledger, receipts, complaints).
- [x] Maintenance complaints ticketing (tenant creates ticket, owner updates status & notes).
- [x] **Stretch**: Printable and downloadable rent payment receipts.
- [x] **Stretch**: Security deposit tracking with deduction settlement at check-out.
- [x] 18 automated unit and integration tests passing.
- [x] Database seed script with rich realistic demo data and instant 1-click demo logins.

### What Could Be Added With More Time
- **Automated WhatsApp / SMS Reminders**: Integration with Twilio or WhatsApp Business API to send automated rent due notifications to tenants on the 1st of the month.
- **Online Payment Gateway**: Integration with Razorpay / Stripe for direct UPI QR code scanning and webhook payment auto-reconciliation.
- **Tenant ID Proof File Upload**: Secure upload of Aadhaar/Passport photo IDs to AWS S3 or Cloudflare R2.
- **Biometric / Keycard Gate Integration**: Synchronizing active bed occupancies with biometric turnstiles at hostel entrance doors.

---

## 🤖 AI Tools Used & How

In compliance with the project guidelines, AI tools were utilized transparently:
- **Architecture & System Design**: Structuring the relationship between Rooms, Beds, BedOccupancy, and RentRecords to cleanly separate stay intervals from monthly billing cycles.
- **Test Generation**: Drafting comprehensive edge cases for pro-rated rent calculations including leap years, 30 vs 31 days, and boundary date collisions.
- **UI Component Styling**: Accelerating Tailwind CSS utility classes and print stylesheet media queries for the printable receipt component.

---

## 🔒 Environment Settings (.env.example)

See `server/.env.example`:
```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secure-jwt-secret-here"
NODE_ENV=development
```
*(No secrets are committed in the repository).*

---

## 📹 Video Walkthrough Outline (3-5 Minutes)

For your video presentation submission:
1. **Introduction (30s)**: Introduce StayHaven and explain the problem: managing PG beds, pro-rating rent, and avoiding double-bookings.
2. **Dashboard Demo (1m)**: Show the occupancy gauge, monthly rent collection KPI, and the Overdue Tenants table.
3. **Core Workflow Demo (1.5m)**:
   - Check-in a tenant: Show the live pro-rated rent preview when picking a mid-month date (e.g. Oct 11).
   - Attempt double-booking: Try checking in another tenant to the same bed and show the server 409 Conflict rejection.
   - Record partial payment: Record ₹2,000 on a ₹4,403 bill, show balance update to ₹2,403, and view the generated receipt.
   - Tenant Portal & Complaints: Switch to tenant persona, show their active bed card, and submit a maintenance ticket.
4. **Hard Problem Solved (1m)**:
   - Walk through `server/src/utils/rentCalculator.ts` and explain how mid-month pro-rating dynamically adapts to exact days in any month (including February leap years) and how `BedOccupancy` intervals prevent double-booking atomically in Prisma.
