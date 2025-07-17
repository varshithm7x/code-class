import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Code2, 
  Users, 
  BookOpen, 
  TrendingUp,
  ChevronRight,
  CheckCircle,
  BarChart3,
  Link2,
  Target,
  Clock,
  Award,
  GraduationCap,
  FileText,
  LogOut,
  Settings,
  User,
  LayoutDashboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

const HomePage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [completionProgress, setCompletionProgress] = useState(0);

  // Progress animation
  useEffect(() => {
    const timer = setTimeout(() => setCompletionProgress(75), 500);
    return () => clearTimeout(timer);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const platforms = [
    {
      name: "LeetCode",
      logo: "🟢",
      description: "World's most popular coding interview platform",
      problems: "2000+"
    },
    {
      name: "HackerRank",
      logo: "🟩", 
      description: "Programming challenges and skill assessments",
      problems: "1500+"
    },
    {
      name: "GeeksforGeeks",
      logo: "📗",
      description: "Comprehensive programming tutorials and practice",
      problems: "3000+"
    }
  ];

  const features = [
    {
      icon: <GraduationCap className="h-6 w-6" />,
      title: "Classroom Management",
      description: "Create classes, share join codes, and manage student enrollment seamlessly"
    },
    {
      icon: <Link2 className="h-6 w-6" />,
      title: "Platform Integration",
      description: "Automatically track submissions from LeetCode, HackerRank, and GeeksforGeeks"
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Progress Analytics",
      description: "Detailed insights into student performance and assignment completion"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Assignment Tracking",
      description: "Assign DSA problems and monitor completion in real-time"
    }
  ];

  const teacherFeatures = [
    "Create and manage multiple classes",
    "Assign problems from top coding platforms", 
    "Track student progress automatically",
    "Generate detailed analytics reports",
    "Monitor assignment completion rates",
    "Create coding tests and assessments"
  ];

  const studentFeatures = [
    "Join classes with simple codes",
    "Auto-sync your platform profiles",
    "Track your solving progress",
    "Compete on class leaderboards",
    "View detailed performance analytics",
    "Practice with curated problem sets"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-brand-blue flex items-center justify-center">
                  <span className="text-white text-sm font-bold">CC</span>
                </div>
                <span className="text-2xl font-bold text-foreground">Code Class</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-foreground/80 hover:text-foreground transition-colors">Features</a>
              <a href="#platforms" className="text-foreground/80 hover:text-foreground transition-colors">Platforms</a>
              <a href="#how-it-works" className="text-foreground/80 hover:text-foreground transition-colors">How it Works</a>
            </nav>
                                      <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Button onClick={() => navigate('/classes')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" alt={user?.name || 'User'} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {user?.name ? getInitials(user.name) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden md:inline-flex">{user?.name || 'User'}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/profile')}>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Log Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => navigate('/login')}>
                    Sign In
                  </Button>
                  <Button onClick={() => navigate('/signup')}>
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 hero-gradient">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <Badge variant="secondary" className="w-fit">
                  For Teachers & Students
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  Streamline Your{' '}
                  <span className="text-primary">DSA Learning</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                  Manage coding assignments, track student progress across LeetCode, HackerRank & GeeksforGeeks automatically.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 h-auto"
                  onClick={() => navigate('/signup')}
                >
                  Start Teaching <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-6 h-auto"
                  onClick={() => navigate('/signup')}
                >
                  Join as Student
                </Button>
              </div>
            </div>
          </div>

          {/* Analytics Dashboard Mockup */}
          <div className="relative">
            <Card className="bg-card border border-border shadow-2xl code-editor">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="text-sm text-muted-foreground ml-4">Class Analytics Dashboard</div>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Assignment Progress</span>
                  <span className="text-sm text-muted-foreground">{completionProgress}%</span>
                </div>
                <Progress value={completionProgress} className="h-2" />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">23</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">8</div>
                    <div className="text-xs text-muted-foreground">In Progress</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">3</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold">Everything You Need for DSA Education</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Powerful tools to manage coding assignments, track progress, and enhance learning outcomes
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-border/50">
              <CardContent className="p-6 text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Supported Platforms */}
      <section id="platforms" className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold">Integrated with Top Coding Platforms</h2>
          <p className="text-muted-foreground text-lg">
            Automatically track submissions across the most popular programming platforms
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {platforms.map((platform, index) => (
            <Card key={index} className="text-center p-6 hover:shadow-lg transition-all duration-300">
              <CardContent className="space-y-4">
                <div className="text-4xl">{platform.logo}</div>
                <h3 className="font-semibold text-xl">{platform.name}</h3>
                <p className="text-muted-foreground text-sm">{platform.description}</p>
                <Badge variant="outline">{platform.problems} Problems</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold">How Code Class Works</h2>
          <p className="text-muted-foreground text-lg">
            Simple workflow for teachers and students
          </p>
        </div>

        <Tabs defaultValue="teachers" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 h-14">
            <TabsTrigger value="teachers" className="text-lg flex items-center justify-center h-full">For Teachers</TabsTrigger>
            <TabsTrigger value="students" className="text-lg flex items-center justify-center h-full">For Students</TabsTrigger>
          </TabsList>
          
          <TabsContent value="teachers" className="mt-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold">Manage Your Coding Classes</h3>
                <ul className="space-y-3">
                  {teacherFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" onClick={() => navigate('/signup')}>
                  Start Teaching <GraduationCap className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">Data Structures 101</span>
                    <Badge>24 Students</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Recent Assignment</div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Binary Tree Problems</span>
                        <span className="text-sm text-muted-foreground">Due: Tomorrow</span>
                      </div>
                      <Progress value={67} className="h-2" />
                      <div className="text-xs text-muted-foreground mt-1">16/24 students completed</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="students" className="mt-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold">Track Your Progress</h3>
                <ul className="space-y-3">
                  {studentFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" onClick={() => navigate('/signup')}>
                  Join as Student <Users className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">156</div>
                    <div className="text-sm text-muted-foreground">Problems Solved</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-green-600">89</div>
                      <div className="text-xs text-muted-foreground">Easy</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-yellow-600">52</div>
                      <div className="text-xs text-muted-foreground">Medium</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-red-600">15</div>
                      <div className="text-xs text-muted-foreground">Hard</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current Streak</span>
                      <span className="font-medium">12 days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Class Rank</span>
                      <span className="font-medium">#3 of 24</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-12 text-center space-y-6">
            <h2 className="text-3xl font-bold">Ready to Transform Your DSA Teaching?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Join thousands of educators and students who are using Code Class to streamline 
              their Data Structures & Algorithms learning experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 h-auto"
                onClick={() => navigate('/signup')}
              >
                Get Started Free
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6 h-auto"
                onClick={() => navigate('/classes')}
              >
                View Demo
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Free forever • No credit card required • 5-minute setup
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded-full bg-brand-blue flex items-center justify-center">
                  <span className="text-white text-xs font-bold">CC</span>
                </div>
                <span className="text-xl font-bold">Code Class</span>
              </div>
              <p className="text-muted-foreground">
                Streamlining DSA education through automated tracking and comprehensive analytics.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Platform</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>For Teachers</div>
                <div>For Students</div>
                <div>Analytics</div>
                <div>Integrations</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Support</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Documentation</div>
                <div>Help Center</div>
                <div>Contact Us</div>
                <div>Status</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Company</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>About</div>
                <div>Blog</div>
                <div>Careers</div>
                <div>Privacy</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2025 Code Class. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

