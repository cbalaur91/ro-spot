import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { locality } from '@/address';
import { Loading } from '@/components/ScreenState';
import { type AuthUser, deleteAccount, signOut } from '@/data/auth';
import type { Place } from '@/data/places';
import { useMyPlaces } from '@/hooks/useMyPlaces';
import { StarBand } from '@/motifs/Band';
import { Diamond } from '@/motifs/Diamond';
import { useSession } from '@/state/session';
import { categoryColor, colors } from '@/theme';

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
 * What became of a place, opposite its name. The fills are tints of the status
 * itself — gold while it waits, pine once it is public, cherry when it was
 * turned down — and the card's own top border stays the category's colour: a
 * place doesn't change what it is by being in a queue.
 */
const BADGE: Record<Place['status'], { fill: string; ink: string }> = {
  pending: { fill: colors.badgePending, ink: colors.goldDark },
  approved: { fill: colors.badgeApproved, ink: colors.pine },
  rejected: { fill: colors.badgeRejected, ink: colors.cherry },
};

function StatusBadge({ status }: { status: Place['status'] }) {
  const { t } = useTranslation();
  const { fill, ink } = BADGE[status];

  return (
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: fill }}>
      <Text
        className="text-[10.5px] font-semibold uppercase tracking-[0.5px]"
        style={{ color: ink }}
      >
        {t(`profile.places.status.${status}`)}
      </Text>
    </View>
  );
}

/**
 * One place the author sent in: what it is called, roughly where, and where it
 * has got to. Pressing it opens the same form it was written in.
 *
 * The card carries no explicit label — its accessible name is its own text,
 * which already reads the name, the town and the status.
 */
function PlaceCard({ place }: { place: Place }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t('profile.places.edit')}
      onPress={() => router.push(`/edit/${place.id}`)}
      style={{ borderTopColor: categoryColor[place.category], borderTopWidth: 3 }}
      className="flex-row items-center gap-3 rounded-xl border border-line bg-card px-[14px] py-3 active:opacity-80"
    >
      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-ink" numberOfLines={1}>
          {place.name}
        </Text>
        <Text className="text-[11.5px] text-muted" numberOfLines={1}>
          {locality(place.address)}
        </Text>
      </View>
      <StatusBadge status={place.status} />
    </Pressable>
  );
}

/**
 * Your places: the only view anyone has of a submission after they send it.
 *
 * The hint above the cards says the rule before it can surprise anybody — an
 * approved place leaves the map while an edit is looked at, and that is worth
 * knowing before the edit rather than after it.
 */
function YourPlaces() {
  const { t } = useTranslation();
  const { places, isPending, isError, refetch } = useMyPlaces();

  return (
    <View className="mt-6 flex-1 gap-1.5">
      <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-ink">
        {t('profile.places.label')}
      </Text>
      <Text className="text-[11.5px] text-muted">{t('profile.places.hint')}</Text>

      {isPending ? (
        <View className="flex-row items-center gap-2 py-2">
          <ActivityIndicator color={colors.cherry} />
          <Text className="text-[12.5px] text-muted">{t('profile.places.loading')}</Text>
        </View>
      ) : isError ? (
        <View className="items-start">
          <Text className="pt-1 text-[12.5px] text-muted">{t('profile.places.failed')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={refetch}
            className="py-[13px] pr-3 active:opacity-70"
          >
            <Text className="text-[13.5px] font-semibold text-cherry">{t('actions.retry')}</Text>
          </Pressable>
        </View>
      ) : places.length === 0 ? (
        <Text className="pt-1 text-[12.5px] text-muted">{t('profile.places.empty')}</Text>
      ) : (
        <View className="mt-1.5 gap-2">
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Deleting the account: a store requirement, so it is present and it is quiet —
 * a muted link under "Sign out" that asks before it does anything.
 *
 * The question opens in place as a card rather than a system alert: it says
 * what goes with the account in the app's own words and type, and it works the
 * same on every platform the app runs on, the web preview included.
 */
function DeleteAccount() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'closed' | 'asking' | 'deleting' | 'failed'>('closed');
  const title = useRef<Text>(null);
  const isOpen = step !== 'closed';

  // The link that was pressed has just unmounted, so a screen reader's focus
  // would land nowhere: send it to the question instead.
  useEffect(() => {
    if (isOpen && title.current) {
      AccessibilityInfo.sendAccessibilityEvent(title.current, 'focus');
    }
  }, [isOpen]);

  async function confirm() {
    setStep('deleting');
    try {
      await deleteAccount();
      // The account's places went with it — approved ones too — so the Map,
      // the List and any detail this device still holds must be read again.
      // The tab itself needs nothing: the session ends, and the session state
      // redraws it as the invitation, as after a sign-out.
      void queryClient.invalidateQueries({ queryKey: ['places'] });
      void queryClient.invalidateQueries({ queryKey: ['place'] });
    } catch {
      // The account is still there and so is the session — the card stays
      // open with the same button, so trying again is one press.
      setStep('failed');
    }
  }

  if (step === 'closed') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setStep('asking')}
        // The same 44 target as "Sign out", by the same padding — and `-mt-3`
        // so the two targets meet rather than float 38 apart: the padding
        // already puts 26 between the labels.
        className="-mt-3 self-start py-[13px] pr-3 active:opacity-70"
      >
        <Text className="text-[12.5px] text-muted">{t('profile.delete.action')}</Text>
      </Pressable>
    );
  }

  return (
    <View className="rounded-xl border border-line bg-card px-[14px] pt-3">
      <Text ref={title} className="text-[14px] font-semibold text-ink">
        {t('profile.delete.title')}
      </Text>
      <Text className="mt-1 text-[12.5px] leading-[18px] text-muted">
        {t('profile.delete.body')}
      </Text>
      {step === 'failed' ? (
        <Text accessibilityLiveRegion="polite" className="mt-2 text-[12.5px] text-cherry">
          {t('profile.delete.failed')}
        </Text>
      ) : null}

      {step === 'deleting' ? (
        // The buttons go while the request is out: a second press would only
        // ask a function whose caller no longer exists.
        <View className="flex-row items-center gap-2 py-[13px]">
          <ActivityIndicator color={colors.cherry} />
          <Text className="text-[12.5px] text-muted">{t('profile.delete.deleting')}</Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-x-5">
          <Pressable
            accessibilityRole="button"
            onPress={confirm}
            className="py-[13px] pr-1 active:opacity-70"
          >
            <Text className="text-[13.5px] font-semibold text-cherry">
              {t('profile.delete.confirm')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setStep('closed')}
            className="py-[13px] pr-1 active:opacity-70"
          >
            <Text className="text-[13.5px] font-semibold text-ink">
              {t('profile.delete.cancel')}
            </Text>
          </Pressable>
        </View>
      )}
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
    <>
      <Identity user={user} />
      <YourPlaces />
      <View className="mt-6 gap-3">
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
        <DeleteAccount />
      </View>
    </>
  );
}

/**
 * Who you are here, what you have sent in, and the way out.
 *
 * The language toggle is the design's other block; it arrives with the slice
 * that gives it something to show (#13) and slots in between "your places" and
 * the account block.
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
        // A scroll rather than a column: the account block still sits at the
        // foot of an empty screen (`flexGrow`), and a contributor with a dozen
        // places can still reach the way out.
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 18 }}>
          <Account user={user} />
        </ScrollView>
      ) : (
        <Invitation />
      )}
    </SafeAreaView>
  );
}
