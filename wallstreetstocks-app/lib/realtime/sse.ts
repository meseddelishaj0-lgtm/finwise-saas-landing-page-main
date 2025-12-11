// lib/realtime/sse.ts
// React Native compatible - uses polling instead of EventSource

const API_BASE_URL = 'https://www.wallstreetstocks.ai';

export function openSSEConnection(
  userId: number,
  onMessage: (data: any) => void,
  intervalMs: number = 30000 // Poll every 30 seconds
) {
  let isActive = true;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const fetchNotifications = async () => {
    if (!isActive || !userId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications?userId=${userId}&unread=true`
      );
      
      if (response.ok) {
        const notifications = await response.json();
        onMessage({ type: 'notifications', data: notifications });
      }
    } catch (error) {
      console.log('Notification polling error:', error);
    }

    // Schedule next poll if still active
    if (isActive) {
      timeoutId = setTimeout(fetchNotifications, intervalMs);
    }
  };

  // Initial fetch
  fetchNotifications();

  // Return cleanup function
  return () => {
    isActive = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}

// Alternative: Simple hook for notifications polling
export function useNotificationPolling(
  userId: number | undefined,
  onNotifications: (notifications: any[]) => void,
  intervalMs: number = 30000
) {
  // Use this in your component with useEffect
  // Returns cleanup function
  if (!userId) return () => {};
  
  return openSSEConnection(userId, (payload) => {
    if (payload.type === 'notifications') {
      onNotifications(payload.data);
    }
  }, intervalMs);
}
