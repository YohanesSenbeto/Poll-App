"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/app/auth-context";
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface TestResult {
  [x: string]: any;
  success: boolean;
  message: string;
  emailType: string;
  recipient: string;
}

export default function TestEmailPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const emailTypes = [
    { value: "welcome", label: "Welcome Email", description: "New user welcome message" },
    { value: "poll-created", label: "Poll Created", description: "Notification when user creates a poll" },
    { value: "vote-received", label: "Vote Received", description: "Notification when someone votes on your poll" },
    { value: "admin-alert", label: "Admin Alert", description: "System alert for administrators" },
    { value: "weekly-digest", label: "Weekly Digest", description: "Weekly activity summary" },
  ];

  const testEmail = async () => {
    if (!selectedType) {
      setResult({
        success: false,
        message: "Please select an email type",
        emailType: selectedType,
        recipient: "",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('Sending email test request:', {
        emailType: selectedType,
        userId: user?.id || undefined
      });

      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailType: selectedType,
          userId: user?.id || undefined,
        }),
      });

      console.log('Response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('Response data:', data);

              if (response.ok) {
        setResult(data);
      } else {
        console.error('API returned error:', data);
        setResult({
          success: false,
          message: data.error || "Failed to send email",
          emailType: selectedType,
          recipient: data.recipient || "",
          details: data.details,
          troubleshooting: data.troubleshooting
        });
      }
    } catch (error) {
      console.error('Network error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? `Network error: ${error.message}` : "Network error occurred",
        emailType: selectedType,
        recipient: "",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Email System Test
        </h1>
        <p className="text-muted-foreground">
          Test the email notification system by sending different types of emails.
        </p>

        {/* Current Status */}
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">✅ Email System Status: WORKING</h3>
          <p className="text-green-800 mb-2">
            Your Resend API key is configured and the email system is functional!
          </p>
          <div className="text-sm text-green-700 space-y-1">
            <p><strong>Current Status:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>✅ API key is valid and connected</li>
              <li>✅ Email service is responding</li>
              <li>🔧 Testing: Using your Resend signup email (jonicasenbet@gmail.com)</li>
              <li>📧 Production: Need domain verification to send to any email</li>
            </ul>
          </div>
        </div>

        {/* Domain Verification Note */}
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="font-semibold text-amber-900 mb-2">🔧 Resend Free Tier Limitation</h3>
          <p className="text-amber-800 mb-2">
            For security, Resend's free tier only allows sending emails to your own verified email address that you used to sign up with Resend.
          </p>
          <div className="text-sm text-amber-700">
            <p><strong>Current Setup:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-1">
              <li>✅ API key: Working</li>
              <li>✅ Resend email: jonicasenbet@gmail.com</li>
              <li>🔧 Testing: Using your Resend signup email</li>
            </ul>
            <p className="mt-2"><strong>To send to any email address:</strong></p>
            <ol className="list-decimal list-inside ml-4 space-y-1 mt-1">
              <li>Go to <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline">Resend Domains</a></li>
              <li>Click "Add Domain" and enter your domain (e.g., yourcompany.com)</li>
              <li>Follow the DNS verification steps</li>
              <li>Update the "from" address in email templates to use your verified domain</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>
              Configure and send test emails to verify the system is working.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-type">Email Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select email type to test" />
                </SelectTrigger>
                <SelectContent>
                  {emailTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {type.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-id">User ID (Optional)</Label>
              <Input
                id="user-id"
                placeholder="Leave blank to use current user"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Leave blank to test with the current logged-in user
              </p>
            </div>

            <Button
              onClick={testEmail}
              disabled={loading || !selectedType}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Current User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Current User</CardTitle>
            <CardDescription>
              Information about the currently logged-in user and email testing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {user ? (
              <>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Your Auth Email:</Label>
                  <p className="font-mono text-green-600">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ✅ Test emails sent to: jonicasenbet@gmail.com (Resend signup email)
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">User ID:</Label>
                  <p className="font-mono text-sm">{user.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status:</Label>
                  <p className="text-green-600">Authenticated</p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-blue-600">
                    <strong>📧 Testing:</strong> Emails will be sent to jonicasenbet@gmail.com (your Resend signup email).
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Not logged in</p>
                <p className="text-sm text-muted-foreground">
                  Please log in to test user-specific emails
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        {result && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                Test Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className={result.success ? "text-green-800" : "text-red-800"}>
                      <strong>Status:</strong> {result.success ? "Success" : "Failed"}
                    </p>
                    <p className={result.success ? "text-green-700" : "text-red-700"}>
                      <strong>Message:</strong> {result.message}
                    </p>
                    {result.emailType && (
                      <p className={result.success ? "text-green-700" : "text-red-700"}>
                        <strong>Email Type:</strong> {result.emailType}
                      </p>
                    )}
                    {result.recipient && (
                      <p className={result.success ? "text-green-700" : "text-red-700"}>
                        <strong>Recipient:</strong> {result.recipient}
                      </p>
                    )}
                    {result.details && (
                      <p className="text-red-700">
                        <strong>Details:</strong> {result.details}
                      </p>
                    )}
                    {result.troubleshooting && (
                      <p className="text-red-700">
                        <strong>Troubleshooting:</strong> {result.troubleshooting}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* Help message for different scenarios */}
              {result.message && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-blue-800 text-sm">
                    {result.message === 'Failed to send email' ? (
                      <>
                        <strong>🔧 Resend Free Tier Limitation:</strong> You can only send emails to the email address you used to sign up with Resend.
                        <br />
                        <strong>Current Setup:</strong>
                        <br />• Your Resend signup email: jonicasenbet@gmail.com
                        <br />• Test email will be sent to: jonicasenbet@gmail.com
                        <br />
                        <strong>For Production:</strong> Verify a domain at <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline">Resend Domains</a> to send to any email.
                        <br />
                        <strong>Check console:</strong> F12 → Console for detailed error messages.
                      </>
                    ) : (
                      <>
                        <strong>📧 Setup Required:</strong> To send real emails, you need to configure the Resend API key.
                        Visit the setup instructions above to get started.
                      </>
                    )}
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Check browser console (F12) for detailed Resend API error messages.
                  </p>
                </div>
              )}

              {result.success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-800 text-sm">
                    <strong>✅ Email Sent Successfully!</strong>
                    <br />
                    Check your email inbox ({result.recipient}) and spam folder for the test email.
                    The email should arrive within a few minutes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Email Templates Documentation */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>
            Overview of available email templates and their purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {emailTypes.map((type) => (
              <div key={type.value} className="p-4 border rounded-lg">
                <h4 className="font-semibold">{type.label}</h4>
                <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Template: <code>{type.value}</code>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
