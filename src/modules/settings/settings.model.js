const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: 'ÉLAN'
    },
    storeUrl: {
      type: String,
      default: 'https://elan.online'
    },
    whatsappNumber: {
      type: String,
      default: '201132687324'
    },
    supportPhone: {
      type: String,
      default: '01132687324'
    },
    // Shipping configuration
    shipping: {
      freeShippingGovernorates: {
        type: [String],
        default: ['Cairo', 'القاهرة', 'Giza', 'الجيزة']
      },
      defaultCustomerRate: {
        type: Number,
        default: 55
      },
      governorateRates: {
        type: Map,
        of: Number,
        default: {
          'Alexandria': 55,
          'الإسكندرية': 55,
          'Qalyubia': 50,
          'القليوبية': 50,
          'Sharqia': 60,
          'الشرقية': 60,
          'Dakahlia': 60,
          'الدقهلية': 60,
          'Gharbia': 60,
          'الغربية': 60,
          'Monufia': 60,
          'المنوفية': 60,
          'Beheira': 65,
          'البحيرة': 65,
          'Ismailia': 65,
          'الإسماعيلية': 65,
          'Suez': 65,
          'السويس': 65,
          'Port Said': 65,
          'بور سعيد': 65,
          'Faiyum': 70,
          'الفيوم': 70,
          'Beni Suef': 75,
          'بني سويف': 75,
          'Minya': 80,
          'المنيا': 80,
          'Assiut': 85,
          'أسيوط': 85,
          'Sohag': 85,
          'سوهاج': 85,
          'Qena': 90,
          'قنا': 90,
          'Luxor': 95,
          'الأقصر': 95,
          'Aswan': 100,
          'أسوان': 100,
          'Red Sea': 110,
          'البحر الأحمر': 110,
          'South Sinai': 110,
          'جنوب سيناء': 110,
          'North Sinai': 110,
          'شمال سيناء': 110,
          'Matrouh': 110,
          'مطروح': 110,
          'New Valley': 120,
          'الوادي الجديد': 120
        }
      },
      realCostMap: {
        type: Map,
        of: Number,
        default: {
          'Cairo': 35,
          'القاهرة': 35,
          'Giza': 35,
          'الجيزة': 35,
          'Alexandria': 45,
          'الإسكندرية': 45,
          'Delta': 50,
          'Upper Egypt': 70
        }
      },
      metroPickupCustomerFee: {
        type: Number,
        default: 0
      },
      metroPickupRealCost: {
        type: Number,
        default: 15
      }
    },
    // Payment Configuration & Transfer Accounts
    payments: {
      vodafoneCash: {
        enabled: { type: Boolean, default: true },
        number: { type: String, default: '01012345678' },
        feePercent: { type: Number, default: 1.0 },
        instructions: {
          type: String,
          default: 'يرجى تحويل إجمالي المبلغ على محفظة فودافون كاش: 01012345678 وإرفاق صورة إشعار التحويل.'
        }
      },
      instaPay: {
        enabled: { type: Boolean, default: true },
        account: { type: String, default: 'elan.perfumes@instapay' },
        feePercent: { type: Number, default: 1.0 },
        instructions: {
          type: String,
          default: 'يرجى تحويل المبلغ عبر إنستاباي على العنوان: elan.perfumes@instapay وإرفاق لقطة شاشة للتأكيد.'
        }
      },
      cod: {
        enabled: { type: Boolean, default: true },
        feeAmount: { type: Number, default: 0 }
      },
      fawaterk: {
        enabled: { type: Boolean, default: true },
        feePercent: { type: Number, default: 0 }
      }
    }
  },
  {
    timestamps: true
  }
);

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
