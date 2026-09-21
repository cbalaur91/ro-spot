import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChip } from '@/components/CategoryChips';
import { Field, FormHeader, Input, PrimaryPill } from '@/components/Form';
import { PinMap } from '@/components/PinMap';
import type { Coords } from '@/geo';
import { geocodeAddress } from '@/geocode';
import { useOrigin } from '@/hooks/useOrigin';
import { pickPhotos } from '@/photos';
import { CATEGORIES } from '@/state/categoryFilter';
import {
  checkDraft,
  LIMITS,
  type DraftFields,
  type DraftPhoto,
  type DraftProblems,
  type PlaceDraft,
} from '@/submission';
import { categoryColor, colors } from '@/theme';

/**
 * Where a place being written is. `pin` carries what passed the check — fields
 * and photos both — so the last step sends exactly that rather than re-reading
 * a draft that a tap during the geocode could have changed.
 */
type Step =
  | { at: 'form' }
  | { at: 'pin'; fields: DraftFields; photos: DraftPhoto[]; coords: Coords; found: boolean };

const TILE = 52;

/**
 * The photo row: what's been chosen, then the tile that offers more while there
 * is room. Order is display order, so a photo is removed rather than replaced.
 */
function Photos({
  photos,
  isPicking,
  onAdd,
  onRemove,
}: {
  photos: DraftPhoto[];
  isPicking: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <View className="flex-row flex-wrap gap-2">
      {photos.map((photo, index) => (
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
      {photos.length < LIMITS.photos ? (
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

export type PlaceEditorProps = {
  /** What the form starts as: an empty draft, or a place the author already has. */
  initial: PlaceDraft;
  /** The page header, kept by both steps. */
  title: string;
  subtitle: string;
  /** The way out of the form step. The Add tab has none — the tab bar is it. */
  back?: { label: string; onPress: () => void };
  /** Where the place already sits, if it sits anywhere: an edit knows its pin. */
  pinned?: { address: string; coords: Coords };
  /** The pill that closes the pin step — the one action that writes anything. */
  saveLabel: string;
  /** Said in cherry over that pill when the save came back a failure. */
  failedLabel: string;
  onSave: (fields: DraftFields, coords: Coords, photos: DraftPhoto[]) => Promise<void>;
  onSaved: () => void;
};

/**
 * Writing a place down: the form, then the pin.
 *
 * One component in two steps rather than two routes, because the steps share
 * one draft and neither is somewhere a link should be able to land. It is the
 * same two steps whether the place is new (#7) or the author's own being
 * changed (#8) — what differs is where it starts and what happens to it after,
 * which is what the props are.
 *
 * The fields, the problems and the pin step's own words stay under `add.*` in
 * the locale files: they are the Add form's copy, and the edit screen *is* the
 * Add form (DESIGN §4.9). Only what the two screens say differently — the
 * header, the pill, the failure — arrives as a prop, so there is one place to
 * change a field's label rather than two that can drift apart.
 */
export function PlaceEditor({
  initial,
  title,
  subtitle,
  back,
  pinned,
  saveLabel,
  failedLabel,
  onSave,
  onSaved,
}: PlaceEditorProps) {
  const { t } = useTranslation();
  const { origin } = useOrigin();

  const [draft, setDraft] = useState<PlaceDraft>(initial);
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

    // An address that hasn't been touched has already been answered — by the
    // geocoder once, and then by wherever the author dragged the pin. Asking
    // again would move a place that only had its description fixed.
    if (pinned && pinned.address === check.fields.address) {
      setFailed(false);
      setStep({ at: 'pin', fields: check.fields, photos: draft.photos, coords: pinned.coords, found: true });
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

  async function save() {
    if (step.at !== 'pin' || busy) return;

    setBusy(true);
    setFailed(false);
    try {
      await onSave(step.fields, step.coords, step.photos);
    } catch {
      // Only the save itself is a save that failed. Whatever the screen does
      // next — navigate, swap to a done state — is not this message's business.
      setFailed(true);
      return;
    } finally {
      setBusy(false);
    }

    onSaved();
  }

  if (step.at === 'pin') {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <FormHeader
          title={t('add.pin.title')}
          subtitle={step.fields.address}
          back={busy ? undefined : { label: t('add.pin.edit'), onPress: () => setStep({ at: 'form' }) }}
        />
        <View className="flex-1">
          <PinMap
            coords={step.coords}
            found={step.found}
            tint={categoryColor[step.fields.category]}
            // Against the step as it is when the event lands: a drag that ends
            // after the save went through must not bring the pin step back.
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
            {failed ? failedLabel : step.found ? t('add.pin.hint') : t('add.pin.notFound')}
          </Text>
          <PrimaryPill label={saveLabel} busy={busy} onPress={save} />
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
      <FormHeader title={title} subtitle={subtitle} back={back} />
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
              photos={draft.photos}
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
