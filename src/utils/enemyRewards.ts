export function getEnemyDefeatGoldReward(isBossOrElite: boolean): number {
    if (isBossOrElite) {
        // Boss or Elite: exactly 5 gold
        return 5;
    }
    // Normal enemy: 1-5 gold
    return Math.floor(Math.random() * 5) + 1;
}
