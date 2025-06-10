an # 🤖 LLM Context Document: DSA Learning Management System

*This document provides comprehensive technical context for LLM assistants to understand and work with this codebase efficiently.*

## 📁 Project Structure Overview

```
code-class/
├── src/                          # Frontend React application
│   ├── api/                      # API client functions
│   ├── components/               # Reusable UI components
│   ├── pages/                    # Route-based page components
│   ├── context/                  # React context providers
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # TypeScript type definitions
│   └── utils/                    # Frontend utility functions
├── server/                       # Backend Node.js application
│   ├── src/
│   │   ├── api/                  # API route handlers
│   │   ├── services/             # Business logic services
│   │   ├── lib/                  # Database and utility libs
│   │   ├── cron/                 # Scheduled job handlers
│   │   ├── types/                # Backend type definitions
│   │   └── utils/                # Backend utility functions
│   ├── prisma/                   # Database schema and migrations
│   └── scripts/                  # Utility scripts
└── Configuration files (.env, package.json, etc.)
```

## 🗄️ Database Schema (PostgreSQL + Prisma)

### Core Models:
```typescript
User {
  id: string (primary key)
  email: string (unique)
  name: string
  password: string (hashed)
  role: 'STUDENT' | 'TEACHER'
  hackerrankUsername?: string    # Platform usernames for submission tracking
  leetcodeUsername?: string
  gfgUsername?: string
  classes: UsersOnClasses[]      # Many-to-many with classes
  submissions: Submission[]      # User's problem submissions
  taughtClasses: Class[]         # Classes taught (if teacher)
}

Class {
  id: string (primary key)
  name: string
  joinCode: string (unique, 6-character)
  teacherId: string (foreign key)
  students: UsersOnClasses[]     # Many-to-many with users
  assignments: Assignment[]
}

Assignment {
  id: string (primary key)
  classId: string (foreign key)
  title: string
  description?: string
  assignDate: DateTime
  dueDate: DateTime
  problems: Problem[]            # One-to-many with problems
}

Problem {
  id: string (primary key)
  assignmentId: string (foreign key)
  title: string
  url: string                    # URL to coding platform problem
  platform: string              # 'leetcode', 'gfg', 'hackerrank', etc.
  difficulty?: string            # 'Easy', 'Medium', 'Hard'
  submissions: Submission[]      # One-to-many with submissions
}

Submission {
  id: string (primary key)
  userId: string (foreign key)
  problemId: string (foreign key)
  completed: boolean (default: false)
  submissionTime?: DateTime      # When marked as completed
}
```

### Key Relationships:
- Users ↔ Classes (many-to-many via UsersOnClasses)
- Assignments → Problems (one-to-many)
- Users → Submissions (one-to-many)
- Problems → Submissions (one-to-many)

## 🔌 Backend API Structure

### File Locations:
- **Main server**: `server/src/index.ts`
- **Route definitions**: `server/src/api/*/index.ts`
- **Controllers**: `server/src/api/*/[module].controller.ts`
- **Core service**: `server/src/services/submission.service.ts`

### API Endpoints by Module:

**Authentication** (`/api/v1/auth`):
```typescript
POST /login                    # User authentication
POST /signup                   # User registration
GET /me                        # Get current user (requires auth)
GET /profile                   # Get user profile (requires auth)
PATCH /profile                 # Update platform usernames (requires auth)
```

**Classes** (`/api/v1/classes`):
```typescript
POST /                         # Create class (teacher only)
GET /my                        # Get user's classes
POST /join                     # Join class with code (student)
GET /:id                       # Get class details
GET /:id/assignments           # Get class assignments
```

**Assignments** (`/api/v1/assignments`):
```typescript
POST /                         # Create assignment (teacher only)
GET /:id                       # Get assignment with submissions
PUT /:id                       # Update assignment (teacher only)
POST /check-submissions        # Check all submissions (teacher only)
POST /:id/check-submissions    # Check specific assignment (teacher only)
```

**Analytics** (`/api/v1/analytics`):
```typescript
GET /leaderboard               # Global/class leaderboard
GET /:classId/completion       # Class completion over time
GET /:classId/platforms        # Platform usage distribution
GET /:classId/difficulty       # Difficulty distribution
```

### Authentication Middleware:
- **protect**: Validates JWT token (`server/src/api/auth/auth.middleware.ts`)
- **isTeacher**: Checks teacher role
- **isStudent**: Checks student role

## 🔄 Core Business Logic

### Submission Verification Service (`server/src/services/submission.service.ts`)

**Key Functions:**
```typescript
checkAllSubmissions()                    # Check all pending submissions
checkSubmissionsForAssignment(id)       # Check specific assignment
getAllLeetCodeSolvedSlugs(username)     # Fetch LeetCode solved problems
getAllGfgSolvedSlugs(username)          # Fetch GFG solved problems
processSubmissionsInBulk(submissions)   # Bulk process submissions
```

**Algorithm Flow:**
1. Group submissions by user (minimize API calls)
2. Fetch solved problems once per user per platform
3. Compare database problems against solved problems using slug matching
4. Update submission status and timestamp if completed

**Platform Integration:**
- **LeetCode**: GraphQL API (`https://leetcode.com/graphql`)
- **GeeksforGeeks**: Custom API (`https://geeks-for-geeks-api.vercel.app/`)
- **Problem Matching**: URL slug extraction and normalization

### Automated Scheduling (`server/src/cron/index.ts`)
- **Daily cron job**: Runs at 7:30 AM to check all submissions
- **Manual triggers**: Teachers can force submission checks

### Leaderboard Algorithm (`server/src/api/analytics/analytics.controller.ts`)
```typescript
// Ranking logic:
1. Count completed submissions per student
2. Calculate average submission time (assignment date → submission date)
3. Sort by: completed count (desc), then avg time (asc)
4. Assign ranks with proper tie-breaking
```

## 🎨 Frontend Architecture

### Key Directories:
- **API clients**: `src/api/*.ts`
- **Pages**: `src/pages/[module]/[Page]Page.tsx`
- **Components**: `src/components/[module]/[Component].tsx`
- **Types**: `src/types/index.ts`

### Important Components:

**Authentication**:
- `src/context/AuthContext.tsx` - Global auth state
- `src/pages/auth/` - Login/signup pages

**Class Management**:
- `src/pages/classes/ClassesPage.tsx` - Class overview
- `src/pages/classes/JoinClassPage.tsx` - Student class joining
- `src/components/classes/` - Class-related components

**Assignment Management**:
- `src/pages/assignments/AssignmentDetailsPage.tsx` - Main assignment view
- `src/components/assignments/SubmissionStatusGrid.tsx` - Progress visualization
- Manual submission check triggers

**Leaderboard**:
- `src/pages/leaderboard/LeaderboardPage.tsx` - Main leaderboard
- `src/components/leaderboard/LeaderboardTable.tsx` - Ranking display
- Class filtering and global/local views

**User Profile**:
- `src/pages/user/ProfilePage.tsx` - Platform username management

### State Management:
- **Auth Context**: Global authentication state
- **React Hook Form**: Form validation with Zod schemas
- **Local state**: useState for component-specific data

## ⚙️ Configuration & Environment

### Environment Variables:
```bash
# Frontend (.env.local)
VITE_API_URL=http://localhost:4000/api/v1    # Local dev
VITE_API_URL=https://your-backend.com/api/v1  # Production

# Backend (server/.env)
DATABASE_URL="postgresql://..."              # Postgres connection
JWT_SECRET="your-jwt-secret"                 # Auth token secret
PORT=4000                                    # Server port
```

### Key Dependencies:
**Backend**:
- `@prisma/client` - Database ORM
- `express` - Web server
- `jsonwebtoken` - Authentication
- `bcryptjs` - Password hashing
- `node-cron` - Scheduled jobs
- `axios` - External API calls

**Frontend**:
- `react` + `typescript` - UI framework
- `react-router-dom` - Routing
- `axios` - API client
- `react-hook-form` + `zod` - Form handling
- `tailwindcss` - Styling

## 🔍 Common Patterns & Conventions

### Backend Patterns:
```typescript
// Controller pattern
export const controllerName = async (req: Request, res: Response): Promise<void> => {
  try {
    // Business logic
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error message', error });
  }
};

// Service pattern
export const serviceName = async (params: Type): Promise<ReturnType> => {
  // Business logic implementation
};
```

### Frontend Patterns:
```typescript
// Page component pattern
const PageName: React.FC = () => {
  const [data, setData] = useState<Type | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  return (
    <div className="py-6">
      <h1 className="text-3xl font-bold">Page Title</h1>
      {/* Content */}
    </div>
  );
};

// API client pattern
export const apiFunction = async (params: Type): Promise<ReturnType> => {
  const response = await api.get/post/put/delete(endpoint, data);
  return response.data;
};
```

### Database Query Patterns:
```typescript
// Include related data
const result = await prisma.model.findMany({
  include: {
    relatedModel: true,
    anotherRelation: {
      select: { field1: true, field2: true }
    }
  }
});

// Complex filtering
const filtered = await prisma.model.findMany({
  where: {
    field: condition,
    relatedModel: {
      some: { field: value }
    }
  }
});
```

## 🚨 Important Implementation Details

### Problem URL Parsing:
```typescript
// LeetCode: "/problems/two-sum/" → "two-sum"
// GFG: "/problems/problem-name/1" → "problem-name"
```

### Submission Status Flow:
```
Assignment Created → Auto-create Submissions (completed: false)
↓
External API Check → Update if solved (completed: true, submissionTime: now)
↓
Leaderboard Calculation → Real-time ranking updates
```

### Authentication Flow:
```
Login → JWT Token → localStorage → API Headers → Protected Routes
```

### File Upload/Problem Addition:
- Teachers add problems via URL input
- System auto-detects platform from URL
- Auto-creates submission records for all class students

## 🔧 Development Workflow

### Starting the Application:
```bash
# Backend
cd server && npm run dev    # Runs on port 4000

# Frontend  
npm run dev                 # Runs on port 5173 (Vite default)
```

### Database Operations:
```bash
cd server
npx prisma generate        # Generate Prisma client
npx prisma db push         # Push schema changes
npx prisma studio          # Database GUI
```

### Key Scripts:
- `server/scripts/test-submission-checkers.ts` - Test external API integration
- Manual submission checks via API endpoints or frontend buttons

## 📝 When Implementing New Features

### Adding New API Endpoints:
1. Create controller in `server/src/api/[module]/[module].controller.ts`
2. Add route in `server/src/api/[module]/index.ts`
3. Import route in `server/src/index.ts`
4. Add frontend API client in `src/api/[module].ts`

### Adding New Pages:
1. Create page component in `src/pages/[module]/[Page]Page.tsx`
2. Add route in main router configuration
3. Add navigation links if needed

### Database Changes:
1. Update `server/prisma/schema.prisma`
2. Run `npx prisma db push` for development
3. Generate migration for production: `npx prisma migrate dev`

### External Platform Integration:
1. Add API functions in `server/src/services/submission.service.ts`
2. Update problem identifier extraction logic
3. Add platform-specific URL patterns
4. Test with `server/scripts/test-submission-checkers.ts`

## 🎯 Project Goals & Vision

### Primary Objectives:
- **Automated Progress Tracking**: Eliminate manual submission verification
- **Multi-Platform Support**: LeetCode, GeeksforGeeks, HackerRank integration
- **Real-Time Analytics**: Live leaderboards and progress monitoring
- **Scalable Architecture**: Support multiple classes and thousands of students

### Key Success Metrics:
- **Accuracy**: >95% submission verification accuracy
- **Performance**: <2s API response times
- **User Experience**: Intuitive interface for both teachers and students
- **Reliability**: 99.9% uptime with automated recovery

This context document should provide sufficient information for any LLM to understand the codebase structure and implement new features efficiently. 