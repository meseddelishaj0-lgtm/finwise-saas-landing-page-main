// app/profile/signout.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { LogOut, ChevronLeft, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

// AuthContext is not available in this repository path; use a local no-op signOut
// until you add a proper context implementation at ../../context/AuthContext
export default function SignOutScreen() {
  const router = useRouter();
  const signOut = async () => {
    // no-op: implement real signOut (clear tokens, AsyncStorage, etc.) in your AuthContext
  };
  const [modalVisible, setModalVisible] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut?.(); // Optional: clear tokens, AsyncStorage, etc.

      // This is the key: fully reset the navigation stack to login
      router.replace('/login');
      
      // Or if you have a welcome/onboarding flow:
      // router.replace('/welcome');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign Out</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Body */}
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <LogOut size={48} color="#FF3B30" />
        </View>

        <Text style={styles.title}>Sign Out of WallStreetStocks?</Text>
        <Text style={styles.subtitle}>
          You’ll need to log in again next time you open the app.
        </Text>

        <TouchableOpacity style={styles.signOutButton} onPress={() => setModalVisible(true)}>
          <LogOut size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <AlertCircle size={48} color="#FF3B30" style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Sign Out?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to sign out?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={() => {
                  setModalVisible(false);
                  handleSignOut();
                }}
              >
                <Text style={styles.confirmBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Styles (same design language as your login.tsx)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  content: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffebeb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 16,
  },
  signOutButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  cancelText: { color: '#007AFF', fontSize: 17 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalMessage: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#f0f0f0' },
  cancelBtnText: { color: '#000', fontWeight: '600' },
  confirmBtn: { backgroundColor: '#FF3B30' },
  confirmBtnText: { color: '#fff', fontWeight: '600' },
});

