import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface TeacherRouteProps {
  children: React.ReactNode;
}

const TeacherRoute: React.FC<TeacherRouteProps> = ({ children }) => {
  const { user } = useAuth();

  if (!user || user.role !== 'TEACHER') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default TeacherRoute; 