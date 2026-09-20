import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { DEFAULT_REGION, nearbyRegion } from '@/geo';
import { Diamond } from '@/motifs/Diamond';
import { categoryColor, colors } from '@/theme';

import type { PlacesMapProps } from './PlacesMap.types';

/**
 * A pin is the rhomb of the language, stood over the coordinate: the category's
 * tint, a pale ring so it stays legible over dark tiles, and enough shadow to
 * lift it off them. No stem — with the marker anchored at its foot, the rhomb's
 * own lower vertex is what marks the spot.
 */
function Pin({ tint }: { tint: string }) {
  return (
    <Diamond
      // 17 for a 13px core: the canvas draws the ring outside the rhomb it
      // states, and a border-box 13 would leave a pin smaller than the one it
      // replaces. Black rather than ink — a pin has to lift off map tiles,
      // and their colours aren't ours to match.
      size={17}
      tint={tint}
      border={colors.surface}
      borderWidth={2}
      shadow="0px 1px 3px rgba(0, 0, 0, 0.3)"
    />
  );
}

export function PlacesMap({ places, origin, isUserLocation, footInset }: PlacesMapProps) {
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
      // Keeps the Google logo — which has to stay visible — above whatever the
      // screen stands in the map's foot, and centres the map on what is left.
      mapPadding={{ top: 0, right: 0, bottom: footInset, left: 0 }}
    >
      {places.map((place) => (
        <Marker
          key={place.id}
          coordinate={{ latitude: place.lat, longitude: place.lng }}
          // The foot of the rhomb is the coordinate, not its centre.
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
