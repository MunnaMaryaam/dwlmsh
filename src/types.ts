export type SalesTimeframe = '1M' | '3M' | '6M' | '9M' | '1Y' | '2Y';

/**
 * Global distribution analysis mode — 3 top buttons switch every report + Excel matrix.
 * contribution = (DWL + all branch stock) × each branch's sales share %
 * baseline     = each branch keeps stock ≈ uploaded period sales (e.g. 2M upload → 2M coverage)
 * hybrid       = max(contribution, baseline), then compress to live company stock
 * DWL = warehouse / reserve — never treated as a retail showroom.
 */
export type AllocationMode = 'contribution' | 'baseline' | 'hybrid';

/**
 * Festival / Exhibition / Promotion months marked at data upload time.
 * These months have unusually high sales and must NOT be treated as normal average months.
 */
export type SpecialMonthType = 'Festival' | 'Exhibition' | 'Promotion' | 'Other';

export interface SpecialMonth {
  id: string;
  /** e.g. "March 2026", "2026-03", "Eid month" */
  monthLabel: string;
  /** e.g. "Eid-ul-Fitr", "Durga Puja Exhibition", "Valentine Promo" */
  eventName: string;
  type: SpecialMonthType;
}

export interface RawInventoryRecord {
  id: string;
  branch: string;
  // Universal item identifier. Legacy uploads may still provide `weight`; the parser normalizes item/product/SKU into this field too.
  weight: string;
  itemName?: string;
  itemCode?: string;
  category?: string;
  variant?: string;
  soldQty: number;
  currentStock: number;
  sales3M?: number;
  sales6M?: number;
  sales1Y?: number;
  sales2Y?: number;
  ageDays?: number;
  dateAdded?: string;
  unitValueEstimate?: number; // Estimated diamond value in USD/BDT
}

export interface BranchSummary {
  branch: string;
  totalSold: number;
  totalSold3M?: number;
  totalSold6M?: number;
  totalSold1Y?: number;
  totalSold2Y?: number;
  totalCurrentStock: number;
  totalMoveIn: number;
  totalMoveOut: number;
  netChange: number;
  variantsNeedingAction: number;
  isWarehouse: boolean;
  sellThroughRate: number;
  overstockScore: number;
  shortageScore: number;
  status: 'OVERSTOCKED' | 'SHORTAGE' | 'BALANCED' | 'WAREHOUSE';
  agingBreakdown?: {
    freshPcs: number; // 0-90 days
    agingPcs: number; // 91-180 days
    slowPcs: number;  // 181-365 days
    oldPcs: number;   // 1-2 years
    dormantPcs: number; // >2 years
  };
}

export interface WeightSummary {
  weight: string;
  weightNum: number;
  soldQty: number;
  sold3M?: number;
  sold6M?: number;
  sold1Y?: number;
  sold2Y?: number;
  currentStock: number;
  moveInNeeded: number;
  moveOutNeeded: number;
  unmetShortage: number; // When sold > stock, need to buy new
  velocityCategory: 'Best-Seller' | 'Steady' | 'Slow-Moving' | 'Zero-Sales Stock';
  turnoverRatio: number;
  averageAgeDays?: number;
}

export interface TransferOrder {
  id: string;
  weight: string;
  fromBranch: string;
  toBranch: string;
  qty: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  reason: string;
  impactScore: number;
  status: 'RECOMMENDED' | 'APPROVED' | 'DISPATCHED';
}

export interface ProcurementOrder {
  weight: string;
  qtyToBuy: number;
  soldDemand: number;
  availableStock: number;
  urgency: 'HIGH' | 'MEDIUM';
  rationale: string;
}

export type AllocationStatus = 'OVERSTOCK' | 'LESS_STOCK' | 'BALANCED' | 'WAREHOUSE';

export interface OptionAllocationRow {
  branch: string;
  currentStock: number;
  soldQty: number;
  salesPeriod: number;
  sales3M: number;
  sales6M: number;
  sales1Y: number;
  sales2Y: number;
  salesAvgMonthly: number;
  salesContributionPct: number;
  contributionDeserveQty: number;
  safetyFloorQty: number;
  capQty?: number;
  deservedStock: number;
  variance: number;
  action: 'WITHDRAW' | 'SEND' | 'BALANCED';
  actionQty: number;
  status: AllocationStatus;
  statusFlag: '⚠️' | '📉' | '✓' | '🏢';
  scaledFactor: number;
  rationale: string;
  growthTargetStock?: number;
  opportunityStock?: number;
}

export interface OptionAllocationSummary {
  weight: string;
  totalCompanyStock: number;
  totalSoldPeriod: number;
  totalEnterpriseSales3M: number;
  totalRetailTargetBeforeCompression: number;
  scaledCompressionFactor: number;
  protectedReserve: number;
  distributableWarehouseStock: number;
  timeframe: SalesTimeframe;
  allocationMode?: AllocationMode;
  growthMultiplier?: number;
  availableCompanyBuffer?: number;
  /** DWL / central warehouse stock for this item */
  warehouseStock?: number;
  rows: OptionAllocationRow[];
  totalExcessToWithdraw: number;
  totalShortageToSend: number;
  lowVelocityFloor: number;
  highVelocityThreshold: number;
  highVelocitySafetyMultiplier: number;
  lowVelocityCapStock: number;
  transferPairs: {
    fromBranch: string;
    toBranch: string;
    qty: number;
    reason: string;
  }[];
}

export interface StockAgingBucket {
  bucket: string; // "0-90 Days", "91-180 Days", "181-365 Days", "1-2 Years", ">2 Years"
  description: string;
  totalPieces: number;
  percentage: number;
  status: 'HEALTHY' | 'MODERATE' | 'ATTENTION' | 'CRITICAL' | 'DEAD_STOCK';
  affectedBranchesCount: number;
  trappedItems: {
    branch: string;
    weight: string;
    qty: number;
    daysOld: number;
    salesInBranch: number;
  }[];
}

export interface ConsignmentRecommendation {
  weight: string;
  category: string;
  currentNetworkStock: number;
  recentSalesDemand: number;
  demandVelocity: 'VERY_HIGH' | 'HIGH' | 'MODERATE';
  stockoutRisk: 'CRITICAL' | 'HIGH' | 'MODERATE';
  recommendedConsignmentPcs: number;
  estimatedSalesUpliftBdt: number;
  marketReason: string;
}

export interface ActionAlert {
  id: string;
  type: 'CRITICAL_SHORTAGE' | 'OVERSTOCK_WARNING' | 'TRANSFER_OPPORTUNITY' | 'PROCUREMENT_REQUIRED';
  title: string;
  description: string;
  branch?: string;
  weight?: string;
  actionText: string;
  priority: 'URGENT' | 'WARNING' | 'INFO';
}

export interface CategoryConfig {
  id: string; // 'jewelry' | 'cosmetics' | 'apparel' | 'electronics' | 'pharmaceuticals' | 'general' | 'custom'
  name: string; // e.g. "Diamond & Fine Jewelry", "Cosmetics & Skincare", "Retail Fashion & Apparel", "Consumer Electronics", "Universal / General"
  itemLabel: string; // e.g. "Carat Weight", "Shade / Volume", "Size / Variant", "Model / SKU", "Particulars / Item"
  itemUnit: string; // e.g. "ct", "ml", "pcs", "units", "packs"
  itemTypeNoun: string; // e.g. "Solitaire", "Product", "Variant", "SKU", "Item"
  industryPreset: string;
  defaultPeriod?: string;
  currencySymbol: string; // e.g. "$", "€", "£"
  estimatedAvgUnitPrice: number;
}

export type UserRole = 'admin' | 'user' | 'manager' | 'analyst';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  avatarColor?: string;
  designation?: string;
  canEdit?: boolean;
  canUpload?: boolean;
  canExport?: boolean;
  isOwner?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  resetRequestedAt?: string;
  createdAt?: string;
}

export interface RedistributionReport {
  period: string;
  selectedTimeframe: SalesTimeframe;
  /** Festival / Exhibition / Promotion months tagged at upload — used to normalize average sales */
  specialMonths?: SpecialMonth[];
  categoryConfig: CategoryConfig;
  totalSold: number;
  totalSold3M: number;
  totalSold6M: number;
  totalSold1Y: number;
  totalSold2Y: number;
  totalCurrentStock: number;
  totalMoveIn: number;
  totalMoveOut: number;
  netStockPosition: number;
  totalNewStockToBuy: number;
  variantsNeedingActionCount: number;
  branchSummaries: BranchSummary[];
  weightSummaries: WeightSummary[];
  top5SellingBranches: BranchSummary[];
  lowest5SellingBranches: BranchSummary[];
  topOverstockedBranches: BranchSummary[];
  topShortageBranches: BranchSummary[];
  top5BestSellingWeights: WeightSummary[];
  top5SlowMovingWeights: WeightSummary[];
  lowest5SellingWeights: WeightSummary[];
  transferOrders: TransferOrder[];
  procurementOrders: ProcurementOrder[];
  actionAlerts: ActionAlert[];
  agingBuckets: StockAgingBucket[];
  consignmentRecommendations: ConsignmentRecommendation[];
  matrix: {
    branches: string[];
    weights: string[];
    cells: Record<string, Record<string, {
      sold: number;
      stock: number;
      sales3M?: number;
      sales6M?: number;
      sales1Y?: number;
      sales2Y?: number;
      moveIn: number;
      moveOut: number;
      netMove: number;
    }>>;
  };
}
