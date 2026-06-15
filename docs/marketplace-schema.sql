CREATE TABLE users (
  id UUID PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  full_name VARCHAR(150),
  username VARCHAR(100),
  phone VARCHAR(30),
  role VARCHAR(30) DEFAULT 'user',
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES categories(id),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  icon VARCHAR(80),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE listings (
  id UUID PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES users(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  subcategory_id UUID REFERENCES categories(id),
  listing_type VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(14,2),
  currency VARCHAR(10) DEFAULT 'ETB',
  is_negotiable BOOLEAN DEFAULT FALSE,
  contact_phone VARCHAR(30) NOT NULL,
  telegram_username VARCHAR(100),
  status VARCHAR(40) DEFAULT 'draft',
  views INT DEFAULT 0,
  favorites_count INT DEFAULT 0,
  rejection_reason TEXT,
  approved_by UUID REFERENCES users(id),
  published_at TIMESTAMP,
  expires_at TIMESTAMP,
  slug VARCHAR(220) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE listing_locations (
  id UUID PRIMARY KEY,
  listing_id UUID UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  region VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  sub_city VARCHAR(100),
  area VARCHAR(150),
  address TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7)
);

CREATE TABLE listing_images (
  id UUID PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE property_details (
  listing_id UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  bedrooms INT,
  bathrooms INT,
  area DECIMAL(10,2),
  area_unit VARCHAR(20) DEFAULT 'sqm',
  parking BOOLEAN,
  furnished BOOLEAN,
  property_type VARCHAR(80)
);

CREATE TABLE product_details (
  listing_id UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  condition VARCHAR(40),
  brand VARCHAR(100),
  model VARCHAR(100),
  manufacture_year INT,
  warranty BOOLEAN
);

CREATE TABLE requirements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  category_id UUID REFERENCES categories(id),
  subcategory_id UUID REFERENCES categories(id),
  requirement_type VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  min_budget DECIMAL(14,2),
  max_budget DECIMAL(14,2),
  preferred_location TEXT,
  contact_phone VARCHAR(30),
  status VARCHAR(40) DEFAULT 'pending_approval',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE favorites (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, listing_id)
);

CREATE TABLE listing_views (
  id UUID PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  ip_address VARCHAR(80),
  user_agent TEXT,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent ON categories(parent_id, sort_order);
CREATE INDEX idx_listings_type_status ON listings(listing_type, status);
CREATE INDEX idx_listings_category_status ON listings(category_id, subcategory_id, status);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listing_locations_city ON listing_locations(city, sub_city);
CREATE INDEX idx_product_details_condition ON product_details(condition);
CREATE INDEX idx_requirements_type_status ON requirements(requirement_type, status);
