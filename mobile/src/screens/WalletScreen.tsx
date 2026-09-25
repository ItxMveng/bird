import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppData } from '../context/AppDataContext';
import { BirdButton, BirdCard, BirdInput, BirdScreen, palette } from '../components/ui-kit';
import { formatXaf } from '../utils/format';

export function WalletScreen({ onBack }: { onBack: () => void }) {
  const { wallet, transactions, topUpWalletLocal } = useAppData();
  const [amount, setAmount] = useState('10000');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activities = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.id.localeCompare(a.id))
        .slice(0, 6)
        .map((tx) => ({
          id: tx.id,
          title:
            tx.status === 'blocked'
              ? 'Enchere bloquee'
              : tx.status === 'delivered'
                ? 'Paiement en transit'
                : tx.status === 'confirmed'
                  ? 'Liberation de fonds'
                  : tx.status === 'refunded'
                    ? 'Remboursement'
                    : 'Litige actif',
          amount: tx.status === 'confirmed' || tx.status === 'refunded' ? `+${formatXaf(tx.amount)}` : `-${formatXaf(tx.amount)}`,
          status: tx.status,
        })),
    [transactions],
  );

  const handleTopUp = async () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFeedback('Le montant doit etre superieur a 0.');
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      await topUpWalletLocal(numericAmount);
      setFeedback('Redirection vers le paiement sécurisé…');
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BirdScreen title="Portefeuille" subtitle="Solde disponible et fonds bloqués en séquestre" onBack={onBack}>
      <BirdCard style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Solde disponible</Text>
        <Text style={styles.balanceValue}>{formatXaf(wallet.balance)}</Text>

        <View style={styles.balanceDivider} />

        <View style={styles.balanceStats}>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Bloqué en séquestre</Text>
            <Text style={styles.balanceStatValue}>{formatXaf(wallet.blocked)}</Text>
          </View>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Achats en cours</Text>
            <Text style={styles.balanceStatValue}>{transactions.filter((tx) => tx.status === 'blocked').length}</Text>
          </View>
        </View>
      </BirdCard>

      <BirdCard>
        <Text style={styles.blockTitle}>Recharger mon portefeuille</Text>
        <View style={styles.providerRow}>
          {[5000, 10000, 25000, 50000].map((v) => (
            <Pressable key={v} style={[styles.providerBtn, Number(amount) === v ? styles.providerBtnActive : undefined]} onPress={() => setAmount(String(v))}>
              <Text style={[styles.providerText, Number(amount) === v ? styles.providerTextActive : undefined]}>{v.toLocaleString('fr-FR')}</Text>
            </Pressable>
          ))}
        </View>
        <BirdInput label="Montant (XAF)" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <BirdButton label="Payer par Mobile Money ou carte" onPress={handleTopUp} disabled={loading} loading={loading} />
        <Text style={styles.securityNote}>Paiement sécurisé par Flutterwave (MTN Mobile Money, Orange Money, carte). Votre solde est crédité dès la confirmation du paiement.</Text>
      </BirdCard>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Activité récente</Text>
      </View>
      <View style={styles.activitiesColumn}>
        {activities.map((item) => (
          <View key={item.id} style={styles.activityCard}>
            <View style={styles.activityMain}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityMeta}>Transaction #{item.id}</Text>
            </View>
            <View style={styles.activityRight}>
              <Text style={[styles.activityAmount, item.amount.startsWith('+') ? styles.amountIn : styles.amountOut]}>{item.amount}</Text>
              <Text style={styles.statusPill}>{item.status}</Text>
            </View>
          </View>
        ))}
      </View>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  balanceLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  balanceValue: {
    color: '#0F172A',
    fontSize: 34,
    fontWeight: '600',
  },
  balanceDivider: {
    height: 1,
    backgroundColor: '#ffffff33',
  },
  balanceStats: {
    flexDirection: 'row',
    gap: 12,
  },
  balanceStat: {
    flex: 1,
    gap: 2,
  },
  balanceStatLabel: {
    color: '#0F172A',
    fontSize: 11,
  },
  balanceStatValue: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '600',
  },
  blockTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '600',
  },
  providerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  providerBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerBtnActive: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  providerText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  providerTextActive: {
    color: '#FFFFFF',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '600',
  },
  activitiesColumn: {
    gap: 10,
  },
  activityCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#111827',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  activityMain: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
  },
  activityMeta: {
    color: '#111827',
    fontSize: 12,
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  activityAmount: {
    fontSize: 19,
    fontWeight: '600',
  },
  amountIn: {
    color: '#047857',
  },
  amountOut: {
    color: '#0F172A',
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F5F5F4',
    color: '#111827',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  securityNote: { color: palette.textDim, fontSize: 12.5, lineHeight: 18 },
  feedback: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});

