import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuthStore } from '../store';

import AuthScreen from '../screens/AuthScreen';
import FeedScreen from '../screens/FeedScreen';
import MapScreen from '../screens/MapScreen';
import UploadScreen from '../screens/UploadScreen';
import RequestsScreen from '../screens/RequestsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PhotoDetailScreen from '../screens/PhotoDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }) {
  const icons = { Feed: '🏠', Map: '🗺️', Upload: '📷', Requests: '📝', Profile: '👤' };
  return <Text style={{ fontSize: focused ? 24 : 20 }}>{icons[name] || '●'}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { paddingBottom: 4 } }}>
      <Tab.Screen name="Feed" component={FeedScreen} options={{ tabBarIcon: (p) => <TabIcon name="Feed" {...p} /> }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ tabBarIcon: (p) => <TabIcon name="Map" {...p} /> }} />
      <Tab.Screen name="Upload" component={UploadScreen} options={{ tabBarIcon: (p) => <TabIcon name="Upload" {...p} /> }} />
      <Tab.Screen name="Requests" component={RequestsScreen} options={{ tabBarIcon: (p) => <TabIcon name="Requests" {...p} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: (p) => <TabIcon name="Profile" {...p} /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const user = useAuthStore((s) => s.user);
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="PhotoDetail" component={PhotoDetailScreen} options={{ headerShown: true, title: 'Photo' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
