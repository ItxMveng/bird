import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export function LoginScreen() {
  const { step, phoneDraft, requestOtp, verifyOtp, completeProfile } = useAuth();
  const [phone, setPhone] = useState(phoneDraft);
  const [otp, setOtp] = useState('000000');
  const [name, setName] = useState('Utilisateur Bird');
  const [city, setCity] = useState('Douala');
  const [loading, setLoading] = useState(false);

  if (step === 'loading') {
    return (
      <ScreenLayout title="Chargement session">
        <View style={styles.card}>
          <ActivityIndicator />
          <Text>Restauration de session en cours...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Connexion / Inscription">
      {step === 'enter_phone' && (
        <View style={styles.card}>
          <Text style={styles.label}>Numéro de téléphone</Text>
          <TextInput value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />
          <Button
            title={loading ? '...' : 'Recevoir OTP'}
            disabled={loading}
            onPress={async () => {
              try {
                setLoading(true);
                await requestOtp(phone);
              } catch (error) {
                Alert.alert('Erreur OTP', (error as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          />
        </View>
      )}

      {step === 'enter_otp' && (
        <View style={styles.card}>
          <Text style={styles.label}>Code OTP (démo: 000000)</Text>
          <TextInput value={otp} onChangeText={setOtp} style={styles.input} keyboardType="number-pad" />
          <Button
            title={loading ? '...' : 'Valider OTP'}
            disabled={loading}
            onPress={async () => {
              try {
                setLoading(true);
                const ok = await verifyOtp(otp);
                if (!ok) Alert.alert('OTP invalide', 'Code incorrect.');
              } catch (error) {
                Alert.alert('Erreur OTP', (error as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          />
        </View>
      )}

      {step === 'complete_profile' && (
        <View style={styles.card}>
          <Text style={styles.label}>Compléter le profil</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Nom" />
          <TextInput value={city} onChangeText={setCity} style={styles.input} placeholder="Ville" />
          <Button
            title={loading ? '...' : 'Terminer inscription'}
            disabled={loading}
            onPress={async () => {
              setLoading(true);
              await completeProfile({ name, city });
              setLoading(false);
            }}
          />
        </View>
      )}

      <Text style={styles.hint}>Production: brancher Firebase Auth Phone complet (reCAPTCHA selon plateforme).</Text>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, gap: 10 },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10 },
  hint: { color: '#6b7280' },
});
