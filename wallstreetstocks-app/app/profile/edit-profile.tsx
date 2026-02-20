// app/profile/edit-profile.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth';
import { useUserProfile } from '@/context/UserProfileContext';
import { useTheme } from '@/context/ThemeContext';

const API_BASE_URL = 'https://www.wallstreetstocks.ai';

// Upload image to server and return URL
const uploadImage = async (imageUri: string): Promise<string | null> => {
  try {
    // Skip if already a remote URL
    if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
      return imageUri;
    }

    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('file', { uri: imageUri, name: filename, type } as any);

    
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      
      return null;
    }

    const result = await response.json();
    
    return result.url;
  } catch (error) {
    
    return null;
  }
};

export default function EditProfile() {
  const router = useRouter();
  const { user: authUser, setUserData } = useAuth();
  const { updateProfile: updateUserProfile } = useUserProfile();
  const { colors, isDark } = useTheme();

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const getUserId = (): number | null => {
    if (authUser?.id) return Number(authUser.id);
    return null;
  };

  // Load profile data on mount - use Auth context as source of truth
  // Only reload when user ID changes (login/logout), NOT when user data changes
  React.useEffect(() => {
    const loadProfile = async () => {
      const userId = getUserId();
      

      if (!userId) {
        // Fall back to local storage if not logged in
        const saved = await AsyncStorage.getItem('personalInfo');
        if (saved) {
          const data = JSON.parse(saved);
          setName(data.name || '');
          setUsername(data.username || '');
          setEmail(data.email || '');
          setBio(data.bio || '');
          setLocation(data.location || '');
          setWebsite(data.website || '');
          setAvatar(data.avatar || null);
          setBannerImage(data.bannerImage || null);
        }
        setLoading(false);
        return;
      }

      // FIRST: Use Auth context data (persisted locally, always fresh)
      // This avoids Neon read replica lag issues
      if (authUser) {
        
        setName(authUser.name || '');
        setUsername(authUser.username || '');
        setEmail(authUser.email || '');
        setBio(authUser.bio || '');
        setLocation((authUser as any).location || '');
        setWebsite((authUser as any).website || '');
        setAvatar(authUser.profileImage || null);
        setBannerImage((authUser as any).bannerImage || null);
      }

      // THEN: Fetch from API for any fields not in Auth (like subscriptionTier)
      // But DON'T overwrite Auth fields - they are source of truth
      try {
        const timestamp = Date.now();
        const url = `${API_BASE_URL}/api/user/${userId}?_t=${timestamp}`;
        

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });

        if (response.ok) {
          const data = await response.json();
          

          // Only use API data for fields NOT in Auth context
          // Auth context is the source of truth for editable fields
          if (!authUser?.name && data.name) setName(data.name);
          if (!authUser?.username && data.username) setUsername(data.username);
          if (!authUser?.email && data.email) setEmail(data.email);
          if (!authUser?.bio && data.bio) setBio(data.bio);
          if (!(authUser as any)?.location && data.location) setLocation(data.location);
          if (!(authUser as any)?.website && data.website) setWebsite(data.website);
          if (!authUser?.profileImage && data.profileImage) setAvatar(data.profileImage);
          if (!(authUser as any)?.bannerImage && data.bannerImage) setBannerImage(data.bannerImage);
        } else {
          
        }
      } catch (error) {
        
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [authUser?.id]); // Only reload on user ID change, NOT on data change

  // Validate username as user types
  const handleUsernameChange = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    
    if (cleaned.length > 0 && cleaned.length < 3) {
      setUsernameError('Username must be at least 3 characters');
    } else if (cleaned.length > 20) {
      setUsernameError('Username must be 20 characters or less');
    } else {
      setUsernameError('');
    }
  };

  // Pick Profile Image
  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to photos to change avatar');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  // Pick Banner Image
  const pickBanner = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to photos to change banner');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setBannerImage(result.assets[0].uri);
    }
  };

  // Save Button
  const handleSave = async () => {
    const userId = getUserId();

    
    

    // Validate name
    if (!name || name.trim().length === 0) {
      Alert.alert('Name Required', 'Please enter your display name');
      return;
    }

    // Validate username
    if (username && (username.length < 3 || username.length > 20)) {
      Alert.alert('Invalid Username', 'Username must be 3-20 characters');
      return;
    }

    setSaving(true);

    try {
      // Upload images if they are local files (file://)
      let uploadedAvatar = avatar;
      let uploadedBanner = bannerImage;

      if (avatar && avatar.startsWith('file://')) {
        
        const url = await uploadImage(avatar);
        if (url) {
          uploadedAvatar = url;
          setAvatar(url); // Update local state with URL
        } else {
          Alert.alert('Upload Failed', 'Failed to upload profile image. Please try again.');
          setSaving(false);
          return;
        }
      }

      if (bannerImage && bannerImage.startsWith('file://')) {
        
        const url = await uploadImage(bannerImage);
        if (url) {
          uploadedBanner = url;
          setBannerImage(url); // Update local state with URL
        } else {
          Alert.alert('Upload Failed', 'Failed to upload banner image. Please try again.');
          setSaving(false);
          return;
        }
      }

      if (userId) {
        // Save to API
        const payload = {
          userId,
          username: username || undefined,
          name: name.trim(),
          bio: bio || '',
          location: location || '',
          website: website || '',
          profileImage: uploadedAvatar,
          bannerImage: uploadedBanner,
        };

        // Use /api/user/:id endpoint which is more reliable
        const response = await fetch(`${API_BASE_URL}/api/user/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
          if (responseData.error?.includes('Username')) {
            setUsernameError(responseData.error);
            Alert.alert('Error', responseData.error);
            setSaving(false);
            return;
          }
          throw new Error(responseData.error || 'Failed to save');
        }

        // Update BOTH contexts directly with the response data
        // This avoids read replica lag issues with re-fetching

        // Update UserProfileContext (used by Profile tab, Community)
        updateUserProfile({
          name: responseData.name,
          username: responseData.username,
          bio: responseData.bio,
          location: responseData.location,
          website: responseData.website,
          profileImage: responseData.profileImage,
          bannerImage: responseData.bannerImage,
        });

        // Update Auth context (used by Menu) - direct state update, no API call
        setUserData({
          name: responseData.name,
          username: responseData.username,
          bio: responseData.bio,
          location: responseData.location,
          website: responseData.website,
          profileImage: responseData.profileImage,
          bannerImage: responseData.bannerImage,
        });

        
      } else {
        
      }

      // Also save to local storage as backup
      const data = { name: name.trim(), username, email, bio, location, website, avatar, bannerImage };
      await AsyncStorage.setItem('personalInfo', JSON.stringify(data));

      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      
      Alert.alert('Error', error.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? colors.border : '#f0f0f0', backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveHeaderButton, saving && styles.saveHeaderButtonDisabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.saveHeaderText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Banner Image */}
          <TouchableOpacity onPress={pickBanner} style={styles.bannerContainer}>
            {bannerImage ? (
              <Image source={{ uri: bannerImage }} style={styles.bannerImage} />
            ) : (
              <View style={[styles.bannerPlaceholder, { backgroundColor: isDark ? colors.surface : '#E5E5E5' }]}>
                <Ionicons name="camera" size={32} color={colors.textTertiary} />
                <Text style={[styles.bannerPlaceholderText, { color: colors.textTertiary }]}>Change Banner</Text>
              </View>
            )}
            <View style={styles.bannerOverlay}>
              <Ionicons name="camera" size={24} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <TouchableOpacity onPress={pickAvatar} style={styles.avatarContainer}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={[styles.avatar, { borderColor: colors.background }]} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface, borderColor: colors.background }]}>
                  <Ionicons name="person" size={40} color={colors.textTertiary} />
                </View>
              )}
              <View style={styles.avatarOverlay}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#e5e5e5', color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
            <View style={[styles.usernameInputContainer, { borderColor: isDark ? colors.border : '#e5e5e5', backgroundColor: colors.surface }]}>
              <Text style={[styles.usernamePrefix, { color: colors.textSecondary }]}>@</Text>
              <TextInput
                style={[styles.input, styles.usernameInput, { color: colors.text }, usernameError ? styles.inputError : null]}
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="Choose a username"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
            </View>
            {usernameError ? (
              <Text style={styles.errorText}>{usernameError}</Text>
            ) : (
              <Text style={[styles.helperText, { color: colors.textTertiary }]}>Letters, numbers, and underscores only</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#e5e5e5', color: colors.text }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Location</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#e5e5e5', color: colors.text }]}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. New York, USA"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Website</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#e5e5e5', color: colors.text }]}
              value={website}
              onChangeText={setWebsite}
              placeholder="e.g. yoursite.com"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
            <TextInput
              style={[styles.input, styles.emailInput, { backgroundColor: isDark ? colors.surface : '#f0f0f0', color: colors.textSecondary, borderColor: isDark ? colors.border : '#e5e5e5' }]}
              value={email}
              editable={false}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={[styles.helperText, { color: colors.textTertiary }]}>Email cannot be changed (used for sign-in)</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled, { backgroundColor: isDark ? colors.primary : '#000' }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveHeaderButton: {
    padding: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  saveHeaderButtonDisabled: {
    opacity: 0.7,
  },
  saveHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: 40,
  },
  bannerContainer: {
    width: '100%',
    height: 150,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerPlaceholderText: {
    color: '#999',
    marginTop: 8,
    fontSize: 14,
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapper: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    backgroundColor: '#fafafa',
  },
  usernamePrefix: {
    paddingLeft: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  usernameInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  emailInput: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 4,
  },
  bioInput: {
    height: 110,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
