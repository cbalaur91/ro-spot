import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthProblem, signIn, signUp, type AuthProblemReason } from '@/data/auth';
import { StarBand } from '@/motifs/Band';
import { Bird } from '@/motifs/Bird';
import { colors } from '@/theme';

/** Sign in to an account, or make one. One screen, because it is one decision. */
type Mode = 'signIn' | 'signUp';

/**
 * What the screen has to say back: a failure in the app's own words, or the
 * sign-up that needs an inbox visited before it is a session.
 */
type Notice = { tone: 'error' | 'info'; message: string };

/** The reason a failure carries, or the one apology for everything else. */
function reasonOf(error: unknown): AuthProblemReason {
  return error instanceof AuthProblem ? error.reason : 'unknown';
}

/**
 * The 10px-radius white input of the design language — not a pill. A pill is a
 * thing you press; a field is a thing you fill.
 *
 * The label is carried as the accessible name rather than drawn above the
 * field: the canvas sets these with placeholders, and a screen reader still has
 * to be told which field it is in.
 */
function Field({
  label,
  ...input
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={colors.muted}
      className="rounded-[10px] border border-line bg-card px-[13px] py-3 text-[13.5px] text-ink"
      {...input}
    />
  );
}

/**
 * The way back out of a screen nobody is obliged to finish. Browsing needs no
 * account, so this screen must never be a wall.
 */
function BackChip() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('actions.back')}
      onPress={() => router.back()}
      // Padding rather than `hitSlop`: the chip hangs off an absolutely
      // positioned parent, and Android clips touch at a parent's bounds. 11
      // around a 22px icon is the 44 target.
      className="absolute left-3 top-1 z-10 p-[11px] active:opacity-70"
    >
      <Ionicons name="chevron-back" size={22} color={colors.ink} />
    </Pressable>
  );
}

export default function SignInScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const other: Mode = mode === 'signIn' ? 'signUp' : 'signIn';

  function switchTo(next: Mode) {
    setMode(next);
    // The old screen's answer doesn't apply to the new one — a "wrong password"
    // still on screen under a "Create account" button reads as a prophecy.
    setNotice(null);
  }

  /** Back to wherever this was opened from, or to the tab that offers it. */
  function leave() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/profile');
  }

  async function submit() {
    // Asked here rather than at the server: the server's answer to an empty
    // password is a validation error in English about a field name.
    if (!email.trim() || !password) {
      setNotice({ tone: 'error', message: t('auth.errors.missingFields') });
      return;
    }
    if (busy) return;

    setBusy(true);
    setNotice(null);

    try {
      if (mode === 'signUp') {
        const outcome = await signUp(email, password);
        if (outcome === 'confirmationRequired') {
          setNotice({ tone: 'info', message: t('auth.confirmationSent') });
          // Sign-in is what they do after the inbox, so leave them on it.
          setMode('signIn');
          return;
        }
      } else {
        await signIn(email, password);
      }

      leave();
    } catch (error) {
      setNotice({ tone: 'error', message: t(`auth.errors.${reasonOf(error)}`) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <BackChip />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28 }}
          // Without this the first tap on the pill only dismisses the keyboard,
          // and the user presses "Sign in" twice to sign in once.
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center">
            <Bird width={96} />
            <Text className="mt-[18px] text-center text-[26px] font-bold leading-[31px] tracking-[-0.4px] text-ink">
              {t(`auth.${mode}.title`)}
            </Text>
            <Text className="mt-[7px] text-center text-[14px] leading-[21px] text-muted">
              {t(`auth.${mode}.subtitle`)}
            </Text>
            {/* The band measures itself and a centred column gives it no width
                to measure, so this one is told how wide it is. */}
            <View className="my-5">
              <StarBand height={10} width={132} />
            </View>
          </View>

          <View className="gap-2.5">
            <Field
              label={t('auth.emailLabel')}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              editable={!busy}
            />
            <View>
              <Field
                label={t('auth.passwordLabel')}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!revealed}
                autoCapitalize="none"
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
                returnKeyType="go"
                onSubmitEditing={submit}
                editable={!busy}
                // Room for the reveal control, which sits inside the field.
                style={{ paddingRight: 64 }}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setRevealed((shown) => !shown)}
                className="absolute bottom-0 right-0 top-0 justify-center px-[13px] active:opacity-70"
              >
                <Text className="text-[12px] font-medium text-voronet">
                  {t(revealed ? 'auth.hidePassword' : 'auth.showPassword')}
                </Text>
              </Pressable>
            </View>
          </View>

          {notice ? (
            <Text
              // Announced rather than only drawn: the field the user is looking
              // at is not where the answer appears.
              accessibilityLiveRegion="polite"
              className={`mt-3 text-[12.5px] leading-[18px] ${
                notice.tone === 'error' ? 'text-cherry' : 'text-muted'
              }`}
            >
              {notice.message}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, busy }}
            disabled={busy}
            onPress={submit}
            className="mt-3.5 items-center rounded-full bg-cherry py-[13px] active:opacity-80"
          >
            {busy ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text className="text-[15px] font-semibold text-surface">
                {t(`auth.${mode}.submit`)}
              </Text>
            )}
          </Pressable>

          <View className="mt-2 flex-row items-center justify-center gap-1.5">
            <Text className="text-[12.5px] text-muted">{t(`auth.${mode}.footer`)}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => switchTo(other)}
              // The one control on this screen small enough to miss: padding
              // takes it to the 44 target without moving the line it sits on.
              className="py-[13px] pl-0.5 pr-1 active:opacity-70"
            >
              <Text className="text-[12.5px] font-semibold text-cherry">
                {t(`auth.${mode}.footerAction`)}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
