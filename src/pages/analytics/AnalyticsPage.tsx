
import React, { useState, useEffect } from 'react';
import { getClassCompletionData, getPlatformData, getDifficultyData } from '../../api/analytics';
import { getMyClasses } from '../../api/classes';
import { CompletionData, PlatformData, DifficultyData, Class } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import LineChart from '../../components/ui/charts/LineChart';
import BarChart from '../../components/ui/charts/BarChart';
import PieChart from '../../components/ui/charts/PieChart';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../../components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  selectedClass: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const AnalyticsPage: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [completionData, setCompletionData] = useState<CompletionData[]>([]);
  const [platformData, setPlatformData] = useState<PlatformData[]>([]);
  const [difficultyData, setDifficultyData] = useState<DifficultyData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedClass: '',
    },
  });

  // Fetch classes on component mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesData = await getMyClasses();
        setClasses(classesData);

        if (classesData.length > 0) {
          form.setValue('selectedClass', classesData[0].id);
          fetchAnalyticsData(classesData[0].id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, [form]);

  const fetchAnalyticsData = async (classId: string) => {
    setIsLoading(true);
    try {
      const [completionData, platformData, difficultyData] = await Promise.all([
        getClassCompletionData(classId),
        getPlatformData(classId),
        getDifficultyData(classId),
      ]);

      setCompletionData(completionData);
      setPlatformData(platformData);
      setDifficultyData(difficultyData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onClassChange = (classId: string) => {
    form.setValue('selectedClass', classId);
    fetchAnalyticsData(classId);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (classes.length === 0) {
    return (
      <div className="py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Insights and visualizations for your classes.
          </p>
        </div>

        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No classes available</h3>
          <p className="text-gray-500">
            You need to have at least one class to view analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Insights and visualizations for your classes.
        </p>
      </div>

      <div className="mb-6">
        <Form {...form}>
          <FormField
            control={form.control}
            name="selectedClass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Class</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={onClassChange}
                    value={field.value}
                  >
                    <SelectTrigger className="w-full md:w-[300px]">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
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

      <div className="grid gap-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle>Completion Rate</CardTitle>
              <CardDescription>Daily completion percentage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <LineChart
                data={completionData}
                xKey="date"
                yKey="completionRate"
                xLabel="Date"
                yLabel="Completion Rate (%)"
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Platform Usage</CardTitle>
              <CardDescription>Number of submissions per platform</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart
                data={platformData}
                xKey="platform"
                yKey="count"
                xLabel="Platform"
                yLabel="Submissions"
              />
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Difficulty Distribution</CardTitle>
            <CardDescription>Completed assignments by difficulty level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <PieChart
                data={difficultyData}
                nameKey="difficulty"
                dataKey="count"
                colors={['#10b981', '#f59e0b', '#ef4444']} // green for easy, yellow for medium, red for hard
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;
