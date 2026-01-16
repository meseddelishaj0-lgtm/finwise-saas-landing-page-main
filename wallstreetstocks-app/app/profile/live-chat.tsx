// app/profile/live-chat.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_HISTORY_KEY = 'live_chat_history';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

interface QuickReply {
  id: string;
  text: string;
}

// Smart responses based on keywords
const smartResponses: { keywords: string[]; response: string }[] = [
  {
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    response: "Hello! Welcome to WallStreetStocks support. How can I help you today? Feel free to ask about your account, subscription, portfolio features, or any technical issues you're experiencing.",
  },
  {
    keywords: ['subscription', 'premium', 'upgrade', 'plan', 'pricing'],
    response: "Great question about our subscriptions! We offer three tiers:\n\n- Gold ($9.99/mo): Ad-free, extended screener\n- Platinum ($19.99/mo): AI insights, insider alerts\n- Diamond ($29.99/mo): Premium picks, 1-on-1 support\n\nAll plans include a 7-day free trial. Would you like help upgrading or have questions about a specific plan?",
  },
  {
    keywords: ['cancel', 'unsubscribe', 'stop subscription'],
    response: "To cancel your subscription:\n\n**iOS:** Settings > Your Name > Subscriptions > WallStreetStocks > Cancel\n\n**Android:** Play Store > Menu > Subscriptions > WallStreetStocks > Cancel\n\nYou'll keep access until your billing period ends. Is there anything we can help with before you go?",
  },
  {
    keywords: ['password', 'reset password', 'forgot password', 'change password'],
    response: "To reset your password:\n\n1. On the login screen, tap 'Forgot Password'\n2. Enter your email address\n3. Check your inbox for the reset link\n4. Create a new secure password\n\nIf you're logged in, go to Menu > Settings > Change Password. Need any other help?",
  },
  {
    keywords: ['portfolio', 'holdings', 'stocks', 'add stock'],
    response: "Managing your portfolio is easy!\n\n**Add holdings:** Home > All Holdings > + button\n**Edit holdings:** Tap any holding > Edit\n**Remove holdings:** Tap any holding > Remove\n\nYour portfolio automatically calculates gains, losses, and daily performance. What else would you like to know?",
  },
  {
    keywords: ['watchlist', 'watch list', 'track stock'],
    response: "To add stocks to your watchlist:\n\n1. Use the search bar on the Home screen\n2. Find the stock you want\n3. Tap 'Add to Watchlist'\n\nYou can also add from any stock chart using the menu icon. Your watchlist syncs across all devices!",
  },
  {
    keywords: ['notification', 'alert', 'push notification'],
    response: "To manage notifications:\n\n1. Go to Menu > Settings > Notifications\n2. Toggle the alerts you want:\n   - Price alerts\n   - News alerts\n   - Community notifications\n   - Portfolio changes\n\nAlso check your device settings to ensure WallStreetStocks has notification permissions enabled.",
  },
  {
    keywords: ['bug', 'error', 'crash', 'not working', 'problem', 'issue'],
    response: "I'm sorry you're experiencing issues! Let's troubleshoot:\n\n1. Force close and reopen the app\n2. Check your internet connection\n3. Update to the latest version\n4. Clear app cache (Android) or reinstall (iOS)\n\nIf the issue persists, please describe what's happening and I'll help further or escalate to our technical team.",
  },
  {
    keywords: ['refund', 'money back', 'charge', 'billing'],
    response: "For billing inquiries:\n\n- Refunds are processed through Apple/Google based on their policies\n- Check your subscription status in device settings\n- For unauthorized charges, contact us at wallstreetstocks@outlook.com\n\nCan you provide more details about your billing concern?",
  },
  {
    keywords: ['referral', 'invite', 'refer friend'],
    response: "Our referral program rewards you with free Premium!\n\n**How to refer:**\n1. Go to Menu > Referral Program\n2. Share your unique code with friends\n\n**Rewards:**\n- 5 referrals = 1 week Premium\n- 10 referrals = 1 month Premium\n- And more!\n\nReferred friends must be new users to count.",
  },
  {
    keywords: ['delete account', 'remove account', 'close account'],
    response: "To delete your account:\n\n1. Go to Menu > Settings\n2. Scroll to bottom > Delete Account\n3. Enter password to confirm\n\n**Warning:** This permanently deletes all your data including watchlists, portfolio, and posts. Please cancel any active subscription first.",
  },
  {
    keywords: ['human', 'real person', 'agent', 'speak to someone', 'representative'],
    response: "I understand you'd like to speak with a human agent. Our live support team is available Monday-Friday, 9am-6pm EST.\n\nYou can also:\n- Email: wallstreetstocks@outlook.com\n- Twitter: @WallStreetStocks\n- Call: +216 548 3378\n\nFor urgent issues, email us and we'll prioritize your request. Is there anything specific I can help with in the meantime?",
  },
  {
    keywords: ['thank', 'thanks', 'appreciate'],
    response: "You're welcome! I'm glad I could help. Is there anything else you'd like to know about WallStreetStocks? I'm here to assist with any questions about your account, features, or technical issues.",
  },
  {
    keywords: ['bye', 'goodbye', 'close', 'end chat'],
    response: "Thank you for chatting with WallStreetStocks support! If you have any more questions in the future, we're always here to help. Have a great day and happy investing!",
  },
];

const quickReplies: QuickReply[] = [
  { id: '1', text: 'How do I upgrade to Premium?' },
  { id: '2', text: 'Reset my password' },
  { id: '3', text: 'Add stocks to portfolio' },
  { id: '4', text: 'Report a bug' },
  { id: '5', text: 'Talk to a human' },
];

const getSmartResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();

  for (const item of smartResponses) {
    if (item.keywords.some(keyword => lowerMessage.includes(keyword))) {
      return item.response;
    }
  }

  // Default response
  return "Thank you for your message! I want to make sure I understand your question correctly. Could you please provide more details about what you need help with?\n\nYou can ask me about:\n- Account & subscription\n- Portfolio management\n- App features\n- Technical issues\n\nOr type 'human' to request a live agent.";
};

export default function LiveChat() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Load chat history
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (history) {
        const parsed = JSON.parse(history);
        // Only load recent messages (last 24 hours)
        const recentMessages = parsed.filter((msg: Message) => {
          const msgDate = new Date(msg.timestamp);
          const now = new Date();
          const hoursDiff = (now.getTime() - msgDate.getTime()) / (1000 * 60 * 60);
          return hoursDiff < 24;
        });

        if (recentMessages.length > 0) {
          setMessages(recentMessages);
        } else {
          // Start with welcome message
          addWelcomeMessage();
        }
      } else {
        addWelcomeMessage();
      }
    } catch (err) {
      
      addWelcomeMessage();
    }
  };

  const addWelcomeMessage = () => {
    const welcomeMsg: Message = {
      id: Date.now().toString(),
      text: "Hi there! I'm your WallStreetStocks support assistant. I'm here to help you with:\n\n- Account & subscription questions\n- Portfolio and watchlist features\n- Technical issues\n- App navigation\n\nHow can I assist you today?",
      sender: 'agent',
      timestamp: new Date(),
    };
    setMessages([welcomeMsg]);
  };

  const saveChatHistory = async (newMessages: Message[]) => {
    try {
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newMessages));
    } catch (err) {
      
    }
  };

  const sendMessage = (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');

    // Show typing indicator
    setIsTyping(true);

    // Simulate agent response delay
    setTimeout(() => {
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getSmartResponse(messageText),
        sender: 'agent',
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, agentResponse];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000); // Random delay 1-2 seconds
  };

  const handleQuickReply = (reply: QuickReply) => {
    sendMessage(reply.text);
  };

  const clearChat = async () => {
    await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
    addWelcomeMessage();
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.agentAvatar}>
            <Ionicons name="headset" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Support Chat</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#34C759' : '#FF3B30' }]} />
              <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={clearChat} style={styles.menuButton}>
          <Ionicons name="trash-outline" size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageWrapper,
                message.sender === 'user' ? styles.userMessageWrapper : styles.agentMessageWrapper
              ]}
            >
              {message.sender === 'agent' && (
                <View style={styles.agentAvatarSmall}>
                  <Ionicons name="headset" size={14} color="#fff" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.sender === 'user' ? styles.userMessage : styles.agentMessage
                ]}
              >
                <Text style={[
                  styles.messageText,
                  message.sender === 'user' ? styles.userMessageText : styles.agentMessageText
                ]}>
                  {message.text}
                </Text>
                <Text style={[
                  styles.messageTime,
                  message.sender === 'user' ? styles.userMessageTime : styles.agentMessageTime
                ]}>
                  {formatTime(message.timestamp)}
                </Text>
              </View>
            </View>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={[styles.messageWrapper, styles.agentMessageWrapper]}>
              <View style={styles.agentAvatarSmall}>
                <Ionicons name="headset" size={14} color="#fff" />
              </View>
              <View style={[styles.messageBubble, styles.agentMessage, styles.typingBubble]}>
                <View style={styles.typingIndicator}>
                  <View style={[styles.typingDot, styles.typingDot1]} />
                  <View style={[styles.typingDot, styles.typingDot2]} />
                  <View style={[styles.typingDot, styles.typingDot3]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Replies */}
        {messages.length <= 1 && (
          <View style={styles.quickRepliesContainer}>
            <Text style={styles.quickRepliesTitle}>Quick Questions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {quickReplies.map((reply) => (
                <TouchableOpacity
                  key={reply.id}
                  style={styles.quickReplyButton}
                  onPress={() => handleQuickReply(reply)}
                >
                  <Text style={styles.quickReplyText}>{reply.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#fff' : '#ccc'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  menuButton: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  agentMessageWrapper: {
    justifyContent: 'flex-start',
  },
  agentAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  userMessage: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  agentMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  agentMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  agentMessageTime: {
    color: '#999',
  },
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  quickRepliesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  quickRepliesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  quickReplyButton: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  quickReplyText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 16,
    fontSize: 15,
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
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#e5e5e5',
  },
});
