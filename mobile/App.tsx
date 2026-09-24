import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppDataProvider } from './src/context/AppDataContext';
import { InteractiveSplash } from './src/components/InteractiveSplash';
import { AdminDashboardScreen } from './src/screens/AdminDashboardScreen';
import { AuctionDetailScreen } from './src/screens/AuctionDetailScreen';
import { ConversationScreen } from './src/screens/ConversationScreen';
import { CreateAuctionScreen } from './src/screens/CreateAuctionScreen';
import { DisputeScreen } from './src/screens/DisputeScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { MessagesScreen } from './src/screens/MessagesScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RatingsScreen } from './src/screens/RatingsScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { TransactionDetailScreen } from './src/screens/TransactionDetailScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { Auction, MessageThread, Transaction } from './src/types';
import { theme } from './src/theme';

type Route =
  | 'home'
  | 'auction'
  | 'wallet'
  | 'create'
  | 'transactions'
  | 'transactionDetail'
  | 'dispute'
  | 'profile'
  | 'search'
  | 'notifications'
  | 'messages'
  | 'conversation'
  | 'ratings'
  | 'admin';

const DETAIL_ROUTES: Route[] = ['auction', 'transactionDetail', 'dispute', 'conversation', 'create'];

function AppInner() {
  const { user, step, logout } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [route, setRoute] = useState<Route>('home');
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  if (showSplash) return <InteractiveSplash onComplete={() => setShowSplash(false)} />;
  if (!user || step !== 'authenticated') return <LoginScreen />;

  const goTo = (next: Route) => {
    setRoute(next);
    setMoreOpen(false);
  };
  const showTabs = !DETAIL_ROUTES.includes(route);

  const tabs: Array<{ label: string; glyph: string; route: Route | 'more' }> = [
    { label: 'Accueil', glyph: '⌂', route: 'home' },
    { label: 'Explorer', glyph: '⌕', route: 'search' },
    { label: 'Vendre', glyph: '+', route: 'create' },
    { label: 'Mes mises', glyph: '◎', route: 'transactions' },
    { label: 'Plus', glyph: '≡', route: 'more' },
  ];

  const moreItems: Array<{ label: string; route: Route }> = [
    { label: 'Messages', route: 'messages' },
    { label: 'Portefeuille', route: 'wallet' },
    { label: 'Notifications', route: 'notifications' },
    { label: 'Avis reçus', route: 'ratings' },
    { label: 'Mon profil', route: 'profile' },
    { label: 'Administration', route: 'admin' },
  ];

  return (
    <View style={styles.appRoot}>
      {route === 'home' && (
        <HomeScreen
          onOpenAuction={(auction) => {
            setSelectedAuction(auction);
            setRoute('auction');
          }}
          onOpenCreateAuction={() => setRoute('create')}
          onOpenTransactions={() => setRoute('transactions')}
          onOpenSearch={() => setRoute('search')}
          onOpenMessages={() => setRoute('messages')}
          onOpenWallet={() => setRoute('wallet')}
        />
      )}
      {route === 'auction' && selectedAuction && <AuctionDetailScreen auction={selectedAuction} onBack={() => setRoute('home')} />}
      {route === 'wallet' && <WalletScreen onBack={() => setRoute('home')} />}
      {route === 'create' && <CreateAuctionScreen onBack={() => setRoute('home')} />}
      {route === 'transactions' && (
        <TransactionsScreen
          onBack={() => setRoute('home')}
          onOpenTransaction={(tx) => {
            setSelectedTransaction(tx);
            setRoute('transactionDetail');
          }}
        />
      )}
      {route === 'transactionDetail' && selectedTransaction && (
        <TransactionDetailScreen
          transaction={selectedTransaction}
          onBack={() => setRoute('transactions')}
          onOpenDispute={(tx) => {
            setSelectedTransaction(tx);
            setRoute('dispute');
          }}
        />
      )}
      {route === 'dispute' && selectedTransaction && <DisputeScreen transaction={selectedTransaction} onBack={() => setRoute('transactionDetail')} />}
      {route === 'profile' && <ProfileScreen onBack={() => setRoute('home')} />}
      {route === 'search' && (
        <SearchScreen
          onBack={() => setRoute('home')}
          onOpenAuction={(a) => {
            setSelectedAuction(a);
            setRoute('auction');
          }}
        />
      )}
      {route === 'notifications' && <NotificationsScreen onBack={() => setRoute('home')} />}
      {route === 'messages' && (
        <MessagesScreen
          onBack={() => setRoute('home')}
          onOpenThread={(th) => {
            setSelectedThread(th);
            setRoute('conversation');
          }}
        />
      )}
      {route === 'conversation' && selectedThread && <ConversationScreen thread={selectedThread} onBack={() => setRoute('messages')} />}
      {route === 'ratings' && <RatingsScreen onBack={() => setRoute('home')} />}
      {route === 'admin' && <AdminDashboardScreen onBack={() => setRoute('home')} />}

      {showTabs && (
        <View style={styles.tabBarWrap} pointerEvents="box-none">
          <View style={styles.tabBar}>
            {tabs.map((t) => {
              const active = t.route === route;
              const isFab = t.route === 'create';
              return (
                <Pressable
                  key={t.label}
                  style={styles.tab}
                  onPress={() => (t.route === 'more' ? setMoreOpen(true) : goTo(t.route))}
                  accessibilityRole="button"
                  accessibilityLabel={t.label}
                  accessibilityState={{ selected: active }}
                >
                  {isFab ? (
                    <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
                      <Text style={styles.fabGlyph}>+</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={[styles.glyph, active && styles.glyphActive]}>{t.glyph}</Text>
                  )}
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setMoreOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{user.name ?? user.email ?? 'Mon compte'}</Text>
            {moreItems.map((item) => (
              <Pressable key={item.route} style={styles.sheetItem} onPress={() => goTo(item.route)}>
                <Text style={styles.sheetItemText}>{item.label}</Text>
                <Text style={styles.sheetChevron}>›</Text>
              </Pressable>
            ))}
            <Pressable style={[styles.sheetItem, styles.logout]} onPress={() => { setMoreOpen(false); logout(); }}>
              <Text style={[styles.sheetItemText, { color: theme.danger }]}>Se déconnecter</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <AppInner />
      </AppDataProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1, backgroundColor: theme.bg, ...(Platform.OS === 'web' ? { maxWidth: 560, width: '100%', alignSelf: 'center' } : null) },
  tabBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: theme.line,
    ...theme.shadow,
    shadowOpacity: 0.22,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 46, justifyContent: 'flex-end' },
  glyph: { fontSize: 24, color: theme.dim, lineHeight: 26 },
  glyphActive: { color: theme.primary },
  tabLabel: { fontSize: 10.5, color: theme.dim, fontWeight: '700' },
  tabLabelActive: { color: theme.primary },
  fab: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: -30, borderWidth: 4, borderColor: '#fff' },
  fabGlyph: { color: '#fff', fontSize: 30, fontWeight: '700', lineHeight: 32 },
  sheetBackdrop: { flex: 1, backgroundColor: '#1F1A3D88', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, paddingBottom: 30, gap: 4, maxWidth: 560, width: '100%', alignSelf: 'center' },
  sheetHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: theme.line, marginBottom: 10 },
  sheetTitle: { color: theme.ink, fontWeight: '900', fontSize: 18, marginBottom: 6 },
  sheetItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.line },
  sheetItemText: { color: theme.ink, fontWeight: '700', fontSize: 15.5 },
  sheetChevron: { color: theme.dim, fontSize: 22 },
  logout: { borderBottomWidth: 0, marginTop: 4 },
});
