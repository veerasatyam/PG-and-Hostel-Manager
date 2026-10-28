# StayHaven — Enterprise PG & Hostel Property Management

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

StayHaven is a production-grade full-stack accommodation and hostel property management system built with **Node.js, Express, TypeScript, MongoDB (Mongoose), and React 18**.

Designed with a clean, high-contrast enterprise property management interface (free of artificial gradients and toy mockups), it features strict server-side single-occupancy bed validation, mid-month pro-rated rent calculation, partial payment ledger accounting, resident self-service portal, maintenance work orders ticketing, move-out security deposit deduction settlements, and printable payment receipts.

---

## 🛠️ Tech Stack & Architecture

- **Backend API**: Node.js, Express, TypeScript, Zod schema validation, Mongoose ODM.
- **Database**: **MongoDB** (`MONGODB_URI` configurable for MongoDB Atlas or local `mongodb://127.0.0.1:27017/stayhaven`). Zero-config embedded fallback ensures tests and local development run reliably out of the box.
- **Frontend SPA**: React 18, Vite, TypeScript, Tailwind CSS, Lucide icons.
- **Testing**: Vitest with 20 automated unit and API integration tests covering core business rules.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+ recommended; tested on v24)
- **npm** (v9+)
- **MongoDB** (optional local instance or MongoDB Atlas URI; embedded fallback included)

### 1. Installation

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Environment Configuration

Copy the example environment configuration in `server/`:
```bash
cd server
cp .env.example .env
```

`server/.env`:
```env
PORT=5000
MONGODB_URI="mongodb://127.0.0.1:27017/stayhaven"
JWT_SECRET="stayhaven-production-secure-key-2026"
NODE_ENV=development
```

### 3. Database Initialization (Seed Script)

To populate the database with a clean initial property setup (rooms, beds, resident accounts, and ledger history):
```bash
cd server
npm run seed
```

Default credentials initialized by seed:
- **Property Manager / Owner**: `admin@stayhaven.com` | `password123`
- **Resident 1 (Settled Rent)**: `rahul@gmail.com` | `password123`
- **Resident 2 (Overdue Rent)**: `priya@gmail.com` | `password123`
- **Resident 3 (Part-Paid Mid-Month)**: `amit@gmail.com` | `password123`

You can also register brand-new accounts anytime via the **Register** tab in the application.

### 4. Running the Application

Start both server and client:

**Terminal 1 — Backend API Server (Port 5000):**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend Client (Port 5173):**
```bash
cd client
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Automated Tests (20 Tests Passing)

All mission-critical server logic is thoroughly covered by automated test suites in `server/tests/`:

1. **Bed Double-Booking Prevention**: Server rejects assigning an occupied bed with **HTTP 409 Conflict**.
2. **Atomic Partial Unique Index**: MongoDB engine-level partial unique index (`{ bedId: 1, status: "ACTIVE" }`) guarantees zero concurrent double-booking race conditions.
3. **Mid-Month Check-In Pro-Rated Rent**: Dynamically calculates active days based on exact days in target month.
4. **Mid-Month Check-Out Pro-Rated Rent & Bed Release**: Adjusts checkout month invoice and frees bed to `AVAILABLE`.
5. **End-to-End Check-In & Check-Out Lifecycle**: Validates that checking in creates the pro-rated initial rent record, and checking out creates/adjusts the checkout month rent record with full audit metadata.
6. **Leap Year & Month Boundary Math**: Exact days verification for 31-day, 30-day, 28-day Feb, and 29-day Leap Year Feb.
7. **Partial Payment Ledger**: Correctly updates `paidAmount`, remaining balance, and transitions status from `DUE` to `PAID`.
8. **UUID-Based Collision-Free Receipt Numbers**: Every payment creates a verifiable unique receipt (`REC-YYYYMMDD-XXXXXXXX`).
9. **Overpayment Rejection**: Prevents recording payments exceeding outstanding balance.
10. **Maintenance Work Orders**: Resident ticket creation and property manager status updates with resolution logs.
11. **Security Deposit Deductions**: Deducts itemized damage/cleaning fees at move-out and computes net refund.

To run the automated test suite:
```bash
cd server
npm test
```

---

## 📐 Data Model (MongoDB / Mongoose Collections)

```
+--------------------+        1:N        +--------------------+
|       users        | ----------------> |      tenants       |
|  (Owner / Tenant)  |                   +--------------------+
+--------------------+                             |
                                                   | 1:N
+--------------------+        1:N                  v
|       rooms        | ----------------> +--------------------+
|  (Beds subdocs)    |                   |   bedoccupancies   |
+--------------------+                   |  (Stay history)    |
                                         +--------------------+
                                                   | 1:N
                                                   v
                                         +--------------------+
                                         |    rentrecords     |
                                         | (Due/Paid/Overdue) |
                                         +--------------------+
                                                   | 1:N
                                                   v
                                         +--------------------+
                                         |      payments      |
                                         |  (Receipt # & UTR) |
                                         +--------------------+
```

### Models & Schema Details
- **`User`**: Account identity, password hash (bcrypt), role (`OWNER` or `TENANT`), phone number.
- **`Room`**: Room number, floor, room type (`SINGLE`, `DOUBLE`, `TRIPLE`, `FOUR_SHARING`), AC flag, base tariff, embedded `beds` subdocuments with `_id`, `name`, and status (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`).
- **`Tenant`**: References `User`, emergency contact, ID proof number.
- **`BedOccupancy`**: Immutable stay interval record: `bedId`, `roomId`, `tenantId`, `checkInDate`, `checkOutDate`, `monthlyRent`, `securityDeposit`, `depositRefundAmount`, `depositDeductions`, `depositDeductionNotes`, `depositStatus`.
- **`RentRecord`**: Monthly billing assessment: `tenantId`, `occupancyId`, `month`, `year`, `dueDate`, `baseAmount`, `amount`, `paidAmount`, `balance`, `isProRated`, `proRatedDays`, `status` (`DUE`, `PAID`, `OVERDUE`).
- **`Payment`**: Financial transaction: `rentRecordId`, `amount`, `paymentDate`, `paymentMethod` (`UPI`, `CASH`, `BANK_TRANSFER`, `CARD`), `transactionRef`, unique `receiptNumber`.
- **`Complaint`**: Maintenance work order: `tenantId`, `title`, `description`, `category` (`ELECTRICAL`, `PLUMBING`, `WIFI`, `CLEANING`, `FURNITURE`, `OTHER`), `priority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), `status` (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CANCELLED`), `resolutionNotes`, `resolvedAt`.

---

## 🔍 Core Logic Evaluated Closely

### 1. Server-Side Bed Double-Booking Prevention
Implemented in `server/src/routes/tenants.ts` (`POST /api/tenants/check-in`):
```typescript
const activeBedOcc = await BedOccupancy.findOne({
  bedId: new mongoose.Types.ObjectId(bedId),
  status: 'ACTIVE',
});

if (activeBedOcc) {
  return res.status(409).json({
    error: `Bed ${bedObj.name} in Room ${room.number} is already occupied. A bed cannot have two tenants at the same time.`,
  });
}
```

### 2. Pro-Rated Rent Calculation
Formula located in `server/src/utils/rentCalculator.ts`:
$$\text{Daily Rate} = \frac{\text{Monthly Rent}}{\text{Days In Target Month}}$$
$$\text{Active Days} = \text{End Day} - \text{Start Day} + 1$$
$$\text{Pro-Rated Rent} = \text{round}\left(\text{Daily Rate} \times \text{Active Days}\right)$$

Example:
- Resident moves in on October 11 in a 31-day month: $(31 - 11 + 1) = 21$ active days.
- Monthly tariff: ₹6,500. Pro-rated initial rent: $\frac{6500}{31} \times 21 = ₹4,403$.

### 3. Partial Payments & Balance Tracking
- Accepts partial installments (e.g. ₹2,000 paid towards a ₹4,403 bill).
- Balance is atomically calculated as $\text{Amount} - \text{Paid Amount} = ₹2,403$.
- Status dynamically evaluates to `DUE` or `OVERDUE` based on the due date.
- Rejects overpayment attempts.

### 4. Stretch Features Included
- **Printable & Downloadable Receipts**: Generates clean printable rent invoice receipts with print media CSS targeting `#printable-receipt` for 1-click **Save as PDF** or physical printing.
- **Security Deposit Deductions**: Move-out workflow deducts damage, cleaning, or utility fees, computes net refund, and releases the bed.


---

## 🤖 AI Tools & Development Methodology

In accordance with assignment guidelines, AI tools were utilized transparently to enhance engineering rigor, code coverage, and visual design:

- **Google DeepMind Antigravity & Claude 3.5 Sonnet**:
  - **Architecture & Domain Design**: Designed normalized Mongoose schemas and compound partial unique indexes to guarantee single-occupancy bed enforcement at the database storage engine level.
  - **Financial Math Verification**: Generated rigorous test fixtures for calendar edge cases (leap years in 2024/2028, 28-day Feb in 2023, 30/31-day transitions) to ensure rent calculations are accurate down to the rupee.
  - **SaaS Interface Refactoring**: Redesigned the frontend away from generic artificial gradients and toy mockups into an authentic, accessible Zinc/Slate property management design system.
  - **Automated Video Presentation Pipeline**: Synthesized 1080p browser scene recordings, neural voice narration, and slide generation for the assignment demonstration video.

---

## 📋 Project Status: What Is Finished vs Next Steps

### ✅ Finished & Production-Ready
- **Room & Bed Inventory**: Complete tracking of single and double sharing rooms, bed allocation statuses (Available/Occupied), and tenant mappings.
- **Atomic Single-Occupancy Enforcement**: Server-side validation and MongoDB partial unique indexes preventing any bed double-booking under concurrency.
- **Calendar-Aware Pro-Rated Rent Engine**: Inclusive day counting, dynamic days-per-month computation, and automated first/final month rent calculation.
- **Partial Payments & Ledger**: Due/Paid/Overdue status transitions, balance tracking, and UUID-based collision-free payment receipts.
- **Tenant Self-Service Portal**: Role-based access for tenants to review active stays, rent invoices, and lodge maintenance complaints.
- **Maintenance Work Orders**: Facility ticketing with domains, priority severity levels, and resolution logging.
- **Executive Dashboard**: Real-time occupancy gauges, collections vs billed realization metrics, and delinquent account alerts.
- **Security Deposit Settlements**: Move-out workflow calculating itemized damage deductions and net refunds.
- **Automated Test Suite**: 20 comprehensive unit and integration tests passing in Vitest with zero external dependencies.

### 🔮 Unfinished & Future Enhancements (With More Time)
- **Automated Payment Gateway**: Integrating Razorpay / Stripe Webhooks for instant UPI/Card settlements with auto-reconciliation.
- **Automated Notification Triggers**: SMS and WhatsApp alerts via Twilio/Gupshup when rent invoices are published or 3 days before due dates.
- **Digital KYC & Lease Agreement Uploads**: S3 / Cloudinary secure document uploads for tenant Aadhaar/passport verification and digital lease signing.
- **Sub-Metered Utility Billing**: Dynamic per-room electricity sub-meter calculation apportioned across active bed occupants.
