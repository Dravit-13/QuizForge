const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const EMBED_MODEL = 'nvidia/nv-embed-v1';
const STATE_FILE = path.join(__dirname, '../../keys-state.json');

// Keys: NVIDIA_API_KEYS=key1,key2,...  or fall back to NVIDIA_API_KEY
// Handles multi-line .env values by stripping embedded newlines before splitting
function loadKeys() {
  const multi = process.env.NVIDIA_API_KEYS;
  if (multi) {
    return multi
      .replace(/\r?\n/g, ',')   // newlines → commas (handles accidental line breaks in .env)
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
  }
  const single = process.env.NVIDIA_API_KEY;
  if (single) return [single.trim()];
  return [];
}

function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return {
      currentIndex: parsed.currentIndex ?? 0,
      deadKeys: new Set(parsed.deadKeys ?? []),
    };
  } catch {
    return { currentIndex: 0, deadKeys: new Set() };
  }
}

function saveState(state) {
  try {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ currentIndex: state.currentIndex, deadKeys: [...state.deadKeys] }),
      'utf8'
    );
  } catch { /* non-fatal */ }
}

const KEYS = loadKeys();
const state = loadState();

// 401 = invalid/expired key, 402 = quota exhausted — never worth retrying
function isPermanentlyDead(status) {
  return status === 401 || status === 402;
}

/**
 * Run fn(apiKey) with automatic key rotation.
 * - Permanently dead keys (401/402) are recorded to keys-state.json and skipped forever.
 * - Transient errors (429, 5xx) cause rotation to the next key for this request only.
 */
async function withKeyRotation(fn) {
  const n = KEYS.length;
  if (n === 0) throw new Error('No NVIDIA API keys configured. Set NVIDIA_API_KEYS or NVIDIA_API_KEY in .env');

  const liveKeys = KEYS.map((_, i) => i).filter((i) => !state.deadKeys.has(i));
  if (liveKeys.length === 0) throw new Error('All NVIDIA API keys are exhausted or invalid.');

  // Start from the key after the last successful one
  const startPos = liveKeys.indexOf(state.currentIndex);
  const orderedLive = startPos >= 0
    ? [...liveKeys.slice(startPos), ...liveKeys.slice(0, startPos)]
    : liveKeys;

  for (const idx of orderedLive) {
    try {
      const result = await fn(KEYS[idx]);
      state.currentIndex = idx;
      saveState(state);
      return result;
    } catch (err) {
      const status = err?.status ?? err?.response?.status;
      if (isPermanentlyDead(status)) {
        console.warn(`[NVIDIA] Key #${idx + 1} permanently dead (HTTP ${status}), blacklisting.`);
        state.deadKeys.add(idx);
        saveState(state);
      } else {
        console.warn(`[NVIDIA] Key #${idx + 1} failed (${err.message}), trying next.`);
      }
    }
  }

  throw new Error('All NVIDIA API keys failed. Check your keys or try again later.');
}

function getClient(apiKey) {
  return new OpenAI({ apiKey, baseURL: BASE_URL });
}

async function embedBatch(texts, inputType = 'passage') {
  return withKeyRotation(async (apiKey) => {
    const res = await fetch(`${BASE_URL}/embeddings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: texts,
        model: EMBED_MODEL,
        encoding_format: 'float',
        input_type: inputType,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`NVIDIA Embeddings error ${res.status}: ${text}`);
      err.status = res.status;
      throw err;
    }

    const json = await res.json();
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  });
}

async function embedOne(text, inputType = 'query') {
  const [vec] = await embedBatch([text], inputType);
  return vec;
}

module.exports = { withKeyRotation, getClient, embedBatch, embedOne };
