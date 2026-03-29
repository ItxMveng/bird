import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../services/api';
import { useAppData } from '../context/AppDataContext';
import { BirdButton, BirdCard, BirdScreen, BirdTag, palette } from '../components/ui-kit';

export function AdminDashboardScreen({ onBack }: { onBack: () => void }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { disputes, auctions, resolveDisputeLocal } = useAppData();

  const metrics = useMemo(() => {
    const openCount = disputes.filter((item) => item.status === 'open').length;
    const resolvedCount = disputes.filter((item) => item.status === 'resolved').length;
    return {
      toValidate: auctions.length,
      openDisputes: openCount,
      reports: openCount + resolvedCount,
      resolvedDisputes: resolvedCount,
    };
  }, [disputes, auctions.length]);

  const resolve = async (disputeId: string, resolution: 'refund' | 'pay_seller') => {
    setLoadingId(disputeId);
    setFeedback(null);
    try {
      await resolveDisputeLocal(disputeId, resolution);
      try {
        await api.resolveDispute({ disputeId, resolution });
        setFeedback(`Litige ${disputeId} resolu et synchronise.`);
      } catch {
        setFeedback(`Litige ${disputeId} resolu localement (sync API en attente).`);
      }
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <BirdScreen title="Moderation Dashboard" subtitle="Pilotage des encheres et litiges." onBack={onBack}>
      <View style={styles.statsColumn}>
        <BirdCard style={styles.statCard}>
          <View style={styles.statHead}>
            <Text style={styles.statTitle}>Encheres a valider</Text>
            <Text style={[styles.trend, styles.trendUp]}>+12%</Text>
          </View>
          <Text style={styles.statValue}>{metrics.toValidate}</Text>
          <Text style={styles.statMeta}>Mises en attente de moderation</Text>
        </BirdCard>

        <BirdCard style={styles.statCard}>
          <View style={styles.statHead}>
            <Text style={styles.statTitle}>Litiges ouverts</Text>
            <Text style={[styles.trend, styles.trendWarn]}>+5%</Text>
          </View>
          <Text style={styles.statValue}>{metrics.openDisputes}</Text>
          <Text style={styles.statMeta}>Resolution moyenne: 4.2 jours</Text>
        </BirdCard>

        <BirdCard style={styles.statCard}>
          <View style={styles.statHead}>
            <Text style={styles.statTitle}>Signalements</Text>
            <Text style={[styles.trend, styles.trendGood]}>-2%</Text>
          </View>
          <Text style={styles.statValue}>{metrics.reports}</Text>
          <Text style={styles.statMeta}>Traites: {metrics.resolvedDisputes}</Text>
        </BirdCard>
      </View>

      <Text style={styles.sectionTitle}>Litiges en cours</Text>
      {disputes.map((dispute) => {
        const isOpen = dispute.status === 'open';
        const isLoading = loadingId === dispute.id;
        return (
          <BirdCard key={dispute.id}>
            <View style={styles.disputeHead}>
              <Text style={styles.disputeTitle}>Litige {dispute.id}</Text>
              <BirdTag label={dispute.status} selected={isOpen} />
            </View>
            <Text style={styles.disputeMeta}>Transaction: {dispute.transactionId}</Text>
            <Text style={styles.disputeReason}>{dispute.reason}</Text>
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionBtn, styles.refundBtn]}
                onPress={() => resolve(dispute.id, 'refund')}
                disabled={!isOpen || isLoading}
              >
                <Text style={styles.actionText}>Rembourser</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.payBtn]}
                onPress={() => resolve(dispute.id, 'pay_seller')}
                disabled={!isOpen || isLoading}
              >
                <Text style={styles.actionText}>Payer vendeur</Text>
              </Pressable>
            </View>
          </BirdCard>
        );
      })}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      <BirdButton label="Retour a l'accueil" onPress={onBack} variant="ghost" />
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  statsColumn: {
    gap: 12,
  },
  statCard: {
    minHeight: 146,
    justifyContent: 'space-between',
  },
  statHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statTitle: {
    color: '#94a3b8',
    fontSize: 16,
    fontFamily: 'sans-serif-medium',
  },
  trend: {
    fontSize: 14,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontFamily: 'sans-serif-medium',
  },
  trendUp: {
    color: '#4ade80',
    backgroundColor: '#052e2b',
  },
  trendWarn: {
    color: '#fb7185',
    backgroundColor: '#3a1820',
  },
  trendGood: {
    color: '#34d399',
    backgroundColor: '#064e3b',
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 36,
    fontFamily: 'sans-serif-medium',
  },
  statMeta: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: 'sans-serif',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 20,
    fontFamily: 'sans-serif-medium',
  },
  disputeHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  disputeTitle: {
    color: palette.text,
    fontSize: 16,
    fontFamily: 'sans-serif-medium',
  },
  disputeMeta: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'sans-serif',
  },
  disputeReason: {
    color: '#cbd5e1',
    fontSize: 13,
    fontFamily: 'sans-serif',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundBtn: {
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#7f1d1d',
  },
  payBtn: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    backgroundColor: '#1d3f66',
  },
  actionText: {
    color: '#f8fafc',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
  feedback: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'sans-serif',
  },
});
