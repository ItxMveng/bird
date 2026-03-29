import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppData } from '../context/AppDataContext';
import { BirdButton, BirdCard, BirdScreen, SectionTitle, palette } from '../components/ui-kit';
import { formatDateTime } from '../utils/format';

export function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const { notifications, markNotificationReadLocal } = useAppData();

  return (
    <BirdScreen title="Notifications" subtitle="Toutes vos alertes transactionnelles." onBack={onBack}>
      <BirdCard>
        <SectionTitle>Résumé</SectionTitle>
        <Text style={styles.summary}>
          {notifications.filter((item) => !item.read).length} non lue(s) / {notifications.length} total
        </Text>
      </BirdCard>

      {notifications.map((notification) => (
        <Pressable
          key={notification.id}
          style={[styles.item, notification.read ? styles.itemRead : undefined]}
          onPress={() => markNotificationReadLocal(notification.id)}
        >
          <View style={styles.itemTop}>
            <Text style={styles.title}>{notification.title}</Text>
            <Text style={styles.date}>{formatDateTime(notification.createdAt)}</Text>
          </View>
          <Text style={styles.body}>{notification.body}</Text>
        </Pressable>
      ))}

      <BirdButton label="Retour à l'accueil" onPress={onBack} variant="ghost" />
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  summary: {
    color: palette.textMuted,
    fontFamily: 'serif',
  },
  item: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#67e8f933',
    backgroundColor: '#0b2237e6',
    padding: 14,
    gap: 8,
  },
  itemRead: {
    opacity: 0.72,
    borderColor: '#334155',
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  title: {
    color: palette.text,
    fontSize: 14,
    fontFamily: 'sans-serif-medium',
    flex: 1,
  },
  date: {
    color: palette.textDim,
    fontSize: 11,
    fontFamily: 'sans-serif',
  },
  body: {
    color: palette.textMuted,
    fontSize: 12,
    fontFamily: 'serif',
    lineHeight: 17,
  },
});
