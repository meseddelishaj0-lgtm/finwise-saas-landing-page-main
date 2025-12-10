import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/Ionicons';

export default function CustomDrawer(props) {
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      {/* Profile Header */}
      <View style={styles.profile}>
        <Image
          source={{ uri: 'https://i.pravatar.cc/150?img=3' }} // replace with real avatar
          style={styles.avatar}
        />
        <Text style={styles.username}>Sedidelishaj</Text>
      </View>

      {/* Menu Items */}
      <DrawerItemList {...props} />

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOut}>
        <Icon name="log-out-outline" size={24} color="#FF3B30" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Share Options */}
      <TouchableOpacity style={styles.shareItem}>
        <Icon name="chatbubble-outline" size={20} color="#fff" />
        <Text style={styles.shareText}>Text This App to a Friend</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.shareItem}>
        <Icon name="mail-outline" size={20} color="#fff" />
        <Text style={styles.shareText}>Email This App to a Friend</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.shareItem}>
        <Icon name="star-outline" size={20} color="#fff" />
        <Text style={styles.shareText}>Rate us on the App Store</Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={styles.version}>App Version 7.13.0 (9613)</Text>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  profile: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderColor: '#333' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  username: { color: '#fff', fontSize: 18, marginTop: 10, fontWeight: '600' },
  signOut: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  signOutText: { color: '#FF3B30', marginLeft: 20, fontSize: 16 },
  shareItem: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  shareText: { color: '#fff', marginLeft: 20, fontSize: 15 },
  version: { color: '#666', textAlign: 'center', padding: 20, fontSize: 12 },
});
