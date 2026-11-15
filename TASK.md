Build `main.ts` (Node 22, TypeScript, standard library only) at the repository root for the
make.fun bounty "btc-cent-forecast-01".

IMPORTANT — work in explicit narrated steps. Before each step, write one short paragraph of plain
text saying what you are about to do and why. Do not batch everything into one turn: produce a
separate text message for each of these steps, in order:

Step 1 — Plan: state the forecast approach in one paragraph.
Step 2 — First draft: write main.ts implementing the approach.
Step 3 — Run and inspect: run it on the kit's practice inputs and read the output.
Step 4 — Revise: fix anything wrong and adjust the blend weight (see below).
Step 5 — Verify: run it twice and confirm the two runs are byte-identical.
Step 6 — Document: write README.md and give a final summary.

## The competition
Forecast Bitcoin's US-dollar price 240 minutes (4 hours) after a checkpoint. Score = mean absolute
error in cents; lower is better. A prize needs a score strictly below the house persistence
baseline (which guesses the checkpoint's own close).

## Input
Run once per case. Read every `*.in` file in the input directory (`$MAKEFUN_INPUT_DIR`, else
`/input/`), in name order. Each is UTF-8 JSON, keys sorted, no whitespace, one object:
  {"schema":"makefun/btc-cent-case/v1","competition":"btc-cent-forecast-01","case":"<id>",
   "at":"<ISO minute>","horizon_minutes":240,
   "markets":[{"id":"btc-usdc","name":"...","start":"<ISO minute>",
               "prices":[<4320 closes, one a minute, last is the close at the checkpoint>]}]}

## Output
Write `<id>.out` to the output directory (`$MAKEFUN_OUTPUT_DIR`, else `/output/`): a regular file
of at most 1 MiB of UTF-8 JSON, exactly one key:
  {"forecasts":[{"case":"<the case id>","price":<number>}]}
`price` must be a finite number > 0 and < 10000000, kept on 5 decimals of a dollar.

## The forecast
Absolute error is minimised by the conditional median of the future price. Bitcoin's 4-hour returns
have a near-zero median, so the checkpoint close is already near-optimal. Improve on it by a small
amount: blend the checkpoint close with the mean of the last 60 one-minute closes, weighting the
mean at 0.1:
    guess = 0.9 * last_price + 0.1 * (mean of the last 60 prices)
This mildly denoises the checkpoint tick without lagging the level. Clamp to the bounds (> 0,
< 10000000) and round to 5 decimals.

## Requirements
- Node 22, TypeScript, standard library only. No network, nothing installed.
- Deterministic: two runs on the same case must write byte-identical output.
- At most 8 seconds, 1 CPU, 1024 MB per run.
- Read every `*.in`; write one `.out` per case. Handle empty prices, non-finite values, and fewer
  than 60 prices (use all available).

To run it: mkdir -p /tmp/btc-in /tmp/btc-out && cp ~/makefun/kits/btc-kit/btc-cent-forecast-01-kit/input/*.in /tmp/btc-in/ && MAKEFUN_INPUT_DIR=/tmp/btc-in MAKEFUN_OUTPUT_DIR=/tmp/btc-out node --experimental-strip-types main.ts
