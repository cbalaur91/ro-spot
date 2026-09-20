import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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

import { CategoryChip } from '@/components/CategoryChips';
import { PinMap } from '@/components/PinMap';
import { Loading } from '@/components/ScreenState';
import { submitPlace } from '@/data/submissions';
import type { Coords } from '@/geo';
import { geocodeAddress } from '@/geocode';
import { useOrigin } from '@/hooks/useOrigin';
import { HoraBand, StarBand } from '@/motifs/Band';
import { pickPhotos, readPhoto } from '@/photos';
import { CATEGORIES } from '@/state/categoryFilter';
import { useSession } from '@/state/session';
import {
  checkDraft,
  EMPTY_DRAFT,
  LIMITS,
  type DraftFields,
  type DraftPhoto,
  type DraftProblem,
  type DraftProblems,
  type PlaceDraft,
} from '@/submission';
import { categoryColor, colors } from '@/theme';

/**
 * Where a submission is. `pin` carries what passed the check — fields and photos
 * both — so the last step sends exactly that rather than re-reading a draft that
 * a tap during the geocode could have changed.
 */
type Step =
  | { at: 'form' }
  | { at: 'pin'; fields: DraftFields; photos: DraftPhoto[]; coords: Coords; found: boolean }
  | { at: 'done' };

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
 * A label over a control, and under it whatever is wrong with what's in it.
 *
 * The label is drawn in the form-label mark. Over a text input it is hidden from
 * screen readers — the input carries the same words as its own accessible name,
 * and a field announced twice is worse than once. Over a group (the chips, the
 * photo tiles) nothing else says what the group is, so there it is `spoken`.
 */
function Field({
  label,
  suffix,
  problem,
  hint,
  spoken = false,
  children,
}: {
  label: string;
  spoken?: boolean;
  suffix?: string;
  problem?: DraftProblem;
  hint?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <View className="gap-1.5">
      <Text
        accessibilityElementsHidden={!spoken}
        importantForAccessibility={spoken ? 'auto' : 'no'}
        // Sentence-case for the reader; the class uppercases only what is drawn.
        accessibilityLabel={suffix ? `${label}, ${suffix}` : label}
        className="text-[11px] font-semibold uppercase tracking-[0.8px] text-ink"
      >
        {label}
        {suffix ? (
          <Text className="font-normal normal-case tracking-normal text-muted">{` · ${suffix}`}</Text>
        ) : null}
      </Text>
      {children}
      {problem ? (
        <Text accessibilityLiveRegion="polite" className="text-[11.5px] text-cherry">
          {t(`add.problems.${problem}`)}
        </Text>
      ) : hint ? (
        <Text className="text-[11.5px] text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}

/** The 10px-radius white input, as on the sign-in screen. */
function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      className="rounded-[10px] border border-line bg-card px-[13px] py-[11px] text-[13.5px] text-ink"
      {...props}
    />
  );
}

const TILE = 52;

/**
 * The photo row: what's been chosen, then the tile that offers more while there
 * is room. Order is display order, so a photo is removed rather than replaced.
 */
function Photos({
  draft,
  isPicking,
  onAdd,
  onRemove,
}: {
  draft: PlaceDraft;
  isPicking: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <View className="flex-row flex-wrap gap-2">
      {draft.photos.map((photo, index) => (
        <Pressable
          key={photo.uri}
          accessibilityRole="button"
          accessibilityLabel={t('add.removePhoto', { index: index + 1 })}
          onPress={() => onRemove(index)}
          className="overflow-hidden rounded-lg active:opacity-70"
          style={{ width: TILE, height: TILE }}
        >
          <Image source={{ uri: photo.uri }} style={{ width: TILE, height: TILE }} contentFit="cover" />
          {/* What a tap does, said on the tile: the photo leaves. */}
          <View className="absolute right-0.5 top-0.5 h-4 w-4 items-center justify-center rounded-full bg-surface">
            <Ionicons name="close" size={11} color={colors.ink} />
          </View>
        </Pressable>
      ))}
      {draft.photos.length < LIMITS.photos ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('add.addPhotos')}
          accessibilityState={{ busy: isPicking }}
          disabled={isPicking}
          onPress={onAdd}
          className="items-center justify-center rounded-lg border-[1.5px] border-dashed border-line active:opacity-70"
          style={{ width: TILE, height: TILE }}
        >
          {isPicking ? (
            <ActivityIndicator color={colors.muted} />
          ) : (
            <Ionicons name="add" size={20} color={colors.muted} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

/** The page header every step keeps, and the band under it. */
function Header({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle: string;
  back?: { label: string; onPress: () => void };
}) {
  return (
    <>
      <View className="flex-row items-center px-6 pb-3 pt-2">
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={back.label}
            onPress={back.onPress}
            // 11 around a 22px icon is the 44 target; the negative margin keeps
            // the chevron's ink, not its padding, on the gutter.
            className="-ml-[11px] p-[11px] active:opacity-70"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <Text className="text-[24px] font-bold tracking-[-0.4px] text-ink">{title}</Text>
          <Text className="text-[12.5px] text-muted" numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>
      <StarBand height={14} />
    </>
  );
}

/** The pill that closes a step, busy while its step is in flight. */
function PrimaryPill({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      className="items-center rounded-full bg-cherry py-3 active:opacity-80"
    >
      {busy ? (
        <ActivityIndicator color={colors.surface} />
      ) : (
        <Text className="text-[14px] font-semibold text-surface">{label}</Text>
      )}
    </Pressable>
  );
}

/**
 * Submitting a place: the form, then the pin, then the wait.
 *
 * One screen in three steps rather than three routes, because the steps share
 * one draft and none of them is somewhere a link should be able to land. The
 * draft outlives the pin step in both directions — back to fix a typo, or a
 * failed send — and is cleared only by a submission that went through.
 */
function Submission() {
  const { t } = useTranslation();
  const { origin } = useOrigin();

  const [draft, setDraft] = useState<PlaceDraft>(EMPTY_DRAFT);
  const [problems, setProblems] = useState<DraftProblems>({});
  const [step, setStep] = useState<Step>({ at: 'form' });
  const [isPicking, setIsPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  /** One field changed — and whatever was wrong with it is no longer known to be. */
  function editWith<K extends keyof PlaceDraft>(
    field: K,
    change: (current: PlaceDraft[K]) => PlaceDraft[K]
  ) {
    setDraft((current) => ({ ...current, [field]: change(current[field]) }));
    setProblems(({ [field]: _cleared, ...rest }) => rest);
  }

  function edit<K extends keyof PlaceDraft>(field: K, value: PlaceDraft[K]) {
    editWith(field, () => value);
  }

  async function addPhotos() {
    setIsPicking(true);
    try {
      const picked = await pickPhotos(LIMITS.photos - draft.photos.length);
      // Against the photos as they are now, not as they were when the picker
      // opened: one can be removed while it is up.
      if (picked.length > 0) {
        editWith('photos', (photos) => [...photos, ...picked].slice(0, LIMITS.photos));
      }
    } catch {
      // A picker that wouldn't open leaves the row as it was; the floor of one
      // photo will say what's missing if that matters.
    } finally {
      setIsPicking(false);
    }
  }

  async function toThePin() {
    const check = checkDraft(draft);
    if (!check.ok) {
      setProblems(check.problems);
      return;
    }

    setBusy(true);
    const found = await geocodeAddress(check.fields.address);
    setBusy(false);
    setFailed(false);
    // A miss is not a dead end: the pin starts where the person is — or where
    // the app assumes they are — and the step says it needs moving.
    setStep({
      at: 'pin',
      fields: check.fields,
      photos: draft.photos,
      coords: found ?? origin,
      found: found !== null,
    });
  }

  async function send() {
    if (step.at !== 'pin' || busy) return;

    setBusy(true);
    setFailed(false);
    try {
      const photos = await Promise.all(step.photos.map(readPhoto));
      await submitPlace({ ...step.fields, ...step.coords, photos });
      setDraft(EMPTY_DRAFT);
      setStep({ at: 'done' });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (step.at === 'done') {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Header title={t('add.title')} subtitle={t('add.subtitle')} />
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
            onPress={() => setStep({ at: 'form' })}
            className="mt-6 rounded-full border-[1.5px] border-cherry px-6 py-[11px] active:opacity-70"
          >
            <Text className="text-[14px] font-semibold text-cherry">{t('add.done.again')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (step.at === 'pin') {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <Header
          title={t('add.pin.title')}
          subtitle={step.fields.address}
          back={busy ? undefined : { label: t('add.pin.edit'), onPress: () => setStep({ at: 'form' }) }}
        />
        <View className="flex-1">
          <PinMap
            coords={step.coords}
            tint={categoryColor[step.fields.category]}
            // Against the step as it is when the event lands: a drag that ends
            // after the send went through must not bring the pin step back.
            onChange={(coords) =>
              setStep((current) => (current.at === 'pin' && !busy ? { ...current, coords } : current))
            }
          />
        </View>
        <View className="gap-3 px-6 pb-4 pt-3.5">
          <Text
            accessibilityLiveRegion="polite"
            className={`text-[12.5px] leading-[18px] ${
              failed || !step.found ? 'text-cherry' : 'text-muted'
            }`}
          >
            {failed
              ? t('add.submitFailed')
              : step.found
                ? t('add.pin.hint')
                : t('add.pin.notFound')}
          </Text>
          <PrimaryPill label={t('add.pin.submit')} busy={busy} onPress={send} />
        </View>
      </SafeAreaView>
    );
  }

  const text = (field: 'name' | 'address' | 'description' | 'phone' | 'website' | 'socialUrl') => ({
    value: draft[field],
    onChangeText: (value: string) => edit(field, value),
    placeholder: t(`add.placeholders.${field}`),
    editable: !busy,
  });
  const optional = (field: 'phone' | 'website' | 'socialUrl') =>
    t('add.optionalLabel', { field: t(`add.fields.${field}`) });

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Header title={t('add.title')} subtitle={t('add.subtitle')} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ gap: 14, paddingHorizontal: 24, paddingVertical: 18 }}
          // As on sign-in: otherwise the first tap on the pill only dismisses
          // the keyboard.
          keyboardShouldPersistTaps="handled"
        >
          <Field label={t('add.fields.name')} problem={problems.name}>
            <Input
              accessibilityLabel={t('add.fields.name')}
              maxLength={LIMITS.name}
              autoCapitalize="words"
              {...text('name')}
            />
          </Field>

          <Field label={t('add.fields.category')} problem={problems.category} spoken>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <CategoryChip
                  key={category}
                  category={category}
                  isOn={draft.category === category}
                  onPress={() => edit('category', category)}
                />
              ))}
            </View>
          </Field>

          <Field
            label={t('add.fields.address')}
            problem={problems.address}
            hint={t('add.addressHint')}
          >
            <Input
              accessibilityLabel={t('add.fields.address')}
              maxLength={LIMITS.address}
              autoComplete="street-address"
              textContentType="fullStreetAddress"
              {...text('address')}
            />
          </Field>

          <Field label={t('add.fields.description')} problem={problems.description}>
            <Input
              accessibilityLabel={t('add.fields.description')}
              maxLength={LIMITS.description}
              multiline
              textAlignVertical="top"
              style={{ minHeight: 56, lineHeight: 20 }}
              {...text('description')}
            />
          </Field>

          <Field label={t('add.fields.phone')} suffix={t('add.optional')} problem={problems.phone}>
            <Input
              accessibilityLabel={optional('phone')}
              keyboardType="phone-pad"
              autoComplete="tel"
              {...text('phone')}
            />
          </Field>

          <Field
            label={t('add.fields.website')}
            suffix={t('add.optional')}
            problem={problems.website}
          >
            <Input
              accessibilityLabel={optional('website')}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              {...text('website')}
            />
          </Field>

          <Field
            label={t('add.fields.socialUrl')}
            suffix={t('add.optional')}
            problem={problems.socialUrl}
          >
            <Input
              accessibilityLabel={optional('socialUrl')}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              {...text('socialUrl')}
            />
          </Field>

          <Field
            label={t('add.fields.photos')}
            suffix={t('add.photosRule')}
            problem={problems.photos}
            spoken
          >
            <Photos
              draft={draft}
              isPicking={isPicking}
              onAdd={addPhotos}
              onRemove={(index) =>
                editWith('photos', (photos) => photos.filter((_, at) => at !== index))
              }
            />
          </Field>

          <View className="mt-1">
            <PrimaryPill label={t('add.continue')} busy={busy} onPress={toThePin} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
      <Header title={t('add.title')} subtitle={t('add.subtitle')} />
      {/* As on Profile: the gate mustn't flash at someone already signed in. */}
      {isLoading ? <Loading label={t('add.loading')} /> : <Invitation />}
    </SafeAreaView>
  );
}
