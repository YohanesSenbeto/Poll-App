/**
 * Notification interface for the application's notification system
 */
export interface Notification {
  /** Unique identifier for the notification */
  id: string;
  /** Type of notification that determines its styling */
  type: 'success' | 'error' | 'warning' | 'info';
  /** Short title displayed at the top of the notification */
  title: string;
  /** Detailed message content of the notification */
  message: string;
  /** Duration in milliseconds before auto-dismissal (0 for persistent) */
  duration?: number;
}

/**
 * Manages application notifications with subscription pattern
 */
class NotificationManager {
  private listeners: Array<(notifications: Notification[]) => void> = [];
  private notifications: Notification[] = [];
  private readonly DEFAULT_DURATION = 5000;
  private readonly MAX_NOTIFICATIONS = 5;

  /**
   * Adds a new notification to the system
   * @param notification The notification to add (without ID)
   * @returns The generated notification ID
   */
  addNotification(notification: Omit<Notification, 'id'>): string {
    try {
      // Generate a more secure random ID
      const id = `notification_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const newNotification: Notification = {
        ...notification,
        id,
        // Ensure title and message are strings
        title: String(notification.title || ''),
        message: String(notification.message || ''),
        duration: notification.duration ?? this.DEFAULT_DURATION,
      };

      // Limit the number of active notifications
      if (this.notifications.length >= this.MAX_NOTIFICATIONS) {
        // Remove the oldest notification
        this.notifications.shift();
      }

      this.notifications = [...this.notifications, newNotification];
      this.notifyListeners();

      if (newNotification.duration && newNotification.duration > 0) {
        setTimeout(() => {
          this.removeNotification(id);
        }, newNotification.duration);
      }

      return id;
    } catch (error) {
      console.error('Failed to add notification:', error);
      return '';
    }
  }

  /**
   * Removes a notification by its ID
   * @param id The ID of the notification to remove
   */
  removeNotification(id: string): void {
    try {
      if (!id) return;
      this.notifications = this.notifications.filter(n => n.id !== id);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to remove notification:', error);
    }
  }

  /**
   * Subscribes a callback to notification changes
   * @param callback Function to call when notifications change
   * @returns Unsubscribe function
   */
  subscribe(callback: (notifications: Notification[]) => void): () => void {
    if (typeof callback !== 'function') {
      console.error('Invalid callback provided to notification subscribe');
      return () => {};
    }
    
    this.listeners.push(callback);
    // Notify with current notifications immediately
    try {
      callback(this.notifications); 
    } catch (error) {
      console.error('Error in notification callback:', error);
    }
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notifies all listeners of notification changes
   * @private
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.notifications);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  /**
   * Clears all notifications
   */
  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }
}

// Create a singleton instance of the notification manager
export const notificationManager = new NotificationManager();

/**
 * Helper function to show a notification
 * @param type Type of notification
 * @param title Title of the notification
 * @param message Message content of the notification
 * @param duration Duration in milliseconds (0 for persistent)
 * @returns The notification ID
 */
export function showNotification(
  type: Notification['type'],
  title: string,
  message: string,
  duration?: number
): string {
  if (!title || !message) {
    console.error('Invalid notification parameters');
    return '';
  }
  
  return notificationManager.addNotification({
    type,
    title,
    message,
    duration,
  });
}

/**
 * Shows an authentication required notification
 * @param redirectPath Path to redirect to after authentication
 * @returns The notification ID
 */
export function showAuthRequiredNotification(redirectPath: string): string {
  return showNotification(
    'warning',
    'Authentication Required',
    'Please register or login to access this feature.',
    0
  );
}

/**
 * Shows an error notification with standardized formatting
 * @param error The error object or message
 * @returns The notification ID
 */
export function showErrorNotification(error: Error | string): string {
  const title = 'Error Occurred';
  const message = typeof error === 'string' ? error : error.message || 'An unexpected error occurred';
  
  return showNotification('error', title, message, 8000);
}