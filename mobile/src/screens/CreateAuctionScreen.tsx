import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { api } from '../services/api';

export function CreateAuctionScreen({ onBack }: { onBack: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Douala');
  const [startPrice, setStartPrice] = useState('50000');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      await api.publishAuction({
        title,
        description,
        city,
        startPrice: Number(startPrice),
        category: 'phones',
        durationHours: 24,
      });
      Alert.alert('Succès', 'Enchère publiée');
      onBack();
    } catch (error) {
      Alert.alert('Erreur', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout title="Créer une enchère">
      <View style={styles.card}>
        <TextInput placeholder="Titre" style={styles.input} value={title} onChangeText={setTitle} />
        <TextInput placeholder="Description" style={styles.input} value={description} onChangeText={setDescription} multiline />
        <TextInput placeholder="Ville" style={styles.input} value={city} onChangeText={setCity} />
        <TextInput placeholder="Prix de départ" keyboardType="numeric" style={styles.input} value={startPrice} onChangeText={setStartPrice} />
        <Button title={loading ? 'Publication...' : 'Publier'} onPress={submit} disabled={loading} />
        <Button title="Retour" onPress={onBack} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10 },
});
