import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';

export function RatingsScreen({ onBack }: { onBack: () => void }) {
  const [score, setScore] = useState('5');
  const [comment, setComment] = useState('Transaction fluide, vendeur réactif.');
  const { addRatingLocal } = useAppData();
  const { user } = useAuth();

  const submit = () => {
    if (!user?.uid) return;
    addRatingLocal({
      transactionId: "tx-1",
      fromUser: user.uid,
      toUser: "seller-1",
      score: Number(score),
      comment,
    });
    Alert.alert('Merci', `Note envoyée: ${score}/5`);
  };

  return (
    <ScreenLayout title="Noter un utilisateur">
      <View style={styles.card}>
        <Text>Score (1-5)</Text>
        <TextInput value={score} onChangeText={setScore} keyboardType="numeric" style={styles.input} />
        <Text>Commentaire</Text>
        <TextInput value={comment} onChangeText={setComment} style={styles.input} multiline />
        <Button title="Envoyer note" onPress={submit} />
        <Button title="Retour" onPress={onBack} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10 },
});
