import React, { useState } from 'react';
import { Alert, Button, StyleSheet, TextInput, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { api } from '../services/api';
import { Transaction } from '../types';

export function DisputeScreen({ transaction, onBack }: { transaction: Transaction; onBack: () => void }) {
  const [reason, setReason] = useState('Produit non conforme');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      await api.openDispute({ transactionId: transaction.id, reason });
      Alert.alert('Litige ouvert', 'Votre dossier a été transmis aux admins.');
      onBack();
    } catch (error) {
      Alert.alert('Erreur', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout title="Ouvrir un litige">
      <View style={styles.card}>
        <TextInput style={styles.input} multiline value={reason} onChangeText={setReason} />
        <Button title={loading ? 'Envoi...' : 'Envoyer litige'} onPress={submit} disabled={loading} />
        <Button title="Retour" onPress={onBack} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 8 },
  input: { minHeight: 100, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, textAlignVertical: 'top' },
});
