"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/app/auth-context";
import { supabase } from "@/lib/supabase";
import { Bell, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { notificationService, NotificationPreferences } from "@/lib/email";

interface NotificationPreferencesProps {
  className?: string;
}

export function NotificationPreferencesComponent({ className }: NotificationPreferencesProps) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pollCreated: true,
    pollVoteReceived: true,
    adminAlerts: false,
    weeklyDigest: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load user preferences from database
  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    const defaultPrefs: NotificationPreferences = {
      pollCreated: true,
      pollVoteReceived: true,
      adminAlerts: false,
      weeklyDigest: true,
    };

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .maybeSingle();

      // Non-fatal: Some environments return empty error objects – continue bootstrapping
      if (error && ((error as any).code || (error as any).message)) {
        console.warn('Error loading preferences (non-fatal):', error);
      }

      if (!data || !data.notification_preferences) {
        // Bootstrap defaults if missing
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert({ id: user.id, notification_preferences: defaultPrefs }, { onConflict: 'id' });

        if (upsertError && ((upsertError as any).code || (upsertError as any).message)) {
          console.warn('Error creating default preferences (non-fatal):', upsertError);
        }

        setPreferences(defaultPrefs);
        return;
      }

      setPreferences(data.notification_preferences as NotificationPreferences);
    } catch (error) {
      console.warn('Error loading preferences (caught, non-fatal):', error);
      // Fallback to defaults to keep UI responsive
      setPreferences({ pollCreated: true, pollVoteReceived: true, adminAlerts: false, weeklyDigest: true });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ id: user.id, notification_preferences: preferences }, { onConflict: 'id' });

      if (error && ((error as any).code || (error as any).message)) {
        console.error('Error saving preferences:', error);
        setMessage({ type: 'error', text: 'Failed to save preferences. Please try again.' });
        return;
      }

      setMessage({ type: 'success', text: 'Preferences saved successfully!' });

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Please log in to manage your notification preferences.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Email Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose which email notifications you want to receive from Poll App.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Email Service Status */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Email Service Status
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Email notifications require Resend API key configuration.
              </p>
            </div>

            {/* Poll Creation Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="poll-created" className="text-base font-medium">
                  Poll Creation
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you create a new poll
                </p>
              </div>
              <Switch
                id="poll-created"
                checked={preferences.pollCreated}
                onCheckedChange={(checked: boolean) => updatePreference('pollCreated', checked)}
              />
            </div>

            {/* Vote Received Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="vote-received" className="text-base font-medium">
                  Votes on Your Polls
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone votes on your polls
                </p>
              </div>
              <Switch
                id="vote-received"
                checked={preferences.pollVoteReceived}
                onCheckedChange={(checked: boolean) => updatePreference('pollVoteReceived', checked)}
              />
            </div>

            {/* Admin Alerts */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="admin-alerts" className="text-base font-medium">
                  Admin Alerts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive system alerts and security notifications (admins only)
                </p>
              </div>
              <Switch
                id="admin-alerts"
                checked={preferences.adminAlerts}
                onCheckedChange={(checked: boolean) => updatePreference('adminAlerts', checked)}
                disabled
              />
            </div>

            {/* Weekly Digest */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-digest" className="text-base font-medium">
                  Weekly Digest
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get a weekly summary of your activity and popular polls
                </p>
              </div>
              <Switch
                id="weekly-digest"
                checked={preferences.weeklyDigest}
                onCheckedChange={(checked: boolean) => updatePreference('weeklyDigest', checked)}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                onClick={savePreferences}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>

              <Button
                variant="outline"
                onClick={loadPreferences}
                disabled={loading}
              >
                Reset
              </Button>
            </div>

            {/* Status Messages */}
            {message && (
              <div className={`flex items-center gap-2 p-3 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {message.text}
              </div>
            )}

            {/* Additional Information */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>
                  Notifications will be sent to: <strong>{user.email}</strong>
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                You can update your email address in the account settings above.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
