// Simple retry with exponential backoff and jitter

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redactKey(key) {
  if (!key) return '';
  const tail = key.slice(-4);
  return `***${tail}`;
}

async function withRetry(fn, {
  retries = 5,
  initialDelayMs = 500,
  factor = 2,
  jitter = true,
  onRetry = () => {},
} = {}) {
  let attempt = 0;
  let delay = initialDelayMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn(attempt);
    } catch (err) {
      attempt += 1;
      const status = err && (err.status || err.code);
      const shouldRetry = (status === 429) || (status >= 500) || (status === 'ECONNRESET') || (status === 'ETIMEDOUT') || (status === 'ENOTFOUND');
      if (!shouldRetry || attempt > retries) {
        throw err;
      }
      let wait = delay;
      if (jitter) {
        const rand = Math.random() * delay * 0.3; // +/- 30%
        wait = delay - rand / 2 + rand; // randomize around delay
      }
      onRetry({ attempt, delay: Math.round(wait), status });
      await sleep(wait);
      delay *= factor;
    }
  }
}

module.exports = { withRetry, sleep, redactKey };
