// Export the Notification interface
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

class NotificationManager {
  private listeners: Array<(notifications: Notification[]) => void> = [];
  private notifications: Notification[] = [];

  addNotification(notification: Omit<Notification, 'id'>): string {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 5000,
    };

    this.notifications = [...this.notifications, newNotification];
    this.notifyListeners();

    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }

  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  subscribe(callback: (notifications: Notification[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.notifications); // Notify with current notifications immediately
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.notifications));
  }

  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }
}

export const notificationManager = new NotificationManager();

export function showNotification(
  type: Notification['type'],
  title: string,
  message: string,
  duration?: number
): string {
  return notificationManager.addNotification({
    type,
    title,
    message,
    duration,
  });
}

export function showAuthRequiredNotification(redirectPath: string): string {
  return showNotification(
    'warning',
    'Authentication Required',
    'Please register or login to access this feature.',
    0
  );
}