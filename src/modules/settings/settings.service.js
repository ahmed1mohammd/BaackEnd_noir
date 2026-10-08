const Settings = require('./settings.model');

class SettingsService {
  /**
   * Get or initialize single settings document
   */
  static async getSettings() {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    return settings;
  }

  /**
   * Public settings for checkout frontend (safe public payment numbers, instructions, shipping rules)
   */
  static async getPublicSettings() {
    const settings = await this.getSettings();
    return {
      storeName: settings.storeName,
      storeUrl: settings.storeUrl,
      whatsappNumber: settings.whatsappNumber,
      supportPhone: settings.supportPhone,
      shipping: {
        freeShippingGovernorates: settings.shipping.freeShippingGovernorates,
        defaultCustomerRate: settings.shipping.defaultCustomerRate,
        governorateRates: settings.shipping.governorateRates,
        metroPickupCustomerFee: settings.shipping.metroPickupCustomerFee
      },
      payments: {
        vodafoneCash: {
          enabled: settings.payments.vodafoneCash?.enabled,
          number: settings.payments.vodafoneCash?.number,
          feePercent: settings.payments.vodafoneCash?.feePercent || 0,
          instructions: settings.payments.vodafoneCash?.instructions
        },
        instaPay: {
          enabled: settings.payments.instaPay?.enabled,
          account: settings.payments.instaPay?.account,
          feePercent: settings.payments.instaPay?.feePercent || 0,
          instructions: settings.payments.instaPay?.instructions
        },
        cod: {
          enabled: settings.payments.cod?.enabled,
          feeAmount: settings.payments.cod?.feeAmount || 0
        },
        fawaterk: {
          enabled: settings.payments.fawaterk?.enabled,
          feePercent: settings.payments.fawaterk?.feePercent || 0
        }
      }
    };
  }

  /**
   * Update settings (Admin)
   */
  static async updateSettings(data) {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(data);
    } else {
      if (data.storeName) settings.storeName = data.storeName;
      if (data.storeUrl) settings.storeUrl = data.storeUrl;
      if (data.whatsappNumber) settings.whatsappNumber = data.whatsappNumber;
      if (data.supportPhone) settings.supportPhone = data.supportPhone;

      if (data.shipping) {
        if (data.shipping.freeShippingGovernorates) {
          settings.shipping.freeShippingGovernorates = data.shipping.freeShippingGovernorates;
        }
        if (data.shipping.defaultCustomerRate !== undefined) {
          settings.shipping.defaultCustomerRate = Number(data.shipping.defaultCustomerRate);
        }
        if (data.shipping.governorateRates) {
          settings.shipping.governorateRates = data.shipping.governorateRates;
        }
        if (data.shipping.realCostMap) {
          settings.shipping.realCostMap = data.shipping.realCostMap;
        }
        if (data.shipping.metroPickupCustomerFee !== undefined) {
          settings.shipping.metroPickupCustomerFee = Number(data.shipping.metroPickupCustomerFee);
        }
        if (data.shipping.metroPickupRealCost !== undefined) {
          settings.shipping.metroPickupRealCost = Number(data.shipping.metroPickupRealCost);
        }
      }

      if (data.payments) {
        if (data.payments.vodafoneCash) {
          settings.payments.vodafoneCash = {
            ...settings.payments.vodafoneCash.toObject(),
            ...data.payments.vodafoneCash
          };
        }
        if (data.payments.instaPay) {
          settings.payments.instaPay = {
            ...settings.payments.instaPay.toObject(),
            ...data.payments.instaPay
          };
        }
        if (data.payments.cod) {
          settings.payments.cod = {
            ...settings.payments.cod.toObject(),
            ...data.payments.cod
          };
        }
        if (data.payments.fawaterk) {
          settings.payments.fawaterk = {
            ...settings.payments.fawaterk.toObject(),
            ...data.payments.fawaterk
          };
        }
      }

      await settings.save();
    }

    return settings;
  }
}

module.exports = SettingsService;
