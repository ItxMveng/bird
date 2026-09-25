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
import { Feather } from '@expo/vector-icons';
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
  amber: theme.warn,
  danger: theme.danger,
  success: theme.success,
  primary: theme.primary,
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
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />
      <SafeAreaView style={styles.header}>
        <View style={styles.headerRow}>
          {onBack ? (
            <Pressable style={styles.backBtn} onPress={onBack} accessibilityRole="button" accessibilityLabel="Retour" hitSlop={10}>
              <Feather name="chevron-left" size={24} color={theme.ink} />
            </Pressable>
          ) : null}
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
          </View>
          {onRightAction && rightActionLabel ? (
            <Pressable onPress={onRightAction} hitSlop={10}>
              <Text style={styles.rightAction}>{rightActionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, variantBox[variant], disabled ? styles.buttonDisabled : undefined, pressed ? styles.pressed : undefined]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : theme.ink} /> : <Text style={[styles.buttonText, variantText[variant]]}>{label}</Text>}
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
  header: { backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.line },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 38 : 14,
    paddingBottom: 14,
  },
  backBtn: { marginLeft: -6 },
  headerTitleWrap: { flex: 1 },
  title: { color: theme.ink, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { marginTop: 2, color: theme.muted, fontSize: 13, lineHeight: 18 },
  rightAction: { color: theme.ink, fontSize: 14, fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: {
    borderRadius: theme.radius,
    backgroundColor: theme.surface,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.line,
    ...theme.shadow,
  },
  button: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  buttonDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  inputWrap: { gap: 6 },
  inputLabel: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.ink,
    backgroundColor: theme.surface,
    fontSize: 15,
  },
  inputErr: { borderColor: theme.danger },
  inputError: { color: theme.danger, fontSize: 12 },
  tag: { borderRadius: 999, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, paddingHorizontal: 14, paddingVertical: 7 },
  tagActive: { borderColor: theme.primary, backgroundColor: theme.primary },
  tagText: { color: theme.muted, fontSize: 13, fontWeight: '500' },
  tagTextActive: { color: '#fff' },
  sectionTitle: { color: theme.ink, fontSize: 16, fontWeight: '700', marginBottom: 2 },
});

const variantText: Record<BirdButtonVariant, object> = {
  primary: { color: '#fff' },
  secondary: { color: theme.ink },
  ghost: { color: theme.muted },
  danger: { color: theme.danger },
};

const variantBox: Record<BirdButtonVariant, ViewStyle> = {
  primary: { backgroundColor: theme.primary },
  secondary: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: theme.dangerSoft },
};
