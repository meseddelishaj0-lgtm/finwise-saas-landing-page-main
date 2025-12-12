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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const sendMessage = async () => {
    if (!message.trim() || !userId || !conversationId) return;

    const content = message.trim();
    setMessage('');
    setSending(true);

    // Optimistic update
    const tempMessage: Message = {
      id: Date.now(),
      content,
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
        body: JSON.stringify({ content }),
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
        <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
          <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
            <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
              {item.content}
            </Text>
            <Text style={[styles.messageTime, isMe ? styles.myTime : styles.theirTime]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
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
            onPress={() => router.push(`/profile/${otherUser.id}`)}
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

        <View style={styles.inputContainer}>
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
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!message.trim() || sending}
          >
            {sending ? (
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
});
