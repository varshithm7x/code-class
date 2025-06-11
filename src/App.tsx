import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// Layouts
import AppLayout from "./components/layout/AppLayout";
import AuthLayout from "./components/layout/AuthLayout";
import TeacherRoute from "./components/layout/TeacherRoute";

// Auth Pages
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";

// App Pages
import DashboardPage from "./pages/dashboard/DashboardPage";
import ProfilePage from "./pages/user/ProfilePage";
import ClassesPage from "./pages/classes/ClassesPage";
import CreateClassPage from "./pages/classes/CreateClassPage";
import JoinClassPage from "./pages/classes/JoinClassPage";
import ClassDetailsPage from "./pages/classes/ClassDetailsPage";
import NewAssignmentPage from "./pages/assignments/NewAssignmentPage";
import AssignmentDetailsPage from "./pages/assignments/AssignmentDetailsPage";
import AnalyticsPage from "./pages/analytics/AnalyticsPage";
import LeaderboardPage from "./pages/leaderboard/LeaderboardPage";
import NotFoundPage from "./pages/NotFound";
import ClassSettingsPage from './pages/classes/ClassSettingsPage';
import EditAssignmentPage from './pages/assignments/EditAssignmentPage';
import PracticeQuestionsPage from './pages/practice/PracticeQuestionsPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
              </Route>

              <Route element={<AppLayout />}>
                <Route path="/classes" element={<ClassesPage />} />
                <Route path="/classes/create" element={<TeacherRoute><CreateClassPage /></TeacherRoute>} />
                <Route path="/classes/:classId" element={<ClassDetailsPage />} />
                <Route path="/classes/:classId/settings" element={<TeacherRoute><ClassSettingsPage /></TeacherRoute>} />
                <Route
                  path="/classes/:classId/assignments/new"
                  element={
                    <TeacherRoute>
                      <NewAssignmentPage />
                    </TeacherRoute>
                  }
                />
                <Route path="/assignments/:assignmentId" element={<AssignmentDetailsPage />} />
                <Route
                  path="/assignments/:assignmentId/edit"
                  element={
                    <TeacherRoute>
                      <EditAssignmentPage />
                    </TeacherRoute>
                  }
                />
                <Route path="/join-class" element={<JoinClassPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/practice" element={<PracticeQuestionsPage />} />
                <Route path="/" element={<Navigate to="/classes" replace />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
