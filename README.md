# btc-cent-forecast-01

A deterministic, standard-library-only TypeScript CLI for Node.js 22. No dependencies, installation, or network access are required.

## Forecast

The first draft used the requested 90% checkpoint close / 10% recent-mean blend. The revision reduces the mean weight to **0.08**, bringing the forecast slightly closer to the persistence baseline:

```text
last = most recent finite, positive close
mean = mean of finite, positive closes within the last 60 chronological entries
forecast = 0.92 * last + 0.08 * mean
```

The weight adjustment is conservative and **not empirically tuned**. Neither a lower MAE than persistence nor prize eligibility has been established.

- With fewer than 60 entries, use all available entries.
- Ignore nonnumeric, non-finite, zero, and negative prices.
- Invalid entries do not extend the 60-minute averaging window.
- If the window has no usable prices, use the most recent usable older close for both components.
- If no usable close exists, use a deterministic fallback of **$1.00000**. There is no informed price estimate available in that case.
- Normalize the mean calculation to avoid overflow on extreme finite inputs.
- Clamp to **$0.00001–$9,999,999.99999**, then serialize the price as a JSON number with exactly five digits after the decimal point.

## Run

```sh
MAKEFUN_INPUT_DIR=/path/to/input \
MAKEFUN_OUTPUT_DIR=/path/to/output \
node --experimental-strip-types main.ts
```

Defaults are `/input/` and `/output/`. The output directory is created if needed. The CLI reads all regular `*.in` files in filename order and selects the `btc-usdc` market, falling back to the first market if necessary.

For each case it writes `<case>.out` containing exactly one top-level key:

```json
{"forecasts":[{"case":"example","price":65000.00000}]}
```

Files use UTF-8 and end with a newline. Case IDs must start with an ASCII letter or digit and otherwise contain only letters, digits, dots, underscores, or hyphens, preventing directory traversal. Input JSON must be syntactically valid; literal `NaN` and `Infinity` are not JSON values. Overflowing JSON numbers that parse to infinity are ignored like other non-finite values.

### Kit practice inputs

```sh
mkdir -p /tmp/btc-in /tmp/btc-out
cp ~/makefun/kits/btc-kit/btc-cent-forecast-01-kit/input/*.in /tmp/btc-in/
MAKEFUN_INPUT_DIR=/tmp/btc-in \
MAKEFUN_OUTPUT_DIR=/tmp/btc-out \
node --experimental-strip-types main.ts
```

## Verification

A standalone standard-library test harness launches the actual CLI with synthetic inputs:

```sh
node test.mjs          # One run; validate and print every forecast
node test.mjs --twice  # Two runs; compare every output byte and print a SHA-256 digest
```

The 12 cases cover a 4,320-point constant series, a trend, short and empty histories, invalid and non-finite prices, mixed values, lower and upper bounds, extreme finite values, chronological-window handling, and fallback to an older usable close. The harness also checks output filenames, exact JSON keys, numeric bounds, five-decimal formatting, regular-file status, the 1 MiB size limit, and an eight-second timeout per invocation. Fixtures and outputs are retained in a new temporary directory, whose path is printed.

**Verification status:** execution of both the supplied practice command and the synthetic test commands was blocked by this session's permission controls. No practice output or runtime test results were obtained, and byte-identical behavior has not been confirmed by execution. `git diff --check` passed. Run the commands above in an authorized environment to complete verification.
