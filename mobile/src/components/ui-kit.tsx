import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

export const palette = {
  bg: theme.bg,
  panel: theme.surface,
  panelSoft: theme.soft,
  line: theme.line,
  text: theme.ink,
  textMuted: theme.muted,
  textDim: theme.dim,
  teal: theme.primary,
  tealSoft: theme.primary,
  amber: '#D97706',
  danger: theme.danger,
  success: '#047857',
  primary: theme.primary,
  pink: theme.pink,
  orange: theme.orange,
};

type BirdScreenProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  rightActionLabel?: string;
  onRightAction?: () => void;
};

export function BirdScreen({ title, subtitle, children, onBack, rightActionLabel, onRightAction }: BirdScreenProps) {
  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.blobA} />
        <View style={styles.blobB} />
        <SafeAreaView>
          <View style={styles.heroRow}>
            {onBack ? (
              <Pressable style={styles.backBtn} onPress={onBack} accessibilityRole="button" accessibilityLabel="Retour">
                <Text style={styles.backText}>‹</Text>
              </Pressable>
            ) : null}
            <View style={styles.heroTitleWrap}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
            </View>
            {onRightAction && rightActionLabel ? (
              <Pressable style={styles.rightBtn} onPress={onRightAction}>
                <Text style={styles.rightBtnText}>{rightActionLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function BirdCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type BirdButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type BirdButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: BirdButtonVariant;
};

export function BirdButton({ label, onPress, disabled = false, loading = false, variant = 'primary' }: BirdButtonProps) {
  const inner = loading ? (
    <ActivityIndicator color={variant === 'primary' ? '#fff' : theme.primary} />
  ) : (
    <Text style={[styles.buttonText, variantText[variant]]}>{label}</Text>
  );
  const common = { disabled: disabled || loading, onPress, accessibilityRole: 'button' as const, accessibilityLabel: label };

  if (variant === 'primary') {
    return (
      <Pressable {...common} style={({ pressed }) => [styles.buttonWrap, disabled ? styles.buttonDisabled : undefined, pressed ? styles.pressed : undefined]}>
        <LinearGradient colors={theme.gradientSoft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable {...common} style={({ pressed }) => [styles.button, styles.buttonWrap, variantBox[variant], disabled ? styles.buttonDisabled : undefined, pressed ? styles.pressed : undefined]}>
      {inner}
    </Pressable>
  );
}

type BirdInputProps = TextInputProps & { label?: string; error?: string };

export function BirdInput({ label, error, style, ...props }: BirdInputProps) {
  return (
    <View style={styles.inputWrap}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput {...props} placeholderTextColor={theme.dim} style={[styles.input, error ? styles.inputErr : undefined, style]} />
      {error ? <Text style={styles.inputError}>{error}</Text> : null}
    </View>
  );
}

export function BirdTag({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const content = (
    <View style={[styles.tag, selected ? styles.tagActive : undefined]}>
      <Text style={[styles.tagText, selected ? styles.tagTextActive : undefined]}>{label}</Text>
    </View>
  );
  if (!onPress) return content;
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: theme.bg },
  hero: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 34 : 14,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  blobA: { position: 'absolute', top: -60, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: '#FFFFFF22' },
  blobB: { position: 'absolute', bottom: -70, left: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: '#FBBF2433' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
  heroTitleWrap: { flex: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF33', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '600' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { marginTop: 3, color: '#FFFFFFDD', fontSize: 13.5, lineHeight: 18 },
  rightBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFFFFF33' },
  rightBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 120, gap: 14 },
  card: {
    borderRadius: 22,
    backgroundColor: theme.surface,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.line,
    ...theme.shadow,
  },
  buttonWrap: { borderRadius: 16, overflow: 'hidden' },
  button: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  buttonDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  buttonText: { fontSize: 15, fontWeight: '700' },
  inputWrap: { gap: 6 },
  inputLabel: { color: theme.muted, fontSize: 12.5, fontWeight: '700' },
  input: {
    borderWidth: 1.5,
    borderColor: theme.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.ink,
    backgroundColor: theme.soft,
    fontSize: 15,
  },
  inputErr: { borderColor: theme.danger },
  inputError: { color: theme.danger, fontSize: 12 },
  tag: { borderRadius: 999, borderWidth: 1.5, borderColor: theme.line, backgroundColor: theme.surface, paddingHorizontal: 14, paddingVertical: 8 },
  tagActive: { borderColor: theme.primary, backgroundColor: theme.primary },
  tagText: { color: theme.muted, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  tagTextActive: { color: '#fff' },
  sectionTitle: { color: theme.ink, fontSize: 18, fontWeight: '800', marginBottom: 2 },
});

const variantText: Record<BirdButtonVariant, object> = {
  primary: { color: '#fff' },
  secondary: { color: theme.primary },
  ghost: { color: theme.muted },
  danger: { color: theme.danger },
};

const variantBox: Record<BirdButtonVariant, ViewStyle> = {
  primary: {},
  secondary: { backgroundColor: theme.soft, borderWidth: 1.5, borderColor: theme.line },
  ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.line },
  danger: { backgroundColor: '#FEE2E2', borderWidth: 1.5, borderColor: '#FCA5A5' },
};
