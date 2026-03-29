import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BirdButton, BirdCard, BirdScreen, BirdTag, SectionTitle, palette } from '../components/ui-kit';
import { formatXaf } from '../utils/format';

const plans = [
  { id: 'starter', label: 'Starter', price: 15000, perks: ['20 annonces / mois', 'Badge vendeur', 'Stats basiques'] },
  { id: 'growth', label: 'Growth', price: 30000, perks: ['Annonces illimitées', 'Mise en avant', 'Support prioritaire'] },
  { id: 'elite', label: 'Elite', price: 60000, perks: ['Toutes options', 'Accompagnement VIP', 'Analytics avancés'] },
] as const;

export function ProSubscriptionScreen({ onBack }: { onBack: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState<(typeof plans)[number]['id']>('growth');
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentPlan = plans.find((plan) => plan.id === selectedPlan) ?? plans[1];

  return (
    <BirdScreen title="Devenir vendeur PRO" subtitle="Boostez visibilité, confiance et conversion." onBack={onBack}>
      <BirdCard>
        <SectionTitle>Choix du plan</SectionTitle>
        <View style={styles.planTags}>
          {plans.map((plan) => (
            <BirdTag key={plan.id} label={`${plan.label} · ${formatXaf(plan.price)}`} selected={selectedPlan === plan.id} onPress={() => setSelectedPlan(plan.id)} />
          ))}
        </View>
      </BirdCard>

      <BirdCard>
        <SectionTitle>{currentPlan.label}</SectionTitle>
        <Text style={styles.price}>{formatXaf(currentPlan.price)} / mois</Text>
        {currentPlan.perks.map((perk) => (
          <Text key={perk} style={styles.perk}>
            - {perk}
          </Text>
        ))}
        <BirdButton
          label="Souscrire (simulation)"
          onPress={() => setFeedback(`Plan ${currentPlan.label} activé localement.`)}
        />
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </BirdCard>
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  planTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  price: {
    color: '#99f6e4',
    fontSize: 22,
    fontFamily: 'sans-serif-medium',
  },
  perk: {
    color: palette.textMuted,
    fontSize: 13,
    fontFamily: 'serif',
  },
  feedback: {
    color: palette.textMuted,
    fontSize: 12,
    fontFamily: 'sans-serif-medium',
  },
});
