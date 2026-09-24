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
    backgroundColor: '#FFFFFF',
  },
  dotActive: {
    backgroundColor: '#6D28D9',
  },
  escrowCard: {
    borderColor: '#6D28D9',
    backgroundColor: '#FFFFFF',
  },
  escrowTitle: {
    color: '#6D28D9',
    fontSize: 18,
    fontWeight: '600',
  },
  escrowText: {
    color: '#1F1A3D',
    fontSize: 14,
    lineHeight: 20,
  },
  heading: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '600',
  },
  subheading: {
    color: '#1F1A3D',
    fontSize: 16,
    lineHeight: 22,
  },
  fieldLabel: {
    color: '#1F1A3D',
    fontSize: 14,
    fontWeight: '600',
  },
  reasonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonItem: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E6DCF7',
    backgroundColor: '#F5F0FF',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  reasonItemActive: {
    borderColor: '#6D28D9',
    backgroundColor: '#6D28D9',
  },
  reasonText: {
    color: '#6D28D9',
    fontSize: 13,
    fontWeight: '600',
  },
  reasonTextActive: {
    color: '#FFFFFF',
  },
  descriptionInput: {
    minHeight: 130,
  },
  uploadBox: {
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E6DCF7',
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadIcon: {
    color: '#6D28D9',
    fontSize: 26,
    lineHeight: 26,
    fontWeight: '600',
  },
  uploadText: {
    color: '#6D28D9',
    fontSize: 13,
  },
  attachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6DCF7',
    backgroundColor: '#F5F0FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  attachmentText: {
    color: '#1F1A3D',
    fontSize: 11,
  },
  feedback: {
    color: palette.textMuted,
    fontSize: 13,
  },
});

