import type { Notification, NotificationType } from '@/types';
import { supabase } from './supabase';

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:users!notifications_actor_id_fkey(id, name, avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    // fallback senza join se la FK non ha l'alias giusto
    const { data: fallback, error: e2 } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (e2) throw e2;
    // enrichisci manualmente con dati actor
    const rows = fallback ?? [];
    const actorIds = [...new Set(rows.map((r: any) => r.actor_id).filter(Boolean))];
    let actorMap: Record<string, { id: string; name: string; avatar_url: string | null }> = {};
    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', actorIds);
      for (const a of actors ?? []) actorMap[a.id] = a;
    }
    return rows.map((r: any) => ({ ...r, actor: r.actor_id ? actorMap[r.actor_id] ?? null : null })) as Notification[];
  }
  return (data ?? []) as Notification[];
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);

  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export interface InsertNotificationParams {
  user_id: string;
  type: NotificationType;
  actor_id?: string;
  card_id?: number;
  note?: string;
}

export async function insertNotification(params: InsertNotificationParams): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: params.user_id,
    type: params.type,
    actor_id: params.actor_id ?? null,
    card_id: params.card_id ?? null,
    note: params.note ?? null,
  });

  if (error) throw error;
}

export function subscribeToNotifications(
  userId: string,
  onNewNotification: (notification: Notification) => void,
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        const raw = payload.new as Notification;
        // arricchisci con dati actor se presente
        if (raw.actor_id) {
          const { data: actorRow } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', raw.actor_id)
            .single();
          onNewNotification({ ...raw, actor: actorRow ?? undefined });
        } else {
          onNewNotification(raw);
        }
      },
    )
    .subscribe();
}

export async function fetchSentPings(actorId: string): Promise<Notification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*, actor:users!notifications_actor_id_fkey(id, name, avatar_url)')
    .eq('type', 'ping')
    .eq('actor_id', actorId)
    .order('created_at', { ascending: false });

  if (!data) return [];
  // se il join non funziona, i dati sono comunque utili per card_id e user_id
  return data as Notification[];
}
