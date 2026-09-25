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
  },
  item: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#1118271A',
    padding: 14,
    gap: 8,
  },
  itemRead: {
    opacity: 0.72,
    borderColor: '#E5E7EB',
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
    fontWeight: '600',
    flex: 1,
  },
  date: {
    color: palette.textDim,
    fontSize: 11,
  },
  body: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
});
