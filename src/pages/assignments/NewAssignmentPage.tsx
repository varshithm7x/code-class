import React, { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createAssignment } from '../../api/assignments';
import { getClasses } from '../../api/classes';
import { Class } from '../../types';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const problemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().url('Must be a valid URL'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
});

const assignmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  classId: z.string().min(1, 'You must select a class'),
  assignDate: z.string(),
  dueDate: z.string(),
  problems: z.array(problemSchema).min(1, 'At least one problem is required'),
});

type FormValues = z.infer<typeof assignmentSchema>;

const NewAssignmentPage = () => {
  const { classId: classIdFromParams } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      classId: classIdFromParams || '',
      assignDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      problems: [{ title: '', url: '', difficulty: 'Easy' }],
    },
  });

  useEffect(() => {
    // If we don't have a class from the URL, fetch all classes for the dropdown
    if (!classIdFromParams) {
      const fetchClasses = async () => {
        try {
          const classes = await getClasses(); // Fetches classes for the logged-in user
          setTeacherClasses(classes);
        } catch (error) {
          console.error('Failed to fetch classes', error);
          toast.error('Could not load your classes.');
        }
      };
      fetchClasses();
    }
  }, [classIdFromParams]);
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'problems',
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await createAssignment({
        ...data,
        description: data.description || '',
        assignDate: new Date(data.assignDate),
        dueDate: new Date(data.dueDate),
      });
      toast.success('Assignment created successfully!');
      navigate(`/classes/${data.classId}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to create assignment.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Assignment Details */}
              <div className="space-y-4">
                {/* Only show class selector if not navigated from a specific class */}
                {!classIdFromParams && (
                  <FormField
                    control={form.control}
                    name="classId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a class for the assignment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teacherClasses.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignment Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Two Pointers Practice" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Instructions or notes for the assignment"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assignDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Problems Section */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Problems</h3>
                <div className="space-y-6">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 border rounded-md relative space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name={`problems.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Problem Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Two Sum" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`problems.${index}.url`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Problem URL</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://leetcode.com/problems/two-sum/"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`problems.${index}.difficulty`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Difficulty</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Easy">Easy</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Hard">Hard</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                        className="absolute top-2 right-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() =>
                    append({ title: '', url: '', difficulty: 'Easy' })
                  }
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Problem
                </Button>
              </div>

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Create Assignment'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewAssignmentPage;
