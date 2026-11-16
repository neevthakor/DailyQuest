export const COGNITIVE_DOMAINS = [
  'Memory',
  'Speed',
  'Logic',
  'Math',
  'Spatial',
  'Language',
];

export const DUEL_CHALLENGES = [
  // === ORIGINAL 4 (Preserved for backward compatibility) ===
  { id: 'reaction', name: 'Lightning Reflex', category: 'Speed', icon: '⚡', description: 'Tap the instant the signal flashes green', isGenius: false },
  { id: 'number', name: 'Speed Arithmetic', category: 'Math', icon: '🔢', description: 'Solve rapid-fire arithmetic under pressure', isGenius: false },
  { id: 'memory', name: 'Sequence Flash', category: 'Memory', icon: '🧠', description: 'Memorize and repeat the flashing number sequence', isGenius: false },
  { id: 'pattern', name: 'Pattern Sequence', category: 'Logic', icon: '🔮', description: 'Deduce the next number in the hidden rule', isGenius: false },

  // === MEMORY (5 new = 6 total) ===
  { id: 'nback', name: 'Dual N-Back (2-Back)', category: 'Memory', icon: '🧬', description: 'Detect if the current tile matches 2 steps ago', isGenius: true },
  { id: 'card-pairs', name: 'Spatial Card Pairs', category: 'Memory', icon: '🃏', description: 'Flip and match all hidden cognitive pairs', isGenius: false },
  { id: 'word-recall', name: 'Word Recall Sprint', category: 'Memory', icon: '📝', description: 'Memorize 6 words in 5s and spot the real ones', isGenius: false },
  { id: 'matrix-memory', name: 'Grid Matrix Recall', category: 'Memory', icon: '🟦', description: 'Recall all lit tiles on a 4x4 grid after a 2s flash', isGenius: true },
  { id: 'color-sequence', name: 'Chroma Echo', category: 'Memory', icon: '🎨', description: 'Repeat the growing color-pad sequence', isGenius: false },

  // === SPEED & REFLEX (4 new = 5 total) ===
  { id: 'stroop', name: 'Stroop Color Clash', category: 'Speed', icon: '🌈', description: 'Tap the INK color, ignore the written word!', isGenius: true },
  { id: 'tap-order', name: '1-to-16 Speed Grid', category: 'Speed', icon: '⏱️', description: 'Tap numbers 1 through 16 in order as fast as possible', isGenius: false },
  { id: 'odd-one-out', name: 'Visual Outlier Hunt', category: 'Speed', icon: '👁️', description: 'Spot the single mismatched symbol in the grid', isGenius: false },
  { id: 'symbol-match', name: 'Rapid Symbol Match', category: 'Speed', icon: '🔣', description: 'Decide if the two symbols match in under 1.5s', isGenius: false },

  // === LOGIC & DEDUCTION (5 new = 6 total) ===
  { id: 'logic-gates', name: 'Boolean Gate Solver', category: 'Logic', icon: '🔌', description: 'Evaluate AND / OR / XOR / NAND logic circuits', isGenius: true },
  { id: 'syllogism', name: 'Deductive Syllogism', category: 'Logic', icon: '⚖️', description: 'Judge whether the logical conclusion must be true', isGenius: true },
  { id: 'cipher-decode', name: 'Caesar Cipher Crack', category: 'Logic', icon: '🔐', description: 'Decode the shifted secret 4-letter word', isGenius: true },
  { id: 'tower-sort', name: 'Order Stack Blitz', category: 'Logic', icon: '🗼', description: 'Sort scrambled ranks from lowest to highest', isGenius: false },
  { id: 'rule-switch', name: 'Rule-Switch Classifier', category: 'Logic', icon: '🔀', description: 'Sort cards by shifting parity or magnitude rules', isGenius: true },

  // === MATH & QUANTITATIVE (5 new = 6 total) ===
  { id: 'missing-op', name: 'Missing Operator', category: 'Math', icon: '➗', description: 'Pick +, −, ×, or ÷ to make the equation true', isGenius: false },
  { id: 'fraction-duel', name: 'Fraction & % Duel', category: 'Math', icon: '📊', description: 'Pick the larger value between fractions & percents', isGenius: false },
  { id: 'prime-sieve', name: 'Prime Number Blitz', category: 'Math', icon: '💎', description: 'Classify numbers as Prime or Composite fast', isGenius: true },
  { id: 'estimation', name: 'Rapid Estimation', category: 'Math', icon: '🎯', description: 'Pick the closest estimate to large multiplications', isGenius: false },
  { id: 'chain-calc', name: 'Running Chain Math', category: 'Math', icon: '⛓️', description: 'Track a running total across 4 mental operations', isGenius: true },

  // === SPATIAL & VISUAL (5 new = 5 total) ===
  { id: 'mental-rotation', name: 'Shape Rotation Match', category: 'Spatial', icon: '🔄', description: 'Find the rotated (not mirrored) arrow pattern', isGenius: true },
  { id: 'path-finder', name: 'Grid Path Memory', category: 'Spatial', icon: '🧭', description: 'Memorize the knight-like path across the 4x4 board', isGenius: true },
  { id: 'mirror-check', name: 'Mirror Symmetry', category: 'Spatial', icon: '🪞', description: 'Verify if two 3x3 dot matrices are true mirrors', isGenius: false },
  { id: 'count-blocks', name: '3D Stack Counter', category: 'Spatial', icon: '🧊', description: 'Count total cubes in layered 2D height-maps', isGenius: true },
  { id: 'direction-sense', name: 'Compass Turn Tracker', category: 'Spatial', icon: '🧭', description: 'Track your final facing direction after 4 turns', isGenius: false },

  // === LANGUAGE & FOCUS (4 new = 4 total) ===
  { id: 'anagram', name: 'Anagram Blitz', category: 'Language', icon: '🔤', description: 'Unscramble the 5-letter cognitive word', isGenius: false },
  { id: 'word-chain', name: 'Semantic Odd-Word', category: 'Language', icon: '📚', description: 'Pick the word that breaks the semantic group', isGenius: false },
  { id: 'typo-spotter', name: 'Proofread Focus', category: 'Language', icon: '🔍', description: 'Spot the subtly misspelled word under time pressure', isGenius: false },
  { id: 'focus-hold', name: 'Precision 5s Hold', category: 'Language', icon: '🧘', description: 'Release the button at exactly 5.00 seconds without a clock', isGenius: true },
];

export function getChallengeById(id) {
  return DUEL_CHALLENGES.find((c) => c.id === id) || DUEL_CHALLENGES[0];
}
