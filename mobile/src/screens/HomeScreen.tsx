import React, { useEffect, useMemo, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { Auction, AuctionCategory } from '../types';
import { BirdScreen } from '../components/ui-kit';
import { formatXaf } from '../utils/format';
import { theme } from '../theme';

const categories: Array<{ id: AuctionCategory | 'all'; label: string; colors: readonly [string, string] }> = [
  { id: 'all', label: 'Tout', colors: theme.gradientSoft },
  { id: 'phones', label: 'Téléphones', colors: theme.gradientCool },
  { id: 'electronics', label: 'Informatique', colors: theme.gradientMint },
  { id: 'moto', label: 'Motos', colors: theme.gradientSun },
  { id: 'appliances', label: 'Maison', colors: ['#EC4899', '#FB923C'] },
];

const labelByCategory: Record<AuctionCategory, string> = {
  phones: 'Téléphones',
  electronics: 'Informatique',
  moto: 'Motos',
  appliances: 'Maison',
};

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function formatCountdown(endAt: string, now: number): { text: string; urgent: boolean; over: boolean } {
  const ms = new Date(endAt).getTime() - now;
  if (ms <= 0) return { text: 'Terminée', urgent: false, over: true };
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h >= 24) return { text: `${Math.floor(h / 24)} j ${h % 24} h`, urgent: false, over: false };
  if (h > 0) return { text: `${h} h ${String(m).padStart(2, '0')} min`, urgent: false, over: false };
  return { text: `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`, urgent: ms < 10 * 60 * 1000, over: false };
}

export function HomeScreen({
  onOpenAuction,
  onOpenCreateAuction,
  onOpenTransactions,
  onOpenSearch,
  onOpenMessages,
  onOpenWallet,
}: {
  onOpenAuction: (auction: Auction) => void;
  onOpenCreateAuction: () => void;
  onOpenTransactions: () => void;
  onOpenSearch: () => void;
  onOpenMessages: () => void;
  onOpenWallet: () => void;
}) {
  const { auctions, wallet } = useAppData();
  const { user } = useAuth();
  const [active, setActive] = useState<AuctionCategory | 'all'>('all');
  const now = useNow();

  const firstName = (user?.name ?? '').split(' ')[0] || 'vous';
  const running = useMemo(() => auctions.filter((a) => new Date(a.endAt).getTime() > now), [auctions, Math.floor(now / 30000)]);
  const endingSoon = useMemo(
    () => [...running].sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime()).slice(0, 6),
    [running],
  );
  const list = useMemo(
    () => (active === 'all' ? running : running.filter((a) => a.category === active)).sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime()),
    [running, active],
  );

  return (
    <BirdScreen title={`Bonjour ${firstName}`} subtitle="Enchérissez en confiance : l’argent reste bloqué jusqu’à la remise en main propre.">
      <Pressable onPress={onOpenWallet} accessibilityRole="button" accessibilityLabel="Ouvrir le portefeuille">
        <LinearGradient colors={theme.gradientSun} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wallet}>
          <View style={styles.walletBlob} />
          <Text style={styles.walletLabel}>Mon portefeuille</Text>
          <Text style={styles.walletValue}>{formatXaf(wallet.balance)}</Text>
          <View style={styles.walletRow}>
            <Text style={styles.walletHint}>{wallet.blocked > 0 ? `${formatXaf(wallet.blocked)} en séquestre` : 'Aucun fonds en séquestre'}</Text>
            <View style={styles.walletBtn}><Text style={styles.walletBtnText}>Recharger</Text></View>
          </View>
        </LinearGradient>
      </Pressable>

      <View style={styles.tiles}>
        <Tile label="Vendre" colors={theme.gradientSoft} glyph="+" onPress={onOpenCreateAuction} />
        <Tile label="Mes mises" colors={theme.gradientCool} glyph="◎" onPress={onOpenTransactions} />
        <Tile label="Messages" colors={theme.gradientMint} glyph="✉" onPress={onOpenMessages} />
        <Tile label="Explorer" colors={['#EC4899', '#FB923C']} glyph="⌕" onPress={onOpenSearch} />
      </View>

      {endingSoon.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Se termine bientôt</Text>
            <View style={styles.liveDot} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {endingSoon.map((a) => {
              const c = formatCountdown(a.endAt, now);
              return (
                <Pressable key={a.id} style={styles.hot} onPress={() => onOpenAuction(a)} accessibilityRole="button" accessibilityLabel={a.title}>
                  <ImageBackground source={{ uri: a.imageUrl }} style={styles.hotImg} imageStyle={styles.hotImgStyle}>
                    <LinearGradient colors={['transparent', '#1F1A3DCC']} style={styles.hotShade}>
                      <View style={[styles.timer, c.urgent && styles.timerUrgent]}><Text style={styles.timerText}>{c.text}</Text></View>
                      <Text style={styles.hotTitle} numberOfLines={1}>{a.title}</Text>
                      <Text style={styles.hotPrice}>{formatXaf(a.currentPrice)}</Text>
                    </LinearGradient>
                  </ImageBackground>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      <Text style={styles.sectionTitle}>Catégories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {categories.map((c) => {
          const on = c.id === active;
          return (
            <Pressable key={c.id} onPress={() => setActive(c.id)} accessibilityRole="button" accessibilityState={{ selected: on }}>
              {on ? (
                <LinearGradient colors={c.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.chip}>
                  <Text style={[styles.chipText, { color: '#fff' }]}>{c.label}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.chip, styles.chipOff]}><Text style={styles.chipText}>{c.label}</Text></View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Enchères en cours</Text>
        <Text style={styles.count}>{list.length}</Text>
      </View>

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Rien ici pour le moment</Text>
          <Text style={styles.emptyText}>Essayez une autre catégorie, ou lancez la première enchère.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {list.map((a) => {
            const c = formatCountdown(a.endAt, now);
            return (
              <Pressable key={a.id} style={styles.card} onPress={() => onOpenAuction(a)} accessibilityRole="button" accessibilityLabel={`${a.title}, ${formatXaf(a.currentPrice)}`}>
                <ImageBackground source={{ uri: a.imageUrl }} style={styles.cardImg} imageStyle={styles.cardImgStyle}>
                  <View style={[styles.timer, styles.timerCorner, c.urgent && styles.timerUrgent]}><Text style={styles.timerText}>{c.text}</Text></View>
                </ImageBackground>
                <View style={styles.cardBody}>
                  <Text style={styles.cardCat}>{labelByCategory[a.category]} · {a.city}</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{a.title}</Text>
                  <Text style={styles.cardPrice}>{formatXaf(a.currentPrice)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <LinearGradient colors={theme.gradientCool} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.trust}>
        <Text style={styles.trustTitle}>Comment votre argent est protégé</Text>
        <Text style={styles.trustLine}>1. Vous gagnez : la somme est bloquée dans votre portefeuille.</Text>
        <Text style={styles.trustLine}>2. Le vendeur livre, vous recevez un code secret à 6 chiffres.</Text>
        <Text style={styles.trustLine}>3. Vous donnez le code à la remise : le vendeur est payé. Un souci ? Ouvrez un litige.</Text>
      </LinearGradient>
    </BirdScreen>
  );
}

function Tile({ label, colors, glyph, onPress }: { label: string; colors: readonly [string, string]; glyph: string; onPress: () => void }) {
  return (
    <Pressable style={styles.tile} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tileIcon}>
        <Text style={styles.tileGlyph}>{glyph}</Text>
      </LinearGradient>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wallet: { borderRadius: 26, padding: 18, overflow: 'hidden', ...theme.shadow },
  walletBlob: { position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: '#FFFFFF33' },
  walletLabel: { color: '#5A2D05', fontSize: 12.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  walletValue: { color: '#2B1400', fontSize: 34, fontWeight: '900', marginTop: 2, letterSpacing: -0.5 },
  walletRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  walletHint: { color: '#5A2D05', fontSize: 12.5, fontWeight: '600', flex: 1 },
  walletBtn: { backgroundColor: '#1F1A3D', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  walletBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  tiles: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  tile: { flex: 1, alignItems: 'center', gap: 6 },
  tileIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', ...theme.shadow },
  tileGlyph: { color: '#fff', fontSize: 26, fontWeight: '700' },
  tileLabel: { color: theme.ink, fontSize: 12.5, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionTitle: { color: theme.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.3 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  count: { color: theme.primary, fontWeight: '800', backgroundColor: theme.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, overflow: 'hidden' },
  carousel: { gap: 12, paddingRight: 16 },
  hot: { width: 230, height: 170, borderRadius: 22, overflow: 'hidden', backgroundColor: theme.soft, ...theme.shadow },
  hotImg: { flex: 1, justifyContent: 'flex-end' },
  hotImgStyle: { borderRadius: 22 },
  hotShade: { padding: 12, gap: 2, justifyContent: 'flex-end', flex: 1 },
  hotTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  hotPrice: { color: '#FDE68A', fontWeight: '900', fontSize: 18 },
  timer: { alignSelf: 'flex-start', backgroundColor: '#1F1A3DDD', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 4 },
  timerCorner: { margin: 8 },
  timerUrgent: { backgroundColor: '#DC2626' },
  timerText: { color: '#fff', fontWeight: '800', fontSize: 12, fontVariant: ['tabular-nums'] },
  chips: { gap: 8, paddingRight: 16 },
  chip: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  chipOff: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: theme.line },
  chipText: { color: theme.muted, fontWeight: '700', fontSize: 13.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: { width: '48.4%', backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: theme.line, ...theme.shadow },
  cardImg: { height: 128, backgroundColor: theme.soft },
  cardImgStyle: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  cardBody: { padding: 12, gap: 3 },
  cardCat: { color: theme.dim, fontSize: 11.5, fontWeight: '700' },
  cardTitle: { color: theme.ink, fontSize: 15, fontWeight: '800', minHeight: 38 },
  cardPrice: { color: theme.primary, fontSize: 19, fontWeight: '900' },
  empty: { backgroundColor: '#fff', borderRadius: 22, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: theme.line },
  emptyTitle: { color: theme.ink, fontWeight: '800', fontSize: 16 },
  emptyText: { color: theme.muted, marginTop: 4, textAlign: 'center' },
  trust: { borderRadius: 24, padding: 18, gap: 6 },
  trustTitle: { color: '#fff', fontWeight: '900', fontSize: 17, marginBottom: 2 },
  trustLine: { color: '#FFFFFFEE', fontSize: 13.5, lineHeight: 19 },
});
