import { supabase } from '@/lib/supabase';

// Cooldown progressivo: 1a volta → 1 settimana, 2a → 2 settimane, 3a+ → 1 mese
const COOLDOWN_MS = [
  7 * 24 * 60 * 60 * 1000,   // 1 settimana
  14 * 24 * 60 * 60 * 1000,  // 2 settimane
  30 * 24 * 60 * 60 * 1000,  // 1 mese
];

export interface PingStatus {
  canSend: boolean;
  cooldownUntil: Date | null;
  pingCount: number;
}

export async function checkPingLimit(
  actorId: string,
  targetUserId: string,
): Promise<PingStatus> {
  const { data, error } = await supabase
    .from('notifications')
    .select('created_at')
    .eq('type', 'ping')
    .eq('actor_id', actorId)
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const pings = data ?? [];
  const pingCount = pings.length;

  if (pingCount === 0) return { canSend: true, cooldownUntil: null, pingCount: 0 };

  const lastPingAt = new Date(pings[0].created_at).getTime();
  const cooldownIdx = Math.min(pingCount - 1, COOLDOWN_MS.length - 1);
  const cooldownDuration = COOLDOWN_MS[cooldownIdx];
  const cooldownUntil = new Date(lastPingAt + cooldownDuration);

  if (Date.now() < cooldownUntil.getTime()) {
    return { canSend: false, cooldownUntil, pingCount };
  }

  return { canSend: true, cooldownUntil: null, pingCount };
}

export function formatCooldown(until: Date): string {
  const diff = until.getTime() - Date.now();
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days <= 1) return 'domani';
  if (days < 7) return `tra ${days} giorni`;
  const weeks = Math.ceil(days / 7);
  if (weeks === 1) return 'tra 1 settimana';
  return `tra ${weeks} settimane`;
}
