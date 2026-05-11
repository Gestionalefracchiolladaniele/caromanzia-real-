import { insertNotification } from './supabase-notifications';
import { supabase } from './supabase';

export async function trackProfileVisit(cartomanteId: string, visitorId: string): Promise<void> {
  if (cartomanteId === visitorId) return;

  // Throttle: max 1 visita loggata ogni 30 min per stesso user/cartomante
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from('profile_visits')
    .select('id')
    .eq('cartomante_id', cartomanteId)
    .eq('visitor_id', visitorId)
    .gte('created_at', thirtyMinsAgo)
    .limit(1);

  if (recent && recent.length > 0) return;

  await supabase.from('profile_visits').insert({
    cartomante_id: cartomanteId,
    visitor_id: visitorId,
  });

  await insertNotification({
    user_id: cartomanteId,
    type: 'profile_visit',
    actor_id: visitorId,
    note: 'Un utente ha visitato il tuo profilo',
  }).catch(() => {});
}

export async function trackSocialClick(
  cartomanteId: string,
  platform: 'whatsapp' | 'instagram' | 'telegram' | 'tiktok',
  clickedBy: string,
): Promise<void> {
  await supabase.from('social_clicks').insert({
    cartomante_id: cartomanteId,
    platform,
    clicked_by: clickedBy,
  });
}
