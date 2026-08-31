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
import { useAuth } from './context/AuthContext';
import { useGame } from './hooks/useGame';
import { useState } from 'react';

export default function App() {

  const auth = useAuth();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
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
    handleCompleteQuest,
    handleCompleteDuel,
    handleStartOnboarding,
    handleChangeUsername,
    handleChangeAvatar,
    handleReset,
    handleNavigate,
    handleImportLocalProgress,
    handleDismissImport,
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
        {page === 'home' && <Home data={data} onNavigate={handleNavigate} />}
        {page === 'quests' && <Quests data={data} onCompleteQuest={handleCompleteQuest} />}
        {page === 'duel' && <DailyDuel data={data} onFinishDuel={handleCompleteDuel} />}
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
          />
        )}
        {page === 'premium' && <Premium />}
	        {page === 'todos' && <Todos />}

        {page === 'goals' && <Goals />}

        {page === 'feed' && <Feed />}

        {page === 'groups' && (
          <Groups
            onNavigate={handleNavigate}
            onOpenGroup={(group) => {
              setSelectedGroup(group);
              handleNavigate('group-detail');
            }}
          />
        )}

        {page === 'group-detail' && (
          <GroupDetail
            group={selectedGroup}
            onLeave={() => handleNavigate('groups')}
            onOpenChallenge={(challenge) => {
              setSelectedChallenge(challenge);
              handleNavigate('challenge-detail');
            }}
          />
        )}

        {page === 'challenge-detail' && (
          <ChallengeDetail challenge={selectedChallenge} />
        )}

        {page === 'analytics' && (
          <Analytics onNavigate={handleNavigate} />
        )}

        {page === 'weekly-report' && (
          <WeeklyReport onNavigate={handleNavigate} />
        )}
      </div>

      {levelUp && (
        <LevelUpNotification level={levelUp} onClose={() => setLevelUp(null)} />
      )}

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
