// app/profile/messages.tsx - WITH REAL AVATARS + FOLLOW STATUS
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: string;
  text: string;
  sent: boolean;
  timestamp: number;
}

interface Conversation {
  id: string;
  username: string;
  avatar: string | null;
  lastMessage: string;
  timestamp: number;
  unread: number;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string; // URL or base64
  isFollowingYou: boolean;
  youFollow: boolean;
}

export default function Messages() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Real users with avatars & follow status
  const allUsers: User[] = [
    { id: '1', username: 'warrenbuffett', displayName: 'Warren Buffett', avatar: 'https://i.pravatar.cc/150?img=1', isFollowingYou: true, youFollow: true },
    { id: '2', username: 'cathiewood', displayName: 'Cathie Wood', avatar: 'https://i.pravatar.cc/150?img=2', isFollowingYou: true, youFollow: true },
    { id: '3', username: 'elonmusk', displayName: 'Elon Musk', avatar: 'https://i.pravatar.cc/150?img=3', isFollowingYou: false, youFollow: true },
    { id: '4', username: 'chamath', displayName: 'Chamath Palihapitiya', avatar: 'https://i.pravatar.cc/150?img=4', isFollowingYou: true, youFollow: false },
    { id: '5', username: 'raydalio', displayName: 'Ray Dalio', avatar: 'https://i.pravatar.cc/150?img=5', isFollowingYou: true, youFollow: true },
    { id: '6', username: 'pmarca', displayName: 'Marc Andreessen', avatar: 'https://i.pravatar.cc/150?img=6', isFollowingYou: false, youFollow: true },
    { id: '7', username: 'billackman', displayName: 'Bill Ackman', avatar: 'https://i.pravatar.cc/150?img=7', isFollowingYou: true, youFollow: false },
    { id: '8', username: 'zerohedge', displayName: 'ZeroHedge', avatar: 'https://i.pravatar.cc/150?img=8', isFollowingYou: false, youFollow: false },
  ];

  const filteredUsers = allUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const saved = await AsyncStorage.getItem('conversations');
    if (saved) {
      setConversations(JSON.parse(saved));
    } else {
      const initial = allUsers.slice(0, 5).map(user => ({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        lastMessage: 'Hey! Great to connect',
        timestamp: Date.now() - Math.random() * 86400000,
        unread: Math.floor(Math.random() * 4),
      }));
      setConversations(initial);
      await AsyncStorage.setItem('conversations', JSON.stringify(initial));
    }
  };

  const openChat = (userId: string) => {
    setSelectedUser(userId);
    loadMessages(userId);
    setShowNewMessageModal(false);
    setSearchQuery('');
  };

  const loadMessages = async (userId: string) => {
    const key = `messages_${userId}`;
    const saved = await AsyncStorage.getItem(key);
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      const user = allUsers.find(u => u.id === userId);
      setMessages([
        { id: '1', text: `Hey @${user?.username}!`, sent: false, timestamp: Date.now() - 3600000 },
        { id: '2', text: 'Hey! Loving the market insights', sent: true, timestamp: Date.now() - 3000000 },
      ]);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedUser) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sent: true,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setMessage('');

    await AsyncStorage.setItem(`messages_${selectedUser}`, JSON.stringify(updatedMessages));

    const user = allUsers.find(u => u.id === selectedUser);
    if (user) {
      const updatedConvos = conversations.map(c =>
        c.id === selectedUser ? { ...c, lastMessage: message, timestamp: Date.now(), unread: 0 } : c
      );

      if (!conversations.find(c => c.id === selectedUser)) {
        updatedConvos.unshift({
          id: selectedUser,
          username: user.username,
          avatar: user.avatar,
          lastMessage: message,
          timestamp: Date.now(),
          unread: 0,
        });
      }

      setConversations(updatedConvos);
      await AsyncStorage.setItem('conversations', JSON.stringify(updatedConvos));
    }
  };

  const getFollowStatus = (user: User) => {
    if (user.youFollow && user.isFollowingYou) return { text: 'Mutual', color: '#00C853' };
    if (user.youFollow) return { text: 'Following', color: '#007AFF' };
    if (user.isFollowingYou) return { text: 'Follows you', color: '#888' };
    return null;
  };

  const Avatar = ({ user, size = 50 }: { user: User | Conversation; size?: number }) => {
    const displayName = 'displayName' in user ? user.displayName : user.username;
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
      <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
      </View>
    );
  };

  // Chat Screen
  if (selectedUser) {
    const convo = conversations.find(c => c.id === selectedUser);
    const user = allUsers.find(u => u.id === selectedUser) || convo;

    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setSelectedUser(null)}>
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12 }}>
              <Avatar user={user!} size={36} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.chatUsername}>@{user?.username}</Text>
                {user && 'displayName' in user && (
                  <Text style={styles.chatDisplayName}>{user.displayName}</Text>
                )}
              </View>
            </View>
          </View>

          <FlatList
            data={messages}
            keyExtractor={item => item.id}
            style={styles.messageList}
            inverted
            renderItem={({ item }) => (
              <View style={[styles.messageBubble, item.sent ? styles.sentBubble : styles.receivedBubble]}>
                <Text style={[styles.messageText, item.sent && styles.sentText]}>{item.text}</Text>
                <Text style={styles.messageTime}>
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message..."
              placeholderTextColor="#999"
            />
            <TouchableOpacity onPress={sendMessage} disabled={!message.trim()}>
              <Ionicons name="send" size={24} color={message.trim() ? '#007AFF' : '#ccc'} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity onPress={() => setShowNewMessageModal(true)}>
          <Ionicons name="pencil" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const user = allUsers.find(u => u.id === item.id) || item;
          return (
            <TouchableOpacity style={styles.conversationItem} onPress={() => openChat(item.id)}>
              <Avatar user={user} />
              <View style={styles.convoInfo}>
                <Text style={styles.convoUsername}>@{item.username}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
              </View>
              {item.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unread < 99 ? item.unread : '99+'}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Searchable New Message Modal with Avatars & Follow Status */}
      <Modal visible={showNewMessageModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setShowNewMessageModal(false);
                setSearchQuery('');
              }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Message</Text>
              <View style={{ width: 50 }} />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search people"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredUsers}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const status = getFollowStatus(item);
                const hasConversation = conversations.some(c => c.id === item.id);
                return (
                  <TouchableOpacity style={styles.modalUserItem} onPress={() => openChat(item.id)}>
                    <Avatar user={item} size={56} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.modalUsername}>@{item.username}</Text>
                      <Text style={styles.modalDisplayName}>{item.displayName}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        {status && (
                          <View style={[styles.followBadge, { backgroundColor: status.color + '15' }]}>
                            <Text style={[styles.followText, { color: status.color }]}>{status.text}</Text>
                          </View>
                        )}
                        {hasConversation && !status && (
                          <Text style={styles.alreadyChatting}>Already in messages</Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ddd" />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No users found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 18, fontWeight: '600' },
  conversationItem: { flexDirection: 'row', padding: 16, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  convoInfo: { flex: 1, marginLeft: 12 },
  convoUsername: { fontWeight: '600', fontSize: 16 },
  lastMessage: { color: '#666', fontSize: 14, marginTop: 4 },
  unreadBadge: { backgroundColor: '#007AFF', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  chatUsername: { fontSize: 17, fontWeight: '600' },
  chatDisplayName: { fontSize: 13, color: '#888', marginTop: 2 },
  messageList: { flex: 1, paddingHorizontal: 16 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 20, marginVertical: 4 },
  sentBubble: { alignSelf: 'flex-end', backgroundColor: '#007AFF' },
  receivedBubble: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0' },
  messageText: { fontSize: 16 },
  sentText: { color: '#fff' },
  messageTime: { fontSize: 11, color: '#fff8', marginTop: 4, alignSelf: 'flex-end' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
  textInput: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 25, paddingHorizontal: 16, paddingVertical: 12, marginRight: 12, fontSize: 16 },

  // Avatar
  avatarContainer: { overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 18, fontWeight: '700', color: '#666' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', height: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  cancelText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', marginHorizontal: 20, marginVertical: 12, borderRadius: 10, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  modalUserItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  modalUsername: { fontSize: 16, fontWeight: '600' },
  modalDisplayName: { fontSize: 14, color: '#333' },
  followBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  followText: { fontSize: 11, fontWeight: '600' },
  alreadyChatting: { fontSize: 13, color: '#888' },
  noResults: { padding: 40, alignItems: 'center' },
  noResultsText: { fontSize: 16, color: '#999' },
});
