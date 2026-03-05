import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { api, mockData } from '../services/api';

export function AdminDashboardScreen({ onBack }: { onBack: () => void }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const resolve = async (disputeId: string, resolution: 'refund' | 'pay_seller') => {
    try {
      setLoadingId(disputeId);
      await api.resolveDispute({ disputeId, resolution });
      Alert.alert('Admin', `Litige ${disputeId} résolu: ${resolution}`);
    } catch (error) {
      Alert.alert('Erreur', (error as Error).message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <ScreenLayout title="Admin - Litiges">
      {mockData.disputes.map((d) => (
        <View key={d.id} style={styles.card}>
          <Text style={styles.title}>Litige {d.id}</Text>
          <Text>TX: {d.transactionId}</Text>
          <Text>Motif: {d.reason}</Text>
          <Text>Statut: {d.status}</Text>
          <Button title={loadingId === d.id ? '...' : 'Rembourser'} onPress={() => resolve(d.id, 'refund')} disabled={loadingId === d.id} />
          <Button title={loadingId === d.id ? '...' : 'Payer vendeur'} onPress={() => resolve(d.id, 'pay_seller')} disabled={loadingId === d.id} />
        </View>
      ))}
      <Button title="Retour" onPress={onBack} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 8 },
  title: { fontWeight: '700' },
});
