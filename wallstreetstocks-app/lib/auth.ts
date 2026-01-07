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
  location?: string;
  website?: string;
  bannerImage?: string;
  profileComplete?: boolean;
}

interface ProfileUpdateData {
  name?: string;
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  profileImage?: string;
  bannerImage?: string;
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
  setUserData: (data: Partial<User>) => void; // Update user state without API call
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

      // Update user data locally without API call (for sync with other contexts)
      setUserData: (data: Partial<User>) => {
        const { user } = get();
        if (user) {
          console.log('🔵 Auth: Updating user data locally:', data);
          set({ user: { ...user, ...data } });
        }
      },

      init: async () => {
        try {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          if (token) {
            await AsyncStorage.setItem('authToken', token);

            // Try to validate session with backend
            const { user: cachedUser } = get();

            if (cachedUser?.id) {
              // We have cached user data, try to refresh it
              try {
                const response = await fetch(`${API_URL}/api/user/${cachedUser.id}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                  },
                });

                if (response.ok) {
                  const data = await response.json();
                  const userData = data.user || data;
                  // Session is valid, update user data
                  set({
                    user: {
                      id: userData.id?.toString() || cachedUser.id,
                      email: userData.email || cachedUser.email,
                      name: userData.name || cachedUser.name,
                      username: userData.username || cachedUser.username,
                      profileImage: userData.profileImage || cachedUser.profileImage,
                      bannerImage: userData.bannerImage || cachedUser.bannerImage,
                      bio: userData.bio || cachedUser.bio,
                      location: userData.location || cachedUser.location,
                      website: userData.website || cachedUser.website,
                      profileComplete: userData.profileComplete ?? cachedUser.profileComplete,
                    },
                    token,
                    loading: false,
                  });
                  console.log('✅ Session restored for:', userData.email || cachedUser.email);
                } else if (response.status === 401) {
                  // Token is invalid, clear session
                  console.log('⚠️ Token expired, clearing session');
                  await SecureStore.deleteItemAsync(TOKEN_KEY);
                  await AsyncStorage.removeItem('authToken');
                  await AsyncStorage.removeItem('userId');
                  set({ user: null, token: null, loading: false });
                } else {
                  // Other error - keep cached data
                  console.log('⚠️ API error, using cached data');
                  set({ token, loading: false });
                }
              } catch (fetchError) {
                // Network error - keep existing state from persist
                console.log('⚠️ Network error during init, using cached data');
                set({ token, loading: false });
              }
            } else {
              // No cached user, just set the token
              set({ token, loading: false });
            }
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
              bannerImage: data.user.bannerImage || undefined,
              bio: data.user.bio || undefined,
              location: data.user.location || undefined,
              website: data.user.website || undefined,
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
              bannerImage: data.user.bannerImage || undefined,
              bio: data.user.bio || undefined,
              location: data.user.location || undefined,
              website: data.user.website || undefined,
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
              bannerImage: data.user.bannerImage || undefined,
              bio: data.user.bio || undefined,
              location: data.user.location || undefined,
              website: data.user.website || undefined,
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
          // Use /api/user/:id endpoint which is more reliable
          const response = await fetch(`${API_URL}/api/user/${user.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache',
            },
            body: JSON.stringify(data),
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
          
          // Update local user state with all profile fields
          set({
            user: {
              ...user,
              name: updatedUser.name || data.name || user.name,
              username: updatedUser.username || data.username || user.username,
              bio: updatedUser.bio ?? data.bio ?? user.bio,
              location: updatedUser.location ?? data.location ?? user.location,
              website: updatedUser.website ?? data.website ?? user.website,
              profileImage: updatedUser.profileImage || data.profileImage || user.profileImage,
              bannerImage: updatedUser.bannerImage || data.bannerImage || user.bannerImage,
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
              username: data.user.username || undefined,
              profileImage: data.user.profileImage || undefined,
              bannerImage: data.user.bannerImage || undefined,
              bio: data.user.bio || undefined,
              location: data.user.location || undefined,
              website: data.user.website || undefined,
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
