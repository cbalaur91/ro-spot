/**
 * Choosing photos off the device and getting them small enough to send. The one
 * module that knows about the picker and the manipulator, so the Add screen can
 * be tested without either.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { fitWithin, type DraftPhoto } from '@/submission';

/** The bucket takes JPEG only; ~80% is where a phone photo stops visibly losing anything. */
const JPEG_QUALITY = 0.8;

/**
 * A photo shrunk to the spec's ~1600px longest edge and re-encoded as JPEG,
 * whatever it arrived as. A photo that already fits is still re-encoded: the
 * bucket refuses anything that isn't a JPEG, and HEIC is what an iPhone hands over.
 */
async function compress(asset: ImagePicker.ImagePickerAsset): Promise<DraftPhoto> {
  // Decoded first, because the picker's own width and height can be 0 "if the
  // system did not provide" them — and a photo resized to nothing-known would go
  // up full size, into a bucket that refuses anything over 5 MB.
  const original = await ImageManipulator.manipulate(asset.uri).renderAsync();
  const size = fitWithin(original.width, original.height);
  const image = size
    ? await ImageManipulator.manipulate(original).resize(size).renderAsync()
    : original;

  const { uri } = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return { uri };
}

/**
 * Up to `limit` photos from the library, compressed — or none, if the person
 * backed out of the picker. The system photo picker needs no permission prompt
 * on either platform, so there is no refusal to handle here.
 */
export async function pickPhotos(limit: number): Promise<DraftPhoto[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    // Array order is display order, so the order they were chosen in is kept.
    orderedSelection: true,
  });

  if (result.canceled) return [];

  // `selectionLimit` is advice on some Android pickers, not a rule.
  return Promise.all(result.assets.slice(0, limit).map(compress));
}

/**
 * A compressed photo's bytes, for the upload. `fetch` on a local URI is how
 * both React Native and the browser read a file they were handed.
 */
export async function readPhoto(photo: DraftPhoto): Promise<ArrayBuffer> {
  const response = await fetch(photo.uri);
  return response.arrayBuffer();
}
