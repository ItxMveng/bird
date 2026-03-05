import React from 'react';
import { Button, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { useAppData } from '../context/AppDataContext';
import { Transaction } from '../types';

export function TransactionsScreen({ onBack, onOpenTransaction }: { onBack: () => void; onOpenTransaction: (tx: Transaction) => void }) {
  const { transactions } = useAppData();
  return (
    <ScreenLayout title="Mes transactions">
      {transactions.map((tx) => (
        <Pressable key={tx.id} style={styles.card} onPress={() => onOpenTransaction(tx)}>
          <Text style={styles.title}>Transaction {tx.id}</Text>
          <Text>Montant: {tx.amount.toLocaleString()} XAF</Text>
          <Text>Statut: {tx.status}</Text>
        </Pressable>
      ))}
      <View>
        <Button title="Retour" onPress={onBack} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 6 },
  title: { fontWeight: '700' },
});
