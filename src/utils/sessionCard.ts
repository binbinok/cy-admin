import type { MemberSessionCard } from '@/types/sessionCard';

export function computeSessionValue(price: number, totalSessions: number): number {
  if (totalSessions <= 0) {
    return 0;
  }
  return Math.floor(price / totalSessions);
}

export function isSessionCardUsableForItem(params: {
  card: MemberSessionCard;
  categoryId: string;
  baseItemId: string;
  now?: number;
}): boolean {
  const { card, categoryId, baseItemId, now = Date.now() } = params;
  if (card.status !== 'active' || card.remainingSessions <= 0) {
    return false;
  }
  if (card.expiresAt && new Date(card.expiresAt).getTime() <= now) {
    return false;
  }
  const snapshot = card.snapshot;
  if (snapshot.categoryId !== categoryId) {
    return false;
  }
  return snapshot.baseItemScope === 'all' || snapshot.baseItemIds.includes(baseItemId);
}
