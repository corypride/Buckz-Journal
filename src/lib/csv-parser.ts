/**
 * CSV Trade Data Parser
 *
 * Parses trading data from CSV files containing trade history.
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
 * Parse trade data from a CSV string
 */
export function parseCsvTrades(csvText: string): ParsedTradeData[] {
  try {
    const lines = csvText.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      return [];
    }

    // Parse header to find column indices
    const header = parseCSVLine(lines[0]);
    const columnIndices = mapColumnIndices(header);

    // Parse data rows
    const trades: ParsedTradeData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < header.length) continue; // Skip malformed rows

      const trade = parseCSVRow(values, columnIndices);
      if (trade) {
        trades.push(trade);
      }
    }

    return trades;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse a CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Map header columns to their indices
 */
function mapColumnIndices(headers: string[]): Record<string, number> {
  const indices: Record<string, number> = {};
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const [field, possibleNames] of Object.entries(COLUMN_MAP)) {
    for (const name of possibleNames) {
      const index = normalizedHeaders.findIndex((h) => h === name.toLowerCase());
      if (index !== -1) {
        indices[field] = index;
        break;
      }
    }
  }

  return indices;
}

/**
 * Parse a CSV row into trade data
 */
function parseCSVRow(values: string[], columnIndices: Record<string, number>): ParsedTradeData | null {
  try {
    const trade: Partial<ParsedTradeData> = {};

    // Extract values using mapped column indices
    if (columnIndices.direction !== undefined) {
      trade.direction = parseDirection(values[columnIndices.direction]);
    }
    if (columnIndices.orderNumber !== undefined) {
      trade.orderNumber = values[columnIndices.orderNumber] || '';
    }
    if (columnIndices.expiryTime !== undefined) {
      trade.expiryTime = values[columnIndices.expiryTime] || '';
    }
    if (columnIndices.asset !== undefined) {
      trade.asset = (values[columnIndices.asset] || '').toUpperCase();
    }
    if (columnIndices.openTime !== undefined) {
      trade.openTime = values[columnIndices.openTime] || '';
    }
    if (columnIndices.closeTime !== undefined) {
      trade.closeTime = values[columnIndices.closeTime] || '';
    }
    if (columnIndices.openPrice !== undefined) {
      trade.openPrice = parseNumber(values[columnIndices.openPrice]);
    }
    if (columnIndices.closePrice !== undefined) {
      trade.closePrice = parseNumber(values[columnIndices.closePrice]);
    }
    if (columnIndices.tradeAmount !== undefined) {
      trade.tradeAmount = parseNumber(values[columnIndices.tradeAmount]);
    }
    if (columnIndices.profitAmount !== undefined) {
      trade.profitAmount = parseNumber(values[columnIndices.profitAmount]);
    }
    if (columnIndices.currency !== undefined) {
      trade.currency = (values[columnIndices.currency] || 'USD').toUpperCase();
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
 * Parse direction string to 'call' | 'put'
 */
function parseDirection(value: string): 'call' | 'put' {
  const normalized = (value || '').toLowerCase().trim();
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
function parseNumber(value: string): number {
  const str = (value || '0').replace(/[$,]/g, '').replace('%', '').trim();
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
