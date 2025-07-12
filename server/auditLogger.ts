import { storage } from './storage';
import { Request } from 'express';

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export class AuditLogger {
  static async log(
    action: string,
    resource: string,
    resourceId: string | number | null,
    success: boolean,
    context: AuditContext,
    details?: any
  ) {
    try {
      await storage.createAuditLog({
        userId: context.userId || null,
        action,
        resource,
        resourceId: resourceId?.toString() || null,
        success,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        details: details || null,
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  static getContextFromRequest(req: Request): AuditContext {
    const user = req.user as any;
    return {
      userId: user?.claims?.sub,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      sessionId: req.sessionID,
    };
  }

  // Convenience methods for common audit events
  static async logUserAction(
    action: 'login' | 'logout' | 'register' | 'profile_update' | 'password_change',
    userId: string,
    context: AuditContext,
    details?: any
  ) {
    await this.log(action, 'user', userId, true, context, details);
  }

  static async logAdminAction(
    action: string,
    resource: string,
    resourceId: string | number | null,
    success: boolean,
    context: AuditContext,
    details?: any
  ) {
    await this.log(`admin_${action}`, resource, resourceId, success, context, details);
  }

  static async logSecurityEvent(
    event: 'failed_login' | 'account_locked' | 'suspicious_activity' | 'permission_denied',
    userId: string | null,
    context: AuditContext,
    details?: any
  ) {
    await this.log(event, 'security', null, false, context, details);
  }

  static async logBusinessAction(
    action: 'exchange_request' | 'rate_offer' | 'transaction' | 'chat_message',
    resourceId: string | number,
    context: AuditContext,
    details?: any
  ) {
    await this.log(action, action.split('_')[0], resourceId, true, context, details);
  }

  static async logSystemEvent(
    event: 'startup' | 'shutdown' | 'database_migration' | 'configuration_change',
    details?: any
  ) {
    await this.log(event, 'system', null, true, { userId: 'system' }, details);
  }
}

// Middleware to automatically log HTTP requests for sensitive endpoints
export function auditMiddleware(action: string, resource: string) {
  return async (req: Request, res: any, next: any) => {
    const context = AuditLogger.getContextFromRequest(req);
    const originalSend = res.send;
    
    res.send = function(data: any) {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      // Extract resource ID from request parameters or body
      const resourceId = req.params.id || req.body.id || null;
      
      // Log the action
      AuditLogger.log(action, resource, resourceId, success, context, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        requestBody: action.includes('create') || action.includes('update') ? req.body : undefined,
      }).catch(error => console.error('Audit logging failed:', error));
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

// Enhanced audit logging for specific business events
export class BusinessAuditLogger {
  static async logExchangeRequest(
    action: 'create' | 'update' | 'cancel' | 'complete',
    requestId: number,
    userId: string,
    context: AuditContext,
    details?: any
  ) {
    await AuditLogger.log(
      `exchange_request_${action}`,
      'exchange_request',
      requestId,
      true,
      context,
      {
        ...details,
        currency_pair: details?.fromCurrency && details?.toCurrency 
          ? `${details.fromCurrency}/${details.toCurrency}` 
          : undefined,
        amount: details?.amount,
      }
    );
  }

  static async logRateOffer(
    action: 'create' | 'accept' | 'reject' | 'withdraw',
    offerId: number,
    exchangeRequestId: number,
    userId: string,
    context: AuditContext,
    details?: any
  ) {
    await AuditLogger.log(
      `rate_offer_${action}`,
      'rate_offer',
      offerId,
      true,
      context,
      {
        ...details,
        exchange_request_id: exchangeRequestId,
        rate: details?.rate,
        amount: details?.amount,
      }
    );
  }

  static async logTransaction(
    action: 'create' | 'complete' | 'failed' | 'reversed',
    transactionId: number,
    userId: string,
    context: AuditContext,
    details?: any
  ) {
    await AuditLogger.log(
      `transaction_${action}`,
      'transaction',
      transactionId,
      action !== 'failed',
      context,
      {
        ...details,
        amount: details?.amount,
        currency: details?.currency,
        transaction_type: details?.type,
      }
    );
  }

  static async logChatMessage(
    action: 'create' | 'edit' | 'delete' | 'moderate',
    messageId: number,
    userId: string,
    context: AuditContext,
    details?: any
  ) {
    await AuditLogger.log(
      `chat_message_${action}`,
      'chat_message',
      messageId,
      true,
      context,
      {
        ...details,
        message_type: details?.messageType,
        thread_id: details?.exchangeRequestId,
      }
    );
  }
}

// Security audit logger for compliance and monitoring
export class SecurityAuditLogger {
  static async logLoginAttempt(
    userId: string,
    success: boolean,
    context: AuditContext,
    details?: any
  ) {
    await AuditLogger.log(
      success ? 'login_success' : 'login_failed',
      'authentication',
      userId,
      success,
      context,
      {
        ...details,
        login_method: details?.method || 'oauth',
        failure_reason: !success ? details?.reason : undefined,
      }
    );
  }

  static async logPermissionCheck(
    userId: string,
    permission: string,
    resource: string,
    granted: boolean,
    context: AuditContext
  ) {
    await AuditLogger.log(
      'permission_check',
      'authorization',
      `${resource}:${permission}`,
      granted,
      context,
      {
        permission,
        resource,
        user_id: userId,
        granted,
      }
    );
  }

  static async logPasswordChange(
    userId: string,
    success: boolean,
    context: AuditContext,
    details?: any
  ) {
    await AuditLogger.log(
      'password_change',
      'security',
      userId,
      success,
      context,
      {
        ...details,
        method: details?.method || 'self_service',
      }
    );
  }

  static async logAccountLockout(
    userId: string,
    reason: string,
    context: AuditContext
  ) {
    await AuditLogger.log(
      'account_lockout',
      'security',
      userId,
      true,
      context,
      {
        reason,
        lockout_duration: '30_minutes', // or whatever your policy is
      }
    );
  }

  static async logSuspiciousActivity(
    userId: string | null,
    activityType: string,
    context: AuditContext,
    details?: any
  ) {
    await AuditLogger.log(
      'suspicious_activity',
      'security',
      userId,
      false,
      context,
      {
        activity_type: activityType,
        ...details,
      }
    );
  }
}

export { AuditLogger as default };