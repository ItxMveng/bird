import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { useAppData } from '../context/AppDataContext';

export function WalletScreen({ onBack }: { onBack: () => void }) {
  const { wallet } = useAppData();
  return (
    <ScreenLayout title="Mon Wallet">
      <View style={styles.card}>
        <Text style={styles.amount}>Disponible: {wallet.balance.toLocaleString()} {wallet.currency}</Text>
        <Text style={styles.blocked}>Bloqué (escrow): {wallet.blocked.toLocaleString()} {wallet.currency}</Text>
      </View>
      <View style={styles.card}>
        <Text>Recharge via passerelle paiement sera branchée à `paymentWebhook` (phase suivante).</Text>
        <Button title="Retour" onPress={onBack} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 8 },
  amount: { fontWeight: '700', fontSize: 18, color: '#065f46' },
  blocked: { fontWeight: '600', color: '#9a3412' },
});
