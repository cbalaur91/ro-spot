import { fireEvent, render, screen } from '@testing-library/react-native';

import { PinMap } from '../PinMap.native';

// `react-native-maps` is a native module with nothing to render under Jest; the
// stand-in keeps the props this component depends on observable.
jest.mock('react-native-maps', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) => (
      <View testID="map" {...props}>
        {children}
      </View>
    ),
    Marker: ({ children, ...props }: any) => (
      <View testID="marker" {...props}>
        {children}
      </View>
    ),
    PROVIDER_DEFAULT: 'default',
  };
});

// `fireEvent` rather than `userEvent.press`: the targets are mocked Views, and the
// thing under test is what the component does with the event's coordinates.
const START = { lat: 42.4576, lng: -83.2409 };
const at = (latitude: number, longitude: number) => ({
  nativeEvent: { coordinate: { latitude, longitude } },
});

describe('PinMap', () => {
  it('stands a draggable pin on the coordinates, anchored at its foot', async () => {
    await render(<PinMap coords={START} tint="#000" onChange={jest.fn()} />);

    expect(screen.getByTestId('marker').props).toMatchObject({
      draggable: true,
      coordinate: { latitude: START.lat, longitude: START.lng },
      anchor: { x: 0.5, y: 1 },
    });
  });

  it('reports where the pin was dropped', async () => {
    const onChange = jest.fn();
    await render(<PinMap coords={START} tint="#000" onChange={onChange} />);

    fireEvent(screen.getByTestId('marker'), 'dragEnd', at(42.5, -83.3));

    expect(onChange).toHaveBeenCalledWith({ lat: 42.5, lng: -83.3 });
  });

  it('moves the pin to a tap on the map', async () => {
    const onChange = jest.fn();
    await render(<PinMap coords={START} tint="#000" onChange={onChange} />);

    fireEvent.press(screen.getByTestId('map'), at(42.6, -83.4));

    expect(onChange).toHaveBeenCalledWith({ lat: 42.6, lng: -83.4 });
  });
});
