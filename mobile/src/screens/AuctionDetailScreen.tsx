import React, { useMemo, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../services/api';
import { Auction } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { BirdButton, BirdCard, BirdScreen, palette } from '../components/ui-kit';
import { formatDateTime, formatXaf, getHoursLeft } from '../utils/format';

export function AuctionDetailScreen({ auction, onBack }: { auction: Auction; onBack: () => void }) {
  const { user } = useAuth();
  const { auctions, bids, profiles, placeBidLocal } = useAppData();
  const [amount, setAmount] = useState(String(auction.currentPrice + 1000));
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null);

  const liveAuction = auctions.find((item) => item.id === auction.id) ?? auction;
  const sellerProfile = profiles[liveAuction.sellerId];
  const liveBids = useMemo(
    () =>
      bids
        .filter((bid) => bid.auctionId === liveAuction.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20),
    [bids, liveAuction.id],
  );
  const minimumBid = useMemo(() => liveAuction.currentPrice + 1000, [liveAuction.currentPrice]);

  const submitBid = async () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) {
      setFeedback({ tone: 'error', text: 'Montant invalide.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      await placeBidLocal({
        auctionId: liveAuction.id,
        amount: numericAmount,
        bidderId: user?.uid ?? 'user-demo',
        bidderName: user?.name ?? 'Acheteur',
      });

      try {
        await api.placeBid({
          auctionId: liveAuction.id,
          amount: numericAmount,
          idempotencyKey: `bid-${liveAuction.id}-${Date.now()}`,
        });
        setFeedback({ tone: 'success', text: 'Votre enchere est publiee en temps reel.' });
      } catch {
        setFeedback({ tone: 'info', text: 'Enchere enregistree via Firebase. Synchronisation API en attente.' });
      }

      setAmount(String(numericAmount + 1000));
    } catch (error) {
      setFeedback({ tone: 'error', text: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <BirdScreen title="Details de l'Enchere" subtitle="Produit, vendeur et encheres live." onBack={onBack}>
      <ImageBackground source={{ uri: liveAuction.imageUrl }} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
        <View style={styles.heroOverlay} />
        <View style={styles.heroTimer}>
          <Text style={styles.heroTimerText}>{`${Math.max(0, getHoursLeft(liveAuction.endAt))}h restantes`}</Text>
        </View>
      </ImageBackground>

      <View style={styles.metaLine}>
        <Text style={styles.badge}>NEUF - SCELLE</Text>
        <Text style={styles.sellerBadge}>Vendeur verifie</Text>
      </View>

      <Text style={styles.title}>{liveAuction.title}</Text>
      <Text style={styles.sellerText}>
        Vendu par {sellerProfile?.name ?? liveAuction.sellerId}
        {sellerProfile?.city ? ` - ${sellerProfile.city}` : ''}
      </Text>

      <BirdCard style={styles.bidSummaryCard}>
        <View style={styles.bidSummaryCol}>
          <Text style={styles.summaryLabel}>Enchere actuelle</Text>
          <Text style={styles.summaryValue}>{formatXaf(liveAuction.currentPrice)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.bidSummaryCol}>
          <Text style={styles.summaryLabel}>Nombre d'offres</Text>
          <Text style={styles.summaryValue}>{liveBids.length}</Text>
        </View>
      </BirdCard>

      <View style={styles.bidRow}>
        <View style={styles.bidInputWrap}>
          <Text style={styles.bidInputPrefix}>XAF</Text>
          <TextInput
            value={amount}
            onChangeText={(value) => setAmount(value.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder={`${minimumBid}`}
            placeholderTextColor="#64748b"
            style={styles.bidInput}
          />
        </View>
        <Pressable style={[styles.bidBtn, loading ? styles.bidBtnDisabled : undefined]} onPress={submitBid} disabled={loading || Number(amount) < minimumBid}>
          <Text style={styles.bidBtnText}>{loading ? '...' : 'Encherir'}</Text>
        </Pressable>
      </View>
      <Text style={styles.bidHint}>Increment minimum: {formatXaf(minimumBid - liveAuction.currentPrice)}</Text>

      {feedback ? (
        <View
          style={[
            styles.feedback,
            feedback.tone === 'success'
              ? styles.feedbackSuccess
              : feedback.tone === 'error'
                ? styles.feedbackError
                : styles.feedbackInfo,
          ]}
        >
          <Text style={styles.feedbackText}>{feedback.text}</Text>
        </View>
      ) : null}

      <BirdCard>
        <Text style={styles.sectionTitle}>Description du produit</Text>
        <Text style={styles.description}>{liveAuction.description}</Text>
        <View style={styles.specGrid}>
          <View style={styles.specCard}>
            <Text style={styles.specKey}>Categorie</Text>
            <Text style={styles.specValue}>{liveAuction.category}</Text>
          </View>
          <View style={styles.specCard}>
            <Text style={styles.specKey}>Ville</Text>
            <Text style={styles.specValue}>{liveAuction.city}</Text>
          </View>
          <View style={styles.specCard}>
            <Text style={styles.specKey}>Fin de vente</Text>
            <Text style={styles.specValue}>{formatDateTime(liveAuction.endAt)}</Text>
          </View>
          <View style={styles.specCard}>
            <Text style={styles.specKey}>Vendeur</Text>
            <Text style={styles.specValue}>{sellerProfile?.isPro ? 'PRO' : 'Standard'}</Text>
          </View>
        </View>
      </BirdCard>

      <BirdCard>
        <Text style={styles.sectionTitle}>Encheres en temps reel</Text>
        {liveBids.length === 0 ? (
          <Text style={styles.emptyText}>Aucune enchere pour le moment.</Text>
        ) : (
          <ScrollView style={styles.bidList} nestedScrollEnabled>
            {liveBids.map((bid) => (
              <View key={bid.id} style={styles.bidItem}>
                <View>
                  <Text style={styles.bidder}>{bid.bidderName ?? bid.bidderId}</Text>
                  <Text style={styles.bidDate}>{formatDateTime(bid.createdAt)}</Text>
                </View>
                <Text style={styles.bidAmount}>{formatXaf(bid.amount)}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </BirdCard>

      <View style={styles.escrowBar}>
        <Text style={styles.escrowTitle}>Escrow securise active</Text>
        <Text style={styles.escrowText}>Paiement bloque jusqu'a confirmation de la livraison.</Text>
      </View>
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  heroImage: {
    height: 260,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  heroImageStyle: {
    borderRadius: 18,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#03132488',
  },
  heroTimer: {
    alignSelf: 'flex-end',
    margin: 12,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroTimerText: {
    color: '#fee2e2',
    fontSize: 14,
    fontFamily: 'sans-serif-medium',
  },
  metaLine: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  badge: {
    color: '#3b82f6',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2563eb55',
    backgroundColor: '#1d4ed820',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    textTransform: 'uppercase',
    fontFamily: 'sans-serif-medium',
  },
  sellerBadge: {
    color: '#93c5fd',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
  title: {
    color: palette.text,
    fontSize: 28,
    lineHeight: 38,
    fontFamily: 'sans-serif-medium',
  },
  sellerText: {
    color: '#cbd5e1',
    fontSize: 15,
    textDecorationLine: 'underline',
    fontFamily: 'sans-serif',
  },
  bidSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bidSummaryCol: {
    flex: 1,
    gap: 2,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    textTransform: 'uppercase',
    fontFamily: 'sans-serif-medium',
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontFamily: 'sans-serif-medium',
  },
  summaryDivider: {
    width: 1,
    height: 45,
    backgroundColor: '#1f3a5b',
  },
  bidRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bidInputWrap: {
    flex: 1,
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f4763',
    backgroundColor: '#0c2238',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bidInputPrefix: {
    color: '#9fb0c7',
    fontSize: 14,
    fontFamily: 'sans-serif-medium',
  },
  bidInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 21,
    paddingVertical: 0,
    fontFamily: 'sans-serif-medium',
  },
  bidBtn: {
    minWidth: 124,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  bidBtnDisabled: {
    opacity: 0.5,
  },
  bidBtnText: {
    color: '#e2e8f0',
    fontSize: 18,
    fontFamily: 'sans-serif-medium',
  },
  bidHint: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'right',
    fontFamily: 'sans-serif',
  },
  feedback: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  feedbackSuccess: {
    backgroundColor: '#134e4a',
    borderColor: '#2dd4bf',
  },
  feedbackError: {
    backgroundColor: '#7f1d1d',
    borderColor: '#f87171',
  },
  feedbackInfo: {
    backgroundColor: '#1e3a8a',
    borderColor: '#60a5fa',
  },
  feedbackText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: 'sans-serif-medium',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 20,
    fontFamily: 'sans-serif-medium',
  },
  description: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 23,
    fontFamily: 'sans-serif',
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  specCard: {
    width: '48.5%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#244566',
    backgroundColor: '#0d2238',
    padding: 10,
    gap: 2,
  },
  specKey: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'sans-serif',
  },
  specValue: {
    color: '#f1f5f9',
    fontSize: 18,
    fontFamily: 'sans-serif-medium',
  },
  bidList: {
    maxHeight: 240,
  },
  bidItem: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2b4664',
    backgroundColor: '#0d2238',
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  bidder: {
    color: '#e2e8f0',
    fontSize: 14,
    fontFamily: 'sans-serif-medium',
  },
  bidDate: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'sans-serif',
  },
  bidAmount: {
    color: '#60a5fa',
    fontSize: 15,
    fontFamily: 'sans-serif-medium',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'sans-serif',
  },
  escrowBar: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    backgroundColor: '#0b2a4f',
    padding: 12,
    gap: 2,
  },
  escrowTitle: {
    color: '#93c5fd',
    fontSize: 16,
    fontFamily: 'sans-serif-medium',
  },
  escrowText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'sans-serif',
  },
});

