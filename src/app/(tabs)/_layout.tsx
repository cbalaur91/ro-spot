import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';

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
        <Tabs.Screen
          name="index"
          options={{ title: t('tabs.map'), tabBarIcon: tabIcon('map-outline') }}
        />
        <Tabs.Screen
          name="list"
          options={{ title: t('tabs.list'), tabBarIcon: tabIcon('list-outline') }}
        />
        <Tabs.Screen
          name="add"
          options={{ title: t('tabs.add'), tabBarIcon: tabIcon('add-circle-outline') }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('person-outline') }}
        />
      </Tabs>
    </CategoryFilterProvider>
  );
}
