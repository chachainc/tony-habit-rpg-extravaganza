import { useEffect, useState } from 'react';
import { useBattleStore, type Combatant } from '../../store/useBattleStore';
import { useAuraStore, AURAS } from '../../store/useAuraStore';
import { usePetStore } from '../../store/usePetStore';
import { useCampaignStore } from '../../store/useCampaignStore';
import { ITEM_DATABASE } from '../../data/items';
import playerSpriteImg from '../../assets/sprites/player.png';
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

const UnitEntity = ({ combatant, isAlly, isActive, isHit, imageSrc }: { combatant: Combatant; isAlly: boolean; isActive: boolean; isHit: boolean; imageSrc: string; }) => {
  const hpPercent = Math.max(0, (combatant.hp / combatant.maxHp) * 100);
  return (
    <div className={`unit-entity ${isAlly ? 'ally' : 'enemy'} ${isActive ? 'attacking' : ''} ${isHit ? 'hit' : ''}`}>
      <div className="unit-shadow" />
      <div className={`unit-sprite ${isAlly ? 'player' : 'enemy'}`}>
        <img src={imageSrc} alt={combatant.name} />
      </div>
      <div className="floating-ui">
        <div className="unit-name">{combatant.name}</div>
        <div className="hp-bar-frame">
          <div className={`hp-bar-fill ${isAlly ? 'ally' : ''}`} style={{ width: `${hpPercent}%` }} />
        </div>
        <div className="hp-text">{Math.max(0, Math.ceil(combatant.hp))}/{Math.round(combatant.maxHp)}</div>
      </div>
    </div>
  );
};

export const ArenaBattlefieldLayout = () => {
  const { phase, player, enemy, turnNumber, isGoldenSlime, lastDamage, currentTurn } = useBattleStore();
  const { currentFloor } = useCampaignStore();
  const { activePet } = usePetStore();
  const { activeAuraId } = useAuraStore();

  const petItem = activePet ? ITEM_DATABASE[activePet] : null;
  const [floatingTexts, setFloatingTexts] = useState<Array<{ id: number; text: string; type: 'damage' | 'heal' | 'crit'; x: number; y: number }>>([]);
  const [hitTargetId, setHitTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!lastDamage) return;

    const isPlayerTarget = lastDamage.target === 'player';
    const xOffset = Math.random() * 10 - 5;
    setFloatingTexts((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: lastDamage.amount.toString(),
        type: lastDamage.isCrit ? 'crit' : 'damage',
        x: isPlayerTarget ? 25 + xOffset : 75 + xOffset,
        y: 40,
      },
    ]);
    setHitTargetId(lastDamage.target);

    const timer = setTimeout(() => setHitTargetId(null), 500);
    return () => clearTimeout(timer);
  }, [lastDamage]);

  useEffect(() => {
    if (floatingTexts.length === 0) return;
    const timer = setTimeout(() => {
      setFloatingTexts((prev) => prev.slice(1));
    }, 1000);
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
        <div className="vs-badge"><div className="vs-text">VS</div></div>
        <div className="combatant-name-header enemy" style={{ width: '200px' }}>{enemy.name}</div>
        <div className="turn-counter">Turn {turnNumber} {isGoldenSlime ? '(Golden Slime!)' : ''}</div>
      </div>

      <div className="battlefield-stage">
        <div className="squad-zone allies">
          {petItem && (
            <div className="pet-mini" style={{ position: 'absolute', left: 0, bottom: 0, zIndex: 4 }}>
              <span style={{ fontSize: '2rem' }}>{petItem.icon}</span>
            </div>
          )}
          <UnitEntity
            combatant={player}
            isAlly={true}
            isActive={phase === 'executing' && currentTurn === 'player'}
            isHit={hitTargetId === 'player'}
            imageSrc={playerSpriteImg}
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
