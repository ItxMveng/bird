import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

type InteractiveSplashProps = { onComplete: () => void };

const SPLASH_DURATION_MS = 2200;

const CHIPS: Array<{ label: string; color: string }> = [
  { label: 'Enchères en direct', color: '#FBBF24' },
  { label: 'Paiement en séquestre', color: '#34D399' },
  { label: 'Code secret à la remise', color: '#38BDF8' },
];

export function InteractiveSplash({ onComplete }: InteractiveSplashProps) {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const chipAnims = useRef(CHIPS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: SPLASH_DURATION_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.stagger(
        220,
        chipAnims.map((v) => Animated.timing(v, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true })),
      ),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    const timer = setTimeout(onComplete, SPLASH_DURATION_MS + 250);
    return () => {
      loop.stop();
      clearTimeout(timer);
    };
  }, [chipAnims, float, logoOpacity, logoScale, onComplete, progress]);

  const bob = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Pressable style={styles.flex} onPress={onComplete} accessibilityRole="button" accessibilityLabel="Passer l’introduction">
      <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.flex}>
        <View style={styles.blobA} />
        <View style={styles.blobB} />
        <View style={styles.blobC} />
        <View style={styles.center}>
          <Animated.View style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }, { translateY: bob }] }]}>
            <Text style={styles.logoText}>B</Text>
          </Animated.View>
          <Text style={styles.brand}>Bird</Text>
          <Text style={styles.tagline}>Achetez, vendez, concluez en confiance.</Text>
          <View style={styles.chips}>
            {CHIPS.map((c, i) => (
              <Animated.View
                key={c.label}
                style={[styles.chip, { opacity: chipAnims[i], transform: [{ translateY: chipAnims[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}
              >
                <View style={[styles.dot, { backgroundColor: c.color }]} />
                <Text style={styles.chipText}>{c.label}</Text>
              </Animated.View>
            ))}
          </View>
        </View>
        <View style={styles.footer}>
          <View style={styles.track}><Animated.View style={[styles.fill, { width }]} /></View>
          <Text style={styles.skip}>Touchez pour passer</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  blobA: { position: 'absolute', top: -90, right: -70, width: 280, height: 280, borderRadius: 140, backgroundColor: '#FFFFFF22' },
  blobB: { position: 'absolute', bottom: 120, left: -90, width: 230, height: 230, borderRadius: 115, backgroundColor: '#FBBF2433' },
  blobC: { position: 'absolute', bottom: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: '#38BDF833' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 10 },
  logo: { width: 110, height: 110, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...theme.shadow, shadowOpacity: 0.3 },
  logoText: { color: theme.primary, fontSize: 64, fontWeight: '900' },
  brand: { color: '#fff', fontSize: 52, fontWeight: '900', letterSpacing: -1.5, marginTop: 8 },
  tagline: { color: '#FFFFFFEE', fontSize: 16, textAlign: 'center' },
  chips: { marginTop: 22, gap: 10, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF2E', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  footer: { paddingHorizontal: 40, paddingBottom: 44, alignItems: 'center', gap: 10 },
  track: { height: 6, alignSelf: 'stretch', backgroundColor: '#FFFFFF33', borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  skip: { color: '#FFFFFFCC', fontSize: 12 },
});
