const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB Connection - FIXED FOR NEWER VERSIONS
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lostandfound';

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Define Schemas (same as server.js)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  createdAt: { type: Date, default: Date.now }
});

const itemSchema = new mongoose.Schema({
  type: String,
  name: String,
  category: String,
  description: String,
  location: String,
  date: Date,
  image: String,
  contactName: String,
  contactEmail: String,
  contactPhone: String,
  status: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Item = mongoose.model('Item', itemSchema);

// Sample Data
const sampleUsers = [
  {
    name: 'Demo User',
    email: 'demo@lostandfound.com',
    password: 'demo123'
  },
  {
    name: 'Test User',
    email: 'user@test.com',
    password: 'test123'
  },
  {
    name: 'Sarah Mitchell',
    email: 'sarah.m@email.com',
    password: 'password123'
  },
  {
    name: 'John Davis',
    email: 'john.d@email.com',
    password: 'password123'
  }
];

const sampleItems = [
  {
    type: 'lost',
    name: 'Black Leather Wallet',
    category: 'Wallet',
    description: 'Black leather wallet with multiple card slots. Contains important cards.',
    location: 'Central Library, 2nd Floor',
    date: new Date('2024-02-10'),
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=300&fit=crop',
    contactName: 'Sarah Mitchell',
    contactEmail: 'sarah.m@email.com',
    contactPhone: '555-0123',
    status: 'pending'
  },
  {
    type: 'found',
    name: 'Blue Backpack',
    category: 'Bag',
    description: 'Navy blue backpack with laptop compartment. Found near the cafeteria.',
    location: 'Student Cafeteria',
    date: new Date('2024-02-11'),
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop',
    contactName: 'John Davis',
    contactEmail: 'john.d@email.com',
    contactPhone: '555-0456',
    status: 'available'
  },
  {
    type: 'lost',
    name: 'Silver iPhone 13',
    category: 'Electronics',
    description: 'Silver iPhone 13 with cracked screen protector. Has a blue case.',
    location: 'Parking Lot B',
    date: new Date('2024-02-09'),
    image: 'https://images.unsplash.com/photo-1592286927505-c8d0894cb8e6?w=400&h=300&fit=crop',
    contactName: 'Emily Chen',
    contactEmail: 'emily.c@email.com',
    contactPhone: '555-0789',
    status: 'pending'
  },
  {
    type: 'found',
    name: 'Gold Watch',
    category: 'Accessories',
    description: 'Elegant gold wristwatch with leather strap. Found in the gym locker room.',
    location: 'Sports Complex, Locker Room',
    date: new Date('2024-02-12'),
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400&h=300&fit=crop',
    contactName: 'Michael Brown',
    contactEmail: 'michael.b@email.com',
    contactPhone: '555-0321',
    status: 'available'
  },
  {
    type: 'lost',
    name: 'Red Umbrella',
    category: 'Accessories',
    description: 'Large red umbrella with wooden handle. Sentimental value.',
    location: 'Main Entrance',
    date: new Date('2024-02-08'),
    image: 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?w=400&h=300&fit=crop',
    contactName: 'Lisa Anderson',
    contactEmail: 'lisa.a@email.com',
    contactPhone: '555-0654',
    status: 'pending'
  },
  {
    type: 'found',
    name: 'Set of Car Keys',
    category: 'Keys',
    description: 'Toyota car keys with blue keychain. Found in the parking structure.',
    location: 'Parking Structure Level 3',
    date: new Date('2024-02-11'),
    image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&h=300&fit=crop',
    contactName: 'David Wilson',
    contactEmail: 'david.w@email.com',
    contactPhone: '555-0987',
    status: 'available'
  }
];

async function seedDatabase() {
  try {
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Item.deleteMany({});

    // Create users with hashed passwords
    console.log('👥 Creating users...');
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await User.create({
        ...userData,
        password: hashedPassword
      });
      createdUsers.push(user);
      console.log(`   ✓ Created user: ${user.email}`);
    }

    // Create items and assign to users
    console.log('📦 Creating items...');
    for (let i = 0; i < sampleItems.length; i++) {
      const itemData = {
        ...sampleItems[i],
        userId: createdUsers[i % createdUsers.length]._id
      };
      const item = await Item.create(itemData);
      console.log(`   ✓ Created ${item.type} item: ${item.name}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Sample Login Credentials:');
    console.log('   Email: demo@lostandfound.com');
    console.log('   Password: demo123');
    console.log('\n   Email: user@test.com');
    console.log('   Password: test123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
