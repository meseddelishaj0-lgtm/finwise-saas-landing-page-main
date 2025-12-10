import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { TouchableOpacity, Text } from 'react-native';   // ← added

import HomeScreen from '../screens/HomeScreen';
import CommunityScreen from '../screens/CommunityScreen';
import ExploreScreen from '../screens/ExploreScreen';
import TrendingScreen from '../screens/TrendingScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

import CustomDrawer from '../components/CustomDrawer';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tabs
function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Icon name="home" size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarIcon: ({ color }) => <Icon name="people" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ color }) => <Icon name="search" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Trending"
        component={TrendingScreen}
        options={{
          tabBarIcon: ({ color }) => <Icon name="trending-up" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color }) => <Icon name="notifications" size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Main Drawer
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawer {...props} />}
        screenOptions={{
          drawerStyle: { backgroundColor: '#000', width: 300 },
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#000',
        }}
      >
        <Drawer.Screen
          name="Main"
          component={BottomTabs}
          options={{
            headerShown: true,                    // ← CHANGED (was false)
            title: 'Wallstreetstocks',
            headerRight: () => (                  // ← ADDED (your Logout button)
              <TouchableOpacity style={{ marginRight: 16 }}>
                <Text style={{ color: 'red', fontWeight: '600' }}>Logout</Text>
              </TouchableOpacity>
            ),
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
