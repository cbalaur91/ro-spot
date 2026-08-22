import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { DEFAULT_REGION, nearbyRegion } from '@/geo';
import { categoryColor, colors } from '@/theme';

import type { PlacesMapProps } from './PlacesMap.types';

/**
 * A pin is one segment of the column from the list gutter, stood on end: the
 * category rhomboid on a hairline stem, anchored where the stem meets the
 * ground. The pale ring keeps it legible over dark map tiles.
 */
function Pin({ tint }: { tint: string }) {
  return (
    <View className="items-center">
      <View
        className="h-3.5 w-3.5 rotate-45 border"
        style={{ backgroundColor: tint, borderColor: colors.surface }}
      />
      <View className="h-2.5 w-px" style={{ backgroundColor: tint }} />
    </View>
  );
}

export function PlacesMap({ places, origin, isUserLocation }: PlacesMapProps) {
  const map = useRef<MapView>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isUserLocation) return;

    // The map opens on Metro Detroit and moves once the device answers, so a
    // denied prompt leaves a usable map rather than an empty one.
    map.current?.animateToRegion(nearbyRegion(origin));
  }, [isUserLocation, origin]);

  return (
    <MapView
      ref={map}
      // Apple Maps on iOS, Google Maps on Android — whichever the OS ships.
      provider={PROVIDER_DEFAULT}
      style={StyleSheet.absoluteFill}
      initialRegion={DEFAULT_REGION}
      showsUserLocation={isUserLocation}
      showsMyLocationButton={false}
      toolbarEnabled={false}
    >
      {places.map((place) => (
        <Marker
          key={place.id}
          coordinate={{ latitude: place.lat, longitude: place.lng }}
          // The stem's base is the coordinate, not the rhomboid's centre.
          anchor={{ x: 0.5, y: 1 }}
          title={place.name}
          description={place.address}
          // The callout, not the pin: tapping a pin should show you which place
          // it is before it takes you somewhere, and the callout is the tap that
          // says you meant it.
          onCalloutPress={() =>
            router.push({ pathname: '/place/[id]', params: { id: place.id } })
          }
          // Left tracking view changes on: switching it off is the usual fix for
          // hundreds of markers, but on Android it can also leave a custom pin
          // blank on first paint, and the launch dataset is 10-20 places.
          tracksViewChanges
        >
          <Pin tint={categoryColor[place.category]} />
        </Marker>
      ))}
    </MapView>
  );
}
