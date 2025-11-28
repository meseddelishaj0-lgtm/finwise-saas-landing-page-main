// wallstreetstocks-app/lib/auth.ts
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { router } from 'expo-router';

const TOKEN_KEY = 'auth_token';
const API_URL = 'https://wallstreetstocks.ai';

interface User {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, name?: string, profileImage?: string, provider?: 'email' | 'google' | 'apple') => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,

      init: async () => {
        try {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          if (token) {
            set({ loading: false });
          } else {
            set({ user: null, loading: false });
          }
        } catch {
          set({ user: null, loading: false });
        }
      },

      login: async (email: string, name?: string, profileImage?: string, provider: 'email' | 'google' | 'apple' = 'email') => {
        try {
          const userName = name || email.split('@')[0];
          
          // Use mobile-auth endpoints to avoid NextAuth conflict
          let endpoint = '/api/mobile-auth/signup';
          if (provider === 'google') {
            endpoint = '/api/mobile-auth/google';
          } else if (provider === 'apple') {
            endpoint = '/api/mobile-auth/apple';
          }

          const fullUrl = `${API_URL}${endpoint}`;
          console.log('Calling API:', fullUrl);

          // Call backend API
          const response = await fetch(fullUrl, {
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

          console.log('Response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Auth API error:', errorText);
            throw new Error(`Authentication failed: ${response.status}`);
          }

          const data = await response.json();
          console.log('Auth success:', data);
          
          // Store token
          await SecureStore.setItemAsync(TOKEN_KEY, data.token);
          
          // Update state
          set({ 
            user: { 
              id: data.user.id.toString(),
              email: data.user.email,
              name: data.user.name,
              profileImage: data.user.profileImage,
            }, 
            loading: false 
          });
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },

      logout: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        set({ user: null, loading: false });
        router.replace('/login');
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const v = await SecureStore.getItemAsync(name);
          return v ? JSON.parse(v) : null;
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

// Auto-init
useAuth.getState().init();
