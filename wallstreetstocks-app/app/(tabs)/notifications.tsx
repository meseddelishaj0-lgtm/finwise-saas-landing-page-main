// app/(tabs)/notifications.tsx
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import NotificationCard from "../../components/NotificationCard";
import { fetchNotifications } from "../../services/communityApi";
import { useAuth } from "../../lib/auth";

export default function Notifications() {
  const { user } = useAuth(); // Get the logged-in user
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const data = await fetchNotifications(Number(user.id));
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user?.id) return;

    const intervalId = setInterval(() => {
      loadNotifications();
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [user?.id, loadNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4">
        <Text className="text-gray-500 text-center">
          Please log in to view notifications
        </Text>
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4">
        <Text className="text-gray-500 text-center">
          No notifications yet
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <NotificationCard item={item} />}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
      />
    </View>
  );
}
