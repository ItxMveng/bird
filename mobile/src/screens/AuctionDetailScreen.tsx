import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { api } from '../services/api';
import { Auction } from '../types';

export function AuctionDetailScreen({ auction, onBack }: { auction: Auction; onBack: () => void }) {
  const [amount, setAmount] = useState(String(auction.currentPrice + 1000));
  const [loading, setLoading] = useState(false);

  const submitBid = async () => {
    try {
      setLoading(true);
      await api.placeBid({
        auctionId: auction.id,
        amount: Number(amount),
        idempotencyKey: `bid-${auction.id}-${Date.now()}`,
      });
      Alert.alert('Succès', 'Votre enchère a été soumise.');
    } catch (error) {
      Alert.alert('Erreur', `Impossible de placer l'enchère: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout title="Détail enchère">
      <View style={styles.card}>
        <Text style={styles.title}>{auction.title}</Text>
        <Text>{auction.description}</Text>
        <Text>Ville: {auction.city}</Text>
        <Text style={styles.price}>Prix actuel: {auction.currentPrice.toLocaleString()} XAF</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Mon enchère</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <Button title={loading ? 'Envoi...' : 'Placer enchère'} onPress={submitBid} disabled={loading} />
        <Button title="Retour" onPress={onBack} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 8 },
  title: { fontWeight: '700', fontSize: 17 },
  label: { fontWeight: '600' },
  price: { color: '#065f46', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10 },
});
