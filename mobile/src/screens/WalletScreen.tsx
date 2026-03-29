import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppData } from '../context/AppDataContext';
import { BirdButton, BirdCard, BirdInput, BirdScreen, palette } from '../components/ui-kit';
import { formatXaf } from '../utils/format';

type PaymentProvider = 'momo' | 'orange';

export function WalletScreen({ onBack }: { onBack: () => void }) {
  const { wallet, transactions, topUpWalletLocal } = useAppData();
  const [amount, setAmount] = useState('10000');
  const [provider, setProvider] = useState<PaymentProvider>('momo');
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
      setFeedback(`Depot ${provider === 'momo' ? 'Mobile Money' : 'Orange Money'} reussi.`);
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BirdScreen title="Mon Portefeuille" subtitle="Solde disponible, escrow et activites." onBack={onBack}>
      <BirdCard style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Solde disponible</Text>
        <Text style={styles.balanceValue}>{formatXaf(wallet.balance)}</Text>

        <View style={styles.balanceDivider} />

        <View style={styles.balanceStats}>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Solde bloque (Escrow)</Text>
            <Text style={styles.balanceStatValue}>{formatXaf(wallet.blocked)}</Text>
          </View>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Encheres actives</Text>
            <Text style={styles.balanceStatValue}>{transactions.filter((tx) => tx.status === 'blocked').length}</Text>
          </View>
        </View>
      </BirdCard>

      <BirdCard>
        <Text style={styles.blockTitle}>Recharger mon compte</Text>
        <View style={styles.providerRow}>
          <Pressable style={[styles.providerBtn, provider === 'momo' ? styles.providerBtnActive : undefined]} onPress={() => setProvider('momo')}>
            <Text style={[styles.providerText, provider === 'momo' ? styles.providerTextActive : undefined]}>MobileMoney</Text>
          </Pressable>
          <Pressable style={[styles.providerBtn, provider === 'orange' ? styles.providerBtnActive : undefined]} onPress={() => setProvider('orange')}>
            <Text style={[styles.providerText, provider === 'orange' ? styles.providerTextActive : undefined]}>OrangeMoney</Text>
          </Pressable>
        </View>

        <BirdInput
          label="Montant (XAF)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <BirdButton label={loading ? 'Traitement...' : 'Recharger'} onPress={handleTopUp} disabled={loading} loading={loading} />
      </BirdCard>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Activites recentes</Text>
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
      {activities.length === 0 ? <Text style={styles.emptyText}>Aucune activité récente pour l’instant.</Text> : null}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    borderColor: '#2563eb55',
    backgroundColor: '#1f55d4',
    gap: 10,
  },
  balanceLabel: {
    color: '#bfdbfe',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
  balanceValue: {
    color: '#eff6ff',
    fontSize: 34,
    fontFamily: 'sans-serif-medium',
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
    color: '#dbeafe',
    fontSize: 11,
    fontFamily: 'sans-serif',
  },
  balanceStatValue: {
    color: '#f8fafc',
    fontSize: 22,
    fontFamily: 'sans-serif-medium',
  },
  blockTitle: {
    color: palette.text,
    fontSize: 20,
    fontFamily: 'sans-serif-medium',
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
    borderColor: '#2f4763',
    backgroundColor: '#0d2238',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerBtnActive: {
    borderColor: '#2563eb',
    backgroundColor: '#1d3f66',
  },
  providerText: {
    color: '#9fb0c7',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
  providerTextActive: {
    color: '#dbeafe',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 20,
    fontFamily: 'sans-serif-medium',
  },
  activitiesColumn: {
    gap: 10,
  },
  activityCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#274466',
    backgroundColor: '#0b2237',
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
    color: '#e2e8f0',
    fontSize: 16,
    fontFamily: 'sans-serif-medium',
  },
  activityMeta: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'sans-serif',
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  activityAmount: {
    fontSize: 19,
    fontFamily: 'sans-serif-medium',
  },
  amountIn: {
    color: '#34d399',
  },
  amountOut: {
    color: '#cbd5e1',
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3b82f666',
    backgroundColor: '#1d3f66',
    color: '#93c5fd',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: 'uppercase',
    fontFamily: 'sans-serif-medium',
  },
  feedback: {
    color: palette.textMuted,
    fontSize: 12,
    fontFamily: 'sans-serif-medium',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'sans-serif',
  },
});
