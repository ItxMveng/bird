import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

type InteractiveSplashProps = { onComplete: () => void };

/** Intro sobre : le nom de l'application, une seconde, puis l'app. */
export function InteractiveSplash({ onComplete }: InteractiveSplashProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const timer = setTimeout(onComplete, 1100);
    return () => clearTimeout(timer);
  }, [onComplete, opacity]);

  return (
    <View style={styles.root}>
      <Animated.View style={{ opacity, alignItems: 'center' }}>
        <Text style={styles.brand}>Bird</Text>
        <Text style={styles.tagline}>Enchères entre particuliers</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  brand: { color: theme.ink, fontSize: 44, fontWeight: '800', letterSpacing: -1.5 },
  tagline: { color: theme.muted, fontSize: 15, marginTop: 6 },
});
