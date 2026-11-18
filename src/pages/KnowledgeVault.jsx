import { useState } from 'react';
import {
  createFlashcard,
  createLearningPath,
  generateFlashcardsFromNotes,
  getVaultSummary,
  loadFlashcards,
  loadLearningPaths,
  reviewFlashcard,
} from '../services/knowledgeVaultService';

export default function KnowledgeVault({ onAdjustGold, showToast }) {
  const [tab, setTab] = useState('review'); // 'review' | 'paths' | 'create'
  const [summary, setSummary] = useState(() => getVaultSummary());
  const [paths, setPaths] = useState(() => loadLearningPaths());
  const [allCards, setAllCards] = useState(() => loadFlashcards());
  const [flipped, setFlipped] = useState(false);

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [deck, setDeck] = useState('Computer Science');
  const [notesText, setNotesText] = useState('');
  const [pathTitle, setPathTitle] = useState('');
  const [pathSubject, setPathSubject] = useState('Computer Science');

  const refresh = () => {
    setSummary(getVaultSummary());
    setPaths(loadLearningPaths());
    setAllCards(loadFlashcards());
  };

  const currentDue = summary.dueCards[0] || null;

  const handleGrade = (grade) => {
    if (!currentDue) return;
    reviewFlashcard(currentDue.id, grade);
    setFlipped(false);
    refresh();
    if (grade >= 3) {
      onAdjustGold?.(15, `SM-2 Flashcard Recall`);
      showToast?.('🧠 Recall logged! +15 🪙');
    } else {
      showToast?.('Card scheduled for repeat review tomorrow.');
    }
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    createFlashcard({ front, back, deck });
    setFront('');
    setBack('');
    refresh();
    showToast?.('Flashcard added to Knowledge Vault!');
  };

  const handleGenerateFromNotes = () => {
    if (!notesText.trim()) return;
    const generated = generateFlashcardsFromNotes(notesText, deck);
    setNotesText('');
    refresh();
    showToast?.(`Generated ${generated.length} flashcards from your notes!`);
    setTab('review');
  };

  const handleAddPath = (e) => {
    e.preventDefault();
    if (!pathTitle.trim()) return;
    createLearningPath({ title: pathTitle, subject: pathSubject });
    setPathTitle('');
    refresh();
    showToast?.('Custom learning path created!');
  };

  return (
    <div>
      <div className="page-title">Knowledge Vault (SM-2)</div>
      <div className="page-subtitle">
        Spaced Repetition Flashcards, Learning Paths & Active Recall
      </div>

      <div className="stat-row">
        <div className="stat-pill">
          <div className="stat-pill-value">{summary.dueCount}</div>
          <div className="stat-pill-label">Due Today</div>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-value">{summary.retentionRate}%</div>
          <div className="stat-pill-label">Retention</div>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-value">{summary.totalCards}</div>
          <div className="stat-pill-label">Total Cards</div>
        </div>
      </div>

      <div className="leaderboard-tabs mb-16">
        <button className={`leaderboard-tab ${tab === 'review' ? 'active' : ''}`} onClick={() => setTab('review')}>
          ⚡ Daily Queue ({summary.dueCount})
        </button>
        <button className={`leaderboard-tab ${tab === 'paths' ? 'active' : ''}`} onClick={() => setTab('paths')}>
          🗺️ Learning Paths ({paths.length})
        </button>
        <button className={`leaderboard-tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>
          + Add / AI Generate
        </button>
      </div>

      {tab === 'review' && (
        <>
          {currentDue ? (
            <div className="card mb-16" style={{ textAlign: 'center', minHeight: 220 }}>
              <div className="duel-sub mb-16" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                DECK: {currentDue.deck} · Interval: {currentDue.intervalDays}d · EF: {currentDue.easiness}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, margin: '18px 0', color: 'var(--text-bright)' }}>
                {currentDue.front}
              </div>

              {flipped ? (
                <>
                  <div className="card mb-16" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'var(--success)' }}>
                    <div style={{ color: 'var(--text-bright)', lineHeight: 1.5 }}>{currentDue.back}</div>
                  </div>
                  <div className="duel-sub mb-16">Rate your recall (SM-2 scheduling):</div>
                  <div className="inline-edit-row">
                    <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleGrade(1)}>
                      Again (1d)
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleGrade(3)}>
                      Good (+15 🪙)
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleGrade(5)}>
                      Easy (+15 🪙)
                    </button>
                  </div>
                </>
              ) : (
                <button className="btn btn-primary btn-full mt-16" onClick={() => setFlipped(true)}>
                  Reveal Answer
                </button>
              )}
            </div>
          ) : (
            <div className="card mb-16 text-center">
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</div>
              <div className="section-title mb-16">All Due Cards Reviewed!</div>
              <div className="duel-sub mb-16">
                You reviewed {summary.reviewedToday} cards today. Add new cards or generate quizzes from your notes!
              </div>
              <button className="btn btn-primary" onClick={() => setTab('create')}>
                + Create Flashcards
              </button>
            </div>
          )}

          <div className="card">
            <div className="section-title mb-16">All Flashcards ({allCards.length})</div>
            {allCards.slice(0, 6).map((c) => (
              <div key={c.id} className="quest-card" style={{ padding: '10px 12px' }}>
                <div className="quest-body">
                  <div className="quest-title" style={{ fontSize: '0.88rem' }}>{c.front}</div>
                  <div className="duel-sub">{c.deck} · Next review: {c.nextReviewDate}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'paths' && (
        <>
          <form className="card mb-16" onSubmit={handleAddPath}>
            <div className="section-title mb-16">Create Custom Learning Path</div>
            <div className="inline-edit-row mb-16">
              <input
                className="input-field"
                placeholder="Path title (e.g. System Design)"
                value={pathTitle}
                onChange={(e) => setPathTitle(e.target.value)}
              />
              <input
                className="input-field"
                placeholder="Subject"
                value={pathSubject}
                onChange={(e) => setPathSubject(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-full" type="submit">+ Add Learning Path</button>
          </form>

          {paths.map((p) => (
            <div key={p.id} className="card mb-16">
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{p.title}</div>
              <div className="duel-sub mb-16">{p.subject} · {p.description}</div>
              <div className="chip-scroll">
                {(p.milestones || []).map((m, idx) => (
                  <span key={idx} className="tag tag-reward">Step {idx + 1}: {m}</span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'create' && (
        <>
          <form className="card mb-16" onSubmit={handleAddCard}>
            <div className="section-title mb-16">Add Flashcard</div>
            <input
              className="input-field mb-16"
              placeholder="Deck / Subject (e.g. Computer Science)"
              value={deck}
              onChange={(e) => setDeck(e.target.value)}
            />
            <input
              className="input-field mb-16"
              placeholder="Front (Question / Prompt)"
              value={front}
              onChange={(e) => setFront(e.target.value)}
            />
            <input
              className="input-field mb-16"
              placeholder="Back (Answer / Explanation)"
              value={back}
              onChange={(e) => setBack(e.target.value)}
            />
            <button className="btn btn-primary btn-full" type="submit">Save Flashcard</button>
          </form>

          <div className="card">
            <div className="section-title mb-16">🤖 Generate Cards from Study Notes</div>
            <div className="duel-sub mb-16">
              Paste lines in <code>Term: Definition</code> format to auto-generate SM-2 flashcards offline:
            </div>
            <textarea
              className="input-field mb-16"
              rows={4}
              placeholder={'CAP Theorem: Distributed data store can only provide 2 of Consistency, Availability, Partition Tolerance.\nIdempotency: Repeating an operation yields the same state without duplicate side effects.'}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
            />
            <button className="btn btn-accent btn-full" type="button" onClick={handleGenerateFromNotes}>
              ⚡ Convert Notes to Flashcards
            </button>
          </div>
        </>
      )}
    </div>
  );
}
