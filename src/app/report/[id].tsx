import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field, FormHeader, Input, PrimaryPill } from '@/components/Form';
import { Loading } from '@/components/ScreenState';
import { reportPlace } from '@/data/reports';
import { useSession } from '@/state/session';

/** The table's ceiling, so "too long" is prevented rather than complained about. */
const NOTE_LIMIT = 1000;

/**
 * The gate, in the Add tab's column: a report comes from an account, so the
 * moderator can tell one person saying something twenty times from twenty
 * people saying it once. Sign-in is pushed on top of this screen, so coming
 * back from it lands on the form.
 */
function Invitation() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-10 py-16">
      <Text className="text-center text-[17px] font-semibold text-ink">
        {t('report.anonymousTitle')}
      </Text>
      <Text className="mt-[7px] text-center text-[13px] leading-[19.5px] text-muted">
        {t('report.anonymousHint')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/sign-in')}
        className="mt-6 rounded-full bg-cherry px-6 py-3 active:opacity-80"
      >
        <Text className="text-[14px] font-semibold text-surface">{t('report.signIn')}</Text>
      </Pressable>
    </View>
  );
}

/**
 * One optional note and one pill. A report is a single tap by design — the
 * note is there for whoever has more to say, never in the way of whoever hasn't.
 */
function ReportForm({ placeId, onSent }: { placeId: string; onSent: () => void }) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      // Blank or not, as typed: `reportPlace` decides what counts as no note.
      await reportPlace(placeId, note);
      onSent();
    } catch {
      // The note stays as written: a failed send must not cost anyone their words.
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 18, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        <Field label={t('report.note')} suffix={t('add.optional')}>
          <Input
            accessibilityLabel={t('add.optionalLabel', { field: t('report.note') })}
            value={note}
            onChangeText={setNote}
            placeholder={t('report.notePlaceholder')}
            editable={!busy}
            multiline
            maxLength={NOTE_LIMIT}
            textAlignVertical="top"
            style={{ minHeight: 96, lineHeight: 20 }}
          />
        </Field>
        {failed ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-[12.5px] leading-[18px] text-cherry"
          >
            {t('report.sendFailed')}
          </Text>
        ) : null}
        <PrimaryPill label={t('report.send')} busy={busy} onPress={send} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Said once it has landed, with the way back to the place it was about. */
function Sent() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-10 py-16">
      <Text className="text-center text-[17px] font-semibold text-ink">
        {t('report.done.title')}
      </Text>
      <Text className="mt-[7px] text-center text-[13px] leading-[19.5px] text-muted">
        {t('report.done.hint')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        className="mt-6 rounded-full border-[1.5px] border-cherry px-6 py-[11px] active:opacity-70"
      >
        <Text className="text-[14px] font-semibold text-cherry">{t('report.back')}</Text>
      </Pressable>
    </View>
  );
}

/**
 * "Report a problem" on a place, opened from its detail screen.
 *
 * A route rather than a sheet over the detail screen: an anonymous reporter is
 * sent to sign in and has to come back to something, and this is it. The form
 * is keyed by who is signed in, so a half-written note dies with the session.
 */
export default function ReportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isLoading } = useSession();
  const [isSent, setIsSent] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <FormHeader
        title={t('report.title')}
        subtitle={t('report.subtitle')}
        // Once sent, the pill is the way back, and one control is enough.
        back={isSent ? undefined : { label: t('report.back'), onPress: () => router.back() }}
      />
      {isSent ? (
        <Sent />
      ) : user ? (
        <ReportForm key={user.id} placeId={id} onSent={() => setIsSent(true)} />
      ) : isLoading ? (
        // As on the Add tab: the gate mustn't flash at someone already signed in.
        <Loading label={t('report.loading')} />
      ) : (
        <Invitation />
      )}
    </SafeAreaView>
  );
}
