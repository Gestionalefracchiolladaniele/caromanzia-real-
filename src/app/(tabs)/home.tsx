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
import Svg, { Path } from 'react-native-svg';

import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { CollapsibleFilterBar } from '@/components/ui/CollapsibleFilterBar';
import { ElaborateFrame } from '@/components/ui/ElaborateFrame';
import { SearchBar } from '@/components/ui/SearchBar';
import { TabBar, type TabId } from '@/components/ui/TabBar';
import { TitleBox } from '@/components/ui/TitleBox';
import { NotificationCenter } from '@/features/notifications/NotificationCenter';
import { useNotificationStore, useNotifications } from '@/features/notifications/notification-store';
import { PingModal } from '@/features/ping/PingModal';
import { ALL_CARDS } from '@/features/reading/tarot-cards';
import { CartomanteProfileModal } from '@/features/home/CartomanteProfileModal';
import { useAuthStore, useIsCartomante } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';
import { trackProfileVisit, trackSocialClick } from '@/lib/profile-tracking';
import { fetchSentPings } from '@/lib/supabase-notifications';
import type { Cartomante, Notification, SocialLinks, User } from '@/types';



/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

type CartomanteWithUser = Cartomante & { name: string; email: string; avatar_url: string | null };
type UserRow = Pick<User, 'id' | 'name' | 'email' | 'avatar_url' | 'bio' | 'interesse_specifico' | 'regione'>;

const SPECIALIZZAZIONI = ['Tutti', 'Amore', 'Carriera', 'Spirituale', 'Salute', 'Famiglia', 'Perdita', 'Crescita personale'];
const INTERESSI = ['Tutti', 'Amore', 'Carriera', 'Spirituale', 'Salute', 'Famiglia', 'Perdita', 'Crescita personale'];

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E1306C',
  telegram: '#2CA5E0',
  tiktok: '#D4AF37',
};
const PLATFORM_LABELS: Record<string, string> = {
  whatsapp: 'WA',
  instagram: 'IG',
  telegram: 'TG',
  tiktok: 'TK',
};


/* ─────────────────────────────────────────────
   Hook: Supabase data
───────────────────────────────────────────── */

function useCartomanti(query: string, spec: string, regione: string) {
  const [cartomanti, setCartomanti] = useState<CartomanteWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetch = async () => {
      // users!inner garantisce solo cartomanti con profilo utente — il filtro is_public
      // è applicato dalla RLS policy "users_select_public" (migration 002)
      let q = supabase
        .from('cartomanti')
        .select('*, user:users!inner(id, name, email, avatar_url)')
        .order('created_at', { ascending: false });

      if (spec && spec !== 'Tutti') {
        q = q.contains('specializzazioni', [spec]);
      }
      if (regione && regione.trim()) {
        q = q.ilike('regione', `%${regione.trim()}%`);
      }

      const { data, error } = await q.limit(50);
      if (cancelled) return;
      if (error || !data) { setLoading(false); return; }

      const mapped: CartomanteWithUser[] = (data as any[]).map((row) => ({
        ...row,
        name: row.user?.name ?? 'Cartomante',
        email: row.user?.email ?? '',
        avatar_url: row.user?.avatar_url ?? null,
      }));

      const filtered = query.trim()
        ? mapped.filter(
            (c) =>
              c.name.toLowerCase().includes(query.toLowerCase()) ||
              (c.regione ?? '').toLowerCase().includes(query.toLowerCase()),
          )
        : mapped;

      setCartomanti(filtered);
      setLoading(false);
    };

    fetch();
    return () => { cancelled = true; };
  }, [query, spec, regione]);

  return { cartomanti, loading };
}

function useUsers(query: string, interesse: string, regione: string) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const run = async () => {
      let q = supabase
        .from('users')
        .select('id, name, email, avatar_url, bio, interesse_specifico, regione')
        .eq('role', 'user')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (interesse && interesse !== 'Tutti') {
        q = q.eq('interesse_specifico', interesse);
      }
      if (regione && regione.trim()) {
        q = q.ilike('regione', `%${regione.trim()}%`);
      }

      const { data, error } = await q;
      if (cancelled) return;
      if (error || !data) { setLoading(false); return; }

      const filtered = query.trim()
        ? data.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
        : data;

      setUsers(filtered as UserRow[]);
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [query, interesse, regione]);

  return { users, loading };
}

/* ─────────────────────────────────────────────
   Hooks: ultima carta ping
───────────────────────────────────────────── */

// Per USER: legge le notifiche ping ricevute dallo store (già caricate)
function useReceivedPingCard(actorId: string) {
  const notifications = useNotifications();
  const userId = useAuthStore((s) => s.user?.id);

  const ping = notifications.find(
    (n) => n.type === 'ping' && n.actor_id === actorId && n.user_id === userId,
  );
  if (!ping?.card_id) return null;
  return ALL_CARDS.find((c) => c.number === ping.card_id) ?? null;
}

// Per CARTOMANTE: carica i ping inviati da Supabase (non sono nelle sue notifiche)
function useSentPingsMap(actorId: string, isCartomante: boolean) {
  const [map, setMap] = React.useState<Record<string, number>>({}); // userId → card_id

  React.useEffect(() => {
    if (!isCartomante || !actorId) return;
    fetchSentPings(actorId).then((pings) => {
      const m: Record<string, number> = {};
      for (const p of pings) {
        if (p.user_id && p.card_id != null && !m[p.user_id]) {
          m[p.user_id] = p.card_id;
        }
      }
      setMap(m);
    }).catch(() => {});
  }, [actorId, isCartomante]);

  return map;
}


/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function CardThumbnail({ cardNumber, label }: { cardNumber: number; label: string }) {
  const card = ALL_CARDS.find((c) => c.number === cardNumber);
  if (!card) return null;

  return (
    <View style={styles.thumbWrap}>
      {card.image ? (
        <Image source={card.image} style={styles.thumbImage} resizeMode="cover" />
      ) : (
        <View style={styles.thumbFallback}>
          <Text style={styles.thumbFallbackText}>{card.name_it.slice(0, 1)}</Text>
        </View>
      )}
      <Text style={styles.thumbLabel}>{label}</Text>
    </View>
  );
}

/* Card cartomante — vista UTENTE */
function CartomanteCard({
  item,
  onPress,
  onAvatarPress,
}: {
  item: CartomanteWithUser;
  onPress: () => void;
  onAvatarPress: () => void;
}) {
  const lastCard = useReceivedPingCard(item.id);
  const userId = useAuthStore((s) => s.user?.id);

  const handleSocial = async (
    platform: 'whatsapp' | 'instagram' | 'telegram' | 'tiktok',
    url: string,
  ) => {
    if (userId) trackSocialClick(item.id, platform, userId).catch(() => {});
    try { await Linking.openURL(url); } catch {}
  };

  const socialMap: [keyof SocialLinks, 'whatsapp' | 'instagram' | 'telegram' | 'tiktok', string, string][] = [
    ['whatsapp', 'whatsapp', '#25D366', 'WA'],
    ['instagram', 'instagram', '#E1306C', 'IG'],
    ['telegram', 'telegram', '#2CA5E0', 'TG'],
    ['tiktok', 'tiktok', '#D4AF37', 'TK'],
  ];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Pressable style={styles.avatar} onPress={(e) => { e.stopPropagation(); onAvatarPress(); }}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarText}>{item.name.slice(0, 2).toUpperCase()}</Text>
        )}
      </Pressable>

      <View style={styles.cardInfo}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName}>{item.name}</Text>
          <View style={styles.verifiedBadge}>
            <Svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <Path d="M20 6L9 17l-5-5" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          {lastCard?.number != null && (
            <CardThumbnail cardNumber={lastCard.number} label="Carta ricevuta" />
          )}
        </View>

        {item.regione && (
          <Text style={styles.cardStatus}>{item.regione}</Text>
        )}

        {item.bio && (
          <Text style={styles.cardBio} numberOfLines={2}>{item.bio}</Text>
        )}

        {item.specializzazioni.length > 0 && (
          <View style={styles.chipsRow}>
            {item.specializzazioni.slice(0, 4).map((s) => (
              <View key={s} style={styles.specChip}>
                <Text style={styles.specChipText}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.socialRow}>
          {socialMap.map(([key, platform, color, label]) =>
            item.social_links?.[key] ? (
              <Pressable
                key={platform}
                onPress={(e) => { e.stopPropagation(); handleSocial(platform, item.social_links[key]!); }}
                style={[styles.socialBtn, { borderColor: color }]}
              >
                <Text style={[styles.socialBtnText, { color }]}>{label}</Text>
              </Pressable>
            ) : null,
          )}
        </View>
      </View>
    </Pressable>
  );
}

/* Card utente — vista CARTOMANTE */
function UserCard({
  item,
  onPing,
  sentCardId,
  onAvatarPress,
}: {
  item: UserRow;
  onPing: (userId: string, userName: string) => void;
  sentCardId?: number | null;
  onAvatarPress: () => void;
}) {
  return (
    <View style={styles.card}>
      <Pressable style={styles.avatar} onPress={onAvatarPress}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarText}>{item.name.slice(0, 2).toUpperCase()}</Text>
        )}
      </Pressable>

      <View style={styles.cardInfo}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName}>{item.name}</Text>
          {sentCardId != null && (
            <CardThumbnail cardNumber={sentCardId} label="Carta inviata" />
          )}
        </View>

        {(item.interesse_specifico || item.regione) && (
          <View style={styles.userMetaRow}>
            {item.interesse_specifico && (
              <View style={styles.specChip}>
                <Text style={styles.specChipText}>{item.interesse_specifico}</Text>
              </View>
            )}
            {item.regione && (
              <Text style={styles.cardStatus}>{item.regione}</Text>
            )}
          </View>
        )}

        {item.bio && (
          <Text style={styles.cardBio} numberOfLines={2}>{item.bio}</Text>
        )}

        <Pressable
          style={styles.pingBtn}
          onPress={() => onPing(item.id, item.name)}
        >
          <Svg width="14" height="14" viewBox="0 0 24 24" fill="#140d2e">
            <Path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
          </Svg>
          <Text style={styles.pingBtnText}>Manda una carta</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   UserProfileModal — profilo mini per utente
   (aperto dal cartomante cliccando avatar user)
───────────────────────────────────────────── */

function UserProfileModal({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const [profile, setProfile] = React.useState<UserRow | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setProfile(null);
    supabase
      .from('users')
      .select('id, name, email, avatar_url, bio, interesse_specifico, regione')
      .eq('id', userId)
      .single()
      .then(({ data }) => { setProfile((data as UserRow) ?? null); setLoading(false); }, () => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  return (
    <Modal visible={!!userId} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={profileModalStyles.overlay}>
        <View style={profileModalStyles.container}>
          <View style={profileModalStyles.header}>
            <Pressable onPress={onClose} style={profileModalStyles.backBtn}>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="#D4AF37">
                <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </Svg>
            </Pressable>
            <Text style={profileModalStyles.title}>Profilo Utente</Text>
            <View style={{ width: 32 }} />
          </View>

          {loading ? (
            <View style={profileModalStyles.center}>
              <ActivityIndicator color="#D4AF37" />
            </View>
          ) : profile ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={profileModalStyles.scroll}>
              <View style={profileModalStyles.avatarWrap}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={profileModalStyles.avatar} />
                ) : (
                  <View style={profileModalStyles.avatarFallback}>
                    <Text style={profileModalStyles.avatarInitials}>{profile.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <Text style={profileModalStyles.name}>{profile.name}</Text>
              {profile.regione && <Text style={profileModalStyles.regione}>{profile.regione}</Text>}
              {profile.interesse_specifico && (
                <View style={profileModalStyles.section}>
                  <Text style={profileModalStyles.sectionLabel}>Interesse</Text>
                  <View style={profileModalStyles.chip}>
                    <Text style={profileModalStyles.chipText}>{profile.interesse_specifico}</Text>
                  </View>
                </View>
              )}
              {profile.bio && (
                <View style={profileModalStyles.section}>
                  <Text style={profileModalStyles.sectionLabel}>Bio</Text>
                  <Text style={profileModalStyles.bio}>{profile.bio}</Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={profileModalStyles.center}>
              <Text style={{ color: '#a890c8', fontFamily: 'Georgia' }}>Profilo non trovato</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const profileModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,6,25,0.92)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { width: '100%', maxWidth: 400, maxHeight: '80%', backgroundColor: 'rgba(36,21,80,0.98)', borderRadius: 16, borderWidth: 1.5, borderColor: '#D4AF37', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(212,175,55,0.2)' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#D4AF37', fontFamily: 'Georgia', letterSpacing: 0.8 },
  center: { paddingVertical: 40, alignItems: 'center' },
  scroll: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, gap: 12 },
  avatarWrap: { marginBottom: 4 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#D4AF37' },
  avatarFallback: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#5a2d9a', borderWidth: 2, borderColor: '#D4AF37', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#D4AF37', fontSize: 28, fontWeight: '700', fontFamily: 'Georgia' },
  name: { fontSize: 20, fontWeight: '700', color: '#F0D060', fontFamily: 'Georgia', textAlign: 'center' },
  regione: { fontSize: 13, color: '#c4a878', fontFamily: 'Georgia' },
  section: { alignSelf: 'stretch', gap: 6 },
  sectionLabel: { fontSize: 11, color: '#D4AF37', letterSpacing: 1.5, fontFamily: 'Georgia', textTransform: 'uppercase' },
  chip: { backgroundColor: 'rgba(115,64,184,0.5)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(143,95,208,0.5)', alignSelf: 'flex-start' },
  chipText: { color: '#c4a0f0', fontSize: 12, fontFamily: 'Georgia' },
  bio: { fontSize: 14, color: '#c4bae0', lineHeight: 22, fontFamily: 'Georgia' },
});

/* ─────────────────────────────────────────────
   Main screen
───────────────────────────────────────────── */

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [spec, setSpec] = useState('Tutti');
  const [regione, setRegione] = useState('');
  const [interesse, setInteresse] = useState('Tutti');
  const [regioneUtenti, setRegioneUtenti] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [pingTarget, setPingTarget] = useState<{ id: string; name: string } | null>(null);
  const [profileModalId, setProfileModalId] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const isCartomante = useIsCartomante();

  const handleOpenCartomanteProfile = useCallback((cartomanteId: string) => {
    setProfileModalId(cartomanteId);
    if (user?.id) trackProfileVisit(cartomanteId, user.id).catch(() => {});
  }, [user?.id]);
  const { fetchNotifications, subscribeRealtime } = useNotificationStore.getState();
  const sentPingsMap = useSentPingsMap(user?.id ?? '', isCartomante);

  const { cartomanti, loading: loadingCartomanti } = useCartomanti(query, spec, regione);
  const { users, loading: loadingUsers } = useUsers(query, interesse, regioneUtenti);

  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications(user.id);
    const unsub = subscribeRealtime(user.id);
    return unsub;
  }, [user?.id]);

  const handlePing = useCallback((userId: string, userName: string) => {
    setPingTarget({ id: userId, name: userName });
  }, []);

  const handleNav = (id: TabId) => {
    router.push(`/(tabs)/${id}` as any);
  };

  const listCount = isCartomante ? users.length : cartomanti.length;
  const isLoading = isCartomante ? loadingUsers : loadingCartomanti;

  return (
    <View style={styles.screen}>
      <ElaborateFrame />

      <View style={styles.inner}>
        <View style={styles.titleArea}>
          <View style={styles.titleRow}>
            <TitleBox sub={isCartomante ? 'Cerca e connettiti' : 'Scopri i cartomanti disponibili'}>
              {isCartomante ? 'UTENTI' : 'DIRECTORY CARTOMANTI'}
            </TitleBox>
            <View style={styles.bellWrap}>
              <NotificationBadge onPress={() => setNotifOpen(true)} />
            </View>
          </View>
        </View>

        <SearchBar
          placeholder={isCartomante ? 'Cerca utente...' : 'Cerca cartomante, regione...'}
          onChangeText={setQuery}
        />

        <View style={styles.filtersRow}>
          {isCartomante ? (
            <>
              <CollapsibleFilterBar
                label="INTERESSE"
                options={INTERESSI}
                selected={interesse}
                onSelect={setInteresse}
              />
              <CollapsibleFilterBar
                label="REGIONE"
                options={[]}
                selected={regioneUtenti || 'Tutte'}
                onSelect={(val) => setRegioneUtenti(val === 'Tutte' ? '' : val)}
              />
            </>
          ) : (
            <>
              <CollapsibleFilterBar
                label="SPECIALIZZAZIONE"
                options={SPECIALIZZAZIONI}
                selected={spec}
                onSelect={setSpec}
              />
              <CollapsibleFilterBar
                label="REGIONE"
                options={[]}
                selected={regione || 'Tutte'}
                onSelect={(val) => setRegione(val === 'Tutte' ? '' : val)}
              />
            </>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#D4AF37" />
          </View>
        ) : (
          <>
            <Text style={styles.count}>
              {isCartomante
                ? `${listCount} utent${listCount === 1 ? 'e' : 'i'}`
                : `${listCount} cartomant${listCount === 1 ? 'e' : 'i'}`}
            </Text>

            {isCartomante ? (
              <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <UserCard
                    item={item}
                    onPing={handlePing}
                    sentCardId={sentPingsMap[item.id] ?? null}
                    onAvatarPress={() => setProfileModalId(item.id)}
                  />
                )}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={styles.empty}>Nessun utente trovato</Text>}
              />
            ) : (
              <FlatList
                data={cartomanti}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <CartomanteCard
                    item={item}
                    onPress={() => handleOpenCartomanteProfile(item.id)}
                    onAvatarPress={() => handleOpenCartomanteProfile(item.id)}
                  />
                )}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={styles.empty}>Nessun cartomante trovato</Text>}
                showsHorizontalScrollIndicator={false}
              />
            )}
          </>
        )}

        <TabBar active="home" onChange={handleNav} />
      </View>

      <NotificationCenter visible={notifOpen} onClose={() => setNotifOpen(false)} />

      {pingTarget && (
        <PingModal
          visible={!!pingTarget}
          targetUserId={pingTarget.id}
          targetUserName={pingTarget.name}
          onClose={() => setPingTarget(null)}
          onSent={() => {
            if (user?.id) fetchNotifications(user.id);
          }}
        />
      )}

      <UserProfileModal
        userId={profileModalId}
        onClose={() => setProfileModalId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#140d2e',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    zIndex: 5,
  },
  titleArea: {
    paddingTop: 40,
  },
  titleRow: {
    position: 'relative',
    alignItems: 'center',
  },
  bellWrap: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -16 }],
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    color: '#a890c8',
    fontSize: 12,
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingVertical: 6,
    fontFamily: 'Georgia',
  },
  list: {
    padding: 16,
    paddingBottom: 16,
    gap: 12,
  },
  empty: {
    color: '#a890c8',
    textAlign: 'center',
    fontFamily: 'Georgia',
    fontSize: 14,
    marginTop: 40,
  },
  card: {
    backgroundColor: 'rgba(36,21,80,0.97)',
    borderWidth: 1.5,
    borderColor: '#8B7020',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#5a2d9a',
    borderWidth: 2,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarText: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  cardInfo: {
    flex: 1,
    gap: 5,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  cardName: {
    color: '#F0D060',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStatus: {
    color: '#c4a878',
    fontSize: 12,
    fontFamily: 'Georgia',
  },
  cardBio: {
    color: '#a890c8',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Georgia',
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 3,
  },
  specChip: {
    backgroundColor: 'rgba(115,64,184,0.5)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(143,95,208,0.5)',
  },
  specChipText: {
    color: '#c4a0f0',
    fontSize: 11,
    fontFamily: 'Georgia',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 5,
  },
  socialBtn: {
    borderWidth: 1.5,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  socialBtnText: {
    fontSize: 11,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
  pingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#D4AF37',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
  },
  pingBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#140d2e',
    fontFamily: 'Georgia',
  },
  thumbWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  thumbImage: {
    width: 22,
    height: 34,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  thumbFallback: {
    width: 22,
    height: 34,
    borderRadius: 3,
    backgroundColor: '#3d1a6e',
    borderWidth: 1,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbFallbackText: {
    fontSize: 9,
    color: '#D4AF37',
    fontWeight: '700',
  },
  thumbLabel: {
    fontSize: 10,
    color: '#a890c8',
    fontFamily: 'Georgia',
  },
});
