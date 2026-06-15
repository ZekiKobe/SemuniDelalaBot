# Delala — Ethiopian House Rental Marketplace

Production-ready rental marketplace for Ethiopia. Property owners pay **20 ETB** (Telebirr/CBE) to publish listings. Approved listings are auto-posted to Telegram.

## Project Structure

```
Delala/
├── backend/          # Node.js + Express API
├── mobile/           # Flutter app (Android, iOS, Web)
└── docs/             # Architecture documentation
```

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- Flutter 3.9+
- (Optional) Telegram Bot Token, Firebase credentials

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets

npm install
npm run seed          # Creates super admin: +251911000000 / Admin@123
npm run dev           # Development server on :5000
```

**API Base URL:** `http://localhost:5000/api/v1`

### Flutter App

```bash
cd mobile
flutter pub get
flutter gen-l10n

# Run with API URL (use 10.0.2.2 for Android emulator)
flutter run --dart-define=API_BASE_URL=http://localhost:5000/api/v1
```

### Production Deployment

```bash
# Backend
cd backend
pm2 start ecosystem.config.js --env production

# Nginx: copy nginx.conf to /etc/nginx/sites-available/
# SSL: certbot --nginx -d api.delala.et
```

## Default Super Admin

| Field | Value |
|-------|-------|
| Phone | +251911000000 |
| Password | Admin@123 |

Change immediately in production.

## Key Features

- JWT auth with refresh tokens
- Property CRUD with image compression (Sharp)
- 20 ETB payment flow (Telebirr/CBE manual verification)
- Telegram channel auto-posting
- Firebase push notifications (FCM)
- Favorites, reports, admin dashboard
- Multi-language: English, Amharic, Afaan Oromo
- Role-based access: User, Owner, Broker, Admin, Super Admin

## API Endpoints

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full API reference.

## Environment Variables

See `backend/.env.example` for all configuration options.
