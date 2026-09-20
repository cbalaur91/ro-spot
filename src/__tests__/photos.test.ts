import { ImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { pickPhotos } from '../photos';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: { manipulate: jest.fn() },
}));

const launch = ImagePicker.launchImageLibraryAsync as jest.Mock;
const manipulate = ImageManipulator.manipulate as jest.Mock;

/**
 * The manipulator as `compress` drives it: a decode that reports the photo's
 * real size, then — only if asked — a resize of that decoded image.
 */
function decodesTo(width: number, height: number) {
  const saveAsync = jest.fn().mockResolvedValue({ uri: 'file:///small.jpg' });
  const decoded = { width, height, saveAsync };
  const resized = { saveAsync };
  const resize = jest.fn().mockReturnValue({ renderAsync: jest.fn().mockResolvedValue(resized) });

  manipulate.mockImplementation((source: unknown) =>
    typeof source === 'string'
      ? { renderAsync: jest.fn().mockResolvedValue(decoded) }
      : { resize }
  );
  return { resize, saveAsync };
}

// What the picker says about size is deliberately wrong throughout: it may
// report 0, and the decoded image is what `compress` has to believe.
const asset = (uri: string) => ({ uri, width: 0, height: 0 });

beforeEach(() => jest.clearAllMocks());

describe('pickPhotos', () => {
  it('shrinks a large photo to 1600 on its longest edge and saves it as JPEG', async () => {
    const { resize, saveAsync } = decodesTo(4000, 3000);
    launch.mockResolvedValue({ canceled: false, assets: [asset('file:///a.heic')] });

    await expect(pickPhotos(5)).resolves.toEqual([{ uri: 'file:///small.jpg' }]);

    expect(resize).toHaveBeenCalledWith({ width: 1600, height: 1200 });
    expect(saveAsync).toHaveBeenCalledWith({ compress: 0.8, format: 'jpeg' });
  });

  it('re-encodes a small photo without resizing it', async () => {
    const { resize, saveAsync } = decodesTo(800, 600);
    launch.mockResolvedValue({ canceled: false, assets: [asset('file:///b.png')] });

    await pickPhotos(5);

    expect(resize).not.toHaveBeenCalled();
    expect(saveAsync).toHaveBeenCalledWith({ compress: 0.8, format: 'jpeg' });
  });

  it('asks for no more than there is room for, and takes no more even if handed them', async () => {
    decodesTo(100, 100);
    launch.mockResolvedValue({
      canceled: false,
      assets: [1, 2, 3].map((n) => asset(`file:///${n}.jpg`)),
    });

    await expect(pickPhotos(2)).resolves.toHaveLength(2);
    expect(launch).toHaveBeenCalledWith(expect.objectContaining({ selectionLimit: 2 }));
  });

  it('is nothing when the person backs out of the picker', async () => {
    launch.mockResolvedValue({ canceled: true, assets: null });

    await expect(pickPhotos(5)).resolves.toEqual([]);
    expect(manipulate).not.toHaveBeenCalled();
  });
});
