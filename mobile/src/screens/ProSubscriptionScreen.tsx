import React from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';

export function ProSubscriptionScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenLayout title="Passer vendeur PRO">
      <View style={styles.card}>
        <Text style={styles.title}>Avantages PRO</Text>
        <Text>- Enchères illimitées</Text>
        <Text>- Badge vendeur certifié</Text>
        <Text>- Visibilité prioritaire</Text>
        <Text>- Support prioritaire</Text>
        <Button title="Souscrire (mock)" onPress={() => Alert.alert('OK', 'Souscription PRO simulée')} />
        <Button title="Retour" onPress={onBack} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 8 },
  title: { fontWeight: '700', fontSize: 17 },
});
