require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

async function createAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@movieapp.com' });
        if (existingAdmin) {
            console.log('Admin user already exists');
            console.log('Email:', existingAdmin.email);
            console.log('Role:', existingAdmin.role);
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Create admin user
        const adminUser = new User({
            full_name: 'Admin',
            email: 'admin@movieapp.com',
            phone: '0123456789',
            password: hashedPassword,
            role: 'admin',
            is_phone_verified: true,
            avatar: null
        });

        await adminUser.save();
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@movieapp.com');
        console.log('🔑 Password: admin123');
        console.log('👑 Role: admin');

    } catch (error) {
        console.error('❌ Error creating admin:', error);
    } finally {
        mongoose.disconnect();
    }
}

createAdmin(); 
 