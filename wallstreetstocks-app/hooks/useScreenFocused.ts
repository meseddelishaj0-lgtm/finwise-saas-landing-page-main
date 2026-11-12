// hooks/useScreenFocused.ts
// True while the screen this is called from is the one on display. Tab
// screens stay mounted after you leave them, so anything that re-renders on a
// timer or on live prices should stop while this is false.

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

export function useScreenFocused(): boolean {
  const [focused, setFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  return focused;
}
