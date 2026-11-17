import Navigation from './components/Navigation';
import LevelUpNotification from './components/LevelUpNotification';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Quests from './pages/Quests';
import DailyDuel from './pages/DailyDuel';
import Leaderboard from './pages/Leaderboard';
import Achievements from './pages/Achievements';
import Profile from './pages/Profile';
import Premium from './pages/Premium';
import Todos from './pages/Todos';
import Goals from './pages/Goals';
import Feed from './pages/Feed';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import ChallengeDetail from './pages/ChallengeDetail';
import Analytics from './pages/Analytics';
import WeeklyReport from './pages/WeeklyReport';
import AuthPage from './pages/AuthPage';
import ResetPassword from './pages/ResetPassword';
import AdminPayments from './pages/AdminPayments';
import Shop, { applyThemeColors } from './pages/Shop';
import GoldHistory from './pages/GoldHistory';
import Hub from './pages/Hub';
import AICoach from './pages/AICoach';
import Multiplayer from './pages/Multiplayer';
import SkillTree from './pages/SkillTree';

import { useAuth } from './context/AuthContext';
import { useGame } from './hooks/useGame';
import { useEffect, useState } from 'react';

export default function App() {
  const auth = useAuth();
  const ADMIN_USER_ID = 'b3b8976d-82e1-43b6-bbdf-00d7b8c82f7e';
  const isAdmin = auth.user?.id === ADMIN_USER_ID;

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dailyquest_shop_inventory_v2');
      if (raw) {
        const inv = JSON.parse(raw);
        if (inv?.activeTheme) applyThemeColors(inv.activeTheme);
      }
    } catch {
      // ignore
    }
  }, []);

  const {
    data,
    page,
    levelUp,
    setLevelUp,
    achievementNotif,
    setAchievementNotif,
    toast,
    cloudSaving,
    cloudError,
    showImportPrompt,
    handleAdjustGold,
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
  } = useGame(auth);

  if (auth.loading) {
    return (
      <div className="loading-screen">
        <div className="onboarding-logo">DAILYQUEST</div>
        <div className="page-subtitle">Checking your cloud save...</div>
      </div>
    );
  }

  if (page === 'auth') {
    return (
      <AuthPage
        authError={auth.authError}
        signIn={auth.signIn}
        signUp={auth.signUp}
        forgotPassword={auth.forgotPassword}
        onDone={() => handleNavigate(data.settings.onboarded ? 'profile' : 'home')}
      />
    );
  }

  if (auth.isRecovery) {
    return (
      <div className="app-shell">
        <div className="app-content">
          <ResetPassword updatePassword={auth.updatePassword} onDone={() => handleNavigate('home')} />
        </div>
      </div>
    );
  }

  if (!data.settings.onboarded) {
    return (
      <Onboarding
        onStart={handleStartOnboarding}
        onAuth={() => handleNavigate('auth')}
        isAuthenticated={auth.isAuthenticated}
      />
    );
  }

  return (
    <div className="app-shell">
      <Navigation current={page} onNavigate={handleNavigate} coins={data.profile.coins} />

      <div className="app-content">
        {page === 'home' && <Home data={data} onNavigate={handleNavigate} showToast={showToast} />}

        {page === 'hub-activities' && (
          <Hub
            title="Activities & Arena"
            subtitle="32+ Brain Games, Skill Tree, Boss Raids & Multiplayer"
            onNavigate={handleNavigate}
            items={[
              { id: 'duel', label: 'Daily Duel & 32 Games', description: '3 daily puzzles + full Brain Arcade', icon: '⚔️', color: '#ef4444' },
              { id: 'skill-tree', label: 'RPG Skill Tree & Boss Raid', description: '6-domain perks & Weekly Boss Chest', icon: '🧬', color: '#10b981' },
              { id: 'multiplayer', label: 'Multiplayer Arena', description: '1v1 AI Rivals, Links & Gold Wagers', icon: '🥊', color: '#8b5cf6' },
              { id: 'ai-coach', label: 'AI Coach & Behavior Lab', description: 'Device behavior scan & goal training', icon: '🤖', color: '#06b6d4' },
              { id: 'quests', label: 'Daily Quests', description: 'Complete your 5 quests today', icon: '📜', color: '#3b82f6' },
              { id: 'leaderboard', label: 'Leaderboard', description: 'Compete with other players', icon: '🏆', color: '#f59e0b' },
              { id: 'goals', label: 'Goals', description: 'Track your long-term goals', icon: '🎯', color: '#10b981' },
              { id: 'groups', label: 'Squads & Groups', description: 'Join challenges with friends', icon: '👥', color: '#8b5cf6' },
            ]}
          />
        )}

        {page === 'hub-productivity' && (
          <Hub
            title="Productivity & Reports"
            subtitle="Live task timers, AI coach & real graphs"
            onNavigate={handleNavigate}
            items={[
              { id: 'todos', label: 'Live Tasks & Therapist Focus', description: '2m Micro-Starts, CBT Journal & +2 🪙/min', icon: '⏱️', color: '#10b981' },
              { id: 'ai-coach', label: 'AI Coach & Behavior Lab', description: 'Adaptive tasks from device patterns', icon: '🤖', color: '#06b6d4' },
              { id: 'weekly-report', label: 'Weekly Brain Report', description: 'Real 7-day graphs & Shareable PNG Card', icon: '🗓️', color: '#ef4444' },
              { id: 'analytics', label: 'Cognitive Analytics', description: '6-domain mastery & duel curves', icon: '📈', color: '#8b5cf6' },
              { id: 'feed', label: 'Progress Feed', description: 'Share updates with the community', icon: '📰', color: '#3b82f6' },
            ]}
          />
        )}

        {page === 'hub-rewards' && (
          <Hub
            title="Rewards & Gold Shop"
            subtitle="Spin for Gold, collect Relics & unlock Themes"
            onNavigate={handleNavigate}
            items={[
              { id: 'shop', label: 'Gold Shop, Relics & Spin', description: 'Relics, Audio Studio, Themes & 48h Pro Trial', icon: '🛍️', color: '#f59e0b' },
              { id: 'gold-history', label: 'Gold History', description: 'See your past transactions', icon: '📜', color: '#3b82f6' },
              { id: 'premium', label: 'Premium PRO', description: 'Unlock all Genius features', icon: '⭐', color: '#eab308' },
              { id: 'achievements', label: 'Achievements', description: 'View your unlocked awards', icon: '🏆', color: '#10b981' },
            ]}
          />
        )}

        {page === 'quests' && <Quests data={data} onCompleteQuest={handleCompleteQuest} />}
        {page === 'duel' && <DailyDuel data={data} onFinishDuel={handleCompleteDuel} onNavigate={handleNavigate} />}
        {page === 'skill-tree' && <SkillTree data={data} onAdjustGold={handleAdjustGold} onNavigate={handleNavigate} showToast={showToast} />}
        {page === 'multiplayer' && <Multiplayer data={data} onAdjustGold={handleAdjustGold} onNavigate={handleNavigate} showToast={showToast} />}
        {page === 'ai-coach' && <AICoach onNavigate={handleNavigate} showToast={showToast} />}
        {page === 'leaderboard' && <Leaderboard auth={auth} />}
        {page === 'achievements' && <Achievements data={data} />}
        {page === 'profile' && (
          <Profile
            data={data}
            onChangeUsername={handleChangeUsername}
            onChangeAvatar={handleChangeAvatar}
            onReset={handleReset}
            onNavigate={handleNavigate}
            auth={auth}
            cloudSaving={cloudSaving}
            cloudError={cloudError}
            isAdmin={isAdmin}
          />
        )}
        {page === 'premium' && <Premium />}
        {page === 'todos' && <Todos onAdjustGold={handleAdjustGold} showToast={showToast} />}
        {page === 'goals' && <Goals />}
        {page === 'feed' && <Feed />}
        {page === 'admin-payments' && <AdminPayments />}
        {page === 'groups' && (
          <Groups
            onNavigate={handleNavigate}
            onOpenGroup={(group) => { setSelectedGroup(group); handleNavigate('group-detail'); }}
          />
        )}
        {page === 'group-detail' && (
          <GroupDetail
            group={selectedGroup}
            onLeave={() => handleNavigate('groups')}
            onOpenChallenge={(challenge) => { setSelectedChallenge(challenge); handleNavigate('challenge-detail'); }}
          />
        )}
        {page === 'challenge-detail' && <ChallengeDetail challenge={selectedChallenge} />}
        {page === 'analytics' && <Analytics data={data} onNavigate={handleNavigate} />}
        {page === 'shop' && <Shop data={data} onAdjustGold={handleAdjustGold} onNavigate={handleNavigate} showToast={showToast} />}
        {page === 'gold-history' && <GoldHistory />}
        {page === 'weekly-report' && <WeeklyReport data={data} onNavigate={handleNavigate} showToast={showToast} />}
      </div>

      {levelUp && <LevelUpNotification level={levelUp} onClose={() => setLevelUp(null)} />}

      {achievementNotif && (
        <div className="notif-overlay" onClick={() => setAchievementNotif(null)}>
          <div className="ach-notif" onClick={(e) => e.stopPropagation()}>
            <div className="ach-notif-icon">{achievementNotif.icon}</div>
            <div className="ach-notif-label">Achievement Unlocked!</div>
            <div className="ach-notif-name">{achievementNotif.name}</div>
            <div className="ach-notif-desc">{achievementNotif.description}</div>
            <button className="btn btn-accent" onClick={() => setAchievementNotif(null)}>Nice!</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      {showImportPrompt && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Import local progress?</div>
            <div className="modal-body">
              This device has DailyQuest progress saved locally. Importing will copy your profile stats, today's completed quests, achievements, and duel history to your cloud profile once.
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleDismissImport}>Keep Cloud</button>
              <button className="btn btn-primary" onClick={handleImportLocalProgress}>Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}