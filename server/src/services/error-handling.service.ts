export interface ErrorContext {
  testId?: string;
  instanceId?: string;
  userId?: string;
  operation: string;
  timestamp: Date;
  metadata?: any;
}

export interface ErrorClassification {
  category: 'INFRASTRUCTURE' | 'JUDGE0' | 'APPLICATION' | 'USER' | 'NETWORK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  retryable: boolean;
  escalationRequired: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  backoffMultiplier: number;
  maxDelay: number; // milliseconds
}

export class ErrorHandlingService {
  private errorStats = new Map<string, number>();
  private circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Handle error with automatic classification and response
   */
  async handleError(error: Error, context: ErrorContext): Promise<void> {
    const classification = this.classifyError(error, context);
    
    // Log error with classification
    this.logError(error, context, classification);
    
    // Update error statistics
    this.updateErrorStats(classification.category, context.operation);
    
    // Handle based on classification
    if (classification.retryable) {
      await this.handleRetryableError(error, context, classification);
    } else if (classification.escalationRequired) {
      await this.escalateError(error, context, classification);
    }
    
    // Update circuit breaker
    this.updateCircuitBreaker(context.operation, false);
  }

  /**
   * Execute operation with retry logic and circuit breaker
   */
  async executeWithResilience<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: ErrorContext,
    retryConfig?: RetryConfig
  ): Promise<T> {
    const config = retryConfig || this.getDefaultRetryConfig(operationName);
    const circuitBreaker = this.getCircuitBreaker(operationName);
    
    // Check circuit breaker
    if (circuitBreaker.isOpen()) {
      throw new Error(`Circuit breaker open for operation: ${operationName}`);
    }
    
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Success - update circuit breaker
        this.updateCircuitBreaker(operationName, true);
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        // Handle the error
        await this.handleError(lastError, {
          ...context,
          operation: operationName,
          metadata: { attempt, maxAttempts: config.maxAttempts }
        });
        
        // Don't retry on last attempt
        if (attempt === config.maxAttempts) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        
        console.log(`Retrying ${operationName} in ${delay}ms (attempt ${attempt + 1}/${config.maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All attempts failed
    this.updateCircuitBreaker(operationName, false);
    throw lastError!;
  }

  /**
   * Classify error for appropriate handling
   */
  private classifyError(error: Error, context: ErrorContext): ErrorClassification {
    const message = error.message.toLowerCase();
    
    // Infrastructure errors
    if (message.includes('ec2') || message.includes('aws') || message.includes('instance')) {
      return {
        category: 'INFRASTRUCTURE',
        severity: 'HIGH',
        retryable: true,
        escalationRequired: true
      };
    }
    
    // Judge0 errors
    if (message.includes('judge0') || message.includes('compilation') || message.includes('execution')) {
      return {
        category: 'JUDGE0',
        severity: message.includes('timeout') ? 'MEDIUM' : 'HIGH',
        retryable: !message.includes('compilation error'),
        escalationRequired: message.includes('service unavailable')
      };
    }
    
    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return {
        category: 'NETWORK',
        severity: 'MEDIUM',
        retryable: true,
        escalationRequired: false
      };
    }
    
    // User errors
    if (message.includes('validation') || message.includes('unauthorized') || message.includes('forbidden')) {
      return {
        category: 'USER',
        severity: 'LOW',
        retryable: false,
        escalationRequired: false
      };
    }
    
    // Default to application error
    return {
      category: 'APPLICATION',
      severity: 'MEDIUM',
      retryable: false,
      escalationRequired: true
    };
  }

  /**
   * Handle retryable errors
   */
  private async handleRetryableError(
    error: Error,
    context: ErrorContext,
    classification: ErrorClassification
  ): Promise<void> {
    console.log(`Handling retryable error: ${error.message}`);
    
    // Check if we should escalate based on error frequency
    const errorCount = this.errorStats.get(`${classification.category}:${context.operation}`) || 0;
    
    if (errorCount > 5) { // Escalate if same error type occurs frequently
      await this.escalateError(error, context, classification);
    }
  }

  /**
   * Escalate error to administrators
   */
  private async escalateError(
    error: Error,
    context: ErrorContext,
    classification: ErrorClassification
  ): Promise<void> {
    console.log(`Escalating error: ${error.message}`);
    
    // In a real implementation, this would send notifications
    // For now, we'll just log the escalation
    console.error('ERROR ESCALATION:', {
      error: error.message,
      context,
      classification,
      timestamp: new Date()
    });
  }

  /**
   * Log error with full context
   */
  private logError(
    error: Error,
    context: ErrorContext,
    classification: ErrorClassification
  ): void {
    const logEntry = {
      timestamp: context.timestamp,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      classification
    };
    
    console.error('HANDLED ERROR:', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Update error statistics
   */
  private updateErrorStats(category: string, operation: string): void {
    const key = `${category}:${operation}`;
    const current = this.errorStats.get(key) || 0;
    this.errorStats.set(key, current + 1);
  }

  /**
   * Get or create circuit breaker for operation
   */
  private getCircuitBreaker(operationName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operationName)) {
      this.circuitBreakers.set(operationName, new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 60000, // 1 minute
        monitoringPeriod: 300000 // 5 minutes
      }));
    }
    
    return this.circuitBreakers.get(operationName)!;
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(operationName: string, success: boolean): void {
    const circuitBreaker = this.getCircuitBreaker(operationName);
    
    if (success) {
      circuitBreaker.recordSuccess();
    } else {
      circuitBreaker.recordFailure();
    }
  }

  /**
   * Get default retry configuration for operation
   */
  private getDefaultRetryConfig(operationName: string): RetryConfig {
    const configs = {
      'judge0-health-check': {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000
      },
      'ec2-launch': {
        maxAttempts: 2,
        baseDelay: 5000,
        backoffMultiplier: 2,
        maxDelay: 30000
      },
      'submission-execution': {
        maxAttempts: 3,
        baseDelay: 500,
        backoffMultiplier: 1.5,
        maxDelay: 5000
      }
    };
    
    return configs[operationName as keyof typeof configs] || {
      maxAttempts: 3,
      baseDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 10000
    };
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorStats);
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates(): Record<string, any> {
    const states: Record<string, any> = {};
    
    for (const [name, breaker] of this.circuitBreakers) {
      states[name] = {
        state: breaker.getState(),
        failureCount: breaker.getFailureCount(),
        isOpen: breaker.isOpen()
      };
    }
    
    return states;
  }

  /**
   * Reset error statistics
   */
  resetErrorStats(): void {
    this.errorStats.clear();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(operationName: string): void {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      breaker.reset();
    }
  }
}

/**
 * Simple Circuit Breaker implementation
 */
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(private config: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
  }) {}

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  isOpen(): boolean {
    if (this.state === 'OPEN') {
      // Check if recovery timeout has passed
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    
    return false;
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
} 