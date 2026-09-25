import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());

export function LoginScreen() {
  const { step, mode, setMode, emailDraft, signInWithEmail, signUpWithEmail, completeProfile, feedback, isBusy, clearFeedback } = useAuth();

  const [email, setEmail] = useState(emailDraft);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setEmail(emailDraft);
  }, [emailDraft]);

  const fb = useMemo(() => {
    if (feedback.type === 'error') return { bg: theme.dangerSoft, text: '#991B1B' };
    if (feedback.type === 'success') return { bg: theme.successSoft, text: '#065F46' };
    return { bg: theme.soft, text: theme.ink };
  }, [feedback.type]);

  const credentialsStep = step === 'enter_credentials';
  const profileStep = step === 'complete_profile';
  const normalizedEmail = email.trim().toLowerCase();
  const passwordsMatch = mode === 'signin' || password === confirmPassword;
  const canSubmitCredentials = isValidEmail(normalizedEmail) && password.length >= 6 && passwordsMatch && !isBusy;
  const canSubmitProfile = name.trim().length >= 2 && city.trim().length >= 2 && !isBusy;
  const canGo = profileStep ? canSubmitProfile : canSubmitCredentials;

  const submit = async () => {
    clearFeedback();
    try {
      if (profileStep) await completeProfile({ name, city });
      else if (mode === 'signin') await signInWithEmail(normalizedEmail, password);
      else await signUpWithEmail(normalizedEmail, password);
    } catch {
      // Le message d'erreur est géré par le contexte d'authentification.
    }
  };

  if (step === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.ink} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.wrap}>
            <Text style={styles.brand}>Bird</Text>
            <Text style={styles.tagline}>Enchères entre particuliers, avec paiement sécurisé par séquestre.</Text>

            {credentialsStep && (
              <View style={styles.tabs}>
                {(['signin', 'signup'] as const).map((m) => (
                  <Pressable key={m} onPress={() => { setMode(m); clearFeedback(); }} style={[styles.tab, mode === m && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: mode === m }}>
                    <Text style={[styles.tabText, mode === m && styles.tabTextOn]}>{m === 'signin' ? 'Connexion' : 'Créer un compte'}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {feedback.type !== 'idle' && feedback.message.length > 0 && (
              <View style={[styles.feedback, { backgroundColor: fb.bg }]}>
                <Text style={[styles.feedbackText, { color: fb.text }]}>{feedback.message}</Text>
              </View>
            )}

            {credentialsStep && (
              <View style={styles.form}>
                <Text style={styles.label}>Adresse email</Text>
                <TextInput value={email} onChangeText={(v) => { setEmail(v); clearFeedback(); }} style={styles.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="vous@exemple.com" placeholderTextColor={theme.dim} />
                <Text style={styles.label}>Mot de passe</Text>
                <View style={styles.pwWrap}>
                  <TextInput value={password} onChangeText={(v) => { setPassword(v); clearFeedback(); }} style={styles.pwInput} secureTextEntry={!showPassword} autoCapitalize="none" placeholder="6 caractères minimum" placeholderTextColor={theme.dim} />
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    <Text style={styles.toggle}>{showPassword ? 'Masquer' : 'Afficher'}</Text>
                  </Pressable>
                </View>
                {mode === 'signup' && (
                  <>
                    <Text style={styles.label}>Confirmer le mot de passe</Text>
                    <TextInput value={confirmPassword} onChangeText={(v) => { setConfirmPassword(v); clearFeedback(); }} style={styles.input} secureTextEntry={!showPassword} autoCapitalize="none" placeholder="Retapez le mot de passe" placeholderTextColor={theme.dim} />
                    {!passwordsMatch && confirmPassword.length > 0 && <Text style={styles.validation}>Les mots de passe ne correspondent pas.</Text>}
                  </>
                )}
              </View>
            )}

            {profileStep && (
              <View style={styles.form}>
                <Text style={styles.stepTitle}>Dernière étape</Text>
                <Text style={styles.help}>Votre nom et votre ville sont visibles des autres membres.</Text>
                <Text style={styles.label}>Nom complet</Text>
                <TextInput value={name} onChangeText={(v) => { setName(v); clearFeedback(); }} style={styles.input} placeholder="Prénom Nom" placeholderTextColor={theme.dim} />
                <Text style={styles.label}>Ville</Text>
                <TextInput value={city} onChangeText={(v) => { setCity(v); clearFeedback(); }} style={styles.input} placeholder="Douala" placeholderTextColor={theme.dim} />
              </View>
            )}

            <Pressable disabled={!canGo} onPress={submit} style={[styles.cta, !canGo && styles.ctaOff]} accessibilityRole="button">
              <Text style={styles.ctaText}>{isBusy ? 'Un instant…' : profileStep ? 'Terminer' : mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}</Text>
            </Pressable>

            <Text style={styles.legal}>Les fonds de vos achats restent bloqués jusqu’à la remise en main propre et la validation par code secret.</Text>
            {Platform.OS === 'web' ? (
              <Pressable onPress={() => Linking.openURL('/download.html')} accessibilityRole="link">
                <Text style={styles.download}>Télécharger l’application Android</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: theme.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  wrap: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  brand: { color: theme.ink, fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  tagline: { color: theme.muted, fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 28 },
  tabs: { flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: theme.line, marginBottom: 20 },
  tab: { paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabOn: { borderBottomColor: theme.ink },
  tabText: { color: theme.muted, fontWeight: '500', fontSize: 15 },
  tabTextOn: { color: theme.ink, fontWeight: '700' },
  feedback: { borderRadius: 10, padding: 12, marginBottom: 14 },
  feedbackText: { fontSize: 13.5, fontWeight: '500' },
  form: { gap: 6 },
  label: { color: theme.muted, fontSize: 13, fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: theme.ink },
  pwWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, borderRadius: 12, paddingRight: 14 },
  pwInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: theme.ink },
  toggle: { color: theme.muted, fontWeight: '600', fontSize: 13 },
  validation: { color: theme.danger, fontSize: 13 },
  stepTitle: { color: theme.ink, fontSize: 22, fontWeight: '700' },
  help: { color: theme.muted, marginBottom: 6 },
  cta: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 22 },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  legal: { color: theme.dim, fontSize: 12.5, lineHeight: 18, marginTop: 20, textAlign: 'center' },
  download: { color: theme.muted, fontSize: 13, textAlign: 'center', marginTop: 12, textDecorationLine: 'underline' },
});
