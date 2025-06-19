# Complete Migration Guide: From Current Database to Supabase

## Overview
This guide walks you through migrating your existing Prisma-managed database to Supabase while preserving all data and maintaining Prisma ORM functionality.

## Prerequisites
- Node.js and npm installed
- Access to your current database
- Supabase account

## Step 1: Setup Supabase Project

### 1.1 Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"

### 1.2 Create New Project
1. Choose your organization
2. Enter project name (e.g., "code-class-db")
3. Set a strong database password (save this securely!)
4. Select region closest to your users
5. Click "Create new project"

### 1.3 Get Connection Details
1. Go to **Settings** → **Database**
2. Find "Connection string" section
3. Copy the **URI** (this is your `DATABASE_URL`)
4. Go to **Settings** → **API**
5. Copy the **Project URL** and **anon public** key

## Step 2: Backup Current Database

### 2.1 Create Backup
Navigate to your server directory and run:

```bash
cd server
node scripts/backup-database.js
```

This will create a backup file in `server/scripts/backups/` with timestamp.

### 2.2 Verify Backup
The script will show you:
- Number of records backed up per table
- Total records
- Backup file location

**IMPORTANT**: Keep this backup file safe! Don't proceed without a successful backup.

## Step 3: Configure Environment

### 3.1 Update Environment Variables
1. Copy your current `.env` file to `.env.backup`
2. Update your `.env` file with Supabase credentials:

```bash
# Replace with your Supabase details
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Add these new Supabase variables
SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"

# Keep all your existing environment variables
JWT_SECRET="your-existing-jwt-secret"
PORT=3001
# ... etc
```

### 3.2 Find Your Connection Details
To get your specific values:
1. **[YOUR-PASSWORD]**: The database password you set when creating the project
2. **[YOUR-PROJECT-REF]**: Found in Supabase dashboard URL or Settings → General
3. **[YOUR-ANON-KEY]**: Found in Settings → API
4. **[YOUR-SERVICE-ROLE-KEY]**: Found in Settings → API

## Step 4: Initialize Supabase Database

### 4.1 Generate Prisma Client
```bash
cd server
npm run db:generate
```

### 4.2 Push Schema to Supabase
```bash
npx prisma db push
```

This creates all your tables in Supabase without data.

### 4.3 Verify Schema
```bash
npx prisma studio
```

Check that all tables are created correctly in your Supabase database.

## Step 5: Migrate Data

### 5.1 Run Data Migration
```bash
cd server
node scripts/migrate-to-supabase.js [backup-file-path] [supabase-database-url]
```

Example:
```bash
node scripts/migrate-to-supabase.js ./scripts/backups/database-backup-2024-01-01T10-30-00-000Z.json "postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres"
```

### 5.2 Monitor Migration Progress
The script will show:
- Connection status to Supabase
- Progress for each table
- Number of records migrated
- Verification results

## Step 6: Test Your Application

### 6.1 Start Server
```bash
cd server
npm run dev
```

### 6.2 Verify Functionality
1. Test user authentication
2. Check that all data is visible
3. Test CRUD operations
4. Verify relationships work correctly

### 6.3 Run Database Studio
```bash
npx prisma studio
```

Verify all your data is present in Supabase.

## Step 7: Update Production

### 7.1 Update Deployment Environment
If you're using Vercel, Netlify, or similar:
1. Update environment variables in your deployment platform
2. Redeploy your application

### 7.2 Update CI/CD
Update any GitHub Actions or CI/CD pipelines with new environment variables.

## Troubleshooting

### Common Issues

**Connection Errors**
- Check your DATABASE_URL format
- Verify password and project reference
- Ensure IP whitelist (if enabled) includes your IP

**Migration Failures**
- Check foreign key constraints
- Verify unique constraints
- Look for data type mismatches

**Performance Issues**
- Supabase has connection limits on free tier
- Consider upgrading if you have many concurrent users
- Use connection pooling if needed

### Rollback Plan

If migration fails:
1. Keep your original database running
2. Update `.env` to point back to original database
3. Restore from backup if needed:

```bash
# Switch back to original DATABASE_URL
DATABASE_URL="your-original-database-url"
```

## Verification Checklist

- [ ] Backup created successfully
- [ ] Supabase project created
- [ ] Environment variables updated
- [ ] Schema pushed to Supabase
- [ ] Data migrated successfully
- [ ] Application tests pass
- [ ] All features working
- [ ] Production deployed

## Benefits of Supabase

After migration, you'll have:
- **Managed PostgreSQL**: No server maintenance
- **Real-time subscriptions**: Built-in WebSocket support
- **Row Level Security**: Database-level authorization
- **Auto-generated APIs**: REST and GraphQL endpoints
- **Built-in Auth**: User management system
- **File Storage**: Built-in file upload/storage
- **Edge Functions**: Serverless function deployment

## Additional Supabase Features

Consider integrating these Supabase features:

### Real-time Updates
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

// Listen to database changes
supabase
  .channel('custom-all-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'submissions' },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()
```

### Row Level Security (RLS)
Enable RLS policies for better security:
1. Go to Supabase Dashboard → Authentication → Policies
2. Enable RLS for sensitive tables
3. Create policies for user access control

### Supabase Auth Integration
Consider migrating to Supabase Auth for easier user management.

## Support

If you encounter issues:
1. Check Supabase documentation: https://supabase.com/docs
2. Review Prisma Supabase guide: https://www.prisma.io/docs/guides/database/supabase
3. Check migration logs for specific errors
4. Contact Supabase support if needed

## Post-Migration Optimization

### Database Indexing
```sql
-- Add indexes for better performance
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_problems_assignment_id ON problems(assignment_id);
CREATE INDEX idx_test_sessions_test_id ON test_sessions(test_id);
```

### Connection Pooling
Consider adding connection pooling for better performance:
```javascript
// In your Prisma client setup
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'info', 'warn', 'error'],
})
```

## Cleanup

After successful migration:
1. Keep backup files for at least 30 days
2. Monitor application for 1 week
3. Consider shutting down old database
4. Archive old database connection strings securely

---

**🎉 Congratulations!** You've successfully migrated to Supabase while keeping Prisma ORM. Your application now benefits from managed PostgreSQL with additional Supabase features available for future enhancements. 