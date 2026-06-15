# Delala — Ethiopian House Rental Marketplace

## System Architecture Document

**Version:** 1.0  
**Date:** June 5, 2026  
**Status:** Foundation — Pre-Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Technology Stack](#3-technology-stack)
4. [System Components](#4-system-components)
5. [Database Design](#5-database-design)
6. [API Design](#6-api-design)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Payment Flow](#8-payment-flow)
9. [Telegram Integration](#9-telegram-integration)
10. [Notification System](#10-notification-system)
11. [Security Architecture](#11-security-architecture)
12. [Scalability Strategy](#12-scalability-strategy)
13. [DevOps & Infrastructure](#13-devops--infrastructure)
14. [Folder Structure](#14-folder-structure)
15. [Implementation Roadmap](#15-implementation-roadmap)

---

## 1. Executive Summary

**Delala** is a production-grade Ethiopian house rental marketplace connecting property owners, brokers, and agents with rent seekers. The platform enforces a **20 ETB listing fee** (Telebirr or CBE) before publication, with admin verification and automatic Telegram channel posting upon approval.

### Core Business Rules

| Rule | Detail |
|------|--------|
| Listing fee | 20 ETB per property publication |
| Payment methods | Telebirr, CBE (manual verification) |
| Image requirements | Min 3, max 20, server-side compression |
| Publication trigger | Admin approves payment → property approved → Telegram post |
| Target market | Ethiopia (phone validation, Amharic/Oromo localization) |
| Platforms | Android, iOS, Web (single Flutter codebase) |

### User Roles & Hierarchy

```
Super Admin
    └── Admin
            └── Broker / Agent
                    └── Property Owner
                            └── Registered User
                                    └── Guest User
```

| Role | Capabilities |
|------|-------------|
| **Guest** | Browse, search, view details (no favorites/reports) |
| **Registered User** | Favorites, report listings, create draft listings |
| **Property Owner** | Post properties, manage own listings, payment submission |
| **Broker / Agent** | Post on behalf of owners, bulk management |
| **Admin** | Verify payments, approve/reject listings, manage reports, view dashboard |
| **Super Admin** | All admin powers + user role management, system settings, audit logs |

---

## 2. High-Level Architecture

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Flutter App  │  │ Flutter App  │  │ Flutter Web  │  │ Admin Web Panel  │ │
│  │   (Android)  │  │    (iOS)     │  │              │  │  (Flutter Web)   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
│         └─────────────────┴─────────────────┴───────────────────┘           │
│                                    │                                         │
│                          Firebase FCM (Push)                                   │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │ HTTPS / REST
┌────────────────────────────────────┼─────────────────────────────────────────┐
│                           EDGE LAYER                                         │
│                    ┌───────────────▼───────────────┐                         │
│                    │         Nginx (Reverse Proxy)  │                         │
│                    │  - SSL Termination             │                         │
│                    │  - Rate Limiting (edge)        │                         │
│                    │  - Static file serving         │                         │
│                    │  - Load balancing              │                         │
│                    └───────────────┬───────────────┘                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼─────────────────────────────────────────┐
│                        APPLICATION LAYER                                     │
│                    ┌───────────────▼───────────────┐                         │
│                    │     Node.js / Express API      │                         │
│                    │  ┌─────────────────────────┐  │                         │
│                    │  │   API Gateway / Routes   │  │                         │
│                    │  ├─────────────────────────┤  │                         │
│                    │  │   Middleware Stack       │  │                         │
│                    │  │  Auth · Validation · RBAC│  │                         │
│                    │  ├─────────────────────────┤  │                         │
│                    │  │   Service Layer          │  │                         │
│                    │  │  Auth · Property · Pay   │  │                         │
│                    │  │  Telegram · Notification │  │                         │
│                    │  ├─────────────────────────┤  │                         │
│                    │  │   Repository Layer       │  │                         │
│                    │  └─────────────────────────┘  │                         │
│                    └───────┬───────────┬───────────┘                         │
│                            │           │                                     │
│              ┌─────────────▼──┐   ┌────▼────────────┐                        │
│              │  Telegram Bot   │   │  Image Processor │                        │
│              │  Service        │   │  (Sharp)         │                        │
│              └─────────────┬──┘   └─────────────────┘                        │
└────────────────────────────┼─────────────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────────────────┐
│                        DATA LAYER                                            │
│         ┌──────────────────▼──────────────────┐                              │
│         │           MongoDB Atlas              │                              │
│         │  Users · Properties · Payments       │                              │
│         │  Favorites · Reports · Notifications   │                              │
│         │  TelegramPosts · AuditLogs · Settings  │                              │
│         └──────────────────────────────────────┘                              │
│         ┌──────────────────────────────────────┐                              │
│         │     File Storage (Local / S3-compat)   │                              │
│         │  Property images · Payment screenshots │                              │
│         └──────────────────────────────────────┘                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Clean Architecture Layers (Backend)

```
┌─────────────────────────────────────────┐
│  Presentation (Routes + Controllers)    │  HTTP in/out, DTO mapping
├─────────────────────────────────────────┤
│  Application (Services + Use Cases)     │  Business logic orchestration
├─────────────────────────────────────────┤
│  Domain (Models + Interfaces)           │  Entities, enums, contracts
├─────────────────────────────────────────┤
│  Infrastructure (Repositories + External)│  MongoDB, Telegram, FCM, FS
└─────────────────────────────────────────┘
```

### 2.3 Clean Architecture Layers (Flutter)

```
┌─────────────────────────────────────────┐
│  Presentation (Screens + Widgets)       │  UI, user interaction
├─────────────────────────────────────────┤
│  Application (Providers / Notifiers)    │  Riverpod state, use case calls
├─────────────────────────────────────────┤
│  Domain (Entities + Repository IFaces)  │  Pure Dart models, contracts
├─────────────────────────────────────────┤
│  Data (Repositories + Data Sources)     │  Dio API, Secure Storage, Cache
└─────────────────────────────────────────┘
```

### 2.4 Request Lifecycle

```
Client Request
    → Nginx (SSL, rate limit)
    → Express (Helmet, CORS, body parser)
    → Request ID middleware (correlation)
    → Auth middleware (JWT verify)
    → RBAC middleware (role check)
    → Validation middleware (Joi/Zod)
    → Controller (DTO in)
    → Service (business logic)
    → Repository (MongoDB)
    → Service (side effects: Telegram, FCM)
    → Controller (DTO out)
    → Response
```

---

## 3. Technology Stack

### 3.1 Frontend (Flutter)

| Package | Purpose |
|---------|---------|
| `flutter_riverpod` | State management, DI |
| `riverpod_annotation` | Code-gen providers |
| `dio` | HTTP client with interceptors |
| `go_router` | Declarative routing |
| `flutter_secure_storage` | JWT token storage |
| `cached_network_image` | Image caching |
| `firebase_messaging` | Push notifications |
| `firebase_core` | Firebase initialization |
| `flutter_localizations` | i18n (EN, AM, OM) |
| `intl` | Date/number formatting |
| `image_picker` | Property image selection |
| `url_launcher` | Call, Telegram, Maps links |
| `share_plus` | Share listings |
| `google_maps_flutter` | Map display |
| `flutter_screenutil` | Responsive sizing |
| `freezed` + `json_serializable` | Immutable models |
| `connectivity_plus` | Network status |

### 3.2 Backend (Node.js)

| Package | Purpose |
|---------|---------|
| `express` | HTTP framework |
| `mongoose` | MongoDB ODM |
| `jsonwebtoken` | JWT auth |
| `bcryptjs` | Password hashing |
| `helmet` | Security headers |
| `express-rate-limit` | Rate limiting |
| `express-mongo-sanitize` | NoSQL injection prevention |
| `xss-clean` | XSS sanitization |
| `joi` | Request validation |
| `multer` | File uploads |
| `sharp` | Image compression |
| `winston` | Structured logging |
| `node-telegram-bot-api` | Telegram integration |
| `firebase-admin` | FCM push |
| `uuid` | Request IDs |
| `compression` | Response compression |
| `cors` | Cross-origin |
| `dotenv` | Environment config |
| `pm2` | Process management |

### 3.3 Infrastructure

| Component | Purpose |
|-----------|---------|
| MongoDB Atlas | Managed database (replica set) |
| Nginx | Reverse proxy, SSL, static files |
| PM2 | Cluster mode, auto-restart |
| Let's Encrypt | SSL certificates |
| Cron / PM2 cron | Listing expiry, backup jobs |

---

## 4. System Components

### 4.1 Component Map

| Component | Responsibility |
|-----------|---------------|
| **Auth Service** | Register, login, refresh, logout, OTP-ready reset |
| **Property Service** | CRUD, search, filters, status transitions, view counting |
| **Payment Service** | Create payment intent, verify submission, admin approval |
| **Favorite Service** | Add/remove/list favorites |
| **Report Service** | Submit reports, admin review, listing suspension |
| **Notification Service** | FCM push, in-app notifications |
| **Telegram Service** | Channel posting, admin alerts, approval/rejection DMs |
| **Admin Service** | Dashboard metrics, bulk operations |
| **Media Service** | Upload, validate, compress, store images |
| **Audit Service** | Immutable action logging |
| **Settings Service** | App config, Telegram config, payment instructions |

### 4.2 Property Status State Machine

```
                    ┌─────────┐
                    │  DRAFT  │ ← User creates listing
                    └────┬────┘
                         │ submit for payment
                         ▼
              ┌──────────────────────┐
              │  PENDING_PAYMENT     │ ← Awaiting 20 ETB
              └──────────┬───────────┘
                         │ payment submitted
                         ▼
              ┌──────────────────────┐
              │  PENDING_APPROVAL    │ ← Admin reviews payment
              └──────┬───────┬───────┘
                     │       │
           approved  │       │  rejected
                     ▼       ▼
              ┌──────────┐ ┌──────────┐
              │ APPROVED │ │ REJECTED │ → can resubmit payment
              └────┬─────┘ └──────────┘
                   │ auto Telegram post
                   │ (active listing)
                   │ after 90 days (configurable)
                   ▼
              ┌──────────┐
              │ EXPIRED  │ → owner can renew (new payment)
              └──────────┘
```

### 4.3 Payment Status State Machine

```
CREATED → SUBMITTED → APPROVED → (triggers property approval)
                   └→ REJECTED → (user can resubmit)
```

---

## 5. Database Design

### 5.1 Entity Relationship Overview

```
Users ─────────────┬──── Properties (createdBy)
                   ├──── Payments (userId)
                   ├──── Favorites (userId)
                   ├──── Reports (reportedBy)
                   └──── Notifications (userId)

Properties ────────┬──── Payments (propertyId)
                   ├──── Favorites (propertyId)
                   ├──── Reports (propertyId)
                   └──── TelegramPosts (propertyId)

Users (admin) ───── Properties (approvedBy)
Users (admin) ───── Payments (verifiedBy)
Users (admin) ───── Reports (reviewedBy)
```

### 5.2 Collection: `users`

```javascript
{
  _id: ObjectId,
  fullName: String,           // required, 2-100 chars
  phoneNumber: String,        // required, unique, Ethiopian format +2519XXXXXXXX
  email: String,              // optional, unique, sparse index
  password: String,           // bcrypt hash, never returned in API
  role: Enum,                 // guest|user|owner|broker|admin|super_admin
  profileImage: String,       // URL path
  fcmTokens: [String],        // multiple devices
  isVerified: Boolean,        // phone/email verification (OTP-ready)
  status: Enum,               // active|suspended|deleted
  preferredLanguage: Enum,    // en|am|om
  listingsCount: Number,      // denormalized
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date,
  refreshTokenHash: String,   // hashed refresh token
  passwordResetOtp: {         // OTP-ready architecture
    code: String,
    expiresAt: Date,
    attempts: Number
  }
}
```

**Indexes:**
- `{ phoneNumber: 1 }` unique
- `{ email: 1 }` unique, sparse
- `{ role: 1, status: 1 }`
- `{ createdAt: -1 }`

### 5.3 Collection: `properties`

```javascript
{
  _id: ObjectId,
  title: String,              // required, 5-150 chars
  description: String,        // required, 20-5000 chars
  propertyType: Enum,         // apartment|condominium|villa|studio|compound_house|
                              // office|commercial_building|warehouse|shop
  rentPrice: Number,          // ETB, required, min 100
  depositAmount: Number,      // ETB, default 0
  isNegotiable: Boolean,

  // Location
  region: String,             // e.g., Addis Ababa
  city: String,
  subCity: String,            // e.g., Bole
  woreda: String,
  kebele: String,
  landmark: String,
  latitude: Number,
  longitude: Number,
  googleMapsLink: String,

  // Features
  bedrooms: Number,           // 0-20
  bathrooms: Number,
  kitchens: Number,
  livingRooms: Number,
  parking: Boolean,
  balcony: Boolean,
  garden: Boolean,
  fence: Boolean,
  waterAvailable: Boolean,
  electricityAvailable: Boolean,
  internetAvailable: Boolean,
  furnished: Boolean,
  petsAllowed: Boolean,
  securityGuard: Boolean,
  cctv: Boolean,
  generator: Boolean,

  // Media
  images: [{
    url: String,
    thumbnailUrl: String,
    order: Number,
    uploadedAt: Date
  }],

  // Contact
  contactPhone: String,       // Ethiopian format
  telegramUsername: String,   // optional, @username

  // Status & Metrics
  status: Enum,               // draft|pending_payment|pending_approval|
                              // approved|rejected|expired|suspended
  views: Number,              // default 0
  favoritesCount: Number,     // denormalized
  rejectionReason: String,

  // Relations
  createdBy: ObjectId,        // ref: users
  approvedBy: ObjectId,       // ref: users
  paymentId: ObjectId,        // ref: payments (current active payment)

  // Timestamps
  publishedAt: Date,          // when approved
  expiresAt: Date,            // publishedAt + 90 days
  createdAt: Date,
  updatedAt: Date,

  // Search optimization
  searchTags: [String],       // auto-generated: region, city, subCity, type
  slug: String                // URL-friendly identifier
}
```

**Indexes:**
- `{ status: 1, publishedAt: -1 }` — home page queries
- `{ status: 1, views: -1 }` — most viewed
- `{ status: 1, favoritesCount: -1 }` — most favorited
- `{ createdBy: 1, status: 1 }`
- `{ region: 1, city: 1, subCity: 1 }`
- `{ propertyType: 1, rentPrice: 1, bedrooms: 1 }` — filter compound
- `{ rentPrice: 1 }`, `{ bedrooms: 1 }`, `{ bathrooms: 1 }`
- `{ slug: 1 }` unique, sparse
- Text index: `{ title: 'text', description: 'text', landmark: 'text' }`
- `{ location: '2dsphere' }` — geo queries (geoJSON point derived)

**GeoJSON (virtual/computed):**
```javascript
location: {
  type: 'Point',
  coordinates: [longitude, latitude]
}
```

### 5.4 Collection: `payments`

```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // ref: users
  propertyId: ObjectId,       // ref: properties
  amount: Number,             // 20 (ETB), from settings
  currency: String,           // 'ETB'
  method: Enum,               // telebirr|cbe
  status: Enum,               // created|submitted|approved|rejected

  // User submission
  transactionReference: String,
  screenshotUrl: String,
  submittedAt: Date,

  // Admin verification
  verifiedBy: ObjectId,       // ref: users
  verifiedAt: Date,
  rejectionReason: String,
  adminNotes: String,

  // Payment instructions snapshot (immutable at creation)
  paymentInstructions: {
    telebirr: { accountNumber: String, accountName: String },
    cbe: { accountNumber: String, accountName: String }
  },

  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ userId: 1, createdAt: -1 }`
- `{ propertyId: 1 }`
- `{ status: 1, createdAt: -1 }` — admin pending queue
- `{ verifiedAt: 1 }` — revenue aggregation

### 5.5 Collection: `favorites`

```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // ref: users
  propertyId: ObjectId,       // ref: properties
  createdAt: Date
}
```

**Indexes:**
- `{ userId: 1, propertyId: 1 }` unique compound
- `{ userId: 1, createdAt: -1 }`

### 5.6 Collection: `reports`

```javascript
{
  _id: ObjectId,
  propertyId: ObjectId,       // ref: properties
  reportedBy: ObjectId,       // ref: users
  reason: Enum,               // scam|duplicate|wrong_info|spam|fake_photos
  description: String,        // optional details
  status: Enum,               // pending|reviewed|resolved|dismissed
  reviewedBy: ObjectId,
  reviewedAt: Date,
  adminAction: Enum,          // none|warning|suspended|deleted
  adminNotes: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ status: 1, createdAt: -1 }`
- `{ propertyId: 1 }`
- `{ reportedBy: 1, propertyId: 1 }` — prevent duplicate reports

### 5.7 Collection: `notifications`

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  type: Enum,                 // listing_approved|listing_rejected|
                              // payment_approved|payment_rejected|
                              // new_listing_nearby|system
  title: String,
  body: String,
  data: {                     // payload for deep linking
    propertyId: ObjectId,
    paymentId: ObjectId,
    action: String
  },
  isRead: Boolean,
  sentViaFcm: Boolean,
  createdAt: Date
}
```

**Indexes:**
- `{ userId: 1, isRead: 1, createdAt: -1 }`
- TTL optional: `{ createdAt: 1 }` expireAfterSeconds: 7776000 (90 days)

### 5.8 Collection: `telegram_posts`

```javascript
{
  _id: ObjectId,
  propertyId: ObjectId,
  channelId: String,
  messageId: Number,          // Telegram message ID
  postType: Enum,             // listing|notification
  status: Enum,               // sent|failed|deleted
  content: String,            // message text snapshot
  imageMessageIds: [Number],
  error: String,
  postedAt: Date,
  createdAt: Date
}
```

**Indexes:**
- `{ propertyId: 1 }`
- `{ status: 1, createdAt: -1 }`

### 5.9 Collection: `audit_logs`

```javascript
{
  _id: ObjectId,
  actorId: ObjectId,          // ref: users
  actorRole: String,
  action: String,             // e.g., 'payment.approve', 'property.reject'
  entityType: String,         // user|property|payment|report
  entityId: ObjectId,
  changes: Object,            // before/after diff
  ipAddress: String,
  userAgent: String,
  requestId: String,
  createdAt: Date
}
```

**Indexes:**
- `{ entityType: 1, entityId: 1, createdAt: -1 }`
- `{ actorId: 1, createdAt: -1 }`
- `{ createdAt: -1 }`
- TTL: `{ createdAt: 1 }` expireAfterSeconds: 31536000 (1 year)

### 5.10 Collection: `app_settings`

```javascript
{
  _id: ObjectId,
  key: String,                // unique setting key
  value: Mixed,
  category: Enum,             // general|payment|telegram|listing|notification
  updatedBy: ObjectId,
  updatedAt: Date
}
```

**Default Settings:**

| Key | Value |
|-----|-------|
| `listing_fee_etb` | 20 |
| `listing_duration_days` | 90 |
| `min_property_images` | 3 |
| `max_property_images` | 20 |
| `telebirr_account` | `{ number, name }` |
| `cbe_account` | `{ number, name }` |
| `telegram_channel_id` | `@HouseRentEthiopia` |
| `telegram_bot_token` | (encrypted) |
| `featured_areas` | `['Bole','CMC','Summit',...]` |
| `support_phone` | `+251...` |

### 5.11 Collection: `refresh_tokens` (optional separate collection for multi-device)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  tokenHash: String,
  deviceInfo: String,
  expiresAt: Date,
  createdAt: Date
}
```

**Indexes:**
- `{ userId: 1 }`
- `{ tokenHash: 1 }` unique
- TTL: `{ expiresAt: 1 }` expireAfterSeconds: 0

---

## 6. API Design

### 6.1 API Conventions

| Convention | Standard |
|------------|----------|
| Base URL | `https://api.delala.et/api/v1` |
| Auth header | `Authorization: Bearer <access_token>` |
| Content-Type | `application/json` (multipart for uploads) |
| Pagination | `?page=1&limit=20` → `{ data, meta: { page, limit, total, totalPages } }` |
| Errors | `{ success: false, error: { code, message, details[] } }` |
| Success | `{ success: true, data: {...} }` |
| Request ID | `X-Request-ID` header echoed in response |

### 6.2 Auth APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Register with phone, password |
| POST | `/auth/login` | Public | Login phone/email + password |
| POST | `/auth/refresh` | Refresh token | Issue new access token |
| POST | `/auth/logout` | User | Invalidate refresh token |
| POST | `/auth/forgot-password` | Public | OTP-ready: send reset code |
| POST | `/auth/reset-password` | Public | OTP-ready: reset with code |
| GET | `/auth/me` | User | Current user profile |
| PUT | `/auth/me` | User | Update profile |
| PUT | `/auth/me/fcm-token` | User | Register FCM token |

### 6.3 Property APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/properties` | Public | Search/list with filters & sort |
| GET | `/properties/featured` | Public | Featured listings |
| GET | `/properties/new` | Public | Recently added |
| GET | `/properties/popular` | Public | Most viewed |
| GET | `/properties/areas` | Public | Popular areas with counts |
| GET | `/properties/:id` | Public | Property details (+ view increment) |
| GET | `/properties/:id/related` | Public | Related listings |
| POST | `/properties` | Owner+ | Create property (draft) |
| PUT | `/properties/:id` | Owner+ | Update property |
| DELETE | `/properties/:id` | Owner+ | Soft delete property |
| POST | `/properties/:id/images` | Owner+ | Upload images (multipart) |
| DELETE | `/properties/:id/images/:imageId` | Owner+ | Remove image |
| POST | `/properties/:id/submit` | Owner+ | Submit for payment (draft → pending_payment) |
| GET | `/properties/my/listings` | Owner+ | User's own listings |

**Query Parameters (GET /properties):**

```
propertyType, minPrice, maxPrice, bedrooms, bathrooms,
region, city, subCity, furnished, parking, petsAllowed,
sort (newest|oldest|price_asc|price_desc|views|favorites),
page, limit, search (text)
```

### 6.4 Payment APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payments/create` | Owner+ | Create payment for property |
| GET | `/payments/instructions` | Owner+ | Get Telebirr/CBE instructions |
| POST | `/payments/:id/submit` | Owner+ | Submit ref + screenshot |
| GET | `/payments/history` | User | User payment history |
| GET | `/payments/:id` | User | Payment details |

### 6.5 Favorite APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/favorites` | User | Add favorite `{ propertyId }` |
| DELETE | `/favorites/:propertyId` | User | Remove favorite |
| GET | `/favorites` | User | List favorites (paginated) |
| GET | `/favorites/check/:propertyId` | User | Check if favorited |

### 6.6 Report APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/reports` | User | Submit report |
| GET | `/reports/my` | User | User's submitted reports |

### 6.7 Notification APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | User | List notifications |
| PUT | `/notifications/:id/read` | User | Mark as read |
| PUT | `/notifications/read-all` | User | Mark all read |
| GET | `/notifications/unread-count` | User | Unread count |

### 6.8 Admin APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/dashboard` | Admin | Dashboard metrics |
| GET | `/admin/users` | Admin | List users (filter, paginate) |
| GET | `/admin/users/:id` | Admin | User detail |
| PUT | `/admin/users/:id/status` | Admin | Suspend/activate user |
| PUT | `/admin/users/:id/role` | Super Admin | Change user role |
| GET | `/admin/properties` | Admin | All properties (all statuses) |
| PUT | `/admin/properties/:id/approve` | Admin | Approve property |
| PUT | `/admin/properties/:id/reject` | Admin | Reject with reason |
| PUT | `/admin/properties/:id/suspend` | Admin | Suspend listing |
| DELETE | `/admin/properties/:id` | Admin | Hard delete |
| GET | `/admin/payments` | Admin | Payment queue |
| PUT | `/admin/payments/:id/approve` | Admin | Approve payment → auto-approve property |
| PUT | `/admin/payments/:id/reject` | Admin | Reject payment |
| GET | `/admin/reports` | Admin | Report queue |
| PUT | `/admin/reports/:id/resolve` | Admin | Resolve report |
| GET | `/admin/settings` | Admin | Get app settings |
| PUT | `/admin/settings` | Super Admin | Update settings |
| GET | `/admin/audit-logs` | Super Admin | Audit trail |
| GET | `/admin/telegram/posts` | Admin | Telegram post history |

---

## 7. Authentication & Authorization

### 7.1 JWT Strategy

| Token | Lifetime | Storage (Flutter) |
|-------|----------|-------------------|
| Access Token | 15 minutes | Secure Storage |
| Refresh Token | 7 days | Secure Storage (httpOnly if cookie-based web) |

**Access Token Payload:**
```json
{
  "sub": "userId",
  "role": "owner",
  "phone": "+2519...",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### 7.2 Ethiopian Phone Validation

```
Accepted formats (normalized to +2519XXXXXXXX):
  +2519XXXXXXXX
  09XXXXXXXX
  9XXXXXXXX

Regex: ^(\+251|0)?9\d{8}$
```

### 7.3 RBAC Permission Matrix

| Action | Guest | User | Owner | Broker | Admin | Super Admin |
|--------|-------|------|-------|--------|-------|-------------|
| Browse properties | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create listing | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| Manage own listings | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| Favorites | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Report | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Verify payments | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Admin dashboard | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Manage roles | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| System settings | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

### 7.4 OTP-Ready Password Reset Flow

```
1. POST /auth/forgot-password { phoneNumber }
   → Generate 6-digit OTP, store hashed with expiry (5 min)
   → SMS gateway integration point (stub service for now)
   
2. POST /auth/reset-password { phoneNumber, otp, newPassword }
   → Verify OTP (max 3 attempts)
   → Hash new password, invalidate all refresh tokens
```

---

## 8. Payment Flow

### 8.1 Sequence Diagram

```
Owner                    API                    Admin                Telegram
  │                       │                       │                     │
  │── Create Property ───►│                       │                     │
  │◄── draft created ─────│                       │                     │
  │                       │                       │                     │
  │── Submit listing ────►│ status: pending_payment                     │
  │◄── payment required ──│                       │                     │
  │                       │                       │                     │
  │── POST /payments/create►│                       │                     │
  │◄── instructions ──────│ (Telebirr/CBE details)│                     │
  │                       │                       │                     │
  │  [User pays 20 ETB via Telebirr/CBE]          │                     │
  │                       │                       │                     │
  │── Submit ref + screenshot►│ status: submitted  │                     │
  │                       │── Notify admin ──────►│ (Telegram + FCM)    │
  │                       │                       │                     │
  │                       │◄── Approve payment ──│                     │
  │                       │── property: approved ─│                     │
  │◄── FCM: approved ─────│                       │                     │
  │                       │── Post to channel ──────────────────────────►│
  │                       │                       │                     │
```

### 8.2 Payment Verification Rules

1. Transaction reference must be unique (no duplicate refs across approved payments)
2. Screenshot required (JPEG/PNG, max 5MB)
3. Amount must match `listing_fee_etb` from settings
4. Property must be in `pending_payment` or `pending_approval` status
5. On approval: atomic transaction — payment approved + property approved + Telegram queued

---

## 9. Telegram Integration

### 9.1 Bot Architecture

```
TelegramBotService
├── postListingToChannel(property)     → Media group + caption
├── notifyAdmin(message)               → Admin group chat
├── notifyUserApproval(userId, property)
├── notifyUserRejection(userId, reason)
└── formatListingMessage(property)     → Template engine
```

### 9.2 Channel Post Template

```
🏠 {title}

📍 {subCity}, {city}, {region}
{landmark}

💰 {rentPrice} ETB/month
{depositAmount > 0 ? '💳 Deposit: {depositAmount} ETB' : ''}
{isNegotiable ? '🤝 Negotiable' : ''}

🛏 {bedrooms} Bedrooms
🚿 {bathrooms} Bathrooms
{ parking ? '🚗 Parking Available' : ''}
{ furnished ? '🪑 Furnished' : ''}

📞 {contactPhone}
{telegramUsername ? '✈️ @{telegramUsername}' : ''}

📝 {description truncated to 500 chars}

🔗 View Details: https://delala.et/property/{slug}

#{subCity} #{propertyType} #Ethiopia #Delala
```

### 9.3 Image Posting Strategy

- Telegram media groups support max 10 images per group
- For 3-10 images: single media group
- For 11-20 images: first group (10) + second message (remaining)
- Caption on first image only

---

## 10. Notification System

### 10.1 Notification Triggers

| Event | Recipient | Channel |
|-------|-----------|---------|
| Payment submitted | Admin | Telegram + FCM |
| Payment approved | Owner | FCM + In-app |
| Payment rejected | Owner | FCM + In-app |
| Listing approved | Owner | FCM + In-app + Telegram |
| Listing rejected | Owner | FCM + In-app |
| New listing nearby | Users in area | FCM (batched) |
| Report submitted | Admin | Telegram |
| User suspended | User | FCM + In-app |

### 10.2 FCM Payload Structure

```json
{
  "notification": { "title": "...", "body": "..." },
  "data": {
    "type": "listing_approved",
    "propertyId": "...",
    "click_action": "FLUTTER_NOTIFICATION_CLICK"
  }
}
```

---

## 11. Security Architecture

### 11.1 Security Checklist

| Layer | Measure |
|-------|---------|
| Transport | TLS 1.3 (Nginx + Let's Encrypt) |
| Headers | Helmet (CSP, HSTS, X-Frame-Options) |
| Input | Joi validation on all endpoints |
| Injection | express-mongo-sanitize, parameterized queries |
| XSS | xss-clean middleware |
| Auth | JWT short-lived + refresh rotation |
| Password | bcrypt (cost factor 12) |
| Rate Limit | 100 req/15min general, 5 req/15min auth |
| Upload | MIME validation, size limits, randomized filenames |
| RBAC | Middleware per route group |
| Audit | All admin actions logged |
| Secrets | Environment variables, never in code |
| CORS | Whitelist production domains |

### 11.2 File Upload Security

```
Allowed MIME: image/jpeg, image/png, image/webp
Max size: 5MB per image
Filename: uuid + timestamp (no user input in path)
Storage: /uploads/properties/{propertyId}/{filename}
Processing: Sharp resize (max 1920px), quality 80%, strip EXIF
```

---

## 12. Scalability Strategy

### 12.1 Horizontal Scaling Path

| Phase | Users | Architecture |
|-------|-------|-------------|
| **MVP** | 0-50K | Single VPS, PM2 cluster (2 instances), MongoDB Atlas M10 |
| **Growth** | 50K-500K | 2-3 API servers behind Nginx LB, Redis cache, M30 |
| **Scale** | 500K-2M | Auto-scaling group, Redis session/cache, read replicas, CDN |
| **Enterprise** | 2M+ | Microservices split (search, media, notifications), Elasticsearch |

### 12.2 Performance Optimizations

1. **Denormalized counters** — `views`, `favoritesCount` on properties
2. **Compound indexes** — Match exact query patterns
3. **Pagination** — Cursor-based for large datasets (future)
4. **Image CDN** — CloudFront/Cloudflare in front of uploads
5. **Response caching** — Nginx cache for public GET endpoints (60s)
6. **Connection pooling** — Mongoose pool size 10-50
7. **PM2 cluster mode** — Utilize all CPU cores
8. **Background jobs** — Listing expiry, Telegram retry queue

### 12.3 MongoDB Sharding Strategy (2M+ users)

```
Shard key: { region: 1, city: 1 } for properties
Shard key: { _id: "hashed" } for users
```

---

## 13. DevOps & Infrastructure

### 13.1 Environment Variables

```env
# Server
NODE_ENV=production
PORT=5000
API_VERSION=v1

# MongoDB
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=delala

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Upload
UPLOAD_DIR=/var/www/delala/uploads
MAX_FILE_SIZE=5242880
MAX_IMAGES_PER_PROPERTY=20

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=
TELEGRAM_ADMIN_CHAT_ID=

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Payment
LISTING_FEE_ETB=20
TELEBIRR_ACCOUNT_NUMBER=
TELEBIRR_ACCOUNT_NAME=
CBE_ACCOUNT_NUMBER=
CBE_ACCOUNT_NAME=

# App
APP_URL=https://delala.et
API_URL=https://api.delala.et
CORS_ORIGINS=https://delala.et,https://admin.delala.et

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/delala
```

### 13.2 PM2 Ecosystem

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'delala-api',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '512M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/delala/pm2-error.log',
    out_file: '/var/log/delala/pm2-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### 13.3 Nginx Configuration (Summary)

```nginx
upstream delala_api {
    least_conn;
    server 127.0.0.1:5000;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name api.delala.et;

    # SSL, security headers, rate limiting
    # proxy_pass to upstream
    # /uploads/ served directly
    # client_max_body_size 10M
}
```

### 13.4 Logging Strategy

| Level | Destination | Retention |
|-------|-------------|-----------|
| error | File + stderr | 90 days |
| warn | File | 30 days |
| info | File (production) | 14 days |
| debug | Console (dev only) | — |

**Log format:** JSON structured with `requestId`, `userId`, `method`, `path`, `statusCode`, `durationMs`

### 13.5 Backup Strategy

| Target | Frequency | Retention |
|--------|-----------|-----------|
| MongoDB Atlas snapshots | Continuous + daily | 30 days |
| Upload files (rsync/S3) | Daily | 90 days |
| App settings export | Weekly | 1 year |
| Audit logs | Atlas TTL (1 year) | Auto |

---

## 14. Folder Structure

### 14.1 Monorepo Root

```
Delala/
├── docs/
│   ├── ARCHITECTURE.md          # This document
│   ├── API.md                   # API reference
│   └── DEPLOYMENT.md            # Deployment guide
├── backend/
│   ├── src/
│   │   ├── server.js            # Entry point
│   │   ├── app.js               # Express app setup
│   │   ├── config/
│   │   │   ├── index.js         # Config loader
│   │   │   ├── database.js      # MongoDB connection
│   │   │   ├── firebase.js      # FCM admin
│   │   │   └── telegram.js      # Bot config
│   │   ├── domain/
│   │   │   ├── enums/
│   │   │   │   ├── userRole.enum.js
│   │   │   │   ├── propertyStatus.enum.js
│   │   │   │   ├── propertyType.enum.js
│   │   │   │   ├── paymentStatus.enum.js
│   │   │   │   ├── paymentMethod.enum.js
│   │   │   │   ├── reportReason.enum.js
│   │   │   │   └── notificationType.enum.js
│   │   │   └── interfaces/
│   │   │       ├── IAuthRepository.js
│   │   │       ├── IPropertyRepository.js
│   │   │       ├── IPaymentRepository.js
│   │   │       ├── IFavoriteRepository.js
│   │   │       ├── IReportRepository.js
│   │   │       ├── INotificationRepository.js
│   │   │       └── IAuditRepository.js
│   │   ├── infrastructure/
│   │   │   ├── database/
│   │   │   │   ├── models/
│   │   │   │   │   ├── User.model.js
│   │   │   │   │   ├── Property.model.js
│   │   │   │   │   ├── Payment.model.js
│   │   │   │   │   ├── Favorite.model.js
│   │   │   │   │   ├── Report.model.js
│   │   │   │   │   ├── Notification.model.js
│   │   │   │   │   ├── TelegramPost.model.js
│   │   │   │   │   ├── AuditLog.model.js
│   │   │   │   │   ├── AppSetting.model.js
│   │   │   │   │   └── RefreshToken.model.js
│   │   │   │   └── repositories/
│   │   │   │       ├── Auth.repository.js
│   │   │   │       ├── Property.repository.js
│   │   │   │       ├── Payment.repository.js
│   │   │   │       ├── Favorite.repository.js
│   │   │   │       ├── Report.repository.js
│   │   │   │       ├── Notification.repository.js
│   │   │   │       ├── Audit.repository.js
│   │   │   │       └── Settings.repository.js
│   │   │   ├── external/
│   │   │   │   ├── telegram/
│   │   │   │   │   ├── TelegramBot.service.js
│   │   │   │   │   └── messageFormatter.js
│   │   │   │   ├── firebase/
│   │   │   │   │   └── Fcm.service.js
│   │   │   │   └── sms/
│   │   │   │       └── Sms.service.js        # OTP-ready stub
│   │   │   └── storage/
│   │   │       ├── upload.middleware.js
│   │   │       └── ImageProcessor.service.js
│   │   ├── application/
│   │   │   ├── services/
│   │   │   │   ├── Auth.service.js
│   │   │   │   ├── Property.service.js
│   │   │   │   ├── Payment.service.js
│   │   │   │   ├── Favorite.service.js
│   │   │   │   ├── Report.service.js
│   │   │   │   ├── Notification.service.js
│   │   │   │   ├── Admin.service.js
│   │   │   │   ├── Audit.service.js
│   │   │   │   └── Settings.service.js
│   │   │   └── dto/
│   │   │       ├── auth.dto.js
│   │   │       ├── property.dto.js
│   │   │       ├── payment.dto.js
│   │   │       ├── favorite.dto.js
│   │   │       ├── report.dto.js
│   │   │       ├── notification.dto.js
│   │   │       └── admin.dto.js
│   │   ├── presentation/
│   │   │   ├── routes/
│   │   │   │   ├── index.js
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── property.routes.js
│   │   │   │   ├── payment.routes.js
│   │   │   │   ├── favorite.routes.js
│   │   │   │   ├── report.routes.js
│   │   │   │   ├── notification.routes.js
│   │   │   │   └── admin.routes.js
│   │   │   ├── controllers/
│   │   │   │   ├── Auth.controller.js
│   │   │   │   ├── Property.controller.js
│   │   │   │   ├── Payment.controller.js
│   │   │   │   ├── Favorite.controller.js
│   │   │   │   ├── Report.controller.js
│   │   │   │   ├── Notification.controller.js
│   │   │   │   └── Admin.controller.js
│   │   │   └── middleware/
│   │   │       ├── auth.middleware.js
│   │   │       ├── rbac.middleware.js
│   │   │       ├── validate.middleware.js
│   │   │       ├── error.middleware.js
│   │   │       ├── requestId.middleware.js
│   │   │       └── upload.middleware.js
│   │   ├── shared/
│   │   │   ├── errors/
│   │   │   │   ├── AppError.js
│   │   │   │   └── errorCodes.js
│   │   │   ├── utils/
│   │   │   │   ├── phoneValidator.js
│   │   │   │   ├── slugGenerator.js
│   │   │   │   ├── pagination.js
│   │   │   │   └── asyncHandler.js
│   │   │   └── logger/
│   │   │       └── winston.logger.js
│   │   └── jobs/
│   │       ├── expireListings.job.js
│   │       └── telegramRetry.job.js
│   ├── uploads/                  # Gitignored
│   ├── logs/                     # Gitignored
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── ecosystem.config.js
│   ├── nginx.conf
│   ├── .env.example
│   ├── package.json
│   └── Dockerfile
├── mobile/                       # Flutter app
│   ├── lib/
│   │   ├── main.dart
│   │   ├── app.dart
│   │   ├── config/
│   │   │   ├── app_config.dart
│   │   │   ├── theme/
│   │   │   │   ├── app_theme.dart
│   │   │   │   ├── app_colors.dart
│   │   │   │   └── app_typography.dart
│   │   │   └── routes/
│   │       ├── app_router.dart
│   │       └── route_names.dart
│   │   ├── core/
│   │   │   ├── constants/
│   │   │   │   ├── api_constants.dart
│   │   │   │   └── app_constants.dart
│   │   │   ├── errors/
│   │   │   │   ├── exceptions.dart
│   │   │   │   └── failures.dart
│   │   │   ├── network/
│   │   │   │   ├── dio_client.dart
│   │   │   │   ├── auth_interceptor.dart
│   │   │   │   └── api_response.dart
│   │   │   ├── storage/
│   │   │   │   └── secure_storage.dart
│   │   │   ├── utils/
│   │   │   │   ├── phone_validator.dart
│   │   │   │   ├── formatters.dart
│   │   │   │   └── extensions.dart
│   │   │   └── widgets/
│   │   │       ├── loading_widget.dart
│   │   │       ├── error_widget.dart
│   │   │       ├── empty_state_widget.dart
│   │   │       └── responsive_layout.dart
│   │   ├── l10n/
│   │   │   ├── app_en.arb
│   │   │   ├── app_am.arb
│   │   │   └── app_om.arb
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── user.dart
│   │   │   │   ├── property.dart
│   │   │   │   ├── payment.dart
│   │   │   │   ├── favorite.dart
│   │   │   │   ├── report.dart
│   │   │   │   └── notification.dart
│   │   │   ├── enums/
│   │   │   │   ├── user_role.dart
│   │   │   │   ├── property_status.dart
│   │   │   │   ├── property_type.dart
│   │   │   │   └── payment_method.dart
│   │   │   └── repositories/
│   │   │       ├── auth_repository.dart
│   │   │       ├── property_repository.dart
│   │   │       ├── payment_repository.dart
│   │   │       ├── favorite_repository.dart
│   │   │       ├── report_repository.dart
│   │   │       └── notification_repository.dart
│   │   ├── data/
│   │   │   ├── models/
│   │   │   │   ├── user_model.dart
│   │   │   │   ├── property_model.dart
│   │   │   │   ├── payment_model.dart
│   │   │   │   └── ...
│   │   │   ├── datasources/
│   │   │   │   ├── remote/
│   │   │   │   │   ├── auth_remote_datasource.dart
│   │   │   │   │   ├── property_remote_datasource.dart
│   │   │   │   │   └── ...
│   │   │   │   └── local/
│   │   │   │       └── auth_local_datasource.dart
│   │   │   └── repositories/
│   │   │       ├── auth_repository_impl.dart
│   │   │       ├── property_repository_impl.dart
│   │   │       └── ...
│   │   ├── presentation/
│   │   │   ├── providers/
│   │   │   │   ├── auth_provider.dart
│   │   │   │   ├── property_provider.dart
│   │   │   │   ├── payment_provider.dart
│   │   │   │   ├── favorite_provider.dart
│   │   │   │   ├── search_provider.dart
│   │   │   │   ├── notification_provider.dart
│   │   │   │   └── locale_provider.dart
│   │   │   ├── screens/
│   │   │   │   ├── splash/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login_screen.dart
│   │   │   │   │   ├── register_screen.dart
│   │   │   │   │   └── forgot_password_screen.dart
│   │   │   │   ├── home/
│   │   │   │   │   └── home_screen.dart
│   │   │   │   ├── search/
│   │   │   │   │   ├── search_screen.dart
│   │   │   │   │   └── filter_sheet.dart
│   │   │   │   ├── property/
│   │   │   │   │   ├── property_detail_screen.dart
│   │   │   │   │   ├── create_property_screen.dart
│   │   │   │   │   ├── edit_property_screen.dart
│   │   │   │   │   └── my_listings_screen.dart
│   │   │   │   ├── payment/
│   │   │   │   │   ├── payment_screen.dart
│   │   │   │   │   └── payment_history_screen.dart
│   │   │   │   ├── favorites/
│   │   │   │   │   └── favorites_screen.dart
│   │   │   │   ├── profile/
│   │   │   │   │   └── profile_screen.dart
│   │   │   │   ├── notifications/
│   │   │   │   │   └── notifications_screen.dart
│   │   │   │   └── admin/
│   │   │   │       ├── admin_dashboard_screen.dart
│   │   │   │       ├── admin_users_screen.dart
│   │   │   │       ├── admin_properties_screen.dart
│   │   │   │       ├── admin_payments_screen.dart
│   │   │   │       ├── admin_reports_screen.dart
│   │   │   │       └── admin_settings_screen.dart
│   │   │   └── widgets/
│   │   │       ├── property_card.dart
│   │   │       ├── property_image_gallery.dart
│   │   │       ├── search_bar_widget.dart
│   │   │       ├── feature_chip.dart
│   │   │       ├── area_chip.dart
│   │   │       ├── price_tag.dart
│   │   │       └── bottom_nav_bar.dart
│   │   └── services/
│   │       ├── notification_service.dart
│   │       └── deep_link_service.dart
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   ├── android/
│   ├── ios/
│   ├── web/
│   ├── pubspec.yaml
│   └── analysis_options.yaml
├── .gitignore
└── README.md
```

---

## 15. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

| # | Task | Deliverable |
|---|------|-------------|
| 1.1 | Initialize monorepo structure | Folder scaffolding, git, README |
| 1.2 | Backend bootstrap | Express app, MongoDB connection, Winston, Helmet, error handling |
| 1.3 | MongoDB schemas | All 10 collections with indexes |
| 1.4 | Auth module | Register, login, refresh, logout, JWT middleware, RBAC |
| 1.5 | Flutter bootstrap | Project init, theme, routing, Dio client, secure storage |
| 1.6 | Auth UI | Login, register screens with Ethiopian phone validation |
| 1.7 | Environment & DevOps | .env.example, PM2 config, Nginx template, Dockerfile |

**Exit criteria:** User can register, login, and receive JWT tokens on both platforms.

### Phase 2: Property Module (Week 3-4)

| # | Task | Deliverable |
|---|------|-------------|
| 2.1 | Property CRUD API | Create, read, update, delete with validation |
| 2.2 | Image upload service | Multer + Sharp compression, 3-20 image validation |
| 2.3 | Property search API | Filters, sorting, pagination, text search |
| 2.4 | Home page API | Featured, new, popular, areas endpoints |
| 2.5 | Flutter home screen | Hero, search bar, listing sections, area chips |
| 2.6 | Flutter search & filters | Search screen, filter sheet, sort options |
| 2.7 | Flutter property detail | Gallery, features, map, contact actions |
| 2.8 | Flutter create listing | Multi-step form, image picker, validation |

**Exit criteria:** Full property lifecycle from creation to browsing with images.

### Phase 3: Payment Module (Week 5)

| # | Task | Deliverable |
|---|------|-------------|
| 3.1 | Payment API | Create, submit, history, instructions |
| 3.2 | Payment verification flow | Admin approve/reject with atomic property transition |
| 3.3 | Flutter payment screens | Instructions, method selection, ref upload, screenshot |
| 3.4 | Payment status tracking | Real-time status in my listings |

**Exit criteria:** Complete 20 ETB payment flow with admin verification.

### Phase 4: Telegram & Notifications (Week 6)

| # | Task | Deliverable |
|---|------|-------------|
| 4.1 | Telegram bot service | Channel posting, message formatting, media groups |
| 4.2 | Admin Telegram alerts | Payment/listing notifications to admin chat |
| 4.3 | Firebase FCM integration | Backend FCM service + Flutter push handling |
| 4.4 | In-app notifications | Notification list, read/unread, deep linking |
| 4.5 | Auto-publish pipeline | Payment approved → property approved → Telegram post |

**Exit criteria:** Approved listings auto-post to Telegram channel with images.

### Phase 5: User Features (Week 7)

| # | Task | Deliverable |
|---|------|-------------|
| 5.1 | Favorites module | API + Flutter UI |
| 5.2 | Report module | API + Flutter report dialog + admin review |
| 5.3 | Share & contact actions | Share listing, call owner, open Telegram |
| 5.4 | Profile management | Edit profile, language preference, my listings |
| 5.5 | Localization | English, Amharic, Afaan Oromo ARB files |

**Exit criteria:** Full user engagement features with tri-lingual support.

### Phase 6: Admin Panel (Week 8)

| # | Task | Deliverable |
|---|------|-------------|
| 6.1 | Admin dashboard API | Metrics, revenue, counts |
| 6.2 | Admin management APIs | Users, properties, payments, reports CRUD |
| 6.3 | Audit logging | All admin actions logged |
| 6.4 | Flutter admin screens | Dashboard, queues, action buttons |
| 6.5 | Settings management | Payment accounts, Telegram config, listing fee |

**Exit criteria:** Admin can manage entire platform from Flutter admin panel.

### Phase 7: Production Hardening (Week 9-10)

| # | Task | Deliverable |
|---|------|-------------|
| 7.1 | Security audit | Rate limiting, input sanitization, file validation |
| 7.2 | Performance testing | Load test search endpoints, index optimization |
| 7.3 | Listing expiry job | Cron job for 90-day expiration |
| 7.4 | Error monitoring | Structured logging, health check endpoint |
| 7.5 | Deployment | Nginx SSL, PM2 cluster, MongoDB Atlas, backup cron |
| 7.6 | Documentation | API docs, deployment guide |

**Exit criteria:** Production deployment on VPS with SSL, monitoring, and backups.

---

## Appendix A: Popular Areas (Seed Data)

```json
[
  { "name": "Bole", "city": "Addis Ababa", "subCity": "Bole" },
  { "name": "CMC", "city": "Addis Ababa", "subCity": "CMC" },
  { "name": "Summit", "city": "Addis Ababa", "subCity": "Summit" },
  { "name": "Ayat", "city": "Addis Ababa", "subCity": "Ayat" },
  { "name": "Gerji", "city": "Addis Ababa", "subCity": "Gerji" },
  { "name": "Megenagna", "city": "Addis Ababa", "subCity": "Megenagna" },
  { "name": "Sarbet", "city": "Addis Ababa", "subCity": "Sarbet" },
  { "name": "Kazanchis", "city": "Addis Ababa", "subCity": "Kazanchis" }
]
```

## Appendix B: Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong phone/password |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT expired |
| `AUTH_FORBIDDEN` | 403 | Insufficient role |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `PROPERTY_NOT_FOUND` | 404 | Property doesn't exist |
| `PROPERTY_MIN_IMAGES` | 400 | Less than 3 images |
| `PAYMENT_ALREADY_EXISTS` | 409 | Payment already created for property |
| `PAYMENT_DUPLICATE_REF` | 409 | Transaction reference already used |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

*This document serves as the authoritative blueprint for Delala implementation. All code generation follows this architecture.*
