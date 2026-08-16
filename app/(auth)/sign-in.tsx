import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandGradient, Button, TextField, Txt, useToast } from '@/components/ui';
import { AuthError, useAuth } from '@/data/AuthProvider';
import { useI18n } from '@/i18n';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';

type Mode = 'in' | 'up';

export default function SignIn() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t, lang, setLang } = useI18n();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, googleAvailable } = useAuth();

  const [mode, setMode] = useState<Mode>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});

  const run = async (kind: 'google' | 'email', fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof AuthError ? t(e.key) : t('auth.errGeneric'));
    } finally {
      setBusy(null);
    }
  };

  const submitEmail = () => {
    const next: typeof errors = {};
    if (mode === 'up' && name.trim().length < 2) next.name = t('err.nameTooShort');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = t('auth.errInvalidEmail');
    if (password.length < 6) next.password = t('auth.errWeakPassword');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    run('email', () =>
      mode === 'in' ? signInWithEmail(email, password) : signUpWithEmail(name, email, password)
    );
  };

  const forgot = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrors({ email: t('auth.errInvalidEmail') });
      return;
    }
    run('email', async () => {
      await resetPassword(email);
      toast.success(t('auth.resetSent'));
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.huge }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BrandGradient style={[styles.hero, { paddingTop: insets.top + spacing.xxl }]} radiusOverride={0}>
          <View style={styles.langRow}>
            {(['en', 'ur'] as const).map((l) => (
              <Pressable
                key={l}
                onPress={() => setLang(l)}
                style={[
                  styles.langPill,
                  {
                    backgroundColor: lang === l ? '#FFFFFF' : withAlpha('#FFFFFF', 0.18),
                  },
                ]}
              >
                <Txt
                  variant="caption"
                  weight="700"
                  color={lang === l ? c.brand : '#FFFFFF'}
                  role={l === 'ur' ? 'heading' : 'ui'}
                >
                  {l === 'en' ? 'English' : 'اردو'}
                </Txt>
              </Pressable>
            ))}
          </View>

          <View style={styles.logoBox}>
            <MaterialCommunityIcons name="cup" size={38} color="#FFFFFF" />
          </View>
          <Txt variant="hero" weight="800" color="#FFFFFF" style={{ marginTop: spacing.lg }}>
            {t('app.name')}
          </Txt>
          <Txt variant="body" color={withAlpha('#FFFFFF', 0.85)} style={{ marginTop: 2 }}>
            {t('app.tagline')}
          </Txt>
        </BrandGradient>

        <View style={styles.body}>
          <Txt variant="display" weight="700">
            {mode === 'in' ? t('auth.welcome') : t('auth.signUp')}
          </Txt>
          <Txt variant="body" muted style={{ marginTop: 2 }}>
            {t('auth.welcomeSub')}
          </Txt>

          {googleAvailable ? (
            <>
              <Pressable
                onPress={() => run('google', signInWithGoogle)}
                disabled={busy !== null}
                style={({ pressed }) => [
                  styles.googleBtn,
                  {
                    backgroundColor: c.card,
                    borderColor: c.borderStrong,
                    opacity: busy !== null ? 0.6 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <GoogleMark />
                <Txt variant="bodyLg" weight="700">
                  {t('auth.google')}
                </Txt>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={[styles.line, { backgroundColor: c.border }]} />
                <Txt variant="caption" faint>
                  {t('auth.orEmail')}
                </Txt>
                <View style={[styles.line, { backgroundColor: c.border }]} />
              </View>
            </>
          ) : null}

          <View style={{ gap: spacing.md }}>
            {mode === 'up' ? (
              <TextField
                label={t('onb.ownerName')}
                value={name}
                onChangeText={setName}
                placeholder={t('cust.nameHint')}
                icon="account-outline"
                autoCapitalize="words"
                error={errors.name}
              />
            ) : null}

            <TextField
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailHint')}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="email-outline"
              error={errors.email}
            />

            <TextField
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordHint')}
              secureTextEntry
              autoCapitalize="none"
              icon="lock-outline"
              error={errors.password}
              onSubmitEditing={submitEmail}
            />
          </View>

          {mode === 'in' ? (
            <Pressable onPress={forgot} hitSlop={8} style={{ alignSelf: 'flex-end', marginTop: spacing.sm }}>
              <Txt variant="label" weight="600" color={c.primary}>
                {t('auth.forgot')}
              </Txt>
            </Pressable>
          ) : null}

          <Button
            label={mode === 'in' ? t('auth.signIn') : t('auth.signUp')}
            size="lg"
            full
            loading={busy === 'email'}
            disabled={busy !== null}
            onPress={submitEmail}
            style={{ marginTop: spacing.lg }}
          />

          <Pressable
            onPress={() => {
              setMode(mode === 'in' ? 'up' : 'in');
              setErrors({});
            }}
            hitSlop={8}
            style={{ alignSelf: 'center', marginTop: spacing.xl }}
          >
            <Txt variant="body" weight="600" color={c.primary} align="center">
              {mode === 'in' ? t('auth.noAccount') : t('auth.haveAccount')}
            </Txt>
          </Pressable>

          <Txt variant="micro" faint align="center" style={{ marginTop: spacing.xxl }}>
            {t('auth.legal')}
          </Txt>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Google's four-colour G, drawn with plain views to avoid a remote asset. */
function GoogleMark() {
  return (
    <View style={styles.gMark}>
      <Txt variant="subtitle" weight="800" color="#4285F4" style={{ marginTop: -1 }}>
        G
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  langRow: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'flex-end' },
  langPill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  logoBox: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginTop: spacing.xl,
  },
  gMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E9F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
});
