const logger = require('../utils/logger');

const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());

    if (!normalizedAllowedRoles.includes(userRole)) {
      logger.warn(`[roleMiddleware] Access denied. userRole "${userRole}" not in allowedRoles`, { allowedRoles: normalizedAllowedRoles });
      return res.status(403).json({ error: 'Access denied. Insufficient permissions' });
    }

    next();
  };
};

module.exports = roleMiddleware;