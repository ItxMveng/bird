import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

export const palette = {
  bg: '#051423',
  panel: '#0b2237e6',
  panelSoft: '#102b42',
  line: '#334155',
  text: '#f8fafc',
  textMuted: '#cbd5e1',
  textDim: '#94a3b8',
  teal: '#14b8a6',
  tealSoft: '#67e8f9',
  amber: '#f59e0b',
  danger: '#f87171',
  success: '#34d399',
};

type BirdScreenProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  rightActionLabel?: string;
  onRightAction?: () => void;
};

export function BirdScreen({
  title,
  subtitle,
  children,
  onBack,
  rightActionLabel,
  onRightAction,
}: BirdScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgTopGlow} />
      <View style={styles.bgBottomGlow} />

      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          {onBack ? (
            <Pressable style={styles.headerBtn} onPress={onBack}>
              <Text style={styles.headerBtnText}>Retour</Text>
            </Pressable>
          ) : (
            <View style={styles.headerBtnGhost} />
          )}

          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          {onRightAction && rightActionLabel ? (
            <Pressable style={styles.headerBtn} onPress={onRightAction}>
              <Text style={styles.headerBtnText}>{rightActionLabel}</Text>
            </Pressable>
          ) : (
            <View style={styles.headerBtnGhost} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function BirdCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
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

export function BirdButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
}: BirdButtonProps) {
  const styleByVariant: Record<BirdButtonVariant, ViewStyle> = {
    primary: styles.btnPrimary,
    secondary: styles.btnSecondary,
    ghost: styles.btnGhost,
    danger: styles.btnDanger,
  };

  const textByVariant: Record<BirdButtonVariant, object> = {
    primary: styles.btnPrimaryText,
    secondary: styles.btnSecondaryText,
    ghost: styles.btnGhostText,
    danger: styles.btnDangerText,
  };

  return (
    <Pressable
      style={[styles.button, styleByVariant[variant], disabled ? styles.buttonDisabled : undefined]}
      disabled={disabled || loading}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? palette.tealSoft : palette.bg} />
      ) : (
        <Text style={[styles.buttonText, textByVariant[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

type BirdInputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function BirdInput({ label, error, style, ...props }: BirdInputProps) {
  return (
    <View style={styles.inputWrap}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        {...props}
        placeholderTextColor={palette.textDim}
        style={[styles.input, style]}
      />
      {error ? <Text style={styles.inputError}>{error}</Text> : null}
    </View>
  );
}

export function BirdTag({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.tag, selected ? styles.tagActive : undefined]}>
      <Text style={[styles.tagText, selected ? styles.tagTextActive : undefined]}>{label}</Text>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress}>
      {content}
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  bgTopGlow: {
    position: 'absolute',
    top: -120,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 160,
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#67e8f944',
    backgroundColor: '#0f2f48cc',
    minWidth: 72,
    alignItems: 'center',
  },
  headerBtnGhost: {
    minWidth: 72,
  },
  headerBtnText: {
    color: palette.tealSoft,
    fontSize: 12,
    fontFamily: 'sans-serif-medium',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: palette.text,
    fontSize: 19,
    fontFamily: 'sans-serif-medium',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 2,
    color: palette.textDim,
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'serif',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#67e8f933',
    backgroundColor: palette.panel,
    padding: 14,
    gap: 8,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'sans-serif-medium',
  },
  btnPrimary: {
    backgroundColor: palette.teal,
  },
  btnPrimaryText: {
    color: '#062023',
  },
  btnSecondary: {
    backgroundColor: '#22d3ee2b',
    borderWidth: 1,
    borderColor: '#67e8f955',
  },
  btnSecondaryText: {
    color: '#cffafe',
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: palette.line,
  },
  btnGhostText: {
    color: palette.textMuted,
  },
  btnDanger: {
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#f87171',
  },
  btnDangerText: {
    color: '#fee2e2',
  },
  inputWrap: {
    gap: 5,
  },
  inputLabel: {
    color: palette.textMuted,
    fontSize: 12,
    fontFamily: 'sans-serif-medium',
  },
  input: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: palette.text,
    backgroundColor: palette.panelSoft,
    fontSize: 15,
  },
  inputError: {
    color: palette.danger,
    fontSize: 12,
    fontFamily: 'sans-serif',
  },
  tag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#0f2740',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagActive: {
    borderColor: '#67e8f988',
    backgroundColor: '#22d3ee2d',
  },
  tagText: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'capitalize',
    fontFamily: 'sans-serif',
  },
  tagTextActive: {
    color: '#ecfeff',
    fontFamily: 'sans-serif-medium',
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 17,
    fontFamily: 'sans-serif-medium',
    marginBottom: 4,
  },
});
