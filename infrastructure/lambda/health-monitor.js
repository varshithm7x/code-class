/**
 * AWS Lambda Function: Judge0 Health Monitor
 * Part of Phase 3 - Integration Layer with Lambda Alternatives
 */

const AWS = require('aws-sdk');
const axios = require('axios');

const ec2 = new AWS.EC2();
const ssm = new AWS.SSM();

exports.handler = async (event, context) => {
  console.log('Health Monitor Lambda triggered:', JSON.stringify(event, null, 2));
  
  try {
    const { testId, instanceId } = event;
    
    if (!testId || !instanceId) {
      throw new Error('Missing testId or instanceId');
    }
    
    // Get instance metadata
    const metadata = await getInstanceMetadata(testId);
    if (!metadata) {
      console.log(`No metadata found for test ${testId}`);
      return { status: 'NO_METADATA' };
    }
    
    // Check EC2 instance health
    const instanceHealth = await checkInstanceHealth(instanceId);
    if (!instanceHealth.running) {
      console.log(`Instance ${instanceId} is not running`);
      await updateStatus(testId, 'INSTANCE_FAILED');
      return { status: 'INSTANCE_FAILED', instanceState: instanceHealth.state };
    }
    
    // Check Judge0 API health
    const judge0Health = await checkJudge0Health(metadata.judgeUrl);
    if (!judge0Health.responsive) {
      console.log(`Judge0 API not responsive for ${testId}`);
      await updateStatus(testId, 'JUDGE0_FAILED');
      return { status: 'JUDGE0_FAILED' };
    }
    
    // All checks passed
    await updateStatus(testId, 'HEALTHY');
    console.log(`Health check passed for ${testId}`);
    
    return {
      status: 'HEALTHY',
      instanceHealth,
      judge0Health,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Health monitor failed:', error);
    
    if (event.testId) {
      await updateStatus(event.testId, 'MONITOR_ERROR');
    }
    
    return { 
      status: 'ERROR', 
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

async function getInstanceMetadata(testId) {
  try {
    const result = await ssm.getParameter({
      Name: `/judge0/${testId}/metadata`
    }).promise();
    
    return JSON.parse(result.Parameter.Value);
  } catch (error) {
    console.error('Failed to get metadata:', error);
    return null;
  }
}

async function checkInstanceHealth(instanceId) {
  try {
    const result = await ec2.describeInstances({
      InstanceIds: [instanceId]
    }).promise();
    
    const instance = result.Reservations[0].Instances[0];
    
    return {
      running: instance.State.Name === 'running',
      state: instance.State.Name,
      publicIp: instance.PublicIpAddress
    };
  } catch (error) {
    console.error('Failed to check instance health:', error);
    return { running: false, state: 'unknown' };
  }
}

async function checkJudge0Health(judgeUrl) {
  try {
    if (!judgeUrl) {
      return { responsive: false, reason: 'No judge URL' };
    }
    
    // Test basic API connectivity
    const response = await axios.get(`${judgeUrl}/languages`, { 
      timeout: 10000 
    });
    
    if (response.status !== 200) {
      return { responsive: false, reason: `HTTP ${response.status}` };
    }
    
    // Test simple execution
    const testSubmission = {
      source_code: 'print("health_check")',
      language_id: 71, // Python
      stdin: ''
    };
    
    const execResponse = await axios.post(`${judgeUrl}/submissions?wait=true`, testSubmission, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    const isExecutionHealthy = execResponse.data.status?.description === 'Accepted';
    
    return {
      responsive: true,
      executionHealthy: isExecutionHealthy,
      languageCount: response.data.length,
      lastCheck: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Judge0 health check failed:', error);
    return { 
      responsive: false, 
      reason: error.message,
      lastCheck: new Date().toISOString()
    };
  }
}

async function updateStatus(testId, status) {
  try {
    await ssm.putParameter({
      Name: `/judge0/${testId}/health_status`,
      Value: status,
      Overwrite: true
    }).promise();
    
    await ssm.putParameter({
      Name: `/judge0/${testId}/last_health_check`,
      Value: new Date().toISOString(),
      Overwrite: true
    }).promise();
    
  } catch (error) {
    console.error('Failed to update status:', error);
  }
} 