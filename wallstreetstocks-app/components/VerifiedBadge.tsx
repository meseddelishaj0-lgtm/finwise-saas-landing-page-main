// components/VerifiedBadge.tsx
// Blue verified checkmark shown next to names of users with isVerified.
// Renders nothing when not verified, so it can be dropped inline anywhere.
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export const VERIFIED_BLUE = '#0A84FF';

export default function VerifiedBadge({
  verified,
  size = 14,
  style,
}: {
  verified?: boolean | null;
  size?: number;
  style?: any;
}) {
  if (!verified) return null;
  return (
    <Ionicons
      name="checkmark-circle"
      size={size}
      color={VERIFIED_BLUE}
      style={[{ marginLeft: 3 }, style]}
    />
  );
}
