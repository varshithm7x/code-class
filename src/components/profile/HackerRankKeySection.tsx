import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, CheckCircle, Link, Unlink, Clock } from 'lucide-react';
import { linkHackerRankCredentials } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

const hackerRankFormSchema = z.object({
  hackerrankCookie: z.string().min(10, 'Cookie must be at least 10 characters long'),
});

type HackerRankFormValues = z.infer<typeof hackerRankFormSchema>;

const HackerRankKeySection: React.FC = () => {
  const { user } = useAuth();
  const [isLinking, setIsLinking] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const form = useForm<HackerRankFormValues>({
    resolver: zodResolver(hackerRankFormSchema),
    defaultValues: {
      hackerrankCookie: '',
    },
  });

  const onSubmit = async (values: HackerRankFormValues) => {
    setIsLinking(true);
    setError('');
    setSuccess('');

    try {
      const result = await linkHackerRankCredentials(values.hackerrankCookie);
      setSuccess(result.message);
      
      // The user state will be updated automatically on page refresh or re-fetch
      
      // Clear the form
      form.reset();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to link HackerRank account. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  const getCookieStatusColor = (status?: string) => {
    switch (status) {
      case 'LINKED':
        return 'text-green-600 dark:text-green-400';
      case 'EXPIRED':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getCookieStatusIcon = (status?: string) => {
    switch (status) {
      case 'LINKED':
        return <Link className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'EXPIRED':
        return <Unlink className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-orange-600">🔶</span>
          HackerRank Account Integration
        </CardTitle>
        <CardDescription>
          Link your HackerRank account to automatically track submission progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            {getCookieStatusIcon(user?.hackerrankCookieStatus)}
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">HackerRank Account</div>
              <div className={`text-sm ${getCookieStatusColor(user?.hackerrankCookieStatus)}`}>
                {user?.hackerrankCookieStatus === 'LINKED' && 'Connected and tracking submissions'}
                {user?.hackerrankCookieStatus === 'EXPIRED' && 'Session expired - please update your cookie'}
                {(!user?.hackerrankCookieStatus || user?.hackerrankCookieStatus === 'NOT_LINKED') && 'Not connected'}
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
            <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Cookie Form */}
        <div className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">How to get your HackerRank session cookie:</h4>
            <ol className="text-sm text-orange-800 dark:text-orange-300 space-y-1 list-decimal list-inside">
              <li>Open your web browser and log in to your HackerRank account</li>
              <li>Open Developer Tools (F12 or Ctrl+Shift+I)</li>
              <li>Go to the "Application" (Chrome) or "Storage" (Firefox) tab</li>
              <li>Find "Cookies" → "https://www.hackerrank.com"</li>
              <li>Copy the entire value of the "_hrank_session" cookie</li>
            </ol>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="hackerrankCookie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HackerRank Session Cookie</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste your _hrank_session cookie value here..."
                        className="min-h-[100px] font-mono text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLinking} className="w-full">
                {isLinking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Linking Account...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    Link HackerRank Account
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Additional Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">🔒 Privacy & Security</h4>
          <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <p>• Your session cookie is stored securely and encrypted</p>
            <p>• We only read submission data, never modify your account</p>
            <p>• You can disconnect anytime by updating your HackerRank password</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HackerRankKeySection; 