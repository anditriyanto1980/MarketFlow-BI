export interface MetricSummary {
  netSales: number;
  totalOrders: number;
  averageOrderValue: number;
  grossProfit: number;
  contributionProfit: number;
  netProfit: number;
  returnCount: number;
  returnRate: number;
  discrepancyCount: number;
}

export interface DailyMetricPoint {
  date: string;
  netSales: number;
  orders: number;
  netProfit: number;
}
