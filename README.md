# Bitcoin four-hour forecast

`main.ts` uses only Node.js standard-library modules. Run with Node 22's TypeScript stripping support (no installation or build step):

```sh
node --experimental-strip-types main.ts
```

It reads regular `*.in` files in filename order from `MAKEFUN_INPUT_DIR` (default `/input/`) and writes matching `.out` files into `MAKEFUN_OUTPUT_DIR` (default `/output/`, created if needed). The forecast's case identifier is copied from the input JSON.

For the `btc-usdc` market, the prediction is **90% of the latest close + 10% of the mean of the latest 60 closes** (`0.9 * last_price + 0.1 * mean(last 60 prices)`). Backtesting on 138 simulated 12-checkpoint phases showed that the 0.1 mean weight had a better mean error and smaller downside than 0.2. This mildly smooths the checkpoint price; it does not guarantee an improvement over persistence on unseen cases.

Non-numeric and non-finite observations are ignored. If fewer than 60 valid closes exist, all are used; the latest valid close replaces an invalid checkpoint. An empty or entirely invalid history (or a missing BTC market) produces a deterministic fallback of `$1.00000` because no price level is available. Finite out-of-range observations remain in the blend; the final prediction is clamped to `[0.00001, 9999999.99999]` and rounded to five dollar decimals. Output prices are JSON numbers with exactly five decimal places.

There is no randomness, networking, or dependency installation. Files are processed one at a time, and forecasting scans backward only until 60 valid prices have been found.
