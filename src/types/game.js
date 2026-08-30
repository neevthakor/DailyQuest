/**
 * Shared game-data shapes. Kept as JSDoc so the existing JS app
 * can grow into typed modules without a TypeScript migration.
 *
 * @typedef {Object} UserProfile
 * @property {string} username
 * @property {number} xp
 * @property {number} level
 * @property {number} coins
 * @property {number} streak
 * @property {string|null} lastStreakDate
 * @property {number} totalQuestsCompleted
 * @property {number} totalXPEarned
 * @property {number} bestDuelScore
 * @property {number} duelsCompleted
 *
 * @typedef {Object} Quest
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} category
 * @property {string} difficulty
 * @property {number} xpReward
 * @property {number} coinReward
 * @property {boolean} completed
 *
 * @typedef {Object} QuestState
 * @property {string|null} date
 * @property {Quest[]} items
 *
 * @typedef {Object} Achievement
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} icon
 * @property {boolean} unlocked
 *
 * @typedef {Object} DuelHistoryEntry
 * @property {string} date
 * @property {number} score
 * @property {string} [challengeId]
 *
 * @typedef {Object} DuelState
 * @property {string|null} lastPlayedDate
 * @property {number} bestScore
 * @property {DuelHistoryEntry[]} history
 *
 * @typedef {Object} GameSettings
 * @property {string} theme
 * @property {boolean} onboarded
 * @property {boolean} premium
 *
 * @typedef {Object} GameData
 * @property {UserProfile} profile
 * @property {QuestState} quests
 * @property {Achievement[]} achievements
 * @property {DuelState} duel
 * @property {GameSettings} settings
 *
 * @typedef {Object} LevelInfo
 * @property {number} level
 * @property {number} xpIntoLevel
 * @property {number} xpForNextLevel
 * @property {number} progressPct
 */

export {};
