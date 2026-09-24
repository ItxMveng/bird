import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());

export function LoginScreen() {
  const { step, mode, setMode, emailDraft, signInWithEmail, signUpWithEmail, completeProfile, feedback, isBusy, clearFeedback } = useAuth();

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
      Animated.timing(cardOpacity, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(cardTranslate, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [cardOpacity, cardTranslate, mode, step]);

  const feedbackPalette = useMemo(() => {
    if (feedback.type === 'error') return { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' };
    if (feedback.type === 'success') return { bg: '#D1FAE5', border: '#6EE7B7', text: '#065F46' };
    if (feedback.type === 'info') return { bg: '#EDE9FE', border: '#C4B5FD', text: '#4C1D95' };
    return { bg: '#F5F0FF', border: theme.line, text: theme.ink };
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
      if (mode === 'signin') await signInWithEmail(normalizedEmail, password);
      else await signUpWithEmail(normalizedEmail, password);
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
      <LinearGradient colors={theme.gradient} style={styles.loading}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Restauration de votre session…</Text>
      </LinearGradient>
    );
  }

  const canGo = profileStep ? canSubmitProfile : canSubmitCredentials;

  return (
    <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.flex}>
      <View style={styles.blobA} />
      <View style={styles.blobB} />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.logo}><Text style={styles.logoText}>B</Text></View>
            <Text style={styles.brand}>Bird</Text>
            <Text style={styles.tagline}>Enchères entre voisins, paiement sécurisé par séquestre.</Text>

            <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }]}>
              {credentialsStep && (
                <View style={styles.modeTabs}>
                  {(['signin', 'signup'] as const).map((m) => (
                    <Pressable
                      key={m}
                      style={[styles.modeTab, mode === m ? styles.modeTabActive : undefined]}
                      onPress={() => {
                        setMode(m);
                        clearFeedback();
                      }}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: mode === m }}
                    >
                      <Text style={[styles.modeTabText, mode === m ? styles.modeTabTextActive : undefined]}>{m === 'signin' ? 'Connexion' : 'Inscription'}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {feedback.type !== 'idle' && feedback.message.length > 0 && (
                <View style={[styles.feedback, { backgroundColor: feedbackPalette.bg, borderColor: feedbackPalette.border }]}>
                  <Text style={[styles.feedbackText, { color: feedbackPalette.text }]}>{feedback.message}</Text>
                </View>
              )}

              {credentialsStep && (
                <>
                  <Text style={styles.label}>Adresse email</Text>
                  <TextInput
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      clearFeedback();
                    }}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="vous@exemple.com"
                    placeholderTextColor={theme.dim}
                  />

                  <Text style={styles.label}>Mot de passe</Text>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      value={password}
                      onChangeText={(v) => {
                        setPassword(v);
                        clearFeedback();
                      }}
                      style={styles.passwordInput}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      placeholder="6 caractères minimum"
                      placeholderTextColor={theme.dim}
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
                          onChangeText={(v) => {
                            setConfirmPassword(v);
                            clearFeedback();
                          }}
                          style={styles.passwordInput}
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                          placeholder="Retapez le mot de passe"
                          placeholderTextColor={theme.dim}
                        />
                        <Pressable onPress={() => setShowConfirmPassword((v) => !v)}>
                          <Text style={styles.toggleText}>{showConfirmPassword ? 'Masquer' : 'Afficher'}</Text>
                        </Pressable>
                      </View>
                      {!passwordsMatch && confirmPassword.length > 0 && <Text style={styles.validation}>Les mots de passe ne correspondent pas.</Text>}
                    </>
                  )}
                </>
              )}

              {profileStep && (
                <>
                  <Text style={styles.cardTitle}>Dernière étape</Text>
                  <Text style={styles.help}>Votre nom et votre ville rassurent les autres membres.</Text>
                  <Text style={styles.label}>Nom complet</Text>
                  <TextInput value={name} onChangeText={(v) => { setName(v); clearFeedback(); }} style={styles.input} placeholder="Ex : Francis Itoua" placeholderTextColor={theme.dim} />
                  <Text style={styles.label}>Ville</Text>
                  <TextInput value={city} onChangeText={(v) => { setCity(v); clearFeedback(); }} style={styles.input} placeholder="Ex : Douala" placeholderTextColor={theme.dim} />
                </>
              )}

              <Pressable
                disabled={!canGo}
                onPress={profileStep ? handleCompleteProfile : handleSubmitCredentials}
                style={[styles.ctaWrap, !canGo ? styles.disabled : undefined]}
                accessibilityRole="button"
              >
                <LinearGradient colors={theme.gradientSoft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                  <Text style={styles.ctaText}>
                    {isBusy ? 'Un instant…' : profileStep ? 'Terminer mon inscription' : mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <View style={styles.perks}>
              <Text style={styles.perk}>Fonds bloqués jusqu’à la remise</Text>
              <Text style={styles.perk}>Code secret à la livraison</Text>
              <Text style={styles.perk}>Litiges arbitrés</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: '#fff', fontWeight: '700' },
  blobA: { position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: '#FFFFFF22' },
  blobB: { position: 'absolute', bottom: -90, left: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: '#FBBF2433' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 8, maxWidth: 520, width: '100%', alignSelf: 'center' },
  logo: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...theme.shadow },
  logoText: { color: theme.primary, fontSize: 40, fontWeight: '900' },
  brand: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  tagline: { color: '#FFFFFFEE', fontSize: 15, textAlign: 'center', marginBottom: 14, lineHeight: 21 },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 28, padding: 20, gap: 8, ...theme.shadow },
  modeTabs: { flexDirection: 'row', backgroundColor: theme.soft, borderRadius: 16, padding: 4, marginBottom: 6 },
  modeTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  modeTabActive: { backgroundColor: '#fff', ...theme.shadow, shadowOpacity: 0.1 },
  modeTabText: { color: theme.muted, fontWeight: '700' },
  modeTabTextActive: { color: theme.primary },
  feedback: { borderWidth: 1, borderRadius: 12, padding: 10 },
  feedbackText: { fontSize: 13, fontWeight: '600' },
  label: { color: theme.muted, fontSize: 12.5, fontWeight: '700', marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: theme.line, backgroundColor: theme.soft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.ink },
  passwordWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: theme.line, backgroundColor: theme.soft, borderRadius: 14, paddingRight: 12 },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.ink },
  toggleText: { color: theme.primary, fontWeight: '700', fontSize: 12.5 },
  validation: { color: theme.danger, fontSize: 12.5 },
  cardTitle: { color: theme.ink, fontSize: 22, fontWeight: '900' },
  help: { color: theme.muted, marginBottom: 4 },
  ctaWrap: { borderRadius: 16, overflow: 'hidden', marginTop: 10 },
  cta: { paddingVertical: 15, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.5 },
  perks: { marginTop: 14, gap: 4, alignItems: 'center' },
  perk: { color: '#FFFFFFDD', fontSize: 13, fontWeight: '600' },
});
