/**
 * Profit Calculation Formula Specification:
 *
 * Gross Sales
 * - Discounts
 * - Refunds
 * = Net Sales
 *
 * Net Sales
 * - HPP (Cost of Goods Sold)
 * = Gross Profit
 *
 * Gross Profit
 * - Marketplace Admin Fees
 * - Payment Gateway Fees
 * - Advertising Costs
 * - Packaging Materials (Box, Bubble wrap, Stickers, Labels)
 * - Fulfillment Costs
 * - Other Variable Costs
 * = Contribution Profit
 *
 * Contribution Profit
 * - Fixed Costs (Salaries, Rent, Utilities, Tools)
 * = Net Profit
 */

export interface ProfitBreakdown {
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  hpp: number;
  grossProfit: number;
  marketplaceFees: number;
  paymentFees: number;
  adsCosts: number;
  packagingCosts: number;
  fulfillmentCosts: number;
  otherVariableCosts: number;
  contributionProfit: number;
  fixedCosts: number;
  netProfit: number;
  grossMarginPct: number;
  contributionMarginPct: number;
  netMarginPct: number;
}
