import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppData } from '../context/AppDataContext';
import { MessageThread } from '../types';
import { BirdScreen, palette } from '../components/ui-kit';
import { formatDateTime } from '../utils/format';

type ThreadTab = 'tous' | 'achats' | 'ventes' | 'favoris';

export function MessagesScreen({ onBack, onOpenThread }: { onBack: () => void; onOpenThread: (thread: MessageThread) => void }) {
  const { threads, auctions } = useAppData();
  const [activeTab, setActiveTab] = useState<ThreadTab>('tous');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const filteredThreads = useMemo(() => {
    const sorted = [...threads].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (activeTab === 'favoris') return sorted.filter((thread) => favoriteIds.includes(thread.id));
    if (activeTab === 'achats') return sorted.filter((thread) => thread.withUser.toLowerCase().includes('vendeur') || thread.withUser.toLowerCase().includes('seller'));
    if (activeTab === 'ventes') return sorted.filter((thread) => thread.withUser.toLowerCase().includes('acheteur') || thread.withUser.toLowerCase().includes('buyer'));
    return sorted;
  }, [threads, activeTab, favoriteIds]);

  const tabs: Array<{ id: ThreadTab; label: string }> = [
    { id: 'tous', label: 'Tous' },
    { id: 'achats', label: 'Achats' },
    { id: 'ventes', label: 'Ventes' },
    { id: 'favoris', label: 'Favoris' },
  ];

  return (
    <BirdScreen title="Messages" subtitle="Messagerie enchères en temps réel." onBack={onBack}>
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.tabBtn}>
              <Text style={[styles.tabText, active ? styles.tabTextActive : undefined]}>{tab.label}</Text>
              {active ? <View style={styles.tabUnderline} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.listWrap}>
        {filteredThreads.map((thread, index) => {
          const linkedAuction = auctions.length > 0 ? auctions[index % auctions.length] : null;
          const isFav = favoriteIds.includes(thread.id);
          return (
            <Pressable key={thread.id} style={styles.threadCard} onPress={() => onOpenThread(thread)}>
              <Image source={{ uri: linkedAuction?.imageUrl ?? 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80' }} style={styles.productThumb} />
              <View style={styles.threadContent}>
                <View style={styles.threadTopRow}>
                  <Text style={styles.threadName} numberOfLines={1}>{thread.withUser}</Text>
                  <Text style={styles.threadTime}>{formatDateTime(thread.updatedAt)}</Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>{thread.lastMessage}</Text>
                <Text style={styles.metaText} numberOfLines={1}>
                  {linkedAuction ? `${linkedAuction.category} · Enchère #${linkedAuction.id}` : 'Enchère en cours'}
                </Text>
              </View>
              <Pressable
                style={[styles.favoriteDot, isFav ? styles.favoriteDotActive : undefined]}
                onPress={() =>
                  setFavoriteIds((prev) =>
                    prev.includes(thread.id) ? prev.filter((id) => id !== thread.id) : [...prev, thread.id],
                  )
                }
              >
                <Text style={styles.favoriteDotText}>{isFav ? '•' : ''}</Text>
              </Pressable>
            </Pressable>
          );
        })}
      </View>
    </BirdScreen>
  );
}

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#6D28D9',
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabText: {
    color: '#6D28D9',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#6D28D9',
  },
  tabUnderline: {
    height: 3,
    width: '55%',
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    marginTop: 9,
  },
  listWrap: {
    gap: 1,
    marginHorizontal: -16,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#6D28D9',
    backgroundColor: '#6D28D91A',
  },
  productThumb: {
    width: 72,
    height: 72,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E6DCF7',
  },
  threadContent: {
    flex: 1,
    gap: 2,
  },
  threadTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  threadName: {
    color: palette.text,
    fontSize: 17,
    flex: 1,
    fontWeight: '600',
  },
  threadTime: {
    color: '#6D28D9',
    fontSize: 11,
    fontWeight: '600',
  },
  lastMessage: {
    color: '#1F1A3D',
    fontSize: 13,
  },
  metaText: {
    color: '#6D28D9',
    fontSize: 11,
  },
  favoriteDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E6DCF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteDotActive: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  favoriteDotText: {
    color: '#1F1A3D',
    fontSize: 20,
    lineHeight: 20,
  },
});
