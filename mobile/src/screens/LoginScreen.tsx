import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());

export function LoginScreen() {
  const {
    step,
    mode,
    setMode,
    emailDraft,
    signInWithEmail,
    signUpWithEmail,
    completeProfile,
    feedback,
    isBusy,
    clearFeedback,
  } = useAuth();

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(18)).current;

  const [email, setEmail] = useState(emailDraft);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setEmail(emailDraft);
  }, [emailDraft]);

  useEffect(() => {
    cardOpacity.setValue(0);
    cardTranslate.setValue(18);
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslate, {
        toValue: 0,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardTranslate, mode, step]);

  const feedbackPalette = useMemo(() => {
    if (feedback.type === 'error') return { bg: '#7f1d1d', border: '#f87171', text: '#fee2e2' };
    if (feedback.type === 'success') return { bg: '#134e4a', border: '#2dd4bf', text: '#ccfbf1' };
    if (feedback.type === 'info') return { bg: '#1e3a8a', border: '#60a5fa', text: '#dbeafe' };
    return { bg: '#111827', border: '#374151', text: '#e5e7eb' };
  }, [feedback.type]);

  const credentialsStep = step === 'enter_credentials';
  const profileStep = step === 'complete_profile';

  const normalizedEmail = email.trim().toLowerCase();
  const passwordStrongEnough = password.length >= 6;
  const passwordsMatch = mode === 'signin' || password === confirmPassword;

  const canSubmitCredentials = isValidEmail(normalizedEmail) && passwordStrongEnough && passwordsMatch && !isBusy;
  const canSubmitProfile = name.trim().length >= 2 && city.trim().length >= 2 && !isBusy;

  const handleSubmitCredentials = async () => {
    clearFeedback();
    try {
      if (mode === 'signin') {
        await signInWithEmail(normalizedEmail, password);
      } else {
        await signUpWithEmail(normalizedEmail, password);
      }
    } catch {
      // Feedback handled in context.
    }
  };

  const handleCompleteProfile = async () => {
    clearFeedback();
    try {
      await completeProfile({ name, city });
    } catch {
      // Feedback handled in context.
    }
  };

  if (step === 'loading') {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Restauration de votre session Bird...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgTopGlow} />
      <View style={styles.bgBottomGlow} />

      <KeyboardAvoidingView style={styles.content} behavior="padding">
        <Text style={styles.brand}>Bird Auction</Text>
        <Text style={styles.title}>Connexion Email sécurisée</Text>
        <Text style={styles.subtitle}>
          Connecte-toi avec ton email et mot de passe pour accéder à tes enchères, messages et transactions.
        </Text>

        {feedback.type !== 'idle' && feedback.message.length > 0 && (
          <View style={[styles.feedbackBanner, { backgroundColor: feedbackPalette.bg, borderColor: feedbackPalette.border }]}>
            <Text style={[styles.feedbackText, { color: feedbackPalette.text }]}>{feedback.message}</Text>
          </View>
        )}

        {credentialsStep && (
          <View style={styles.modeTabs}>
            <Pressable
              style={[styles.modeTab, mode === 'signin' ? styles.modeTabActive : undefined]}
              onPress={() => {
                setMode('signin');
                clearFeedback();
              }}
            >
              <Text style={[styles.modeTabText, mode === 'signin' ? styles.modeTabTextActive : undefined]}>Connexion</Text>
            </Pressable>
            <Pressable
              style={[styles.modeTab, mode === 'signup' ? styles.modeTabActive : undefined]}
              onPress={() => {
                setMode('signup');
                clearFeedback();
              }}
            >
              <Text style={[styles.modeTabText, mode === 'signup' ? styles.modeTabTextActive : undefined]}>Inscription</Text>
            </Pressable>
          </View>
        )}

        <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }]}>
          {credentialsStep && (
            <>
              <Text style={styles.sectionTitle}>
                {mode === 'signin' ? 'Se connecter' : 'Créer un compte'}
              </Text>

              <Text style={styles.label}>Adresse email</Text>
              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  clearFeedback();
                }}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="exemple@bird.com"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    clearFeedback();
                  }}
                  style={styles.passwordInput}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  placeholder="Minimum 6 caractères"
                  placeholderTextColor="#94a3b8"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)}>
                  <Text style={styles.toggleText}>{showPassword ? 'Masquer' : 'Afficher'}</Text>
                </Pressable>
              </View>

              {mode === 'signup' && (
                <>
                  <Text style={styles.label}>Confirmer le mot de passe</Text>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={(value) => {
                        setConfirmPassword(value);
                        clearFeedback();
                      }}
                      style={styles.passwordInput}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      placeholder="Retape le mot de passe"
                      placeholderTextColor="#94a3b8"
                    />
                    <Pressable onPress={() => setShowConfirmPassword((v) => !v)}>
                      <Text style={styles.toggleText}>{showConfirmPassword ? 'Masquer' : 'Afficher'}</Text>
                    </Pressable>
                  </View>
                  {!passwordsMatch && confirmPassword.length > 0 && (
                    <Text style={styles.validationText}>Les mots de passe ne correspondent pas.</Text>
                  )}
                </>
              )}

              <Pressable
                style={[styles.primaryBtn, !canSubmitCredentials ? styles.disabledBtn : undefined]}
                disabled={!canSubmitCredentials}
                onPress={handleSubmitCredentials}
              >
                <Text style={styles.primaryBtnText}>
                  {isBusy ? 'Traitement...' : mode === 'signin' ? 'Se connecter' : "Créer mon compte"}
                </Text>
              </Pressable>
            </>
          )}

          {profileStep && (
            <>
              <Text style={styles.sectionTitle}>Finaliser votre profil</Text>
              <Text style={styles.helpText}>Encore une étape pour activer pleinement votre compte.</Text>

              <Text style={styles.label}>Nom complet</Text>
              <TextInput
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  clearFeedback();
                }}
                style={styles.input}
                placeholder="Ex: Francis Itoua"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Ville</Text>
              <TextInput
                value={city}
                onChangeText={(value) => {
                  setCity(value);
                  clearFeedback();
                }}
                style={styles.input}
                placeholder="Ex: Douala"
                placeholderTextColor="#94a3b8"
              />

              <Pressable
                style={[styles.primaryBtn, !canSubmitProfile ? styles.disabledBtn : undefined]}
                disabled={!canSubmitProfile}
                onPress={handleCompleteProfile}
              >
                <Text style={styles.primaryBtnText}>{isBusy ? 'Activation...' : "Terminer l'inscription"}</Text>
              </Pressable>
            </>
          )}
        </Animated.View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Firebase Email/Password</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>Session persistante locale</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#04101a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingCard: {
    width: '100%',
    backgroundColor: '#0a2237',
    borderColor: '#22d3ee44',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#e2e8f0',
    textAlign: 'center',
    fontFamily: 'serif',
  },
  safe: {
    flex: 1,
    backgroundColor: '#051423',
  },
  bgTopGlow: {
    position: 'absolute',
    top: -120,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#14b8a644',
  },
  bgBottomGlow: {
    position: 'absolute',
    bottom: -160,
    right: -40,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#f59e0b2e',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 18,
  },
  brand: {
    color: '#67e8f9',
    fontSize: 13,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontFamily: 'sans-serif-condensed',
  },
  title: {
    marginTop: 8,
    color: '#f8fafc',
    fontSize: 30,
    lineHeight: 34,
    fontFamily: 'sans-serif-medium',
  },
  subtitle: {
    marginTop: 10,
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'serif',
  },
  feedbackBanner: {
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'sans-serif-medium',
  },
  modeTabs: {
    marginTop: 18,
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    backgroundColor: '#0f2740',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  modeTab: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#22d3ee2d',
  },
  modeTabText: {
    color: '#93c5fd',
    fontSize: 14,
    fontFamily: 'sans-serif',
  },
  modeTabTextActive: {
    color: '#ecfeff',
    fontFamily: 'sans-serif-medium',
  },
  card: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#0b2237e6',
    borderColor: '#67e8f944',
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontFamily: 'sans-serif-medium',
  },
  helpText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'serif',
  },
  label: {
    marginTop: 6,
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
  input: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f8fafc',
    backgroundColor: '#102b42',
    fontSize: 15,
  },
  passwordWrap: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    backgroundColor: '#102b42',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  passwordInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 15,
    paddingVertical: 4,
  },
  toggleText: {
    color: '#67e8f9',
    fontSize: 13,
    fontFamily: 'sans-serif-medium',
  },
  validationText: {
    color: '#fca5a5',
    fontSize: 12,
    fontFamily: 'sans-serif',
  },
  primaryBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#14b8a6',
  },
  primaryBtnText: {
    color: '#062023',
    fontSize: 15,
    fontFamily: 'sans-serif-medium',
  },
  disabledBtn: {
    opacity: 0.55,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'sans-serif-light',
  },
  metaDot: {
    color: '#475569',
    fontSize: 11,
  },
});
