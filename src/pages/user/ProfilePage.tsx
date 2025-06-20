import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { AlertCircle, CheckCircle, Link, Unlink, Clock, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from '../../components/ui/textarea';
import { linkLeetCodeCredentials } from '../../api/auth';
import LeetCodeStats from '../../components/ui/LeetCodeStats';
import Judge0KeySection from '../../components/profile/Judge0KeySection';
import GeminiKeySection from '../../components/profile/GeminiKeySection';
import HackerRankKeySection from '../../components/profile/HackerRankKeySection';

const formSchema = z.object({
  hackerrankUsername: z.string().optional(),
  leetcodeUsername: z.string().optional(),
  gfgUsername: z.string().optional(),
});

const leetCodeFormSchema = z.object({
  leetcodeCookie: z.string().min(10, 'Cookie must be at least 10 characters long'),
});

type FormValues = z.infer<typeof formSchema>;
type LeetCodeFormValues = z.infer<typeof leetCodeFormSchema>;

const ProfilePage: React.FC = () => {
  const { user, updateProfile, isLoading, error, refreshUser } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [leetCodeError, setLeetCodeError] = useState<string | null>(null);
  const [leetCodeSuccess, setLeetCodeSuccess] = useState<string | null>(null);
  const [isLinkingLeetCode, setIsLinkingLeetCode] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hackerrankUsername: user?.hackerrankUsername || '',
      leetcodeUsername: user?.leetcodeUsername || '',
      gfgUsername: user?.gfgUsername || '',
    },
  });

  const leetCodeForm = useForm<LeetCodeFormValues>({
    resolver: zodResolver(leetCodeFormSchema),
    defaultValues: {
      leetcodeCookie: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateProfile(values);
      setSuccessMessage('Profile updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const onLeetCodeSubmit = async (values: LeetCodeFormValues) => {
    setIsLinkingLeetCode(true);
    setLeetCodeError(null);
    setLeetCodeSuccess(null);

    try {
      await linkLeetCodeCredentials(values.leetcodeCookie);
      setLeetCodeSuccess('LeetCode account linked successfully! Your submissions will now be tracked automatically.');
      leetCodeForm.reset();
      // Refresh user data to show updated status
      await refreshUser();
    } catch (err: any) {
      setLeetCodeError(err.response?.data?.message || 'Failed to link LeetCode account');
    } finally {
      setIsLinkingLeetCode(false);
    }
  };

  const getLeetCodeStatusColor = (status: string) => {
    switch (status) {
      case 'LINKED': return 'text-green-600';
      case 'EXPIRED': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getLeetCodeStatusIcon = (status: string) => {
    switch (status) {
      case 'LINKED': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'EXPIRED': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <Unlink className="h-4 w-4 text-gray-600" />;
    }
  };

  const getLeetCodeStatusText = (status: string) => {
    switch (status) {
      case 'LINKED': return 'Linked';
      case 'EXPIRED': return 'Session Expired';
      default: return 'Not Linked';
    }
  };

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and platform integrations.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your basic account details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-medium text-sm">Name</h3>
                <p>{user?.name}</p>
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-sm">Email</h3>
                <p>{user?.email}</p>
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-sm">Role</h3>
                <p className="capitalize">{user?.role}</p>
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-sm">Member Since</h3>
                <p>{new Date(user?.createdAt || '').toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* LeetCode Stats - Students only */}
          {user && user.role === 'STUDENT' && <LeetCodeStats user={user} showDetails={true} />}
        </div>

        {/* Enhanced LeetCode Integration Card - Students only */}
        {user?.role === 'STUDENT' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                LeetCode Session Cookie
              </CardTitle>
              <CardDescription>
                Link your LeetCode account with session cookie for automatic submission tracking. Your statistics are displayed in the card above.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Current Status */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">Connection Status</h3>
                  <div className="flex items-center gap-2">
                    {getLeetCodeStatusIcon((user as any)?.leetcodeCookieStatus || 'NOT_LINKED')}
                    <span className={`text-sm font-medium ${getLeetCodeStatusColor((user as any)?.leetcodeCookieStatus || 'NOT_LINKED')}`}>
                      {getLeetCodeStatusText((user as any)?.leetcodeCookieStatus || 'NOT_LINKED')}
                    </span>
                  </div>
                </div>
                
              </div>

              {/* Success/Error Messages */}
              {leetCodeSuccess && (
                <Alert className="mb-6 bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700">{leetCodeSuccess}</AlertDescription>
                </Alert>
              )}

              {leetCodeError && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{leetCodeError}</AlertDescription>
                </Alert>
              )}

              {/* Cookie Form */}
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">How to get your LeetCode session cookie:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Open your web browser and log in to your LeetCode account</li>
                    <li>Open Developer Tools (F12 or Ctrl+Shift+I)</li>
                    <li>Go to the "Application" (Chrome) or "Storage" (Firefox) tab</li>
                    <li>Find "Cookies" → "https://leetcode.com"</li>
                    <li>Copy the entire value of the "LEETCODE_SESSION" cookie</li>
                  </ol>
                </div>

                <Form {...leetCodeForm}>
                  <form onSubmit={leetCodeForm.handleSubmit(onLeetCodeSubmit)} className="space-y-4">
                    <FormField
                      control={leetCodeForm.control}
                      name="leetcodeCookie"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LeetCode Session Cookie</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Paste your LEETCODE_SESSION cookie value here..."
                              rows={3}
                              className="font-mono text-sm"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            This cookie will be stored securely and used to fetch your submission data.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={isLinkingLeetCode} className="w-full">
                      {isLinkingLeetCode ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Linking Account...
                        </>
                      ) : (
                        <>
                          <Link className="h-4 w-4 mr-2" />
                          Link LeetCode Account
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </CardContent>
          </Card>
        )}

        {/* HackerRank Account Integration */}
        <HackerRankKeySection />

        {/* Judge0 API Key Section */}
        <Judge0KeySection onKeyUpdate={refreshUser} />

        {/* Gemini API Key Section - Teachers only */}
        {user?.role === 'TEACHER' && (
          <GeminiKeySection onKeyUpdate={refreshUser} />
        )}

        {/* Platform Usernames - Students only */}
        {user?.role === 'STUDENT' && (
          <Card>
            <CardHeader>
              <CardTitle>Platform Usernames</CardTitle>
              <CardDescription>
                Link your coding platform profiles to enable automatic submission tracking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {successMessage && (
                <Alert className="mb-6 bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="hackerrankUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HackerRank Username</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. johndoe123" {...field} />
                        </FormControl>
                        <FormDescription>
                          Used to track your HackerRank submissions
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="leetcodeUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LeetCode Username</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. johndoe123" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your public LeetCode username (for fallback tracking)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gfgUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GeeksForGeeks Username</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. johndoe123" {...field} />
                        </FormControl>
                        <FormDescription>
                          Used to track your GeeksForGeeks submissions
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
