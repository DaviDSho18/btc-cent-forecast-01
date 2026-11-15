import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface ForecastCase {
  case: string;
  markets: Array<{ id: string; prices: unknown }>;
}

const MIN_PRICE = 0.00001;
const MAX_PRICE = 9_999_999.99999;
const EMPTY_HISTORY_PRICE = 1;
const WINDOW_SIZE = 60;

function forecast(prices: unknown): number {
  // Invalid observations do not count toward the 60-price window.
  const recent: number[] = [];
  if (Array.isArray(prices)) {
    for (let i = prices.length - 1; i >= 0 && recent.length < WINDOW_SIZE; i--) {
      const price: unknown = prices[i];
      if (typeof price === "number" && Number.isFinite(price)) {
        recent.push(price);
      }
    }
  }

  if (recent.length === 0) return EMPTY_HISTORY_PRICE;

  // Divide before summing to avoid overflowing a sum of large finite prices.
  const mean = recent.reduce((sum, price) => sum + price / recent.length, 0);
  const guess = 0.9 * recent[0] + 0.1 * mean;
  const bounded = Math.max(MIN_PRICE, Math.min(MAX_PRICE, guess));
  return Number(bounded.toFixed(5));
}

function main(): void {
  const inputDir = process.env.MAKEFUN_INPUT_DIR || "/input/";
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR || "/output/";
  mkdirSync(outputDir, { recursive: true });

  // Default string sorting is deterministic and independent of the locale.
  const filenames = readdirSync(inputDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".in"))
    .map((entry) => entry.name)
    .sort();

  for (const filename of filenames) {
    const input = JSON.parse(readFileSync(join(inputDir, filename), "utf8")) as ForecastCase;
    const market = input.markets.find((entry) => entry.id === "btc-usdc");
    const price = forecast(market?.prices);

    // Keep the input filename stem; the case identifier comes from the JSON.
    const outputPath = join(outputDir, `${filename.slice(0, -3)}.out`);
    // Embed a fixed-point numeric literal, not a quoted string, to retain five decimals.
    const output = `{"forecasts":[{"case":${JSON.stringify(input.case)},"price":${price.toFixed(5)}}]}\n`;
    writeFileSync(outputPath, output, "utf8");
  }
}

main();
