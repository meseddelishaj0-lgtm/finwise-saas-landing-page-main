// components/lucideShim.tsx
// Drop-in Ionicons replacements for the handful of lucide-react-native
// icons the app used, so the 34MB lucide package (and its tamagui pals)
// can be removed from the binary. Same props: size, color, fill.
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

interface IconProps {
  size?: number;
  color?: string;
  fill?: string;
  style?: any;
}

const make =
  (filled: keyof typeof Ionicons.glyphMap, outline?: keyof typeof Ionicons.glyphMap) =>
  ({ size = 24, color = '#000', fill, style }: IconProps) => {
    const isFilled = !!fill && fill !== 'none' && fill !== 'transparent';
    return (
      <Ionicons
        name={isFilled || !outline ? filled : outline}
        size={size}
        color={isFilled ? fill : color}
        style={style}
      />
    );
  };

export const ChevronLeft = make('chevron-back');
export const Check = make('checkmark');
export const Crown = make('trophy', 'trophy-outline');
export const Gem = make('diamond', 'diamond-outline');
export const Award = make('ribbon', 'ribbon-outline');
export const Zap = make('flash', 'flash-outline');
export const Shield = make('shield-checkmark', 'shield-checkmark-outline');
export const TrendingUp = make('trending-up');
export const Bell = make('notifications', 'notifications-outline');
export const BarChart3 = make('bar-chart', 'bar-chart-outline');
export const Users = make('people', 'people-outline');
export const FileText = make('document-text', 'document-text-outline');
export const Cpu = make('hardware-chip', 'hardware-chip-outline');
export const Headphones = make('headset', 'headset-outline');
export const Settings = make('settings', 'settings-outline');
export const Calendar = make('calendar', 'calendar-outline');
export const RefreshCw = make('refresh');
export const XCircle = make('close-circle', 'close-circle-outline');
export const ArrowUpCircle = make('arrow-up-circle', 'arrow-up-circle-outline');
export const ExternalLink = make('open-outline');
export const Star = make('star', 'star-outline');
export const Heart = make('heart', 'heart-outline');
export const ThumbsUp = make('thumbs-up', 'thumbs-up-outline');

export const MessageSquare = make('chatbox', 'chatbox-outline');
export const Send = make('send', 'send-outline');
export const Smartphone = make('phone-portrait', 'phone-portrait-outline');
export const Mail = make('mail', 'mail-outline');
export const AtSign = make('at');
export const LogOut = make('log-out', 'log-out-outline');
export const AlertCircle = make('alert-circle', 'alert-circle-outline');
