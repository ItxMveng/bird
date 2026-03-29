import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppDataProvider } from './src/context/AppDataContext';
import { palette } from './src/components/ui-kit';
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
import { Route, useAppRouter } from './src/navigation/router';

function AppInner() {
  const { user, step, logout } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const router = useAppRouter();
  const { route, go, selectedAuction, selectedTransaction, selectedThread, openAuction, openTransaction, openDispute, openThread } = router;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerTranslate = useRef(new Animated.Value(-280)).current;

  useEffect(() => {
    Animated.timing(drawerTranslate, {
      toValue: drawerOpen ? 0 : -280,
      duration: 210,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [drawerOpen, drawerTranslate]);

  if (showSplash) return <InteractiveSplash onComplete={() => setShowSplash(false)} />;
  if (!user || step !== 'authenticated') return <LoginScreen />;

  const mainNav: Array<{ label: string; route: Route }> = [
    { label: 'Accueil', route: 'home' },
    { label: 'Explorer', route: 'search' },
    { label: 'Messages', route: 'messages' },
    { label: 'Mes mises', route: 'transactions' },
    { label: 'Profil', route: 'profile' },
  ];

  const goTo = (next: Route) => {
    go(next);
    setDrawerOpen(false);
  };

  const detailRoutes: Route[] = ['auction', 'transactionDetail', 'dispute', 'conversation'];
  const showSidebarToggle = !detailRoutes.includes(route);

  return (
    <View style={styles.appRoot}>
      {route === 'home' && (
        <HomeScreen
          onOpenAuction={(auction) => {
            openAuction(auction);
          }}
          onOpenCreateAuction={() => go('create')}
          onOpenTransactions={() => go('transactions')}
          onOpenSearch={() => go('search')}
          onOpenMessages={() => go('messages')}
          onOpenWallet={() => go('wallet')}
        />
      )}
      {route === 'auction' && selectedAuction && <AuctionDetailScreen auction={selectedAuction} onBack={() => go('home')} />}
      {route === 'wallet' && <WalletScreen onBack={() => go('home')} />}
      {route === 'create' && <CreateAuctionScreen onBack={() => go('home')} />}
      {route === 'transactions' && (
        <TransactionsScreen
          onBack={() => go('home')}
          onOpenTransaction={(tx) => openTransaction(tx)}
        />
      )}
      {route === 'transactionDetail' && selectedTransaction && (
        <TransactionDetailScreen
          transaction={selectedTransaction}
          onBack={() => go('transactions')}
          onOpenDispute={(tx) => openDispute(tx)}
        />
      )}
      {route === 'dispute' && selectedTransaction && <DisputeScreen transaction={selectedTransaction} onBack={() => go('transactionDetail')} />}
      {route === 'profile' && <ProfileScreen onBack={() => go('home')} />}
      {route === 'search' && <SearchScreen onBack={() => go('home')} onOpenAuction={(a) => openAuction(a)} />}
      {route === 'notifications' && <NotificationsScreen onBack={() => go('home')} />}
      {route === 'messages' && <MessagesScreen onBack={() => go('home')} onOpenThread={(th) => openThread(th)} />}
      {route === 'conversation' && selectedThread && <ConversationScreen thread={selectedThread} onBack={() => go('messages')} />}
      {route === 'ratings' && <RatingsScreen onBack={() => go('home')} />}
      {route === 'admin' && <AdminDashboardScreen onBack={() => go('home')} />}

      {showSidebarToggle ? (
        <View style={styles.sideControls}>
          <Pressable style={styles.hamburgerButton} onPress={() => setDrawerOpen((v) => !v)}>
            <Text style={styles.hamburgerText}>{drawerOpen ? 'X' : '≡'}</Text>
          </Pressable>
        </View>
      ) : null}

      {drawerOpen ? <Pressable style={styles.drawerBackdrop} onPress={() => setDrawerOpen(false)} /> : null}

      <Animated.View style={[styles.drawerPanel, { transform: [{ translateX: drawerTranslate }] }]}>
        <Text style={styles.drawerTitle}>Navigation</Text>
        <Text style={styles.drawerUser}>{user?.name ?? user?.email ?? 'Compte'}</Text>

        <ScrollView contentContainerStyle={styles.drawerScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.groupTitle}>Principal</Text>
          {mainNav.map((item) => {
            const active = route === item.route;
            return (
              <Pressable key={item.route} style={[styles.drawerItem, active ? styles.drawerItemActive : undefined]} onPress={() => goTo(item.route)}>
                <Text style={[styles.drawerItemText, active ? styles.drawerItemTextActive : undefined]}>{item.label}</Text>
              </Pressable>
            );
          })}

          <Text style={styles.groupTitle}>Accès rapide</Text>
          <View style={styles.quickTools}>
            <Pressable style={[styles.quickToolBtn, route === 'create' ? styles.quickToolBtnActive : undefined]} onPress={() => goTo('create')}>
              <Text style={styles.quickToolText}>Créer</Text>
            </Pressable>
            <Pressable style={[styles.quickToolBtn, route === 'wallet' ? styles.quickToolBtnActive : undefined]} onPress={() => goTo('wallet')}>
              <Text style={styles.quickToolText}>Wallet</Text>
            </Pressable>
            <Pressable style={[styles.quickToolBtn, route === 'admin' ? styles.quickToolBtnActive : undefined]} onPress={() => goTo('admin')}>
              <Text style={styles.quickToolText}>Admin</Text>
            </Pressable>
          </View>
        </ScrollView>

        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </Animated.View>

      <StatusBar barStyle="light-content" backgroundColor={palette.bg} />
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
  appRoot: { flex: 1, backgroundColor: palette.bg },
  sideControls: {
    position: 'absolute',
    top: 46,
    left: 12,
    zIndex: 12,
  },
  hamburgerButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#274466',
    backgroundColor: '#0b1f36ef',
  },
  hamburgerText: {
    color: '#e2e8f0',
    fontSize: 21,
    lineHeight: 22,
    fontFamily: 'sans-serif-medium',
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: '#00000066',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 270,
    backgroundColor: '#071728',
    borderRightWidth: 1,
    borderRightColor: '#1d395a',
    zIndex: 11,
    paddingTop: 58,
    paddingHorizontal: 12,
    paddingBottom: 18,
  },
  drawerTitle: {
    color: '#f8fafc',
    fontSize: 23,
    fontFamily: 'sans-serif-medium',
  },
  drawerUser: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 3,
    marginBottom: 10,
    fontFamily: 'sans-serif',
  },
  drawerScroll: {
    gap: 7,
    paddingBottom: 10,
  },
  groupTitle: {
    color: '#60a5fa',
    fontSize: 11,
    marginTop: 8,
    marginBottom: 3,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: 'sans-serif-medium',
  },
  drawerItem: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0e2842',
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  drawerItemActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e40af33',
  },
  drawerItemText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontFamily: 'sans-serif',
  },
  drawerItemTextActive: {
    color: '#dbeafe',
    fontFamily: 'sans-serif-medium',
  },
  quickTools: {
    flexDirection: 'row',
    gap: 8,
  },
  quickToolBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0b2237',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickToolBtnActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e40af33',
  },
  quickToolText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontFamily: 'sans-serif-medium',
  },
  logoutBtn: {
    marginTop: 10,
    borderRadius: 11,
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
    paddingVertical: 10,
  },
  logoutText: {
    color: '#fee2e2',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
});
