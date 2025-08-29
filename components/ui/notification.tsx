"use client";

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { notificationManager, type Notification } from '@/lib/utils/notifications';

export function NotificationContainer() {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const unsubscribe = notificationManager.subscribe(setNotifications);
        return unsubscribe;
    }, []);

    const removeNotification = (id: string) => {
        notificationManager.removeNotification(id);
    };

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`max-w-md p-4 rounded-lg shadow-lg border ${
                        notification.type === 'success'
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : notification.type === 'error'
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : notification.type === 'warning'
                            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                            : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm">{notification.title}</h4>
                            <p className="text-sm mt-1">{notification.message}</p>
                        </div>
                        <button
                            onClick={() => removeNotification(notification.id)}
                            className="ml-2 p-1 rounded hover:bg-opacity-20 hover:bg-gray-500"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}