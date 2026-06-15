const config = require('../../config');
const settingsRepository = require('../../infrastructure/database/repositories/Settings.repository');
const { SettingCategory } = require('../../domain/enums');

class SettingsService {
  async getPaymentInstructions() {
    const settings = await settingsRepository.getAll();

    return {
      listingFeeEtb: settings.listing_fee_etb || config.payment.listingFeeEtb,
      telebirr: settings.telebirr_account || config.payment.telebirr,
      cbe: settings.cbe_account || config.payment.cbe,
    };
  }

  async getListingFee() {
    const fee = await settingsRepository.getByKey('listing_fee_etb');
    return fee || config.payment.listingFeeEtb;
  }

  async getListingDurationDays() {
    const days = await settingsRepository.getByKey('listing_duration_days');
    return days || config.payment.listingDurationDays;
  }

  async getFeaturedAreas() {
    const areas = await settingsRepository.getByKey('featured_areas');
    return areas || ['Bole', 'CMC', 'Summit', 'Ayat', 'Gerji', 'Megenagna', 'Sarbet', 'Kazanchis'];
  }

  async getAllSettings() {
    return settingsRepository.getAll();
  }

  async updateSettings(settings, updatedBy) {
    return settingsRepository.bulkUpsert(settings, updatedBy);
  }

  async seedDefaults() {
    const defaults = [
      { key: 'listing_fee_etb', value: 20, category: SettingCategory.PAYMENT },
      { key: 'listing_duration_days', value: 90, category: SettingCategory.LISTING },
      { key: 'min_property_images', value: 0, category: SettingCategory.LISTING },
      { key: 'max_property_images', value: 20, category: SettingCategory.LISTING },
      {
        key: 'featured_areas',
        value: ['Bole', 'CMC', 'Summit', 'Ayat', 'Gerji', 'Megenagna', 'Sarbet', 'Kazanchis'],
        category: SettingCategory.GENERAL,
      },
      {
        key: 'telebirr_account',
        value: config.payment.telebirr,
        category: SettingCategory.PAYMENT,
      },
      {
        key: 'cbe_account',
        value: config.payment.cbe,
        category: SettingCategory.PAYMENT,
      },
    ];

    for (const setting of defaults) {
      const existing = await settingsRepository.getByKey(setting.key);
      if (!existing) {
        await settingsRepository.upsert(setting.key, setting.value, setting.category);
      }
    }
  }
}

module.exports = new SettingsService();
