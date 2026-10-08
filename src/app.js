const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const { globalRateLimiter } = require('./middleware/rateLimiter');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// Import Module Routes
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const productRoutes = require('./modules/products/product.routes');
const orderRoutes = require('./modules/orders/order.routes');
const couponRoutes = require('./modules/coupons/coupon.routes');
const reviewRoutes = require('./modules/reviews/review.routes');
const homepageRoutes = require('./modules/homepage/homepage.routes');
const cloudinaryRoutes = require('./cloudinary/cloudinary.routes');
const fawaterkRoutes = require('./payments/fawaterk/routes');
const rawMaterialRoutes = require('./modules/inventory/rawMaterial.routes');
const formulaRoutes = require('./modules/formulas/formula.routes');
const batchRoutes = require('./modules/batches/batch.routes');
const purchaseRoutes = require('./modules/purchases/purchase.routes');
const expenseRoutes = require('./modules/expenses/expense.routes');
const financeRoutes = require('./modules/finance/finance.routes');
const settingsRoutes = require('./modules/settings/settings.routes');

const app = express();


// 1. Security HTTP Headers
app.use(helmet());

// 2. CORS Configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-fawaterk-signature', 'signature']
  })
);

// 3. Global Rate Limiter
app.use('/api', globalRateLimiter);

// 4. Request Body Parsing & Limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Data Sanitization against NoSQL Query Injection & Parameter Pollution
app.use(mongoSanitize());
app.use(
  hpp({
    whitelist: ['price', 'season', 'fragranceFamily', 'orderStatus', 'paymentStatus']
  })
);

// 6. Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ÉLAN API Server is healthy and running.',
    timestamp: new Date().toISOString()
  });
});

// 7. Mount API Modular Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/home', homepageRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/payments/fawaterk', fawaterkRoutes);
app.use('/api/inventory', rawMaterialRoutes);
app.use('/api/formulas', formulaRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/settings', settingsRoutes);

// 8. 404 Route Handler

app.use(notFound);

// 9. Global Error Handling Middleware
app.use(errorHandler);

module.exports = app;
