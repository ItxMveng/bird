import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

type InteractiveSplashProps = {
  onComplete: () => void;
};

const SPLASH_DURATION_MS = 2800;

export function InteractiveSplash({ onComplete }: InteractiveSplashProps) {
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entryAnim = Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: SPLASH_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const orbitLoop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: 4200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    entryAnim.start();
    pulseLoop.start();
    orbitLoop.start();

    const timer = setTimeout(onComplete, SPLASH_DURATION_MS + 350);
    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
      orbitLoop.stop();
    };
  }, [logoOpacity, logoScale, onComplete, orbit, progress, pulse]);

  const orbitRotate = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.1],
  });

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const highlights = useMemo(
    () => ['Enchères en direct', 'Connexion sécurisée', 'Paiements protégés'],
    [],
  );

  return (
    <Pressable style={styles.container} onPress={onComplete}>
      <View style={styles.bgTopGlow} />
      <View style={styles.bgBottomGlow} />

      <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />

      <Animated.View style={[styles.orbitWrap, { transform: [{ rotate: orbitRotate }] }]}>
        <View style={[styles.orbitDot, styles.dotA]} />
        <View style={[styles.orbitDot, styles.dotB]} />
      </Animated.View>

      <Animated.View style={[styles.logoCard, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Text style={styles.brandTag}>Bird Auction</Text>
        <Text style={styles.brandTitle}>BIRD</Text>
        <Text style={styles.brandSubtitle}>Acheter. Vendre. Conclure en confiance.</Text>
      </Animated.View>

      <View style={styles.featureRow}>
        {highlights.map((item) => (
          <View key={item} style={styles.featurePill}>
            <Text style={styles.featureText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
      <Text style={styles.skipText}>Touchez pour passer</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#061423',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  bgTopGlow: {
    position: 'absolute',
    top: -120,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#0ea5a455',
  },
  bgBottomGlow: {
    position: 'absolute',
    bottom: -160,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: '#f59e0b3a',
  },
  pulseRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: '#22d3ee88',
  },
  orbitWrap: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  orbitDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotA: {
    top: 16,
    left: 154,
    backgroundColor: '#22d3ee',
  },
  dotB: {
    bottom: 18,
    right: 120,
    backgroundColor: '#f59e0b',
  },
  logoCard: {
    width: '100%',
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 22,
    backgroundColor: '#0b22368c',
    borderWidth: 1,
    borderColor: '#67e8f933',
    alignItems: 'center',
    gap: 8,
  },
  brandTag: {
    color: '#67e8f9',
    letterSpacing: 2,
    fontSize: 12,
    textTransform: 'uppercase',
    fontFamily: 'sans-serif-condensed',
  },
  brandTitle: {
    color: '#f8fafc',
    fontSize: 44,
    letterSpacing: 5,
    fontFamily: 'sans-serif-medium',
  },
  brandSubtitle: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'serif',
  },
  featureRow: {
    width: '100%',
    marginTop: 26,
    gap: 8,
  },
  featurePill: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#0f2f48cc',
    borderWidth: 1,
    borderColor: '#67e8f933',
  },
  featureText: {
    color: '#dbeafe',
    fontSize: 12,
    fontFamily: 'sans-serif',
  },
  progressTrack: {
    width: '100%',
    marginTop: 26,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#14b8a6',
  },
  skipText: {
    marginTop: 14,
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'sans-serif-light',
  },
});
