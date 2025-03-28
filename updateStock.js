const axios = require('axios');
const config = require('./config'); // config.js'yi kullanıyoruz
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
    let totalPages = 1;

    // Yeni endpoint: https://apigw.trendyol.com/integration/product/sellers/{sellerId}/products
    while (hasMorePages) {
      const url = `${config.trendyol.baseUrl}/${config.trendyol.sellerId}/products?page=${page}&size=${pageSize}`;
      console.log('API isteği gönderiliyor:', url);
      const response = await axios.get(url, { headers });
      console.log(`Sayfa ${page} - Ham API Yanıtı:`, JSON.stringify(response.data, null, 2));

      let products = [];
      if (response.data.result && Array.isArray(response.data.result.items)) {
        products = response.data.result.items;
        totalPages = response.data.result.totalPages || 1;
      } else if (Array.isArray(response.data.content)) {
        products = response.data.content;
        totalPages = response.data.totalPages || 1;
      } else if (Array.isArray(response.data)) {
        products = response.data;
      } else if (response.data && response.data.items) {
        products = response.data.items;
        totalPages = response.data.totalPages || 1;
      } else if (response.data && response.data.products) {
        products = response.data.products;
        totalPages = response.data.totalPages || 1;
      } else {
        throw new Error('API yanıtı beklenen yapıda değil: Ürün verisi bulunamadı.');
      }

      allProducts = allProducts.concat(products);
      console.log(`Sayfa ${page} - Toplam ${products.length} ürün çekildi. Şu ana kadar toplam: ${allProducts.length}`);
      page += 1;
      hasMorePages = page < totalPages && products.length > 0;
    }

    console.log(`Tüm sayfalardan toplam ${allProducts.length} ürün bulundu.`);

    for (const product of allProducts) {
      console.log('İşlenen ürün (ham veri):', JSON.stringify(product, null, 2));

      // Dokümantasyona göre zorunlu alanlar: barcode, title, productMainId, quantity, stockCode
      const barcode = product.barcode;
      const title = product.title || product.productName;
      const productMainId = product.productMainId;
      const quantity = product.quantity;
      const stockCode = product.stockCode;
      
      if (!barcode || !title || quantity === undefined || !productMainId || !stockCode) {
        console.warn(`Gerekli alanlar eksik, ürün atlanıyor: barcode=${barcode}, title=${product.title}, productMainId=${productMainId}, quantity=${quantity}, stockCode=${stockCode}`);
        continue;
      }

      const stockValue = parseInt(quantity, 10) || 0;
      console.log(`Ürün: ${barcode}, quantity: ${quantity}, Hesaplanan stok: ${stockValue}`);

      // Renk bilgisini attributeName üzerinden (küçük harf duyarlı) belirleyelim
      let color = 'Bilinmiyor';
      if (product.attributes && Array.isArray(product.attributes)) {
        const colorAttr = product.attributes.find(attr => 
          attr.attributeName && attr.attributeName.toLowerCase().includes('renk')
        );
        if (colorAttr) {
          color = colorAttr.attributeValue || colorAttr.customAttributeValue || color;
        }
      }

      // Beden bilgisini attributeName üzerinden (küçük harf duyarlı) belirleyelim
      let size = 'Bilinmiyor';
      if (product.attributes && Array.isArray(product.attributes)) {
        const sizeAttr = product.attributes.find(attr => 
          attr.attributeName && attr.attributeName.toLowerCase().includes('beden')
        );
        if (sizeAttr && sizeAttr.attributeValue) {
          size = sizeAttr.attributeValue;
        }
      }

      // Dokümantasyonda yer alan diğer alanların eşleştirmesi:
      const brandId = product.brandId || null;
      const categoryId = product.categoryId || null;
      const dimensionalWeight = product.dimensionalWeight || null;
      const description = product.description || null;
      const currencyType = product.currencyType || null;
      const listPrice = product.listPrice || null;
      const salePrice = product.salePrice || null;
      const vatRate = product.vatRate || null;
      const cargoCompanyId = product.cargoCompanyId || null;
      const shipmentAddressId = product.shipmentAddressId || null;
      const returningAddressId = product.returningAddressId || null;
      const image = (product.images && Array.isArray(product.images) && product.images[0] && product.images[0].url) ? product.images[0].url : null;

      // Veritabanında ürünün mevcut olup olmadığını barcode ile kontrol ediyoruz
      let dbProduct = await Product.findOne({ where: { barcode } });

      if (dbProduct) {
        const oldStock = dbProduct.stock;
        await dbProduct.update({
          productName: title,
          productMainId,
          stockCode,
          color,
          size,
          stock: stockValue,
          brandId,
          categoryId,
          dimensionalWeight,
          description,
          currencyType,
          listPrice,
          salePrice,
          vatRate,
          cargoCompanyId,
          shipmentAddressId,
          returningAddressId,
          image,
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
          id: product.id || undefined,
          barcode,
          productName: title,
          productMainId,
          stockCode,
          color,
          size,
          stock: stockValue,
          brandId,
          categoryId,
          dimensionalWeight,
          description,
          currencyType,
          listPrice,
          salePrice,
          vatRate,
          cargoCompanyId,
          shipmentAddressId,
          returningAddressId,
          image,
        });

        await StockHistory.create({
          productId: dbProduct.id,
          stock: stockValue,
          change: stockValue,
          recordedAt: new Date(),
        });
      }

      console.log(`Ürün başarıyla işlendi: ${barcode}, Stok: ${stockValue}`);
    }

    // Stoğu sıfır olan ürünleri loglayalım
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

// Belirlenen aralıkta çalıştırmak için (örneğin, '*/15 * * * *')
cron.schedule(config.syncInterval, syncProducts);

module.exports = syncProducts;
