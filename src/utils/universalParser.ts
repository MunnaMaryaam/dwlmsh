import { RawInventoryRecord } from '../types';
import * as XLSX from 'xlsx';
import {
  intelligentNormalizeWeight,
  intelligentNormalizeBranch,
  applyIdentityToRecords,
  learnFromRecords
} from './dataIdentityEngine';

export interface ParsedDataResult {
  records: RawInventoryRecord[];
  detectedFormat: 'EXCEL' | 'XML' | 'HTML' | 'CSV_TSV' | 'JSON' | 'PDF';
  detectedSheets?: string[];
  summary: {
    totalRows: number;
    branchesFound: number;
    weightsFound: number;
    totalSold: number;
    totalStock: number;
  };
}

/**
 * Universal Parser that supports:
 * 1. Excel files (.xlsx, .xls) - Multi-sheet aware (e.g. Sales sheet, Stock sheet, Matrix sheet)
 * 2. XML files (.xml) - Lightweight structured schema
 * 3. HTML tables (.html, .htm) - Zero dependency direct HTML table parsing
 * 4. PDF files (.pdf) - Text stream table extraction
 * 5. CSV / TSV / Text - Comma or Tab separated values
 * 6. JSON files (.json)
 */
export function parseUniversalInventoryData(
  fileContent: string | ArrayBuffer,
  fileName?: string
): ParsedDataResult {
  const isBinary = fileContent instanceof ArrayBuffer;
  const name = (fileName || '').toLowerCase();

  // Check if PDF file
  if (name.endsWith('.pdf')) {
    return parsePDFContent(fileContent);
  }

  // If binary or .xlsx / .xls, use XLSX parser
  if (isBinary || name.endsWith('.xlsx') || name.endsWith('.xls')) {
    if (isBinary) {
      const headerBytes = new Uint8Array(fileContent as ArrayBuffer, 0, 5);
      const isPdf = headerBytes[0] === 0x25 && headerBytes[1] === 0x50 && headerBytes[2] === 0x44 && headerBytes[3] === 0x46; // %PDF
      if (isPdf) {
        return parsePDFContent(fileContent);
      }
    }
    return parseExcelBuffer(fileContent as ArrayBuffer);
  }

  const textContent = typeof fileContent === 'string' ? fileContent : new TextDecoder().decode(fileContent);
  const trimmed = textContent.trim();

  // Check if PDF text stream
  if (trimmed.startsWith('%PDF-')) {
    return parsePDFContent(trimmed);
  }

  // Check if XML
  if (trimmed.startsWith('<?xml') || (trimmed.startsWith('<') && trimmed.includes('</') && trimmed.includes('<record') || trimmed.includes('<row') || trimmed.includes('<inventory') || trimmed.includes('<item'))) {
    return parseXMLContent(trimmed);
  }

  // Check if HTML Table
  if (trimmed.includes('<table') || trimmed.includes('<TABLE') || trimmed.includes('<tr') || trimmed.includes('<TR')) {
    return parseHTMLTableContent(trimmed);
  }

  // Check if JSON
  if (trimmed.startsWith('[') || (trimmed.startsWith('{') && trimmed.includes('"branch"'))) {
    try {
      const json = JSON.parse(trimmed);
      const items = Array.isArray(json) ? json : (json.records || json.data || json.items || []);
      const records = normalizeRecordList(items);
      return {
        records,
        detectedFormat: 'JSON',
        summary: computeSummary(records)
      };
    } catch {
      // fallback to CSV
    }
  }

  // Default to Delimited CSV / TSV parser
  return parseDelimitedContent(trimmed);
}

/**
 * Parses Excel workbook (.xlsx / .xls)
 * Handles both:
 * 1. Unified Table (Branch, Weight, Sold, Stock)
 * 2. Separate Sheets (e.g., "Soldout" / "Sales" sheet + "Current Stock" sheet)
 * 3. Matrix Sheet (Branch columns with Carat weight rows)
 */
export function parseExcelBuffer(buffer: ArrayBuffer | Uint8Array | string): ParsedDataResult {
  const workbook = typeof buffer === 'string'
    ? XLSX.read(buffer, { type: 'binary' })
    : XLSX.read(buffer, { type: 'array' });

  const sheetNames = workbook.SheetNames;
  let allRecords: RawInventoryRecord[] = [];

  // Check if workbook has separate "Sold" and "Stock" sheets
  const soldSheetName = sheetNames.find(s => /sold|sale|sales/i.test(s));
  const stockSheetName = sheetNames.find(s => /stock|inventory|current/i.test(s));

  if (soldSheetName && stockSheetName && soldSheetName !== stockSheetName) {
    // Separate sheets workflow
    const soldSheet = workbook.Sheets[soldSheetName];
    const stockSheet = workbook.Sheets[stockSheetName];
    
    const soldData = XLSX.utils.sheet_to_json(soldSheet, { header: 1 }) as any[][];
    const stockData = XLSX.utils.sheet_to_json(stockSheet, { header: 1 }) as any[][];

    allRecords = mergeSeparateSheetsData(soldData, stockData);
  } else {
    // Process primary sheet or iterate sheets
    const primarySheet = workbook.Sheets[sheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(primarySheet, { header: 1 }) as any[][];

    allRecords = parseGridRows(rawRows);
  }

  return {
    records: allRecords,
    detectedFormat: 'EXCEL',
    detectedSheets: sheetNames,
    summary: computeSummary(allRecords)
  };
}

/**
 * Parses XML data
 * Supports standard enterprise XML structures:
 * <inventory>
 *   <item branch="Gulshan" weight="0.24" sold="2" stock="1" />
 *   ...
 * </inventory>
 */
export function parseXMLContent(xmlText: string): ParsedDataResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const records: RawInventoryRecord[] = [];

  // Check for common XML elements: <item>, <record>, <row>, <product>, <entry>
  const elements = Array.from(xmlDoc.querySelectorAll('item, record, row, product, entry, inventory_item'));

  elements.forEach((el, index) => {
    // Check attributes or child tags
    const branch = el.getAttribute('branch') || el.querySelector('branch')?.textContent || el.querySelector('Branch')?.textContent || 'Main Branch';
    const weight = el.getAttribute('weight') || el.getAttribute('carat') || el.querySelector('weight')?.textContent || el.querySelector('particulars')?.textContent || el.querySelector('carat')?.textContent || '0.25';
    const sold = el.getAttribute('sold') || el.getAttribute('soldQty') || el.querySelector('sold')?.textContent || el.querySelector('soldQty')?.textContent || '0';
    const stock = el.getAttribute('stock') || el.getAttribute('currentStock') || el.querySelector('stock')?.textContent || el.querySelector('currentStock')?.textContent || '0';

    records.push({
      id: `xml-${index}-${Date.now()}`,
      branch: branch.trim(),
      weight: normalizeWeight(weight),
      soldQty: parseInt(sold, 10) || 0,
      currentStock: parseInt(stock, 10) || 0
    });
  });

  return {
    records,
    detectedFormat: 'XML',
    summary: computeSummary(records)
  };
}

/**
 * Dedicated Parser for Oracle Reports HTML Output
 * (Handles "Diamond Ct. Wise Sold", "Diamond Ct. Wise Stock", etc.)
 */
export function parseOracleReportsHTML(htmlText: string): RawInventoryRecord[] | null {
  try {
    const isSold = /wise\s*sold|sold/i.test(htmlText) && !/wise\s*stock/i.test(htmlText);
    const isStock = /wise\s*stock/i.test(htmlText);

    // Clean comments and normalize
    const clean = htmlText.replace(/<!--[\s\S]*?-->/g, '');
    const trMatches = [...clean.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => m[1]);
    if (trMatches.length === 0) return null;

    // 1. Locate the header row containing weights
    let weights: string[] = [];
    let weightCols: { weight: string; colStart: number; colEnd: number }[] = [];

    for (const tr of trMatches) {
      const bMatches = [...tr.matchAll(/<b>(\d+\.\d+)<\/b>/gi)];
      if (bMatches.length >= 2) {
        let colPos = 0;
        const tdRegex = /<td([^>]*)>([\s\S]*?)<\/td>/gi;
        let m;
        while ((m = tdRegex.exec(tr)) !== null) {
          const attrs = m[1];
          const text = m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
          const cs = attrs.match(/colspan="?(\d+)"?/i);
          const colspan = cs ? parseInt(cs[1], 10) : 1;
          if (/^\d+\.\d+$/.test(text)) {
            weights.push(text);
            weightCols.push({ weight: text, colStart: colPos, colEnd: colPos + colspan });
          }
          colPos += colspan;
        }
        if (weights.length >= 2) break;
      }
    }

    if (weights.length === 0) return null;

    // 2. Identify known branch codes or standard 2-5 letter uppercase branch identifiers
    const branchCodeRegex = />([A-Z]{2,5})<\/font>/;
    const records: RawInventoryRecord[] = [];
    let recordIndex = 1;

    for (const tr of trMatches) {
      // Check if this row represents a branch
      const branchMatch = tr.match(branchCodeRegex);
      if (!branchMatch) continue;

      const branch = branchMatch[1];
      if (branch === 'QTY' || branch === 'TOTAL' || branch === 'RANGE') continue;

      // Extract all cells with their column spans
      let colPos = 0;
      const tdRegex = /<td([^>]*)>([\s\S]*?)<\/td>/gi;
      let m;
      const cells: { colStart: number; colEnd: number; text: string; alignCenter: boolean }[] = [];

      while ((m = tdRegex.exec(tr)) !== null) {
        const attrs = m[1];
        const text = m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        const cs = attrs.match(/colspan="?(\d+)"?/i);
        const colspan = cs ? parseInt(cs[1], 10) : 1;
        const alignCenter = /align="?center"?/i.test(attrs);
        cells.push({ colStart: colPos, colEnd: colPos + colspan, text, alignCenter });
        colPos += colspan;
      }

      // Match cells against weight column positions
      let foundInRow = 0;
      weightCols.forEach(wCol => {
        // Find matching cell by interval overlap
        const matchedCell = cells.find(c =>
          Math.max(c.colStart, wCol.colStart) < Math.min(c.colEnd, wCol.colEnd)
        );

        if (matchedCell && /^\d+$/.test(matchedCell.text)) {
          const qty = parseInt(matchedCell.text, 10);
          if (qty > 0) {
            records.push({
              id: `ora-${recordIndex++}`,
              branch,
              weight: wCol.weight,
              soldQty: isSold ? qty : 0,
              currentStock: isStock || !isSold ? qty : 0
            });
            foundInRow++;
          }
        }
      });

      // Fallback: If colspans didn't match, map align="center" cells after branch code sequentially
      if (foundInRow === 0) {
        const centerCells = cells.filter(c => c.alignCenter);
        const branchIdx = centerCells.findIndex(c => c.text === branch);
        if (branchIdx !== -1 && centerCells.length > branchIdx + 1) {
          const dataCells = centerCells.slice(branchIdx + 1, branchIdx + 1 + weights.length);
          dataCells.forEach((c, idx) => {
            if (/^\d+$/.test(c.text)) {
              const qty = parseInt(c.text, 10);
              if (qty > 0 && idx < weights.length) {
                records.push({
                  id: `ora-${recordIndex++}`,
                  branch,
                  weight: weights[idx],
                  soldQty: isSold ? qty : 0,
                  currentStock: isStock || !isSold ? qty : 0
                });
              }
            }
          });
        }
      }
    }

    return records.length > 0 ? records : null;
  } catch (err) {
    console.warn('Oracle Reports HTML parsing encountered error, falling back:', err);
    return null;
  }
}

/**
 * Parses HTML Table structure
 * Useful for fast paste / lightweight data pressure export
 */
export function parseHTMLTableContent(htmlText: string): ParsedDataResult {
  // Try dedicated Oracle Reports parser first if signatures match
  if (
    /wise\s*(sold|stock)/i.test(htmlText) ||
    /oracle\s*reports/i.test(htmlText) ||
    /<b>\d+\.\d{2}<\/b>/i.test(htmlText)
  ) {
    const oracleRecords = parseOracleReportsHTML(htmlText);
    if (oracleRecords && oracleRecords.length > 0) {
      return {
        records: oracleRecords,
        detectedFormat: 'HTML',
        summary: computeSummary(oracleRecords)
      };
    }
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const table = doc.querySelector('table');

  if (!table) {
    return parseDelimitedContent(htmlText);
  }

  const rows = Array.from(table.querySelectorAll('tr'));
  const grid: any[][] = [];

  rows.forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('th, td')).map(td => td.textContent?.trim() || '');
    if (cells.length > 0) grid.push(cells);
  });

  const records = parseGridRows(grid);
  return {
    records,
    detectedFormat: 'HTML',
    summary: computeSummary(records)
  };
}

/**
 * Parses TSV, CSV, or semicolon delimited text
 */
export function parseDelimitedContent(text: string): ParsedDataResult {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    return { records: [], detectedFormat: 'CSV_TSV', summary: computeSummary([]) };
  }

  // Detect delimiter
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

  const grid = lines.map(line => {
    // Regex for CSV handling quotes
    const regex = new RegExp(`(?:^|${delimiter})(?:"([^"]*(?:""[^"]*)*)"|([^"${delimiter}]*))`, 'g');
    const row: string[] = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
      row.push((val || '').trim());
      if (regex.lastIndex === 0) break; // prevent infinite loop on empty
    }
    return row.length > 0 ? row : line.split(delimiter).map(s => s.trim());
  });

  const records = parseGridRows(grid);
  return {
    records,
    detectedFormat: 'CSV_TSV',
    summary: computeSummary(records)
  };
}

/**
 * Parses any 2D Grid (from Excel, HTML table, or CSV)
 * Determines if it is tabular or cross-tab matrix
 */
function parseGridRows(grid: any[][]): RawInventoryRecord[] {
  if (grid.length < 2) return [];

  // Find header row (skip title blocks if any)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(6, grid.length); i++) {
    const rowStr = grid[i].map(c => String(c).toLowerCase()).join(' ');
    if (
      rowStr.includes('branch') || rowStr.includes('store') || rowStr.includes('outlet') ||
      rowStr.includes('weight') || rowStr.includes('particular') || rowStr.includes('sku') ||
      rowStr.includes('product') || rowStr.includes('item') || rowStr.includes('sold') ||
      rowStr.includes('stock')
    ) {
      headerRowIdx = i;
      break;
    }
  }

  const headerRow = grid[headerRowIdx].map(c => String(c || '').trim().toLowerCase().replace(/[\s_#]/g, ''));
  
  let branchIdx = headerRow.findIndex(h => 
    h.includes('branch') || h.includes('store') || h.includes('outlet') || 
    h.includes('location') || h.includes('warehouse') || h.includes('depot')
  );
  let weightIdx = headerRow.findIndex(h => 
    h.includes('weight') || h.includes('particular') || h.includes('carat') || 
    h.includes('size') || h.includes('sku') || h.includes('product') || 
    h.includes('item') || h.includes('model') || h.includes('shade') || 
    h.includes('variant') || h.includes('description') || h.includes('code')
  );
  let soldIdx = headerRow.findIndex(h => 
    h.includes('sold') || h.includes('sale') || h.includes('soldout') || 
    h.includes('demand') || h.includes('outflow')
  );
  let stockIdx = headerRow.findIndex(h => 
    h.includes('stock') || h.includes('currentstock') || h.includes('avail') || 
    h.includes('qty') || h.includes('inventory') || h.includes('balance') || 
    h.includes('onhand')
  );

  // Check if Matrix format (Where row headers are weights, and column headers are Branch names)
  const isMatrix = branchIdx === -1 && weightIdx !== -1 && headerRow.length > 4;
  if (isMatrix) {
    return parseMatrixGrid(grid, headerRowIdx, weightIdx);
  }

  // Check if Matrix Crosstab where columns are Carat Weights and rows are Branches
  if (isMatrixCrosstabGrid(grid, headerRowIdx)) {
    return parseMatrixCrosstabGrid(grid, headerRowIdx);
  }

  if (branchIdx === -1) branchIdx = 0;
  if (weightIdx === -1) weightIdx = 1;
  if (soldIdx === -1) soldIdx = 2;
  if (stockIdx === -1) stockIdx = 3;

  const records: RawInventoryRecord[] = [];

  for (let i = headerRowIdx + 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row || row.length < 2) continue;

    const branchRaw = String(row[branchIdx] || '').trim();
    const weightRaw = String(row[weightIdx] || '').trim();
    if (!branchRaw || !weightRaw || branchRaw.toLowerCase().includes('total')) continue;

    const branch = normalizeBranch(branchRaw);
    const weight = normalizeWeight(weightRaw);
    const soldQty = parseInt(String(row[soldIdx] || '0').replace(/[^0-9-]/g, ''), 10) || 0;
    const currentStock = parseInt(String(row[stockIdx] || '0').replace(/[^0-9-]/g, ''), 10) || 0;

    records.push({
      id: `row-${i}-${Date.now()}`,
      branch,
      weight,
      soldQty,
      currentStock
    });
  }

  learnFromRecords(records);
  return applyIdentityToRecords(records);
}

/**
 * Parses cross-tab matrix where row is weight and columns are branches
 */
function parseMatrixGrid(grid: any[][], headerRowIdx: number, weightIdx: number): RawInventoryRecord[] {
  const records: RawInventoryRecord[] = [];
  const header = grid[headerRowIdx];
  const branches: { colIdx: number; name: string }[] = [];

  for (let c = 0; c < header.length; c++) {
    if (c === weightIdx) continue;
    const name = String(header[c] || '').trim();
    if (name && !name.toLowerCase().includes('total') && !name.toLowerCase().includes('action')) {
      branches.push({ colIdx: c, name });
    }
  }

  for (let r = headerRowIdx + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;
    const weightRaw = String(row[weightIdx] || '').trim();
    if (!weightRaw || weightRaw.toLowerCase().includes('total')) continue;
    const weight = normalizeWeight(weightRaw);

    branches.forEach(b => {
      const cellVal = parseInt(String(row[b.colIdx] || '0').replace(/[^0-9-]/g, ''), 10) || 0;
      // In a movement matrix, positive is Move IN (sold shortage), negative is Move OUT (excess stock)
      // We map this into synthetic sold / stock records
      records.push({
        id: `mat-${r}-${b.colIdx}-${Date.now()}`,
        branch: b.name,
        weight,
        soldQty: cellVal > 0 ? cellVal : 0,
        currentStock: cellVal < 0 ? Math.abs(cellVal) : 0
      });
    });
  }

  return records;
}

/**
 * Merges two separate sheets: e.g. Soldout Sheet + Current Stock Sheet
 */
/**
 * Detects if a 2D grid is a Carat/Weight Matrix crosstab
 * (e.g. Columns are carat weights like 0.24, 0.27, 1.00, etc. and rows are Branches)
 */
export function isMatrixCrosstabGrid(grid: any[][], headerRowIdx = 0): boolean {
  if (!grid || grid.length < 2 || headerRowIdx >= grid.length) return false;
  const header = grid[headerRowIdx].map(c => String(c || '').trim().toLowerCase());
  
  // Count how many headers look like numeric weights/carats: e.g. "0.24", "0.27", "1", "1.06", etc.
  const numericWeightCols = header.filter(c => /^0?\.\d+$/.test(c) || /^\d+(\.\d+)?$/.test(c));
  if (numericWeightCols.length >= 2) {
    return true;
  }
  return false;
}

/**
 * Parses cross-tab matrix where rows are Branches and columns are Carat weights
 * Handles Category column (col 0), Branch column (col 1 or 0), and Total column/row
 */
export function parseMatrixCrosstabGrid(
  grid: any[][],
  headerRowIdx = 0,
  defaultQuantityType: 'STOCK' | 'SOLD' | 'AUTO' = 'AUTO'
): RawInventoryRecord[] {
  const rawHeader = grid[headerRowIdx];
  const headerClean = rawHeader.map((c: any) => String(c || '').trim().toLowerCase().replace(/[\s_#]/g, ''));

  let branchColIdx = headerClean.findIndex((h: string) =>
    h.includes('branch') || h.includes('outlet') || h.includes('store') || h.includes('location')
  );
  let categoryColIdx = headerClean.findIndex((h: string) =>
    h.includes('category') || h.includes('particular') || h.includes('item')
  );

  if (branchColIdx === -1) {
    branchColIdx = categoryColIdx === 0 ? 1 : 0;
  }

  // Find all carat/weight columns
  const weightColumns: { colIdx: number; weight: string }[] = [];
  for (let c = 0; c < rawHeader.length; c++) {
    if (c === branchColIdx || c === categoryColIdx) continue;
    const colName = String(rawHeader[c] || '').trim();
    if (!colName) continue;
    const lower = colName.toLowerCase().replace(/[\s_:]/g, '');
    if (lower === 'total' || lower.startsWith('total') || lower === 'sum' || lower === 'action') continue;

    weightColumns.push({
      colIdx: c,
      weight: normalizeWeight(colName)
    });
  }

  let isSold = defaultQuantityType === 'SOLD';
  if (defaultQuantityType === 'AUTO') {
    const previewText = grid.slice(0, 5).map(r => r.join(' ')).join(' ').toLowerCase();
    if (previewText.includes('sold') || previewText.includes('sale') || previewText.includes('soldout')) {
      isSold = true;
    }
  }

  const records: RawInventoryRecord[] = [];

  for (let r = headerRowIdx + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row || row.length === 0) continue;

    const branchRaw = String(row[branchColIdx] || '').trim();
    if (!branchRaw) continue;

    const lowerBranch = branchRaw.toLowerCase().replace(/[\s_:]/g, '');
    if (lowerBranch === 'total' || lowerBranch.startsWith('total') || lowerBranch.startsWith('grandtotal') || lowerBranch === 'sum') {
      continue; // skip summary row
    }

    for (const wCol of weightColumns) {
      const cellVal = row[wCol.colIdx];
      if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
        const qty = parseInt(String(cellVal).replace(/[^0-9-]/g, ''), 10);
        if (!isNaN(qty) && qty > 0) {
          records.push({
            id: `matrix-${r}-${wCol.colIdx}-${Date.now()}`,
            branch: branchRaw,
            weight: wCol.weight,
            soldQty: isSold ? qty : 0,
            currentStock: !isSold ? qty : 0
          });
        }
      }
    }
  }

  return records;
}

/**
 * Converts any file input (string, ArrayBuffer, Excel buffer, CSV text) into a 2D Array
 */
export function parseAnyContentToGrid(content: string | ArrayBuffer, fileName?: string): any[][] {
  const isBinary = content instanceof ArrayBuffer;
  const name = (fileName || '').toLowerCase();

  if (isBinary || name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const workbook = typeof content === 'string'
      ? XLSX.read(content, { type: 'binary' })
      : XLSX.read(content, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  }

  const text = typeof content === 'string' ? content : new TextDecoder().decode(content);
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

  return lines.map(line => {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    return row;
  });
}

/**
 * Universal Dual-File Ingestion:
 * Takes the Stock File and the Sold Out File (CSV / Excel / text)
 * and accurately combines them into a unified RawInventoryRecord set.
 */
export function mergeDualStockAndSoldData(
  stockContent: string | ArrayBuffer,
  soldContent: string | ArrayBuffer,
  stockFileName = 'stock.csv',
  soldFileName = 'sold.csv'
): ParsedDataResult {
  const stockGrid = parseAnyContentToGrid(stockContent, stockFileName);
  const soldGrid = parseAnyContentToGrid(soldContent, soldFileName);

  const extractItems = (grid: any[][], isStock: boolean): { branch: string; weight: string; qty: number }[] => {
    if (grid.length < 2) return [];

    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(6, grid.length); i++) {
      const rowStr = grid[i].map(c => String(c).toLowerCase()).join(' ');
      if (
        rowStr.includes('branch') || rowStr.includes('outlet') ||
        rowStr.includes('category') || rowStr.includes('particular') ||
        rowStr.includes('0.') || rowStr.includes('total')
      ) {
        headerRowIdx = i;
        break;
      }
    }

    if (isMatrixCrosstabGrid(grid, headerRowIdx)) {
      const recs = parseMatrixCrosstabGrid(grid, headerRowIdx, isStock ? 'STOCK' : 'SOLD');
      return recs.map(r => ({
        branch: r.branch,
        weight: r.weight,
        qty: isStock ? r.currentStock : r.soldQty
      }));
    }

    // Standard tabular parsing
    const recs = parseGridRows(grid);
    return recs.map(r => ({
      branch: r.branch,
      weight: r.weight,
      qty: isStock ? (r.currentStock || r.soldQty) : (r.soldQty || r.currentStock)
    }));
  };

  const stockItems = extractItems(stockGrid, true);
  const soldItems = extractItems(soldGrid, false);

  const map: Record<string, { branch: string; weight: string; soldQty: number; currentStock: number }> = {};

  stockItems.forEach(item => {
    const branch = intelligentNormalizeBranch(item.branch);
    const weight = intelligentNormalizeWeight(item.weight);
    const key = `${branch}__${weight}`;
    if (!map[key]) {
      map[key] = { branch, weight, soldQty: 0, currentStock: 0 };
    }
    map[key].currentStock += item.qty;
  });

  soldItems.forEach(item => {
    const branch = intelligentNormalizeBranch(item.branch);
    const weight = intelligentNormalizeWeight(item.weight);
    const key = `${branch}__${weight}`;
    if (!map[key]) {
      map[key] = { branch, weight, soldQty: 0, currentStock: 0 };
    }
    map[key].soldQty += item.qty;
  });

  const mergedRecords: RawInventoryRecord[] = Object.values(map).map((item, idx) => {
    const sold = item.soldQty || 0;
    return {
      id: `daily-upload-${idx}-${Date.now()}`,
      branch: normalizeBranch(item.branch),
      weight: normalizeWeight(item.weight),
      soldQty: item.soldQty,
      currentStock: item.currentStock,
      sales3M: Math.max(0, Math.round(sold * 0.4)),
      sales6M: Math.max(0, Math.round(sold * 0.7)),
      sales1Y: sold,
      sales2Y: Math.max(0, Math.round(sold * 1.8)),
      ageDays: item.currentStock > 0 && sold === 0 ? 310 : 65
    };
  });

  learnFromRecords(mergedRecords);
  const finalized = applyIdentityToRecords(mergedRecords);

  return {
    records: finalized,
    detectedFormat: 'EXCEL',
    summary: computeSummary(finalized)
  };
}

function mergeSeparateSheetsData(soldGrid: any[][], stockGrid: any[][]): RawInventoryRecord[] {
  const map: Record<string, { branch: string; weight: string; soldQty: number; currentStock: number }> = {};

  const processSheet = (grid: any[][], isStock: boolean) => {
    if (grid.length < 2) return;
    const header = grid[0].map(c => String(c || '').toLowerCase().replace(/[\s_]/g, ''));
    let bIdx = header.findIndex(h => h.includes('branch'));
    let wIdx = header.findIndex(h => h.includes('weight') || h.includes('particular') || h.includes('carat'));
    let qIdx = header.findIndex(h => h.includes('qty') || h.includes('sold') || h.includes('stock') || h.includes('count'));

    if (bIdx === -1) bIdx = 0;
    if (wIdx === -1) wIdx = 1;
    if (qIdx === -1) qIdx = 2;

    for (let i = 1; i < grid.length; i++) {
      const row = grid[i];
      if (!row || row.length < 2) continue;
      const branch = String(row[bIdx] || '').trim();
      const weightRaw = String(row[wIdx] || '').trim();
      if (!branch || !weightRaw || branch.toLowerCase().includes('total')) continue;
      const weight = normalizeWeight(weightRaw);
      const qty = parseInt(String(row[qIdx] || '0').replace(/[^0-9-]/g, ''), 10) || 0;

      const key = `${branch}__${weight}`;
      if (!map[key]) {
        map[key] = { branch, weight, soldQty: 0, currentStock: 0 };
      }
      if (isStock) {
        map[key].currentStock += qty;
      } else {
        map[key].soldQty += qty;
      }
    }
  };

  processSheet(soldGrid, false);
  processSheet(stockGrid, true);

  return Object.values(map).map((item, idx) => ({
    id: `merged-${idx}-${Date.now()}`,
    ...item
  }));
}

function normalizeWeight(val: string): string {
  return intelligentNormalizeWeight(val);
}

function normalizeBranch(val: string): string {
  return intelligentNormalizeBranch(val);
}

function normalizeRecordList(items: any[]): RawInventoryRecord[] {
  const records = items.map((item, i) => ({
    id: item.id || `rec-${i}-${Date.now()}`,
    branch: normalizeBranch(
      String(
        item.branch ||
          item.Branch ||
          item.store ||
          item.Store ||
          item.location ||
          item.outlet ||
          item.Outlet ||
          'Main Branch'
      )
    ),
    weight: normalizeWeight(
      String(
        item.weight ||
          item.Weight ||
          item.carat ||
          item.Carat ||
          item.cts ||
          item.Cts ||
          item.cent ||
          item.Cent ||
          item.particular ||
          item.Particular ||
          item.sku ||
          item.SKU ||
          item.item ||
          item.Item ||
          item.product ||
          item.Product ||
          `Item-${i + 1}`
      )
    ),
    soldQty: parseInt(item.soldQty || item.sold || item.Sold || item.sales || item.Sales || 0, 10) || 0,
    currentStock: parseInt(item.currentStock || item.stock || item.Stock || item.qty || item.Qty || 0, 10) || 0,
    category: item.category || item.Category || item.mainCategory || undefined,
    variant: item.variant || item.Variant || item.subCategory || undefined,
    itemName: item.itemName || item.name || item.Name || undefined
  }));
  // Learn identities for next unorganized upload
  learnFromRecords(records);
  return applyIdentityToRecords(records);
}

function computeSummary(records: RawInventoryRecord[]) {
  const branches = new Set(records.map(r => r.branch));
  const weights = new Set(records.map(r => r.weight));
  const totalSold = records.reduce((sum, r) => sum + r.soldQty, 0);
  const totalStock = records.reduce((sum, r) => sum + r.currentStock, 0);

  return {
    totalRows: records.length,
    branchesFound: branches.size,
    weightsFound: weights.size,
    totalSold,
    totalStock
  };
}

/**
 * Parses PDF text streams or uncompressed layout tables
 */
export function parsePDFContent(fileContent: string | ArrayBuffer): ParsedDataResult {
  let rawText = '';
  if (typeof fileContent === 'string') {
    rawText = fileContent;
  } else {
    try {
      const bytes = new Uint8Array(fileContent);
      const decoder = new TextDecoder('latin1');
      rawText = decoder.decode(bytes);
    } catch {
      rawText = '';
    }
  }

  const textTokens: string[] = [];

  // Extract PDF text literals: (Text) Tj, (Text) ', (Text) "
  const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
  let tjMatch;
  while ((tjMatch = tjRegex.exec(rawText)) !== null) {
    const val = tjMatch[1].replace(/\\([()\\])/g, '$1').trim();
    if (val) textTokens.push(val);
  }

  // Extract PDF array text: [(T) 10 (e) 10 (x) (t)] TJ
  const arrayRegex = /\[(.*?)\]\s*TJ/g;
  let arrMatch;
  while ((arrMatch = arrayRegex.exec(rawText)) !== null) {
    const inner = arrMatch[1];
    const innerStrRegex = /\(([^)]+)\)/g;
    let innerStrMatch;
    let combined = '';
    while ((innerStrMatch = innerStrRegex.exec(inner)) !== null) {
      combined += innerStrMatch[1].replace(/\\([()\\])/g, '$1');
    }
    if (combined.trim()) textTokens.push(combined.trim());
  }

  // Fallback: look for plain ASCII text sequences if no Tj/TJ operators found
  if (textTokens.length === 0) {
    const printableWords = rawText.match(/[A-Za-z0-9_#\-.]{2,}/g) || [];
    textTokens.push(...printableWords.filter(w => !w.startsWith('obj') && !w.startsWith('endobj') && !w.startsWith('stream')));
  }

  const records = parseTokensIntoRecords(textTokens);

  return {
    records,
    detectedFormat: 'PDF',
    summary: computeSummary(records)
  };
}

/**
 * Groups text tokens extracted from PDF or stream into inventory records
 */
function parseTokensIntoRecords(tokens: string[]): RawInventoryRecord[] {
  if (tokens.length < 4) return [];

  // Look for header positions
  let startIdx = 0;
  for (let i = 0; i < Math.min(20, tokens.length); i++) {
    const t = tokens[i].toLowerCase();
    if (t.includes('branch') || t.includes('weight') || t.includes('sold') || t.includes('stock')) {
      startIdx = i + 1;
    }
  }

  const records: RawInventoryRecord[] = [];
  const remaining = tokens.slice(startIdx);

  // Attempt 1: 4-tuple pattern [Branch, Weight, Sold, Stock]
  let i = 0;
  while (i < remaining.length) {
    const branchCandidate = remaining[i]?.trim();
    const weightCandidate = remaining[i + 1]?.trim();
    const soldCandidate = remaining[i + 2]?.trim();
    const stockCandidate = remaining[i + 3]?.trim();

    if (!branchCandidate || !weightCandidate) {
      i++;
      continue;
    }

    // Check if sold & stock candidates are integers
    const soldNum = parseInt(soldCandidate || '', 10);
    const stockNum = parseInt(stockCandidate || '', 10);

    if (!isNaN(soldNum) && !isNaN(stockNum) && !branchCandidate.toLowerCase().includes('total')) {
      records.push({
        id: `pdf-${records.length}-${Date.now()}`,
        branch: branchCandidate,
        weight: normalizeWeight(weightCandidate),
        soldQty: Math.max(0, soldNum),
        currentStock: Math.max(0, stockNum)
      });
      i += 4;
    } else {
      i++;
    }
  }

  return records;
}
