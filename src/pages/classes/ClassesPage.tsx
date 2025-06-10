import React, { useEffect, useState } from 'react';
import { getClasses, deleteClass as apiDeleteClass } from '../../api/classes';
import { useAuth } from '../../context/AuthContext';
import { Class } from '../../types';
import ClassList from '../../components/classes/ClassList';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router-dom';
import { Plus, Users, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import { useDataRefresh, DATA_REFRESH_EVENTS } from '../../utils/dataRefresh';

const ClassesPage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isTeacher = user?.role === 'TEACHER';
  const { toast } = useToast();

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const response = await getClasses();
      setClasses(response);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // Listen for data refresh events to update classes when assignments are modified
  useDataRefresh(DATA_REFRESH_EVENTS.CLASSES_UPDATED, () => {
    fetchClasses();
  }, []);

  const handleDeleteClass = async (classId: string) => {
    if (!window.confirm('Are you sure you want to delete this class? This action is permanent and will delete all associated assignments and submissions.')) {
      return;
    }

    try {
      await apiDeleteClass(classId);
      setClasses(classes.filter((c) => c.id !== classId));
      toast({
        title: 'Class Deleted',
        description: 'The class has been successfully deleted.',
      });
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete class. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const totalStudents = classes.reduce((acc, curr) => acc + (curr.studentCount || 0), 0);
  const totalAssignments = classes.reduce((acc, curr) => acc + (curr.assignmentCount || 0), 0);

  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Classes</h1>
          <p className="text-muted-foreground mt-2">
            {isTeacher
              ? 'Manage your classes and assignments.'
              : 'View your enrolled classes and assignments.'}
          </p>
        </div>
        {isTeacher ? (
          <Button asChild>
            <Link to="/classes/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Class
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link to="/join-class">
              <Plus className="mr-2 h-4 w-4" />
              Join Class
            </Link>
          </Button>
        )}
      </div>

      {isTeacher && classes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                Across {classes.length} classes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAssignments}</div>
              <p className="text-xs text-muted-foreground">
                Across {classes.length} classes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <ClassList classes={classes} isLoading={isLoading} onDelete={handleDeleteClass} />
    </div>
  );
};

export default ClassesPage;
