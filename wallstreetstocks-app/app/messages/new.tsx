// app/messages/new.tsx
// New Conversation Screen - Send first message to a user
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';

const API_BASE_URL = 'https://www.wallstreetstocks.ai/api';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RecipientUser {
  id: number;
  username: string | null;
  name: string | null;
  profileImage: string | null;
  isVerified?: boolean;
}

interface Message {
  id: number;
  content: string;
  imageUrl?: string | null;
  senderId: number;
  createdAt: string;
}

export default function NewConversationScreen() {
  const { colors, isDark } = useTheme();
  const { recipientId } = useLocalSearchParams<{ recipientId: string }>();
  const [recipient, setRecipient] = useState<RecipientUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    const storedUserId = await AsyncStorage.getItem('userId');
    setUserId(storedUserId);
    if (storedUserId && recipientId) {
      fetchRecipient(recipientId);
    } else {
      setLoading(false);
    }
  };

  const fetchRecipient = async (recipId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/${recipId}`);
      if (response.ok) {
        const data = await response.json();
        setRecipient(data);
      }
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri,
        name: filename,
        type,
      } as unknown as Blob);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'x-user-id': userId || '',
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.url;
      }
      return null;
    } catch (error) {
      
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const sendMessage = async () => {
    if ((!message.trim() && !selectedImage) || !userId || !recipientId) return;

    const content = message.trim();
    let imageUrl: string | null = null;

    // Upload image first if selected
    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage);
      if (!imageUrl && !content) {
        Alert.alert('Error', 'Failed to upload image');
        return;
      }
    }

    setMessage('');
    setSelectedImage(null);
    setSending(true);

    // Optimistic update
    const tempMessage: Message = {
      id: Date.now(),
      content,
      imageUrl,
      senderId: parseInt(userId),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          recipientId: parseInt(recipientId),
          content,
          imageUrl
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to the actual conversation
        router.replace(`/messages/${data.conversationId}`);
      } else {
        // Remove temp message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
        const errorData = await response.json();
        
      }
    } catch (error) {
      
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDisplayName = (user: RecipientUser | null): string => {
    if (!user) return 'User';
    if (user.name && !user.name.includes('@')) return user.name;
    if (user.username) return user.username;
    return 'User';
  };

  const getHandle = (user: RecipientUser | null): string => {
    if (!user) return 'user';
    if (user.username) return user.username;
    return `user${user.id}`;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === parseInt(userId || '0');

    return (
      <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : [styles.theirBubble, { backgroundColor: colors.surface }]]}>
          <Text style={[styles.messageText, isMe ? styles.myText : [styles.theirText, { color: colors.text }]]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMe ? styles.myTime : [styles.theirTime, { color: colors.textSecondary }]]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (!userId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: isDark ? colors.border : '#E5E5EA' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Message</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Please sign in to send messages</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: isDark ? colors.border : '#E5E5EA' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : recipient ? (
          <View style={styles.headerUser}>
            {recipient.profileImage ? (
              <Image source={{ uri: recipient.profileImage }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatarPlaceholder, { backgroundColor: isDark ? colors.surface : '#E5E5EA' }]}>
                <Text style={[styles.headerAvatarText, { color: colors.textSecondary }]}>
                  {getDisplayName(recipient)[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <View style={styles.headerNameRow}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{getDisplayName(recipient)}</Text>
                {recipient.isVerified && (
                  <Ionicons name="checkmark-circle" size={14} color="#007AFF" style={{ marginLeft: 4 }} />
                )}
              </View>
              <Text style={[styles.headerUsername, { color: colors.textSecondary }]}>@{getHandle(recipient)}</Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Message</Text>
        )}
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.newConversationContainer}>
            {recipient && (
              <>
                <View style={styles.recipientProfile}>
                  {recipient.profileImage ? (
                    <Image source={{ uri: recipient.profileImage }} style={styles.recipientAvatar} />
                  ) : (
                    <View style={[styles.recipientAvatarPlaceholder, { backgroundColor: isDark ? colors.surface : '#E5E5EA' }]}>
                      <Text style={[styles.recipientAvatarText, { color: colors.textSecondary }]}>
                        {getDisplayName(recipient)[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.recipientName, { color: colors.text }]}>{getDisplayName(recipient)}</Text>
                  <Text style={[styles.recipientHandle, { color: colors.textSecondary }]}>@{getHandle(recipient)}</Text>
                </View>
                <Text style={[styles.newConversationHint, { color: colors.textSecondary }]}>
                  Send a message to start the conversation
                </Text>
              </>
            )}
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          />
        )}

        {/* Selected Image Preview */}
        {selectedImage && (
          <View style={[styles.imagePreviewContainer, { backgroundColor: colors.background, borderTopColor: isDark ? colors.border : '#E5E5EA' }]}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: isDark ? colors.border : '#E5E5EA' }]}>
          <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
            autoFocus
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() && !selectedImage) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={(!message.trim() && !selectedImage) || sending || uploadingImage}
          >
            {sending || uploadingImage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
  },
  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerUsername: {
    fontSize: 13,
    color: '#8E8E93',
  },
  keyboardView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  newConversationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  recipientProfile: {
    alignItems: 'center',
  },
  recipientAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  recipientAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  recipientAvatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#8E8E93',
  },
  recipientName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  recipientHandle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  newConversationHint: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 24,
    textAlign: 'center',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 4,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myText: {
    color: '#fff',
  },
  theirText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  theirTime: {
    color: '#8E8E93',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 16,
    maxHeight: 100,
    color: '#000',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  imagePreviewContainer: {
    backgroundColor: '#fff',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    position: 'relative',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    left: 84,
  },
});
