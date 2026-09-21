import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormHeader, PlaceEditor } from '@/components/PlaceEditor';
import { Loading, LoadFailed, ScreenNotice } from '@/components/ScreenState';
import { placePhotoUrl } from '@/data/places';
import { updatePlace } from '@/data/submissions';
import { useMyPlaces } from '@/hooks/useMyPlaces';
import { readPhoto } from '@/photos';
import { draftFromPlace } from '@/submission';

/**
 * Changing a place you submitted.
 *
 * A route of its own, unlike the Add tab's steps: this one is arrived at with
 * an id, from a card on the Profile tab, and going back has to mean going back
 * there. The form itself is the Add tab's, prefilled — one form, so a place is
 * edited in the same words it was written in.
 *
 * Saving sends the place back to the moderation queue. That is the database's
 * doing, not this screen's: `updatePlace` cannot write a status, and a trigger
 * re-pends every edit that arrives from a client. The screen's job is to have
 * said so beforehand, which the subtitle does.
 */
export default function EditPlaceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { places, isPending, isError, refetch } = useMyPlaces();

  const place = places.find((candidate) => candidate.id === id);

  /** The way back: to the card that was pressed, wherever this was opened from. */
  const back = { label: t('edit.back'), onPress: () => router.back() };

  if (isPending || isError || !place) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <FormHeader title={t('edit.title')} subtitle={t('edit.subtitle')} back={back} />
        {isPending ? (
          <Loading label={t('edit.loading')} />
        ) : isError ? (
          <LoadFailed label={t('edit.failed')} onRetry={refetch} />
        ) : (
          // Not an error: a stale tab, a place that was deleted, or an id that
          // was never this person's. All of them are "not yours to edit".
          <ScreenNotice>
            <Text className="text-center text-[15px] text-ink">{t('edit.notFound')}</Text>
          </ScreenNotice>
        )}
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1">
      <PlaceEditor
        initial={draftFromPlace(place, placePhotoUrl)}
        title={t('edit.title')}
        subtitle={t('edit.subtitle')}
        back={back}
        // An address that wasn't touched keeps the pin the author already
        // dragged, rather than being geocoded back to the middle of the street.
        pinned={{ address: place.address, coords: { lat: place.lat, lng: place.lng } }}
        saveLabel={t('edit.save')}
        failedLabel={t('edit.saveFailed')}
        onSave={async (fields, coords, photos) => {
          await updatePlace(place.id, {
            ...fields,
            ...coords,
            // A kept photo travels as its path; a new one has bytes to upload.
            photos: await Promise.all(photos.map((photo) => photo.path ?? readPhoto(photo))),
          });
          // The place has left public browse and changed under "your places",
          // so both answers this app is holding are now wrong. Not awaited: the
          // save has landed, and a refetch that is slow — or that fails on the
          // way back — must not be reported as a failed save.
          void queryClient.invalidateQueries({ queryKey: ['places'] });
          void queryClient.invalidateQueries({ queryKey: ['place', place.id] });
        }}
        onSaved={() => router.back()}
      />
    </View>
  );
}
