import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLeaderboard() {
  console.log('🔍 Testing leaderboard logic...');
  
  try {
    // Check if we have users
    const allUsers = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        leetcodeUsername: true,
        leetcodeCookieStatus: true,
        leetcodeTotalSolved: true,
      }
    });
    
    console.log(`📊 Found ${allUsers.length} students in database:`);
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - LeetCode: ${user.leetcodeUsername || 'none'} (${user.leetcodeCookieStatus || 'NOT_LINKED'})`);
    });
    
    // Check if we have any classes
    const allClasses = await prisma.class.findMany({
      select: {
        id: true,
        name: true,
        students: {
          select: {
            userId: true
          }
        }
      }
    });
    
    console.log(`\n🏫 Found ${allClasses.length} classes:`);
    allClasses.forEach(cls => {
      console.log(`  - ${cls.name} (${cls.students.length} students)`);
    });
    
    // Check assignments and submissions
    const allAssignments = await prisma.assignment.findMany({
      select: {
        id: true,
        title: true,
        classId: true,
        problems: {
          select: {
            id: true,
            platform: true,
            submissions: {
              select: {
                completed: true,
                userId: true
              }
            }
          }
        }
      }
    });
    
    console.log(`\n📝 Found ${allAssignments.length} assignments:`);
    allAssignments.forEach(assignment => {
      const totalSubmissions = assignment.problems.reduce((sum, p) => sum + p.submissions.length, 0);
      const completedSubmissions = assignment.problems.reduce((sum, p) => 
        sum + p.submissions.filter(s => s.completed).length, 0);
      
      console.log(`  - ${assignment.title}: ${assignment.problems.length} problems, ${completedSubmissions}/${totalSubmissions} completed`);
    });
    
    // Now test the actual leaderboard logic
    console.log('\n🏆 Testing leaderboard generation...');
    
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        leetcodeUsername: true,
        leetcodeCookieStatus: true,
        leetcodeTotalSolved: true,
        leetcodeEasySolved: true,
        leetcodeMediumSolved: true,
        leetcodeHardSolved: true,
        submissions: {
          where: { completed: true },
          include: {
            problem: {
              include: {
                assignment: true
              }
            }
          }
        }
      }
    });
    
    console.log(`\n📈 Processing ${students.length} students for leaderboard...`);
    
    const leaderboardData = students.map((student: any) => {
      const completedCount = student.submissions.length;
      
      // Calculate average submission time
      let avgSubmissionTimeMinutes = 0;
      if (student.submissions.length > 0) {
        const totalMinutes = student.submissions.reduce((total: number, submission: any) => {
          if (!submission.submissionTime || !submission.problem.assignment) return total;
          
          const assignDate = new Date(submission.problem.assignment.assignDate);
          const submitDate = new Date(submission.submissionTime);
          const diffMinutes = Math.max(0, (submitDate.getTime() - assignDate.getTime()) / (1000 * 60));
          
          return total + diffMinutes;
        }, 0);
        
        avgSubmissionTimeMinutes = totalMinutes / student.submissions.length;
      }

      const hours = Math.floor(avgSubmissionTimeMinutes / 60);
      const minutes = Math.round(avgSubmissionTimeMinutes % 60);
      const avgSubmissionTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      return {
        id: student.id,
        name: student.name,
        completedCount,
        avgSubmissionTime,
        leetcodeTotalSolved: student.leetcodeTotalSolved,
        leetcodeCookieStatus: student.leetcodeCookieStatus,
      };
    }).filter((student: any) => student.completedCount > 0);

    // Sort by completed count first
    leaderboardData.sort((a: any, b: any) => {
      if (b.completedCount !== a.completedCount) {
        return b.completedCount - a.completedCount;
      }
      return (a.leetcodeTotalSolved || 0) - (b.leetcodeTotalSolved || 0);
    });

    console.log('\n🥇 Generated leaderboard:');
    leaderboardData.forEach((student: any, index: number) => {
      console.log(`  ${index + 1}. ${student.name}: ${student.completedCount} assignments, ${student.leetcodeTotalSolved || 0} LeetCode (${student.leetcodeCookieStatus || 'NOT_LINKED'})`);
    });
    
    if (leaderboardData.length === 0) {
      console.log('❌ No students with completed submissions found!');
      console.log('This might be why the leaderboard appears empty.');
    }
    
  } catch (error) {
    console.error('❌ Error testing leaderboard:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLeaderboard(); 