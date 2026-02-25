import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { TownHub } from './features/town/TownHub';
import { TasksPage } from './features/tasks/TasksPage';
import { PetPage } from './features/pet/PetPage';
import { StatsPage } from './features/stats/StatsPage';
import { Room2D } from './features/room/Room2D';
import { WalkableRoom } from './features/room/WalkableRoom';
import { WakeUpModal } from './features/day/WakeUpModal';
import { ArenaPage } from './features/arena/ArenaPage';
import { ShopModal } from './features/shop/ShopModal';
import { MonopolyBoard } from './features/monopoly/MonopolyBoard';
import { CheckInModal } from './features/day/CheckInModal';
import { CalendarModal } from './features/calendar/CalendarModal';
import { CalendarPage } from './features/calendar/CalendarPage';
import { MarketplaceTown } from './features/marketplace/MarketplaceTown';
import { TomeOfKnowledge } from './features/tome/TomeOfKnowledge';
import { Library } from './features/library/Library';
import { GymTracker } from './features/gym/GymTracker';
import { HealthTracker } from './features/health/HealthTracker';
import { Conquest } from './features/conquest/Conquest';
import { SecurityPage } from './features/security/SecurityPage';
import { LoginScreen } from './features/auth/LoginScreen';
import { CharacterCreation } from './features/onboarding/CharacterCreation';
import { UIShowcase } from './features/showcase/UIShowcase';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LevelUpModal } from './components/ui/LevelUpModal';
import { TrophyEvolvedModal } from './components/ui/TrophyEvolvedModal';
import { CharacterPage } from './features/character/CharacterPage';
import { CurrencyPopVFX } from './components/vfx/CurrencyPopVFX';
import { PlayerRoom } from './features/room/PlayerRoom';
import { useDayStore } from './store/useDayStore';
import { useGameStore } from './store/useGameStore';
import { useProfileStore, triggerAutoSync } from './store/useProfileStore';

// Town Hub wrapper to handle navigation
const TownHubPage = () => {
  const navigate = useNavigate();

  const handleNavigate = (page: string) => {
    if (page === 'town') {
      navigate('/town');
    } else {
      navigate(`/${page}`);
    }
  };

  return <TownHub onNavigate={handleNavigate} />;
};

// PlayerRoom wrapper — this is now the default landing page
const PlayerRoomPage = () => {
  const navigate = useNavigate();
  return <PlayerRoom onClose={() => navigate('/town')} />;
};

function App() {
  const { isNewDay } = useDayStore();
  const { pendingLevelUp, clearLevelUp } = useGameStore();
  const { isLoggedIn, characterArchetype } = useProfileStore();
  const [showWakeUp, setShowWakeUp] = useState(false);

  useEffect(() => {
    // Check if it's a new day on mount
    if (isNewDay()) {
      setShowWakeUp(true);
    }
  }, [isNewDay]);

  // Auto-sync: listen to localStorage changes and trigger server sync
  const handleStorageChange = useCallback(() => {
    triggerAutoSync();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    // Sync on any localStorage change
    window.addEventListener('storage', handleStorageChange);

    // Also sync periodically (every 30 seconds)
    const interval = setInterval(() => {
      triggerAutoSync();
    }, 30_000);

    // Sync before page unload
    const handleBeforeUnload = () => {
      const { syncToServer, shareCode } = useProfileStore.getState();
      if (shareCode) {
        syncToServer();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);
    };
  }, [isLoggedIn, handleStorageChange]);

  // If not logged in, show login screen
  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  // If no character selected, force onboarding
  if (isLoggedIn && !characterArchetype) {
    return (
      <Router>
        <CharacterCreation />
      </Router>
    );
  }

  return (
    <Router>
      {/* Toast notifications - always visible */}
      <ToastContainer />

      {/* Currency gain VFX - always visible */}
      <CurrencyPopVFX />

      {/* Trophy Evolution Modal */}
      <TrophyEvolvedModal />

      {showWakeUp && (
        <WakeUpModal onComplete={() => setShowWakeUp(false)} />
      )}

      {/* Level Up Modal */}
      <AnimatePresence>
        {pendingLevelUp && (
          <LevelUpModal
            levelUpData={pendingLevelUp}
            onClose={clearLevelUp}
          />
        )}
      </AnimatePresence>

      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<PlayerRoomPage />} />
          <Route path="character" element={<CharacterPage />} />
          <Route path="town" element={<TownHubPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="pet" element={<PetPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="arena" element={<ArenaPage />} />
          <Route path="tome" element={<TomeOfKnowledge />} />
          <Route path="library" element={<Library />} />
          <Route path="gym" element={<GymTracker />} />
          <Route path="health" element={<HealthTracker />} />
          <Route path="conquest" element={<Conquest />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="shop" element={<ShopModal category="general" onClose={() => window.history.back()} />} />
          <Route path="room" element={<Room2D />} />
          <Route path="walkable-room" element={<WalkableRoom />} />
          <Route path="marketplace" element={<MarketplaceTown />} />
          <Route path="monopoly" element={<MonopolyBoard onClose={() => window.history.back()} />} />
          <Route path="checkin" element={<CheckInModal onClose={() => window.history.back()} />} />
          <Route path="calendar" element={<ErrorBoundary><CalendarPage /></ErrorBoundary>} />
          <Route path="monthly-calendar" element={<CalendarModal onClose={() => window.history.back()} />} />
          <Route path="social" element={<Room2D />} />
          <Route path="achievements" element={<div>Achievements coming soon!</div>} />
          <Route path="settings" element={<div>Settings coming soon!</div>} />
          <Route path="showcase" element={<UIShowcase />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
