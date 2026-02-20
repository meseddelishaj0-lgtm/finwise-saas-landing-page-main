// app/profile/email-friend.tsx
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
import { ChevronLeft, Mail, Send, AtSign } from "lucide-react-native";
import { useTheme } from '@/context/ThemeContext';

export default function EmailFriendPage() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Check out WallStreetStocks!");
  const [body, setBody] = useState(
    `Hey!\n\nI've been using this awesome app called WallStreetStocks for stock research and market analysis. It's got great features for tracking stocks, reading market news, and staying on top of your investments.\n\nI thought you might find it useful too!\n\nDownload it here: https://wallstreetstocks.app\n\nLet me know what you think!`
  );

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendEmail = async () => {
    // Validate email if provided
    if (email.length > 0 && !validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    try {
      // Encode subject and body for URL
      const encodedSubject = encodeURIComponent(subject);
      const encodedBody = encodeURIComponent(body);
      
      // Create mailto URL
      const mailtoUrl = email
        ? `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`
        : `mailto:?subject=${encodedSubject}&body=${encodedBody}`;

      const canOpen = await Linking.canOpenURL(mailtoUrl);
      
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          "Unable to Send",
          "Email is not configured on this device. Please set up an email account in your device settings."
        );
      }
    } catch (error) {
      
      Alert.alert("Error", "Failed to open email app.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? colors.border : '#E5E5EA' }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ChevronLeft size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Email to a Friend</Text>
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
            <View style={[styles.iconCircle, { backgroundColor: isDark ? colors.surface : '#F0F8FF' }]}>
              <Mail size={48} color="#007AFF" />
            </View>
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, { color: colors.text }]}>Share WallStreetStocks</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Know someone who&apos;d benefit from better market insights? Send them an email and introduce them to WallStreetStocks!
          </Text>

          {/* Email Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Friend&apos;s Email (Optional)</Text>
            <View style={[styles.emailInputContainer, { backgroundColor: colors.surface }]}>
              <AtSign size={20} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.emailInput, { color: colors.text }]}
                placeholder="friend@example.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Text style={[styles.inputHint, { color: colors.textTertiary }]}>
              Leave blank to choose a recipient in your email app
            </Text>
          </View>

          {/* Subject Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Subject</Text>
            <View style={[styles.subjectInputContainer, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.subjectInput, { color: colors.text }]}
                placeholder="Enter subject..."
                placeholderTextColor={colors.textTertiary}
                value={subject}
                onChangeText={setSubject}
                maxLength={100}
              />
            </View>
          </View>

          {/* Message Body */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Message</Text>
            <View style={[styles.messageContainer, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.messageInput, { color: colors.text }]}
                multiline
                numberOfLines={8}
                value={body}
                onChangeText={setBody}
                placeholder="Enter your message..."
                placeholderTextColor={colors.textTertiary}
                textAlignVertical="top"
              />
            </View>
            <Text style={[styles.characterCount, { color: colors.textTertiary }]}>
              {body.length}/1000
            </Text>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendEmail}
            activeOpacity={0.8}
          >
            <Send size={20} color="#FFFFFF" />
            <Text style={styles.sendButtonText}>Open Email</Text>
          </TouchableOpacity>

          {/* Info Text */}
          <Text style={[styles.infoText, { color: colors.textTertiary }]}>
            This will open your default email app with the message pre-filled.
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
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  emailInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  emailInput: {
    flex: 1,
    fontSize: 17,
    color: "#000000",
  },
  inputHint: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 8,
  },
  subjectInputContainer: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    justifyContent: "center",
  },
  subjectInput: {
    fontSize: 17,
    color: "#000000",
  },
  messageContainer: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
    minHeight: 180,
  },
  messageInput: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 22,
    minHeight: 148,
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
