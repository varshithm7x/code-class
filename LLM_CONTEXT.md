# 🤖 LLM Context Document: DSA Learning Management System

*This document provides comprehensive technical context for LLM assistants to understand and work with this codebase efficiently.*

## 📁 Project Structure Overview

```
code-class/
├── src/                          # Frontend React application
│   ├── api/                      # API client functions
│   ├── components/               # Reusable UI components
│   │   ├── assignments/          # Assignment-related components
│   │   ├── classes/              # Class management components
│   │   ├── leaderboard/          # Leaderboard components
│   │   └── ui/                   # Reusable UI components
│   ├── pages/                    # Route-based page components
│   ├── context/                  # React context providers
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # TypeScript type definitions
│   └── utils/                    # Frontend utility functions
├── server/                       # Backend Node.js application
│   ├── src/
│   │   ├── api/                  # API route handlers
│   │   │   ├── analytics/        # Analytics and leaderboard endpoints
│   │   │   ├── assignments/      # Assignment management
│   │   │   ├── auth/             # Authentication and user management
│   │   │   └── classes/          # Class management
│   │   ├── services/             # Business logic services
│   │   │   ├── submission.service.ts           # Core submission tracking
│   │   │   └── enhanced-leetcode.service.ts   # LeetCode integration
│   │   ├── lib/                  # Database and utility libs
│   │   ├── cron/                 # Scheduled job handlers
│   │   └── scripts/              # Database and API scripts
│   ├── prisma/                   # Database schema and migrations
│   └── scripts/                  # Utility scripts (minimal)
└── Configuration files (.env, package.json, etc.)
```

## 🗄️ Database Schema (PostgreSQL + Prisma)

### Enhanced User Model with LeetCode Integration:
```typescript
User {
  id: string (primary key)
  email: string (unique)
  name: string
  password: string (hashed)
  role: 'STUDENT' | 'TEACHER'
  
  // Platform Usernames
  hackerrankUsername?: string
  leetcodeUsername?: string
  gfgUsername?: string
  
  // Enhanced LeetCode Integration Fields
  leetcodeCookie?: string        # Encrypted session cookie for authenticated API calls
  leetcodeCookieStatus: string   # 'LINKED', 'EXPIRED', 'NOT_LINKED'
  leetcodeTotalSolved?: number   # Cached total problems solved
  leetcodeEasySolved?: number    # Cached easy problems solved
  leetcodeMediumSolved?: number  # Cached medium problems solved
  leetcodeHardSolved?: number    # Cached hard problems solved
  
  // Relationships
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
  createdAt: DateTime
  updatedAt: DateTime
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

## 🔌 Backend API Structure

### API Endpoints by Module:

**Authentication** (`/api/v1/auth`):
```typescript
POST /login                           # User authentication
POST /signup                          # User registration
GET /me                               # Get current user (requires auth)
GET /profile                          # Get user profile (requires auth)
PATCH /profile                        # Update platform usernames (requires auth)
POST /leetcode-credentials            # Link LeetCode account with cookies (requires auth)
```

**Classes** (`/api/v1/classes`):
```typescript
POST /                                # Create class (teacher only)
GET /                                 # Get user's classes (role-based)
POST /join                            # Join class with code (student)
GET /:id                              # Get class details
GET /:id/assignments                  # Get class assignments
DELETE /:id                           # Delete class (teacher only)
```

**Assignments** (`/api/v1/assignments`):
```typescript
POST /                                # Create assignment (teacher only)
GET /:id                              # Get assignment with submissions
PUT /:id                              # Update assignment (teacher only)
DELETE /:id                           # Delete assignment (teacher only)
POST /check-submissions               # Check all submissions (teacher only)
POST /:id/check-submissions           # Check specific assignment (teacher only)
POST /:id/check-leetcode-submissions  # Force LeetCode sync for assignment
GET /my                               # Get user's assignments
```

**Analytics** (`/api/v1/analytics`):
```typescript
GET /leaderboard                      # Global/class leaderboard with enhanced sorting
GET /:classId/completion              # Class completion over time
GET /:classId/platforms               # Platform usage distribution
GET /:classId/difficulty              # Difficulty distribution
```

### Authentication Middleware:
- **protect**: Validates JWT token (`server/src/api/auth/auth.middleware.ts`)
- **isTeacher**: Checks teacher role
- **isStudent**: Checks student role

## 🔄 Enhanced Core Business Logic

### 1. Enhanced LeetCode Service (`server/src/services/enhanced-leetcode.service.ts`)

**Key Features:**
- **Authenticated API Access**: Uses `leetcode-query` package with session cookies
- **Cookie Management**: Validates and manages LeetCode session cookies
- **Automatic Syncing**: Scheduled and manual sync capabilities
- **Error Handling**: Comprehensive error handling for expired sessions

**Core Functions:**
```typescript
validateLeetCodeCredentials(cookie)      # Validate session cookie
fetchAuthenticatedSubmissions(cookie)    # Get user submissions with auth
syncUserLeetCodeData(userId)            # Sync individual user data
syncAllLinkedLeetCodeUsers()            # Sync all users with linked accounts
forceCheckLeetCodeSubmissionsForAssignment(assignmentId) # Force sync for assignment
```

### 2. Refactored Submission Service (`server/src/services/submission.service.ts`)

**Major Changes:**
- **Removed**: In-memory caching (`userSubmissionCache` Map)
- **Removed**: Progressive discovery strategies
- **Removed**: Old GraphQL LeetCode functions
- **Enhanced**: Cookie-based LeetCode integration
- **Maintained**: GeeksforGeeks support

**Core Functions:**
```typescript
checkAllSubmissions()                    # Check all pending submissions
checkSubmissionsForAssignment(id)       # Check specific assignment
processGfgSubmissions(submissions)      # Process GFG submissions
```

### 3. Advanced Analytics & Leaderboard (`server/src/api/analytics/analytics.controller.ts`)

**Enhanced Features:**
- **Dual Sorting**: Assignment progress vs LeetCode performance
- **Smart Filtering**: Shows all students for assignment progress, filtered for LeetCode
- **Real-time Updates**: Fresh calculation on each request
- **Class-specific**: Global and class-specific leaderboards

**Sorting Logic:**
```typescript
// Assignment Progress: Shows ALL students (including 0 completed)
if (sortBy === 'assignments') {
  // Sort by completed count (desc), then by avg time (asc)
  // Students with 0 assignments sorted alphabetically
}

// LeetCode Performance: Shows only students with completed assignments
if (sortBy === 'leetcode') {
  // Sort by LeetCode total solved (desc), then assignments (desc), then time (asc)
}
```

### 4. Automated Scheduling (`server/src/cron/index.ts`)
- **Enhanced Frequency**: Runs every 4 hours for LeetCode sync
- **Dual Processing**: Handles both traditional and LeetCode submissions
- **Error Recovery**: Robust error handling and logging

## 🎨 Enhanced Frontend Architecture

### Key Frontend Features:

**1. Enhanced User Profiles (`src/pages/user/ProfilePage.tsx`)**:
- LeetCode Integration section with cookie management
- Real-time status indicators (LINKED/EXPIRED/NOT_LINKED)
- Statistics display with problem counts
- Browser instructions for cookie extraction

**2. Advanced Leaderboard (`src/pages/leaderboard/LeaderboardPage.tsx`)**:
- Dual sorting: Assignment Progress vs LeetCode Performance
- Class filtering with proper dropdown state management
- Real-time refresh capability
- Cross-page data synchronization

**3. Cross-Page Data Synchronization (`src/utils/dataRefresh.ts`)**:
```typescript
// Event-driven data refresh system
triggerDataRefresh(DATA_REFRESH_EVENTS.ASSIGNMENTS_UPDATED)
triggerDataRefresh(DATA_REFRESH_EVENTS.CLASSES_UPDATED)
triggerDataRefresh(DATA_REFRESH_EVENTS.LEADERBOARD_UPDATED)

// Pages listen for relevant events and refresh data automatically
useDataRefresh(DATA_REFRESH_EVENTS.CLASSES_UPDATED, () => fetchClasses())
```

**4. Enhanced Assignment Management**:
- Real-time submission status updates
- Manual LeetCode sync triggers for teachers
- Improved deletion with cross-page refresh
- Better error handling and user feedback

## 🔧 Platform Integration Details

### LeetCode Integration:
- **Method**: Authenticated session cookies via `leetcode-query` package
- **Authentication**: User-provided session cookies stored encrypted
- **Submission Tracking**: Real-time fetching of user submission history
- **Status Management**: Active monitoring of cookie validity
- **Data Sync**: Scheduled and manual synchronization

### GeeksforGeeks Integration:
- **Method**: Public API via `https://geeks-for-geeks-api.vercel.app/`
- **Rate Limiting**: Implemented to avoid API throttling
- **Problem Matching**: URL slug extraction and normalization

### Problem Matching Algorithm:
```typescript
// URL slug extraction for different platforms
LeetCode: "/problems/two-sum/" → "two-sum"
GFG: "/problems/problem-name/1" → "problem-name"
HackerRank: Custom parsing based on URL structure
```

## 🚀 Development Workflow

### Backend Development:
```bash
cd server && npm run dev          # Development server (port 4000)
npx prisma generate              # Regenerate Prisma client
npx prisma db push              # Push schema changes
npx prisma studio               # Database GUI
```

### Frontend Development:
```bash
npm run dev                     # Development server (port 5173)
npm run build                   # Production build
npm run preview                 # Preview production build
```

### Database Operations:
```bash
cd server
npx prisma migrate dev          # Create new migration
npx prisma migrate deploy       # Deploy migrations
npx prisma reset               # Reset database
```

## 🐛 Common Debugging Patterns

### LeetCode Integration Issues:
1. **Cookie Validation**: Check `leetcodeCookieStatus` field
2. **API Limits**: Monitor for 403/429 errors in enhanced service
3. **Data Sync**: Use manual sync triggers in admin interfaces

### Submission Tracking Issues:
1. **URL Parsing**: Verify slug extraction logic
2. **Platform Detection**: Check URL pattern matching
3. **Timing Issues**: Monitor submission timestamp logic

### Cross-Page Updates:
1. **Event Firing**: Check `triggerDataRefresh` calls
2. **Event Listening**: Verify `useDataRefresh` hooks
3. **State Management**: Monitor form state synchronization

## 🔒 Security Considerations

### Authentication:
- JWT tokens for API access
- Password hashing with bcrypt
- Protected routes with middleware

### LeetCode Cookies:
- Encrypted storage of session cookies
- Regular validation and cleanup
- Secure transmission between client and server

### API Security:
- Role-based access control
- Input validation and sanitization
- Rate limiting for external APIs

## 📊 Performance Optimizations

### Database:
- Efficient queries with proper includes/selects
- Minimal data transfer with specific field selection
- Optimized leaderboard calculations

### Frontend:
- React hooks for efficient re-renders
- Selective component updates
- Cross-page event system for data freshness

### Backend:
- Bulk processing for submissions
- Caching of LeetCode statistics
- Efficient error handling and recovery

This document serves as the comprehensive guide for understanding and working with the enhanced DSA Learning Management System, particularly focusing on the advanced LeetCode integration and improved user experience features. 