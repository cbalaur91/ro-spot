import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { fitRegion } from '@/framing';
import { DEFAULT_REGION } from '@/geo';
import { Diamond } from '@/motifs/Diamond';
import { categoryColor, colors } from '@/theme';

import type { PlacesMapProps } from './PlacesMap.types';

// The pin's two sizes: 17 for a 13px core — the canvas draws the ring outside
// the rhomb it states, and a border-box 13 would leave a pin smaller than the
// one it replaces — and the Add map's 25 / 3 for the selected one.
const PIN = { size: 17, ring: 2 };
const SELECTED_PIN = { size: 25, ring: 3 };
// One box for both sizes, wide enough for the selected rhomb's diagonal and its
// shadow. Android draws a custom marker into a bitmap the size of its view and
// clips whatever falls outside, and a rotated square overhangs its own layout
// box. One box also keeps the tip on the same pixel of the image at either
// size, so the anchor never has to change with the selection.
const BOX = { width: 44, height: 40 };
// How far a fitted point keeps from the map's edges: a pin stands its whole box
// above the coordinate and half of it to each side, and a little air past that.
const FIT_MARGIN = { top: BOX.height + 12, side: BOX.width / 2 + 14, bottom: 12 };

/**
 * A pin is the rhomb of the language, stood over the coordinate: the category's
 * tint, a pale ring so it stays legible over dark tiles, and enough shadow to
 * lift it off them. No stem — the rhomb's lower vertex sits on the box's foot,
 * and the marker is anchored there, so the vertex is what marks the spot at
 * either size.
 */
function Pin({ tint, selected }: { tint: string; selected: boolean }) {
  const { size, ring } = selected ? SELECTED_PIN : PIN;
  // Half the diagonal: how far the rotated rhomb's vertex sits from its centre.
  const reach = (size * Math.SQRT2) / 2;

  return (
    <View testID="pin" style={BOX} pointerEvents="none">
      <View
        style={{
          position: 'absolute',
          left: (BOX.width - size) / 2,
          top: BOX.height - reach - size / 2,
        }}
      >
        <Diamond
          size={size}
          tint={tint}
          border={colors.surface}
          borderWidth={ring}
          // Black rather than ink — a pin has to lift off map tiles, and their
          // colours aren't ours to match.
          shadow="0px 1px 3px rgba(0, 0, 0, 0.3)"
        />
      </View>
    </View>
  );
}

export function PlacesMap({
  ref,
  places,
  isUserLocation,
  footInset,
  fitInset,
  selectedId,
  onSelect,
  onReady,
  onGesture,
}: PlacesMapProps) {
  const map = useRef<MapView>(null);
  const size = useRef({ width: 0, height: 0 });
  // Ready means both: the SDK is up and the view has a size a fit can use.
  // Android can report the map ready before its first layout.
  const [isLaidOut, setLaidOut] = useState(false);
  const [isMapReady, setMapReady] = useState(false);
  useEffect(() => {
    if (isLaidOut && isMapReady) onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLaidOut, isMapReady]);

  useImperativeHandle(
    ref,
    () => ({
      show: (region) => map.current?.animateToRegion(region),
      fit: (points) => {
        const { width, height } = size.current;
        if (width === 0 || height === 0) return;

        // The map's padding already keeps the card out of the viewport, so the
        // fit only has to clear the part of the foot above it — the controls.
        map.current?.animateToRegion(
          fitRegion(
            points,
            { width, height: height - footInset },
            {
              top: FIT_MARGIN.top,
              right: FIT_MARGIN.side,
              bottom: Math.max(0, fitInset - footInset) + FIT_MARGIN.bottom,
              left: FIT_MARGIN.side,
            }
          )
        );
      },
    }),
    [footInset, fitInset]
  );

  return (
    <MapView
      ref={map}
      // Apple Maps on iOS, Google Maps on Android — whichever the OS ships.
      provider={PROVIDER_DEFAULT}
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        size.current = { width, height };
        if (width > 0 && height > 0) setLaidOut(true);
      }}
      onMapReady={() => setMapReady(true)}
      // Pans and pinches, not the camera's own moves. `isGesture` is Google's
      // only; Apple Maps reports a pan through `onPanDrag`.
      onPanDrag={onGesture}
      onRegionChangeStart={(_region, details) => {
        if (details?.isGesture) onGesture();
      }}
      // The map opens on Metro Detroit and stays there until the screen frames
      // what's close, so a denied prompt leaves a usable map rather than an
      // empty one.
      initialRegion={DEFAULT_REGION}
      showsUserLocation={isUserLocation}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      // Keeps the Google logo — which has to stay visible — above whatever the
      // screen stands in the map's foot, and centres the map on what is left.
      mapPadding={{ top: 0, right: 0, bottom: footInset, left: 0 }}
      // A pin tap picks a place for the card; the map stays where the user
      // left it. Android recentres on the marker otherwise.
      moveOnMarkerPress={false}
    >
      {places.map((place) => {
        const selected = place.id === selectedId;

        return (
          <Marker
            // The selection is in the key, so a pin that changes size is a new
            // marker. On Android the marker draws its view into a bitmap and
            // stops watching the view once the first renders settle, restarting
            // only when the view's own size changes — which the fixed box never
            // does — so a pin redrawn in place keeps its old image.
            key={`${place.id}:${selected ? 'selected' : 'plain'}`}
            identifier={place.id}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            // The foot of the box is the rhomb's lower vertex, not its centre.
            anchor={{ x: 0.5, y: 1 }}
            // No title, description or callout: the card at the map's foot is
            // what a pin opens, and a native bubble would say the same thing
            // twice in two designs.
            onPress={() => onSelect(place.id)}
            // Above its neighbours, so a pick in a cluster isn't drawn under
            // the pins it was picked from.
            zIndex={selected ? 1 : 0}
            // Left tracking view changes on: switching it off is the usual fix
            // for hundreds of markers, but on Android it can also leave a custom
            // pin blank on first paint, and the launch dataset is 10-20 places.
            tracksViewChanges
          >
            <Pin tint={categoryColor[place.category]} selected={selected} />
          </Marker>
        );
      })}
    </MapView>
  );
}
