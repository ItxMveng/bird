import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { BirdButton, BirdCard, BirdInput, BirdScreen, BirdTag, SectionTitle, palette } from '../components/ui-kit';

const scores = [1, 2, 3, 4, 5];

export function RatingsScreen({ onBack }: { onBack: () => void }) {
  const [score, setScore] = useState<number>(5);
  const [comment, setComment] = useState('Transaction fluide, vendeur réactif.');
  const [feedback, setFeedback] = useState<string | null>(null);
  const { addRatingLocal, ratings } = useAppData();
  const { user } = useAuth();

  const submit = async () => {
    if (!user?.uid) return;
    if (comment.trim().length < 4) {
      setFeedback('Le commentaire doit contenir au moins 4 caractères.');
      return;
    }

    await addRatingLocal({
      transactionId: 'tx-1',
      fromUser: user.uid,
      toUser: 'seller-1',
      score,
      comment: comment.trim(),
    });
    setFeedback(`Note ${score}/5 enregistrée.`);
    setComment('');
  };

  return (
    <BirdScreen title="Notations" subtitle="Évaluez vos transactions en toute transparence." onBack={onBack}>
      <BirdCard>
        <SectionTitle>Nouvelle note</SectionTitle>
        <View style={styles.scoreRow}>
          {scores.map((item) => (
            <BirdTag key={item} label={`${item}`} selected={score === item} onPress={() => setScore(item)} />
          ))}
        </View>
        <BirdInput
          label="Commentaire"
          value={comment}
          onChangeText={setComment}
          multiline
          textAlignVertical="top"
          style={styles.input}
        />
        <BirdButton label="Envoyer note" onPress={submit} disabled={!user?.uid} />
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </BirdCard>

      <BirdCard>
        <SectionTitle>Historique</SectionTitle>
        {ratings.length === 0 ? (
          <Text style={styles.empty}>Aucune note pour le moment.</Text>
        ) : (
          ratings.slice(0, 6).map((rating) => (
            <View key={rating.id} style={styles.ratingRow}>
              <Text style={styles.ratingScore}>{rating.score}/5</Text>
              <Text style={styles.ratingComment}>{rating.comment}</Text>
            </View>
          ))
        )}
      </BirdCard>
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  input: {
    minHeight: 84,
  },
  feedback: {
    color: palette.textMuted,
    fontFamily: 'sans-serif-medium',
    fontSize: 12,
  },
  empty: {
    color: palette.textDim,
    fontFamily: 'serif',
  },
  ratingRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#67e8f922',
    backgroundColor: '#0f2f48cc',
    padding: 10,
    gap: 4,
  },
  ratingScore: {
    color: '#fbbf24',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
  ratingComment: {
    color: palette.textMuted,
    fontSize: 12,
    fontFamily: 'serif',
  },
});
