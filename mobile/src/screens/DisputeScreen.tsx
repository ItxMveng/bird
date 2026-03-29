import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../services/api';
import { useAppData } from '../context/AppDataContext';
import { Transaction } from '../types';
import { BirdButton, BirdCard, BirdInput, BirdScreen, palette } from '../components/ui-kit';
import { formatXaf } from '../utils/format';

const reasons = ['Objet non reçu', 'Produit non conforme', 'Écart de prix', 'Autre problème'];

export function DisputeScreen({ transaction, onBack }: { transaction: Transaction; onBack: () => void }) {
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<string[]>(['capture-001.png']);
  const { openDisputeLocal } = useAppData();

  const submit = async () => {
    setLoading(true);
    setFeedback(null);
    const finalReason = `${reason}${details.trim() ? ` - ${details.trim()}` : ''}`;

    try {
      await openDisputeLocal(transaction.id, finalReason);
      try {
        await api.openDispute({ transactionId: transaction.id, reason: finalReason });
        setFeedback('Litige transmis à la médiation.');
      } catch {
        setFeedback('Litige enregistré via Firebase. Synchronisation API en attente.');
      }
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BirdScreen title="Gestion du litige" subtitle={`Transaction ${transaction.id} · ${formatXaf(transaction.amount)}`} onBack={onBack}>
      <View style={styles.progressDots}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      <BirdCard style={styles.escrowCard}>
        <Text style={styles.escrowTitle}>Fonds sécurisés (Escrow)</Text>
        <Text style={styles.escrowText}>
          Le montant reste gelé jusqu’à résolution du litige par notre équipe de médiation.
        </Text>
      </BirdCard>

      <Text style={styles.heading}>Détails du problème</Text>
      <Text style={styles.subheading}>
        Veuillez expliquer la nature du litige pour que notre équipe puisse intervenir rapidement.
      </Text>

      <BirdCard>
        <Text style={styles.fieldLabel}>Motif du litige</Text>
        <View style={styles.reasonWrap}>
          {reasons.map((item) => {
            const active = item === reason;
            return (
              <Pressable key={item} style={[styles.reasonItem, active ? styles.reasonItemActive : undefined]} onPress={() => setReason(item)}>
                <Text style={[styles.reasonText, active ? styles.reasonTextActive : undefined]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Description détaillée</Text>
        <BirdInput
          value={details}
          onChangeText={setDetails}
          multiline
          textAlignVertical="top"
          placeholder="Décrivez précisément ce qu'il s'est passé..."
          style={styles.descriptionInput}
        />

        <Text style={styles.fieldLabel}>Pièces jointes</Text>
        <Pressable
          style={styles.uploadBox}
          onPress={() => setAttachments((prev) => [...prev, `capture-${String(prev.length + 1).padStart(3, '0')}.png`])}
        >
          <Text style={styles.uploadIcon}>+</Text>
          <Text style={styles.uploadText}>Cliquez pour ajouter une preuve</Text>
        </Pressable>
        <View style={styles.attachmentsRow}>
          {attachments.map((item) => (
            <View key={item} style={styles.attachmentChip}>
              <Text style={styles.attachmentText}>{item}</Text>
            </View>
          ))}
        </View>
      </BirdCard>

      <BirdButton label={loading ? 'Traitement...' : 'Signaler le litige'} onPress={submit} loading={loading} disabled={loading} />
      <BirdButton label="Contacter le support direct" onPress={() => setFeedback('Support: ticket instantané créé.')} variant="ghost" />

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2f4561',
  },
  dotActive: {
    backgroundColor: '#2563eb',
  },
  escrowCard: {
    borderColor: '#1d4ed8',
    backgroundColor: '#0b2a4f',
  },
  escrowTitle: {
    color: '#3b82f6',
    fontSize: 18,
    fontFamily: 'sans-serif-medium',
  },
  escrowText: {
    color: '#b7c5d9',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'sans-serif',
  },
  heading: {
    color: palette.text,
    fontSize: 24,
    fontFamily: 'sans-serif-medium',
  },
  subheading: {
    color: '#a5b4c8',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'sans-serif',
  },
  fieldLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontFamily: 'sans-serif-medium',
  },
  reasonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonItem: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#2b4664',
    backgroundColor: '#0d2238',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  reasonItemActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#1d3f66',
  },
  reasonText: {
    color: '#9fb0c7',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
  reasonTextActive: {
    color: '#dbeafe',
  },
  descriptionInput: {
    minHeight: 130,
  },
  uploadBox: {
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2c4b6d',
    backgroundColor: '#0c223a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadIcon: {
    color: '#60a5fa',
    fontSize: 26,
    lineHeight: 26,
    fontFamily: 'sans-serif-medium',
  },
  uploadText: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'sans-serif',
  },
  attachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334e6d',
    backgroundColor: '#1c2f48',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  attachmentText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontFamily: 'sans-serif',
  },
  feedback: {
    color: palette.textMuted,
    fontFamily: 'serif',
    fontSize: 13,
  },
});

