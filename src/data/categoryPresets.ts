import { CategoryConfig, RawInventoryRecord } from '../types';
import { DEFAULT_RAW_RECORDS, ALL_BRANCHES, ALL_WEIGHTS, DEFAULT_PERIOD } from './defaultDataset';

export const CATEGORY_PRESETS: CategoryConfig[] = [
  {
    id: 'jewelry',
    name: 'Universal Jewelry Inventory',
    itemLabel: 'Item / SKU / Variant',
    itemUnit: 'pcs',
    itemTypeNoun: 'Jewelry Item',
    industryPreset: 'Luxury Jewelry Retail',
    defaultPeriod: '01-03-2026 to 19-09-2026',
    currencySymbol: '$',
    estimatedAvgUnitPrice: 1200
  },
  {
    id: 'cosmetics',
    name: 'Cosmetics & Skincare',
    itemLabel: 'Product / Shade SKU',
    itemUnit: 'pcs',
    itemTypeNoun: 'Product',
    industryPreset: 'Beauty & Personal Care',
    defaultPeriod: 'Q1-Q3 2026',
    currencySymbol: '$',
    estimatedAvgUnitPrice: 38
  },
  {
    id: 'apparel',
    name: 'Fashion & Apparel',
    itemLabel: 'Size / Style Variant',
    itemUnit: 'pcs',
    itemTypeNoun: 'Garment',
    industryPreset: 'Apparel & Footwear Retail',
    defaultPeriod: 'Spring-Summer 2026',
    currencySymbol: '$',
    estimatedAvgUnitPrice: 65
  },
  {
    id: 'electronics',
    name: 'Consumer Electronics',
    itemLabel: 'Model / Storage Variant',
    itemUnit: 'units',
    itemTypeNoun: 'Device',
    industryPreset: 'Tech & Gadgets Retail',
    defaultPeriod: 'YTD 2026',
    currencySymbol: '$',
    estimatedAvgUnitPrice: 350
  },
  {
    id: 'pharmaceuticals',
    name: 'Pharma & Healthcare',
    itemLabel: 'Dosage / Formulation',
    itemUnit: 'packs',
    itemTypeNoun: 'Medicine',
    industryPreset: 'Pharmacy & Drugstore Network',
    defaultPeriod: 'Monthly Rotation 2026',
    currencySymbol: '$',
    estimatedAvgUnitPrice: 18
  },
  {
    id: 'custom',
    name: 'Universal Enterprise Inventory',
    itemLabel: 'Particulars / Item Code',
    itemUnit: 'units',
    itemTypeNoun: 'Item',
    industryPreset: 'Multi-Store Retail Network',
    defaultPeriod: 'Custom Fiscal Period',
    currencySymbol: '$',
    estimatedAvgUnitPrice: 100
  }
];

// Cosmetics preset dataset
export const COSMETICS_DATASET: {
  records: RawInventoryRecord[];
  branches: string[];
  items: string[];
} = {
  branches: [
    "Central Hub",
    "Gulshan Flagship",
    "Bashundhara Mall",
    "Dhanmondi Store",
    "Uttara Gallery",
    "Chittagong City",
    "Baily-Road Outlet",
    "Sylhet Grand",
    "Online Express"
  ],
  items: [
    "Matte Velvet 04",
    "Matte Velvet 08",
    "Hydra Glow Serum 30ml",
    "Vitamin C Booster 20ml",
    "BB Cream Ivory",
    "BB Cream Medium",
    "Mineral Sunscreen SPF50",
    "Peptide Eye Cream",
    "Tinted Lip Balm Berry",
    "Clarifying Toner 150ml"
  ],
  records: [
    // Hydra Glow Serum 30ml (High Demand Deficit)
    { id: "c-1", branch: "Gulshan Flagship", weight: "Hydra Glow Serum 30ml", soldQty: 18, currentStock: 2 },
    { id: "c-2", branch: "Bashundhara Mall", weight: "Hydra Glow Serum 30ml", soldQty: 24, currentStock: 0 },
    { id: "c-3", branch: "Online Express", weight: "Hydra Glow Serum 30ml", soldQty: 35, currentStock: 0 },
    { id: "c-4", branch: "Baily-Road Outlet", weight: "Hydra Glow Serum 30ml", soldQty: 2, currentStock: 12 },
    { id: "c-5", branch: "Sylhet Grand", weight: "Hydra Glow Serum 30ml", soldQty: 1, currentStock: 8 },

    // Mineral Sunscreen SPF50 (High Velocity)
    { id: "c-6", branch: "Gulshan Flagship", weight: "Mineral Sunscreen SPF50", soldQty: 30, currentStock: 1 },
    { id: "c-7", branch: "Dhanmondi Store", weight: "Mineral Sunscreen SPF50", soldQty: 22, currentStock: 0 },
    { id: "c-8", branch: "Uttara Gallery", weight: "Mineral Sunscreen SPF50", soldQty: 3, currentStock: 15 },
    { id: "c-9", branch: "Central Hub", weight: "Mineral Sunscreen SPF50", soldQty: 0, currentStock: 40 },

    // Matte Velvet 04
    { id: "c-10", branch: "Bashundhara Mall", weight: "Matte Velvet 04", soldQty: 15, currentStock: 0 },
    { id: "c-11", branch: "Chittagong City", weight: "Matte Velvet 04", soldQty: 12, currentStock: 1 },
    { id: "c-12", branch: "Baily-Road Outlet", weight: "Matte Velvet 04", soldQty: 0, currentStock: 10 },
    { id: "c-13", branch: "Sylhet Grand", weight: "Matte Velvet 04", soldQty: 0, currentStock: 6 },

    // BB Cream Medium (Slow Mover in some, deficit in others)
    { id: "c-14", branch: "Online Express", weight: "BB Cream Medium", soldQty: 14, currentStock: 0 },
    { id: "c-15", branch: "Uttara Gallery", weight: "BB Cream Medium", soldQty: 1, currentStock: 9 },

    // Peptide Eye Cream (Overstocked Slow Mover)
    { id: "c-16", branch: "Central Hub", weight: "Peptide Eye Cream", soldQty: 0, currentStock: 25 },
    { id: "c-17", branch: "Dhanmondi Store", weight: "Peptide Eye Cream", soldQty: 2, currentStock: 8 }
  ]
};

// Apparel preset dataset
export const APPAREL_DATASET: {
  records: RawInventoryRecord[];
  branches: string[];
  items: string[];
} = {
  branches: [
    "Warehouse DC",
    "Downtown Plaza",
    "North End Mall",
    "Uptown Galleria",
    "Harbor Walk Store",
    "Midtown Boutique",
    "Airport Terminal Outlet",
    "Online Flagship"
  ],
  items: [
    "Slim Oxford - S",
    "Slim Oxford - M",
    "Slim Oxford - L",
    "Slim Oxford - XL",
    "Chino Trouser - 30",
    "Chino Trouser - 32",
    "Chino Trouser - 34",
    "Classic Polo Navy - M",
    "Classic Polo Navy - L",
    "Linen Blazer Navy - 40R"
  ],
  records: [
    // Slim Oxford - M (High demand deficit)
    { id: "a-1", branch: "Downtown Plaza", weight: "Slim Oxford - M", soldQty: 16, currentStock: 0 },
    { id: "a-2", branch: "Online Flagship", weight: "Slim Oxford - M", soldQty: 28, currentStock: 1 },
    { id: "a-3", branch: "North End Mall", weight: "Slim Oxford - M", soldQty: 14, currentStock: 0 },
    { id: "a-4", branch: "Harbor Walk Store", weight: "Slim Oxford - M", soldQty: 1, currentStock: 12 },
    { id: "a-5", branch: "Airport Terminal Outlet", weight: "Slim Oxford - M", soldQty: 0, currentStock: 8 },

    // Chino Trouser - 32
    { id: "a-6", branch: "Downtown Plaza", weight: "Chino Trouser - 32", soldQty: 20, currentStock: 0 },
    { id: "a-7", branch: "Uptown Galleria", weight: "Chino Trouser - 32", soldQty: 18, currentStock: 2 },
    { id: "a-8", branch: "Midtown Boutique", weight: "Chino Trouser - 32", soldQty: 2, currentStock: 14 },
    { id: "a-9", branch: "Warehouse DC", weight: "Chino Trouser - 32", soldQty: 0, currentStock: 30 },

    // Classic Polo Navy - L
    { id: "a-10", branch: "Online Flagship", weight: "Classic Polo Navy - L", soldQty: 22, currentStock: 0 },
    { id: "a-11", branch: "Harbor Walk Store", weight: "Classic Polo Navy - L", soldQty: 0, currentStock: 11 },

    // Linen Blazer Navy - 40R
    { id: "a-12", branch: "Uptown Galleria", weight: "Linen Blazer Navy - 40R", soldQty: 8, currentStock: 0 },
    { id: "a-13", branch: "North End Mall", weight: "Linen Blazer Navy - 40R", soldQty: 1, currentStock: 5 }
  ]
};

// Electronics preset dataset
export const ELECTRONICS_DATASET: {
  records: RawInventoryRecord[];
  branches: string[];
  items: string[];
} = {
  branches: [
    "Central Distribution",
    "Metro Tech Hub",
    "Mega Mall Outlet",
    "Cyber City Center",
    "South Point Store",
    "West Bay Store",
    "Online Store"
  ],
  items: [
    "Pro Phone 256GB - Titanium",
    "Pro Phone 512GB - Black",
    "Wireless ANC Earbuds Pro",
    "Ultra Smartwatch 49mm",
    "Magnetic 10K Powerbank",
    "65W GaN Fast Charger",
    "Stylus Pen Gen2",
    "Noise Cancelling Headset"
  ],
  records: [
    // Pro Phone 256GB (Deficit)
    { id: "e-1", branch: "Metro Tech Hub", weight: "Pro Phone 256GB - Titanium", soldQty: 12, currentStock: 0 },
    { id: "e-2", branch: "Online Store", weight: "Pro Phone 256GB - Titanium", soldQty: 25, currentStock: 1 },
    { id: "e-3", branch: "West Bay Store", weight: "Pro Phone 256GB - Titanium", soldQty: 1, currentStock: 7 },
    { id: "e-4", branch: "South Point Store", weight: "Pro Phone 256GB - Titanium", soldQty: 0, currentStock: 5 },

    // Wireless ANC Earbuds Pro
    { id: "e-5", branch: "Mega Mall Outlet", weight: "Wireless ANC Earbuds Pro", soldQty: 30, currentStock: 2 },
    { id: "e-6", branch: "Cyber City Center", weight: "Wireless ANC Earbuds Pro", soldQty: 24, currentStock: 0 },
    { id: "e-7", branch: "West Bay Store", weight: "Wireless ANC Earbuds Pro", soldQty: 2, currentStock: 18 },
    { id: "e-8", branch: "Central Distribution", weight: "Wireless ANC Earbuds Pro", soldQty: 0, currentStock: 45 }
  ]
};

export function getPresetDataset(presetId: string): {
  config: CategoryConfig;
  records: RawInventoryRecord[];
  branches?: string[];
  items?: string[];
} {
  const config = CATEGORY_PRESETS.find(p => p.id === presetId) || CATEGORY_PRESETS[0];

  if (presetId === 'cosmetics') {
    return {
      config,
      records: COSMETICS_DATASET.records,
      branches: COSMETICS_DATASET.branches,
      items: COSMETICS_DATASET.items
    };
  }

  if (presetId === 'apparel') {
    return {
      config,
      records: APPAREL_DATASET.records,
      branches: APPAREL_DATASET.branches,
      items: APPAREL_DATASET.items
    };
  }

  if (presetId === 'electronics') {
    return {
      config,
      records: ELECTRONICS_DATASET.records,
      branches: ELECTRONICS_DATASET.branches,
      items: ELECTRONICS_DATASET.items
    };
  }

  // Default: Diamond & Fine Jewelry
  return {
    config,
    records: DEFAULT_RAW_RECORDS,
    branches: ALL_BRANCHES,
    items: ALL_WEIGHTS
  };
}
