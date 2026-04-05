import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { TownHub } from './features/town/TownHub';
import { TasksPage } from './features/tasks/TasksPage';
import { PetPage } from './features/pet/PetPage';
import { StatsPage } from './features/stats/StatsPage';
import { Room2D } from './features/room/Room2D';
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
import { ConquestBattle } from './features/conquest/ConquestBattle';
import { CombatPage } from './features/combat/CombatPage';
import { RiskPage } from './features/risk/RiskPage';
import { TowerDefensePage } from './features/tower-defense/TowerDefensePage';
import { StormTheFort } from './features/storm/StormTheFort';
import { LoginScreen } from './features/auth/LoginScreen';
import { CharacterCreation } from './features/onboarding/CharacterCreation';
import { BudgetPage } from './features/budget/BudgetPage';
import { BudgetSetupModal } from './features/budget/BudgetSetupModal';
import { UIShowcase } from './features/showcase/UIShowcase';
import { SettingsPage } from './features/settings/SettingsPage';
import { CollectionCodex } from './features/codex/CollectionCodex';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LevelUpModal } from './components/ui/LevelUpModal';
import { TrophyEvolvedModal } from './components/ui/TrophyEvolvedModal';
import { CharacterPage } from './features/character/CharacterPage';
import { CurrencyPopVFX } from './components/vfx/CurrencyPopVFX';
import { PlayerRoom } from './features/room/PlayerRoom';
import { RoomLobby } from './features/room/RoomLobby';
import { useDayStore } from './store/useDayStore';
import { useGameStore } from './store/useGameStore';
import { useProfileStore, triggerAutoSync } from './store/useProfileStore';
import { useBudgetStore } from './store/useBudgetStore';
import { WelcomeTutorialModal } from './features/onboarding/WelcomeTutorialModal';
import { UltimateVideoOverlay } from './components/ui/UltimateVideoOverlay';

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

// PlayerRoom wrapper — accessible from room lobby
const PlayerRoomPage = () => {
  const navigate = useNavigate();
  return <PlayerRoom onClose={() => navigate('/room')} />;
};

// RoomLobby wrapper — default landing for /room
const RoomLobbyPage = () => {
  const navigate = useNavigate();
  return <RoomLobby onClose={() => navigate('/town')} />;
};



// HydrationGate: waits for Zustand persist to finish reading localStorage
// before rendering the app. Has a 1.5s timeout fallback for Safari/ITP,
// where onRehydrateStorage sometimes never fires.
function HydrationGate({ children }: { children: React.ReactNode }) {
  const { _hasHydrated, setHasHydrated } = useProfileStore();

  useEffect(() => {
    // Safety net: if onRehydrateStorage hasn't fired after 1.5s,
    // force-hydrate so the app is never permanently blank.
    if (_hasHydrated) return;
    const timer = setTimeout(() => {
      console.warn('[BOOT] HydrationGate timeout — forcing hydration.');
      setHasHydrated(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [_hasHydrated, setHasHydrated]);

  if (!_hasHydrated) return null;
  return <>{children}</>;
}

function App() {
  const { isNewDay } = useDayStore();
  const { pendingLevelUp, clearLevelUp } = useGameStore();
  const { isLoggedIn, classType } = useProfileStore();
  const [showWakeUp, setShowWakeUp] = useState(false);
  useEffect(() => {
    console.log('[BOOT] App mounted');
    useBudgetStore.getState().processDailyLogin();
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

  // If no character selected, force character onboarding
  if (isLoggedIn && !classType) {
    return (
      <Router>
        <CharacterCreation />
      </Router>
    );
  }

  return (
    <>
      {/* Show the onboarding tutorial if logged in, character created, but tutorial not seen */}
      {isLoggedIn && classType && !useProfileStore.getState().hasSeenWelcomeTutorial && (
        <WelcomeTutorialModal />
      )}

      <Router>
      {/* Toast notifications - always visible */}
      <ToastContainer />
      
      {/* Ultimate Video Overlay */}
      <UltimateVideoOverlay />

      {/* Currency gain VFX - always visible */}
      <CurrencyPopVFX />

      {/* Trophy Evolution Modal */}
      <TrophyEvolvedModal />

      {showWakeUp && (
        <WakeUpModal onComplete={() => setShowWakeUp(false)} />
      )}

      {/* Budget Setup Modal — only after wake-up flow is done */}
      {isLoggedIn && classType && !showWakeUp && <BudgetSetupModal />}

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
          <Route index element={<TasksPage />} />
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
          <Route path="conquest/battle" element={<ConquestBattle />} />
          <Route path="combat" element={<CombatPage />} />
          <Route path="risk" element={<RiskPage />} />
          <Route path="tower-defense" element={<TowerDefensePage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="storm" element={<StormTheFort />} />
          <Route path="shop" element={<ShopModal category="general" onClose={() => window.history.back()} />} />
          <Route path="room" element={<RoomLobbyPage />} />
          <Route path="room/2d" element={<PlayerRoomPage />} />
          <Route path="marketplace" element={<MarketplaceTown />} />
          <Route path="monopoly" element={<MonopolyBoard onClose={() => window.history.back()} />} />
          <Route path="checkin" element={<CheckInModal onClose={() => window.history.back()} />} />
          <Route path="calendar" element={<ErrorBoundary><CalendarPage /></ErrorBoundary>} />
          <Route path="monthly-calendar" element={<CalendarModal onClose={() => window.history.back()} />} />
          <Route path="social" element={<Room2D />} />
          <Route path="achievements" element={<div>Achievements coming soon!</div>} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="codex" element={<CollectionCodex />} />
          <Route path="showcase" element={<UIShowcase />} />
        </Route>
      </Routes>
      {(() => {
        console.log('[BOOT] route registration complete');
        return null;
      })()}
      </Router>
    </>
  );
}

// Wrap App in HydrationGate so the export includes the Safari-safe
// hydration guard with a 1.5s timeout fallback.
function AppWithHydrationGate() {
  return (
    <HydrationGate>
      <App />
    </HydrationGate>
  );
}

export default AppWithHydrationGate;
