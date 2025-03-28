require('dotenv').config();
const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const session = require('express-session');
const { sequelize } = require('./models');

const app = express();

// Express'in proxy'yi tanıması için trust proxy ayarını yapıyoruz
app.set('trust proxy', 1);

// Helmet ile CSP'yi özel olarak yapılandırıyoruz:
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://cdn.dsmcdn.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  })
);

// Oturum yönetimi (MemoryStore kullanıyoruz; Redis için ek yapılandırma yorum satırında)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Üretimde HTTPS için true, yerel testte false
      maxAge: 24 * 60 * 60 * 1000 // 24 saatlik oturum süresi
    }
  })
);

// Redis kullanımı (gelecekte kullanmak isterseniz)
// let sessionStore;
// if (process.env.REDIS_URL) {
//   const RedisStore = require('connect-redis')(session);
//   const redis = require('redis');
//   const redisClient = redis.createClient({ url: process.env.REDIS_URL });
//   redisClient.connect().catch(console.error);
//   sessionStore = new RedisStore({ client: redisClient });
//   app.use(session({
//     store: sessionStore,
//     secret: process.env.SESSION_SECRET || 'your-secret-key',
//     resave: false,
//     saveUninitialized: false,
//     cookie: { secure: process.env.NODE_ENV === 'production' }
//   }));
// }

// Middleware: Oturum bilgisini şablonlara aktar ve log bas
app.use((req, res, next) => {
  console.log('Oturum durumu:', req.session);
  res.locals.isAuthenticated = req.session.isAuthenticated;
  next();
});

// Middleware: Oturum kontrolü ve log ekleme
app.use((req, res, next) => {
  console.log(`Rota: ${req.path}, isAuthenticated: ${req.session.isAuthenticated}`);
  if (req.path === '/login' || req.path === '/logout' || req.path === '/register') {
    return next();
  }
  if (!req.session.isAuthenticated) {
    console.log('Yetkisiz erişim, /login sayfasına yönlendiriliyor');
    return res.redirect('/login');
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(expressLayouts);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layout');

// Rota tanımlamaları
const stockRouter = require('./routes/stock');
const authRouter = require('./routes/auth');

app.use('/stock', stockRouter);
app.use('/', authRouter);

app.get('/', (req, res) => {
  res.redirect('/stock');
});

// Genel hata yakalama middleware'i
app.use((err, req, res, next) => {
  console.error('Genel hata:', err.stack);
  res.status(500).send('Bir hata oluştu!');
});

const PORT = process.env.PORT || 3000;

const syncDatabase = async () => {
  try {
    console.log('Veritabanı senkronize ediliyor...');
    await sequelize.sync();
    console.log('Veritabanı senkronize edildi.');

    const syncProducts = require('./updateStock');
    await syncProducts();

    const { Product } = require('./models');
    const products = await Product.findAll();
    console.log('Veritabanındaki ürünler:', JSON.stringify(products, null, 2));

    app.listen(PORT, () => {
      console.log(`Server ${PORT} portunda çalışıyor`);
    });
  } catch (error) {
    console.error('Başlatma sırasında hata oluştu:', error.message);
    console.error('Hata detayları:', error.stack);
  }
};

syncDatabase();
