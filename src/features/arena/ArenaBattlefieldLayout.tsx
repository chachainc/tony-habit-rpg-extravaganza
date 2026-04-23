import { useEffect, useState } from 'react';
import { useBattleStore, type Combatant } from '../../store/useBattleStore';
import { useAuraStore, AURAS } from '../../store/useAuraStore';
import { usePetStore } from '../../store/usePetStore';
import { useCampaignStore } from '../../store/useCampaignStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { ITEM_DATABASE } from '../../data/items';
import { usePlayerAvatar } from '../../hooks/usePlayerAvatar';
import forestRuinsBg from '../../assets/backgrounds/forest_ruins.png';
import volcanicCavernBg from '../../assets/backgrounds/volcanic_cavern.png';
import shadowRealmBg from '../../assets/backgrounds/shadow_realm.png';
import crystalCatacombsBg from '../../assets/backgrounds/crystal_catacombs.png';
import infernalCitadelBg from '../../assets/backgrounds/infernal_citadel.png';
import fatigueWraithImg from '../../assets/enemies/fatigue_wraith.png';
import chaosOfClutterImg from '../../assets/enemies/chaos_of_clutter.png';
import sedentaryColossusImg from '../../assets/enemies/sedentary_colossus.png';
import insomniaEchoImg from '../../assets/enemies/insomnia_echo.png';
import stressPhantomImg from '../../assets/enemies/stress_phantom.png';
import procrastinationSpecterImg from '../../assets/enemies/procrastination_specter.png';
import hellishImpImg from '../../assets/enemies/hellish_imp.png';
import voidStalkerImg from '../../assets/enemies/void_stalker.png';
import boneGolemImg from '../../assets/enemies/bone_golem.svg';
import gluttonyMawImg from '../../assets/enemies/gluttony_maw.svg';
import apathyShadeImg from '../../assets/enemies/apathy_shade.svg';
import doubtCrawlerImg from '../../assets/enemies/doubt_crawler.svg';
import vanityMirrorImg from '../../assets/enemies/vanity_mirror.svg';
import rageBerserkerImg from '../../assets/enemies/rage_berserker.svg';
import slothLeviathanImg from '../../assets/enemies/sloth_leviathan.svg';
import despairLichImg from '../../assets/enemies/despair_lich.svg';
import shadowTitanImg from '../../assets/bosses/shadow_titan.png';
import generalInertiaImg from '../../assets/bosses/general_inertia.png';
import flickerBurnoutImg from '../../assets/bosses/flicker_burnout.png';
import { Particles } from '../../components/vfx/Particles';
import './ArenaBattlefield.css';

const ENEMY_IMAGES: Record<string, string> = {
  fatigue_wraith: fatigueWraithImg,
  chaos_of_clutter: chaosOfClutterImg,
  sedentary_colossus: sedentaryColossusImg,
  insomnia_echo: insomniaEchoImg,
  stress_phantom: stressPhantomImg,
  procrastination_specter: procrastinationSpecterImg,
  hellish_imp: hellishImpImg,
  void_stalker: voidStalkerImg,
  bone_golem: boneGolemImg,
  gluttony_maw: gluttonyMawImg,
  apathy_shade: apathyShadeImg,
  doubt_crawler: doubtCrawlerImg,
  vanity_mirror: vanityMirrorImg,
  rage_berserker: rageBerserkerImg,
  sloth_leviathan: slothLeviathanImg,
  despair_lich: despairLichImg,
  shadow_titan: shadowTitanImg,
  general_inertia: generalInertiaImg,
  flicker_of_burnout: flickerBurnoutImg,
};

const getBackgroundForFloor = (floor: number): string => {
  if (floor <= 4) return forestRuinsBg;
  if (floor <= 9) return volcanicCavernBg;
  if (floor <= 14) return shadowRealmBg;
  if (floor <= 19) return crystalCatacombsBg;
  return infernalCitadelBg;
};

const UnitEntity = ({ combatant, isAlly, isActive, isHit, imageSrc, petItem }: { combatant: Combatant; isAlly: boolean; isActive: boolean; isHit: boolean; imageSrc: string; petItem?: any }) => {
  const hpPercent = Math.max(0, (combatant.hp / combatant.maxHp) * 100);
  const mpPercent = combatant.maxMana ? Math.max(0, (combatant.mana / combatant.maxMana) * 100) : 0;
  const energyPercent = combatant.energy;
  const hasFrostHelm = isAlly && useInventoryStore.getState().equipped.head === 'frostbound_helm';

  return (
    <div className={`unit-entity ${isAlly ? 'ally' : 'enemy'} ${isActive ? 'attacking' : ''} ${isHit ? 'hit' : ''}`}>
      <div className="unit-shadow" />
      {petItem && (
        <div className="pet-mini" style={{ position: 'absolute', right: '-40px', bottom: '10px', zIndex: 20 }}>
          <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.5))' }}>{petItem.icon}</span>
        </div>
      )}
      <div className={`unit-sprite ${isAlly ? 'player' : 'enemy'} ${combatant?.frozenTurns > 0 ? 'frozen-encasement' : (combatant?.chilledTurns > 0 ? 'chilled-aura' : '')} ${hasFrostHelm ? 'frostbound-aura' : ''}`}>
        <img src={imageSrc} alt={combatant.name} />
        {combatant?.frozenTurns > 0 && <div className="status-icon chill-status" style={{ position: 'absolute', top: '-15px', right: isAlly ? '-15px' : 'auto', left: isAlly ? 'auto' : '-15px', fontSize: '2.5rem', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>🧊</div>}
        {combatant?.chilledTurns > 0 && combatant?.frozenTurns <= 0 && <div className="status-icon chill-status" style={{ position: 'absolute', top: '-15px', right: isAlly ? '-15px' : 'auto', left: isAlly ? 'auto' : '-15px', fontSize: '2rem', zIndex: 10, animation: 'floatUpSlow 2s ease-in-out infinite alternate', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>❄️</div>}
      </div>
      <div className="floating-ui">
        <div className="unit-name">{combatant.name}</div>
        <div className="hp-bar-frame">
          <div className={`hp-bar-fill ${isAlly ? 'ally' : ''}`} style={{ width: `${hpPercent}%` }} />
        </div>
        <div className="hp-text">{Math.max(0, Math.ceil(combatant.hp))}/{Math.round(combatant.maxHp)} HP</div>

        {isAlly && combatant.maxMana > 0 && (
          <>
            <div className="hp-bar-frame" style={{ marginTop: '4px' }}>
              <div className="hp-bar-fill" style={{ width: `${mpPercent}%`, background: '#3b82f6' }} />
            </div>
            <div className="hp-text" style={{ color: '#93c5fd' }}>{Math.max(0, Math.floor(combatant.mana))}/{Math.round(combatant.maxMana)} MP</div>
            <div className={`hp-bar-frame ${energyPercent >= 100 ? 'energy-full-shimmer' : ''}`} style={{ marginTop: '4px', background: '#000' }}>
              <div className="hp-bar-fill" style={{ width: `${energyPercent}%`, background: 'linear-gradient(90deg, #b45309, #d97706)' }} />
            </div>
            <div className="hp-text" style={{ color: '#fde68a' }}>{Math.floor(combatant.energy)}/100 Energy</div>
          </>
        )}
      </div>
    </div>
  );
};

export const ArenaBattlefieldLayout = () => {
  const { phase, player, enemy, turnNumber, isGoldenSlime, lastDamage, currentTurn } = useBattleStore();
  const { currentFloor, currentStreak } = useCampaignStore();
  const { equippedPetId } = usePetStore();
  const { activeAuraId } = useAuraStore();
  const heroImage = usePlayerAvatar();

  const petItem = equippedPetId ? ITEM_DATABASE[equippedPetId] : null;
  const [floatingTexts, setFloatingTexts] = useState<Array<{ id: number; text: string; type: 'damage' | 'heal' | 'crit' | 'ultimate' | 'energy'; x: number; y: number }>>([]);
  const [hitTargetId, setHitTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!lastDamage) return;

    if (lastDamage.type === 'ultimateActivation') {
        return; // Don't show text for the activation phase
    }

    const isPlayerTarget = lastDamage.target === 'player';
    const xOffset = Math.random() * 10 - 5;
    
    const newTexts: any[] = [];
    
    // Main damage text
    if (lastDamage.amount > 0 || lastDamage.type !== 'heal') {
        const textType = lastDamage.type === 'ultimate' ? 'ultimate' : (lastDamage.isCrit ? 'crit' : 'damage');
        newTexts.push({
            id: Date.now(),
            text: lastDamage.amount.toString(),
            type: textType,
            x: isPlayerTarget ? 25 + xOffset : 75 + xOffset,
            y: 40,
        });
    }

    // Energy gain text
    if (lastDamage.energyGain) {
        newTexts.push({
            id: Date.now() + 1,
            text: `+${lastDamage.energyGain} Energy`,
            type: 'energy',
            x: 25 + (Math.random() * 10 - 5), // Always above player
            y: 30, // Slightly higher
        });
    }

    setFloatingTexts((prev) => [...prev, ...newTexts]);
    setHitTargetId(lastDamage.target);

    const timer = setTimeout(() => setHitTargetId(null), 500);
    return () => clearTimeout(timer);
  }, [lastDamage]);

  useEffect(() => {
    if (floatingTexts.length === 0) return;
    const timer = setTimeout(() => {
      setFloatingTexts((prev) => prev.slice(1));
    }, 1500); // Extended slightly so we can read ultimate numbers
    return () => clearTimeout(timer);
  }, [floatingTexts]);

  if (!player || !enemy) {
    return <div className="battlefield-layout" />;
  }

  const bgImage = getBackgroundForFloor(currentFloor);
  const enemyImage = ENEMY_IMAGES[enemy.id] ?? ENEMY_IMAGES.fatigue_wraith;

  return (
    <div className="battlefield-layout">
      <div className="battlefield-background">
        <div className="bg-layer far" style={{ backgroundImage: `url(${bgImage})` }} />
        <Particles count={40} color="rgba(255, 100, 100, 0.4)" speed={2} className="battlefield-particles" />
        <div className="bg-overlay" />
      </div>

      <div className="battlefield-header">
        <div className="combatant-name-header ally" style={{ width: '200px' }}>{player.name}</div>
        <div className="vs-badge">
          <div className="vs-text">VS</div>
        </div>
        <div className="combatant-name-header enemy" style={{ width: '200px' }}>{enemy.name}</div>
        <div className="turn-counter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div>Turn {turnNumber} {isGoldenSlime ? '(Golden Slime!)' : ''}</div>
          {useBattleStore.getState().context === 'arena' && currentStreak > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>
              🔥 Win Streak: {currentStreak} (+{Math.min(currentStreak * 5, 50)}% Rewards)
            </div>
          )}
        </div>
      </div>

      <div className="battlefield-stage">
        <div className="squad-zone allies">
          <UnitEntity
            combatant={player}
            isAlly={true}
            isActive={phase === 'executing' && currentTurn === 'player'}
            isHit={hitTargetId === 'player'}
            imageSrc={heroImage}
            petItem={petItem}
          />
        </div>

        <div className="squad-zone enemies">
          <UnitEntity
            combatant={enemy}
            isAlly={false}
            isActive={phase === 'executing' && currentTurn !== 'player'}
            isHit={hitTargetId === enemy.id}
            imageSrc={enemyImage}
          />
        </div>
      </div>

      {activeAuraId !== 'none' && (
        <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 60 }}>
          <span title={AURAS.find((a) => a.id === activeAuraId)?.description}>
            {AURAS.find((a) => a.id === activeAuraId)?.icon}
          </span>
        </div>
      )}

      <div className="floating-number-container">
        {floatingTexts.map((ft) => (
          <div key={ft.id} className={`floating-number ${ft.type}`} style={{ left: `${ft.x}%`, top: `${ft.y}%` }}>
            {ft.text}
          </div>
        ))}
      </div>
    </div>
  );
};
