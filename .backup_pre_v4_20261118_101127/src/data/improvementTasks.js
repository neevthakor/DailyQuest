/**
 * Static bank of small, achievable improvement tasks by category. This is
 * the data source for personalizedTasksService.js today.
 *
 * FUTURE AI HOOK: personalizedTasksService.generatePersonalizedTasks() is
 * the single seam where this static pool could be replaced by (or blended
 * with) tasks from an external AI API, keyed off the user's goal history
 * and completion patterns. No AI API is called today, per the "do not add
 * an external AI API unless absolutely necessary" instruction — but the
 * function signature and return shape are already what an AI-backed
 * version would need to return, so swapping the implementation later
 * doesn't require touching any caller.
 */
export const IMPROVEMENT_TASK_POOL = {
  Focus: [
    'Do a single 25-minute task with your phone in another room',
    'Pick your #1 priority for today before checking messages',
    'Work through one task without switching tabs',
  ],
  Study: [
    'Review yesterday\'s notes for 10 minutes before starting new material',
    'Explain one concept you learned out loud, as if teaching someone',
    'Do 15 minutes of active recall instead of re-reading',
  ],
  Fitness: [
    'Do a 10-minute bodyweight circuit',
    'Take the stairs instead of the elevator today',
    'Stretch for 5 minutes before bed',
  ],
  Memory: [
    'Recall your last three meals in order without looking anything up',
    'Try memorizing a 7-digit number using chunking',
    'Write down 5 things you\'re grateful for from memory tonight',
  ],
  Reading: [
    'Read 10 pages of a physical or e-book',
    'Read one long-form article start to finish',
    'Summarize what you read today in two sentences',
  ],
  Discipline: [
    'Make your bed within 5 minutes of waking up',
    'Do the task you\'ve been avoiding first, before anything else',
    'Set a hard stop time for work today and keep it',
  ],
  Communication: [
    'Send one thoughtful message to someone you haven\'t spoken to in a while',
    'Practice a 2-minute self-introduction out loud',
    'Ask one clarifying question in your next conversation instead of assuming',
  ],
  Creativity: [
    'Sketch or freewrite for 10 minutes with no goal',
    'Combine two unrelated ideas into one new one',
    'Try a different approach to a problem you already solved once',
  ],
  'Digital Habits': [
    'Track your screen time for one day without changing anything',
    'Turn off notifications for one app for the rest of today',
    'Do a 2-hour phone-free block',
  ],
  'General Productivity': [
    'Write tomorrow\'s top 3 tasks before ending today',
    'Batch your small tasks into one 20-minute block',
    'Clear your inbox to zero once today',
  ],
};

export function getTaskPoolForCategory(category) {
  return IMPROVEMENT_TASK_POOL[category] || [];
}
