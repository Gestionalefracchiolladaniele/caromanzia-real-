import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { ALL_CARDS } from '@/features/reading/tarot-cards';
import { useReadingStore } from '@/features/reading/reading-store';
import { useAuthStore } from '@/lib/auth-store';
import { getTodayDailyCard } from '@/lib/daily-ritual';
import { trackProfileVisit, trackSocialClick } from '@/lib/profile-tracking';
import { supabase } from '@/lib/supabase';
import type { Cartomante, DailyCard, Notification, NotificationType, User } from '@/types';
import {
  useNotificationStore,
  useNotifications,
} from './notification-store';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ora';
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  return `${days}g fa`;
}

const TYPE_ICONS: Record<NotificationType, string> = {
  ping: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z',
  daily_card: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z',
  profile_visit: 'M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z',
  social_click: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z',
};

const TYPE_COLORS: Record<NotificationType, string> = {
  ping: '#D4AF37',
  daily_card: '#c090f0',
  profile_visit: '#5a9af0',
  social_click: '#4ade80',
};

const TYPE_LABELS: Record<NotificationType, string> = {
  ping: 'Carta ricevuta',
  daily_card: 'Carta del giorno',
  profile_visit: 'Visita al profilo',
  social_click: 'Click social',
};

/* ─────────────────────────────────────────────
   ActorProfileModal — profilo inline (cartomante o user)
   stile overlay notifiche, carica dati da Supabase
───────────────────────────────────────────── */

type ActorProfile = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  regione: string | null;
  interesse_specifico?: string | null;
  specializzazioni?: string[];
  social_links?: Record<string, string>;
};

function ActorProfileModal({
  actorId,
  onClose,
}: {
  actorId: string | null;
  onClose: () => void;
}) {
  const currentUser = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<ActorProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!actorId) return;
    setLoading(true);
    setProfile(null);

    const load = async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, avatar_url, bio, role, regione, interesse_specifico')
        .eq('id', actorId)
        .single();
      if (!userData) { setLoading(false); return; }

      let cartomanteData: { specializzazioni: string[]; social_links: Record<string, string> } | null = null;
      if (userData.role === 'cartomante') {
        const { data: cd } = await supabase
          .from('cartomanti')
          .select('specializzazioni, social_links')
          .eq('id', actorId)
          .single();
        cartomanteData = cd ?? null;
      }

      setProfile({
        ...userData,
        specializzazioni: cartomanteData?.specializzazioni ?? [],
        social_links: (cartomanteData?.social_links as Record<string, string>) ?? {},
      });

      // traccia visita profilo
      if (currentUser?.id && currentUser.id !== actorId && userData.role === 'cartomante') {
        trackProfileVisit(actorId, currentUser.id).catch(() => {});
      }
      setLoading(false);
    };
    load();
  }, [actorId]);

  if (!actorId) return null;

  const PLATFORM_COLORS: Record<string, string> = {
    whatsapp: '#25D366', instagram: '#E1306C', telegram: '#2CA5E0', tiktok: '#D4AF37',
  };
  const PLATFORM_LABELS: Record<string, string> = {
    whatsapp: 'WhatsApp', instagram: 'Instagram', telegram: 'Telegram', tiktok: 'TikTok',
  };

  const handleSocialPress = async (platform: string, url: string) => {
    if (currentUser?.id && profile?.role === 'cartomante') {
      trackSocialClick(actorId, platform as any, currentUser.id).catch(() => {});
    }
    try { await Linking.openURL(url); } catch {}
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="#D4AF37">
              <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </Svg>
          </Pressable>
          <Text style={styles.detailTitle}>
            {loading ? '...' : profile?.role === 'cartomante' ? 'Profilo Cartomante' : 'Profilo Utente'}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {loading ? (
          <View style={styles.profileLoading}>
            <ActivityIndicator color="#D4AF37" />
          </View>
        ) : profile ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.profileScroll}>
            {/* Avatar */}
            <View style={styles.pingActorWrap}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.profileAvatar} />
              ) : (
                <View style={styles.profileAvatarFallback}>
                  <Text style={styles.pingAvatarInitials}>{profile.name.slice(0, 2).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.profileName}>{profile.name}</Text>
              {profile.regione && <Text style={styles.profileRegione}>{profile.regione}</Text>}
            </View>

            {/* Bio */}
            {profile.bio && (
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionLabel}>Bio</Text>
                <Text style={styles.profileBio}>{profile.bio}</Text>
              </View>
            )}

            {/* Specializzazioni (cartomante) */}
            {profile.role === 'cartomante' && (profile.specializzazioni?.length ?? 0) > 0 && (
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionLabel}>Specializzazioni</Text>
                <View style={styles.profileChipsRow}>
                  {profile.specializzazioni!.map((s) => (
                    <View key={s} style={styles.kwChip}>
                      <Text style={styles.kwText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Interesse (user) */}
            {profile.role === 'user' && profile.interesse_specifico && (
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionLabel}>Interesse</Text>
                <View style={styles.profileChipsRow}>
                  <View style={styles.kwChip}>
                    <Text style={styles.kwText}>{profile.interesse_specifico}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Social (cartomante) */}
            {profile.role === 'cartomante' && profile.social_links && Object.keys(profile.social_links).some((k) => profile.social_links![k]) && (
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionLabel}>Contatti</Text>
                <View style={styles.profileSocialRow}>
                  {Object.entries(profile.social_links).filter(([, v]) => Boolean(v)).map(([platform, url]) => (
                    <Pressable
                      key={platform}
                      style={[styles.profileSocialBtn, { borderColor: PLATFORM_COLORS[platform] ?? '#D4AF37' }]}
                      onPress={() => handleSocialPress(platform, url)}
                    >
                      <Text style={[styles.profileSocialBtnText, { color: PLATFORM_COLORS[platform] ?? '#D4AF37' }]}>
                        {PLATFORM_LABELS[platform] ?? platform}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.profileLoading}>
            <Text style={styles.emptyText}>Profilo non trovato</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   PingDetail — schermata carta ricevuta da cartomante
───────────────────────────────────────────── */

interface PingDetailProps {
  notification: Notification;
  onBack: () => void;
  onOpenCartomante: (actorId: string) => void;
}

function PingDetail({ notification, onBack, onOpenCartomante }: PingDetailProps) {
  const cardData = notification.card_id != null
    ? ALL_CARDS.find((c) => c.number === notification.card_id) ?? null
    : null;

  const actorName = notification.actor?.name ?? 'Cartomante';
  const actorAvatar = notification.actor?.avatar_url ?? null;
  const actorInitials = actorName.slice(0, 2).toUpperCase();

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="#D4AF37">
              <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </Svg>
          </Pressable>
          <Text style={styles.detailTitle}>Carta ricevuta</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
          {/* Avatar + nome cartomante */}
          <View style={styles.pingActorWrap}>
            <Pressable onPress={() => notification.actor_id && onOpenCartomante(notification.actor_id)}>
              {actorAvatar ? (
                <Image source={{ uri: actorAvatar }} style={styles.pingAvatar} resizeMode="cover" />
              ) : (
                <View style={styles.pingAvatarFallback}>
                  <Text style={styles.pingAvatarInitials}>{actorInitials}</Text>
                </View>
              )}
            </Pressable>
            <Text style={styles.pingActorName}>{actorName}</Text>
          </View>

          {/* Immagine carta */}
          {cardData && (
            <View style={styles.cardImgWrap}>
              {cardData.image ? (
                <Image source={cardData.image} style={styles.cardImg} resizeMode="contain" />
              ) : (
                <View style={styles.cardImgPlaceholder}>
                  <Text style={styles.cardImgPlaceholderText}>{cardData.name_it[0]}</Text>
                </View>
              )}
            </View>
          )}

          {/* Nome carta */}
          {cardData && (
            <Text style={styles.cardName}>{cardData.name_it}</Text>
          )}

          {/* Keywords */}
          {cardData && cardData.keywords && cardData.keywords.length > 0 && (
            <View style={styles.keywordsRow}>
              {cardData.keywords.slice(0, 3).map((k) => (
                <View key={k} style={styles.kwChip}>
                  <Text style={styles.kwText}>{k}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Nota del cartomante */}
          {notification.note ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.pingNote}>{notification.note}</Text>
            </>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   DailyCardDetail — schermata carta del giorno
───────────────────────────────────────────── */

function DailyCardDetail({
  dailyCard,
  onBack,
  onDeepen,
}: {
  dailyCard: DailyCard;
  onBack: () => void;
  onDeepen: () => void;
}) {
  const cardData = ALL_CARDS.find((c) => c.id === dailyCard.card.id) ?? dailyCard.card;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="#D4AF37">
              <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </Svg>
          </Pressable>
          <Text style={styles.detailTitle}>Carta del Giorno</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
          {/* Immagine carta */}
          <View style={styles.cardImgWrap}>
            {cardData.image ? (
              <Image
                source={cardData.image}
                style={[styles.cardImg, dailyCard.card.reversed && styles.cardImgReversed]}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.cardImgPlaceholder}>
                <Text style={styles.cardImgPlaceholderText}>{cardData.name_it[0]}</Text>
              </View>
            )}
          </View>

          {/* Nome carta */}
          <Text style={styles.cardName}>{cardData.name_it}</Text>
          {dailyCard.card.reversed && (
            <Text style={styles.reversedBadge}>Rovesciata</Text>
          )}

          {/* Divisore */}
          <View style={styles.divider} />

          {/* Messaggio Gemini */}
          <Text style={styles.aiMessage}>{dailyCard.ai_message}</Text>

          {/* Keywords */}
          {cardData.keywords && cardData.keywords.length > 0 && (
            <View style={styles.keywordsRow}>
              {cardData.keywords.slice(0, 4).map((k) => (
                <View key={k} style={styles.kwChip}>
                  <Text style={styles.kwText}>{k}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bottone Approfondisci */}
          <View style={styles.divider} />
          <Pressable style={styles.deepenBtn} onPress={onDeepen}>
            <Text style={styles.deepenBtnText}>✦ Approfondisci con una lettura</Text>
          </Pressable>
          <Text style={styles.deepenHint}>Scegli uno spread e Gemini userà il contesto della carta di oggi</Text>
        </ScrollView>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   NotificationRow — riga singola con swipe
───────────────────────────────────────────── */

function NotificationRow({
  item,
  onPress,
  onDelete,
}: {
  item: Notification;
  onPress: (n: Notification) => void;
  onDelete: (id: string) => void;
}) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const swipe = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      if (e.translationX < -80) {
        translateX.value = withTiming(-400);
        opacity.value = withTiming(0, {}, () => {
          runOnJS(onDelete)(item.id);
        });
      } else {
        translateX.value = withTiming(0);
      }
    });

  const color = TYPE_COLORS[item.type];
  const icon = TYPE_ICONS[item.type];

  // Thumbnail carta: per ping e daily_card mostra immagine reale
  const cardData = (item.type === 'daily_card' || item.type === 'ping') && item.card_id != null
    ? ALL_CARDS.find((c) => c.number === item.card_id) ?? null
    : null;

  // Testo actor: per profile_visit mostra nome specifico utente, altrimenti nome generico
  const actorLabel = item.actor?.name ?? null;

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View style={[styles.row, { transform: [{ translateX }], opacity }, !item.read && styles.rowUnread]}>
        <Pressable style={styles.rowInner} onPress={() => onPress(item)}>
          {cardData?.image ? (
            <Image source={cardData.image} style={[styles.cardThumb, { borderColor: color }]} resizeMode="cover" />
          ) : item.type === 'profile_visit' ? (
            item.actor?.avatar_url ? (
              <Image source={{ uri: item.actor.avatar_url }} style={[styles.avatarThumb, { borderColor: color }]} resizeMode="cover" />
            ) : (
              <View style={[styles.avatarThumb, { borderColor: color, backgroundColor: '#5a2d9a', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#D4AF37', fontSize: 14, fontWeight: '700', fontFamily: 'Georgia' }}>
                  {item.actor?.name?.slice(0, 2).toUpperCase() ?? '??'}
                </Text>
              </View>
            )
          ) : (
            <View style={[styles.iconWrap, { borderColor: color }]}>
              <Svg width="18" height="18" viewBox="0 0 24 24" fill={color}>
                <Path d={icon} />
              </Svg>
            </View>
          )}
          <View style={styles.rowContent}>
            <Text style={styles.rowType}>
              {item.type === 'profile_visit' && item.actor?.name
                ? item.actor.name
                : TYPE_LABELS[item.type]}
            </Text>
            {item.type === 'profile_visit' && (
              <Text style={styles.rowSubType}>Visita al profilo</Text>
            )}
            {item.note && <Text style={styles.rowNote} numberOfLines={2}>{item.note}</Text>}
            {actorLabel && item.type !== 'profile_visit' && (
              <Text style={styles.rowActor}>{actorLabel}</Text>
            )}
            <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

/* ─────────────────────────────────────────────
   NotificationCenter — main component
───────────────────────────────────────────── */

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationCenter({ visible, onClose }: NotificationCenterProps) {
  const user = useAuthStore((s) => s.user);
  const notifications = useNotifications();
  const { markRead, markAllRead, deleteNotification, fetchNotifications } = useNotificationStore.getState();
  const [dailyCardDetail, setDailyCardDetail] = useState<DailyCard | null>(null);
  const [pingDetail, setPingDetail] = useState<Notification | null>(null);
  const [actorProfileId, setActorProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (visible && user?.id) fetchNotifications(user.id);
    if (!visible) { setDailyCardDetail(null); setPingDetail(null); setActorProfileId(null); }
  }, [visible, user?.id]);

  const handleNotificationPress = useCallback(async (n: Notification) => {
    if (!n.read) await markRead(n.id);

    if (n.type === 'ping') {
      setPingDetail(n);
    } else if (n.type === 'daily_card') {
      if (!user?.id) return;
      try {
        const dc = await getTodayDailyCard(user.id);
        setDailyCardDetail(dc);
      } catch {
        onClose();
        router.push('/(tabs)/reading' as any);
      }
    } else if (n.type === 'profile_visit' && n.actor_id) {
      setActorProfileId(n.actor_id);
    }
  }, [markRead, onClose, user?.id]);

  const handleDelete = useCallback((id: string) => {
    deleteNotification(id);
  }, [deleteNotification]);

  const handleMarkAllRead = useCallback(() => {
    if (user?.id) markAllRead(user.id);
  }, [user?.id, markAllRead]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {actorProfileId ? (
        <ActorProfileModal
          actorId={actorProfileId}
          onClose={() => setActorProfileId(null)}
        />
      ) : pingDetail ? (
        <PingDetail
          notification={pingDetail}
          onBack={() => setPingDetail(null)}
          onOpenCartomante={(id) => {
            setPingDetail(null);
            setActorProfileId(id);
          }}
        />
      ) : dailyCardDetail ? (
        <DailyCardDetail
          dailyCard={dailyCardDetail}
          onBack={() => setDailyCardDetail(null)}
          onDeepen={() => {
            const ctx = `Carta del giorno: ${dailyCardDetail.card.name_it}${dailyCardDetail.card.reversed ? ' (rovesciata)' : ''}. ${dailyCardDetail.ai_message}`;
            useReadingStore.getState().reset();
            useReadingStore.getState().setFreeContext(ctx);
            setDailyCardDetail(null);
            onClose();
            router.push('/(tabs)/reading' as any);
          }}
        />
      ) : (
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={onClose} style={styles.backBtn}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="#D4AF37">
                  <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </Svg>
              </Pressable>
              <Text style={styles.title}>Notifiche</Text>
              <Pressable onPress={handleMarkAllRead} style={styles.markAllBtn}>
                <Text style={styles.markAllText}>Tutte lette</Text>
              </Pressable>
            </View>

            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <NotificationRow item={item} onPress={handleNotificationPress} onDelete={handleDelete} />
              )}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              style={styles.flatList}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Nessuna notifica</Text>
                </View>
              }
            />
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,6,25,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: 'rgba(36,21,80,0.98)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.2)',
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D4AF37',
    fontFamily: 'Georgia',
    letterSpacing: 1,
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  markAllText: {
    fontSize: 11,
    color: '#a890c8',
  },
  flatList: {
    flexGrow: 0,
  },
  list: {
    paddingVertical: 8,
  },
  row: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
  },
  rowUnread: {
    backgroundColor: 'rgba(90,45,154,0.25)',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: 'rgba(36,21,80,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardThumb: {
    width: 32,
    height: 50,
    borderRadius: 4,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  avatarThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E8D5A3',
    fontFamily: 'Georgia',
  },
  rowNote: {
    fontSize: 12,
    color: '#a890c8',
    lineHeight: 17,
  },
  rowSubType: {
    fontSize: 11,
    color: '#7a6090',
    fontFamily: 'Georgia',
  },
  rowActor: {
    fontSize: 12,
    color: '#c4a0f0',
  },
  rowTime: {
    fontSize: 11,
    color: '#7a6090',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4AF37',
    flexShrink: 0,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#7a6090',
    fontFamily: 'Georgia',
  },

  /* DailyCardDetail */
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.2)',
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4AF37',
    fontFamily: 'Georgia',
    letterSpacing: 0.8,
  },
  detailScroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  cardImgWrap: {
    marginBottom: 4,
  },
  cardImg: {
    width: 120,
    height: 200,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  cardImgReversed: {
    transform: [{ rotate: '180deg' }],
  },
  cardImgPlaceholder: {
    width: 120,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#5a2d9a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  cardImgPlaceholderText: {
    fontSize: 36,
    color: '#D4AF37',
    fontWeight: '700',
  },
  cardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F0D060',
    fontFamily: 'Georgia',
    textAlign: 'center',
  },
  reversedBadge: {
    fontSize: 11,
    color: '#c090f0',
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.25)',
    marginVertical: 4,
  },
  aiMessage: {
    fontSize: 14,
    color: '#e0d4f8',
    fontFamily: 'Georgia',
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 4,
  },
  kwChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(90,45,154,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  kwText: {
    fontSize: 11,
    color: '#D4AF37',
  },

  deepenBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  deepenBtnText: {
    color: '#0d0918',
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deepenHint: {
    color: '#7a6090',
    fontFamily: 'Georgia',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16,
  },

  /* PingDetail */
  pingActorWrap: { alignItems: 'center', marginBottom: 8, gap: 6 },
  pingAvatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#D4AF37' },
  pingAvatarFallback: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#5a2d9a', borderWidth: 2, borderColor: '#D4AF37', alignItems: 'center', justifyContent: 'center' },
  pingAvatarInitials: { color: '#D4AF37', fontSize: 28, fontWeight: '700', fontFamily: 'Georgia' },
  pingActorName: { fontSize: 15, fontWeight: '700', color: '#F0D060', fontFamily: 'Georgia' },
  pingNote: { fontSize: 14, color: '#D4AF37', fontFamily: 'Georgia', fontStyle: 'italic', textAlign: 'center', lineHeight: 22 },

  /* ActorProfileModal */
  profileLoading: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  profileScroll: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, gap: 14 },
  profileAvatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#D4AF37' },
  profileAvatarFallback: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#5a2d9a', borderWidth: 2, borderColor: '#D4AF37', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#F0D060', fontFamily: 'Georgia', textAlign: 'center' },
  profileRegione: { fontSize: 13, color: '#c4a878', fontFamily: 'Georgia' },
  profileSection: { alignSelf: 'stretch', gap: 8 },
  profileSectionLabel: { fontSize: 11, color: '#D4AF37', letterSpacing: 1.5, fontFamily: 'Georgia', textTransform: 'uppercase' },
  profileBio: { fontSize: 14, color: '#c4bae0', lineHeight: 22, fontFamily: 'Georgia' },
  profileChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  profileSocialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  profileSocialBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8 },
  profileSocialBtnText: { fontSize: 13, fontFamily: 'Georgia', fontWeight: '700' },
});
