import React, { useMemo, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { Auction, AuctionCategory } from '../types';
import { BirdButton, BirdCard, BirdScreen, palette } from '../components/ui-kit';
import { formatXaf, getHoursLeft } from '../utils/format';

const categories: Array<{ id: AuctionCategory; label: string }> = [
  { id: 'phones', label: 'Telephones' },
  { id: 'electronics', label: 'Informatique' },
  { id: 'moto', label: 'Motos' },
  { id: 'appliances', label: 'Maison' },
];

const labelByCategory: Record<AuctionCategory, string> = {
  phones: 'Telephones',
  electronics: 'Informatique',
  moto: 'Motos',
  appliances: 'Maison',
};

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
  const [activeCategory, setActiveCategory] = useState<AuctionCategory>('phones');

  const activeAuctions = useMemo(
    () =>
      auctions
        .filter((auction) => auction.category === activeCategory)
        .sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime())
        .slice(0, 8),
    [auctions, activeCategory],
  );

  const fallbackAuctions = useMemo(
    () => [...auctions].sort((a, b) => b.currentPrice - a.currentPrice).slice(0, 6),
    [auctions],
  );

  const displayedAuctions = activeAuctions.length > 0 ? activeAuctions : fallbackAuctions;

  return (
    <BirdScreen title="Encheres Cameroon" subtitle={`Bienvenue ${user?.name ?? 'vendeur'}. Plateforme d'encheres securisee.`}>
      <BirdCard style={styles.walletHero}>
        <View style={styles.walletRow}>
          <View>
            <Text style={styles.walletLabel}>Portefeuille Escrow</Text>
            <Text style={styles.walletValue}>{formatXaf(wallet.balance)}</Text>
          </View>
          <Pressable style={styles.walletBtn} onPress={onOpenWallet}>
            <Text style={styles.walletBtnText}>Recharger</Text>
          </Pressable>
        </View>
      </BirdCard>

      <Pressable style={styles.searchBar} onPress={onOpenSearch}>
        <Text style={styles.searchText}>Rechercher un article...</Text>
        <Text style={styles.searchAction}>Filtres</Text>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <Pressable onPress={onOpenSearch}>
          <Text style={styles.linkText}>Voir tout</Text>
        </Pressable>
      </View>
      <View style={styles.categoriesRow}>
        {categories.map((item) => {
          const active = item.id === activeCategory;
          return (
            <Pressable key={item.id} style={[styles.categoryChip, active ? styles.categoryChipActive : undefined]} onPress={() => setActiveCategory(item.id)}>
              <Text style={[styles.categoryText, active ? styles.categoryTextActive : undefined]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Encheres en cours</Text>
        <Text style={styles.escrowText}>Garantie Escrow</Text>
      </View>

      <View style={styles.grid}>
        {displayedAuctions.map((auction) => (
          <Pressable key={auction.id} style={styles.auctionCard} onPress={() => onOpenAuction(auction)}>
            <ImageBackground source={{ uri: auction.imageUrl }} style={styles.cardImage} imageStyle={styles.cardImageStyle}>
              <View style={styles.secureTag}>
                <Text style={styles.secureTagText}>SECURE</Text>
              </View>
              <View style={styles.timerTag}>
                <Text style={styles.timerText}>{`${Math.max(0, getHoursLeft(auction.endAt))}h`}</Text>
              </View>
            </ImageBackground>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>{auction.title}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>{labelByCategory[auction.category]}</Text>
              <Text style={styles.cardPrice}>{formatXaf(auction.currentPrice)}</Text>
              <BirdButton label="Miser" onPress={() => onOpenAuction(auction)} />
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.quickRow}>
        <Pressable style={styles.quickBtn} onPress={onOpenCreateAuction}>
          <Text style={styles.quickBtnText}>Creer une enchere</Text>
        </Pressable>
        <Pressable style={styles.quickBtn} onPress={onOpenTransactions}>
          <Text style={styles.quickBtnText}>Mes mises</Text>
        </Pressable>
        <Pressable style={styles.quickBtn} onPress={onOpenMessages}>
          <Text style={styles.quickBtnText}>Messages</Text>
        </Pressable>
      </View>
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  walletHero: {
    borderColor: '#2563eb55',
    backgroundColor: '#1847b8',
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  walletLabel: {
    color: '#bfdbfe',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'sans-serif-medium',
  },
  walletValue: {
    color: '#eff6ff',
    fontSize: 28,
    marginTop: 3,
    fontFamily: 'sans-serif-medium',
  },
  walletBtn: {
    borderRadius: 12,
    backgroundColor: '#ffffff29',
    borderWidth: 1,
    borderColor: '#ffffff36',
    minHeight: 42,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  walletBtnText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontFamily: 'sans-serif-medium',
  },
  searchBar: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2c4562',
    backgroundColor: '#1a2f48',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchText: {
    color: '#9fb0c7',
    fontSize: 16,
    fontFamily: 'sans-serif',
  },
  searchAction: {
    color: '#60a5fa',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 20,
    fontFamily: 'sans-serif-medium',
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 14,
    fontFamily: 'sans-serif-medium',
  },
  escrowText: {
    color: '#22c55e',
    fontSize: 14,
    fontFamily: 'sans-serif-medium',
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d4663',
    backgroundColor: '#0d2238',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryChipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  categoryText: {
    color: '#bfd0e6',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
  categoryTextActive: {
    color: '#eff6ff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  auctionCard: {
    width: '48.2%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2b4664',
    backgroundColor: '#0b2237',
  },
  cardImage: {
    height: 128,
    justifyContent: 'space-between',
    padding: 8,
  },
  cardImageStyle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  secureTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#0a131dba',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  secureTagText: {
    color: '#86efac',
    fontSize: 10,
    fontFamily: 'sans-serif-medium',
  },
  timerTag: {
    alignSelf: 'stretch',
    borderRadius: 999,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    paddingVertical: 5,
  },
  timerText: {
    color: '#fee2e2',
    fontSize: 12,
    fontFamily: 'sans-serif-medium',
  },
  cardBody: {
    padding: 10,
    gap: 4,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 16,
    fontFamily: 'sans-serif-medium',
  },
  cardMeta: {
    color: '#9fb0c7',
    fontSize: 12,
    fontFamily: 'sans-serif',
  },
  cardPrice: {
    color: '#facc15',
    fontSize: 22,
    fontFamily: 'sans-serif-medium',
    marginBottom: 3,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334e6d',
    backgroundColor: '#102b42',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'sans-serif-medium',
  },
});

