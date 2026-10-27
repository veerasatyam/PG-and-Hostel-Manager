import { getDaysInMonth, getDate, getMonth, getYear, isBefore, isAfter, startOfDay } from 'date-fns';

export interface ProRatedRentResult {
  amount: number;
  baseAmount: number;
  isProRated: boolean;
  proRatedDays: number;
  totalDaysInMonth: number;
  dailyRate: number;
  calculationNotes: string;
}

/**
 * Calculates rent for a given month and year, accurately pro-rating if check-in
 * or check-out falls mid-month.
 * 
 * @param monthlyRent Full monthly rent
 * @param year Year (e.g., 2026)
 * @param month Month index 1-12 (1 = Jan, 12 = Dec)
 * @param checkInDate Date tenant moved in
 * @param checkOutDate Date tenant moved out (optional)
 */
export function calculateRentForMonth(
  monthlyRent: number,
  year: number,
  month: number,
  checkInDate: Date,
  checkOutDate?: Date | null
): ProRatedRentResult {
  // JavaScript Date month is 0-indexed (0 = Jan, 11 = Dec)
  const monthDate = new Date(year, month - 1, 1);
  const totalDaysInMonth = getDaysInMonth(monthDate);
  const dailyRate = monthlyRent / totalDaysInMonth;

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month - 1, totalDaysInMonth, 23, 59, 59, 999);

  // Normalize check-in to start of day
  const normalizedCheckIn = startOfDay(new Date(checkInDate));
  const normalizedCheckOut = checkOutDate ? startOfDay(new Date(checkOutDate)) : null;

  // Determine active start day in this month
  let startDay = 1;
  const checkInYear = getYear(normalizedCheckIn);
  const checkInMonth = getMonth(normalizedCheckIn) + 1;

  if (checkInYear === year && checkInMonth === month) {
    startDay = getDate(normalizedCheckIn);
  } else if (isAfter(normalizedCheckIn, endOfMonth)) {
    // Tenant hasn't moved in yet during this month
    return {
      amount: 0,
      baseAmount: monthlyRent,
      isProRated: true,
      proRatedDays: 0,
      totalDaysInMonth,
      dailyRate,
      calculationNotes: `Tenant check-in is after ${month}/${year}`,
    };
  }

  // Determine active end day in this month
  let endDay = totalDaysInMonth;
  if (normalizedCheckOut) {
    const checkOutYear = getYear(normalizedCheckOut);
    const checkOutMonth = getMonth(normalizedCheckOut) + 1;

    if (checkOutYear === year && checkOutMonth === month) {
      endDay = getDate(normalizedCheckOut);
    } else if (isBefore(normalizedCheckOut, startOfMonth)) {
      // Tenant already moved out before this month
      return {
        amount: 0,
        baseAmount: monthlyRent,
        isProRated: true,
        proRatedDays: 0,
        totalDaysInMonth,
        dailyRate,
        calculationNotes: `Tenant moved out before ${month}/${year}`,
      };
    }
  }

  const activeDays = Math.max(0, endDay - startDay + 1);

  if (activeDays >= totalDaysInMonth) {
    return {
      amount: monthlyRent,
      baseAmount: monthlyRent,
      isProRated: false,
      proRatedDays: totalDaysInMonth,
      totalDaysInMonth,
      dailyRate: Math.round(dailyRate * 100) / 100,
      calculationNotes: `Full month rent (${totalDaysInMonth} days)`,
    };
  }

  const proRatedAmount = Math.round((monthlyRent / totalDaysInMonth) * activeDays);

  return {
    amount: proRatedAmount,
    baseAmount: monthlyRent,
    isProRated: true,
    proRatedDays: activeDays,
    totalDaysInMonth,
    dailyRate: Math.round(dailyRate * 100) / 100,
    calculationNotes: `Pro-rated for ${activeDays} days (Day ${startDay} to ${endDay} of ${totalDaysInMonth} days in month)`,
  };
}

/**
 * Checks whether an existing bed occupancy overlaps with a candidate stay period.
 * Strict server validation ensuring a bed cannot have two tenants at the same time.
 */
export function isOccupancyOverlapping(
  existingStay: { checkInDate: Date; checkOutDate: Date | null },
  candidateStay: { checkInDate: Date; checkOutDate?: Date | null }
): boolean {
  const cIn = startOfDay(new Date(candidateStay.checkInDate)).getTime();
  const cOut = candidateStay.checkOutDate ? startOfDay(new Date(candidateStay.checkOutDate)).getTime() : Infinity;

  const eIn = startOfDay(new Date(existingStay.checkInDate)).getTime();
  const eOut = existingStay.checkOutDate ? startOfDay(new Date(existingStay.checkOutDate)).getTime() : Infinity;

  // Overlap condition: (StartA <= EndB) and (EndA >= StartB)
  return cIn <= eOut && cOut >= eIn;
}

/**
 * Calculate security deposit settlement on check-out
 */
export interface DepositSettlementResult {
  securityDeposit: number;
  deductions: number;
  netRefund: number;
  deductionNotes?: string;
  isFullyRefunded: boolean;
}

export function calculateDepositSettlement(
  securityDeposit: number,
  deductions: number = 0,
  deductionNotes?: string
): DepositSettlementResult {
  const safeDeductions = Math.max(0, deductions);
  const netRefund = Math.max(0, securityDeposit - safeDeductions);

  return {
    securityDeposit,
    deductions: safeDeductions,
    netRefund,
    deductionNotes,
    isFullyRefunded: safeDeductions === 0,
  };
}
