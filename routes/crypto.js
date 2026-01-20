import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { superBase } from '../modules/superBaseAPI.js';

const router = express.Router();

// Configure multer for face photo uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'faces');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'face-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only JPEG, JPG, and PNG images are allowed'));
        }
    }
});

// ============================================
// POST /api/crypto/register
// Register a new user
// ============================================
router.post('/register', upload.single('facePhoto'), async (req, res) => {
    try {
        const { thaiMobile, password, pin } = req.body;

        // Validation
        if (!thaiMobile || !password || !pin) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate Thai mobile number (10 digits, starts with 0)
        const mobileRegex = /^0[0-9]{9}$/;
        if (!mobileRegex.test(thaiMobile)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Thai mobile number format'
            });
        }

        // Validate PIN (6 digits)
        const pinRegex = /^[0-9]{6}$/;
        if (!pinRegex.test(pin)) {
            return res.status(400).json({
                success: false,
                message: 'PIN must be exactly 6 digits'
            });
        }

        // Validate password strength (min 8 characters)
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters'
            });
        }

        // Check if mobile already exists
        const { data: existingUser } = await superBase
            .from('crypto_users')
            .select('user_id')
            .eq('thai_mobile', thaiMobile)
            .single();

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Mobile number already registered'
            });
        }

        // Hash password and PIN
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const pinHash = await bcrypt.hash(pin, saltRounds);

        // Get face photo path (if uploaded)
        let facePhotoPath = null;
        if (req.file) {
            facePhotoPath = `/uploads/faces/${req.file.filename}`;
        }

        // Insert new user into database
        const { data: newUser, error } = await superBase
            .from('crypto_users')
            .insert([{
                thai_mobile: thaiMobile,
                password_hash: passwordHash,
                pin_hash: pinHash,
                face_photo_path: facePhotoPath,
                wallet_balance: 500.00000000 // Default balance
            }])
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({
                success: false,
                message: 'Database error during registration'
            });
        }

        // Create initial transaction record
        await superBase
            .from('crypto_transactions')
            .insert([{
                user_id: newUser.user_id,
                transaction_type: 'initial',
                amount: 500.00000000,
                balance_before: 0,
                balance_after: 500.00000000,
                description: 'Initial wallet balance'
            }]);

        // Return success
        res.status(201).json({
            success: true,
            userId: newUser.user_id,
            message: 'Registration successful',
            walletBalance: newUser.wallet_balance
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ============================================
// POST /api/crypto/login
// Authenticate user
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { thaiMobile, password } = req.body;

        // Validation
        if (!thaiMobile || !password) {
            return res.status(400).json({
                success: false,
                message: 'Missing mobile or password'
            });
        }

        // Find user by mobile
        const { data: user, error } = await superBase
            .from('crypto_users')
            .select('user_id, password_hash, wallet_balance')
            .eq('thai_mobile', thaiMobile)
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid mobile or password'
            });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid mobile or password'
            });
        }

        // Login successful
        res.json({
            success: true,
            userId: user.user_id,
            walletBalance: parseFloat(user.wallet_balance),
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ============================================
// GET /api/crypto/balance/:userId
// Get user wallet balance
// ============================================
router.get('/balance/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Fetch user balance
        const { data: user, error } = await superBase
            .from('crypto_users')
            .select('wallet_balance, updated_at')
            .eq('user_id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            userId: userId,
            balance: parseFloat(user.wallet_balance),
            lastUpdated: user.updated_at
        });

    } catch (error) {
        console.error('Balance fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ============================================
// GET /api/crypto/user/:userId
// Get user profile
// ============================================
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Fetch user data (excluding sensitive info)
        const { data: user, error } = await superBase
            .from('crypto_users')
            .select('user_id, thai_mobile, wallet_balance, face_photo_path, created_at')
            .eq('user_id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                userId: user.user_id,
                mobile: user.thai_mobile,
                balance: parseFloat(user.wallet_balance),
                facePhoto: user.face_photo_path,
                memberSince: user.created_at
            }
        });

    } catch (error) {
        console.error('User fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

export default router;
