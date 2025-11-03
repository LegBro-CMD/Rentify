# Rentify - Property Rental Platform (MERN Stack)

A comprehensive property rental platform built with the MERN stack (MongoDB, Express.js, React, Node.js). Features modern UI, real-time data, authentication, and file uploads.

## 🚀 Features

- **Modern React Frontend** - Built with React 18, React Router, and Tailwind CSS
- **RESTful API Backend** - Express.js with MongoDB integration
- **User Authentication** - JWT-based auth with bcrypt password hashing
- **Property Management** - Full CRUD operations for listings
- **Booking System** - Complete booking flow with validation
- **File Uploads** - Image upload functionality with Multer
- **Responsive Design** - Mobile-first design with Tailwind CSS
- **Real-time Updates** - React Query for efficient data fetching
- **Search & Filters** - Advanced filtering and search capabilities

## 📁 Project Structure

```
rentify-mern/
├── backend/                 # Node.js/Express API
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── uploads/            # File uploads directory
│   └── scripts/            # Database seeding scripts
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
└── package.json            # Root package.json
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd rentify-mern
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all dependencies (backend + frontend)
npm run install-deps
```

### 3. Environment Setup

Create a `.env` file in the `backend` directory:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rentify
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d
```

### 4. Database Setup

Start MongoDB and seed the database:
```bash
# Make sure MongoDB is running
# Then seed the database with sample data
cd backend
npm run seed
```

### 5. Start the Application

```bash
# Start both backend and frontend concurrently
npm run dev

# Or start them separately:
# Backend (from root)
npm run server

# Frontend (from root)
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Listings
- `GET /api/listings` - Get all listings (with filters)
- `GET /api/listings/:id` - Get single listing
- `POST /api/listings` - Create new listing (auth required)
- `PUT /api/listings/:id` - Update listing (auth required)
- `DELETE /api/listings/:id` - Delete listing (auth required)

### Bookings
- `GET /api/bookings` - Get bookings
- `GET /api/bookings/:id` - Get single booking
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking (auth required)
- `DELETE /api/bookings/:id` - Cancel booking (auth required)

### File Upload
- `POST /api/upload/images` - Upload listing images

## 🎨 Frontend Features

### Components
- **Navbar** - Responsive navigation with authentication
- **AuthModal** - Login/register modal with form validation
- **LoadingSpinner** - Reusable loading component
- **ListingCard** - Property listing display component

### Pages
- **HomePage** - Landing page with hero section and features
- **ListingsPage** - Browse properties with filters and search
- **ListingDetailPage** - Detailed property view (to be implemented)
- **AdminPage** - Admin dashboard (to be implemented)
- **ProfilePage** - User profile management (to be implemented)

### State Management
- **AuthContext** - Global authentication state
- **React Query** - Server state management and caching

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt for secure password storage
- **Input Validation** - express-validator for API validation
- **CORS Protection** - Configured CORS for cross-origin requests
- **Rate Limiting** - API rate limiting to prevent abuse
- **Helmet** - Security headers middleware
- **File Upload Security** - File type and size validation

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-first design approach
- Tailwind CSS for styling
- Responsive navigation with mobile menu
- Optimized layouts for all screen sizes

## 🧪 Sample Data

The application comes with sample data including:
- 3 sample users (hosts and guests)
- 3 property listings with images and amenities
- 2 sample bookings
- Realistic pricing and descriptions

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas or use a cloud MongoDB service
2. Update environment variables for production
3. Deploy to services like Heroku, Railway, or DigitalOcean

### Frontend Deployment
1. Build the React app: `cd frontend && npm run build`
2. Deploy to services like Netlify, Vercel, or serve from Express

## 🔄 Development Workflow

### Adding New Features
1. Create API endpoints in `backend/routes/`
2. Add corresponding React components in `frontend/src/components/`
3. Update navigation and routing as needed
4. Test with sample data

### Database Changes
1. Update models in `backend/models/`
2. Update seed script if needed
3. Run migrations if necessary

## 📝 TODO / Future Enhancements

- [ ] Complete listing detail page with booking functionality
- [ ] Implement admin dashboard with analytics
- [ ] Add user profile management
- [ ] Implement real-time notifications
- [ ] Implement review and rating system
- [ ] Add map integration for property locations
- [ ] Implement advanced search with geolocation
- [ ] Add email notifications
- [ ] Implement social media authentication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
1. Check the documentation
2. Review the sample data and API endpoints
3. Check the browser console for frontend issues
4. Check server logs for backend issues

---

**Built with ❤️ using the MERN Stack**