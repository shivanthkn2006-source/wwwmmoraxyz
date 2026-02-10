// Stub - securityConfig removed (M'mora security only)
export const ROOT_ADMINS: string[] = [];
export const ADMIN_PHONES: string[] = [];
export const isRootAdmin = (_userId?: string) => false;
export const logSecurityEvent = (..._args: any[]) => {};
export const notifyAdmins = (..._args: any[]) => {};
export const SECURITY_EVENTS = {} as Record<string, string>;
export const SECURITY_CATEGORIES = {} as Record<string, string>;
