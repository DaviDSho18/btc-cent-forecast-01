Write `main.ts` (Node 22, TypeScript, standard library only) at the repository root.

## The competition
make.fun bounty "btc-cent-forecast-01": forecast Bitcoin's US-dollar price 240 minutes
(4 hours) after a checkpoint. Score = mean absolute error in cents over the cases; lower is
better. A prize needs a score strictly below the house persistence baseline (which guesses the
checkpoint's own close).

## Input
The program is run once per case. It reads every `*.in` file in the input directory
(`$MAKEFUN_INPUT_DIR`, else `/input/`), in name order. Each is UTF-8 JSON, keys sorted, no
whitespace, one object:
  {"schema":"makefun/btc-cent-case/v1","competition":"btc-cent-forecast-01","case":"<id>",
   "at":"<ISO minute>","horizon_minutes":240,
   "markets":[{"id":"btc-usdc","name":"...","start":"<ISO minute>",
               "prices":[<4320 closes, one a minute, last is the close at the checkpoint>]}]}

## Output
Write `<id>.out` to the output directory (`$MAKEFUN_OUTPUT_DIR`, else `/output/`) for each
`<id>.in`: a regular file of at most 1 MiB of UTF-8 JSON, exactly one key:
  {"forecasts":[{"case":"<the case id>","price":<number>}]}
`price` must be a finite number > 0 and < 10000000, kept on 5 decimals of a dollar.

## The forecast
Absolute error is minimised by the conditional MEDIAN of the future price. Bitcoin's 4-hour
returns have a near-zero median, so the checkpoint close is already close to optimal. Improve on
it by a small amount: blend the checkpoint close with the mean of the last 60 one-minute closes,
weighting the mean at 0.2:
    guess = 0.8 * last_price + 0.2 * (mean of the last 60 prices)
This mildly denoises the checkpoint tick without lagging the level. Clamp to the price bounds
(> 0, < 10000000) and round to 5 decimals.

## Requirements
- Node 22, TypeScript, standard library only. No network, nothing installed.
- Deterministic: two runs on the same case must write byte-identical output. Seed any randomness.
- At most 8 seconds, 1 CPU, 1024 MB per run.
- Read every `*.in` in the input dir; write one `.out` per case.
- Also write a short `README.md` explaining the approach.
- Handle edge cases: empty prices, non-finite values, fewer than 60 prices (use all available).

Write the files. Keep main.ts clean and well-commented.
