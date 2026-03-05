import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { api } from '../services/api';
import { Transaction } from '../types';

export function TransactionDetailScreen({
  transaction,
  onBack,
  onOpenDispute,
}: {
  transaction: Transaction;
  onBack: () => void;
  onOpenDispute: (tx: Transaction) => void;
}) {
  const [secretCode, setSecretCode] = useState('');
  const [loading, setLoading] = useState(false);

  const markDelivered = async () => {
    try {
      setLoading(true);
      await api.markDelivered({ transactionId: transaction.id });
      Alert.alert('Succès', 'Transaction marquée livrée.');
    } catch (error) {
      Alert.alert('Erreur', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    try {
      setLoading(true);
      await api.confirmSecretCode({
        transactionId: transaction.id,
        secretCode,
        idempotencyKey: `confirm-${transaction.id}-${Date.now()}`,
      });
      Alert.alert('Succès', 'Code validé, fonds libérés.');
    } catch (error) {
      Alert.alert('Erreur', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout title="Détail transaction">
      <View style={styles.card}>
        <Text style={styles.title}>TX: {transaction.id}</Text>
        <Text>Statut: {transaction.status}</Text>
        <Text>Montant: {transaction.amount.toLocaleString()} XAF</Text>
      </View>
      <View style={styles.card}>
        <Button title={loading ? '...' : 'Marquer livré'} onPress={markDelivered} disabled={loading} />
        <TextInput placeholder="Code secret" style={styles.input} value={secretCode} onChangeText={setSecretCode} />
        <Button title={loading ? '...' : 'Confirmer code'} onPress={confirmCode} disabled={loading || !secretCode} />
        <Button title="Ouvrir litige" onPress={() => onOpenDispute(transaction)} />
        <Button title="Retour" onPress={onBack} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 8 },
  title: { fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10 },
});
