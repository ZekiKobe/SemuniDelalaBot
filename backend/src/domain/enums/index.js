const UserRole = {
  GUEST: 'guest',
  USER: 'user',
  OWNER: 'owner',
  BROKER: 'broker',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

const UserStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
};

const PropertyStatus = {
  DRAFT: 'draft',
  PENDING_PAYMENT: 'pending_payment',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
};

const ListingType = {
  HOUSE_RENT: 'house_rent',
  HOUSE_SALE: 'house_sale',
  PRODUCT_SALE: 'product_sale',
};

const RequirementType = {
  WANT_TO_RENT: 'want_to_rent',
  WANT_TO_BUY: 'want_to_buy',
};

const ListingStatus = {
  DRAFT: 'draft',
  PENDING_PAYMENT: 'pending_payment',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  SOLD: 'sold',
};

const ProductCondition = {
  NEW: 'new',
  USED: 'used',
  REFURBISHED: 'refurbished',
};

const PropertyType = {
  APARTMENT: 'apartment',
  CONDOMINIUM: 'condominium',
  VILLA: 'villa',
  STUDIO: 'studio',
  COMPOUND_HOUSE: 'compound_house',
  OFFICE: 'office',
  COMMERCIAL_BUILDING: 'commercial_building',
  WAREHOUSE: 'warehouse',
  SHOP: 'shop',
};

const PaymentStatus = {
  CREATED: 'created',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const PaymentMethod = {
  TELEBIRR: 'telebirr',
  CBE: 'cbe',
};

const ReportReason = {
  SCAM: 'scam',
  DUPLICATE: 'duplicate',
  WRONG_INFO: 'wrong_info',
  SPAM: 'spam',
  FAKE_PHOTOS: 'fake_photos',
};

const ReportStatus = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
};

const AdminAction = {
  NONE: 'none',
  WARNING: 'warning',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
};

const NotificationType = {
  LISTING_APPROVED: 'listing_approved',
  LISTING_REJECTED: 'listing_rejected',
  PAYMENT_APPROVED: 'payment_approved',
  PAYMENT_REJECTED: 'payment_rejected',
  NEW_LISTING_NEARBY: 'new_listing_nearby',
  SYSTEM: 'system',
};

const TelegramPostStatus = {
  SENT: 'sent',
  FAILED: 'failed',
  DELETED: 'deleted',
};

const TelegramPostType = {
  LISTING: 'listing',
  REQUIREMENT: 'requirement',
  MARKETPLACE_LISTING: 'marketplace_listing',
  NOTIFICATION: 'notification',
};

const PreferredLanguage = {
  EN: 'en',
  AM: 'am',
  OM: 'om',
};

const SettingCategory = {
  GENERAL: 'general',
  PAYMENT: 'payment',
  TELEGRAM: 'telegram',
  LISTING: 'listing',
  NOTIFICATION: 'notification',
};

const OWNER_ROLES = [UserRole.OWNER, UserRole.BROKER, UserRole.ADMIN, UserRole.SUPER_ADMIN];
const LISTING_ROLES = [UserRole.USER, ...OWNER_ROLES];
const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

module.exports = {
  UserRole,
  UserStatus,
  PropertyStatus,
  ListingType,
  RequirementType,
  ListingStatus,
  ProductCondition,
  PropertyType,
  PaymentStatus,
  PaymentMethod,
  ReportReason,
  ReportStatus,
  AdminAction,
  NotificationType,
  TelegramPostStatus,
  TelegramPostType,
  PreferredLanguage,
  SettingCategory,
  OWNER_ROLES,
  LISTING_ROLES,
  ADMIN_ROLES,
};
