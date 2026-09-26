const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'pocketguard_super_secret_jwt_key_2026_production',
    { expiresIn: '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, mobile, password, confirmPassword } = req.body;

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Clean mobile and email
    const cleanMobile = mobile.trim();
    const cleanEmail = email.toLowerCase().trim();

    // Check if email or mobile exists
    const userExists = await User.findOne({
      $or: [{ email: cleanEmail }, { mobile: cleanMobile }],
    });

    if (userExists) {
      if (userExists.email === cleanEmail) {
        return res.status(400).json({ success: false, message: 'Email is already registered' });
      }
      if (userExists.mobile === cleanMobile) {
        return res.status(400).json({ success: false, message: 'Mobile number is already registered' });
      }
    }

    // Generate cute default avatar using DiceBear or UI Avatars
    const profileImage = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=059669`;

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      password,
      profileImage,
      walletBalance: 0,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profileImage: user.profileImage,
        walletBalance: user.walletBalance,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or mobile

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/mobile and password' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Search user by email or mobile
    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { mobile: identifier.trim() }],
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profileImage: user.profileImage,
        walletBalance: user.walletBalance,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, profileImage } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (profileImage) user.profileImage = profileImage;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profileImage: user.profileImage,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search registered users by mobile or name (excluding self)
// @route   GET /api/auth/users/search
// @access  Private
const searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    const regex = new RegExp(query.trim(), 'i');

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [{ name: regex }, { mobile: regex }, { email: regex }],
    })
      .select('_id name mobile email profileImage')
      .limit(10);

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  searchUsers,
};
