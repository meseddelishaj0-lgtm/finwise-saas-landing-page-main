import { useWindowDimensions } from 'react-native';

// On tablets and unfolded foldables the app renders in a centred column of at
// most this width (see ThemedApp in app/_layout.tsx), so every phone layout
// keeps its proportions. Phones are narrower than this, so nothing changes there.
export const MAX_CONTENT_WIDTH = 640;

export const contentWidthFor = (windowWidth: number) => Math.min(windowWidth, MAX_CONTENT_WIDTH);

// Width/height available to screen content. Live: updates on rotation,
// fold/unfold and iPad split view, unlike a module-level Dimensions.get().
export function useContentSize() {
  const { width, height } = useWindowDimensions();
  return { width: contentWidthFor(width), height };
}

export function useContentWidth() {
  return useContentSize().width;
}
