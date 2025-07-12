// RBAC permission constants and utility functions

export const PERMISSIONS = {
  // User management
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_SUSPEND: 'users:suspend',
  USERS_UNSUSPEND: 'users:unsuspend',
  
  // Role management
  ROLES_VIEW: 'roles:view',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  ROLES_ASSIGN: 'roles:assign',
  
  // Exchange requests
  EXCHANGE_REQUESTS_VIEW_ALL: 'exchange_requests:view_all',
  EXCHANGE_REQUESTS_CREATE: 'exchange_requests:create',
  EXCHANGE_REQUESTS_UPDATE: 'exchange_requests:update',
  EXCHANGE_REQUESTS_DELETE: 'exchange_requests:delete',
  EXCHANGE_REQUESTS_MODERATE: 'exchange_requests:moderate',
  
  // Rate offers
  RATE_OFFERS_VIEW_ALL: 'rate_offers:view_all',
  RATE_OFFERS_CREATE: 'rate_offers:create',
  RATE_OFFERS_UPDATE: 'rate_offers:update',
  RATE_OFFERS_DELETE: 'rate_offers:delete',
  RATE_OFFERS_MODERATE: 'rate_offers:moderate',
  
  // Transactions
  TRANSACTIONS_VIEW_ALL: 'transactions:view_all',
  TRANSACTIONS_CREATE: 'transactions:create',
  TRANSACTIONS_UPDATE: 'transactions:update',
  TRANSACTIONS_DELETE: 'transactions:delete',
  
  // Chat and messaging
  CHAT_VIEW_ALL: 'chat:view_all',
  CHAT_MODERATE: 'chat:moderate',
  CHAT_DELETE: 'chat:delete',
  
  // System administration
  SYSTEM_SETTINGS: 'system:settings',
  SYSTEM_AUDIT: 'system:audit',
  SYSTEM_BACKUP: 'system:backup',
  SYSTEM_MAINTENANCE: 'system:maintenance',
  
  // Reports and analytics
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  ANALYTICS_VIEW: 'analytics:view',
} as const;

export const ROLE_PERMISSIONS = {
  trader: [
    PERMISSIONS.EXCHANGE_REQUESTS_CREATE,
    PERMISSIONS.RATE_OFFERS_CREATE,
    PERMISSIONS.TRANSACTIONS_CREATE,
  ],
  moderator: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.EXCHANGE_REQUESTS_VIEW_ALL,
    PERMISSIONS.EXCHANGE_REQUESTS_MODERATE,
    PERMISSIONS.RATE_OFFERS_VIEW_ALL,
    PERMISSIONS.RATE_OFFERS_MODERATE,
    PERMISSIONS.CHAT_VIEW_ALL,
    PERMISSIONS.CHAT_MODERATE,
    PERMISSIONS.REPORTS_VIEW,
  ],
  admin: [
    // All permissions
    ...Object.values(PERMISSIONS),
  ],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export type PermissionValue = typeof PERMISSIONS[PermissionKey];

export function hasPermission(userPermissions: string[], permission: PermissionValue): boolean {
  return userPermissions.includes(permission);
}

export function hasAnyPermission(userPermissions: string[], permissions: PermissionValue[]): boolean {
  return permissions.some(permission => userPermissions.includes(permission));
}

export function hasAllPermissions(userPermissions: string[], permissions: PermissionValue[]): boolean {
  return permissions.every(permission => userPermissions.includes(permission));
}

export function getRolePermissions(role: string): PermissionValue[] {
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
}

export function canAccessResource(userPermissions: string[], resource: string, action: string): boolean {
  const permission = `${resource}:${action}` as PermissionValue;
  return hasPermission(userPermissions, permission);
}

export function isAdminRole(role: string): boolean {
  return role === 'admin';
}

export function isModeratorRole(role: string): boolean {
  return role === 'moderator';
}

export function isSuspendedUser(role: string, status: string): boolean {
  return role === 'suspended' || status === 'suspended';
}

export const PERMISSION_CATEGORIES = {
  'User Management': [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_SUSPEND,
    PERMISSIONS.USERS_UNSUSPEND,
  ],
  'Role Management': [
    PERMISSIONS.ROLES_VIEW,
    PERMISSIONS.ROLES_CREATE,
    PERMISSIONS.ROLES_UPDATE,
    PERMISSIONS.ROLES_DELETE,
    PERMISSIONS.ROLES_ASSIGN,
  ],
  'Exchange Management': [
    PERMISSIONS.EXCHANGE_REQUESTS_VIEW_ALL,
    PERMISSIONS.EXCHANGE_REQUESTS_CREATE,
    PERMISSIONS.EXCHANGE_REQUESTS_UPDATE,
    PERMISSIONS.EXCHANGE_REQUESTS_DELETE,
    PERMISSIONS.EXCHANGE_REQUESTS_MODERATE,
    PERMISSIONS.RATE_OFFERS_VIEW_ALL,
    PERMISSIONS.RATE_OFFERS_CREATE,
    PERMISSIONS.RATE_OFFERS_UPDATE,
    PERMISSIONS.RATE_OFFERS_DELETE,
    PERMISSIONS.RATE_OFFERS_MODERATE,
  ],
  'Financial Management': [
    PERMISSIONS.TRANSACTIONS_VIEW_ALL,
    PERMISSIONS.TRANSACTIONS_CREATE,
    PERMISSIONS.TRANSACTIONS_UPDATE,
    PERMISSIONS.TRANSACTIONS_DELETE,
  ],
  'Communication': [
    PERMISSIONS.CHAT_VIEW_ALL,
    PERMISSIONS.CHAT_MODERATE,
    PERMISSIONS.CHAT_DELETE,
  ],
  'System Administration': [
    PERMISSIONS.SYSTEM_SETTINGS,
    PERMISSIONS.SYSTEM_AUDIT,
    PERMISSIONS.SYSTEM_BACKUP,
    PERMISSIONS.SYSTEM_MAINTENANCE,
  ],
  'Analytics & Reports': [
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
} as const;