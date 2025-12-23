// app/symbol/[symbol]/header.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useWatchlist } from "../../../context/WatchlistContext";
import { useStocks } from "../../../context/StockContext";

export default function SymbolHeader() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const { addToPortfolio, isInPortfolio } = useStocks();

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [hasActiveAlert, setHasActiveAlert] = useState(false);
  const [activeAlertPrice, setActiveAlertPrice] = useState<string | null>(null);
  const [activeAlertType, setActiveAlertType] = useState<"above" | "below" | null>(null);
  const [alertTab, setAlertTab] = useState<"price" | "indicator">("price");
  const [alertType, setAlertType] = useState<"above" | "below" | null>(null);
  const [priceValue, setPriceValue] = useState("");
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [loading, setLoading] = useState(false);

  const currentSymbol = symbol?.toUpperCase() || '';

  const handleAddToWatchlist = async () => {
    setShowAddMenu(false);
    setLoading(true);
    await addToWatchlist(currentSymbol);
    setLoading(false);
  };

  const handleRemoveFromWatchlist = async () => {
    setShowAddMenu(false);
    setLoading(true);
    await removeFromWatchlist(currentSymbol);
    setLoading(false);
  };

  const handleOpenPortfolioModal = () => {
    setShowAddMenu(false);
    setShowPortfolioModal(true);
  };

  const handleAddToPortfolio = async () => {
    if (!shares.trim() || !avgCost.trim()) {
      return;
    }

    setLoading(true);
    const success = await addToPortfolio({
      symbol: currentSymbol,
      shares: parseFloat(shares),
      avgCost: parseFloat(avgCost),
    });

    if (success) {
      setShares('');
      setAvgCost('');
      setShowPortfolioModal(false);
    }
    setLoading(false);
  };

  const handleCreateAlert = () => {
    if (!alertType || !priceValue) return;
    
    const alertPrice = parseFloat(priceValue).toFixed(2);
    
    // Save alert state
    setHasActiveAlert(true);
    setActiveAlertPrice(alertPrice);
    setActiveAlertType(alertType);
    
    // Show confirmation
    Alert.alert(
      "Alert Created ✓",
      `You'll be notified when ${currentSymbol} moves ${alertType} $${alertPrice}`,
      [
        {
          text: "OK",
          onPress: () => {
            // Reset and close
            setAlertType(null);
            setPriceValue("");
            setShowAlertModal(false);
          }
        }
      ]
    );
  };

  const handleRemoveAlert = () => {
    Alert.alert(
      "Remove Alert?",
      `Remove price alert for ${currentSymbol}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setHasActiveAlert(false);
            setActiveAlertPrice(null);
            setActiveAlertType(null);
          }
        }
      ]
    );
  };

  const handleNotificationPress = () => {
    if (hasActiveAlert) {
      // Show options to view or remove alert
      Alert.alert(
        `${currentSymbol} Alert Active`,
        `Price moves ${activeAlertType} $${activeAlertPrice}`,
        [
          {
            text: "Edit",
            onPress: () => setShowAlertModal(true)
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              setHasActiveAlert(false);
              setActiveAlertPrice(null);
              setActiveAlertType(null);
            }
          },
          {
            text: "OK",
            style: "cancel"
          }
        ]
      );
    } else {
      setShowAlertModal(true);
    }
  };

  const closeAlertModal = () => {
    setShowAlertModal(false);
    setAlertType(null);
    setPriceValue("");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.centerContent}>
        <Text style={styles.symbolText}>{currentSymbol}</Text>
      </View>

      <View style={styles.rightActions}>
        <TouchableOpacity
          style={[
            styles.addButton,
            (isInWatchlist(currentSymbol) || isInPortfolio(currentSymbol)) && styles.addButtonActive
          ]}
          onPress={() => setShowAddMenu(true)}
        >
          <Ionicons
            name={(isInWatchlist(currentSymbol) || isInPortfolio(currentSymbol)) ? "checkmark" : "add"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Add Menu Modal */}
      <Modal
        visible={showAddMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddMenu(false)}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Add {currentSymbol}</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={isInWatchlist(currentSymbol) ? handleRemoveFromWatchlist : handleAddToWatchlist}
            >
              <Ionicons
                name={isInWatchlist(currentSymbol) ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={isInWatchlist(currentSymbol) ? "#FF3B30" : "#0dd977"}
              />
              <Text style={[styles.menuItemText, isInWatchlist(currentSymbol) && { color: "#FF3B30" }]}>
                {isInWatchlist(currentSymbol) ? "Remove from Watchlist" : "Add to Watchlist"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isInPortfolio(currentSymbol) && styles.menuItemDisabled]} 
              onPress={handleOpenPortfolioModal}
              disabled={isInPortfolio(currentSymbol)}
            >
              <Ionicons 
                name={isInPortfolio(currentSymbol) ? "checkmark-circle" : "briefcase-outline"} 
                size={22} 
                color={isInPortfolio(currentSymbol) ? "#34C759" : "#0dd977"} 
              />
              <Text style={[styles.menuItemText, isInPortfolio(currentSymbol) && styles.menuItemTextDisabled]}>
                {isInPortfolio(currentSymbol) ? "Already in Portfolio" : "Add to Portfolio"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.cancelItem]} onPress={() => setShowAddMenu(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Portfolio Modal */}
      <Modal
        visible={showPortfolioModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPortfolioModal(false)}
      >
        <Pressable style={styles.portfolioModalOverlay} onPress={() => setShowPortfolioModal(false)}>
          <Pressable style={styles.portfolioModalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.portfolioModalHeader}>
              <Text style={styles.portfolioModalTitle}>Add {currentSymbol} to Portfolio</Text>
              <TouchableOpacity onPress={() => setShowPortfolioModal(false)}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Number of Shares</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10"
                placeholderTextColor="#999"
                value={shares}
                onChangeText={setShares}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Average Cost per Share ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 150.00"
                placeholderTextColor="#999"
                value={avgCost}
                onChangeText={setAvgCost}
                keyboardType="decimal-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.addPortfolioButton, (!shares.trim() || !avgCost.trim() || loading) && styles.addPortfolioButtonDisabled]}
              onPress={handleAddToPortfolio}
              disabled={!shares.trim() || !avgCost.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.addPortfolioButtonText}>Add to Portfolio</Text>
                </>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Price Alerts Modal */}
      <Modal
        visible={showAlertModal}
        transparent
        animationType="slide"
        onRequestClose={closeAlertModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.alertModalContainer}
        >
          <View style={styles.alertModalContent}>
            {/* Header */}
            <View style={styles.alertHeader}>
              <TouchableOpacity onPress={closeAlertModal}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.alertTitle}>{currentSymbol} Custom alerts</Text>
              <View style={{ width: 24 }} />
            </View>

            <Text style={styles.alertSubtitle}>
              You'll get a notification for each alert at most once a day
            </Text>

            {/* Tabs */}
            <View style={styles.alertTabs}>
              <TouchableOpacity
                style={[styles.alertTab, alertTab === "price" && styles.alertTabActive]}
                onPress={() => setAlertTab("price")}
              >
                <Text style={[styles.alertTabText, alertTab === "price" && styles.alertTabTextActive]}>
                  Price alerts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertTab, alertTab === "indicator" && styles.alertTabActive]}
                onPress={() => setAlertTab("indicator")}
              >
                <Text style={[styles.alertTabText, alertTab === "indicator" && styles.alertTabTextActive]}>
                  Indicator alerts
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.alertBody}>
              {alertType === null ? (
                // Initial State - Show bell and message
                <View style={styles.alertEmptyState}>
                  <View style={styles.bellIconContainer}>
                    <View style={styles.bellIcon}>
                      <Ionicons name="notifications" size={80} color="#22c55e" />
                    </View>
                    <View style={styles.bellSparkles}>
                      <Text style={styles.sparkle}>✦</Text>
                      <Text style={[styles.sparkle, styles.sparkle2]}>✧</Text>
                      <Text style={[styles.sparkle, styles.sparkle3]}>•</Text>
                      <Text style={[styles.sparkle, styles.sparkle4]}>•</Text>
                    </View>
                  </View>
                  <Text style={styles.alertEmptyText}>
                    Create custom price thresholds and get notified when this security moves past them.
                  </Text>
                </View>
              ) : (
                // Price Input State
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceInputLabel}>
                    Alert me when {currentSymbol} price moves {alertType}:
                  </Text>
                  <View style={styles.priceInputWrapper}>
                    <Text style={styles.dollarSign}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={priceValue}
                      onChangeText={setPriceValue}
                      placeholder="0.00"
                      placeholderTextColor="#666"
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions */}
            {alertType === null ? (
              // Select Alert Type
              <View style={styles.alertTypeSelector}>
                <Text style={styles.selectTypeTitle}>Select alert type</Text>
                
                <TouchableOpacity 
                  style={styles.alertTypeOption}
                  onPress={() => setAlertType("above")}
                >
                  <Text style={styles.alertTypeText}>Price moves above</Text>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.alertTypeOption}
                  onPress={() => setAlertType("below")}
                >
                  <Text style={styles.alertTypeText}>Price moves below</Text>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            ) : (
              // Add Alert Button
              <TouchableOpacity 
                style={[
                  styles.addAlertButton,
                  !priceValue && styles.addAlertButtonDisabled
                ]}
                onPress={handleCreateAlert}
                disabled={!priceValue}
              >
                <Text style={styles.addAlertButtonText}>Add Alert</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  iconButton: {
    padding: 8,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
  },
  symbolText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButton: {
    backgroundColor: "#0dd977",
    borderRadius: 20,
    padding: 6,
    marginLeft: 8,
  },
  addButtonActive: {
    backgroundColor: "#22c55e",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    maxWidth: 320,
  },
  menuTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#252525",
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  menuItemDisabled: {
    backgroundColor: "#1f1f1f",
  },
  menuItemText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  menuItemTextDisabled: {
    color: "#666",
  },
  cancelItem: {
    backgroundColor: "transparent",
    justifyContent: "center",
    marginTop: 8,
  },
  cancelText: {
    color: "#888",
    fontSize: 16,
  },
  // Portfolio Modal
  portfolioModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  portfolioModalContent: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  portfolioModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  portfolioModalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#252525",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
  },
  addPortfolioButton: {
    backgroundColor: "#0dd977",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  addPortfolioButtonDisabled: {
    opacity: 0.5,
  },
  addPortfolioButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  // Alert Modal Styles
  alertModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  alertModalContent: {
    backgroundColor: "#000",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  alertTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  alertSubtitle: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  alertTabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 4,
  },
  alertTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  alertTabActive: {
    backgroundColor: "#333",
  },
  alertTabText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "500",
  },
  alertTabTextActive: {
    color: "#fff",
  },
  alertBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  alertEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  bellIconContainer: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  bellIcon: {
    transform: [{ rotate: '-15deg' }],
  },
  bellSparkles: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  sparkle: {
    position: "absolute",
    fontSize: 16,
    color: "#22c55e",
    top: 10,
    right: 15,
  },
  sparkle2: {
    top: 35,
    left: 5,
    fontSize: 12,
    color: "#fff",
  },
  sparkle3: {
    bottom: 30,
    right: 5,
    fontSize: 24,
    color: "#22c55e",
  },
  sparkle4: {
    bottom: 50,
    left: 20,
    fontSize: 16,
    color: "#22c55e",
  },
  alertEmptyText: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  priceInputContainer: {
    paddingTop: 40,
    alignItems: "center",
  },
  priceInputLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 30,
    textAlign: "center",
  },
  priceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dollarSign: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "300",
  },
  priceInput: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "300",
    minWidth: 150,
  },
  alertTypeSelector: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  selectTypeTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  alertTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  alertTypeText: {
    color: "#fff",
    fontSize: 16,
  },
  addAlertButton: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  addAlertButtonDisabled: {
    opacity: 0.5,
  },
  addAlertButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
});
