import { useState } from 'react';
import { X, Hammer, Sparkles, Recycle } from 'lucide-react';
import { useWorkshopStore, CRAFTING_RECIPES, ENCHANTMENTS, MATERIALS } from '../../store/useWorkshopStore';
import { useInventoryStore, ITEM_DB } from '../../store/useInventoryStore';
import { useGameStore } from '../../store/useGameStore';
import { Panel } from '../../components/ui/Panel';
import './RoomPanels.css';

type WorkshopTab = 'forge' | 'enchant' | 'salvage';

export const WorkshopPanel = ({ onClose }: { onClose: () => void }) => {
    const [tab, setTab] = useState<WorkshopTab>('forge');
    const workshop = useWorkshopStore();
    const { items, removeItem, addItem, equipped } = useInventoryStore();
    const { currency, addCurrency } = useGameStore();

    // ── FORGE ──
    const handleCraft = (recipe: typeof CRAFTING_RECIPES[0]) => {
        if (!workshop.canCraft(recipe, items, currency)) return;
        // Consume items
        for (const input of recipe.inputs) {
            removeItem(input.itemId, input.qty);
        }
        addCurrency(-recipe.goldCost);
        workshop.craft(recipe);
        addItem(recipe.outputItemId);
    };

    // ── ENCHANT ──
    const equippedItemIds = [equipped.weapon, equipped.armor].filter(Boolean) as string[];
    const handleEnchant = (itemId: string, enchId: string) => {
        const ench = ENCHANTMENTS.find(e => e.id === enchId);
        if (!ench || !workshop.canEnchant(ench, currency)) return;
        addCurrency(-ench.goldCost);
        workshop.enchantItem(itemId, enchId);
    };

    // ── SALVAGE ──
    const salvageableItems = Object.entries(items)
        .filter(([id, count]) => count > 0 && ITEM_DB[id] && !equippedItemIds.includes(id))
        .map(([id, count]) => ({ item: ITEM_DB[id], count }))
        .filter(({ item }) => item && (item.type === 'weapon' || item.type === 'armor' || item.type === 'jewelry'));

    const handleSalvage = (itemId: string) => {
        const item = ITEM_DB[itemId];
        if (!item) return;
        removeItem(itemId, 1);
        workshop.salvageItem(item.rarity);
    };

    return (
        <Panel variant="glass" className="room-panel workshop-panel">
            <div className="panel-header">
                <h2>⚒️ Workshop</h2>
                <button className="panel-close-btn" onClick={onClose}><X size={24} /></button>
            </div>
            <p className="panel-subtitle">Forge, enchant, and salvage equipment</p>

            {/* Mastery / Discovery Tracker */}
            <div className="workshop-discovery-bar">
                <span className="workshop-discovery-stat">
                    📖 {((workshop as any).craftedRecipes?.length ?? 0)}/{CRAFTING_RECIPES.length} recipes discovered
                </span>
                {((workshop as any).craftedRecipes?.length ?? 0) < CRAFTING_RECIPES.length && (
                    <span className="workshop-discovery-hint">
                        💡 Craft more to unlock hidden recipes!
                    </span>
                )}
            </div>

            {/* Material bar */}
            <div className="workshop-materials-bar">
                {Object.entries(MATERIALS).map(([id, mat]) => (
                    <span key={id} className="material-pill">
                        {mat.icon} {workshop.getMaterialCount(id)}
                    </span>
                ))}
            </div>

            <div className="panel-tabs">
                <button className={`panel-tab ${tab === 'forge' ? 'active' : ''}`} onClick={() => setTab('forge')}>
                    <Hammer size={16} /> Forge
                </button>
                <button className={`panel-tab ${tab === 'enchant' ? 'active' : ''}`} onClick={() => setTab('enchant')}>
                    <Sparkles size={16} /> Enchant
                </button>
                <button className={`panel-tab ${tab === 'salvage' ? 'active' : ''}`} onClick={() => setTab('salvage')}>
                    <Recycle size={16} /> Salvage
                </button>
            </div>

            <div className="panel-content-scrollable">
                {tab === 'forge' && (
                    <div className="workshop-recipe-list">
                        {CRAFTING_RECIPES.map(recipe => {
                            const canDo = workshop.canCraft(recipe, items, currency);
                            const output = ITEM_DB[recipe.outputItemId];
                            return (
                                <div key={recipe.id} className={`workshop-recipe-card ${canDo ? '' : 'workshop-recipe-card--locked'}`}>
                                    <div className="recipe-output">
                                        <span className="recipe-output-icon">{output?.icon ?? '❓'}</span>
                                        <div>
                                            <strong>{recipe.name}</strong>
                                            <small className={`rarity-label rarity-${output?.rarity}`}>{output?.rarity}</small>
                                        </div>
                                    </div>
                                    <div className="recipe-ingredients">
                                        {recipe.inputs.map(inp => (
                                            <span key={inp.itemId} className={`ingredient ${(items[inp.itemId] ?? 0) >= inp.qty ? '' : 'ingredient--missing'}`}>
                                                {ITEM_DB[inp.itemId]?.icon} ×{inp.qty}
                                            </span>
                                        ))}
                                        {recipe.materialInputs?.map(mat => (
                                            <span key={mat.materialId} className={`ingredient ${workshop.getMaterialCount(mat.materialId) >= mat.qty ? '' : 'ingredient--missing'}`}>
                                                {MATERIALS[mat.materialId]?.icon} ×{mat.qty}
                                            </span>
                                        ))}
                                        <span className="ingredient ingredient--gold">💰 {recipe.goldCost}</span>
                                    </div>
                                    <button className="workshop-action-btn" disabled={!canDo} onClick={() => handleCraft(recipe)}>
                                        ⚒️ Forge
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {tab === 'enchant' && (
                    <div className="workshop-enchant-section">
                        {equippedItemIds.length === 0 ? (
                            <p className="empty-msg">Equip a weapon or armor to enchant it.</p>
                        ) : (
                            equippedItemIds.map(itemId => {
                                const item = ITEM_DB[itemId];
                                if (!item) return null;
                                const currentEnch = workshop.getEnchantment(itemId);
                                const currentEnchDef = ENCHANTMENTS.find(e => e.id === currentEnch);
                                return (
                                    <div key={itemId} className="enchant-item-block">
                                        <div className="enchant-item-header">
                                            <span>{item.icon} {item.name}</span>
                                            {currentEnchDef && (
                                                <span className="enchant-current-badge">
                                                    {currentEnchDef.icon} {currentEnchDef.name} (+{currentEnchDef.value})
                                                </span>
                                            )}
                                        </div>
                                        <div className="enchant-options-grid">
                                            {ENCHANTMENTS.map(ench => {
                                                const canDo = workshop.canEnchant(ench, currency);
                                                const isActive = currentEnch === ench.id;
                                                return (
                                                    <button
                                                        key={ench.id}
                                                        className={`enchant-option ${isActive ? 'enchant-option--active' : ''}`}
                                                        disabled={!canDo || isActive}
                                                        onClick={() => handleEnchant(itemId, ench.id)}
                                                    >
                                                        <span className="enchant-option-icon">{ench.icon}</span>
                                                        <span className="enchant-option-name">{ench.name}</span>
                                                        <span className="enchant-option-stat">+{ench.value} {ench.stat}</span>
                                                        <span className="enchant-option-cost">💰{ench.goldCost}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {tab === 'salvage' && (
                    <div className="workshop-salvage-section">
                        {salvageableItems.length === 0 ? (
                            <p className="empty-msg">No items to salvage. Buy or earn equipment first.</p>
                        ) : (
                            salvageableItems.map(({ item, count }) => (
                                <div key={item.id} className="salvage-item-card">
                                    <span className="salvage-item-icon">{item.icon}</span>
                                    <div className="salvage-item-info">
                                        <strong>{item.name}</strong>
                                        <small>×{count} · {item.rarity}</small>
                                    </div>
                                    <button className="workshop-action-btn workshop-action-btn--salvage" onClick={() => handleSalvage(item.id)}>
                                        ♻️ Salvage
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </Panel>
    );
};
