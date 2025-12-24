/**
 * Excel Trade Data Parser
 *
 * Parses trading data from Excel files (.xlsx, .xls) containing trade history.
 * Expected columns (flexible matching):
 * - Call/Put / Direction / Type
 * - Order # / Order Number / ID
 * - Expiry / Expiry Time
 * - Asset / Symbol / Stock
 * - Open Time / Entry Time
 * - Close Time / Exit Time
 * - Open Price / Entry Price
 * - Close Price / Exit Price
 * - Amount / Trade Amount / Investment
 * - Profit / P/L / Payout
 * - Currency
 */

import * as XLSX from 'xlsx';

export interface ParsedTradeData {
  direction: 'call' | 'put';
  orderNumber: string;
  expiryTime: string;
  asset: string;
  openTime: string;
  closeTime: string;
  openPrice: number;
  closePrice: number;
  tradeAmount: number;
  profitAmount: number;
  currency: string;
}

// Column name variations to match
const COLUMN_MAP: Record<string, string[]> = {
  direction: ['call/put', 'direction', 'type', 'trade type', 'option type', 'side'],
  orderNumber: ['order #', 'order number', 'order id', 'order', 'id', 'ticket'],
  expiryTime: ['expiry', 'expiry time', 'expiration', 'exp', 'expiration time'],
  asset: ['asset', 'symbol', 'stock', 'ticker', 'instrument', 'pair'],
  openTime: ['open time', 'entry time', 'start time', 'open date', 'entry date'],
  closeTime: ['close time', 'exit time', 'end time', 'close date', 'exit date'],
  openPrice: ['open price', 'entry price', 'strike price', 'open'],
  closePrice: ['close price', 'exit price', 'close'],
  tradeAmount: ['amount', 'trade amount', 'investment', 'stake', 'trade size'],
  profitAmount: ['profit', 'p/l', 'payout', 'profit/loss', 'return'],
  currency: ['currency', 'ccy', 'pair currency'],
};

/**
 * Parse trade data from an Excel file buffer
 */
export async function parseExcelTrades(buffer: Buffer): Promise<ParsedTradeData[]> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const trades: ParsedTradeData[] = [];

    // Iterate through all sheets
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: null,
        raw: false,
      });

      // Parse each row as a potential trade
      for (const row of jsonData) {
        const trade = parseExcelRow(row);
        if (trade) {
          trades.push(trade);
        }
      }
    }

    return trades;
  } catch (error) {
    console.error('Error parsing Excel:', error);
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse a single Excel row into trade data
 */
function parseExcelRow(row: Record<string, any>): ParsedTradeData | null {
  try {
    // Get column mapping for this sheet
    const columnMapping = mapColumns(row);

    const trade: Partial<ParsedTradeData> = {};

    // Extract values using the mapped column names
    for (const [field, possibleKeys] of Object.entries(columnMapping)) {
      for (const key of possibleKeys) {
        const value = row[key];
        if (value !== null && value !== undefined && value !== '') {
          switch (field) {
            case 'direction':
              trade.direction = parseDirection(value);
              break;
            case 'orderNumber':
              trade.orderNumber = String(value);
              break;
            case 'expiryTime':
              trade.expiryTime = String(value);
              break;
            case 'asset':
              trade.asset = String(value).toUpperCase();
              break;
            case 'openTime':
              trade.openTime = String(value);
              break;
            case 'closeTime':
              trade.closeTime = String(value);
              break;
            case 'openPrice':
              trade.openPrice = parseNumber(value);
              break;
            case 'closePrice':
              trade.closePrice = parseNumber(value);
              break;
            case 'tradeAmount':
              trade.tradeAmount = parseNumber(value);
              break;
            case 'profitAmount':
              trade.profitAmount = parseNumber(value);
              break;
            case 'currency':
              trade.currency = String(value).toUpperCase();
              break;
          }
          break; // Found a value, move to next field
        }
      }
    }

    // Set defaults for missing required fields
    if (!trade.direction) trade.direction = 'call';
    if (!trade.currency) trade.currency = 'USD';
    if (!trade.orderNumber) trade.orderNumber = '';
    if (!trade.expiryTime) trade.expiryTime = '';
    if (!trade.openTime) trade.openTime = '';
    if (!trade.closeTime) trade.closeTime = '';
    if (!trade.openPrice) trade.openPrice = 0;
    if (!trade.closePrice) trade.closePrice = 0;

    return isTradeComplete(trade) ? (trade as ParsedTradeData) : null;
  } catch {
    return null;
  }
}

/**
 * Map actual column names to standard fields
 */
function mapColumns(row: Record<string, any>): Record<string, string[]> {
  const mapping: Record<string, string[]> = {
    direction: [],
    orderNumber: [],
    expiryTime: [],
    asset: [],
    openTime: [],
    closeTime: [],
    openPrice: [],
    closePrice: [],
    tradeAmount: [],
    profitAmount: [],
    currency: [],
  };

  const actualColumns = Object.keys(row).map((col) => col.toLowerCase().trim());

  for (const [field, possibleNames] of Object.entries(COLUMN_MAP)) {
    for (const name of possibleNames) {
      const matchedColumn = actualColumns.find((col) => col === name.toLowerCase());
      if (matchedColumn) {
        // Find the original case column name
        const originalColumn = Object.keys(row).find(
          (col) => col.toLowerCase().trim() === matchedColumn
        );
        if (originalColumn) {
          mapping[field].push(originalColumn);
        }
      }
    }
  }

  return mapping;
}

/**
 * Parse direction string to 'call' | 'put'
 */
function parseDirection(value: string): 'call' | 'put' {
  const normalized = String(value).toLowerCase().trim();
  if (normalized.includes('call') || normalized.includes('buy') || normalized.includes('long')) {
    return 'call';
  }
  if (normalized.includes('put') || normalized.includes('sell') || normalized.includes('short')) {
    return 'put';
  }
  return 'call'; // Default
}

/**
 * Parse string to number, handling currency symbols, commas, etc.
 */
function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  const str = String(value).replace(/[$,]/g, '').replace('%', '').trim();
  return parseFloat(str) || 0;
}

/**
 * Check if a trade has all required fields
 */
function isTradeComplete(trade: Partial<ParsedTradeData>): trade is ParsedTradeData {
  return !!(
    trade.direction &&
    trade.asset &&
    trade.tradeAmount &&
    trade.profitAmount !== undefined
  );
}
