// config.js
module.exports = {
    trendyol: {
      apiKey: process.env.TRENDYOL_API_KEY,
      apiSecureKey: process.env.TRENDYOL_API_SECURE_KEY,
      sellerId: process.env.TRENDYOL_SELLER_ID,
      baseUrl: 'https://apigw.trendyol.com/integration/product/sellers',
    },
    syncInterval: '*/15 * * * *',
};