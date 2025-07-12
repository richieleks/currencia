// Test script to populate audit logs and verify the audit system
const { storage } = require('./server/storage.ts');

async function createTestAuditLogs() {
  console.log('Creating test audit log entries...');
  
  try {
    // Create various types of audit log entries
    const testLogs = [
      {
        userId: '43104392', // DENNIS LEKU's ID
        action: 'login_success',
        resource: 'authentication',
        resourceId: '43104392',
        success: true,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { method: 'oauth', provider: 'replit' }
      },
      {
        userId: '43104392',
        action: 'admin_user_role_update', 
        resource: 'user',
        resourceId: '42908557',
        success: true,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { previousRole: 'trader', newRole: 'admin' }
      },
      {
        userId: '43104392',
        action: 'exchange_request_create',
        resource: 'exchange_request',
        resourceId: '19',
        success: true,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { fromCurrency: 'USD', toCurrency: 'UGX', amount: '1000', priority: 'high' }
      },
      {
        userId: '42908557',
        action: 'rate_offer_create',
        resource: 'rate_offer',
        resourceId: '15',
        success: true,
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        details: { exchange_request_id: 19, rate: '3800', amount: '1000' }
      },
      {
        userId: null,
        action: 'login_failed',
        resource: 'authentication',
        resourceId: null,
        success: false,
        ipAddress: '192.168.1.200',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        details: { reason: 'invalid_credentials', email: 'test@example.com' }
      },
      {
        userId: '43104392',
        action: 'admin_role_create',
        resource: 'role',
        resourceId: '5',
        success: true,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { name: 'Custom Manager', description: 'Custom role for managers' }
      },
      {
        userId: '43104392',
        action: 'suspicious_activity',
        resource: 'security',
        resourceId: null,
        success: false,
        ipAddress: '192.168.1.250',
        userAgent: 'curl/7.68.0',
        details: { activity_type: 'multiple_failed_attempts', attempt_count: 5 }
      }
    ];

    for (const log of testLogs) {
      await storage.createAuditLog(log);
      console.log(`Created audit log: ${log.action} for ${log.resource}`);
    }

    console.log('Test audit logs created successfully!');
    
    // Verify by fetching the logs
    const allLogs = await storage.getAuditLogs();
    console.log(`Total audit logs in database: ${allLogs.length}`);
    
    // Test filtering
    const adminLogs = await storage.getAuditLogs({ action: 'admin_user_role_update' });
    console.log(`Admin action logs: ${adminLogs.length}`);
    
    const userLogs = await storage.getAuditLogs({ userId: '43104392' });
    console.log(`Logs for user 43104392: ${userLogs.length}`);
    
  } catch (error) {
    console.error('Error creating test audit logs:', error);
  }
}

createTestAuditLogs();