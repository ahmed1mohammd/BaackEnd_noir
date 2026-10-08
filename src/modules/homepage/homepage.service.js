const Product = require('../products/product.model');
const User = require('../users/user.model');

class HomepageService {
  /**
   * Fetch home page payload: featured fragrances, new arrivals, founding customer counter
   */
  static async getHomepageData() {
    const [featuredProducts, newArrivals, foundingCount] = await Promise.all([
      Product.find({ featured: true, active: true }).limit(6),
      Product.find({ active: true }).sort({ createdAt: -1 }).limit(6),
      User.countDocuments({ isFirst100: true })
    ]);

    return {
      heroBanner: {
        title: 'ÉLAN Fragrance',
        subtitle: 'Unveiling Elegance & Timeless Scents',
        tagline: 'Join the Founding 100 Members'
      },
      founding100Stats: {
        claimedSlots: foundingCount,
        totalSlots: 100,
        remainingSlots: Math.max(0, 100 - foundingCount)
      },
      featuredProducts,
      newArrivals
    };
  }
}

module.exports = HomepageService;
