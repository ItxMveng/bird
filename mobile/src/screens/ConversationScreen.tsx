import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { MessageThread } from '../types';
import { BirdButton, BirdCard, BirdInput, BirdScreen, SectionTitle, palette } from '../components/ui-kit';
import { formatDateTime } from '../utils/format';

export function ConversationScreen({ thread, onBack }: { thread: MessageThread; onBack: () => void }) {
  const [draft, setDraft] = useState('');
  const { user } = useAuth();
  const { messages, addMessageLocal } = useAppData();
  const threadMessages = useMemo(
    () =>
      messages
        .filter((message) => message.threadId === thread.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages, thread.id],
  );

  const send = async () => {
    const trimmed = draft.trim();
    if (!trimmed || !user?.uid) return;
    await addMessageLocal(thread.id, user.uid, trimmed);
    setDraft('');
  };

  return (
    <BirdScreen title={`Discussion: ${thread.withUser}`} subtitle="Messagerie interne sécurisée." onBack={onBack}>
      <BirdCard>
        <SectionTitle>Conversation</SectionTitle>
        {threadMessages.length === 0 ? (
          <Text style={styles.empty}>Aucun message pour le moment.</Text>
        ) : (
          <View style={styles.messagesWrap}>
            {threadMessages.map((message) => {
              const mine = message.senderId === user?.uid;
              return (
                <View key={message.id} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={styles.sender}>{mine ? 'Vous' : message.senderId}</Text>
                  <Text style={styles.text}>{message.text}</Text>
                  <Text style={styles.time}>{formatDateTime(message.createdAt)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </BirdCard>

      <BirdCard>
        <BirdInput
          label="Nouveau message"
          value={draft}
          onChangeText={setDraft}
          placeholder="Écrivez votre message..."
          multiline
          textAlignVertical="top"
          style={styles.input}
        />
        <BirdButton label="Envoyer" onPress={send} disabled={!draft.trim()} />
      </BirdCard>
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: palette.textDim,
  },
  messagesWrap: {
    gap: 8,
  },
  bubble: {
    borderRadius: 12,
    padding: 10,
    gap: 4,
    maxWidth: '92%',
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#6D28D91A',
    borderWidth: 1,
    borderColor: '#E6DCF7',
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#6D28D91A',
    borderWidth: 1,
    borderColor: '#E6DCF7',
  },
  sender: {
    color: palette.tealSoft,
    fontSize: 11,
    fontWeight: '600',
  },
  text: {
    color: palette.text,
    fontSize: 13,
  },
  time: {
    color: palette.textDim,
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  input: {
    minHeight: 84,
  },
});
