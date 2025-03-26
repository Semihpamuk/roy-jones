const axios = require('axios');
const config = require('./config');
const { Product, StockHistory } = require('./models');
const cron = require('node-cron');

console.log('updateStock.js: Product modeli:', Product);
console.log('updateStock.js: Product.findOne bir fonksiyon mu?', typeof Product.findOne === 'function');
console.log('updateStock.js: Product.findAll bir fonksiyon mu?', typeof Product.findAll === 'function');
console.log('updateStock.js: StockHistory modeli:', StockHistory);

const syncProducts = async () => {
  try {
    console.log('Trendyol API\'den ürünler çekiliyor...');

    const headers = {
      'Authorization': `Basic ${Buffer.from(`${config.trendyol.apiKey}:${config.trendyol.apiSecureKey}`).toString('base64')}`,
      'Content-Type': 'application/json',
    };

    let page = 0;
    const pageSize = 100;
    let allProducts = [];
    let hasMorePages = true;

    while (hasMorePages) {
      const url = `${config.trendyol.baseUrl}/${config.trendyol.sellerId}/products?page=${page}&size=${pageSize}`;
      console.log('API isteği gönderiliyor:', url);
      const response = await axios.get(url, { headers });
      console.log(`Sayfa ${page} - Ham API Yanıtı:`, JSON.stringify(response.data, null, 2));

      let products = [];
      if (Array.isArray(response.data.content)) {
        products = response.data.content;
        console.log(`Sayfa ${page} - API yanıtı content dizisi:`, products);
      } else if (Array.isArray(response.data)) {
        products = response.data;
        console.log(`Sayfa ${page} - API yanıtı bir dizi:`, products);
      } else if (response.data && response.data.items) {
        products = response.data.items;
        console.log(`Sayfa ${page} - API yanıtında items anahtarı bulundu:`, products);
      } else if (response.data && response.data.products) {
        products = response.data.products;
        console.log(`Sayfa ${page} - API yanıtında products anahtarı bulundu:`, products);
      } else {
        throw new Error('API yanıtı beklenen yapıda değil: Ürün verisi bulunamadı.');
      }

      allProducts = allProducts.concat(products);
      console.log(`Sayfa ${page} - Toplam ${products.length} ürün çekildi. Şu ana kadar toplam: ${allProducts.length}`);

      const totalPages = response.data.totalPages || 1;
      page += 1;
      hasMorePages = page < totalPages && products.length > 0;
    }

    console.log(`Tüm sayfalardan toplam ${allProducts.length} ürün bulundu.`);

    for (const product of allProducts) {
      console.log('İşlenen ürün (ham veri):', JSON.stringify(product, null, 2));

      // Gerekli alanların varlığını ve değerlerini kontrol et
      if (!product.barcode || !product.title || product.quantity === undefined) {
        console.warn(`Gerekli alanlar eksik, bu ürün atlanıyor: barcode=${product.barcode}, title=${product.title}, quantity=${product.quantity}`);
        continue;
      }

      const stockValue = parseInt(product.quantity, 10) || 0;
      console.log(`Ürün: ${product.barcode}, Çekilen quantity: ${product.quantity}, Hesaplanan stockValue: ${stockValue}`);

      let color = 'Bilinmiyor';
      const colorAttribute = product.attributes?.find(attr => attr.attributeId === 47);
      if (colorAttribute && colorAttribute.attributeValue) {
        color = colorAttribute.attributeValue;
      }

      let dbProduct = await Product.findOne({ where: { barcode: product.barcode } });

      if (dbProduct) {
        const oldStock = dbProduct.stock;
        await dbProduct.update({
          productName: product.title,
          productMainId: product.productMainId,
          color: color,
          size: product.attributes?.find(attr => attr.attributeId === 338)?.attributeValue || 'Bilinmiyor',
          stock: stockValue,
          image: product.images?.[0]?.url || null,
        });

        if (oldStock !== stockValue) {
          await StockHistory.create({
            productId: dbProduct.id,
            stock: stockValue,
            change: stockValue - oldStock,
            recordedAt: new Date(),
          });
        }
      } else {
        dbProduct = await Product.create({
          barcode: product.barcode,
          productName: product.title,
          productMainId: product.productMainId,
          color: color,
          size: product.attributes?.find(attr => attr.attributeId === 338)?.attributeValue || 'Bilinmiyor',
          stock: stockValue,
          image: product.images?.[0]?.url || null,
        });

        await StockHistory.create({
          productId: dbProduct.id,
          stock: stockValue,
          change: stockValue,
          recordedAt: new Date(),
        });
      }

      console.log(`Ürün başarıyla işlendi: ${product.barcode}, Stok: ${stockValue}`);
    }

    // Veritabanındaki stoğu sıfır olan ürünleri kontrol et
    const zeroStockProducts = await Product.findAll({ where: { stock: 0 } });
    console.log('Veritabanındaki stoğu sıfır olan ürünler:', JSON.stringify(zeroStockProducts, null, 2));

    console.log('Ürünler başarıyla senkronize edildi.');
  } catch (error) {
    console.error('Ürün senkronizasyonu sırasında hata oluştu:', error.message);
    if (error.response) {
      console.error('API Hata Yanıtı:', JSON.stringify(error.response.data, null, 2));
      console.error('Hata Kodu:', error.response.status);
    }
  }
};

// Güncelleme sıklığını saat başına çekecek şekilde ayarladık: "0 * * * *"
cron.schedule('0 * * * *', syncProducts);

module.exports = syncProducts;
