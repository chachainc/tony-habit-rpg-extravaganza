import React from 'react';
import { Panel } from '../../components/ui/Panel';
import { GachaButton } from '../../components/ui/GachaButton';
import { Badge } from '../../components/ui/Badge';
import { ResourceBar } from '../../components/ui/ResourceBar';
import { ItemSlot } from '../../components/ui/ItemSlot';
import { Particles } from '../../components/vfx/Particles';
import { Coins, Gem } from 'lucide-react';
import './UIShowcase.css';

export const UIShowcase: React.FC = () => {
    return (
        <div className="showcase-container">
            {/* Background with Particles */}
            <div className="showcase-bg">
                <Particles count={50} color="rgba(255, 180, 50, 0.6)" speed={1.5} />
            </div>

            <div className="showcase-content">
                <h1 className="showcase-title text-gold">UI Framework Showcase</h1>

                <div className="showcase-grid">

                    {/* PANELS */}
                    <section>
                        <h2>Panels</h2>
                        <div className="showcase-row">
                            <Panel variant="glass" padding="lg">
                                <h3>Glass Panel</h3>
                                <p className="text-muted">For overlays and menus over art.</p>
                            </Panel>

                            <Panel variant="solid" padding="lg">
                                <h3>Solid Panel</h3>
                                <p className="text-muted">For opaque dialogs or popups.</p>
                            </Panel>

                            <Panel variant="bordered" padding="lg">
                                <h3>Bordered Focus</h3>
                                <p className="text-muted">For selected or legendary items.</p>
                            </Panel>
                        </div>
                    </section>

                    {/* BUTTONS */}
                    <section>
                        <h2>Buttons</h2>
                        <div className="showcase-row align-center">
                            <GachaButton variant="primary" size="lg">Summon 10x</GachaButton>
                            <GachaButton variant="secondary" size="md">Inventory</GachaButton>
                            <GachaButton variant="danger" size="sm">Sell</GachaButton>
                            <GachaButton variant="primary" size="md" disabled>Locked</GachaButton>
                        </div>
                    </section>

                    {/* BADGES */}
                    <section>
                        <h2>Rarity Badges</h2>
                        <div className="showcase-row align-center">
                            <Badge label="Common" rarity="common" />
                            <Badge label="Uncommon" rarity="uncommon" />
                            <Badge label="Rare" rarity="rare" />
                            <Badge label="Epic" rarity="epic" />
                            <Badge label="Legendary" rarity="legendary" />
                            <Badge label="Mythic" rarity="mythic" />
                        </div>
                    </section>

                    {/* RESOURCE BAR */}
                    <section>
                        <h2>Resource Bar</h2>
                        <Panel variant="glass" padding="sm" className="inline-block">
                            <ResourceBar
                                resources={[
                                    { id: 'gold', icon: <Coins size={16} color="#fbbf24" />, value: '14,250' },
                                    { id: 'gems', icon: <Gem size={16} color="#a855f7" />, value: '1,200' }
                                ]}
                            />
                        </Panel>
                    </section>

                    {/* ITEM SLOTS */}
                    <section>
                        <h2>Item Slots (Rarities)</h2>
                        <div className="showcase-row align-center">
                            <ItemSlot rarity="common" quantity={99} />
                            <ItemSlot rarity="uncommon" level={5} />
                            <ItemSlot rarity="rare" isEquipped />
                            <ItemSlot rarity="epic" fallbackIcon="✨" />
                            <ItemSlot rarity="legendary" fallbackIcon="👑" quantity={1} />
                            <ItemSlot rarity="mythic" fallbackIcon="🔥" isSelected />
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};
