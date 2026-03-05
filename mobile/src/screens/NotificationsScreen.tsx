import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { useAppData } from '../context/AppDataContext';

export function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const { notifications } = useAppData();
  return (
    <ScreenLayout title="Notifications">
      {notifications.map((n) => (
        <View key={n.id} style={styles.card}>
          <Text style={styles.title}>{n.title}</Text>
          <Text>{n.body}</Text>
        </View>
      ))}
      <Button title="Retour" onPress={onBack} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 6 },
  title: { fontWeight: '700' },
});
