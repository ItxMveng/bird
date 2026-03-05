import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export function LoginScreen() {
  const [phone, setPhone] = useState('+2376');
  const { loginWithPhone } = useAuth();

  return (
    <ScreenLayout title="Connexion OTP (démo)">
      <View style={styles.card}>
        <Text style={styles.label}>Numéro de téléphone</Text>
        <TextInput value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />
        <Button title="Recevoir OTP (simulé)" onPress={() => loginWithPhone(phone)} />
      </View>
      <Text style={styles.hint}>Phase frontend: OTP simulé localement. Brancher Firebase Auth ensuite.</Text>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, gap: 10 },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10 },
  hint: { color: '#6b7280' },
});
