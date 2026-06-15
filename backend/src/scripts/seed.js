require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../infrastructure/database/models/User.model');
const settingsService = require('../application/services/Settings.service');
const { UserRole } = require('../domain/enums');

const seed = async () => {
  await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
  await settingsService.seedDefaults();

  const adminPhone = '+251911000000';
  const existing = await User.findOne({ phoneNumber: adminPhone });

  if (!existing) {
    await User.create({
      fullName: 'Delala Admin',
      phoneNumber: adminPhone,
      email: 'admin@delala.et',
      password: 'Admin@123',
      role: UserRole.SUPER_ADMIN,
      isVerified: true,
    });
    console.log('Super admin created: +251911000000 / Admin@123');
  } else {
    console.log('Super admin already exists');
  }

  console.log('Seed completed');
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
