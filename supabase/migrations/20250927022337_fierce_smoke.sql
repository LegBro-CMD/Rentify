-- Rentify Database Schema
-- Create database
CREATE DATABASE IF NOT EXISTS rentify_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rentify_db;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Listings table
CREATE TABLE listings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL, -- Combined city, country for display
    price DECIMAL(10,2) NOT NULL,
    bedrooms INT NOT NULL,
    bathrooms DECIMAL(3,1) NOT NULL,
    max_guests INT NOT NULL,
    property_type ENUM('apartment', 'house', 'studio', 'condo', 'loft') NOT NULL,
    host_name VARCHAR(255) NOT NULL,
    host_id INT,
    rating DECIMAL(3,2) DEFAULT 4.5,
    review_count INT DEFAULT 0,
    status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Amenities table
CREATE TABLE amenities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Listing amenities junction table
CREATE TABLE listing_amenities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    listing_id INT NOT NULL,
    amenity_id INT NOT NULL,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE,
    UNIQUE KEY unique_listing_amenity (listing_id, amenity_id)
);

-- Listing images table
CREATE TABLE listing_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    listing_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Bookings table
CREATE TABLE bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    listing_id INT NOT NULL,
    guest_id INT,
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(20),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    contract_signed BOOLEAN DEFAULT FALSE,
    contract_url VARCHAR(500),
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Reviews table
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    listing_id INT NOT NULL,
    booking_id INT,
    guest_id INT,
    guest_name VARCHAR(255) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default amenities
INSERT INTO amenities (name, icon) VALUES
('WiFi', 'fas fa-wifi'),
('Kitchen', 'fas fa-utensils'),
('Parking', 'fas fa-car'),
('Air Conditioning', 'fas fa-snowflake'),
('Pool', 'fas fa-swimming-pool'),
('Gym', 'fas fa-dumbbell'),
('Balcony', 'fas fa-building'),
('Laundry', 'fas fa-tshirt'),
('Desk', 'fas fa-desk'),
('Pet Friendly', 'fas fa-paw'),
('Security', 'fas fa-shield-alt'),
('Elevator', 'fas fa-elevator'),
('Garden', 'fas fa-leaf'),
('Rooftop', 'fas fa-building'),
('Concierge', 'fas fa-concierge-bell');

-- Insert sample listings
INSERT INTO listings (title, description, address, city, country, location, price, bedrooms, bathrooms, max_guests, property_type, host_name, rating, review_count) VALUES
('Modern Makati Condo', 'Luxurious 2-bedroom condominium in the heart of Makati CBD with stunning city skyline views. Perfect for business travelers and professionals. Walking distance to Ayala Triangle and Greenbelt Mall.', '1234 Ayala Avenue', 'Makati City', 'Philippines', 'Makati City, Metro Manila', 3500.00, 2, 2.0, 4, 'condo', 'Maria Santos', 4.8, 24),
('Cozy Studio Near UP Diliman', 'Perfect for students and young professionals! Clean, fully-furnished studio apartment just 5 minutes walk from UP Diliman campus. Includes high-speed internet, study area, and kitchen essentials.', '567 Katipunan Avenue', 'Quezon City', 'Philippines', 'Quezon City, Metro Manila', 2200.00, 1, 1.0, 2, 'studio', 'Juan Dela Cruz', 4.6, 18),
('Luxury BGC Penthouse', 'Exclusive 3-bedroom penthouse in Bonifacio Global City with panoramic views of Manila skyline. Premium amenities include infinity pool, gym, and 24/7 concierge service. Walking distance to High Street and The Fort.', '890 Bonifacio High Street', 'Taguig City', 'Philippines', 'Taguig City, Metro Manila', 8500.00, 3, 3.0, 6, 'apartment', 'Ana Reyes', 4.9, 31),
('Ortigas Center Executive Suite', 'Sophisticated 1-bedroom executive suite in Ortigas CBD. Ideal for business executives with easy access to major corporations and shopping centers. Features modern amenities and city views.', '456 EDSA Extension', 'Pasig City', 'Philippines', 'Pasig City, Metro Manila', 2800.00, 1, 1.0, 2, 'apartment', 'Maria Santos', 4.7, 15),
('Alabang Family House', 'Spacious 4-bedroom house in peaceful Alabang subdivision. Perfect for families visiting Metro Manila. Features private garden, garage, and family-friendly amenities. Near Alabang Town Center.', '123 Acacia Street, Ayala Alabang', 'Muntinlupa City', 'Philippines', 'Muntinlupa City, Metro Manila', 4500.00, 4, 3.0, 8, 'house', 'Juan Dela Cruz', 4.8, 22),
('Eastwood City Loft', 'Modern industrial-style loft in vibrant Eastwood City. Perfect for creative professionals and night owls. Walking distance to restaurants, bars, and entertainment venues. 24/7 security and amenities.', '789 Eastwood Avenue', 'Quezon City', 'Philippines', 'Quezon City, Metro Manila', 3200.00, 2, 1.0, 4, 'loft', 'Ana Reyes', 4.5, 12);

-- Insert sample listing amenities
INSERT INTO listing_amenities (listing_id, amenity_id) VALUES
-- Modern Makati Condo amenities
(1, 1), (1, 2), (1, 3), (1, 4), (1, 6), (1, 7), (1, 12), (1, 11), (1, 15),
-- Cozy Studio amenities
(2, 1), (2, 2), (2, 4), (2, 9), (2, 8), (2, 11),
-- Luxury BGC Penthouse amenities
(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 7), (3, 8), (3, 11), (3, 12), (3, 14), (3, 15),
-- Ortigas Executive Suite amenities
(4, 1), (4, 2), (4, 4), (4, 6), (4, 9), (4, 11), (4, 12),
-- Alabang Family House amenities
(5, 1), (5, 2), (5, 3), (5, 4), (5, 8), (5, 10), (5, 11), (5, 13),
-- Eastwood Loft amenities
(6, 1), (6, 2), (6, 4), (6, 6), (6, 7), (6, 11), (6, 12);

-- Insert sample listing images
INSERT INTO listing_images (listing_id, image_url, is_primary) VALUES
(1, 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg', TRUE),
(1, 'https://images.pexels.com/photos/1571467/pexels-photo-1571467.jpeg', FALSE),
(1, 'https://images.pexels.com/photos/2029667/pexels-photo-2029667.jpeg', FALSE),
(2, 'https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg', TRUE),
(2, 'https://images.pexels.com/photos/1571463/pexels-photo-1571463.jpeg', FALSE),
(3, 'https://images.pexels.com/photos/1571453/pexels-photo-1571453.jpeg', TRUE),
(3, 'https://images.pexels.com/photos/1571452/pexels-photo-1571452.jpeg', FALSE),
(3, 'https://images.pexels.com/photos/2029694/pexels-photo-2029694.jpeg', FALSE),
(4, 'https://images.pexels.com/photos/2029541/pexels-photo-2029541.jpeg', TRUE),
(4, 'https://images.pexels.com/photos/2029557/pexels-photo-2029557.jpeg', FALSE),
(5, 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg', TRUE),
(5, 'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg', FALSE),
(5, 'https://images.pexels.com/photos/1396125/pexels-photo-1396125.jpeg', FALSE),
(6, 'https://images.pexels.com/photos/2029670/pexels-photo-2029670.jpeg', TRUE),
(6, 'https://images.pexels.com/photos/2029676/pexels-photo-2029676.jpeg', FALSE);

-- Insert sample bookings
INSERT INTO bookings (listing_id, guest_name, guest_email, check_in, check_out, guests, total_price, status, contract_signed) VALUES
(1, 'John Doe', 'john@example.com', '2024-02-15', '2024-02-20', 2, 17500.00, 'confirmed', TRUE),
(2, 'Alice Smith', 'alice@example.com', '2024-02-10', '2024-02-12', 1, 4400.00, 'pending', FALSE),
(3, 'Bob Johnson', 'bob@example.com', '2024-03-01', '2024-03-05', 4, 34000.00, 'confirmed', TRUE),
(4, 'Sarah Wilson', 'sarah@example.com', '2024-02-20', '2024-02-25', 2, 14000.00, 'pending', FALSE);

-- Insert sample reviews
INSERT INTO reviews (listing_id, guest_name, rating, comment) VALUES
(1, 'John Doe', 5, 'Amazing place! Perfect location and very clean. Host was very responsive.'),
(1, 'Jane Smith', 4, 'Great condo with beautiful views. Would definitely stay again.'),
(2, 'Mike Brown', 5, 'Perfect for students! Very close to UP and has everything you need.'),
(3, 'Lisa Davis', 5, 'Luxury at its finest! The penthouse exceeded all expectations.'),
(4, 'Tom Wilson', 4, 'Good location for business trips. Clean and comfortable.'),
(5, 'Emma Johnson', 5, 'Perfect for families! Kids loved the garden and the house was spacious.');

-- Create indexes for better performance
CREATE INDEX idx_listings_location ON listings(city, country);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_property_type ON listings(property_type);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_listing ON bookings(listing_id);
CREATE INDEX idx_users_email ON users(email);