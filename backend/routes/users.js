const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST api/users/register
// @desc    Register new user
router.post('/register', async (req, res) => {
    const { firstName, lastName, email, password, mobile, departmentCode } = req.body;

    // 1. Validation
    if (!firstName || !lastName || !email || !password || !mobile) {
        return res.status(400).json({ msg: 'Please enter all required fields including mobile number' });
    }

    try {
        // 2. Check if user exists (Case-insensitive email check)
        const userExists = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
        if (userExists) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Check if mobile number is already registered
        const mobileExists = await User.findOne({ mobile });
        if (mobileExists) {
            return res.status(400).json({ msg: 'An account with this mobile number already exists' });
        }

        // Determine role and departmentId backend-side
        let role = "user";
        let departmentId = null;

        if (departmentCode === "super999") {
            role = "super_admin";
            departmentId = "Super Admin";
        } else if (departmentCode) {
            role = "authority";
            departmentId = departmentCode;
        }

        // 3. Create instance
        const newUser = new User({
            firstName,
            lastName,
            email,
            password,
            mobile,
            role,
            departmentId
        });

        // 4. Hash password
        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(password, salt);

        // 5. Save to DB
        const savedUser = await newUser.save();

        // 6. Return JWT
        jwt.sign(
            { id: savedUser.id },
            process.env.JWT_SECRET,
            { expiresIn: 3600 },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: savedUser.id,
                        firstName: savedUser.firstName,
                        lastName: savedUser.lastName,
                        email: savedUser.email,
                        role: savedUser.role,
                        departmentId: savedUser.departmentId
                    }
                });
            }
        );
    } catch (err) {
        console.error("Register Error:", err.message);
        res.status(500).json({ msg: 'Server error during registration', error: err.message });
    }
});

// @route   POST api/users/login
// @desc    Login user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
        if (!user) return res.status(400).json({ msg: 'User does not exist' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: 3600 },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        role: user.role,
                        departmentId: user.departmentId
                    }
                });
            }
        );
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ msg: 'Server error during login' });
    }
});

// @route   POST api/users/forgot-password
// @desc    Simulate sending a password reset email
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ msg: 'Please enter your email address' });
    }

    try {
        const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
        if (!user) {
            return res.status(404).json({ msg: 'User with this email does not exist' });
        }

        // Return a mock reset token / link
        res.json({
            msg: 'Password reset link sent to your email (simulated).',
            email: user.email,
            resetEnabled: true
        });
    } catch (err) {
        console.error("Forgot Password Error:", err.message);
        res.status(500).json({ msg: 'Server error during password reset request' });
    }
});

// @route   POST api/users/reset-password
// @desc    Directly reset password
router.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    }

    try {
        const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
        if (!user) {
            return res.status(404).json({ msg: 'User does not exist' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ msg: 'Password reset successfully. You can now sign in.' });
    } catch (err) {
        console.error("Reset Password Error:", err.message);
        res.status(500).json({ msg: 'Server error during password reset' });
    }
});

module.exports = router;
