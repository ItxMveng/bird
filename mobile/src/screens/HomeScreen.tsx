import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { Auction, AuctionCategory } from '../types';
import { formatXaf } from '../utils/format';
import { theme } from '../theme';

const categories: Array<{ id: AuctionCategory | 'all'; label: string }> = [
  { id: 'all', label: 'Tout' },
  { id: 'phones', label: 'Téléphones' },
  { id: 'electronics', label: 'Informatique' },
  { id: 'moto', label: 'Motos' },
  { id: 'appliances', label: 'Maison' },
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
  onOpenSearch,
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

  const running = useMemo(() => auctions.filter((a) => new Date(a.endAt).getTime() > now), [auctions, Math.floor(now / 30000)]);
  const list = useMemo(
    () => (active === 'all' ? running : running.filter((a) => a.category === active)).sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime()),
    [running, active],
  );
  const firstName = (user?.name ?? '').split(' ')[0];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />
      <SafeAreaView style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>Bird</Text>
            <Text style={styles.hello}>{firstName ? `Bonjour ${firstName}` : 'Bienvenue'}</Text>
          </View>
          <Pressable style={styles.walletChip} onPress={onOpenWallet} accessibilityRole="button" accessibilityLabel="Portefeuille">
            <Feather name="credit-card" size={15} color={theme.ink} />
            <Text style={styles.walletText}>{formatXaf(wallet.balance)}</Text>
          </Pressable>
        </View>
        <Pressable style={styles.search} onPress={onOpenSearch} accessibilityRole="search">
          <Feather name="search" size={17} color={theme.dim} />
          <Text style={styles.searchText}>Rechercher une annonce</Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {categories.map((c) => {
            const on = c.id === active;
            return (
              <Pressable key={c.id} onPress={() => setActive(c.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.tab, on && styles.tabOn]}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="tag" size={28} color={theme.dim} />
            <Text style={styles.emptyTitle}>Aucune enchère en cours</Text>
            <Text style={styles.emptyText}>{active === 'all' ? 'Publiez la première annonce de la communauté.' : 'Aucune annonce dans cette catégorie pour le moment.'}</Text>
            <Pressable style={styles.emptyBtn} onPress={onOpenCreateAuction}>
              <Text style={styles.emptyBtnText}>Publier une annonce</Text>
            </Pressable>
          </View>
        ) : (
          list.map((a) => {
            const c = formatCountdown(a.endAt, now);
            return (
              <Pressable key={a.id} style={styles.row} onPress={() => onOpenAuction(a)} accessibilityRole="button" accessibilityLabel={`${a.title}, ${formatXaf(a.currentPrice)}`}>
                <Image source={{ uri: a.imageUrl }} style={styles.thumb} resizeMode="cover" />
                <View style={styles.rowBody}>
                  <Text style={styles.rowMeta}>{labelByCategory[a.category]} · {a.city}</Text>
                  <Text style={styles.rowTitle} numberOfLines={2}>{a.title}</Text>
                  <View style={styles.rowFoot}>
                    <Text style={styles.rowPrice}>{formatXaf(a.currentPrice)}</Text>
                    <View style={[styles.timer, c.urgent && styles.timerUrgent]}>
                      <Feather name="clock" size={12} color={c.urgent ? theme.danger : theme.muted} />
                      <Text style={[styles.timerText, c.urgent && { color: theme.danger }]}>{c.text}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: { backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.line, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 14 },
  brand: { color: theme.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  hello: { color: theme.muted, fontSize: 13, marginTop: 1 },
  walletChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: theme.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.surface },
  walletText: { color: theme.ink, fontWeight: '600', fontSize: 13, fontVariant: ['tabular-nums'] },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 14, backgroundColor: theme.soft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  searchText: { color: theme.dim, fontSize: 15 },
  tabs: { paddingHorizontal: 16, gap: 22, paddingTop: 12 },
  tab: { paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: theme.ink },
  tabText: { color: theme.muted, fontSize: 14, fontWeight: '500' },
  tabTextOn: { color: theme.ink, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 110, gap: 10, maxWidth: 720, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', gap: 14, backgroundColor: theme.surface, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.line, padding: 10, ...theme.shadow },
  thumb: { width: 96, height: 96, borderRadius: 10, backgroundColor: theme.soft },
  rowBody: { flex: 1, justifyContent: 'space-between' },
  rowMeta: { color: theme.dim, fontSize: 12, fontWeight: '500' },
  rowTitle: { color: theme.ink, fontSize: 15, fontWeight: '600', lineHeight: 20, marginTop: 2 },
  rowFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  rowPrice: { color: theme.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.soft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  timerUrgent: { backgroundColor: theme.dangerSoft },
  timerText: { color: theme.muted, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 56, paddingHorizontal: 24 },
  emptyTitle: { color: theme.ink, fontSize: 17, fontWeight: '700', marginTop: 6 },
  emptyText: { color: theme.muted, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  emptyBtn: { marginTop: 10, backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
});
