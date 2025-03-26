const { Sequelize, DataTypes } = require('sequelize');

// SQLite veritabanı bağlantısı
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Modelleri yükle
db.Product = require('./product')(sequelize, DataTypes);
db.StockHistory = require('./stockHistory')(sequelize, DataTypes);
db.User = require('./User')(sequelize, DataTypes);

// İlişkileri tanımla
db.Product.hasMany(db.StockHistory, { foreignKey: 'productId', onDelete: 'CASCADE' });
db.StockHistory.belongsTo(db.Product, { foreignKey: 'productId' });

// Modellerin doğru yüklendiğini kontrol et
console.log('Product modeli yüklendi:', db.Product);
console.log('Product.findOne bir fonksiyon mu?', typeof db.Product.findOne === 'function');
console.log('Product.findAll bir fonksiyon mu?', typeof db.Product.findAll === 'function');
console.log('StockHistory modeli yüklendi:', db.StockHistory);
console.log('User modeli yüklendi:', db.User);

// Modelleri ve Sequelize bağlantısını dışa aktar
module.exports = db;