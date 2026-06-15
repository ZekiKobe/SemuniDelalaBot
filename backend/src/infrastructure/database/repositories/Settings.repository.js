const AppSetting = require('../models/AppSetting.model');

class SettingsRepository {
  async getByKey(key) {
    const setting = await AppSetting.findOne({ key });
    return setting?.value;
  }

  async getAll() {
    const settings = await AppSetting.find();
    return settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
  }

  async upsert(key, value, category, updatedBy) {
    return AppSetting.findOneAndUpdate(
      { key },
      { value, category, updatedBy },
      { upsert: true, new: true }
    );
  }

  async bulkUpsert(settings, updatedBy) {
    const ops = settings.map((s) =>
      AppSetting.findOneAndUpdate(
        { key: s.key },
        { value: s.value, updatedBy },
        { upsert: true, new: true }
      )
    );
    return Promise.all(ops);
  }
}

module.exports = new SettingsRepository();
