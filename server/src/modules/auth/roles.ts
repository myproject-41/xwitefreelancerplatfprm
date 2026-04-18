export enum Role {
  FREELANCER = 'FREELANCER',
  COMPANY = 'COMPANY',
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN',
}

// What each role can do
export const RolePermissions = {
  [Role.FREELANCER]: [
    'task:read',
    'task:bid',
    'proposal:create',
    'proposal:read',
    'profile:update',
    'chat:send',
    'review:create',
    'wallet:read',
    'wallet:withdraw',
  ],
  [Role.COMPANY]: [
    'task:create',
    'task:read',
    'task:update',
    'task:delete',
    'proposal:read',
    'proposal:accept',
    'proposal:reject',
    'profile:update',
    'chat:send',
    'review:create',
    'escrow:create',
    'wallet:read',
  ],
  [Role.CLIENT]: [
    'task:create',
    'task:read',
    'task:update',
    'proposal:create',
    'proposal:read',
    'proposal:accept',
    'profile:update',
    'chat:send',
    'review:create',
    'escrow:create',
    'wallet:read',
  ],
  [Role.ADMIN]: ['*'], // full access
}

export const hasPermission = (role: Role, permission: string): boolean => {
  const permissions = RolePermissions[role]
  return permissions.includes('*') || permissions.includes(permission)
}
