import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Package, User, LogOut, Home as HomeIcon, Upload, X, Eye, CheckCircle, AlertCircle } from 'lucide-react';

// ============= API CONFIGURATION =============
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// API Helper Functions
const api = {
  // Auth APIs
  register: async (name, email, password) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    return response.json();
  },

  login: async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },

  getMe: async (token) => {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  // Item APIs
  getItems: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await fetch(`${API_URL}/items?${queryParams}`);
    return response.json();
  },

  getItem: async (id) => {
    const response = await fetch(`${API_URL}/items/${id}`);
    return response.json();
  },

  createItem: async (itemData, token) => {
    const formData = new FormData();
    Object.keys(itemData).forEach(key => {
      if (itemData[key]) {
        formData.append(key, itemData[key]);
      }
    });

    const response = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    return response.json();
  },

  updateItem: async (id, itemData, token) => {
    const formData = new FormData();
    Object.keys(itemData).forEach(key => {
      if (itemData[key]) {
        formData.append(key, itemData[key]);
      }
    });

    const response = await fetch(`${API_URL}/items/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    return response.json();
  },

  deleteItem: async (id, token) => {
    const response = await fetch(`${API_URL}/items/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  getMyItems: async (token) => {
    const response = await fetch(`${API_URL}/items/user/my-items`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  getStats: async () => {
    const response = await fetch(`${API_URL}/stats`);
    return response.json();
  }
};

// ============= ROUTING =============
const ROUTES = {
  LOGIN: 'login',
  REGISTER: 'register',
  HOME: 'home',
  REPORT_LOST: 'report-lost',
  REPORT_FOUND: 'report-found',
  SEARCH: 'search'
};

// ============= AUTH CONTEXT =============
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('lf_token');
    const storedUser = localStorage.getItem('lf_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const data = await api.login(email, password);
      
      if (data.success) {
        localStorage.setItem('lf_token', data.token);
        localStorage.setItem('lf_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const data = await api.register(name, email, password);
      
      if (data.success) {
        localStorage.setItem('lf_token', data.token);
        localStorage.setItem('lf_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('lf_token');
    localStorage.removeItem('lf_user');
    setToken(null);
    setUser(null);
  };

  return { user, token, login, register, logout, loading };
};

// ============= ITEMS MANAGEMENT =============
const useItems = (token) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const fetchItems = async (filters = {}) => {
    try {
      setLoading(true);
      const data = await api.getItems(filters);
      if (data.success) {
        setItems(data.items);
      }
    } catch (error) {
      console.error('Fetch items error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.getStats();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const addItem = async (itemData) => {
    try {
      const data = await api.createItem(itemData, token);
      if (data.success) {
        await fetchItems();
        await fetchStats();
        return { success: true, item: data.item };
      }
      return { success: false, error: data.error };
    } catch (error) {
      console.error('Add item error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const searchItems = (query, category, location) => {
    return items.filter(item => {
      const matchesQuery = !query || 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !category || item.category === category;
      const matchesLocation = !location || 
        item.location.toLowerCase().includes(location.toLowerCase());
      return matchesQuery && matchesCategory && matchesLocation;
    });
  };

  useEffect(() => {
    fetchItems();
    fetchStats();
  }, [token]);

  return { items, loading, stats, addItem, searchItems, fetchItems, fetchStats };
};

// ============= LOGIN PAGE =============
const LoginPage = ({ onLogin, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setLoginError('');
    const result = await onLogin(email, password);
    setIsLoading(false);
    
    if (!result.success) {
      setLoginError(result.error);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-branding">
          <div className="brand-icon">
            <Package size={40} />
          </div>
          <h1 className="brand-title">Lost & Found</h1>
          <p className="brand-subtitle">Reuniting people with their belongings</p>
        </div>
        <div className="auth-illustration">
          <div className="floating-card card-1">
            <Package size={24} />
          </div>
          <div className="floating-card card-2">
            <Search size={24} />
          </div>
          <div className="floating-card card-3">
            <MapPin size={24} />
          </div>
        </div>
      </div>
      
      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-header">
            <h2>Welcome Back</h2>
            <p>Sign in to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {loginError && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <span>{loginError}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? 'error' : ''}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={errors.password ? 'error' : ''}
                placeholder="••••••••"
                disabled={isLoading}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an account? <button onClick={() => onNavigate(ROUTES.REGISTER)} className="link-btn">Sign up</button></p>
          </div>

          <div className="demo-credentials">
            <p className="demo-title">Demo Credentials:</p>
            <p className="demo-text">Email: demo@lostandfound.com</p>
            <p className="demo-text">Password: demo123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============= REGISTER PAGE =============
const RegisterPage = ({ onRegister, onNavigate }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [registerError, setRegisterError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setRegisterError('');
    const result = await onRegister(formData.name, formData.email, formData.password);
    setIsLoading(false);
    
    if (!result.success) {
      setRegisterError(result.error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-branding">
          <div className="brand-icon">
            <Package size={40} />
          </div>
          <h1 className="brand-title">Lost & Found</h1>
          <p className="brand-subtitle">Join our community of helpful people</p>
        </div>
        <div className="auth-illustration">
          <div className="floating-card card-1">
            <Package size={24} />
          </div>
          <div className="floating-card card-2">
            <Search size={24} />
          </div>
          <div className="floating-card card-3">
            <MapPin size={24} />
          </div>
        </div>
      </div>
      
      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-header">
            <h2>Create Account</h2>
            <p>Sign up to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {registerError && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <span>{registerError}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={errors.name ? 'error' : ''}
                placeholder="John Doe"
                disabled={isLoading}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={errors.email ? 'error' : ''}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className={errors.password ? 'error' : ''}
                placeholder="••••••••"
                disabled={isLoading}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="••••••••"
                disabled={isLoading}
              />
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <button onClick={() => onNavigate(ROUTES.LOGIN)} className="link-btn">Sign in</button></p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============= NAVIGATION =============
const Navigation = ({ currentRoute, onNavigate, user, onLogout }) => {
  const navItems = [
    { route: ROUTES.HOME, label: 'Dashboard', icon: HomeIcon },
    { route: ROUTES.REPORT_LOST, label: 'Report Lost', icon: AlertCircle },
    { route: ROUTES.REPORT_FOUND, label: 'Report Found', icon: CheckCircle },
    { route: ROUTES.SEARCH, label: 'Search Items', icon: Search }
  ];

  return (
    <nav className="navigation">
      <div className="nav-brand" onClick={() => onNavigate(ROUTES.HOME)}>
        <Package size={28} />
        <span>Lost & Found</span>
      </div>
      
      <div className="nav-links">
        {navItems.map(item => (
          <button
            key={item.route}
            onClick={() => onNavigate(item.route)}
            className={`nav-link ${currentRoute === item.route ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="nav-user">
        <div className="user-info">
          <User size={18} />
          <span>{user?.name}</span>
        </div>
        <button onClick={onLogout} className="btn-logout">
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
};

// ============= HOME DASHBOARD =============
const HomePage = ({ items, user, stats }) => {
  const lostItems = items.filter(item => item.type === 'lost');
  const foundItems = items.filter(item => item.type === 'found');
  const recentItems = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);

  const displayStats = stats || {
    totalItems: items.length,
    lostItems: lostItems.length,
    foundItems: foundItems.length,
    thisWeek: items.filter(i => {
      const itemDate = new Date(i.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return itemDate >= weekAgo;
    }).length
  };

  const statsData = [
    { label: 'Total Items', value: displayStats.totalItems, icon: Package, color: '#d97706' },
    { label: 'Lost Items', value: displayStats.lostItems, icon: AlertCircle, color: '#dc2626' },
    { label: 'Found Items', value: displayStats.foundItems, icon: CheckCircle, color: '#059669' },
    { label: 'This Week', value: displayStats.thisWeek, icon: Calendar, color: '#2563eb' }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.name}!</h1>
          <p className="page-subtitle">Here's what's happening with lost and found items</p>
        </div>
      </div>

      <div className="stats-grid">
        {statsData.map((stat, index) => (
          <div key={index} className="stat-card" style={{ '--stat-color': stat.color }}>
            <div className="stat-icon">
              <stat.icon size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="section">
        <h2 className="section-title">Recent Activity</h2>
        {recentItems.length === 0 ? (
          <div className="no-results">
            <Package size={64} />
            <h3>No items yet</h3>
            <p>Start by reporting a lost or found item</p>
          </div>
        ) : (
          <div className="items-grid">
            {recentItems.map(item => (
              <ItemCard key={item._id} item={item} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Continue in next part due to length...
// ============= REPORT LOST PAGE =============
const ReportLostPage = ({ onAddItem, token }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    location: '',
    date: '',
    contactName: '',
    contactEmail: '',
    contactPhone: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const categories = ['Wallet', 'Bag', 'Electronics', 'Keys', 'Accessories', 'Clothing', 'Documents', 'Other'];

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Item name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.contactName) newErrors.contactName = 'Contact name is required';
    if (!formData.contactEmail) newErrors.contactEmail = 'Contact email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.contactEmail)) newErrors.contactEmail = 'Email is invalid';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    const itemData = { ...formData, type: 'lost' };
    if (imageFile) {
      itemData.image = imageFile;
    }
    
    const result = await onAddItem(itemData);
    setIsLoading(false);

    if (result.success) {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          name: '',
          category: '',
          description: '',
          location: '',
          date: '',
          contactName: '',
          contactEmail: '',
          contactPhone: ''
        });
        setImagePreview('');
        setImageFile(null);
      }, 2000);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (submitted) {
    return (
      <div className="page-container">
        <div className="success-message">
          <CheckCircle size={64} />
          <h2>Item Reported Successfully!</h2>
          <p>Your lost item has been added to the system. We'll notify you if someone finds it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Report Lost Item</h1>
        <p className="page-subtitle">Fill out the details below to report your lost item</p>
      </div>

      <form onSubmit={handleSubmit} className="report-form">
        <div className="form-section">
          <h3 className="form-section-title">Item Details</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Item Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={errors.name ? 'error' : ''}
                placeholder="e.g., Black Leather Wallet"
                disabled={isLoading}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className={errors.category ? 'error' : ''}
                disabled={isLoading}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <span className="error-text">{errors.category}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className={errors.description ? 'error' : ''}
              placeholder="Provide detailed description of the item..."
              rows="4"
              disabled={isLoading}
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="location">Location Lost *</label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className={errors.location ? 'error' : ''}
                placeholder="e.g., Central Library, 2nd Floor"
                disabled={isLoading}
              />
              {errors.location && <span className="error-text">{errors.location}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="date">Date Lost *</label>
              <input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className={errors.date ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.date && <span className="error-text">{errors.date}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Item Image (Optional)</label>
            <div className="image-upload">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                disabled={isLoading}
              />
              <label htmlFor="image-upload" className="upload-label">
                <Upload size={24} />
                <span>Click to upload image</span>
              </label>
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview('');
                      setImageFile(null);
                    }}
                    className="remove-image"
                    disabled={isLoading}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Contact Information</h3>
          
          <div className="form-group">
            <label htmlFor="contactName">Your Name *</label>
            <input
              id="contactName"
              type="text"
              value={formData.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
              className={errors.contactName ? 'error' : ''}
              placeholder="John Doe"
              disabled={isLoading}
            />
            {errors.contactName && <span className="error-text">{errors.contactName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contactEmail">Email *</label>
              <input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                className={errors.contactEmail ? 'error' : ''}
                placeholder="john@example.com"
                disabled={isLoading}
              />
              {errors.contactEmail && <span className="error-text">{errors.contactEmail}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="contactPhone">Phone (Optional)</label>
              <input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => handleChange('contactPhone', e.target.value)}
                placeholder="555-0123"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-large" disabled={isLoading}>
          {isLoading ? 'Submitting...' : 'Submit Lost Item Report'}
        </button>
      </form>
    </div>
  );
};

// ============= REPORT FOUND PAGE (Similar to Lost) =============
const ReportFoundPage = ({ onAddItem, token }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    location: '',
    date: '',
    contactName: '',
    contactEmail: '',
    contactPhone: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const categories = ['Wallet', 'Bag', 'Electronics', 'Keys', 'Accessories', 'Clothing', 'Documents', 'Other'];

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Item name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.contactName) newErrors.contactName = 'Contact name is required';
    if (!formData.contactEmail) newErrors.contactEmail = 'Contact email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.contactEmail)) newErrors.contactEmail = 'Email is invalid';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    const itemData = { ...formData, type: 'found' };
    if (imageFile) {
      itemData.image = imageFile;
    }
    
    const result = await onAddItem(itemData);
    setIsLoading(false);

    if (result.success) {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          name: '',
          category: '',
          description: '',
          location: '',
          date: '',
          contactName: '',
          contactEmail: '',
          contactPhone: ''
        });
        setImagePreview('');
        setImageFile(null);
      }, 2000);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (submitted) {
    return (
      <div className="page-container">
        <div className="success-message">
          <CheckCircle size={64} />
          <h2>Item Reported Successfully!</h2>
          <p>Your found item has been added to the system. The owner can now contact you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Report Found Item</h1>
        <p className="page-subtitle">Help someone find their lost item by reporting what you found</p>
      </div>

      <form onSubmit={handleSubmit} className="report-form">
        <div className="form-section">
          <h3 className="form-section-title">Item Details</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Item Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={errors.name ? 'error' : ''}
                placeholder="e.g., Blue Backpack"
                disabled={isLoading}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className={errors.category ? 'error' : ''}
                disabled={isLoading}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <span className="error-text">{errors.category}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className={errors.description ? 'error' : ''}
              placeholder="Provide detailed description of the item..."
              rows="4"
              disabled={isLoading}
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="location">Location Found *</label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className={errors.location ? 'error' : ''}
                placeholder="e.g., Student Cafeteria"
                disabled={isLoading}
              />
              {errors.location && <span className="error-text">{errors.location}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="date">Date Found *</label>
              <input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className={errors.date ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.date && <span className="error-text">{errors.date}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Item Image (Optional)</label>
            <div className="image-upload">
              <input
                type="file"
                id="image-upload-found"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                disabled={isLoading}
              />
              <label htmlFor="image-upload-found" className="upload-label">
                <Upload size={24} />
                <span>Click to upload image</span>
              </label>
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview('');
                      setImageFile(null);
                    }}
                    className="remove-image"
                    disabled={isLoading}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Contact Information</h3>
          
          <div className="form-group">
            <label htmlFor="contactName">Your Name *</label>
            <input
              id="contactName"
              type="text"
              value={formData.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
              className={errors.contactName ? 'error' : ''}
              placeholder="John Doe"
              disabled={isLoading}
            />
            {errors.contactName && <span className="error-text">{errors.contactName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contactEmail">Email *</label>
              <input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                className={errors.contactEmail ? 'error' : ''}
                placeholder="john@example.com"
                disabled={isLoading}
              />
              {errors.contactEmail && <span className="error-text">{errors.contactEmail}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="contactPhone">Phone (Optional)</label>
              <input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => handleChange('contactPhone', e.target.value)}
                placeholder="555-0123"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-large" disabled={isLoading}>
          {isLoading ? 'Submitting...' : 'Submit Found Item Report'}
        </button>
      </form>
    </div>
  );
};

// ============= ITEM CARD =============
const ItemCard = ({ item, compact, onView }) => {
  const getImageUrl = (imagePath) => {
    if (!imagePath) return 'https://images.unsplash.com/photo-1625402041924-b7cac4492fe4?w=400&h=300&fit=crop';
    if (imagePath.startsWith('http')) return imagePath;
    return `http://localhost:5000${imagePath}`;
  };

  return (
    <div className={`item-card ${compact ? 'compact' : ''}`} onClick={() => !compact && onView && onView(item)}>
      <div className="item-image">
        <img src={getImageUrl(item.image)} alt={item.name} />
        <div className={`item-badge ${item.type}`}>
          {item.type === 'lost' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
          <span>{item.type === 'lost' ? 'Lost' : 'Found'}</span>
        </div>
      </div>
      <div className="item-content">
        <h3 className="item-name">{item.name}</h3>
        <p className="item-category">{item.category}</p>
        <p className="item-description">{item.description}</p>
        <div className="item-meta">
          <div className="meta-item">
            <MapPin size={14} />
            <span>{item.location}</span>
          </div>
          <div className="meta-item">
            <Calendar size={14} />
            <span>{new Date(item.date).toLocaleDateString()}</span>
          </div>
        </div>
        {!compact && (
          <button className="btn btn-secondary btn-small" onClick={(e) => { e.stopPropagation(); onView && onView(item); }}>
            View Details
          </button>
        )}
      </div>
    </div>
  );
};

// ============= ITEM DETAIL MODAL =============
const ItemDetailModal = ({ item, onClose }) => {
  if (!item) return null;

  const getImageUrl = (imagePath) => {
    if (!imagePath) return 'https://images.unsplash.com/photo-1625402041924-b7cac4492fe4?w=400&h=300&fit=crop';
    if (imagePath.startsWith('http')) return imagePath;
    return `http://localhost:5000${imagePath}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>
        
        <div className="modal-body">
          <div className="modal-image">
            <img src={getImageUrl(item.image)} alt={item.name} />
            <div className={`item-badge ${item.type}`}>
              {item.type === 'lost' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              <span>{item.type === 'lost' ? 'Lost Item' : 'Found Item'}</span>
            </div>
          </div>
          
          <div className="modal-details">
            <h2>{item.name}</h2>
            <div className="detail-category">{item.category}</div>
            
            <div className="detail-section">
              <h3>Description</h3>
              <p>{item.description}</p>
            </div>
            
            <div className="detail-section">
              <h3>Location & Date</h3>
              <div className="detail-meta">
                <div className="meta-item">
                  <MapPin size={18} />
                  <span>{item.location}</span>
                </div>
                <div className="meta-item">
                  <Calendar size={18} />
                  <span>{new Date(item.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              </div>
            </div>
            
            <div className="detail-section">
              <h3>Contact Information</h3>
              <div className="contact-info">
                <div className="contact-item">
                  <User size={18} />
                  <span>{item.contactName}</span>
                </div>
                <div className="contact-item">
                  <span>✉️</span>
                  <a href={`mailto:${item.contactEmail}`}>{item.contactEmail}</a>
                </div>
                {item.contactPhone && (
                  <div className="contact-item">
                    <span>📞</span>
                    <a href={`tel:${item.contactPhone}`}>{item.contactPhone}</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============= SEARCH PAGE =============
const SearchPage = ({ items }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState(items);
  const [selectedItem, setSelectedItem] = useState(null);

  const categories = ['All', 'Wallet', 'Bag', 'Electronics', 'Keys', 'Accessories', 'Clothing', 'Documents', 'Other'];

  useEffect(() => {
    handleSearch();
  }, [query, category, location, items]);

  const handleSearch = () => {
    const filtered = items.filter(item => {
      const matchesQuery = !query || 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !category || category === 'All' || item.category === category;
      const matchesLocation = !location || 
        item.location.toLowerCase().includes(location.toLowerCase());
      return matchesQuery && matchesCategory && matchesLocation;
    });
    setResults(filtered);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Search Items</h1>
        <p className="page-subtitle">Find lost or found items by searching below</p>
      </div>

      <div className="search-filters">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by item name or description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map(cat => (
                <option key={cat} value={cat === 'All' ? '' : cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Location</label>
            <input
              type="text"
              placeholder="Filter by location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="search-results">
        <div className="results-header">
          <h2>Search Results</h2>
          <span className="results-count">{results.length} items found</span>
        </div>

        {results.length === 0 ? (
          <div className="no-results">
            <Package size={64} />
            <h3>No items found</h3>
            <p>Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="items-grid">
            {results.map(item => (
              <ItemCard 
                key={item._id} 
                item={item} 
                onView={setSelectedItem}
              />
            ))}
          </div>
        )}
      </div>

      {selectedItem && (
        <ItemDetailModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
};

// ============= MAIN APP =============
const App = () => {
  const [currentRoute, setCurrentRoute] = useState(ROUTES.LOGIN);
  const { user, token, login, register, logout, loading: authLoading } = useAuth();
  const { items, loading: itemsLoading, stats, addItem, searchItems, fetchItems, fetchStats } = useItems(token);

  useEffect(() => {
    if (user) {
      setCurrentRoute(ROUTES.HOME);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    setCurrentRoute(ROUTES.LOGIN);
  };

  const renderPage = () => {
    if (!user) {
      if (currentRoute === ROUTES.REGISTER) {
        return <RegisterPage onRegister={register} onNavigate={setCurrentRoute} />;
      }
      return <LoginPage onLogin={login} onNavigate={setCurrentRoute} />;
    }

    switch (currentRoute) {
      case ROUTES.HOME:
        return <HomePage items={items} user={user} stats={stats} />;
      case ROUTES.REPORT_LOST:
        return <ReportLostPage onAddItem={addItem} token={token} />;
      case ROUTES.REPORT_FOUND:
        return <ReportFoundPage onAddItem={addItem} token={token} />;
      case ROUTES.SEARCH:
        return <SearchPage items={items} />;
      default:
        return <HomePage items={items} user={user} stats={stats} />;
    }
  };

  if (authLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      {user && (
        <Navigation 
          currentRoute={currentRoute}
          onNavigate={setCurrentRoute}
          user={user}
          onLogout={handleLogout}
        />
      )}
      <main className="main-content">
        {renderPage()}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Work+Sans:wght@400;500;600&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root {
          --primary: #d97706;
          --primary-dark: #b45309;
          --secondary: #0f172a;
          --accent: #059669;
          --danger: #dc2626;
          --warning: #d97706;
          --bg: #fafaf9;
          --surface: #ffffff;
          --text: #1e293b;
          --text-light: #64748b;
          --border: #e2e8f0;
          --shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        body {
          font-family: 'Work Sans', sans-serif;
          background: var(--bg);
          color: var(--text);
          line-height: 1.6;
        }

        .app {
          min-height: 100vh;
          display: flex;
        }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          font-size: 1.25rem;
          color: var(--text-light);
        }

        /* ============= NAVIGATION ============= */
        .navigation {
          width: 280px;
          background: var(--surface);
          border-right: 1px solid var(--border);
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          overflow-y: auto;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-family: 'Crimson Pro', serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 2rem;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .nav-brand:hover {
          transform: translateX(4px);
        }

        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-light);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .nav-link:hover {
          background: #fef3c7;
          color: var(--primary);
        }

        .nav-link.active {
          background: var(--primary);
          color: white;
          font-weight: 600;
        }

        .nav-user {
          margin-top: auto;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-light);
          font-size: 0.9rem;
        }

        .btn-logout {
          background: transparent;
          border: none;
          color: var(--text-light);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .btn-logout:hover {
          background: #fee2e2;
          color: var(--danger);
        }

        /* ============= MAIN CONTENT ============= */
        .main-content {
          flex: 1;
          margin-left: 280px;
          min-height: 100vh;
        }

        .page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 3rem 2rem;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-family: 'Crimson Pro', serif;
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.5rem;
        }

        .page-subtitle {
          color: var(--text-light);
          font-size: 1.1rem;
        }

        /* ============= AUTH PAGES ============= */
        .auth-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100vh;
        }

        .auth-left {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          padding: 4rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .auth-left::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          opacity: 0.3;
        }

        .auth-branding {
          position: relative;
          z-index: 1;
          color: white;
        }

        .brand-icon {
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .brand-title {
          font-family: 'Crimson Pro', serif;
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .brand-subtitle {
          font-size: 1.25rem;
          opacity: 0.95;
        }

        .auth-illustration {
          position: relative;
          margin-top: 3rem;
          height: 200px;
        }

        .floating-card {
          position: absolute;
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .card-1 {
          top: 0;
          left: 0;
          animation: float 3s ease-in-out infinite;
        }

        .card-2 {
          top: 60px;
          right: 80px;
          animation: float 3s ease-in-out infinite 0.5s;
        }

        .card-3 {
          bottom: 0;
          left: 100px;
          animation: float 3s ease-in-out infinite 1s;
        }

        .auth-right {
          background: var(--surface);
          padding: 4rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .auth-form-container {
          width: 100%;
          max-width: 420px;
        }

        .auth-header {
          margin-bottom: 2rem;
        }

        .auth-header h2 {
          font-family: 'Crimson Pro', serif;
          font-size: 2rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.5rem;
        }

        .auth-header p {
          color: var(--text-light);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 500;
          color: var(--text);
          font-size: 0.95rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.875rem 1rem;
          border: 2px solid var(--border);
          border-radius: 8px;
          font-size: 1rem;
          font-family: 'Work Sans', sans-serif;
          transition: all 0.2s;
          background: var(--surface);
        }

        .form-group input:disabled,
        .form-group select:disabled,
        .form-group textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.1);
        }

        .form-group input.error,
        .form-group select.error,
        .form-group textarea.error {
          border-color: var(--danger);
        }

        .error-text {
          color: var(--danger);
          font-size: 0.85rem;
          margin-top: -0.25rem;
        }

        .alert {
          padding: 1rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.95rem;
        }

        .alert-error {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn {
          padding: 0.875rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-family: 'Work Sans', sans-serif;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: var(--primary);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--primary-dark);
          transform: translateY(-1px);
          box-shadow: var(--shadow-lg);
        }

        .btn-secondary {
          background: var(--secondary);
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #334155;
          transform: translateY(-1px);
        }

        .btn-full {
          width: 100%;
        }

        .btn-large {
          padding: 1.125rem 2rem;
          font-size: 1.1rem;
        }

        .btn-small {
          padding: 0.625rem 1rem;
          font-size: 0.9rem;
        }

        .auth-footer {
          text-align: center;
          margin-top: 1.5rem;
          color: var(--text-light);
        }

        .link-btn {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          font-size: inherit;
        }

        .link-btn:hover {
          text-decoration: underline;
        }

        .demo-credentials {
          margin-top: 2rem;
          padding: 1rem;
          background: #fef3c7;
          border-radius: 8px;
          border: 1px solid #fde68a;
        }

        .demo-title {
          font-weight: 600;
          color: var(--primary-dark);
          margin-bottom: 0.5rem;
        }

        .demo-text {
          font-size: 0.9rem;
          color: var(--text);
          font-family: 'Courier New', monospace;
        }

        /* ============= DASHBOARD ============= */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .stat-card {
          background: var(--surface);
          padding: 1.75rem;
          border-radius: 12px;
          box-shadow: var(--shadow);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          transition: all 0.3s;
          border: 2px solid transparent;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--stat-color);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: var(--stat-color);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.9;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          font-family: 'Crimson Pro', serif;
          color: var(--text);
        }

        .stat-label {
          color: var(--text-light);
          font-size: 0.95rem;
        }

        .section {
          margin-top: 3rem;
        }

        .section-title {
          font-family: 'Crimson Pro', serif;
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: var(--text);
        }

        /* ============= ITEMS GRID ============= */
        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .item-card {
          background: var(--surface);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: var(--shadow);
          transition: all 0.3s;
          cursor: pointer;
        }

        .item-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }

        .item-card.compact {
          cursor: default;
        }

        .item-image {
          position: relative;
          height: 200px;
          overflow: hidden;
        }

        .item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .item-card:hover .item-image img {
          transform: scale(1.05);
        }

        .item-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .item-badge.lost {
          background: rgba(220, 38, 38, 0.9);
          color: white;
        }

        .item-badge.found {
          background: rgba(5, 150, 105, 0.9);
          color: white;
        }

        .item-content {
          padding: 1.25rem;
        }

        .item-name {
          font-family: 'Crimson Pro', serif;
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          color: var(--text);
        }

        .item-category {
          color: var(--primary);
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .item-description {
          color: var(--text-light);
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: 1rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .item-meta {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-light);
          font-size: 0.9rem;
        }

        /* ============= REPORT FORM ============= */
        .report-form {
          background: var(--surface);
          padding: 2rem;
          border-radius: 12px;
          box-shadow: var(--shadow);
        }

        .form-section {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--border);
        }

        .form-section:last-of-type {
          border-bottom: none;
        }

        .form-section-title {
          font-family: 'Crimson Pro', serif;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: var(--text);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .image-upload {
          display: flex;
          gap: 1rem;
        }

        .upload-label {
          flex: 1;
          padding: 2rem;
          border: 2px dashed var(--border);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-light);
        }

        .upload-label:hover {
          border-color: var(--primary);
          background: #fef3c7;
          color: var(--primary);
        }

        .image-preview {
          position: relative;
          width: 200px;
          height: 200px;
          border-radius: 8px;
          overflow: hidden;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-image {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: rgba(220, 38, 38, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .remove-image:hover {
          background: var(--danger);
          transform: scale(1.1);
        }

        .success-message {
          text-align: center;
          padding: 4rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          animation: fadeIn 0.5s;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .success-message svg {
          color: var(--accent);
        }

        .success-message h2 {
          font-family: 'Crimson Pro', serif;
          font-size: 2rem;
          color: var(--text);
        }

        .success-message p {
          color: var(--text-light);
          font-size: 1.1rem;
        }

        /* ============= SEARCH PAGE ============= */
        .search-filters {
          background: var(--surface);
          padding: 2rem;
          border-radius: 12px;
          box-shadow: var(--shadow);
          margin-bottom: 2rem;
        }

        .search-bar {
          position: relative;
          margin-bottom: 1.5rem;
        }

        .search-bar svg {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-light);
        }

        .search-bar input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border: 2px solid var(--border);
          border-radius: 8px;
          font-size: 1rem;
          font-family: 'Work Sans', sans-serif;
          transition: all 0.2s;
        }

        .search-bar input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.1);
        }

        .filter-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-group label {
          font-weight: 500;
          color: var(--text);
          font-size: 0.95rem;
        }

        .search-results {
          margin-top: 2rem;
        }

        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .results-header h2 {
          font-family: 'Crimson Pro', serif;
          font-size: 1.75rem;
          font-weight: 700;
        }

        .results-count {
          color: var(--text-light);
          font-size: 0.95rem;
          background: #f1f5f9;
          padding: 0.5rem 1rem;
          border-radius: 20px;
        }

        .no-results {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--text-light);
        }

        .no-results svg {
          opacity: 0.3;
          margin-bottom: 1rem;
        }

        .no-results h3 {
          font-family: 'Crimson Pro', serif;
          font-size: 1.5rem;
          color: var(--text);
          margin-bottom: 0.5rem;
        }

        /* ============= MODAL ============= */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
          animation: fadeIn 0.3s;
        }

        .modal-content {
          background: var(--surface);
          border-radius: 16px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: slideUp 0.3s;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          color: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 1;
        }

        .modal-close:hover {
          background: rgba(0, 0, 0, 0.7);
          transform: rotate(90deg);
        }

        .modal-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .modal-image {
          position: relative;
        }

        .modal-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 16px 0 0 16px;
        }

        .modal-details {
          padding: 2rem 2rem 2rem 0;
        }

        .modal-details h2 {
          font-family: 'Crimson Pro', serif;
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .detail-category {
          color: var(--primary);
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-section {
          margin-bottom: 1.5rem;
        }

        .detail-section h3 {
          font-family: 'Crimson Pro', serif;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          color: var(--text);
        }

        .detail-section p {
          color: var(--text-light);
          line-height: 1.6;
        }

        .detail-meta {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--text);
        }

        .contact-item a {
          color: var(--primary);
          text-decoration: none;
        }

        .contact-item a:hover {
          text-decoration: underline;
        }

        /* ============= RESPONSIVE ============= */
        @media (max-width: 1024px) {
          .navigation {
            width: 240px;
          }

          .main-content {
            margin-left: 240px;
          }

          .modal-body {
            grid-template-columns: 1fr;
          }

          .modal-image img {
            border-radius: 16px 16px 0 0;
            max-height: 400px;
          }
        }

        @media (max-width: 768px) {
          .navigation {
            position: static;
            width: 100%;
            height: auto;
            border-right: none;
            border-bottom: 1px solid var(--border);
            padding: 1rem;
          }

          .nav-brand {
            margin-bottom: 1rem;
          }

          .nav-links {
            flex-direction: row;
            overflow-x: auto;
          }

          .nav-link {
            white-space: nowrap;
          }

          .main-content {
            margin-left: 0;
          }

          .auth-container {
            grid-template-columns: 1fr;
          }

          .auth-left {
            display: none;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .filter-row {
            grid-template-columns: 1fr;
          }

          .items-grid {
            grid-template-columns: 1fr;
          }

          .page-container {
            padding: 2rem 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
