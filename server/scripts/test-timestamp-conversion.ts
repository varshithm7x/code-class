/**
 * Test timestamp conversion function to ensure it handles LeetCode timestamps correctly
 */

// Copy the safeDateFromTimestamp function for testing
const safeDateFromTimestamp = (timestamp: number): Date => {
  // Handle various timestamp formats
  let validTimestamp = timestamp;
  
  // If timestamp is in seconds (typical Unix timestamp), convert to milliseconds
  if (timestamp < 1e12) { // Less than year 2001 in milliseconds, likely in seconds
    validTimestamp = timestamp * 1000;
  }
  
  // Create date and validate it's reasonable (between 1970 and 2030)
  const date = new Date(validTimestamp);
  const year = date.getFullYear();
  
  if (isNaN(date.getTime()) || year < 1970 || year > 2030) {
    console.warn(`⚠️ Invalid timestamp ${timestamp}, using current date`);
    return new Date();
  }
  
  return date;
};

console.log('🧪 Testing timestamp conversion...');

// Test various timestamp formats
const testCases = [
  1749535072,      // Unix timestamp in seconds (recent)
  1749535072000,   // Unix timestamp in milliseconds
  1234567890,      // Another valid Unix timestamp
  999999999999999, // Very large number that caused the original error
  0,               // Edge case
  -1,              // Invalid negative
];

testCases.forEach(timestamp => {
  try {
    const result = safeDateFromTimestamp(timestamp);
    console.log(`✅ Timestamp ${timestamp} -> ${result.toISOString()} (${result.getFullYear()})`);
  } catch (error) {
    console.error(`❌ Error with timestamp ${timestamp}:`, error);
  }
});

console.log('🎯 Timestamp conversion test completed'); 