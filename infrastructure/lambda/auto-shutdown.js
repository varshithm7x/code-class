/**
 * AWS Lambda Function: Auto Shutdown
 * Part of Phase 3 - Integration Layer
 */

const AWS = require('aws-sdk');

const ec2 = new AWS.EC2();
const ssm = new AWS.SSM();

exports.handler = async (event, context) => {
  console.log('Auto Shutdown Lambda triggered:', JSON.stringify(event, null, 2));
  
  try {
    const { testId, instanceId } = event;
    
    if (!testId || !instanceId) {
      throw new Error('Missing testId or instanceId');
    }
    
    console.log(`Processing shutdown for test ${testId}, instance ${instanceId}`);
    
    // Perform graceful shutdown
    const shutdownResult = await performGracefulShutdown(testId, instanceId);
    
    return {
      status: 'SHUTDOWN_COMPLETED',
      testId,
      instanceId,
      shutdownResult,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Auto shutdown failed:', error);
    
    // Still attempt emergency shutdown
    if (event.instanceId) {
      await emergencyShutdown(event.instanceId);
    }
    
    return { 
      status: 'ERROR', 
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

async function performGracefulShutdown(testId, instanceId) {
  console.log(`Starting graceful shutdown for ${instanceId}`);
  
  try {
    // Mark instance as shutting down
    await updateInstanceStatus(testId, 'SHUTTING_DOWN');
    
    // Calculate final cost
    const metadata = await getInstanceMetadata(testId);
    const finalCost = calculateFinalCost(metadata);
    
    // Store final metrics
    await storeFinalMetrics(testId, {
      finalCost,
      shutdownTime: new Date().toISOString(),
      shutdownReason: 'AUTO_SHUTDOWN'
    });
    
    // Terminate EC2 instance
    await terminateInstance(instanceId);
    
    return {
      success: true,
      finalCost,
      shutdownTime: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Graceful shutdown failed:', error);
    await emergencyShutdown(instanceId);
    return { success: false, error: error.message };
  }
}

async function emergencyShutdown(instanceId) {
  try {
    await terminateInstance(instanceId);
    console.log(`Emergency shutdown completed for ${instanceId}`);
  } catch (error) {
    console.error(`Emergency shutdown failed for ${instanceId}:`, error);
  }
}

async function terminateInstance(instanceId) {
  await ec2.terminateInstances({
    InstanceIds: [instanceId]
  }).promise();
}

async function getInstanceMetadata(testId) {
  try {
    const result = await ssm.getParameter({
      Name: `/judge0/${testId}/metadata`
    }).promise();
    return JSON.parse(result.Parameter.Value);
  } catch (error) {
    return { launchedAt: new Date().toISOString() };
  }
}

async function calculateFinalCost(metadata) {
  const launchedAt = new Date(metadata.launchedAt);
  const shutdownAt = new Date();
  const durationHours = (shutdownAt - launchedAt) / (1000 * 60 * 60);
  const hourlyRate = 0.0416;
  return Math.round(durationHours * hourlyRate * 100) / 100;
}

async function updateInstanceStatus(testId, status) {
  try {
    await ssm.putParameter({
      Name: `/judge0/${testId}/status`,
      Value: status,
      Overwrite: true
    }).promise();
  } catch (error) {
    console.error('Failed to update status:', error);
  }
}

async function storeFinalMetrics(testId, metrics) {
  try {
    await ssm.putParameter({
      Name: `/judge0/${testId}/final_metrics`,
      Value: JSON.stringify(metrics),
      Overwrite: true
    }).promise();
  } catch (error) {
    console.error('Failed to store final metrics:', error);
  }
} 