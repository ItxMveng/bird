import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { mockData } from '../services/api';

export function NotificationsScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenLayout title="Notifications">
      {mockData.notifications.map((n) => (
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
