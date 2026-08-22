import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Loading } from '@/components/ScreenState';
import { type AuthUser, signOut } from '@/data/auth';
import { StarBand } from '@/motifs/Band';
import { Diamond } from '@/motifs/Diamond';
import { useSession } from '@/state/session';
import { colors } from '@/theme';

/**
 * Two letters for the rhomb, taken from the address because there is no name to
 * ask for yet: `ana.pop@` gives AP, `ana@` gives A. A separator is what tells
 * two words apart — anything else is one word and gets one letter, which is
 * better than a guess that reads as a stranger's initials.
 */
function initials(email: string | null): string {
  const [local = ''] = (email ?? '').split('@');
  const words = local.split(/[._-]+/).filter(Boolean);

  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

/**
 * The identity block of the design language: a 44px cherry rhomb with the
 * initials counter-rotated inside it, so the mark is a lozenge and the letters
 * still read upright.
 */
function Identity({ user }: { user: AuthUser }) {
  return (
    <View className="flex-row items-center gap-[13px]">
      <View
        // Decorative twice over — the rhomb is a shape and the initials are the
        // address abbreviated, which the next line reads out in full.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Diamond size={44} tint={colors.cherry} radius={8}>
          {/* Counter-rotated: the lozenge is turned, the letters are not. */}
          <Text className="-rotate-45 text-[15px] font-semibold text-surface">
            {initials(user.email)}
          </Text>
        </Diamond>
      </View>
      <Text className="flex-1 text-[16px] font-semibold text-ink">{user.email}</Text>
    </View>
  );
}

/**
 * What the tab says to someone who hasn't signed in — which is most people, and
 * which is fine. The invitation states the bargain rather than blocking on it:
 * an account is for adding places, and browsing never needs one.
 *
 * Centred text at the app's 24 gutter reads as a paragraph that lost its page,
 * so this column takes the empty invitation's 40 measure instead.
 */
function Invitation() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-10 py-16">
      <Text className="text-center text-[17px] font-semibold text-ink">
        {t('profile.anonymousTitle')}
      </Text>
      <Text className="mt-[7px] text-center text-[13px] leading-[19.5px] text-muted">
        {t('profile.anonymousHint')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/sign-in')}
        className="mt-6 rounded-full bg-cherry px-6 py-3 active:opacity-80"
      >
        <Text className="text-[14px] font-semibold text-surface">{t('profile.signIn')}</Text>
      </Pressable>
    </View>
  );
}

/**
 * The account block, at the foot of the screen. Signing out is quiet — cherry
 * because it is the one action here, small because nobody comes to this tab to
 * leave.
 */
function Account({ user }: { user: AuthUser }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  async function leaveAccount() {
    setFailed(false);
    try {
      await signOut();
      // Nothing to do on success: the session state redraws this tab when the
      // client reports the change, so there is no navigation to get wrong.
    } catch {
      // Rare, and narrow: supabase-js drops the local session before it reports
      // a revocation that failed, so a throw here means the session is still
      // on the device and this tab is still the signed-in one.
      setFailed(true);
    }
  }

  return (
    <View className="flex-1 justify-between">
      <Identity user={user} />
      <View className="gap-3">
        {failed ? (
          <Text accessibilityLiveRegion="polite" className="text-[12.5px] text-cherry">
            {t('profile.signOutFailed')}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={leaveAccount}
          // Padding, not `hitSlop`: 13 above and below a 13.5px label is the 44
          // target, and it costs the layout nothing visible.
          className="self-start py-[13px] pr-3 active:opacity-70"
        >
          <Text className="text-[13.5px] font-semibold text-cherry">{t('profile.signOut')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Who you are here, and the way out.
 *
 * "Your places", the language toggle and account deletion are the design's
 * other three blocks; they arrive with the slices that give them something to
 * show (#8, #13, #10) and slot in between the identity and the account blocks.
 */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, isLoading } = useSession();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-6 pb-3 pt-2">
        <Text className="text-[24px] font-bold tracking-[-0.4px] text-ink">
          {t('profile.title')}
        </Text>
      </View>
      {/* Edge to edge under the header, as on every other page. */}
      <StarBand height={14} />

      {isLoading ? (
        // Drawing the invitation first would flash "sign in" at someone who
        // already is, every time they open the tab.
        <Loading label={t('profile.loading')} />
      ) : user ? (
        <View className="flex-1 px-6 py-[18px]">
          <Account user={user} />
        </View>
      ) : (
        <Invitation />
      )}
    </SafeAreaView>
  );
}
