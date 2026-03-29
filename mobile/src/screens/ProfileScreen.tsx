import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { BirdButton, BirdInput, BirdScreen, palette } from '../components/ui-kit';

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { user, logout, completeProfile, isBusy, setProStatus } = useAuth();
  const { auctions, transactions, ratings } = useAppData();
  const [name, setName] = useState(user?.name ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [feedback, setFeedback] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const myAuctions = auctions.filter((auction) => auction.sellerId === user?.uid).length;
    const mySales = transactions.filter((tx) => tx.sellerId === user?.uid).length;
    const avgRating = ratings.length > 0 ? ratings.reduce((sum, item) => sum + item.score, 0) / ratings.length : 4.8;
    return { myAuctions, mySales, avgRating };
  }, [auctions, transactions, ratings, user?.uid]);

  const saveProfile = async () => {
    try {
      await completeProfile({ name, city });
      setFeedback('Profil mis a jour.');
    } catch (error) {
      setFeedback((error as Error).message);
    }
  };

  const togglePro = async () => {
    try {
      await setProStatus(!user?.isPro);
      setFeedback(!user?.isPro ? 'Version PRO activee.' : 'Version PRO desactivee.');
    } catch (error) {
      setFeedback((error as Error).message);
    }
  };

  return (
    <BirdScreen title="Mon Profil" subtitle="Identite, activite et abonnement." onBack={onBack} rightActionLabel="Param" onRightAction={() => setFeedback('Parametres en preparation.')}>
      <View style={styles.profileHero}>
        <View style={styles.avatarWrap}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80' }} style={styles.avatar} />
          <View style={styles.verifiedDot} />
        </View>
        <Text style={styles.nameText}>{name || user?.name || 'Utilisateur Bird'}</Text>
        <Text style={styles.cityText}>{city || user?.city || 'Ville non renseignee'}</Text>
        <View style={styles.ratingPill}>
          <Text style={styles.ratingText}>★★★★☆ {metrics.avgRating.toFixed(1)}/5</Text>
        </View>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Encheres</Text>
          <Text style={styles.statValue}>{metrics.myAuctions}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Ventes</Text>
          <Text style={styles.statValue}>{metrics.mySales}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Avis</Text>
          <Text style={styles.statValue}>{ratings.length || 32}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Mon activite</Text>
      <Pressable style={styles.menuRow} onPress={() => setFeedback('Mes encheres en vente bientot disponibles.')}>
        <Text style={styles.menuTitle}>Mes encheres en vente</Text>
        <Text style={styles.menuSubtitle}>Gerez vos objets actuellement listes</Text>
      </Pressable>

      <View style={styles.proCard}>
        <Text style={styles.proTitle}>Devenir Vendeur PRO</Text>
        <Text style={styles.proText}>Accedez a des outils exclusifs, des commissions reduites et une visibilite boostee.</Text>
        <BirdButton label={user?.isPro ? 'Desactiver PRO' : 'Commencer maintenant'} onPress={togglePro} />
      </View>

      <Text style={styles.sectionTitle}>Compte & securite</Text>
      <Pressable style={styles.settingsRow} onPress={() => setFeedback('Parametres du compte bientot disponibles.')}>
        <Text style={styles.settingsText}>Parametres du compte</Text>
      </Pressable>
      <Pressable style={styles.settingsRow} onPress={() => setFeedback('Methodes de paiement bientot disponibles.')}>
        <Text style={styles.settingsText}>Methodes de paiement</Text>
      </Pressable>

      <View style={styles.editCard}>
        <BirdInput label="Nom complet" value={name} onChangeText={setName} />
        <BirdInput label="Ville" value={city} onChangeText={setCity} />
        <BirdButton label="Enregistrer le profil" onPress={saveProfile} disabled={isBusy} loading={isBusy} variant="secondary" />
      </View>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      <BirdButton label="Se deconnecter" onPress={logout} variant="danger" />
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  profileHero: {
    alignItems: 'center',
    gap: 6,
  },
  avatarWrap: {
    marginTop: 4,
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 3,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  verifiedDot: {
    position: 'absolute',
    right: 5,
    bottom: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563eb',
    borderWidth: 2,
    borderColor: '#071728',
  },
  nameText: {
    color: palette.text,
    fontSize: 30,
    textAlign: 'center',
    fontFamily: 'sans-serif-medium',
  },
  cityText: {
    color: '#9fb0c7',
    fontSize: 18,
    fontFamily: 'sans-serif',
  },
  ratingPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#274466',
    backgroundColor: '#152c45',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ratingText: {
    color: '#facc15',
    fontSize: 14,
    fontFamily: 'sans-serif-medium',
  },
  statsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#274466',
    backgroundColor: '#102338',
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 42,
    backgroundColor: '#2b4663',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontFamily: 'sans-serif',
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 26,
    fontFamily: 'sans-serif-medium',
  },
  sectionTitle: {
    color: '#64748b',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'sans-serif-medium',
  },
  menuRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#274466',
    backgroundColor: '#11253b',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  menuTitle: {
    color: palette.text,
    fontSize: 22,
    fontFamily: 'sans-serif-medium',
  },
  menuSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontFamily: 'sans-serif',
  },
  proCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#1e4fd0',
    padding: 14,
    gap: 8,
  },
  proTitle: {
    color: '#f8fafc',
    fontSize: 26,
    fontFamily: 'sans-serif-medium',
  },
  proText: {
    color: '#dbeafe',
    fontSize: 15,
    lineHeight: 21,
    fontFamily: 'sans-serif',
  },
  settingsRow: {
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#1f3a5b',
    justifyContent: 'center',
  },
  settingsText: {
    color: '#dbeafe',
    fontSize: 19,
    fontFamily: 'sans-serif',
  },
  editCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#274466',
    backgroundColor: '#102338',
    padding: 12,
    gap: 8,
  },
  feedback: {
    color: palette.textMuted,
    fontFamily: 'sans-serif-medium',
    fontSize: 12,
  },
});

