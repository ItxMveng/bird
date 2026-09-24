import React, { useMemo, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppData } from '../context/AppDataContext';
import { Auction, AuctionCategory } from '../types';
import { BirdButton, BirdInput, BirdScreen, palette } from '../components/ui-kit';
import { formatXaf, getHoursLeft } from '../utils/format';

const categories: AuctionCategory[] = ['phones', 'electronics', 'moto', 'appliances'];
const conditions = ['Neuf', 'Occasion', 'Reconditionné', 'Pour pièces'] as const;

export function SearchScreen({ onBack, onOpenAuction }: { onBack: () => void; onOpenAuction: (auction: Auction) => void }) {
  const { auctions } = useAppData();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<AuctionCategory>('phones');
  const [city, setCity] = useState('Douala');
  const [minPrice, setMinPrice] = useState('0');
  const [maxPrice, setMaxPrice] = useState('500000');
  const [condition, setCondition] = useState<(typeof conditions)[number]>('Neuf');
  const [showResults, setShowResults] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = Number(minPrice) || 0;
    const max = Number(maxPrice) || Number.MAX_SAFE_INTEGER;
    return auctions.filter((auction) => {
      const byQuery = !q || auction.title.toLowerCase().includes(q) || auction.description.toLowerCase().includes(q);
      const byCategory = auction.category === category;
      const byCity = auction.city.toLowerCase().includes(city.toLowerCase());
      const byPrice = auction.currentPrice >= min && auction.currentPrice <= max;
      return byQuery && byCategory && byCity && byPrice;
    });
  }, [auctions, query, category, city, minPrice, maxPrice]);

  return (
    <BirdScreen title="Recherche avancée" subtitle="Filtres précis pour trouver plus vite." onBack={onBack} rightActionLabel="Reset" onRightAction={() => {
      setQuery('');
      setCategory('phones');
      setCity('Douala');
      setMinPrice('0');
      setMaxPrice('500000');
      setCondition('Neuf');
      setShowResults(false);
    }}>
      <View style={styles.panel}>
        <BirdInput value={query} onChangeText={setQuery} placeholder="Rechercher par mot-clé" />

        <Text style={styles.sectionLabel}>Catégories</Text>
        <View style={styles.wrapRow}>
          {categories.map((item) => (
            <Pressable key={item} style={[styles.chip, category === item ? styles.chipActive : undefined]} onPress={() => setCategory(item)}>
              <Text style={[styles.chipText, category === item ? styles.chipTextActive : undefined]}>
                {item === 'phones' ? 'Téléphones' : item === 'electronics' ? 'Informatique' : item === 'moto' ? 'Motos' : 'Électroménager'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Ville</Text>
        <View style={styles.cityColumn}>
          {['Douala', 'Yaoundé'].map((item) => {
            const active = city === item;
            return (
              <Pressable key={item} style={[styles.cityItem, active ? styles.cityItemActive : undefined]} onPress={() => setCity(item)}>
                <Text style={[styles.cityText, active ? styles.cityTextActive : undefined]}>{item}</Text>
                <View style={[styles.cityRadio, active ? styles.cityRadioActive : undefined]} />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Plage de prix (FCFA)</Text>
        <View style={styles.priceRow}>
          <View style={styles.priceCol}>
            <Text style={styles.fieldLabel}>Min</Text>
            <BirdInput value={minPrice} onChangeText={setMinPrice} keyboardType="numeric" />
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.fieldLabel}>Max</Text>
            <BirdInput value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" />
          </View>
        </View>
        <View style={styles.fakeSliderTrack}>
          <View style={styles.fakeSliderFill} />
          <View style={styles.fakeDotLeft} />
          <View style={styles.fakeDotRight} />
        </View>

        <Text style={styles.sectionLabel}>État de l'objet</Text>
        <View style={styles.wrapRow}>
          {conditions.map((item) => (
            <Pressable key={item} style={[styles.conditionBtn, condition === item ? styles.conditionBtnActive : undefined]} onPress={() => setCondition(item)}>
              <Text style={[styles.conditionText, condition === item ? styles.conditionTextActive : undefined]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <BirdButton label="Afficher les résultats" onPress={() => setShowResults(true)} />
      </View>

      {showResults ? (
        <View style={styles.resultsWrap}>
          {results.map((auction) => (
            <Pressable key={auction.id} style={styles.resultCard} onPress={() => onOpenAuction(auction)}>
              <ImageBackground source={{ uri: auction.imageUrl }} style={styles.resultImage} imageStyle={styles.resultImageStyle}>
                <View style={styles.imageOverlay} />
                <Text style={styles.resultTime}>{`${getHoursLeft(auction.endAt)}h`}</Text>
              </ImageBackground>
              <View style={styles.resultBody}>
                <Text style={styles.resultTitle} numberOfLines={1}>{auction.title}</Text>
                <Text style={styles.resultCity}>{auction.city}</Text>
                <Text style={styles.resultPrice}>{formatXaf(auction.currentPrice)}</Text>
              </View>
            </Pressable>
          ))}
          {results.length === 0 ? <Text style={styles.emptyText}>Aucun résultat avec ces filtres.</Text> : null}
        </View>
      ) : null}
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#6D28D9',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 12,
  },
  sectionLabel: {
    color: '#1F1A3D',
    fontSize: 16,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6DCF7',
    backgroundColor: '#F5F0FF',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  chipText: {
    color: '#1F1A3D',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  cityColumn: {
    gap: 8,
  },
  cityItem: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6DCF7',
    backgroundColor: '#F5F0FF',
    minHeight: 52,
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cityItemActive: {
    borderColor: '#6D28D9',
    backgroundColor: '#6D28D9',
  },
  cityText: {
    color: '#1F1A3D',
    fontSize: 18,
    fontWeight: '600',
  },
  cityTextActive: {
    color: '#FFFFFF',
  },
  cityRadio: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 2,
    borderColor: '#E6DCF7',
  },
  cityRadioActive: {
    borderColor: '#6D28D9',
    backgroundColor: '#6D28D9',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priceCol: {
    flex: 1,
    gap: 4,
  },
  fieldLabel: {
    color: '#6D28D9',
    fontSize: 12,
  },
  fakeSliderTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    marginTop: 2,
  },
  fakeSliderFill: {
    position: 'absolute',
    left: 12,
    right: 70,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#6D28D9',
  },
  fakeDotLeft: {
    position: 'absolute',
    left: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#dbeafe',
    borderWidth: 2,
    borderColor: '#6D28D9',
  },
  fakeDotRight: {
    position: 'absolute',
    right: 62,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#dbeafe',
    borderWidth: 2,
    borderColor: '#6D28D9',
  },
  conditionBtn: {
    minWidth: 142,
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6DCF7',
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    paddingVertical: 13,
  },
  conditionBtnActive: {
    borderColor: '#6D28D9',
    backgroundColor: '#6D28D9',
  },
  conditionText: {
    color: '#6D28D9',
    fontSize: 14,
    fontWeight: '600',
  },
  conditionTextActive: {
    color: '#FFFFFF',
  },
  resultsWrap: {
    gap: 10,
  },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6DCF7',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  resultImage: {
    height: 130,
    justifyContent: 'flex-end',
    padding: 10,
  },
  resultImageStyle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#6D28D91A',
  },
  resultTime: {
    alignSelf: 'flex-start',
    color: '#1F1A3D',
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  resultBody: {
    padding: 12,
    gap: 4,
  },
  resultTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  resultCity: {
    color: '#6D28D9',
    fontSize: 12,
  },
  resultPrice: {
    color: '#B45309',
    fontSize: 22,
    fontWeight: '600',
  },
  emptyText: {
    color: '#6D28D9',
    fontSize: 12,
    textAlign: 'center',
  },
});
