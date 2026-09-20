import { StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, type LatLng } from 'react-native-maps';

import { nearbyRegion, streetRegion, type Coords } from '@/geo';
import { Diamond } from '@/motifs/Diamond';
import { colors } from '@/theme';

import type { PinMapProps } from './PinMap.types';

/** Where a map event happened, in the app's own shape. */
const coordsOf = (event: { nativeEvent: { coordinate: LatLng } }): Coords => ({
  lat: event.nativeEvent.coordinate.latitude,
  lng: event.nativeEvent.coordinate.longitude,
});

/**
 * One pin, and the person's say over where it stands.
 *
 * Two ways to move it, because the platform's own — hold, then drag — is a
 * gesture nobody guesses: a tap on the map moves the pin there too. The region
 * is set once, from where the pin starts; after that the map is the person's to
 * pan, and re-centring it under them on every move would fight the drag.
 */
export function PinMap({ coords, found, tint, onChange }: PinMapProps) {
  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={StyleSheet.absoluteFill}
      initialRegion={found ? streetRegion(coords) : nearbyRegion(coords)}
      toolbarEnabled={false}
      onPress={(event) => onChange(coordsOf(event))}
    >
      <Marker
        draggable
        coordinate={{ latitude: coords.lat, longitude: coords.lng }}
        // The foot of the rhomb is the coordinate, as on the browse map.
        anchor={{ x: 0.5, y: 1 }}
        onDragEnd={(event) => onChange(coordsOf(event))}
        tracksViewChanges
      >
        {/* The browse map's pin, a size up: this one has to be caught by a thumb. */}
        <Diamond
          size={25}
          tint={tint}
          border={colors.surface}
          borderWidth={3}
          shadow="0px 1px 3px rgba(0, 0, 0, 0.3)"
        />
      </Marker>
    </MapView>
  );
}
