export const routesConfigAuth = { auth: true, roles: ['user', 'admin'] };
export const routesConfigTwofa = { auth: true, roles: ['user', 'admin', '2fa'] };
export const rateLimitConfigLow = { max: 5, timeWindow: '1 minute' };
export const rateLimitConfigMid = { max: 30, timeWindow: '1 minute' };
export const rateLimitConfigHigh = { max: 100, timeWindow: '1 minute' };
