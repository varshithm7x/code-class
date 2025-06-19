const fs = require('fs');
const path = require('path');

function encodePassword(password) {
  // URL encode special characters commonly found in passwords
  return encodeURIComponent(password);
}

function buildSupabaseUrl(projectRef, password) {
  const encodedPassword = encodePassword(password);
  return `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`;
}

function validateDatabaseUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Check required components
    const isValid = 
      urlObj.protocol === 'postgresql:' &&
      urlObj.hostname &&
      urlObj.hostname.includes('supabase.co') &&
      urlObj.port === '5432' &&
      urlObj.pathname === '/postgres' &&
      urlObj.username === 'postgres' &&
      urlObj.password;
    
    return {
      isValid,
      components: {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        port: urlObj.port,
        pathname: urlObj.pathname,
        username: urlObj.username,
        passwordLength: urlObj.password ? urlObj.password.length : 0
      }
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
}

function generateEnvTemplate(projectRef, password) {
  const databaseUrl = buildSupabaseUrl(projectRef, password);
  
  return `# Supabase Configuration
DATABASE_URL="${databaseUrl}"
DIRECT_URL="${databaseUrl}"

# Supabase Project Details
SUPABASE_URL="https://${projectRef}.supabase.co"
SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"`;
}

// Interactive helper
function fixDatabaseUrl() {
  console.log('🔧 Supabase Database URL Helper\n');
  
  // Try to read current .env
  const envPath = path.join(process.cwd(), '.env');
  let currentUrl = '';
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
    if (match) {
      currentUrl = match[1];
      console.log('📋 Current DATABASE_URL found:', currentUrl);
      
      const validation = validateDatabaseUrl(currentUrl);
      console.log('🔍 Validation result:', validation);
    }
  }
  
  console.log('\n📝 To fix your DATABASE_URL, you need:');
  console.log('1. Your Supabase project reference (from dashboard URL)');
  console.log('2. Your database password');
  console.log('\nExample usage:');
  console.log('node scripts/fix-database-url.js [project-ref] [password]');
  console.log('node scripts/fix-database-url.js xyzabc123 "myP@ssw0rd!"');
}

// CLI usage
if (require.main === module) {
  const projectRef = process.argv[2];
  const password = process.argv[3];

  if (!projectRef || !password) {
    fixDatabaseUrl();
    process.exit(1);
  }

  console.log('🔧 Generating proper DATABASE_URL...\n');
  
  const databaseUrl = buildSupabaseUrl(projectRef, password);
  const validation = validateDatabaseUrl(databaseUrl);
  
  console.log('📋 Generated URL:', databaseUrl);
  console.log('✅ Validation:', validation.isValid ? 'VALID' : 'INVALID');
  
  if (validation.isValid) {
    console.log('\n📝 Add this to your .env file:');
    console.log(`DATABASE_URL="${databaseUrl}"`);
    console.log(`DIRECT_URL="${databaseUrl}"`);
    
    // Optionally write to .env.new
    const envTemplate = generateEnvTemplate(projectRef, password);
    fs.writeFileSync('.env.supabase', envTemplate);
    console.log('\n💾 Saved complete configuration to .env.supabase');
    console.log('📋 Copy the contents to your .env file');
  } else {
    console.log('❌ Generated URL is invalid:', validation.error || 'Unknown error');
  }
}

module.exports = { encodePassword, buildSupabaseUrl, validateDatabaseUrl }; 