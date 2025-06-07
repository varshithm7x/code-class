
import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../../api/analytics';
import { getMyClasses } from '../../api/classes';
import { LeaderboardEntry, Class } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../../components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import LeaderboardTable from '../../components/leaderboard/LeaderboardTable';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { Trophy } from 'lucide-react';

const formSchema = z.object({
  selectedClass: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const LeaderboardPage: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedClass: 'all',
    },
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [classesData, leaderboardData] = await Promise.all([
          getMyClasses(),
          getLeaderboard(), // Fetch global leaderboard initially
        ]);

        setClasses(classesData);
        setLeaderboard(leaderboardData);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const onClassChange = async (classId: string) => {
    if (!classId || classId === 'all') {
      // Global leaderboard
      setIsLoading(true);
      try {
        const leaderboardData = await getLeaderboard();
        setLeaderboard(leaderboardData);
      } catch (error) {
        console.error('Error fetching global leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Class-specific leaderboard
      setIsLoading(true);
      try {
        const leaderboardData = await getLeaderboard(classId);
        setLeaderboard(leaderboardData);
      } catch (error) {
        console.error('Error fetching class leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground mt-2">
          Top performers ranked by completed assignments and submission speed.
        </p>
      </div>

      <div className="mb-6">
        <Form {...form}>
          <FormField
            control={form.control}
            name="selectedClass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Filter by Class</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={onClassChange}
                    value={field.value}
                    defaultValue="all"
                  >
                    <SelectTrigger className="w-full md:w-[300px]">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />
        </Form>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <CardTitle>Top Students</CardTitle>
          </div>
          <CardDescription>
            Students ranked by completed assignments and submission speed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeaderboardTable entries={leaderboard} />
        </CardContent>
      </Card>

      <div className="mt-6 text-sm text-muted-foreground">
        <p>
          <strong>Note:</strong> Rankings are calculated based on the total number of completed
          assignments and the average submission speed (time between assignment and submission).
        </p>
      </div>
    </div>
  );
};

export default LeaderboardPage;
