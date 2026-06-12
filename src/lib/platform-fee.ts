// Unified Chaos Gemstones platform fee + payments routing rules.
//
// Replaces the legacy 2% / $5–$150 calculation. Every confirmed sale is
// charged 2.5% of the wholesale price, with a hard cap of £50 (GBP). The
// DB trigger `on_order_receipt_confirmed` enforces the USD-side equivalent.
//
// `requiresBankTransfer` is the single source of truth for the Open Banking
// gate — any order whose value exceeds £1,500 must settle via Faster
// Payments / Open Banking, with card UI suppressed at the checkout layer.

export const PLATFORM_FEE_RATE = 0.025; // 2.5%
export const PLATFORM_FEE_CAP_GBP = 50; // £50 hard cap
export const PLATFORM_FEE_MIN_GBP = 2;  // £2 floor
export const BANK_TRANSFER_THRESHOLD_GBP = 1500;

/** Calculate the platform fee in GBP, hard-capped at £50. */
export function calculatePlatformFeeGbp(orderTotalGbp: number): number {
  if (!Number.isFinite(orderTotalGbp) || orderTotalGbp <= 0) return 0;
  const raw = orderTotalGbp * PLATFORM_FEE_RATE;
  return Math.min(Math.max(raw, PLATFORM_FEE_MIN_GBP), PLATFORM_FEE_CAP_GBP);
}

/**
 * Returns true when the order must be routed through B2B bank transfer /
 * Open Banking rather than a card payment journey. Card fields should be
 * stripped from any checkout UI when this returns true.
 */
export function requiresBankTransfer(orderTotalGbp: number): boolean {
  return Number.isFinite(orderTotalGbp) && orderTotalGbp > BANK_TRANSFER_THRESHOLD_GBP;
}