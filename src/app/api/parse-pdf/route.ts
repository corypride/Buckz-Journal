import { NextRequest, NextResponse } from 'next/server';

// Dynamic import for pdf-parse to avoid module loading issues
async function getPdfParse() {
  const module = await import('pdf-parse');
  return module.PDFParse;
}

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

function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[$,]/g, '').replace('%', ''));
}

function isTradeComplete(trade: Partial<ParsedTradeData>): trade is ParsedTradeData {
  return !!(
    trade.direction &&
    trade.asset &&
    trade.tradeAmount &&
    trade.profitAmount !== undefined
  );
}

function parseDelimitedLine(values: string[]): ParsedTradeData | null {
  try {
    const trade: Partial<ParsedTradeData> = {};

    for (let i = 0; i < values.length; i++) {
      const value = values[i].toLowerCase();

      // Detect direction
      if (value === 'call' || value === 'put') {
        trade.direction = value;
      }
      // Detect order number
      else if (value.match(/^#?\d+$/) && !trade.orderNumber) {
        trade.orderNumber = values[i];
      }
      // Detect asset
      else if (values[i].match(/^[A-Z]+\/?[A-Z]*$/) && !trade.asset) {
        trade.asset = values[i];
      }
      // Detect currency
      else if (value.match(/^(usd|eur|gbp|jpy|aud|cad|chf)$/i)) {
        trade.currency = value.toUpperCase();
      }
      // Detect numeric values
      else if (values[i].match(/^\$?\d+\.?\d*%?$/)) {
        const num = parseCurrency(values[i]);

        if (value.includes('%') && !trade.profitAmount) {
          trade.profitAmount = num;
        } else if (num > 1000 && !trade.tradeAmount) {
          trade.tradeAmount = num;
        } else if (num < 1000 && num > 0 && !trade.openPrice) {
          trade.openPrice = num;
        } else if (num < 1000 && num > 0 && !trade.closePrice) {
          trade.closePrice = num;
        }
      }
      // Detect dates/times
      else if (values[i].match(/\d{1,2}[:/]\d{2}/) || values[i].match(/\d{4}-\d{2}-\d{2}/)) {
        if (!trade.openTime) {
          trade.openTime = values[i];
        } else if (!trade.closeTime) {
          trade.closeTime = values[i];
        } else if (!trade.expiryTime) {
          trade.expiryTime = values[i];
        }
      }
    }

    if (!trade.direction) trade.direction = 'call';
    if (!trade.currency) trade.currency = 'USD';

    return isTradeComplete(trade) ? (trade as ParsedTradeData) : null;
  } catch {
    return null;
  }
}

function parseTextToTrades(text: string): ParsedTradeData[] {
  const trades: ParsedTradeData[] = [];
  const lines = text.split('\n').filter(line => line.trim());

  let currentTrade: Partial<ParsedTradeData> | null = null;

  for (const line of lines) {
    // Pattern 1: Pipe-separated values
    const pipeDelimited = line.split('|').map((s: string) => s.trim()).filter((s: string) => s);
    if (pipeDelimited.length >= 10) {
      const trade = parseDelimitedLine(pipeDelimited);
      if (trade) {
        trades.push(trade);
        continue;
      }
    }

    // Pattern 2: Key-value pairs
    const keyValueMatch = line.match(/^([^:]+):\s*(.+)$/);
    if (keyValueMatch) {
      const [, key, value] = keyValueMatch;
      const normalizedKey = key.toLowerCase().trim();

      if (!currentTrade) currentTrade = {};

      if (normalizedKey.includes('order') || normalizedKey.includes('order #')) {
        currentTrade.orderNumber = value;
      } else if (normalizedKey.includes('asset') || normalizedKey.includes('symbol')) {
        currentTrade.asset = value.toUpperCase();
      } else if (normalizedKey.includes('call') || normalizedKey.includes('put')) {
        currentTrade.direction = value.toLowerCase().includes('call') ? 'call' : 'put';
      } else if (normalizedKey.includes('amount') || normalizedKey.includes('investment')) {
        currentTrade.tradeAmount = parseCurrency(value);
      } else if (normalizedKey.includes('profit') || normalizedKey.includes('payout') || normalizedKey.includes('p/l')) {
        currentTrade.profitAmount = parseCurrency(value);
      } else if (normalizedKey.includes('open price')) {
        currentTrade.openPrice = parseFloat(value.replace(/[^0-9.]/g, ''));
      } else if (normalizedKey.includes('close price')) {
        currentTrade.closePrice = parseFloat(value.replace(/[^0-9.]/g, ''));
      } else if (normalizedKey.includes('open time')) {
        currentTrade.openTime = value;
      } else if (normalizedKey.includes('close time')) {
        currentTrade.closeTime = value;
      } else if (normalizedKey.includes('expir')) {
        currentTrade.expiryTime = value;
      } else if (normalizedKey.includes('currency')) {
        currentTrade.currency = value;
      }

      if (isTradeComplete(currentTrade)) {
        trades.push(currentTrade as ParsedTradeData);
        currentTrade = null;
      }
    }

    // Pattern 3: CSV-like lines
    const csvDelimited = line.split(',').map((s: string) => s.trim()).filter((s: string) => s);
    if (csvDelimited.length >= 8) {
      const trade = parseDelimitedLine(csvDelimited);
      if (trade) {
        trades.push(trade);
      }
    }
  }

  if (currentTrade && isTradeComplete(currentTrade)) {
    trades.push(currentTrade as ParsedTradeData);
  }

  return trades;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const PDFParse = await getPdfParse();
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const trades = parseTextToTrades(textResult.text);

    return NextResponse.json({ trades });
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse PDF' },
      { status: 500 }
    );
  }
}
