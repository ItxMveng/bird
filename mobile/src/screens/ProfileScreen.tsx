import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { user, logout } = useAuth();

  return (
    <ScreenLayout title="Profil">
      <View style={styles.card}>
        <Text>Nom: {user?.name}</Text>
        <Text>Téléphone: {user?.phone}</Text>
        <Text>Ville: {user?.city}</Text>
      </View>
      <View style={styles.card}>
        <Button title="Se déconnecter" onPress={logout} />
        <Button title="Retour" onPress={onBack} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 8 },
});
