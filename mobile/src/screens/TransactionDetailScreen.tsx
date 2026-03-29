import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../services/api';
import { useAppData } from '../context/AppDataContext';
import { Transaction } from '../types';
import { BirdButton, BirdCard, BirdScreen, palette } from '../components/ui-kit';
import { formatXaf } from '../utils/format';

export function TransactionDetailScreen({
  transaction,
  onBack,
  onOpenDispute,
}: {
  transaction: Transaction;
  onBack: () => void;
  onOpenDispute: (tx: Transaction) => void;
}) {
  const { markDeliveredLocal, confirmTransactionLocal, auctions } = useAppData();
  const [secretCode, setSecretCode] = useState('');
  const [loadingAction, setLoadingAction] = useState<'none' | 'delivery' | 'confirm'>('none');
  const [feedback, setFeedback] = useState<string | null>(null);

  const auction = useMemo(() => auctions.find((item) => item.id === transaction.auctionId), [auctions, transaction.auctionId]);
  const codeDigits = secretCode.padEnd(6, ' ').slice(0, 6).split('');
  const progressIndex = transaction.status === 'blocked' ? 0 : transaction.status === 'delivered' ? 1 : 2;

  const markDelivered = async () => {
    setLoadingAction('delivery');
    setFeedback(null);
    try {
      await markDeliveredLocal(transaction.id);
      try {
        await api.markDelivered({ transactionId: transaction.id });
        setFeedback('Colis en transit confirmé.');
      } catch {
        setFeedback('Transit validé localement, sync API en attente.');
      }
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setLoadingAction('none');
    }
  };

  const confirmCode = async () => {
    setLoadingAction('confirm');
    setFeedback(null);
    try {
      await confirmTransactionLocal(transaction.id, secretCode);
      try {
        await api.confirmSecretCode({
          transactionId: transaction.id,
          secretCode,
          idempotencyKey: `confirm-${transaction.id}-${Date.now()}`,
        });
        setFeedback('Réception confirmée, fonds libérés.');
      } catch {
        setFeedback('Réception validée localement, sync API en attente.');
      }
      setSecretCode('');
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setLoadingAction('none');
    }
  };

  return (
    <BirdScreen title="Détails de la Transaction" subtitle="Escrow sécurisé jusqu’à confirmation." onBack={onBack}>
      <BirdCard>
        <Text style={styles.refText}>REF: #{transaction.id.toUpperCase()}</Text>
        <View style={styles.rowBetween}>
          <View style={styles.productWrap}>
            <Image
              source={{ uri: auction?.imageUrl ?? 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&w=500&q=80' }}
              style={styles.productImage}
            />
            <View style={styles.productTextWrap}>
              <Text style={styles.productTitle} numberOfLines={2}>{auction?.title ?? `Enchère ${transaction.auctionId}`}</Text>
              <Text style={styles.productSeller}>Vendeur: {transaction.sellerId}</Text>
              <Text style={styles.amount}>{formatXaf(transaction.amount)}</Text>
            </View>
          </View>
          <Text style={styles.lockPill}>FONDS BLOQUÉS</Text>
        </View>
      </BirdCard>

      <View style={styles.stepperWrap}>
        {['Payé', 'En transit', 'Reçu'].map((label, index) => {
          const active = progressIndex >= index;
          return (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepDot, active ? styles.stepDotActive : undefined]} />
              <Text style={[styles.stepLabel, active ? styles.stepLabelActive : undefined]}>{label}</Text>
              {index < 2 ? <View style={[styles.stepLine, progressIndex > index ? styles.stepLineActive : undefined]} /> : null}
            </View>
          );
        })}
      </View>

      <BirdCard>
        <Text style={styles.sectionTitle}>Finaliser la réception</Text>
        <Text style={styles.sectionText}>
          Entrez le code secret à 6 chiffres fourni par le vendeur lors de la remise pour libérer les fonds.
        </Text>
        <View style={styles.codeBoxes}>
          {codeDigits.map((digit, idx) => (
            <View key={idx} style={styles.codeBox}>
              <Text style={styles.codeChar}>{digit.trim() ? digit : ''}</Text>
            </View>
          ))}
        </View>
        <TextInput
          value={secretCode}
          onChangeText={(value) => setSecretCode(value.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          style={styles.hiddenInput}
          placeholder="Tapez le code"
          placeholderTextColor="#64748b"
        />

        <BirdButton
          label="Confirmer la réception"
          onPress={confirmCode}
          loading={loadingAction === 'confirm'}
          disabled={loadingAction !== 'none' || secretCode.length < 6}
        />
        <BirdButton
          label="Signaler un litige"
          onPress={() => onOpenDispute(transaction)}
          variant="danger"
          disabled={loadingAction !== 'none'}
        />
        <BirdButton
          label="Marquer en transit"
          onPress={markDelivered}
          variant="ghost"
          loading={loadingAction === 'delivery'}
          disabled={loadingAction !== 'none' || transaction.status === 'delivered' || transaction.status === 'confirmed'}
        />
      </BirdCard>

      <BirdCard style={styles.infoCardBlue}>
        <Text style={styles.infoTitle}>Comment ça marche ?</Text>
        <Text style={styles.infoBody}>
          L’argent reste sécurisé. Le vendeur est payé uniquement après validation du code de réception.
        </Text>
      </BirdCard>

      <BirdCard style={styles.infoCardAmber}>
        <Text style={styles.infoTitleAmber}>Conseil de sécurité</Text>
        <Text style={styles.infoBody}>
          Ne partagez jamais votre code secret avant vérification physique de l’objet.
        </Text>
      </BirdCard>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  refText: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'sans-serif-medium',
  },
  rowBetween: {
    gap: 8,
  },
  productWrap: {
    flexDirection: 'row',
    gap: 10,
  },
  productImage: {
    width: 86,
    height: 86,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
  },
  productTextWrap: {
    flex: 1,
    gap: 3,
  },
  productTitle: {
    color: palette.text,
    fontSize: 18,
    fontFamily: 'sans-serif-medium',
  },
  productSeller: {
    color: '#9fb0c7',
    fontSize: 13,
    fontFamily: 'sans-serif',
  },
  amount: {
    color: '#2563eb',
    fontSize: 28,
    fontFamily: 'sans-serif-medium',
  },
  lockPill: {
    alignSelf: 'flex-start',
    color: '#93c5fd',
    borderColor: '#1d4ed8',
    borderWidth: 1,
    backgroundColor: '#1e3a8a44',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontFamily: 'sans-serif-medium',
  },
  stepperWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginVertical: 4,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#274466',
    backgroundColor: '#0d2238',
    zIndex: 2,
  },
  stepDotActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  stepLabel: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'sans-serif',
  },
  stepLabelActive: {
    color: '#bfdbfe',
  },
  stepLine: {
    position: 'absolute',
    top: 14,
    right: '-50%',
    width: '100%',
    height: 2,
    backgroundColor: '#274466',
  },
  stepLineActive: {
    backgroundColor: '#2563eb',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 24,
    textAlign: 'center',
    fontFamily: 'sans-serif-medium',
  },
  sectionText: {
    color: '#9fb0c7',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'sans-serif',
  },
  codeBoxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  codeBox: {
    flex: 1,
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334e6d',
    backgroundColor: '#1d2f48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeChar: {
    color: '#e2e8f0',
    fontSize: 22,
    fontFamily: 'sans-serif-medium',
  },
  hiddenInput: {
    borderWidth: 1,
    borderColor: '#2b4562',
    borderRadius: 10,
    backgroundColor: '#0e2238',
    color: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  infoCardBlue: {
    borderColor: '#1d4ed8',
    backgroundColor: '#0d2a4e',
  },
  infoCardAmber: {
    borderColor: '#854d0e',
    backgroundColor: '#3f2d12',
  },
  infoTitle: {
    color: '#60a5fa',
    fontSize: 18,
    fontFamily: 'sans-serif-medium',
  },
  infoTitleAmber: {
    color: '#fbbf24',
    fontSize: 18,
    fontFamily: 'sans-serif-medium',
  },
  infoBody: {
    color: '#d1d5db',
    lineHeight: 20,
    fontSize: 16,
    fontFamily: 'sans-serif',
  },
  feedback: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'serif',
  },
});

