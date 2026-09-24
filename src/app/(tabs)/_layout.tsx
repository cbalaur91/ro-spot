import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { type ColorValue, Platform } from 'react-native';

import { CategoryFilterProvider } from '@/state/categoryFilter';
import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  const TabIcon = ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
  TabIcon.displayName = `TabIcon(${name})`;
  return TabIcon;
}

/** The four tabs, in the order the bar draws them. */
const TABS = [
  { name: 'index', label: 'tabs.map', icon: 'map-outline' },
  { name: 'list', label: 'tabs.list', icon: 'list-outline' },
  { name: 'add', label: 'tabs.add', icon: 'add-circle-outline' },
  { name: 'profile', label: 'tabs.profile', icon: 'person-outline' },
] as const;

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    // The chips are one selection shared by the Map and List tabs, so the state
    // sits above both of them rather than inside either.
    <CategoryFilterProvider>
      <Tabs
        // Every visited tab stays attached to the window, hidden with
        // `display: none`. react-native-maps' Android MapView parks its markers
        // when it's detached and puts all of them back on reattach, ignoring the
        // ones React removed meanwhile — so a chip changed on the List left the
        // Map's dropped places standing as default red pins.
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.cherry,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
          tabBarLabelStyle: { fontSize: 11, letterSpacing: 0.2 },
        }}
      >
        {TABS.map(({ name, label, icon }, index) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: t(label),
              // iOS only: left unset, the navigator reads "Hartă, tab, 1 of 4" —
              // half English. TalkBack says "tab" itself, in the phone's language.
              tabBarAccessibilityLabel:
                Platform.OS === 'ios'
                  ? t('tabs.a11y', { label: t(label), index: index + 1, total: TABS.length })
                  : undefined,
              tabBarIcon: tabIcon(icon),
            }}
          />
        ))}
      </Tabs>
    </CategoryFilterProvider>
  );
}
