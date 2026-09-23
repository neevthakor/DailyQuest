import { useCallback, useEffect, useRef, useState } from 'react';
import {
  changeUsername,
  completeDuel as completeLocalDuel,
  completeQuest as completeLocalQuest,
  hydrateGame,
  persistGame,
  resetProgress,
  startOnboarding,
} from '../services/gameService';
import { upsertProfile, updateProfile } from '../services/cloudProfileService';
import {
  completeCloudQuest,
  hydrateCloudGame,
  migrateLocalGameData,
  saveUnlockedAchievements,
  submitCloudDuelScore,
} from '../services/cloudGameDataService';
import { getNewlyUnlockedAchievements, updateAchievements } from '../services/achievementService';
import {
  cloneData,
  hasImportableLocalProgress,
  hasImportedLocalProgress,
  markLocalProgressImported,
  saveGameData,
} from '../services/storageService';

export function useGame(auth) {
  const [data, setData] = useState(() => hydrateGame());
  const localSnapshotRef = useRef(null);
  const [page, setPage] = useState('home');
  const [levelUp, setLevelUp] = useState(null);
  const [achievementNotif, setAchievementNotif] = useState(null);
  const [toast, setToast] = useState(null);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [gameLoading, setGameLoading] = useState(false);
  const [showImportPrompt, setShowImportPrompt] = useState(false);

  const userId = auth?.user?.id;
  const isAuthenticated = !!auth?.isAuthenticated && !!userId;

  if (!localSnapshotRef.current) {
    localSnapshotRef.current = cloneData(data);
  }

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const syncCloudProfile = useCallback(async (profile, options = {}) => {
    if (!isAuthenticated) return null;
    setCloudSaving(true);
    setCloudError('');
    try {
      const saved = options.upsert
        ? await upsertProfile(userId, profile)
        : await updateProfile(userId, profile);
      auth?.setProfile?.(saved);
      return saved;
    } catch {
      setCloudError('Cloud save failed. Your local progress is still safe on this device.');
      return null;
    } finally {
      setCloudSaving(false);
    }
  }, [auth, isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !auth?.profile) return;
    let active = true;

    async function loadCloudGame() {
      setGameLoading(true);
      setCloudError('');
      try {
        const cloudData = await hydrateCloudGame(userId, auth.profile);
        if (!active) return;
        saveGameData(cloudData);
        setData(cloudData);
      } catch {
        if (!active) return;
        setCloudError('Cloud game data is unavailable. Using the local save on this device.');
        setData((current) => {
          const next = cloneData(current);
          next.profile = {
            ...next.profile,
            ...auth.profile,
          };
          next.settings.onboarded = true;
          saveGameData(next);
          return next;
        });
      } finally {
        if (active) setGameLoading(false);
      }
    }

    loadCloudGame();
    return () => {
      active = false;
    };
  }, [auth?.profile, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setShowImportPrompt(false);
      return;
    }
    setShowImportPrompt(hasImportableLocalProgress(localSnapshotRef.current) && !hasImportedLocalProgress(userId));
  }, [isAuthenticated, userId]);

  const applyUnlocks = useCallback((unlocked, leveledUp, level) => {
    if (leveledUp) setLevelUp(level);
    if (unlocked && unlocked.length > 0) setAchievementNotif(unlocked[0]);
  }, []);

  const finishAchievements = useCallback(async (oldData, outcome) => {
    if (!outcome.success) return outcome;
    const oldPrepared = cloneData(oldData);
    const next = cloneData(outcome.data);
    const before = new Set((oldPrepared.achievements || []).filter((a) => a.unlocked).map((a) => a.id));
    updateAchievements(next);
    const unlocked = getNewlyUnlockedAchievements(oldPrepared, next);
    outcome.data = next;
    outcome.unlocked = unlocked;
    if (isAuthenticated && unlocked.length > 0) {
      try {
        await saveUnlockedAchievements(userId, next.achievements);
      } catch {
        setCloudError('Achievement saved locally, but cloud achievement sync failed.');
      }
    }
    if (before.size !== (next.achievements || []).filter((a) => a.unlocked).length) {
      saveGameData(next);
    }
    return outcome;
  }, [isAuthenticated, userId]);

  const handleCompleteQuest = useCallback(async (questId) => {
    const oldData = cloneData(data);
    let outcome;

    if (isAuthenticated) {
      setCloudSaving(true);
      setCloudError('');
      try {
        outcome = await completeCloudQuest(userId, data, questId);
      } catch {
        setCloudError('Cloud quest save failed. Falling back to the local save for now.');
        outcome = completeLocalQuest(data, questId);
      } finally {
        setCloudSaving(false);
      }
    } else {
      outcome = completeLocalQuest(data, questId);
    }

    outcome = await finishAchievements(oldData, outcome);
    setData(outcome.data);
    if (!outcome.success) return;
    if (!isAuthenticated) syncCloudProfile(outcome.data.profile);
    else auth?.setProfile?.(outcome.data.profile);
    saveGameData(outcome.data);
    applyUnlocks(outcome.unlocked, outcome.result.leveledUp, outcome.result.level);
    showToast('Quest completed! +' + outcome.result.xpEarned + ' XP');
  }, [applyUnlocks, auth, data, finishAchievements, isAuthenticated, showToast, syncCloudProfile, userId]);

  const handleCompleteDuel = useCallback(async (score, challengeId) => {
    const oldData = cloneData(data);
    let outcome;

    if (isAuthenticated) {
      setCloudSaving(true);
      setCloudError('');
      try {
        outcome = await submitCloudDuelScore(userId, data, score, challengeId);
      } catch {
        setCloudError('Cloud duel save failed. Falling back to the local save for now.');
        outcome = completeLocalDuel(data, score, challengeId);
      } finally {
        setCloudSaving(false);
      }
    } else {
      outcome = completeLocalDuel(data, score, challengeId);
    }

    outcome = await finishAchievements(oldData, outcome);
    setData(outcome.data);
    if (outcome.success) {
      if (!isAuthenticated) syncCloudProfile(outcome.data.profile);
      else auth?.setProfile?.(outcome.data.profile);
      saveGameData(outcome.data);
      applyUnlocks(outcome.unlocked, outcome.result.leveledUp, outcome.result.level);
    }
    return outcome.result;
  }, [applyUnlocks, auth, data, finishAchievements, isAuthenticated, syncCloudProfile, userId]);

  const handleStartOnboarding = useCallback((name) => {
    const outcome = startOnboarding(data, name);
    if (!outcome.success) return;
    setData(outcome.data);
    syncCloudProfile(outcome.data.profile, { upsert: true });
    setPage('home');
  }, [data, syncCloudProfile]);

  const handleChangeUsername = useCallback((name) => {
    const outcome = changeUsername(data, name);
    if (outcome.success) {
      setData(outcome.data);
      syncCloudProfile({ username: outcome.data.profile.username });
    }
    return outcome.success;
  }, [data, syncCloudProfile]);

  const handleChangeAvatar = useCallback((avatar) => {
    const next = cloneData(data);
    next.profile.avatar = typeof avatar === 'string' ? avatar.trim() : '';
    saveGameData(next);
    setData(next);
    syncCloudProfile({ avatar: next.profile.avatar });
    return true;
  }, [data, syncCloudProfile]);

  const handleReset = useCallback(() => {
    const fresh = resetProgress();
    setData(fresh);
    syncCloudProfile(fresh.profile, { upsert: true });
    setPage('home');
  }, [syncCloudProfile]);

  const handleImportLocalProgress = useCallback(async () => {
    if (!isAuthenticated || !userId) return false;
    const local = cloneData(localSnapshotRef.current || data);
    local.settings.onboarded = true;
    setCloudSaving(true);
    setCloudError('');
    try {
      const migrated = await migrateLocalGameData(userId, local, data);
      saveGameData(migrated);
      setData(migrated);
      auth?.setProfile?.(migrated.profile);
      markLocalProgressImported(userId);
      setShowImportPrompt(false);
      showToast('Local progress imported to your cloud profile.');
      return true;
    } catch {
      setCloudError('Could not import safely. Your local progress was preserved on this device.');
      return false;
    } finally {
      setCloudSaving(false);
    }
  }, [auth, data, isAuthenticated, showToast, userId]);

  const handleDismissImport = useCallback(() => {
    if (userId) markLocalProgressImported(userId);
    setShowImportPrompt(false);
  }, [userId]);

  const handleNavigate = useCallback((p) => {
    setData((current) => persistGame(current));
    setPage(p);
  }, []);

  return {
    data,
    page,
    levelUp,
    setLevelUp,
    achievementNotif,
    setAchievementNotif,
    toast,
    cloudSaving,
    cloudError,
    gameLoading,
    showImportPrompt,
    handleCompleteQuest,
    handleCompleteDuel,
    handleStartOnboarding,
    handleChangeUsername,
    handleChangeAvatar,
    handleReset,
    handleNavigate,
    handleImportLocalProgress,
    handleDismissImport,
    showToast,
  };
}
