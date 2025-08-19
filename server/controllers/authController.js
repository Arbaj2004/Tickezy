const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');


function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

const createSendToken = (user, statusCode, req, res) => {
    const tokenData = {
        id: user.id,
        email: user.email,
        role: user.role
    }
    const token = jwt.sign(tokenData, process.env.JWT_SECRET_KEY, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
    user.password = undefined;
    const prod = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined; // e.g. .yourdomain.com
    res.status(statusCode).cookie('token', token, {
        maxAge: 9000000,
        httpOnly: true,
        secure: prod,
        sameSite: prod ? 'none' : 'lax',
        domain: cookieDomain,
        path: '/',
    }).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const { name, email, password, passwordConfirm } = req.body;
    if (password !== passwordConfirm) {
        return next(new AppError('Passwords do not match!', 400));
    }

    // Check if email already exists
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
        return next(new AppError('Email already exists.', 400));
    }

    // Generate 6-digit OTP
    const Emailotp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(Emailotp).digest('hex');
    const EmailotpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Modify email with notverified tag
    const randomStr = generateRandomString(6);
    const modifiedEmail = `notverified${randomStr}${email}`;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
        `INSERT INTO users (name, email, password, role, email_otp, email_otp_expires)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, email, role`,
        [name, modifiedEmail, hashedPassword, 'User', hashedOtp, EmailotpExpires]
    );

    // Log OTP for now (replace with email sender later)
    console.log(`✅ OTP for ${email}: ${Emailotp}`);
    try {
        // await sendEmail({
        //   email,
        //   subject: 'Your OTP for Signup (valid for 10 min)',
        //   html: otpVerificationEmail(name, Emailotp)
        // });
    } catch (err) {
        console.error('❌ Email sending failed:', err.message);

        // Cleanup: Remove OTP from DB since email didn't send
        await pool.query(
            `UPDATE users 
            SET email_otp = NULL, email_otp_expires = NULL 
            WHERE id = $1`,
            [newUser.id]
        );

        return next(new AppError('There was an error sending the email. Try again later!', 500));
    }


    const newUser = result.rows[0];
    createSendToken(newUser, 201, req, res);
});

exports.verifyOtp = catchAsync(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // Decode JWT token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET_KEY);

    // Hash the OTP
    const hashedOtp = crypto.createHash('sha256').update(req.body.Emailotp).digest('hex');

    // Extract real email from `notverified` format
    const realEmail = decoded.email.slice(17); // Remove "notverifiedxxxxx" prefix

    // Find the user by current token email and OTP match
    const userQuery = await pool.query(
        `SELECT * FROM users 
        WHERE email = $1 AND email_otp = $2 AND email_otp_expires > NOW()`,
        [decoded.email, hashedOtp]
    );

    if (userQuery.rows.length === 0) {
        return next(new AppError('Invalid OTP or OTP expired. Please try again.', 401));
    }

    const user = userQuery.rows[0];

    // Update the user: set real email, verified, clear OTP
    const updateResult = await pool.query(
        `UPDATE users
        SET email = $1,
            email_otp = NULL,
            email_otp_expires = NULL
        WHERE id = $2
        RETURNING id, name, email, role`,
        [realEmail, user.id]
    );

    const updatedUser = updateResult.rows[0];

    // Optional: regenerate token with updated email
    const updatedToken = jwt.sign(
        {
            id: updatedUser.id,
            email: updatedUser.email,
            role: updatedUser.role
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Send success response and refresh auth cookie with updated token
    const prod = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
    res.status(200).cookie('token', updatedToken, {
        maxAge: 9000000,
        httpOnly: true,
        secure: prod,
        sameSite: prod ? 'none' : 'lax',
        domain: cookieDomain,
        path: '/',
    }).json({
        status: 'success',
        message: 'OTP verified successfully. Account is now active.',
        token: updatedToken,
        data: {
            user: updatedUser
        }
    });
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }

    // Find user by email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    // Check if user exists and password is correct
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }

    // Create and send token
    createSendToken(user, 200, req, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;

    // 1) Find user by email or mis (if you support that)
    const userQuery = await pool.query(
        `SELECT * FROM users WHERE email = $1`,
        [email]
    );
    const user = userQuery.rows[0];

    if (!user) {
        return next(new AppError('There is no user with this email address.', 404));
    }

    // 2) Generate reset token and hash it
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const tokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // 3) Save hashed token + expiry in DB
    await pool.query(
        `UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3`,
        [hashedToken, tokenExpires, user.id]
    );

    // 4) Send email
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    console.log(`🔗 Reset Link: ${resetURL}`);

    try {
        // await sendEmail({
        //     email: user.email,
        //     subject: 'Your password reset token (valid for 10 min)',
        //     html: passwordResetEmail(user.name, resetURL),
        // });

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!',
        });
    } catch (err) {
        console.error('❌ Email send failed:', err);

        // 5) Cleanup on failure
        await pool.query(
            `UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1`,
            [user.id]
        );

        return next(
            new AppError('There was an error sending the email. Try again later!'),
            500
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    const { password, passwordConfirm } = req.body;

    if (password !== passwordConfirm) {
        return next(new AppError('Passwords do not match', 400));
    }

    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    // 1) Find user with this token and check expiry
    const userQuery = await pool.query(
        `SELECT * FROM users 
     WHERE password_reset_token = $1 
     AND password_reset_expires > NOW()`,
        [hashedToken]
    );

    const user = userQuery.rows[0];

    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }

    // 2) Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3) Update user password, clear token, mark verified
    const updateQuery = await pool.query(
        `UPDATE users
     SET password = $1,
         password_reset_token = NULL,
         password_reset_expires = NULL,
         password_changed_at = NOW()
     WHERE id = $2
     RETURNING id, name, email, role`,
        [hashedPassword, user.id]
    );

    const updatedUser = updateQuery.rows[0];

    // 4) Log user in again
    createSendToken(updatedUser, 200, req, res);
});

exports.protect = catchAsync(async (req, res, next) => {
    let token;

    // 1. Get token from Authorization header or cookies
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return next(
            new AppError('You are not logged in! Please log in to get access.', 401)
        );
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // 3. Get full user from DB and check if still exists
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];

    if (!user) {
        return next(new AppError('User no longer exists.', 401));
    }

    // 4. Check if password changed after token was issued
    if (user.password_changed_at) {
        const changedTimestamp = parseInt(
            new Date(user.password_changed_at).getTime() / 1000,
            10
        );
        if (decoded.iat < changedTimestamp) {
            return next(
                new AppError('Password was changed recently. Please log in again.', 401)
            );
        }
    }

    // 5. Grant access and attach user to request
    req.user = user;
    next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(
                new AppError('You do not have permission to perform this action', 403)
            );
        }
        next();
    };
};

exports.getMe = catchAsync(async (req, res, next) => {
    const user = req.user;
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});

// Update current user's basic profile details
exports.updateMe = catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401));

    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return next(new AppError('Please provide a valid name', 400));
    }

    const updated = await pool.query(
        `UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, role`,
        [name.trim(), userId]
    );

    if (updated.rows.length === 0) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { user: updated.rows[0] }
    });
});

// Clear auth cookie and "logout" the user client-side
exports.logout = (req, res) => {
    const prod = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
    res
        .clearCookie('token', {
            httpOnly: true,
            secure: prod,
            sameSite: prod ? 'none' : 'lax',
            domain: cookieDomain,
            path: '/',
        })
        .status(200)
        .json({ status: 'success', message: 'Logged out' });
};