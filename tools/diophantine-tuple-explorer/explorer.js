const tupleInput = document.getElementById('tuple-input');
const tupleStatus = document.getElementById('tuple-status');
const pairResults = document.getElementById('pair-results');
const searchStatus = document.getElementById('search-status');
const extensionResults = document.getElementById('extension-results');
const searchButton = document.getElementById('search-button');
const stopButton = document.getElementById('stop-button');
const candidateInput = document.getElementById('candidate-input');
const candidateStatus = document.getElementById('candidate-status');
const candidateResults = document.getElementById('candidate-results');
let activeSearch = 0;

const abs = n => n < 0n ? -n : n;
function gcd(a, b) {
  a = abs(a); b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
function rational(n, d = 1n) {
  if (d === 0n) throw new Error('A denominator cannot be zero.');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
const show = r => r.d === 1n ? String(r.n) : `${r.n}/${r.d}`;
function parseRational(token) {
  if (!/^[+-]?\d+(?:\/[+-]?\d+)?$/.test(token) || token.length > 100) throw new Error(`Invalid rational number: ${token}`);
  const [n, d = '1'] = token.split('/');
  const value = rational(BigInt(n), BigInt(d));
  if (value.n === 0n) throw new Error('Tuple members and extensions must be nonzero.');
  return value;
}
function parseTuple() {
  const tokens = tupleInput.value.trim().split(/[\s,;]+/).filter(Boolean);
  if (tokens.length < 2) throw new Error('Enter at least two numbers.');
  if (tokens.length > 20) throw new Error('Use at most 20 numbers.');
  const values = tokens.map(parseRational);
  const keys = values.map(show);
  if (new Set(keys).size !== keys.length) throw new Error('Tuple members must be distinct.');
  return values;
}
function integerSqrt(n) {
  if (n < 0n) return null;
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  while (true) {
    const next = (x + n / x) >> 1n;
    if (next >= x) return x;
    x = next;
  }
}
function squareRoot(r) {
  if (r.n < 0n) return null;
  const a = integerSqrt(r.n), b = integerSqrt(r.d);
  return a * a === r.n && b * b === r.d ? rational(a, b) : null;
}
function pairValue(a, b) { return rational(a.n * b.n + a.d * b.d, a.d * b.d); }
function setStatus(element, text, kind = '') {
  element.textContent = text;
  element.className = `explorer-status ${kind}`;
}
function clearSearch() {
  activeSearch++;
  stopButton.hidden = true;
  searchButton.disabled = false;
  extensionResults.replaceChildren();
  extensionResults.hidden = true;
  setStatus(searchStatus, '');
}
function inspectTuple() {
  pairResults.replaceChildren();
  pairResults.hidden = true;
  let values;
  try { values = parseTuple(); }
  catch (error) { setStatus(tupleStatus, error.message, 'bad'); return null; }
  let valid = true;
  for (let i = 0; i < values.length; i++) for (let j = i + 1; j < values.length; j++) {
    const product = pairValue(values[i], values[j]);
    const root = squareRoot(product);
    if (root === null) valid = false;
    const row = document.createElement('div');
    row.className = `pair-row${root === null ? ' fail' : ''}`;
    const equation = document.createElement('span');
    equation.textContent = `${show(values[i])} × ${show(values[j])} + 1 = ${show(product)}`;
    const result = document.createElement('strong');
    result.textContent = root === null ? 'not a square' : `square: (${show(root)})²`;
    row.append(equation, result);
    pairResults.append(row);
  }
  pairResults.hidden = false;
  setStatus(tupleStatus, valid ? `Valid rational Diophantine ${values.length}-tuple.` : 'This tuple fails the pairwise square condition.', valid ? 'good' : 'bad');
  return valid ? values : null;
}

function clearCandidate() {
  candidateResults.replaceChildren();
  candidateResults.hidden = true;
  setStatus(candidateStatus, '');
}
tupleInput.addEventListener('input', () => { clearSearch(); clearCandidate(); pairResults.hidden = true; setStatus(tupleStatus, ''); });
candidateInput.addEventListener('input', clearCandidate);
document.getElementById('check-button').addEventListener('click', inspectTuple);
document.getElementById('example-button').addEventListener('click', () => { tupleInput.value = '1, 3, 8'; clearSearch(); clearCandidate(); inspectTuple(); });
stopButton.addEventListener('click', () => { activeSearch++; stopButton.hidden = true; searchButton.disabled = false; setStatus(searchStatus, 'Search stopped.'); });

document.getElementById('candidate-button').addEventListener('click', () => {
  clearCandidate();
  const values = inspectTuple();
  if (!values) return;
  let candidate;
  try { candidate = parseRational(candidateInput.value.trim()); }
  catch (error) { setStatus(candidateStatus, error.message, 'bad'); return; }
  if (values.some(value => show(value) === show(candidate))) {
    setStatus(candidateStatus, 'That number is already in the tuple.', 'bad');
    return;
  }
  let valid = true;
  for (const value of values) {
    const product = pairValue(value, candidate);
    const root = squareRoot(product);
    if (root === null) valid = false;
    const row = document.createElement('div');
    row.className = `pair-row${root === null ? ' fail' : ''}`;
    const equation = document.createElement('span');
    equation.textContent = `${show(value)} × ${show(candidate)} + 1 = ${show(product)}`;
    const result = document.createElement('strong');
    result.textContent = root === null ? 'not a square' : `square: (${show(root)})²`;
    row.append(equation, result);
    candidateResults.append(row);
  }
  candidateResults.hidden = false;
  setStatus(candidateStatus, valid ? `${show(candidate)} extends the tuple.` : `${show(candidate)} does not extend the tuple.`, valid ? 'good' : 'bad');
});

searchButton.addEventListener('click', () => {
  clearSearch();
  const values = inspectTuple();
  if (!values) return;
  const numeratorInput = document.getElementById('numerator-bound');
  const denominatorInput = document.getElementById('denominator-bound');
  if (!numeratorInput.reportValidity() || !denominatorInput.reportValidity()) return;
  const maxNumerator = Number(numeratorInput.value), maxDenominator = Number(denominatorInput.value);
  if (!Number.isInteger(maxNumerator) || !Number.isInteger(maxDenominator) || maxNumerator < 1 || maxNumerator > 500 || maxDenominator < 1 || maxDenominator > 50) {
    setStatus(searchStatus, 'Choose whole-number bounds within the displayed limits.', 'bad');
    return;
  }
  const existing = new Set(values.map(show));
  const token = ++activeSearch;
  let q = 1, p = -maxNumerator, checked = 0, found = 0;
  stopButton.hidden = false;
  searchButton.disabled = true;
  extensionResults.hidden = false;
  function step() {
    if (token !== activeSearch) return;
    let batch = 0;
    while (q <= maxDenominator && batch++ < 300) {
      if (p !== 0 && gcd(BigInt(p), BigInt(q)) === 1n) {
        const candidate = rational(BigInt(p), BigInt(q));
        if (!existing.has(show(candidate))) {
          checked++;
          if (values.every(value => squareRoot(pairValue(value, candidate)) !== null)) {
            found++;
            const chip = document.createElement('span');
            chip.className = 'extension-result';
            chip.textContent = show(candidate);
            extensionResults.append(chip);
          }
        }
      }
      p++;
      if (p > maxNumerator) { p = -maxNumerator; q++; }
    }
    if (q <= maxDenominator) {
      setStatus(searchStatus, `Searching denominator ${q}/${maxDenominator} · ${found} found…`);
      setTimeout(step, 0);
    } else {
      stopButton.hidden = true;
      searchButton.disabled = false;
      setStatus(searchStatus, `${found} extension${found === 1 ? '' : 's'} found among ${checked} distinct candidates.`, found ? 'good' : '');
    }
  }
  step();
});
