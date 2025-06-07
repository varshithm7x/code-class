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
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';

const formSchema = z.object({
  hackerrankUsername: z.string().optional(),
  leetcodeUsername: z.string().optional(),
  gfgUsername: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ProfilePage: React.FC = () => {
  const { user, updateProfile, isLoading, error } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hackerrankUsername: user?.hackerrankUsername || '',
      leetcodeUsername: user?.leetcodeUsername || '',
      gfgUsername: user?.gfgUsername || '',
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

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and platform integrations.
        </p>
      </div>

      <div className="grid gap-6">
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
                        Used to track your LeetCode submissions
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
      </div>
    </div>
  );
};

export default ProfilePage;
