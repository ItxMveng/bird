import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppData } from '../context/AppDataContext';
import { Transaction } from '../types';
import { BirdButton, BirdScreen, palette } from '../components/ui-kit';
import { formatXaf } from '../utils/format';

type BidTab = 'enCours' | 'terminees';

export function TransactionsScreen({ onBack, onOpenTransaction }: { onBack: () => void; onOpenTransaction: (tx: Transaction) => void }) {
  const { transactions, auctions } = useAppData();
  const [activeTab, setActiveTab] = useState<BidTab>('enCours');

  const filtered = useMemo(() => {
    if (activeTab === 'enCours') return transactions.filter((tx) => tx.status === 'blocked' || tx.status === 'delivered' || tx.status === 'dispute');
    return transactions.filter((tx) => tx.status === 'confirmed' || tx.status === 'refunded');
  }, [transactions, activeTab]);

  return (
    <BirdScreen title="Mes Mises" subtitle="Suivez vos enchères en cours et terminées." onBack={onBack}>
      <View style={styles.tabsRow}>
        <Pressable style={styles.tabButton} onPress={() => setActiveTab('enCours')}>
          <Text style={[styles.tabText, activeTab === 'enCours' ? styles.tabTextActive : undefined]}>En cours</Text>
          {activeTab === 'enCours' ? <View style={styles.tabUnderline} /> : null}
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => setActiveTab('terminees')}>
          <Text style={[styles.tabText, activeTab === 'terminees' ? styles.tabTextActive : undefined]}>Terminées</Text>
          {activeTab === 'terminees' ? <View style={styles.tabUnderline} /> : null}
        </Pressable>
      </View>

      {filtered.map((tx) => {
        const auction = auctions.find((item) => item.id === tx.auctionId);
        const isOverbid = auction ? tx.amount < auction.currentPrice : false;
        const statusLabel = isOverbid ? 'Surenchéri' : tx.status === 'confirmed' ? 'Gagné' : tx.status === 'refunded' ? 'Remboursé' : 'En tête';

        return (
          <Pressable key={tx.id} style={styles.bidCard} onPress={() => onOpenTransaction(tx)}>
            <View style={styles.cardTop}>
              <Image source={{ uri: auction?.imageUrl ?? 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=500&q=80' }} style={styles.thumb} />
              <View style={styles.cardMain}>
                <View style={styles.headerLine}>
                  <Text style={styles.title} numberOfLines={1}>{auction?.title ?? `Enchère ${tx.auctionId}`}</Text>
                  <View style={[styles.statusPill, isOverbid ? styles.statusPillWarn : styles.statusPillOk]}>
                    <Text style={[styles.statusText, isOverbid ? styles.statusTextWarn : styles.statusTextOk]}>{statusLabel}</Text>
                  </View>
                </View>

                <Text style={styles.countdown}>Termine dans: {auction ? '2h 15m' : '--'}</Text>

                <View style={styles.pricesRow}>
                  <View style={styles.priceItem}>
                    <Text style={styles.priceLabel}>Prix actuel</Text>
                    <Text style={styles.priceValue}>{formatXaf(auction?.currentPrice ?? tx.amount)}</Text>
                  </View>
                  <View style={styles.sep} />
                  <View style={styles.priceItem}>
                    <Text style={styles.priceLabel}>Votre mise</Text>
                    <Text style={[styles.priceValue, styles.myBid]}>{formatXaf(tx.amount)}</Text>
                  </View>
                </View>

                {isOverbid && activeTab === 'enCours' ? (
                  <BirdButton label="Miser à nouveau" onPress={() => onOpenTransaction(tx)} />
                ) : null}
              </View>
            </View>
          </Pressable>
        );
      })}

      {filtered.length === 0 ? <Text style={styles.emptyText}>Aucune mise dans cette section.</Text> : null}
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1f3a5b',
    marginBottom: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 18,
    fontFamily: 'sans-serif-medium',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  tabUnderline: {
    width: '70%',
    height: 3,
    borderRadius: 999,
    marginTop: 8,
    backgroundColor: '#2563eb',
  },
  bidCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#244566',
    backgroundColor: '#0b2237',
    padding: 12,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 10,
  },
  thumb: {
    width: 92,
    height: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#355577',
  },
  cardMain: {
    flex: 1,
    gap: 8,
  },
  headerLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  title: {
    color: palette.text,
    fontSize: 18,
    flex: 1,
    fontFamily: 'sans-serif-medium',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusPillOk: {
    borderColor: '#10b981',
    backgroundColor: '#052e2b',
  },
  statusPillWarn: {
    borderColor: '#ef4444',
    backgroundColor: '#3a1820',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'sans-serif-medium',
  },
  statusTextOk: {
    color: '#34d399',
  },
  statusTextWarn: {
    color: '#f87171',
  },
  countdown: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'sans-serif',
  },
  pricesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceItem: {
    flex: 1,
    gap: 2,
  },
  sep: {
    width: 1,
    height: 34,
    backgroundColor: '#2d4663',
    marginHorizontal: 8,
  },
  priceLabel: {
    color: '#64748b',
    fontSize: 11,
    textTransform: 'uppercase',
    fontFamily: 'sans-serif',
  },
  priceValue: {
    color: '#e2e8f0',
    fontSize: 15,
    fontFamily: 'sans-serif-medium',
  },
  myBid: {
    color: '#3b82f6',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'sans-serif',
    marginTop: 10,
  },
});
