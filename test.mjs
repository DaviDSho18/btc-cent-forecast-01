import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const meanWeight = 0.08;
const root = mkdtempSync(join(tmpdir(), 'btc-forecast-check-'));
const inputDir = join(root, 'input');
mkdirSync(inputDir);
const cases = [
  ['ramp', Array.from({ length: 60 }, (_, i) => 100 + i), (1 - meanWeight) * 159 + meanWeight * 129.5],
  ['constant', Array(4320).fill(65000), 65000],
  ['short', [100, 110, 120], (1 - meanWeight) * 120 + meanWeight * 110],
  ['empty', [], 1],
  ['invalid', [null, 'bad', -1, 0], 1],
  ['mixed', [100, null, 110, 'bad', 120], (1 - meanWeight) * 120 + meanWeight * 110],
  ['tiny', [1e-20], 0.00001],
  ['large', [1e20], 9999999.99999],
  ['huge', Array(60).fill(Number.MAX_VALUE), 9999999.99999],
  ['chronological-window', [500, ...Array(59).fill(null), 100], 100],
  ['old-valid-fallback', [250, ...Array(60).fill(null)], 250],
];
for (const [id, prices] of cases) {
  writeFileSync(join(inputDir, `${id}.in`), JSON.stringify({
    schema: 'makefun/btc-cent-case/v1', competition: 'btc-cent-forecast-01',
    case: id, at: '2026-01-04T00:00:00Z', horizon_minutes: 240,
    markets: [{ id: 'btc-usdc', start: '2026-01-01T00:01:00Z', prices }],
  }));
}
// JSON number overflow parses to infinities; literal NaN/Infinity is not valid JSON.
writeFileSync(join(inputDir, 'nonfinite.in'), '{"case":"nonfinite","markets":[{"id":"btc-usdc","prices":[100,1e400,-1e400,120]}]}');
writeFileSync(join(inputDir, 'ignored.txt'), 'not an input');
const expected = new Map(cases.map(([id, , price]) => [id, Number(price.toFixed(5))]));
expected.set('nonfinite', Number(((1 - meanWeight) * 120 + meanWeight * 110).toFixed(5)));

function run(outputDir) {
  const start = performance.now();
  const result = spawnSync(process.execPath, ['--experimental-strip-types', fileURLToPath(new URL('./main.ts', import.meta.url))], {
    env: { ...process.env, MAKEFUN_INPUT_DIR: inputDir, MAKEFUN_OUTPUT_DIR: outputDir },
    encoding: 'utf8', timeout: 8000,
  });
  if (result.stderr) process.stderr.write(result.stderr);
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout);
  const files = readdirSync(outputDir).sort();
  assert.equal(files.length, expected.size);
  for (const filename of files) {
    const path = join(outputDir, filename);
    assert.ok(statSync(path).isFile());
    const bytes = readFileSync(path);
    assert.ok(bytes.length <= 1024 * 1024);
    const text = bytes.toString('utf8');
    const parsed = JSON.parse(text);
    assert.deepEqual(Object.keys(parsed), ['forecasts']);
    assert.equal(parsed.forecasts.length, 1);
    const forecast = parsed.forecasts[0];
    assert.deepEqual(Object.keys(forecast), ['case', 'price']);
    assert.equal(filename, `${forecast.case}.out`);
    assert.ok(Number.isFinite(forecast.price) && forecast.price > 0 && forecast.price < 10000000);
    assert.match(text, /"price":\d+\.\d{5}/);
    assert.equal(forecast.price, expected.get(forecast.case));
    console.log(`${filename}: ${text.trim()}`);
  }
  console.log(`CLI run passed in ${(performance.now() - start).toFixed(1)} ms`);
  return files;
}

const first = join(root, 'first');
const second = join(root, 'second');
const files = run(first);
if (process.argv.includes('--twice')) {
  assert.deepEqual(run(second), files);
  const hash = createHash('sha256');
  for (const filename of files) {
    const bytes = readFileSync(join(first, filename));
    assert.deepEqual(readFileSync(join(second, filename)), bytes, `${filename} differs between runs`);
    hash.update(filename).update('\0').update(bytes);
  }
  console.log(`PASS: ${files.length} outputs are byte-identical across two runs. SHA-256: ${hash.digest('hex')}`);
}
console.log(`Synthetic fixtures and outputs: ${root}`);
