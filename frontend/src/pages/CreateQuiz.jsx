import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const emptyQuestion = () => ({ question: '', options: ['', '', '', ''], correctAnswer: 0 });

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
}

/* ── Document / YouTube extractor panel ───────────────── */
function ExtractPanel({ onExtracted }) {
  const [mode, setMode] = useState('file');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const doExtract = async (file) => {
    setError(''); setExtracted(null); setExtracting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/extract-text', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setExtracted(data); onExtracted(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Extraction failed');
    } finally { setExtracting(false); }
  };

  const doExtractYouTube = async () => {
    if (!youtubeUrl.trim()) return setError('Paste a YouTube URL');
    setError(''); setExtracted(null); setExtracting(true);
    try {
      const { data } = await api.post('/extract-text', { youtubeUrl });
      setExtracted(data); onExtracted(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not fetch transcript');
    } finally { setExtracting(false); }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) doExtract(f); };
  const handleFileChange = (e) => { const f = e.target.files[0]; if (f) doExtract(f); e.target.value = ''; };

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2">
        {[{ id: 'file', label: '📄 Upload File' }, { id: 'youtube', label: '▶️ YouTube' }].map((m) => (
          <button key={m.id} type="button"
            onClick={() => { setMode(m.id); setError(''); setExtracted(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition ${
              mode === m.id ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white' : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-white'
            }`}
          >{m.label}</button>
        ))}
      </div>

      {mode === 'file' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragOver ? 'border-brand-purple bg-brand-purple/10 scale-[1.01]' : 'border-dark-border hover:border-brand-purple/50 hover:bg-brand-purple/5'
          }`}
        >
          <input ref={fileRef} type="file" accept=".pdf,.txt,.docx,.doc" className="hidden" onChange={handleFileChange} />
          {extracting ? (
            <div className="flex flex-col items-center gap-3">
              <Spinner />
              <p className="text-gray-400 text-sm font-body">Extracting & indexing for RAG...</p>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-3">📂</div>
              <p className="text-sm font-heading font-bold text-white">Drop a file or <span className="text-brand-purple">browse</span></p>
              <p className="text-xs text-gray-500 mt-1 font-body">PDF, TXT, DOCX · Max 15 MB</p>
            </>
          )}
        </div>
      )}

      {mode === 'youtube' && (
        <div className="flex gap-2">
          <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doExtractYouTube()}
            placeholder="https://www.youtube.com/watch?v=..."
            className="input flex-1"
          />
          <button type="button" onClick={doExtractYouTube} disabled={extracting} className="btn-primary shrink-0">
            {extracting ? <Spinner /> : 'Extract'}
          </button>
        </div>
      )}

      {error && <div className="badge-red py-3 px-4 rounded-xl text-sm w-full justify-start">⚠️ {error}</div>}

      {extracted && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-green-400 text-sm font-heading font-bold">✓ Text extracted</span>
            <span className="text-xs text-gray-500 ml-auto font-body">{extracted.source} · {extracted.charCount.toLocaleString()} chars</span>
          </div>
          {extracted.ragId && (
            <div className="mb-2">
              <span className="badge-purple">🧠 RAG ready · {extracted.chunkCount} chunks indexed</span>
            </div>
          )}
          <p className="text-xs text-gray-500 leading-relaxed font-body line-clamp-2">
            {extracted.text.slice(0, 250)}{extracted.text.length > 250 ? '…' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────── */
export default function CreateQuiz() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('manual');
  const [aiMode, setAiMode] = useState('topic');
  const [meta, setMeta] = useState({ title: '', description: '', timeLimit: 0 });
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [extractedData, setExtractedData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const addQuestion = () => setQuestions((qs) => [...qs, emptyQuestion()]);
  const removeQuestion = (i) => setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  const updateQ = (i, field, val) => setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, [field]: val } : q)));
  const updateOption = (qi, oi, val) => setQuestions((qs) => qs.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? val : o)) } : q));

  const generateAI = async () => {
    setAiError('');
    if (aiMode === 'topic' && !aiTopic.trim()) return setAiError('Enter a topic first');
    if (aiMode === 'document' && !extractedData) return setAiError('Extract a document or YouTube video first');
    setAiLoading(true);
    try {
      let payload;
      if (aiMode === 'document') {
        payload = { ragId: extractedData.ragId || undefined, text: extractedData.ragId ? undefined : extractedData.text, source: extractedData.source, topic: aiTopic || undefined, count: aiCount, difficulty: aiDifficulty };
      } else {
        payload = { topic: aiTopic, count: aiCount, difficulty: aiDifficulty };
      }
      const { data } = await api.post('/generate-questions', payload);
      setQuestions(data.questions);
      setTab('manual');
    } catch (err) {
      setAiError(err.response?.data?.error || 'AI generation failed');
    } finally { setAiLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!meta.title.trim()) return setError('Quiz title is required');
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) return setError(`Question ${i + 1} text is empty`);
      if (questions[i].options.some((o) => !o.trim())) return setError(`Fill all 4 options in question ${i + 1}`);
    }
    setLoading(true);
    try {
      const { data } = await api.post('/create-quiz', { ...meta, questions });
      setCreated(data.quizCode);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create quiz');
    } finally { setLoading(false); }
  };

  const copyCode = () => { navigator.clipboard.writeText(created); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1800); };

  /* ── Success screen ── */
  if (created) {
    return (
      <div className="bg-mesh min-h-[90vh] flex items-center justify-center px-4">
        <div className="blob w-64 h-64 bg-brand-yellow top-0 right-0 opacity-10" />
        <div className="blob w-64 h-64 bg-brand-purple bottom-0 left-0" />
        <div className="relative w-full max-w-sm animate-bounce-in text-center">
          <div className="text-6xl mb-4 inline-block animate-float">🎉</div>
          <h2 className="font-heading font-black text-3xl text-white mb-2">Quiz is Live!</h2>
          <p className="text-gray-400 mb-6 font-body text-sm">Share this code with your squad:</p>
          <div className="card-glow rounded-3xl py-8 px-6 mb-6">
            <div className="font-heading font-black text-5xl tracking-[0.3em] text-gradient animate-pulse-glow">
              {created}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={copyCode} className="btn-secondary w-full py-3">
              {codeCopied ? '✓ Copied to clipboard!' : '📋 Copy Code'}
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-primary w-full py-3">
              📊 Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-mesh min-h-screen">
      <div className="blob w-64 h-64 bg-brand-purple top-0 right-0" />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="font-heading font-black text-4xl text-white">Create a Quiz ✨</h1>
          <p className="text-gray-400 text-sm mt-2 font-body">Manual, AI topic, or upload your notes — your call.</p>
        </div>

        {/* Quiz meta */}
        <div className="card-glow p-6 rounded-2xl mb-5">
          <h2 className="text-xs font-heading font-black text-gray-400 mb-4 uppercase tracking-widest">📋 Quiz Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-heading font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Title *</label>
              <input value={meta.title} onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))} placeholder="e.g. Python Basics, History Ch.5" className="input" />
            </div>
            <div>
              <label className="block text-xs font-heading font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Description (optional)</label>
              <textarea value={meta.description} onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))} rows={2} placeholder="What's this quiz about?" className="input resize-none" />
            </div>
            <div>
              <label className="block text-xs font-heading font-bold text-gray-400 mb-1.5 uppercase tracking-wider">⏱ Time Limit (minutes · 0 = unlimited)</label>
              <input type="number" min={0} max={180} value={meta.timeLimit} onChange={(e) => setMeta((m) => ({ ...m, timeLimit: +e.target.value }))} className="input w-28" />
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-5">
          {[{ id: 'manual', label: '✍️ Manual' }, { id: 'ai', label: '🤖 AI Generate' }].map((t) => (
            <button key={t.id} type="button"
              onClick={() => { setTab(t.id); setError(''); setAiError(''); }}
              className={`px-6 py-2.5 rounded-xl font-heading font-bold text-sm transition-all ${
                tab === t.id ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg shadow-brand-purple/30' : 'bg-dark-card border border-dark-border text-gray-400 hover:text-white'
              }`}
            >{t.label}</button>
          ))}
        </div>

        {/* AI panel */}
        {tab === 'ai' && (
          <div className="card-glow p-6 rounded-2xl mb-5 space-y-5">
            <h2 className="text-xs font-heading font-black text-gray-400 uppercase tracking-widest">🤖 AI Question Generator</h2>

            {/* Source mode */}
            <div className="flex gap-2">
              {[{ id: 'topic', label: '💡 By Topic' }, { id: 'document', label: '📄 From Document / YouTube' }].map((m) => (
                <button key={m.id} type="button" onClick={() => { setAiMode(m.id); setAiError(''); }}
                  className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition ${
                    aiMode === m.id ? 'bg-brand-purple/30 text-purple-200 border border-brand-purple/50' : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-white'
                  }`}
                >{m.label}</button>
              ))}
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-heading font-bold text-gray-400 mb-2 uppercase tracking-wider">Difficulty</label>
              <div className="flex gap-2">
                {[
                  { id: 'easy',   label: '🟢 Easy',   hint: '15 chunks', color: 'from-green-500 to-emerald-600' },
                  { id: 'medium', label: '🟡 Medium', hint: '20 chunks', color: 'from-yellow-500 to-orange-500' },
                  { id: 'hard',   label: '🔴 Hard',   hint: '25 chunks', color: 'from-red-500 to-pink-600' },
                ].map((d) => (
                  <button key={d.id} type="button" onClick={() => setAiDifficulty(d.id)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-heading font-bold transition flex flex-col items-center gap-0.5 border ${
                      aiDifficulty === d.id
                        ? `bg-gradient-to-r ${d.color} text-white border-transparent shadow-md`
                        : 'bg-dark-bg border-dark-border text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>{d.label}</span>
                    {aiMode === 'document' && <span className={`text-[10px] ${aiDifficulty === d.id ? 'text-white/70' : 'text-gray-600'}`}>{d.hint}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic input */}
            {aiMode === 'topic' && (
              <div className="flex gap-3 flex-wrap">
                <input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateAI()}
                  placeholder="e.g. World War II, Python loops, Black Holes"
                  className="input flex-1 min-w-0"
                />
                <select value={aiCount} onChange={(e) => setAiCount(+e.target.value)} className="input w-36 shrink-0">
                  {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n} questions</option>)}
                </select>
              </div>
            )}

            {/* Document mode */}
            {aiMode === 'document' && (
              <>
                <ExtractPanel onExtracted={(data) => { setExtractedData(data); setAiError(''); }} />
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 font-body shrink-0">Questions</label>
                    <select value={aiCount} onChange={(e) => setAiCount(+e.target.value)} className="input w-32">
                      {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n} questions</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 font-body shrink-0">Focus (optional)</label>
                    <input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="e.g. chapter 3, neural nets" className="input w-44" />
                  </div>
                </div>
              </>
            )}

            <button type="button" onClick={generateAI} disabled={aiLoading} className="btn-primary w-full py-3 text-sm">
              {aiLoading ? <><Spinner /> Generating questions...</> : '✨ Generate Questions'}
            </button>

            {aiError && <div className="badge-red py-3 px-4 rounded-xl text-sm w-full justify-start">⚠️ {aiError}</div>}
            <p className="text-xs text-gray-600 font-body">You'll review and edit questions before saving.</p>
          </div>
        )}

        {/* Manual editor */}
        {tab === 'manual' && (
          <form onSubmit={submit}>
            {questions.length > 0 && (
              <p className="text-xs text-gray-500 mb-4 font-body">
                {questions.length} question{questions.length !== 1 ? 's' : ''} ready
                {extractedData ? ` · from ${extractedData.source}` : ''}
              </p>
            )}

            <div className="space-y-4 mb-5">
              {questions.map((q, qi) => (
                <div key={qi} className="card-glow p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="badge-purple">Q{qi + 1}</span>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(qi)} className="text-xs text-gray-600 hover:text-red-400 transition font-body">Remove</button>
                    )}
                  </div>
                  <textarea
                    value={q.question}
                    onChange={(e) => updateQ(qi, 'question', e.target.value)}
                    placeholder="Type your question here..."
                    rows={2}
                    className="input resize-none mb-4"
                  />
                  <div className="space-y-2.5">
                    {q.options.map((opt, oi) => (
                      <label key={oi} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                        q.correctAnswer === oi
                          ? 'border-brand-purple bg-brand-purple/15'
                          : 'border-dark-border hover:border-brand-purple/40 hover:bg-brand-purple/5'
                      }`}>
                        <input type="radio" name={`correct-${qi}`} checked={q.correctAnswer === oi} onChange={() => updateQ(qi, 'correctAnswer', oi)} className="accent-brand-purple" />
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-heading font-bold shrink-0 ${
                          q.correctAnswer === oi ? 'bg-brand-purple text-white' : 'bg-dark-bg text-gray-500 border border-dark-border'
                        }`}>{String.fromCharCode(65 + oi)}</span>
                        <input
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          className="flex-1 bg-transparent border-none outline-none text-sm font-body text-gray-200"
                        />
                        {q.correctAnswer === oi && <span className="text-xs text-brand-purple font-heading font-bold shrink-0">✓ Correct</span>}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addQuestion}
              className="w-full border-2 border-dashed border-dark-border hover:border-brand-purple/50 py-4 rounded-2xl text-sm text-gray-500 hover:text-brand-purple transition mb-5 font-heading font-bold"
            >
              + Add Question
            </button>

            {error && <div className="badge-red py-3 px-4 rounded-xl text-sm w-full justify-start mb-4">⚠️ {error}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
              {loading ? <><Spinner /> Creating quiz...</> : `🚀 Create Quiz — ${questions.length} Question${questions.length !== 1 ? 's' : ''}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
