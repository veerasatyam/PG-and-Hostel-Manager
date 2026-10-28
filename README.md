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
- **Testing**: Vitest with 18 automated unit and API integration tests covering core business rules.

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

## 🧪 Automated Tests (18 Tests Passing)

All mission-critical server logic is thoroughly covered by automated test suites in `server/tests/`:

1. **Bed Double-Booking Prevention**: Server rejects assigning an occupied bed with **HTTP 409 Conflict**.
2. **Mid-Month Check-In Pro-Rated Rent**: Dynamically calculates active days based on exact days in target month.
3. **Mid-Month Check-Out Pro-Rated Rent & Bed Release**: Adjusts checkout month invoice and frees bed to `AVAILABLE`.
4. **Leap Year & Month Boundary Math**: Exact days verification for 31-day, 30-day, 28-day Feb, and 29-day Leap Year Feb.
5. **Partial Payment Ledger**: Correctly updates `paidAmount`, remaining balance, and transitions status from `DUE` to `PAID`.
6. **Overpayment Rejection**: Prevents recording payments exceeding outstanding balance.
7. **Maintenance Work Orders**: Resident ticket creation and property manager status updates with resolution logs.
8. **Security Deposit Deductions**: Deducts itemized damage/cleaning fees at move-out and computes net refund.

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
