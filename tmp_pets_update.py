import re

file_path = 'src/data/pets.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the PetPassive interface
new_interface = """export interface PetPassive {
    name: string;
    description: string;
    type: 'gold_percent' | 'drop_chance' | 'flat_hp' | 'flat_atk' | 'flat_def' | 'hybrid' | 'store_discount' | 'combat_all' | 'daily_rewards' | 'bonus_roll';
    value: number;
}"""

content = re.sub(r'export interface PetPassive \{[\s\S]*?\}', new_interface, content)

# Now, map all passives to the new schema
def replace_passive(match):
    # rarity could be extracted from the match to balance the pet
    full_str = match.group(0)
    
    # Simple extraction for some basic balance mapping based on ID or name
    pet_id = re.search(r"id:\s*'([^']+)'", full_str).group(1)
    rarity = re.search(r"rarity:\s*'([^']+)'", full_str)
    rarity = rarity.group(1) if rarity else 'common'
    
    # Decide stats based on rarity
    if rarity == 'common':
        val = 2
        p_name = "Novice Greed"
        p_type = "gold_percent"
        p_desc = f"+{val}% gold earned"
    elif rarity == 'uncommon':
        val = 4
        p_name = "Adept Greed"
        p_type = "gold_percent"
        p_desc = f"+{val}% gold earned"
    elif rarity == 'rare':
        val = 5
        p_name = "Keen Eye"
        p_type = "drop_chance"
        p_desc = f"+{val}% drop chance"
    elif rarity == 'epic':
        if 'war' in pet_id or 'dragon' in pet_id or 'rhino' in pet_id:
            val = 10
            p_name = "Savage Strike"
            p_type = "flat_atk"
            p_desc = f"+{val} Attack"
        else:
            val = 12
            p_name = "Master's Greed"
            p_type = "gold_percent"
            p_desc = f"+{val}% gold earned"
    else: # legendary / mythic
        if 'war' in pet_id or 'king' in pet_id or 'archer' in pet_id:
            val = 10
            p_name = "Warlord's Aura"
            p_type = "combat_all"
            p_desc = f"+{val}% all combat stats"
        elif 'turtle' in pet_id:
            val = 15
            p_name = "Merchant's Smile"
            p_type = "store_discount"
            p_desc = f"{val}% store discount"
        else:
            val = 20
            p_name = "Daily Blessing"
            p_type = "daily_rewards"
            p_desc = f"+{val}% daily rewards"
            
    # Some overrides for specific pets to keep flavor
    if pet_id == 'ethereal_cow':
        val = 20
        p_type = "daily_rewards"
        p_name = "Cosmic Blessing"
        p_desc = "+20% daily rewards"
    if pet_id == 'wizard_cow':
        val = 10
        p_type = "drop_chance"
        p_name = "Arcane Sight"
        p_desc = "+10% drop chance"
        
    replacement = f"passive: {{ name: '{p_name}', description: '{p_desc}', type: '{p_type}', value: {val} }}"
    
    # Regex to replace the passive object specifically
    new_str = re.sub(r'passive:\s*\{[^}]+\}', replacement, full_str)
    return new_str

content = re.sub(r"'[^']+':\s*\{[\s\S]*?\}", replace_passive, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(content[:500])
