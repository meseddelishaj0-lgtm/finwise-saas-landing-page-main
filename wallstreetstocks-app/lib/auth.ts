// wallstreetstocks-app/lib/auth.ts
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { router } from 'expo-router';

const TOKEN_KEY = 'auth_token';
const API_URL = 'https://www.wallstreetstocks.ai';

interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  profileImage?: string;
  bio?: string;
  profileComplete?: boolean;
}

interface ProfileUpdateData {
  name?: string;
  username?: string;
  bio?: string;
  profileImage?: string;
  profileComplete?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isNewUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string, username?: string) => Promise<void>;
  socialLogin: (email: string, name?: string, profileImage?: string, provider?: 'google' | 'apple') => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; devCode?: string }>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
  getToken: () => Promise<string | null>;
  setIsNewUser: (value: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: true,
      isNewUser: false,

      setIsNewUser: (value: boolean) => {
        set({ isNewUser: value });
      },

      init: async () => {
        try {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          if (token) {
            await AsyncStorage.setItem('authToken', token);
            set({ token, loading: false });
          } else {
            set({ user: null, token: null, loading: false });
          }
        } catch (error) {
          console.error('Auth init error:', error);
          set({ user: null, token: null, loading: false });
        }
      },

      getToken: async () => {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        return token;
      },

      // Email/Password Login
      login: async (email: string, password: string) => {
        console.log('=== LOGIN ===');
        console.log('Email:', email);

        try {
          const response = await fetch(`${API_URL}/api/mobile-auth/login`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          console.log('Status:', response.status);
          const responseText = await response.text();
          console.log('Response:', responseText);

          if (!response.ok) {
            const error = JSON.parse(responseText);
            throw new Error(error.error || 'Login failed');
          }

          const data = JSON.parse(responseText);
          
          await SecureStore.setItemAsync(TOKEN_KEY, data.token);
          await AsyncStorage.setItem('authToken', data.token);
          
          set({ 
            user: { 
              id: data.user.id.toString(),
              email: data.user.email,
              name: data.user.name,
              username: data.user.username || undefined,
              profileImage: data.user.profileImage || undefined,
            },
            token: data.token,
            loading: false 
          });

          // Store userId for community pages
          await AsyncStorage.setItem('userId', data.user.id.toString());

          console.log('Login complete!');
        } catch (error: any) {
          console.error('Login error:', error.message);
          throw error;
        }
      },

      // Email/Password Signup
      signup: async (email: string, password: string, name?: string, username?: string) => {
        console.log('=== SIGNUP ===');
        console.log('Email:', email);
        console.log('Username:', username);

        try {
          const response = await fetch(`${API_URL}/api/mobile-auth/signup`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ 
              email, 
              password,
              name: name || email.split('@')[0],
              username: username || undefined,
            }),
          });

          console.log('Status:', response.status);
          const responseText = await response.text();
          console.log('Response:', responseText);

          if (!response.ok) {
            const error = JSON.parse(responseText);
            throw new Error(error.error || 'Signup failed');
          }

          const data = JSON.parse(responseText);
          
          await SecureStore.setItemAsync(TOKEN_KEY, data.token);
          await AsyncStorage.setItem('authToken', data.token);
          
          set({ 
            user: { 
              id: data.user.id.toString(),
              email: data.user.email,
              name: data.user.name,
              username: data.user.username || undefined,
              profileImage: data.user.profileImage || undefined,
            },
            token: data.token,
            loading: false 
          });

          // Store userId for community pages
          await AsyncStorage.setItem('userId', data.user.id.toString());

          console.log('Signup complete!');
        } catch (error: any) {
          console.error('Signup error:', error.message);
          throw error;
        }
      },

      // Social Login (Google/Apple)
      socialLogin: async (email: string, name?: string, profileImage?: string, provider: 'google' | 'apple' = 'google') => {
        const userName = name || email.split('@')[0];
        const endpoint = provider === 'google' ? '/api/mobile-auth/google' : '/api/mobile-auth/apple';

        console.log('=== SOCIAL LOGIN ===');
        console.log('Provider:', provider);
        console.log('Email:', email);

        try {
          const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ 
              email,
              name: userName,
              profileImage: profileImage || null,
            }),
          });

          console.log('Status:', response.status);
          const responseText = await response.text();
          console.log('Response:', responseText);

          if (!response.ok) {
            throw new Error(`Auth failed: ${response.status}`);
          }

          const data = JSON.parse(responseText);
          
          await SecureStore.setItemAsync(TOKEN_KEY, data.token);
          await AsyncStorage.setItem('authToken', data.token);
          
          // Check if this is a new user (no username set or isNewUser flag from API)
          const isNewUser = data.isNewUser || !data.user.username || !data.user.profileComplete;
          
          set({ 
            user: { 
              id: data.user.id.toString(),
              email: data.user.email,
              name: data.user.name,
              username: data.user.username || undefined,
              profileImage: data.user.profileImage || undefined,
              bio: data.user.bio || undefined,
              profileComplete: data.user.profileComplete || false,
            },
            token: data.token,
            loading: false,
            isNewUser,
          });

          // Store userId for community pages
          await AsyncStorage.setItem('userId', data.user.id.toString());

          console.log('Social login complete! isNewUser:', isNewUser);
        } catch (error: any) {
          console.error('Social login error:', error.message);
          throw error;
        }
      },

      // Update Profile
      updateProfile: async (data: ProfileUpdateData) => {
        const { token, user } = get();
        
        if (!token || !user) {
          throw new Error('Not authenticated');
        }

        console.log('=== UPDATE PROFILE ===');
        console.log('User ID:', user.id);
        console.log('Data:', data);

        try {
          const response = await fetch(`${API_URL}/api/user/profile`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...data,
              userId: user.id, // Always include userId in body
            }),
          });

          console.log('Status:', response.status);
          const responseText = await response.text();
          console.log('Response:', responseText);

          // Check if response is HTML (error page)
          if (responseText.startsWith('<') || responseText.startsWith('<!')) {
            throw new Error('Server error - please try again');
          }

          if (!response.ok) {
            try {
              const error = JSON.parse(responseText);
              throw new Error(error.error || 'Failed to update profile');
            } catch {
              throw new Error('Failed to update profile');
            }
          }

          const result = JSON.parse(responseText);
          
          // Handle both response formats: { user: {...} } or direct user object
          const updatedUser = result.user || result;
          
          // Update local user state
          set({ 
            user: { 
              ...user,
              name: updatedUser.name || data.name || user.name,
              username: updatedUser.username || data.username || user.username,
              bio: updatedUser.bio || data.bio || user.bio,
              profileImage: updatedUser.profileImage || user.profileImage,
              profileComplete: updatedUser.profileComplete ?? data.profileComplete ?? true,
            },
            isNewUser: false,
          });

          console.log('Profile updated!');
        } catch (error: any) {
          console.error('Update profile error:', error.message);
          throw error;
        }
      },

      // Forgot Password
      forgotPassword: async (email: string) => {
        console.log('=== FORGOT PASSWORD ===');
        console.log('Email:', email);

        try {
          const response = await fetch(`${API_URL}/api/mobile-auth/forgot-password`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ email }),
          });

          const responseText = await response.text();
          console.log('Response:', responseText);

          if (!response.ok) {
            const error = JSON.parse(responseText);
            throw new Error(error.error || 'Request failed');
          }

          return JSON.parse(responseText);
        } catch (error: any) {
          console.error('Forgot password error:', error.message);
          throw error;
        }
      },

      // Reset Password
      resetPassword: async (email: string, code: string, newPassword: string) => {
        console.log('=== RESET PASSWORD ===');
        console.log('Email:', email);

        try {
          const response = await fetch(`${API_URL}/api/mobile-auth/reset-password`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ email, code, newPassword }),
          });

          const responseText = await response.text();
          console.log('Response:', responseText);

          if (!response.ok) {
            const error = JSON.parse(responseText);
            throw new Error(error.error || 'Reset failed');
          }

          const data = JSON.parse(responseText);
          
          // Auto-login after password reset
          await SecureStore.setItemAsync(TOKEN_KEY, data.token);
          await AsyncStorage.setItem('authToken', data.token);
          
          set({ 
            user: { 
              id: data.user.id.toString(),
              email: data.user.email,
              name: data.user.name,
              profileImage: data.user.profileImage || undefined,
            },
            token: data.token,
            loading: false 
          });

          console.log('Password reset complete!');
        } catch (error: any) {
          console.error('Reset password error:', error.message);
          throw error;
        }
      },

      logout: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await AsyncStorage.removeItem('authToken');
        set({ user: null, token: null, loading: false });
        
        // Clear userId from AsyncStorage
        await AsyncStorage.removeItem('userId');
        
        router.replace('/login');
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          try {
            const value = await SecureStore.getItemAsync(name);
            return value ? JSON.parse(value) : null;
          } catch {
            return null;
          }
        },
        setItem: async (name, value) => {
          await SecureStore.setItemAsync(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await SecureStore.deleteItemAsync(name);
        },
      })),
    }
  )
);

useAuth.getState().init();
