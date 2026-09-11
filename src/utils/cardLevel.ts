export interface CardLevelLike {
  _id: string;
  minRechargeAmount: number;
  discountRate: number;
}

export function sortCardLevels<T extends CardLevelLike>(levels: readonly T[]): T[] {
  return [...levels].sort(
    (a, b) => a.minRechargeAmount - b.minRechargeAmount || b.discountRate - a.discountRate,
  );
}

export function getUpgradeTargetLevel<T extends CardLevelLike>({
  levels,
  currentLevelId,
  amountFen,
}: {
  levels: readonly T[];
  currentLevelId: string | undefined;
  amountFen: number;
}): T | undefined {
  if (!Number.isFinite(amountFen)) {
    return undefined;
  }
  const sorted = sortCardLevels(levels);
  const currentRank = currentLevelId
    ? sorted.findIndex((l) => l._id === currentLevelId)
    : -1;
  return sorted.reduce<T | undefined>((best, level, idx) => {
    const min = level.minRechargeAmount || 0;
    return min > 0 && min <= amountFen && idx > currentRank ? level : best;
  }, undefined);
}
