import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormHeader } from '@/components/Form';
import { PlaceEditor } from '@/components/PlaceEditor';
import { Loading } from '@/components/ScreenState';
import { submitPlace } from '@/data/submissions';
import { HoraBand } from '@/motifs/Band';
import { readPhoto } from '@/photos';
import { useSession } from '@/state/session';
import { EMPTY_DRAFT } from '@/submission';

/**
 * The gate. An account is for exactly this tab, so this is where the app asks
 * for one — and only here, only now. Same column as Profile's invitation: it is
 * the same bargain, stated from the other side.
 */
function Invitation() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-10 py-16">
      <Text className="text-center text-[17px] font-semibold text-ink">
        {t('add.anonymousTitle')}
      </Text>
      <Text className="mt-[7px] text-center text-[13px] leading-[19.5px] text-muted">
        {t('add.anonymousHint')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/sign-in')}
        className="mt-6 rounded-full bg-cherry px-6 py-3 active:opacity-80"
      >
        <Text className="text-[14px] font-semibold text-surface">{t('add.signIn')}</Text>
      </Pressable>
    </View>
  );
}

/**
 * Submitting a place: the form and the pin, then the wait.
 *
 * The draft lives in the editor, which is remounted after a submission that
 * went through — so "add another" starts empty, and a send that failed keeps
 * every word of what was written.
 */
function Submission() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [round, setRound] = useState(0);
  const [isDone, setIsDone] = useState(false);

  if (isDone) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <FormHeader title={t('add.title')} subtitle={t('add.subtitle')} />
        <View className="flex-1 items-center justify-center px-10">
          {/* Stretched: the band measures itself, and a centred column gives it
              no width to measure. */}
          <View className="self-stretch">
            <HoraBand />
          </View>
          <Text className="mt-[26px] text-center text-[17px] font-semibold text-ink">
            {t('add.done.title')}
          </Text>
          <Text className="mt-[7px] text-center text-[13px] leading-[19.5px] text-muted">
            {t('add.done.hint')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRound((current) => current + 1);
              setIsDone(false);
            }}
            className="mt-6 rounded-full border-[1.5px] border-cherry px-6 py-[11px] active:opacity-70"
          >
            <Text className="text-[14px] font-semibold text-cherry">{t('add.done.again')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <PlaceEditor
      key={round}
      initial={EMPTY_DRAFT}
      title={t('add.title')}
      subtitle={t('add.subtitle')}
      saveLabel={t('add.pin.submit')}
      failedLabel={t('add.submitFailed')}
      onSave={async (fields, coords, photos) => {
        await submitPlace({ ...fields, ...coords, photos: await Promise.all(photos.map(readPhoto)) });
        // The place the author just sent belongs under "your places" on the
        // Profile tab, which is mounted and holding the answer from before it.
        // Not awaited: the submission has landed, and a slow or failing refetch
        // must not be reported as a failed submission.
        void queryClient.invalidateQueries({ queryKey: ['places', 'mine'] });
      }}
      onSaved={() => setIsDone(true)}
    />
  );
}

/**
 * The Add tab: the gate, and behind it a submission.
 *
 * The submission is keyed by who is signed in, so its draft dies with the
 * session — the next person on this device doesn't inherit a stranger's
 * half-written place, or their photos.
 */
export default function AddScreen() {
  const { t } = useTranslation();
  const { user, isLoading } = useSession();

  if (user) return <Submission key={user.id} />;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <FormHeader title={t('add.title')} subtitle={t('add.subtitle')} />
      {/* As on Profile: the gate mustn't flash at someone already signed in. */}
      {isLoading ? <Loading label={t('add.loading')} /> : <Invitation />}
    </SafeAreaView>
  );
}
