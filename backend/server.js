const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lostandfound';

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

const User = mongoose.model('User', userSchema);

// Item Schema
const itemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['lost', 'found'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Wallet', 'Bag', 'Electronics', 'Keys', 'Accessories', 'Clothing', 'Documents', 'Other']
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  contactName: {
    type: String,
    required: true
  },
  contactEmail: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'available', 'claimed', 'returned'],
    default: function() {
      return this.type === 'lost' ? 'pending' : 'available';
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Item = mongoose.model('Item', itemSchema);

// File Upload Configuration
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'item-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 Registration attempt:', { email: req.body.email, name: req.body.name });
    
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      console.log('❌ Missing fields');
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format');
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('❌ Email already exists:', email);
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password before creating user
    console.log('✅ Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user with hashed password
    console.log('✅ Creating new user...');
    const user = new User({ 
      name: name.trim(), 
      email: email.toLowerCase().trim(), 
      password: hashedPassword
    });
    
    await user.save();
    console.log('✅ User saved to database');

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    console.log('✅ Registration successful for:', email);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ 
      error: 'Server error during registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body.email);
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for:', email);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get Current User
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== ITEM ROUTES ====================

// Get All Items (with filters)
app.get('/api/items', async (req, res) => {
  try {
    const { type, category, location, search } = req.query;
    let query = {};

    if (type) query.type = type;
    if (category) query.category = category;
    if (location) query.location = new RegExp(location, 'i');
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const items = await Item.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email');

    res.json({ success: true, items });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Server error fetching items' });
  }
});

// Get Single Item
app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('userId', 'name email');
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true, item });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Server error fetching item' });
  }
});

// Create Item (Lost or Found)
app.post('/api/items', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const {
      type,
      name,
      category,
      description,
      location,
      date,
      contactName,
      contactEmail,
      contactPhone
    } = req.body;

    // Validation
    if (!type || !name || !category || !description || !location || !date || !contactName || !contactEmail) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Create item object
    const itemData = {
      type,
      name,
      category,
      description,
      location,
      date: new Date(date),
      contactName,
      contactEmail,
      contactPhone: contactPhone || '',
      userId: req.user.id
    };

    // Add image path if uploaded
    if (req.file) {
      itemData.image = `/uploads/${req.file.filename}`;
    }

    const item = new Item(itemData);
    await item.save();

    const populatedItem = await Item.findById(item._id).populate('userId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Item reported successfully',
      item: populatedItem
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Server error creating item' });
  }
});

// Update Item
app.put('/api/items/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if user owns the item
    if (item.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this item' });
    }

    const updateData = { ...req.body };
    
    // Add image path if uploaded
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    res.json({
      success: true,
      message: 'Item updated successfully',
      item: updatedItem
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Server error updating item' });
  }
});

// Delete Item
app.delete('/api/items/:id', authenticateToken, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if user owns the item
    if (item.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this item' });
    }

    await Item.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Server error deleting item' });
  }
});

// Get User's Items
app.get('/api/items/user/my-items', authenticateToken, async (req, res) => {
  try {
    const items = await Item.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json({ success: true, items });
  } catch (error) {
    console.error('Get user items error:', error);
    res.status(500).json({ error: 'Server error fetching user items' });
  }
});

// Get Statistics
app.get('/api/stats', async (req, res) => {
  try {
    const totalItems = await Item.countDocuments();
    const lostItems = await Item.countDocuments({ type: 'lost' });
    const foundItems = await Item.countDocuments({ type: 'found' });
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = await Item.countDocuments({ createdAt: { $gte: weekAgo } });

    res.json({
      success: true,
      stats: {
        totalItems,
        lostItems,
        foundItems,
        thisWeek
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error fetching statistics' });
  }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});
