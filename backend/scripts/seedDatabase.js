const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Listing.deleteMany({});
    await Booking.deleteMany({});
    console.log('Cleared existing data');

    // Create sample users
    const users = await User.create([
      {
        firstName: 'Maria',
        lastName: 'Santos',
        email: 'maria@example.com',
        password: 'password123',
        role: 'host'
      },
      {
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        email: 'juan@example.com',
        password: 'password123',
        role: 'host'
      },
      {
        firstName: 'Ana',
        lastName: 'Reyes',
        email: 'ana@example.com',
        password: 'password123',
        role: 'host'
      },
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'user'
      },
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@rentify.com',
        password: 'admin123',
        role: 'admin'
      }
    ]);

    console.log('Created sample users');

    // Create sample listings
    const listings = await Listing.create([
      {
        title: 'Modern Makati Condo',
        description: 'Luxurious 2-bedroom condominium in the heart of Makati CBD with stunning city skyline views. Perfect for business travelers and professionals. Walking distance to Ayala Triangle and Greenbelt Mall.',
        address: '1234 Ayala Avenue',
        city: 'Makati City',
        country: 'Philippines',
        location: 'Makati City, Philippines',
        price: 3500,
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 4,
        propertyType: 'condo',
        amenities: ['WiFi', 'Kitchen', 'Parking', 'Air Conditioning', 'Gym', 'Balcony', 'Elevator', 'Security', 'Concierge'],
        images: [
          {
            url: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg',
            isPrimary: true,
            sortOrder: 0
          },
          {
            url: 'https://images.pexels.com/photos/1571467/pexels-photo-1571467.jpeg',
            isPrimary: false,
            sortOrder: 1
          }
        ],
        host: users[0]._id,
        hostName: 'Maria Santos',
        rating: 4.8,
        reviewCount: 24
      },
      {
        title: 'Cozy Studio Near UP Diliman',
        description: 'Perfect for students and young professionals! Clean, fully-furnished studio apartment just 5 minutes walk from UP Diliman campus. Includes high-speed internet, study area, and kitchen essentials.',
        address: '567 Katipunan Avenue',
        city: 'Quezon City',
        country: 'Philippines',
        location: 'Quezon City, Philippines',
        price: 2200,
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 2,
        propertyType: 'studio',
        amenities: ['WiFi', 'Kitchen', 'Air Conditioning', 'Desk', 'Laundry', 'Security'],
        images: [
          {
            url: 'https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg',
            isPrimary: true,
            sortOrder: 0
          }
        ],
        host: users[1]._id,
        hostName: 'Juan Dela Cruz',
        rating: 4.6,
        reviewCount: 18
      },
      {
        title: 'Luxury BGC Penthouse',
        description: 'Exclusive 3-bedroom penthouse in Bonifacio Global City with panoramic views of Manila skyline. Premium amenities include infinity pool, gym, and 24/7 concierge service.',
        address: '890 Bonifacio High Street',
        city: 'Taguig City',
        country: 'Philippines',
        location: 'Taguig City, Philippines',
        price: 8500,
        bedrooms: 3,
        bathrooms: 3,
        maxGuests: 6,
        propertyType: 'apartment',
        amenities: ['WiFi', 'Kitchen', 'Parking', 'Air Conditioning', 'Pool', 'Gym', 'Balcony', 'Desk', 'Security', 'Elevator', 'Rooftop', 'Concierge'],
        images: [
          {
            url: 'https://images.pexels.com/photos/1571453/pexels-photo-1571453.jpeg',
            isPrimary: true,
            sortOrder: 0
          }
        ],
        host: users[2]._id,
        hostName: 'Ana Reyes',
        rating: 4.9,
        reviewCount: 31
      }
    ]);

    console.log('Created sample listings');

    // Create sample bookings
    const bookings = await Booking.create([
      {
        listing: listings[0]._id,
        guest: users[3]._id,
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        checkIn: new Date('2024-02-15'),
        checkOut: new Date('2024-02-20'),
        guests: 2,
        totalPrice: 17500,
        status: 'confirmed',
        contractSigned: true
      },
      {
        listing: listings[1]._id,
        guestName: 'Alice Smith',
        guestEmail: 'alice@example.com',
        checkIn: new Date('2024-02-10'),
        checkOut: new Date('2024-02-12'),
        guests: 1,
        totalPrice: 4400,
        status: 'pending',
        contractSigned: false
      }
    ]);

    console.log('Created sample bookings');
    console.log('✅ Database seeded successfully!');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();