// components/NotificationCard.tsx
import { View, Text } from "react-native";

type NotificationItem = {
  title: string;
  message: string;
  time?: string;
};

type NotificationCardProps = {
  item: NotificationItem;
};

export default function NotificationCard({ item }: NotificationCardProps) {
  return (
    <View className="bg-gray-100 p-4 rounded-xl mb-2">
      <Text className="font-bold">{item.title}</Text>
      <Text className="text-gray-600">{item.message}</Text>
      <Text className="text-xs text-gray-400 mt-2">{item.time}</Text>
    </View>
  );
}
