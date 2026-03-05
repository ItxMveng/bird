import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenLayout } from '../components/Layout';
import { useAppData } from '../context/AppDataContext';
import { MessageThread } from '../types';

export function ConversationScreen({ thread, onBack }: { thread: MessageThread; onBack: () => void }) {
  const [draft, setDraft] = useState('');
  const { user } = useAuth();
  const { messages, addMessageLocal } = useAppData();
  const threadMessages = useMemo(() => messages.filter((m) => m.threadId === thread.id), [messages, thread.id]);

  return (
    <ScreenLayout title={`Discussion: ${thread.withUser}`}>
      {threadMessages.map((m) => (
        <View key={m.id} style={styles.card}>
          <Text style={styles.meta}>{m.senderId}</Text>
          <Text>{m.text}</Text>
        </View>
      ))}
      <View style={styles.card}>
        <TextInput value={draft} onChangeText={setDraft} placeholder="Votre message" style={styles.input} />
        <Button title="Envoyer (mock)" onPress={() => { if (user?.uid) addMessageLocal(thread.id, user.uid, draft.trim()); setDraft(''); }} disabled={!draft.trim()} />
        <Button title="Retour" onPress={onBack} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, gap: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10 },
  meta: { fontWeight: '700', color: '#374151' },
});
