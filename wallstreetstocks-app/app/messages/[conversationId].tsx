// app/messages/[conversationId].tsx
// Direct Messages - Conversation Chat Screen
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const API_BASE_URL = 'https://www.wallstreetstocks.ai/api';

interface Sender {
  id: number;
  username: string;
  name: string | null;
  profileImage: string | null;
}

interface Message {
  id: number;
  content: string;
  imageUrl?: string | null;
  senderId: number;
  createdAt: string;
  sender: Sender;
}

interface OtherUser {
  id: number;
  username: string;
  name: string | null;
  profileImage: string | null;
  isVerified: boolean;
}

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      if (userId && conversationId) {
        fetchMessages(userId, true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [userId, conversationId]);

  const loadUserId = async () => {
    const storedUserId = await AsyncStorage.getItem('userId');
    setUserId(storedUserId);
    if (storedUserId && conversationId) {
      fetchMessages(storedUserId);
    } else {
      setLoading(false);
    }
  };

  const fetchMessages = async (uid: string, silent = false) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${conversationId}`, {
        headers: { 'x-user-id': uid },
      });
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
      if (data.otherUser) {
        setOtherUser(data.otherUser);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
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
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!userId || !conversationId) return;

    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistic update
            const deletedMessage = messages.find(m => m.id === messageId);
            setMessages((prev) => prev.filter((m) => m.id !== messageId));

            try {
              const response = await fetch(
                `${API_BASE_URL}/messages/${conversationId}?messageId=${messageId}`,
                {
                  method: 'DELETE',
                  headers: { 'x-user-id': userId },
                }
              );

              if (!response.ok) {
                // Restore message on error
                if (deletedMessage) {
                  setMessages((prev) => [...prev, deletedMessage].sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                  ));
                }
                Alert.alert('Error', 'Failed to delete message');
              }
            } catch (error) {
              console.error('Error deleting message:', error);
              if (deletedMessage) {
                setMessages((prev) => [...prev, deletedMessage].sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                ));
              }
            }
          },
        },
      ]
    );
  };

  const sendMessage = async () => {
    if ((!message.trim() && !selectedImage) || !userId || !conversationId) return;

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
      sender: {
        id: parseInt(userId),
        username: '',
        name: null,
        profileImage: null,
      },
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await fetch(`${API_BASE_URL}/messages/${conversationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ content, imageUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMessage.id ? data.message : m))
        );
      } else {
        // Remove temp message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === parseInt(userId || '0');
    const showDate =
      index === 0 ||
      formatDate(item.createdAt) !== formatDate(messages[index - 1].createdAt);

    return (
      <View>
        {showDate && (
          <Text style={styles.dateHeader}>{formatDate(item.createdAt)}</Text>
        )}
        <TouchableOpacity
          style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}
          onLongPress={() => isMe && deleteMessage(item.id)}
          delayLongPress={500}
          activeOpacity={0.8}
        >
          <View style={[
            styles.messageBubble,
            isMe ? styles.myBubble : styles.theirBubble,
            item.imageUrl && styles.imageBubble
          ]}>
            {item.imageUrl && (
              <TouchableOpacity
                onPress={() => {
                  setViewingImage(item.imageUrl || null);
                  setImageViewerVisible(true);
                }}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            {item.content ? (
              <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                {item.content}
              </Text>
            ) : null}
            <Text style={[styles.messageTime, isMe ? styles.myTime : styles.theirTime]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Text>Please sign in to view messages</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        {otherUser && (
          <TouchableOpacity
            style={styles.headerUser}
            onPress={() => router.push(`/profile/${otherUser.id}` as any)}
          >
            {otherUser.profileImage ? (
              <Image source={{ uri: otherUser.profileImage }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerAvatarText}>
                  {(otherUser.name || otherUser.username || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerTitle}>
                  {otherUser.name || otherUser.username}
                </Text>
                {otherUser.isVerified && (
                  <Ionicons name="checkmark-circle" size={14} color="#007AFF" style={{ marginLeft: 4 }} />
                )}
              </View>
              <Text style={styles.headerUsername}>@{otherUser.username}</Text>
            </View>
          </TouchableOpacity>
        )}
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            onLayout={() => flatListRef.current?.scrollToEnd()}
          />
        )}

        {/* Selected Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#8E8E93"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
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

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setImageViewerVisible(false)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {viewingImage && (
            <Image
              source={{ uri: viewingImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  dateHeader: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginVertical: 16,
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
  imageBubble: {
    padding: 4,
  },
  messageImage: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: 14,
    marginBottom: 4,
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
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});
