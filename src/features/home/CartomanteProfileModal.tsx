import React, { useEffect } from 'react';
import {
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

import { ALL_CARDS } from '@/features/reading/tarot-cards';
import { useNotifications } from '@/features/notifications/notification-store';
import { useAuthStore } from '@/lib/auth-store';
import { trackProfileVisit, trackSocialClick } from '@/lib/profile-tracking';
import type { Cartomante, SocialLinks } from '@/types';

interface CartomanteProfileModalProps {
  cartomante: (Cartomante & { name: string; avatar_url: string | null }) | null;
  visible: boolean;
  onClose: () => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E1306C',
  telegram: '#2CA5E0',
  tiktok: '#D4AF37',
};

const PLATFORM_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  telegram: 'Telegram',
  tiktok: 'TikTok',
};

const PLATFORM_KEYS: Record<keyof SocialLinks, 'whatsapp' | 'instagram' | 'telegram' | 'tiktok'> = {
  whatsapp: 'whatsapp',
  instagram: 'instagram',
  telegram: 'telegram',
  tiktok: 'tiktok',
};

function useLastPingReceivedCard(cartomanteId: string) {
  const notifications = useNotifications();
  const userId = useAuthStore((s) => s.user?.id);

  const ping = notifications.find(
    (n) => n.type === 'ping' && n.actor_id === cartomanteId && n.user_id === userId,
  );

  if (!ping?.card_id) return null;
  return ALL_CARDS.find((c) => c.number === ping.card_id) ?? null;
}

export function CartomanteProfileModal({ cartomante, visible, onClose }: CartomanteProfileModalProps) {
  const user = useAuthStore((s) => s.user);
  const lastPingCard = useLastPingReceivedCard(cartomante?.id ?? '');

  useEffect(() => {
    if (!visible || !cartomante?.id || !user?.id) return;
    trackProfileVisit(cartomante.id, user.id);
  }, [visible, cartomante?.id, user?.id]);

  if (!cartomante) return null;

  const handleSocialPress = async (platform: 'whatsapp' | 'instagram' | 'telegram' | 'tiktok', url: string) => {
    if (user?.id) {
      trackSocialClick(cartomante.id, platform, user.id).catch(() => {});
    }
    try {
      await Linking.openURL(url);
    } catch {}
  };

  const socialEntries = Object.entries(cartomante.social_links ?? {}).filter(([, v]) => Boolean(v)) as [keyof SocialLinks, string][];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Close */}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <Path d="M18 6L6 18M6 6l12 12" stroke="#a890c8" strokeWidth="2" strokeLinecap="round" />
            </Svg>
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              {cartomante.avatar_url ? (
                <Image source={{ uri: cartomante.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>
                    {cartomante.name?.slice(0, 2).toUpperCase() ?? '??'}
                  </Text>
                </View>
              )}
            </View>

            {/* Nome */}
            <View style={styles.nameRow}>
              <Text style={styles.name}>{cartomante.name}</Text>
              <View style={styles.verifiedBadge}>
                <Svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <Path d="M20 6L9 17l-5-5" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
            </View>

            {cartomante.regione && (
              <Text style={styles.regione}>{cartomante.regione}</Text>
            )}

            {/* Ping ricevuto */}
            {lastPingCard && (
              <View style={styles.pingBanner}>
                {lastPingCard.image ? (
                  <Image source={lastPingCard.image} style={styles.pingCardImg} resizeMode="cover" />
                ) : (
                  <View style={styles.pingCardFallback}>
                    <Text style={styles.pingCardFallbackText}>{lastPingCard.name_it.slice(0, 1)}</Text>
                  </View>
                )}
                <Text style={styles.pingBannerText}>Ha inviato una carta — {lastPingCard.name_it}</Text>
              </View>
            )}

            {/* Bio */}
            {cartomante.bio && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Bio</Text>
                <Text style={styles.bio}>{cartomante.bio}</Text>
              </View>
            )}

            {/* Specializzazioni */}
            {cartomante.specializzazioni.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Specializzazioni</Text>
                <View style={styles.chipsRow}>
                  {cartomante.specializzazioni.map((s) => (
                    <View key={s} style={styles.chip}>
                      <Text style={styles.chipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Social */}
            {socialEntries.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Contatti</Text>
                <View style={styles.socialRow}>
                  {socialEntries.map(([platform, url]) => {
                    const key = PLATFORM_KEYS[platform];
                    return (
                      <Pressable
                        key={platform}
                        style={[styles.socialBtn, { borderColor: PLATFORM_COLORS[key] }]}
                        onPress={() => handleSocialPress(key, url)}
                      >
                        <Text style={[styles.socialBtnText, { color: PLATFORM_COLORS[key] }]}>
                          {PLATFORM_LABELS[key]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e1045',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#5a2d9a',
    maxHeight: '85%',
    paddingBottom: 32,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  scroll: {
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  avatarWrap: {
    marginBottom: 14,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#5a2d9a',
    borderWidth: 2,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#D4AF37',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    color: '#F0D060',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  regione: {
    color: '#c4a878',
    fontSize: 13,
    fontFamily: 'Georgia',
    marginBottom: 12,
  },
  pingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  pingCardImg: {
    width: 28,
    height: 44,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  pingCardFallback: {
    width: 28,
    height: 44,
    borderRadius: 3,
    backgroundColor: '#3d1a6e',
    borderWidth: 1,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingCardFallbackText: {
    fontSize: 11,
    color: '#D4AF37',
    fontWeight: '700',
  },
  pingBannerText: {
    color: '#D4AF37',
    fontSize: 13,
    fontFamily: 'Georgia',
    flex: 1,
  },
  section: {
    alignSelf: 'stretch',
    marginBottom: 18,
  },
  sectionLabel: {
    color: '#D4AF37',
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: 'Georgia',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bio: {
    color: '#c4bae0',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Georgia',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    backgroundColor: 'rgba(115,64,184,0.5)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(143,95,208,0.5)',
  },
  chipText: {
    color: '#c4a0f0',
    fontSize: 12,
    fontFamily: 'Georgia',
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  socialBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  socialBtnText: {
    fontSize: 13,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
});
