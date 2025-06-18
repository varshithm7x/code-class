# 🔑 Judge0 API Key Crowdsourcing Analysis

## ✅ **HIGHLY VIABLE APPROACH** - This is actually a smart distributed solution!

### **Implementation Strategy:**

```typescript
// Enhanced User model
model User {
  // ... existing fields
  judge0ApiKey     String?   // Encrypted RapidAPI key
  judge0KeyStatus  String    @default("NOT_PROVIDED") // ACTIVE, EXHAUSTED, INVALID, NOT_PROVIDED
  judge0QuotaUsed  Int       @default(0) // Daily usage counter
  judge0LastReset  DateTime? // Last quota reset timestamp
}

// API Key Pool Management
model Judge0KeyPool {
  id            String   @id @default(cuid())
  userId        String   // Owner of the key
  encryptedKey  String   // Encrypted API key
  status        String   @default("ACTIVE") // ACTIVE, EXHAUSTED, INVALID, SUSPENDED
  dailyUsage    Int      @default(0)
  dailyLimit    Int      @default(50) // Free tier limit
  lastUsed      DateTime?
  lastReset     DateTime @default(now())
  
  user          User     @relation(fields: [userId], references: [id])
}
```

### **Key Rotation & Load Balancing Logic:**

```typescript
class Judge0KeyManager {
  async getAvailableKey(): Promise<string | null> {
    // 1. Try student keys first (round-robin)
    const availableKeys = await prisma.judge0KeyPool.findMany({
      where: {
        status: 'ACTIVE',
        dailyUsage: { lt: 45 } // Keep 5 requests buffer
      },
      orderBy: { dailyUsage: 'asc' } // Least used first
    });
    
    if (availableKeys.length > 0) {
      return this.selectAndUpdateKey(availableKeys[0]);
    }
    
    // 2. Fallback to platform backup keys
    return this.getPlatformBackupKey();
  }
  
  async handleKeyExhaustion(keyId: string) {
    await prisma.judge0KeyPool.update({
      where: { id: keyId },
      data: { status: 'EXHAUSTED' }
    });
  }
  
  // Reset quotas daily at midnight
  async resetDailyQuotas() {
    await prisma.judge0KeyPool.updateMany({
      where: { lastReset: { lt: startOfToday() } },
      data: {
        dailyUsage: 0,
        status: 'ACTIVE',
        lastReset: new Date()
      }
    });
  }
}
```

## 🚦 **Potential Issues & Mitigations:**

### **1. Key Reliability Issues**
**Problem**: Students might revoke or change their API keys
**Solution**: 
- ✅ Automated key validation (daily health checks)
- ✅ Graceful fallback to platform keys
- ✅ Student notification system for key issues

### **2. Quota Management**
**Problem**: Uneven usage distribution
**Solution**:
- ✅ Smart load balancing (least-used first)
- ✅ Reserve quotas for critical test periods
- ✅ Platform backup keys for overflow

### **3. Security & Privacy**
**Problem**: Storing student API keys securely
**Solution**:
- ✅ AES-256 encryption for key storage
- ✅ Keys never logged or exposed in responses
- ✅ Optional key sharing (students can opt-out)

### **4. Fair Usage**
**Problem**: Some students using more quota than others
**Solution**:
- ✅ Per-student usage tracking
- ✅ Fair rotation algorithm
- ✅ Usage dashboard for transparency

## 🔧 **Enhanced Implementation Plan:**

### **Student API Key Collection Flow:**
```typescript
// New API endpoint
POST /api/v1/profile/judge0-key
{
  "rapidApiKey": "encrypted_key_here",
  "agreedToSharing": true // Optional sharing for class pool
}

// Key validation endpoint
POST /api/v1/admin/validate-keys // Teacher only
```

### **Smart Key Selection Algorithm:**
```typescript
const keySelectionStrategies = {
  ROUND_ROBIN: 'Cycle through all available keys',
  LEAST_USED: 'Prioritize keys with lowest daily usage', 
  RANDOM: 'Random selection from available pool',
  OWNER_FIRST: 'Use student\'s own key first, then pool'
};
```

## 📊 **Expected Performance:**

**With 30 students providing keys:**
- **Total Daily Quota**: 1,500 requests (30 × 50)
- **Concurrent Tests**: Support 3-5 simultaneous tests
- **Per Student**: ~50 submissions per test session
- **Safety Buffer**: Platform keys for overflow

## 🔐 **Security Implementation:**

```typescript
// Key encryption service
class KeyEncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  
  static encrypt(key: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.ALGORITHM, process.env.ENCRYPTION_KEY);
    // ... encryption logic
  }
  
  static decrypt(encryptedKey: string): string {
    // ... decryption logic with error handling
  }
}
```

## ✅ **Final Recommendation:**

**PROCEED WITH CROWDSOURCED KEYS** - This approach will:
- Eliminate rate limit issues
- Distribute costs fairly
- Scale naturally with class size
- Provide platform redundancy

---

# 🚀 Task 2: Implementation Planning

## 📋 **Milestone Breakdown:**

### **Milestone 1: Core Infrastructure** ⚡ *Medium Effort*
**Duration**: 5-7 days
- Database schema updates (TestModels + Judge0KeyPool)
- Judge0 key management system
- Basic WebSocket setup
- Authentication extensions

**Deliverables**:
- Updated Prisma schema
- Key management API endpoints
- WebSocket server foundation
- Migration scripts

---

### **Milestone 2: Test Creation & Management** 🎯 *Medium Effort*  
**Duration**: 4-5 days
- Teacher test creation UI
- Test configuration (problems, time limits, languages)
- Test scheduling and activation
- Student key collection interface

**Deliverables**:
- Test creation wizard
- Problem editor with examples
- Schedule management
- API key collection form

---

### **Milestone 3: Student Test Environment** 🖥️ *High Effort*
**Duration**: 7-8 days
- Monaco Editor integration
- Fullscreen enforcement
- Real-time timer and status
- Code submission pipeline

**Deliverables**:
- Coding environment UI
- Fullscreen lock system
- Timer and progress indicators
- Judge0 submission handler

---

### **Milestone 4: Judge Integration & Evaluation** ⚖️ *Medium Effort*
**Duration**: 4-5 days
- Judge0 API integration with key rotation
- Test case execution
- Results processing and scoring
- Submission history

**Deliverables**:
- Judge0 service with key pooling
- Code execution pipeline  
- Scoring algorithm
- Results display

---

### **Milestone 5: Invigilation & Monitoring** 👁️ *Medium Effort*
**Duration**: 3-4 days
- Cheating detection (tab switch, fullscreen exit)
- Real-time penalty system
- Teacher monitoring dashboard
- Session management

**Deliverables**:
- Penalty detection system
- Live monitoring interface
- Violation logging
- Admin controls

---

### **Milestone 6: Testing & Polish** ✨ *Low-Medium Effort*
**Duration**: 3-4 days
- End-to-end testing
- Performance optimization
- Error handling improvements
- Documentation

**Deliverables**:
- Test suite
- Performance benchmarks
- User documentation
- Deployment guide

---

## 📅 **Total Timeline: 26-33 days (3.5-4.5 weeks)**

**Critical Path**: Monaco Editor integration → Judge0 pipeline → Real-time monitoring

**Parallel Development Opportunities**:
- UI development while backend APIs are built
- Judge0 integration alongside test creation
- Monitoring system independent of core testing

---

**Ready to begin Milestone 1: Core Infrastructure?** The enhanced approach with crowdsourced API keys will make this a robust, scalable solution!