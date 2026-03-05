import React from 'react';
import { Button, Pressable, StyleSheet, Text } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { mockData } from '../services/api';
import { MessageThread } from '../types';

export function MessagesScreen({ onBack, onOpenThread }: { onBack: () => void; onOpenThread: (thread: MessageThread) => void }) {
  return (
    <ScreenLayout title="Messagerie interne">
      {mockData.threads.map((thread) => (
        <Pressable key={thread.id} style={styles.card} onPress={() => onOpenThread(thread)}>
          <Text style={styles.title}>{thread.withUser}</Text>
          <Text>{thread.lastMessage}</Text>
        </Pressable>
      ))}
      <Button title="Retour" onPress={onBack} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 6 },
  title: { fontWeight: '700' },
});
