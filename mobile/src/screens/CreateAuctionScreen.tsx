import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { api } from '../services/api';
import { AuctionCategory } from '../types';
import { BirdButton, BirdCard, BirdInput, BirdScreen, palette } from '../components/ui-kit';
import { formatXaf } from '../utils/format';

const FALLBACK_AUCTION_IMAGE = 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80';
const categoryOptions: Array<{ id: AuctionCategory; label: string }> = [
  { id: 'phones', label: 'Telephones' },
  { id: 'electronics', label: 'Informatique' },
  { id: 'moto', label: 'Motos' },
  { id: 'appliances', label: 'Electromenager' },
];
const durationOptions: Array<6 | 12 | 24 | 48> = [6, 12, 24, 48];

export function CreateAuctionScreen({ onBack }: { onBack: () => void }) {
  const { addAuctionLocal } = useAppData();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Douala');
  const [category, setCategory] = useState<AuctionCategory>('phones');
  const [startPrice, setStartPrice] = useState('50000');
  const [durationHours, setDurationHours] = useState<6 | 12 | 24 | 48>(24);
  const [spotlight, setSpotlight] = useState(false);
  const [imageInput, setImageInput] = useState('');
  const [images, setImages] = useState<string[]>([FALLBACK_AUCTION_IMAGE]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const numericStartPrice = Number(startPrice);

  const stepValid = useMemo(() => {
    if (step === 1) return title.trim().length >= 4 && city.trim().length >= 2;
    if (step === 2) return description.trim().length >= 12 && images.length > 0;
    if (step === 3) return Number.isFinite(numericStartPrice) && numericStartPrice >= 1000;
    return true;
  }, [step, title, city, description, images.length, numericStartPrice]);

  const canPublish = useMemo(
    () =>
      title.trim().length >= 4 &&
      description.trim().length >= 12 &&
      city.trim().length >= 2 &&
      images.length > 0 &&
      Number.isFinite(numericStartPrice) &&
      numericStartPrice >= 1000 &&
      !loading,
    [title, description, city, images.length, numericStartPrice, loading],
  );

  const addImage = () => {
    const next = imageInput.trim();
    if (!next) return;
    setImages((prev) => (prev.length >= 5 ? prev : [...prev, next]));
    setImageInput('');
  };

  const removeImage = (image: string) => {
    setImages((prev) => prev.filter((item) => item !== image));
  };

  const publish = async () => {
    if (!canPublish) return;

    setLoading(true);
    setFeedback(null);
    try {
      await addAuctionLocal({
        title: title.trim(),
        description: description.trim(),
        city: city.trim(),
        startPrice: numericStartPrice,
        imageUrl: images[0] ?? FALLBACK_AUCTION_IMAGE,
        category,
        sellerId: user?.uid ?? 'user-demo',
        durationHours,
      });

      try {
        await api.publishAuction({
          title: title.trim(),
          description: description.trim(),
          city: city.trim(),
          startPrice: numericStartPrice,
          imageUrl: images[0] ?? FALLBACK_AUCTION_IMAGE,
          category,
          durationHours,
        });
        setFeedback('Enchere publiee et synchronisee.');
      } catch {
        setFeedback('Enchere publiee via Firebase. Synchronisation API en attente.');
      }

      setStep(1);
      setTitle('');
      setDescription('');
      setCity('Douala');
      setCategory('phones');
      setStartPrice('50000');
      setDurationHours(24);
      setSpotlight(false);
      setImageInput('');
      setImages([FALLBACK_AUCTION_IMAGE]);
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BirdScreen title="Creer une Enchere" subtitle={`Etape ${step} sur 4`} onBack={onBack} rightActionLabel="Aide" onRightAction={() => setFeedback('Aide contextuelle bientot disponible.')}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${step * 25}%` }]} />
      </View>

      {step === 1 ? (
        <BirdCard>
          <Text style={styles.blockTitle}>Informations generales</Text>
          <BirdInput label="Titre de l'annonce" placeholder="Ex: iPhone 15 Pro Max 512GB" value={title} onChangeText={setTitle} />
          <BirdInput label="Ville" placeholder="Ex: Douala" value={city} onChangeText={setCity} />
          <Text style={styles.fieldLabel}>Categorie</Text>
          <View style={styles.wrapRow}>
            {categoryOptions.map((item) => {
              const active = item.id === category;
              return (
                <Pressable key={item.id} style={[styles.pill, active ? styles.pillActive : undefined]} onPress={() => setCategory(item.id)}>
                  <Text style={[styles.pillText, active ? styles.pillTextActive : undefined]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </BirdCard>
      ) : null}

      {step === 2 ? (
        <BirdCard>
          <Text style={styles.blockTitle}>Photos et description</Text>
          <BirdInput
            label="Description detaillee"
            placeholder="Etat, provenance, accessoires, garantie..."
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            style={styles.descriptionInput}
          />
          <BirdInput
            label={`Ajouter une photo (URL) - ${images.length}/5`}
            placeholder="https://..."
            autoCapitalize="none"
            value={imageInput}
            onChangeText={setImageInput}
          />
          <BirdButton label="Ajouter la photo" onPress={addImage} variant="secondary" disabled={!imageInput.trim() || images.length >= 5} />

          <View style={styles.photosRow}>
            {images.map((image) => (
              <View key={image} style={styles.photoItem}>
                <Image source={{ uri: image }} style={styles.photoImage} />
                <Pressable style={styles.removePhotoBtn} onPress={() => removeImage(image)}>
                  <Text style={styles.removePhotoText}>X</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </BirdCard>
      ) : null}

      {step === 3 ? (
        <BirdCard>
          <Text style={styles.blockTitle}>Prix et duree</Text>
          <BirdInput
            label="Prix de depart (XAF)"
            keyboardType="numeric"
            value={startPrice}
            onChangeText={setStartPrice}
          />
          <Text style={styles.pricePreview}>Apercu: {Number.isFinite(numericStartPrice) ? formatXaf(numericStartPrice) : '--'}</Text>

          <Text style={styles.fieldLabel}>Duree</Text>
          <View style={styles.wrapRow}>
            {durationOptions.map((hour) => {
              const active = hour === durationHours;
              return (
                <Pressable key={hour} style={[styles.pill, active ? styles.pillActive : undefined]} onPress={() => setDurationHours(hour)}>
                  <Text style={[styles.pillText, active ? styles.pillTextActive : undefined]}>{hour}h</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.boostCard}>
            <View style={styles.boostTextWrap}>
              <Text style={styles.boostTitle}>Mise en avant</Text>
              <Text style={styles.boostText}>Boostez la visibilite de l'annonce dans les resultats.</Text>
            </View>
            <Pressable style={[styles.toggleWrap, spotlight ? styles.toggleWrapActive : undefined]} onPress={() => setSpotlight((v) => !v)}>
              <View style={[styles.toggleDot, spotlight ? styles.toggleDotActive : undefined]} />
            </Pressable>
          </View>
        </BirdCard>
      ) : null}

      {step === 4 ? (
        <BirdCard>
          <Text style={styles.blockTitle}>Recapitulatif</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Titre</Text>
            <Text style={styles.summaryValue}>{title || '-'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Categorie</Text>
            <Text style={styles.summaryValue}>{categoryOptions.find((item) => item.id === category)?.label ?? '-'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Prix de depart</Text>
            <Text style={styles.summaryValue}>{Number.isFinite(numericStartPrice) ? formatXaf(numericStartPrice) : '-'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duree</Text>
            <Text style={styles.summaryValue}>{durationHours}h</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Photos</Text>
            <Text style={styles.summaryValue}>{images.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mise en avant</Text>
            <Text style={styles.summaryValue}>{spotlight ? 'Oui' : 'Non'}</Text>
          </View>
        </BirdCard>
      ) : null}

      <View style={styles.navRow}>
        <BirdButton
          label={step === 1 ? 'Retour' : 'Etape precedente'}
          onPress={step === 1 ? onBack : () => setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev))}
          variant="ghost"
        />
        {step < 4 ? (
          <BirdButton label="Continuer" onPress={() => setStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev))} disabled={!stepValid} />
        ) : (
          <BirdButton label={loading ? 'Publication...' : "Publier l'enchere"} onPress={publish} loading={loading} disabled={!canPublish} />
        )}
      </View>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#1b3048',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  blockTitle: {
    color: palette.text,
    fontSize: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontFamily: 'sans-serif-medium',
  },
  fieldLabel: {
    color: '#9fb0c7',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334e6d',
    backgroundColor: '#0d2238',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillActive: {
    borderColor: '#2563eb',
    backgroundColor: '#1d3f66',
  },
  pillText: {
    color: '#9fb0c7',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
  pillTextActive: {
    color: '#dbeafe',
  },
  descriptionInput: {
    minHeight: 110,
  },
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoItem: {
    width: 92,
    height: 92,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#355577',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    right: 5,
    top: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827bb',
  },
  removePhotoText: {
    color: '#f1f5f9',
    fontSize: 11,
    fontFamily: 'sans-serif-medium',
  },
  pricePreview: {
    color: '#60a5fa',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
  boostCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#22518a',
    backgroundColor: '#0c2a50',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  boostTextWrap: {
    flex: 1,
    gap: 3,
  },
  boostTitle: {
    color: '#dbeafe',
    fontSize: 16,
    fontFamily: 'sans-serif-medium',
  },
  boostText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'sans-serif',
  },
  toggleWrap: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#334155',
    padding: 3,
  },
  toggleWrapActive: {
    backgroundColor: '#2563eb',
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#cbd5e1',
  },
  toggleDotActive: {
    marginLeft: 22,
    backgroundColor: '#eff6ff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f3a5b',
    paddingBottom: 8,
  },
  summaryLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'sans-serif',
  },
  summaryValue: {
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
    textAlign: 'right',
    flexShrink: 1,
  },
  navRow: {
    flexDirection: 'row',
    gap: 8,
  },
  feedback: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'sans-serif-medium',
  },
});
