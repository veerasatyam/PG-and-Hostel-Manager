import { describe, it, expect } from 'vitest';
import { calculateRentForMonth, isOccupancyOverlapping, calculateDepositSettlement } from '../src/utils/rentCalculator';

describe('Pro-rated Rent Calculation', () => {
  it('calculates full month rent when tenant is active the whole month', () => {
    // October 2026 (31 days)
    const result = calculateRentForMonth(
      9000,
      2026,
      10,
      new Date('2026-10-01'),
      null // still active
    );

    expect(result.isProRated).toBe(false);
    expect(result.amount).toBe(9000);
    expect(result.proRatedDays).toBe(31);
    expect(result.totalDaysInMonth).toBe(31);
  });

  it('pro-rates rent correctly for mid-month check-in (e.g., Oct 11 in a 31-day month)', () => {
    // Oct 11 to Oct 31 is (31 - 11 + 1) = 21 active days
    // 9000 / 31 * 21 = 6096.77 -> rounded to 6097
    const result = calculateRentForMonth(
      9000,
      2026,
      10,
      new Date('2026-10-11'),
      null
    );

    expect(result.isProRated).toBe(true);
    expect(result.proRatedDays).toBe(21);
    expect(result.amount).toBe(Math.round((9000 / 31) * 21)); // 6097
    expect(result.calculationNotes).toContain('Day 11 to 31');
  });

  it('pro-rates rent correctly for mid-month check-out (e.g., Oct 15 in a 31-day month)', () => {
    // Check in earlier (e.g. Sept 1), checking out on Oct 15
    // Active days = 15
    // 9000 / 31 * 15 = 4354.83 -> rounded to 4355
    const result = calculateRentForMonth(
      9000,
      2026,
      10,
      new Date('2026-09-01'),
      new Date('2026-10-15')
    );

    expect(result.isProRated).toBe(true);
    expect(result.proRatedDays).toBe(15);
    expect(result.amount).toBe(Math.round((9000 / 31) * 15)); // 4355
    expect(result.calculationNotes).toContain('Day 1 to 15');
  });

  it('handles mid-month check-in AND mid-month check-out within the same month', () => {
    // Check in on June 5, check out on June 20 (June has 30 days)
    // Active days = 20 - 5 + 1 = 16 days
    // 12000 / 30 * 16 = 6400
    const result = calculateRentForMonth(
      12000,
      2026,
      6,
      new Date('2026-06-05'),
      new Date('2026-06-20')
    );

    expect(result.isProRated).toBe(true);
    expect(result.totalDaysInMonth).toBe(30);
    expect(result.proRatedDays).toBe(16);
    expect(result.amount).toBe(6400);
  });

  it('accurately handles leap years (February with 29 days)', () => {
    // Feb 2024 is a leap year (29 days)
    // Check in on Feb 15, 2024 -> 29 - 15 + 1 = 15 days
    const result = calculateRentForMonth(
      8700,
      2024,
      2,
      new Date('2024-02-15'),
      null
    );

    expect(result.totalDaysInMonth).toBe(29);
    expect(result.proRatedDays).toBe(15);
    expect(result.amount).toBe(Math.round((8700 / 29) * 15)); // 4500
  });

  it('accurately handles non-leap year (February with 28 days)', () => {
    // Feb 2025 has 28 days
    // Check in on Feb 15, 2025 -> 28 - 15 + 1 = 14 days (half month)
    const result = calculateRentForMonth(
      8400,
      2025,
      2,
      new Date('2025-02-15'),
      null
    );

    expect(result.totalDaysInMonth).toBe(28);
    expect(result.proRatedDays).toBe(14);
    expect(result.amount).toBe(4200);
  });
});

describe('Bed Overlap & Double-booking Prevention Logic', () => {
  it('detects overlap when candidate checks in while an active tenant has no check-out date', () => {
    const existing = {
      checkInDate: new Date('2026-01-01'),
      checkOutDate: null, // Still living there
    };
    const candidate = {
      checkInDate: new Date('2026-02-01'),
      checkOutDate: null,
    };

    expect(isOccupancyOverlapping(existing, candidate)).toBe(true);
  });

  it('detects overlap when candidate stay falls within existing stay period', () => {
    const existing = {
      checkInDate: new Date('2026-03-01'),
      checkOutDate: new Date('2026-03-31'),
    };
    const candidate = {
      checkInDate: new Date('2026-03-15'),
      checkOutDate: new Date('2026-03-25'),
    };

    expect(isOccupancyOverlapping(existing, candidate)).toBe(true);
  });

  it('allows booking when candidate check-in is after existing tenant check-out', () => {
    const existing = {
      checkInDate: new Date('2026-01-01'),
      checkOutDate: new Date('2026-01-31'),
    };
    const candidate = {
      checkInDate: new Date('2026-02-01'),
      checkOutDate: null,
    };

    // Feb 1 is after Jan 31
    expect(isOccupancyOverlapping(existing, candidate)).toBe(false);
  });
});

describe('Security Deposit Deductions & Settlement', () => {
  it('calculates full refund when there are zero deductions', () => {
    const settlement = calculateDepositSettlement(15000, 0);
    expect(settlement.netRefund).toBe(15000);
    expect(settlement.deductions).toBe(0);
    expect(settlement.isFullyRefunded).toBe(true);
  });

  it('calculates net refund correctly with deductions for repairs or unpaid bills', () => {
    const settlement = calculateDepositSettlement(15000, 2500, 'Wall repaint and deep cleaning');
    expect(settlement.netRefund).toBe(12500);
    expect(settlement.deductions).toBe(2500);
    expect(settlement.isFullyRefunded).toBe(false);
    expect(settlement.deductionNotes).toBe('Wall repaint and deep cleaning');
  });

  it('clamps net refund to 0 if deductions equal or exceed deposit', () => {
    const settlement = calculateDepositSettlement(10000, 12000, 'Extensive property damage');
    expect(settlement.netRefund).toBe(0);
    expect(settlement.deductions).toBe(12000);
    expect(settlement.isFullyRefunded).toBe(false);
  });
});
