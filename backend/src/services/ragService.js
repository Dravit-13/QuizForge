/**
 * RAG Service — Retrieval-Augmented Generation pipeline
 *
 * Flow:
 *   indexDocument(text, ragId)
 *     └─ chunk text into overlapping segments
 *     └─ embed all chunks in batches (NVIDIA NV-Embed)
 *     └─ store { chunks, embeddings } in memory, keyed by ragId
 *
 *   retrieveChunks(ragId, query, k)
 *     └─ embed query as 'query' type
 *     └─ cosine similarity against all stored chunk embeddings
 *     └─ return top-k chunk texts
 *
 * Indexes auto-expire after TTL_MS (default 2 hours).
 */

const { embedBatch, embedOne } = require('./nvidiaClient');

const CHUNK_SIZE = 1200;   // target characters per chunk
const CHUNK_OVERLAP = 150; // overlap to preserve context at boundaries
const EMBED_BATCH = 16;    // chunks per NVIDIA API call
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// In-memory store: ragId -> { chunks: string[], embeddings: number[][], expiresAt: number }
const store = new Map();

// ── Cleanup expired entries every 30 minutes ─────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt < now) store.delete(id);
  }
}, 30 * 60 * 1000);

// ── Text chunking ─────────────────────────────────────────────────────────────

/**
 * Split text into overlapping chunks.
 * Splits on paragraph boundaries where possible; falls back to sentence boundaries.
 */
function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  // Normalise whitespace
  const normalised = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // Split into paragraphs first
  const paragraphs = normalised.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length <= size) {
      current = current ? current + '\n\n' + para : para;
    } else {
      // Current chunk is full — save it and start a new one with overlap
      if (current) chunks.push(current.trim());

      // If a single paragraph exceeds size, split it by sentences
      if (para.length > size) {
        const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
        let sentBuf = '';
        for (const s of sentences) {
          if ((sentBuf + ' ' + s).length <= size) {
            sentBuf = sentBuf ? sentBuf + ' ' + s : s;
          } else {
            if (sentBuf) chunks.push(sentBuf.trim());
            sentBuf = s;
          }
        }
        current = sentBuf;
      } else {
        // Carry overlap from previous chunk
        const overlapText = current.slice(-overlap);
        current = overlapText ? overlapText + '\n\n' + para : para;
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length >= 30); // drop tiny fragments
}

// ── Cosine similarity ─────────────────────────────────────────────────────────

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Chunk + embed a document and store under ragId.
 * Safe to call once — never re-embeds if ragId already exists.
 *
 * @param {string} text     Full extracted document text
 * @param {string} ragId    Unique identifier for this document session
 * @returns {Promise<{chunkCount: number}>}
 */
async function indexDocument(text, ragId) {
  if (store.has(ragId)) {
    const existing = store.get(ragId);
    return { chunkCount: existing.chunks.length };
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) throw new Error('Document produced no usable chunks.');

  // Embed in batches to respect API rate limits
  const embeddings = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const vecs = await embedBatch(batch, 'passage');
    embeddings.push(...vecs);
  }

  store.set(ragId, {
    chunks,
    embeddings,
    expiresAt: Date.now() + TTL_MS,
  });

  return { chunkCount: chunks.length };
}

/**
 * Retrieve the k most relevant chunks for a query.
 *
 * @param {string}   ragId
 * @param {string}   query   Topic or question used to guide retrieval
 * @param {number}   k       Number of chunks to return (default 5)
 * @returns {Promise<string[]>}  Ordered array of relevant chunk texts
 */
async function retrieveChunks(ragId, query, k = 5) {
  const entry = store.get(ragId);
  if (!entry) throw new Error('RAG index not found or expired. Please re-upload the document.');

  // Refresh TTL on access
  entry.expiresAt = Date.now() + TTL_MS;

  const queryVec = await embedOne(query, 'query');

  const scored = entry.chunks.map((chunk, i) => ({
    chunk,
    score: cosineSim(queryVec, entry.embeddings[i]),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.chunk);
}

/**
 * Remove an index from memory (e.g. after quiz is created).
 * @param {string} ragId
 */
function clearIndex(ragId) {
  store.delete(ragId);
}

/**
 * Check whether an index exists and is still valid.
 * @param {string} ragId
 */
function hasIndex(ragId) {
  const entry = store.get(ragId);
  return entry ? entry.expiresAt > Date.now() : false;
}

module.exports = { indexDocument, retrieveChunks, clearIndex, hasIndex, chunkText };
