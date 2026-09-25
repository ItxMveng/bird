import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../services/api';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
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
  const { user } = useAuth();
  const [secretCode, setSecretCode] = useState('');
  const [buyerCode, setBuyerCode] = useState<string | null>(null);
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
      setFeedback('Colis en transit confirmé.');
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
      setFeedback('Réception confirmée, fonds libérés.');
      setSecretCode('');
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setLoadingAction('none');
    }
  };

  const loadBuyerCode = async () => {
    if (transaction.buyerId !== user?.uid) return;
    setLoadingAction('confirm');
    setFeedback(null);
    try {
      const response = await api.getTransactionSecretCode({ transactionId: transaction.id });
      setBuyerCode(response.result.secretCode);
      setFeedback('Code secret récupéré. Partagez-le uniquement lors de la remise.');
    } catch {
      setFeedback('Impossible de récupérer le code secret pour le moment.');
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
        {transaction.buyerId === user?.uid ? (
          <BirdButton
            label={buyerCode ? `Mon code: ${buyerCode}` : 'Afficher mon code secret'}
            onPress={loadBuyerCode}
            variant="ghost"
            disabled={loadingAction !== 'none'}
          />
        ) : null}
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
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
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
    fontWeight: '600',
  },
  productSeller: {
    color: '#111827',
    fontSize: 13,
  },
  amount: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '600',
  },
  lockPill: {
    alignSelf: 'flex-start',
    color: '#111827',
    borderColor: '#111827',
    borderWidth: 1,
    backgroundColor: '#1118271A',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '600',
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
    borderColor: '#111827',
    backgroundColor: '#FFFFFF',
    zIndex: 2,
  },
  stepDotActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  stepLabel: {
    marginTop: 6,
    color: '#111827',
    fontSize: 11,
  },
  stepLabelActive: {
    color: '#111827',
  },
  stepLine: {
    position: 'absolute',
    top: 14,
    right: '-50%',
    width: '100%',
    height: 2,
    backgroundColor: '#FFFFFF',
  },
  stepLineActive: {
    backgroundColor: '#111827',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionText: {
    color: '#111827',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
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
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeChar: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '600',
  },
  hiddenInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  infoCardBlue: {
    borderColor: '#111827',
    backgroundColor: '#F5F5F4',
  },
  infoCardAmber: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FEF3C7',
  },
  infoTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '600',
  },
  infoTitleAmber: {
    color: '#B45309',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBody: {
    color: '#0F172A',
    lineHeight: 20,
    fontSize: 16,
  },
  feedback: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
