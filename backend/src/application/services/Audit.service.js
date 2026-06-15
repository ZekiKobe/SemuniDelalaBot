const auditRepository = require('../../infrastructure/database/repositories/Audit.repository');

class AuditService {
  async log({ actor, action, entityType, entityId, changes, req }) {
    return auditRepository.log({
      actorId: actor?._id,
      actorRole: actor?.role,
      action,
      entityType,
      entityId,
      changes,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      requestId: req?.requestId,
    });
  }
}

module.exports = new AuditService();
