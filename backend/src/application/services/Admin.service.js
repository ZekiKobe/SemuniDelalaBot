const User = require('../../infrastructure/database/models/User.model');
const TelegramPost = require('../../infrastructure/database/models/TelegramPost.model');
const propertyRepository = require('../../infrastructure/database/repositories/Property.repository');
const paymentRepository = require('../../infrastructure/database/repositories/Payment.repository');
const reportRepository = require('../../infrastructure/database/repositories/Report.repository');
const requirementRepository = require('../../infrastructure/database/repositories/Requirement.repository');
const listingRepository = require('../../infrastructure/database/repositories/Listing.repository');
const auditRepository = require('../../infrastructure/database/repositories/Audit.repository');
const settingsService = require('./Settings.service');
const auditService = require('./Audit.service');
const notificationService = require('./Notification.service');
const telegramService = require('../../infrastructure/external/telegram/TelegramBot.service');
const AppError = require('../../shared/errors/AppError');
const { PropertyStatus, UserStatus, NotificationType, ListingStatus } = require('../../domain/enums');

class AdminService {
  async getDashboard() {
    const [
      totalUsers,
      totalListings,
      activeListings,
      pendingListings,
      expiredListings,
      revenue,
      pendingPayments,
      pendingReports,
      marketplaceListings,
      marketplacePendingListings,
    ] = await Promise.all([
      User.countDocuments({ status: { $ne: UserStatus.DELETED } }),
      propertyRepository.countByStatus(),
      propertyRepository.countByStatus(PropertyStatus.APPROVED),
      propertyRepository.countByStatus(PropertyStatus.PENDING_APPROVAL),
      propertyRepository.countByStatus(PropertyStatus.EXPIRED),
      paymentRepository.getRevenueStats(),
      paymentRepository.findPending(0, 1),
      reportRepository.findPending(0, 1),
      listingRepository.countByStatus(),
      listingRepository.countByStatus(ListingStatus.PENDING_APPROVAL),
    ]);

    return {
      users: { total: totalUsers },
      listings: {
        total: totalListings,
        active: activeListings,
        pending: pendingListings,
        expired: expiredListings,
      },
      revenue,
      queues: {
        pendingPayments: pendingPayments.total,
        pendingReports: pendingReports.total,
        pendingMarketplaceListings: marketplacePendingListings,
      },
      marketplace: {
        totalListings: marketplaceListings,
        pendingListings: marketplacePendingListings,
      },
    };
  }

  async getUsers(query) {
    const { page = 1, limit = 20, role, status, search } = query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { fullName: new RegExp(search, 'i') },
        { phoneNumber: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return { data, total };
  }

  async getUserById(id) {
    const user = await User.findById(id);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    return user;
  }

  async updateUserStatus(userId, status, admin, req) {
    const user = await User.findByIdAndUpdate(userId, { status }, { new: true });
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    await auditService.log({
      actor: admin,
      action: 'user.status_update',
      entityType: 'user',
      entityId: userId,
      changes: { status },
      req,
    });

    if (status === UserStatus.SUSPENDED) {
      await notificationService.createAndSend(userId, {
        type: NotificationType.SYSTEM,
        title: 'Account Suspended',
        body: 'Your account has been suspended. Contact support for assistance.',
        data: {},
      });
    }

    return user;
  }

  async updateUserRole(userId, role, admin, req) {
    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    await auditService.log({
      actor: admin,
      action: 'user.role_update',
      entityType: 'user',
      entityId: userId,
      changes: { role },
      req,
    });

    return user;
  }

  async getProperties(query) {
    const { page = 1, limit = 20, status, search, source } = query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$text = { $search: search };
    if (source === 'telegram') {
      filter.$and = [
        {
          $or: [
            { telegramUsername: { $exists: true, $nin: [null, ''] } },
            { paymentId: { $exists: false } },
            { paymentId: null },
          ],
        },
      ];
    }

    const skip = (page - 1) * limit;
    return propertyRepository.search(
      filter,
      { createdAt: -1 },
      skip,
      limit
    );
  }

  async approveProperty(propertyId, admin, req) {
    const property = await propertyRepository.findByIdRaw(propertyId);
    if (!property) throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');

    const durationDays = await settingsService.getListingDurationDays();
    const now = new Date();

    const updated = await propertyRepository.update(propertyId, {
      status: PropertyStatus.APPROVED,
      approvedBy: admin._id,
      publishedAt: now,
      expiresAt: new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000),
    });

    await auditService.log({
      actor: admin,
      action: 'property.approve',
      entityType: 'property',
      entityId: propertyId,
      req,
    });

    await notificationService.createAndSend(property.createdBy, {
      type: NotificationType.LISTING_APPROVED,
      title: 'Listing Approved',
      body: `Your property "${property.title}" has been approved.`,
      data: { propertyId: propertyId.toString() },
    });

    const fullProperty = await propertyRepository.findById(propertyId);
    try {
      await telegramService.postListingToChannel(fullProperty);
    } catch {
      // Non-blocking
    }

    return updated;
  }

  async rejectProperty(propertyId, admin, rejectionReason, req) {
    const property = await propertyRepository.findByIdRaw(propertyId);
    if (!property) throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');

    const updated = await propertyRepository.update(propertyId, {
      status: PropertyStatus.REJECTED,
      rejectionReason,
    });

    await auditService.log({
      actor: admin,
      action: 'property.reject',
      entityType: 'property',
      entityId: propertyId,
      changes: { rejectionReason },
      req,
    });

    await notificationService.createAndSend(property.createdBy, {
      type: NotificationType.LISTING_REJECTED,
      title: 'Listing Rejected',
      body: rejectionReason,
      data: { propertyId: propertyId.toString() },
    });

    return updated;
  }

  async suspendProperty(propertyId, admin, req) {
    const updated = await propertyRepository.update(propertyId, {
      status: PropertyStatus.SUSPENDED,
    });

    await auditService.log({
      actor: admin,
      action: 'property.suspend',
      entityType: 'property',
      entityId: propertyId,
      req,
    });

    return updated;
  }

  async getPayments(query) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    if (status === 'submitted' || !status) {
      return paymentRepository.findPending(skip, limit);
    }

    const filter = status ? { status } : {};
    return paymentRepository.findAll(filter, skip, limit);
  }

  async getReports(query) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    return reportRepository.findPending(skip, limit);
  }

  async getSettings() {
    return settingsService.getAllSettings();
  }

  async updateSettings(settings, admin) {
    await settingsService.updateSettings(settings, admin._id);
    return settingsService.getAllSettings();
  }

  async getAuditLogs(query) {
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;
    return auditRepository.findAll(skip, limit);
  }

  async getTelegramPosts(query) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      TelegramPost.find()
        .populate('propertyId', 'title slug')
        .populate('listingId', 'title slug')
        .populate('requirementId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TelegramPost.countDocuments(),
    ]);
    return { data, total };
  }

  async getRequirements(query) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { title: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { contactPhone: new RegExp(search, 'i') },
    ];
    return requirementRepository.findAll(filter, skip, limit);
  }

  async getMarketplaceListings(query) {
    const { page = 1, limit = 20, status, listingType, search } = query;
    const skip = (page - 1) * limit;
    const filter = {};
    if (status) filter.status = status;
    if (listingType) filter.listingType = listingType;
    if (search) filter.$text = { $search: search };
    return listingRepository.search(filter, { createdAt: -1 }, skip, limit);
  }

  async approveMarketplaceListing(listingId, admin, req) {
    const listing = await listingRepository.findByIdRaw(listingId);
    if (!listing) throw new AppError('Listing not found', 404, 'LISTING_NOT_FOUND');

    const durationDays = await settingsService.getListingDurationDays();
    const now = new Date();
    const updated = await listingRepository.update(listingId, {
      status: ListingStatus.APPROVED,
      approvedBy: admin._id,
      publishedAt: now,
      expiresAt: new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000),
      rejectionReason: undefined,
    });

    await auditService.log({
      actor: admin,
      action: 'marketplace_listing.approve',
      entityType: 'marketplace_listing',
      entityId: listingId,
      req,
    });

    await notificationService.createAndSend(listing.sellerId, {
      type: NotificationType.LISTING_APPROVED,
      title: 'Listing Approved',
      body: `Your listing "${listing.title}" has been approved.`,
      data: { listingId: listingId.toString() },
    });

    const fullListing = await listingRepository.findById(listingId);
    try {
      await telegramService.postMarketplaceListingToChannel(fullListing);
    } catch {
      // Non-blocking
    }

    return updated;
  }

  async rejectMarketplaceListing(listingId, admin, rejectionReason, req) {
    const listing = await listingRepository.findByIdRaw(listingId);
    if (!listing) throw new AppError('Listing not found', 404, 'LISTING_NOT_FOUND');

    const updated = await listingRepository.update(listingId, {
      status: ListingStatus.REJECTED,
      rejectionReason,
    });

    await auditService.log({
      actor: admin,
      action: 'marketplace_listing.reject',
      entityType: 'marketplace_listing',
      entityId: listingId,
      changes: { rejectionReason },
      req,
    });

    await notificationService.createAndSend(listing.sellerId, {
      type: NotificationType.LISTING_REJECTED,
      title: 'Listing Rejected',
      body: rejectionReason,
      data: { listingId: listingId.toString() },
    });

    return updated;
  }

  async approveRequirement(requirementId, admin, req) {
    const requirement = await requirementRepository.findById(requirementId);
    if (!requirement) throw new AppError('Requirement not found', 404, 'REQUIREMENT_NOT_FOUND');

    await requirementRepository.update(requirementId, {
      status: 'approved'
    });

    await auditService.log({
      actor: admin,
      action: 'requirement.approve',
      entityType: 'requirement',
      entityId: requirementId,
      req,
    });

    try {
      await notificationService.createAndSend(requirement.createdBy, {
        type: NotificationType.LISTING_APPROVED,
        title: 'Requirement Approved',
        body: `Your requirement "${requirement.title}" has been approved.`,
        data: { requirementId: requirementId.toString() },
      });

      const updatedRequirement = await requirementRepository.findById(requirementId);
      try {
        await telegramService.postRequirementToChannel(updatedRequirement);
      } catch {
        // Non-blocking
      }

      // Try to send a Telegram DM if the user has a telegram username or chat id
      const createdByUser = await User.findById(requirement.createdBy);
      try {
        const tgHandle = createdByUser?.telegramUsername || createdByUser?.telegramChatId;
        if (tgHandle) {
          await telegramService.notifyUser(tgHandle, `✅ Your requirement "${requirement.title}" has been approved.`);
        }
      } catch (tgErr) {
        // ignore
      }
    } catch (err) {
      // non-blocking
    }

    return await requirementRepository.findById(requirementId);
  }

  async rejectRequirement(requirementId, admin, rejectionReason, req) {
    const requirement = await requirementRepository.findById(requirementId);
    if (!requirement) throw new AppError('Requirement not found', 404, 'REQUIREMENT_NOT_FOUND');

    await requirementRepository.update(requirementId, {
      status: 'rejected',
      rejectionReason,
    });

    await auditService.log({
      actor: admin,
      action: 'requirement.reject',
      entityType: 'requirement',
      entityId: requirementId,
      changes: { rejectionReason },
      req,
    });

    try {
      await notificationService.createAndSend(requirement.createdBy, {
        type: 'payment_rejected',
        title: 'Requirement Rejected',
        body: rejectionReason,
        data: { requirementId: requirementId.toString() },
      });
      // Try to send a Telegram DM if available
      const createdByUser = await User.findById(requirement.createdBy);
      try {
        const tgHandle = createdByUser?.telegramUsername || createdByUser?.telegramChatId;
        if (tgHandle) {
          await telegramService.notifyUser(tgHandle, `❌ Your requirement "${requirement.title}" was rejected: ${rejectionReason}`);
        }
      } catch (tgErr) {
        // ignore
      }
    } catch (err) {
      // non-blocking
    }

    return await requirementRepository.findById(requirementId);
  }
}

module.exports = new AdminService();
