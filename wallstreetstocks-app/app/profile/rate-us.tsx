// app/profile/rate-us.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Star, ExternalLink, Heart, ThumbsUp } from "lucide-react-native";
import * as StoreReview from "expo-store-review";

// App Store and Play Store IDs
const APP_STORE_ID = "6743493377"; // Apple App Store ID
const PLAY_STORE_ID = "ai.wallstreetstocks.app"; // Google Play Store package name (must match android.package in app.json)

export default function RateUsPage() {
  const router = useRouter();
  const [selectedRating, setSelectedRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);

  const handleStarPress = (rating: number) => {
    setSelectedRating(rating);
  };

  const handleRateApp = async () => {
    if (selectedRating === 0) {
      Alert.alert("Select Rating", "Please select a star rating first.");
      return;
    }

    try {
      // Check if in-app review is available
      const isAvailable = await StoreReview.isAvailableAsync();
      
      if (isAvailable && selectedRating >= 4) {
        // Use native in-app review for high ratings
        await StoreReview.requestReview();
        setHasRated(true);
      } else {
        // Open store directly
        openStore();
      }
    } catch (error) {
      
      // Fallback to opening store directly
      openStore();
    }
  };

  const openStore = async () => {
    try {
      const storeUrl = Platform.select({
        ios: `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`,
        android: `market://details?id=${PLAY_STORE_ID}`,
        default: `https://apps.apple.com/app/id${APP_STORE_ID}`,
      });

      const canOpen = await Linking.canOpenURL(storeUrl!);
      
      if (canOpen) {
        await Linking.openURL(storeUrl!);
        setHasRated(true);
      } else {
        // Fallback for Android if Play Store app isn't available
        if (Platform.OS === "android") {
          await Linking.openURL(
            `https://play.google.com/store/apps/details?id=${PLAY_STORE_ID}`
          );
          setHasRated(true);
        } else {
          Alert.alert("Error", "Unable to open the app store.");
        }
      }
    } catch (error) {
      
      Alert.alert("Error", "Failed to open the app store.");
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleStarPress(star)}
            activeOpacity={0.7}
            style={styles.starButton}
          >
            <Star
              size={44}
              color={star <= selectedRating ? "#FFD700" : "#E5E5EA"}
              fill={star <= selectedRating ? "#FFD700" : "transparent"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingText = () => {
    switch (selectedRating) {
      case 1:
        return "We're sorry to hear that. How can we improve?";
      case 2:
        return "We'd love to do better. Thanks for your feedback!";
      case 3:
        return "Thanks! We're always working to improve.";
      case 4:
        return "Great! We're glad you're enjoying WallStreetStocks!";
      case 5:
        return "Awesome! We're thrilled you love WallStreetStocks!";
      default:
        return "Tap the stars to rate your experience";
    }
  };

  if (hasRated) {
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
          <Text style={styles.headerTitle}>Rate Us</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.thankYouContainer}>
          <View style={styles.heartIconCircle}>
            <Heart size={64} color="#FF3B30" fill="#FF3B30" />
          </View>
          <Text style={styles.thankYouTitle}>Thank You!</Text>
          <Text style={styles.thankYouText}>
            Your feedback means the world to us. We're constantly working to make WallStreetStocks the best stock research app for you.
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Rate Us</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Icon Section */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Star size={48} color="#007AFF" fill="#007AFF" />
          </View>
        </View>

        {/* Title & Description */}
        <Text style={styles.title}>Enjoying WallStreetStocks?</Text>
        <Text style={styles.description}>
          Your rating helps other investors discover our app and helps us continue improving your experience.
        </Text>

        {/* Star Rating */}
        <View style={styles.ratingSection}>
          {renderStars()}
          <Text style={styles.ratingText}>{getRatingText()}</Text>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Why Rate Us?</Text>
          
          <View style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
              <ThumbsUp size={20} color="#007AFF" />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitText}>
                Help fellow investors find quality research tools
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
              <Heart size={20} color="#FF3B30" />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitText}>
                Support our small team in building great features
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
              <Star size={20} color="#FFD700" fill="#FFD700" />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitText}>
                Your feedback shapes future updates
              </Text>
            </View>
          </View>
        </View>

        {/* Rate Button */}
        <TouchableOpacity
          style={[
            styles.rateButton,
            selectedRating === 0 && styles.rateButtonDisabled,
          ]}
          onPress={handleRateApp}
          activeOpacity={0.8}
          disabled={selectedRating === 0}
        >
          <ExternalLink size={20} color="#FFFFFF" />
          <Text style={styles.rateButtonText}>
            Rate on {Platform.OS === "ios" ? "App Store" : "Play Store"}
          </Text>
        </TouchableOpacity>

        {/* Skip Option */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Maybe Later</Text>
        </TouchableOpacity>
      </ScrollView>
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
  ratingSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 15,
    color: "#666666",
    textAlign: "center",
    minHeight: 20,
  },
  benefitsSection: {
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitText: {
    fontSize: 15,
    color: "#333333",
    lineHeight: 20,
  },
  rateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 12,
  },
  rateButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  rateButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 15,
    color: "#8E8E93",
  },
  // Thank you screen styles
  thankYouContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  heartIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFF0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  thankYouTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 16,
  },
  thankYouText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  doneButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
