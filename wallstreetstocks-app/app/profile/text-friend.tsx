// app/profile/text-friend.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
  Linking,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, MessageSquare, Send, Smartphone } from "lucide-react-native";

export default function TextFriendPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customMessage, setCustomMessage] = useState(
    "Hey! Check out WallStreetStocks - it's an awesome app for stock research and market analysis. Download it here: https://wallstreetstocks.app"
  );

  const formatPhoneNumber = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, "");
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(formatPhoneNumber(text));
  };

  const handleSendText = async () => {
    // Get raw phone number (digits only)
    const rawPhone = phoneNumber.replace(/\D/g, "");
    
    if (rawPhone.length > 0 && rawPhone.length < 10) {
      Alert.alert("Invalid Number", "Please enter a valid 10-digit phone number.");
      return;
    }

    try {
      // Encode the message for URL
      const encodedMessage = encodeURIComponent(customMessage);
      
      // Create SMS URL - works on both iOS and Android
      const smsUrl = rawPhone 
        ? Platform.select({
            ios: `sms:${rawPhone}&body=${encodedMessage}`,
            android: `sms:${rawPhone}?body=${encodedMessage}`,
            default: `sms:${rawPhone}?body=${encodedMessage}`,
          })
        : Platform.select({
            ios: `sms:&body=${encodedMessage}`,
            android: `sms:?body=${encodedMessage}`,
            default: `sms:?body=${encodedMessage}`,
          });

      const canOpen = await Linking.canOpenURL(smsUrl!);
      
      if (canOpen) {
        await Linking.openURL(smsUrl!);
      } else {
        Alert.alert(
          "Unable to Send",
          "SMS is not available on this device."
        );
      }
    } catch (error) {
      
      Alert.alert("Error", "Failed to open messaging app.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ChevronLeft size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Text to a Friend</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon Section */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <MessageSquare size={48} color="#007AFF" />
            </View>
          </View>

          {/* Title & Description */}
          <Text style={styles.title}>Share WallStreetStocks</Text>
          <Text style={styles.description}>
            Know someone who'd love to stay on top of the markets? Send them a text and help them discover WallStreetStocks!
          </Text>

          {/* Phone Number Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Friend's Phone Number (Optional)</Text>
            <View style={styles.phoneInputContainer}>
              <Smartphone size={20} color="#8E8E93" style={styles.phoneIcon} />
              <TextInput
                style={styles.phoneInput}
                placeholder="(555) 123-4567"
                placeholderTextColor="#C7C7CC"
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={14}
              />
            </View>
            <Text style={styles.inputHint}>
              Leave blank to choose a contact from your messages
            </Text>
          </View>

          {/* Message Preview */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Message</Text>
            <View style={styles.messageContainer}>
              <TextInput
                style={styles.messageInput}
                multiline
                numberOfLines={4}
                value={customMessage}
                onChangeText={setCustomMessage}
                placeholder="Enter your message..."
                placeholderTextColor="#C7C7CC"
                textAlignVertical="top"
              />
            </View>
            <Text style={styles.characterCount}>
              {customMessage.length}/300
            </Text>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendText}
            activeOpacity={0.8}
          >
            <Send size={20} color="#FFFFFF" />
            <Text style={styles.sendButtonText}>Open Messages</Text>
          </TouchableOpacity>

          {/* Info Text */}
          <Text style={styles.infoText}>
            This will open your default messaging app with the message pre-filled.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },
  headerRight: {
    width: 36,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  phoneIcon: {
    marginRight: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 17,
    color: "#000000",
  },
  inputHint: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 8,
  },
  messageContainer: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
  },
  messageInput: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 22,
    minHeight: 88,
  },
  characterCount: {
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "right",
    marginTop: 8,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 16,
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  infoText: {
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 18,
  },
});
