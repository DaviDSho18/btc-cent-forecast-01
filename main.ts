import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Market = {
  id?: string;
  prices?: unknown[];
};

type ForecastCase = {
  case: string;
  markets?: Market[];
};

// Documented 90/10 blend of the last price and recent mean.
const MEAN_WEIGHT = 0.1;
const WINDOW_SIZE = 60;
const MIN_PRICE = 0.00001;
const MAX_PRICE = 9_999_999.99999;
const EMPTY_PRICE = 1;

function isUsablePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function forecast(prices: unknown[]): number {
  let last: number | undefined;
  for (let i = prices.length - 1; i >= 0; i--) {
    const price = prices[i];
    if (isUsablePrice(price)) {
      last = price;
      break;
    }
  }
  if (last === undefined) return EMPTY_PRICE;

  // Keep the window chronological: invalid entries must not pull in older minutes.
  const recent = prices.slice(-WINDOW_SIZE).filter(isUsablePrice);
  // Normalize before summing to avoid overflow even for extreme finite inputs.
  const scale = recent.length > 0 ? Math.max(...recent) : last;
  const normalizedMean = recent.reduce((sum, price) => sum + price / scale, 0)
    / Math.max(1, recent.length);
  const mean = recent.length > 0 ? Math.min(1, normalizedMean) * scale : last;
  const guess = (1 - MEAN_WEIGHT) * last + MEAN_WEIGHT * mean;
  return Math.max(MIN_PRICE, Math.min(MAX_PRICE, guess));
}

function main(): void {
  const inputDir = process.env.MAKEFUN_INPUT_DIR ?? '/input/';
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output/';
  mkdirSync(outputDir, { recursive: true });

  const files = readdirSync(inputDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.in'))
    .map((entry) => entry.name)
    .sort();

  for (const filename of files) {
    const input: ForecastCase = JSON.parse(readFileSync(join(inputDir, filename), 'utf8'));
    if (typeof input.case !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(input.case)) {
      throw new Error(`Invalid case ID in ${filename}`);
    }

    const markets = Array.isArray(input.markets) ? input.markets : [];
    const market = markets.find((entry) => entry?.id === 'btc-usdc') ?? markets[0];
    const prices = Array.isArray(market?.prices) ? market.prices : [];
    const price = forecast(prices).toFixed(5);
    // Emit a JSON number (not a string), preserving five decimal places on disk.
    const output = `{"forecasts":[{"case":${JSON.stringify(input.case)},"price":${price}}]}\n`;
    writeFileSync(join(outputDir, `${input.case}.out`), output, 'utf8');
  }
}

main();
