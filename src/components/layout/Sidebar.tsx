import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart, 
  Home, 
  Award, 
  BookOpen, 
  UserPlus, 
  Plus 
} from 'lucide-react';

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles?: Array<'teacher' | 'student'>;
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems: NavItem[] = [
    {
      title: 'My Classes',
      href: '/classes',
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      title: 'Join Class',
      href: '/join-class',
      icon: <UserPlus className="h-5 w-5" />,
      roles: ['student'],
    },
    {
      title: 'Leaderboard',
      href: '/leaderboard',
      icon: <Award className="h-5 w-5" />,
    }
  ];

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role.toLowerCase() as 'student' | 'teacher' || 'student')
  );

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 hidden md:block overflow-y-auto bg-white">
      <nav className="flex flex-col gap-1 p-4">
        {filteredNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                ? 'bg-brand-blue text-white'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            {item.icon}
            {item.title}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
