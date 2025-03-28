const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Product, StockHistory } = require('../models');
const PDFDocument = require('pdfkit');
const path = require('path');
const axios = require('axios');

console.log('routes/stock.js: Product modeli:', Product);
console.log('routes/stock.js: Product.findAll bir fonksiyon mu?', typeof Product.findAll === 'function');
console.log('routes/stock.js: StockHistory modeli:', StockHistory);

// Tarih aralıklarını hesaplayan yardımcı fonksiyonlar
const getTodayRange = () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  return { start: todayStart, end: todayEnd };
};

const getWeekRange = () => {
  const currentDate = new Date();
  const dayOfWeek = currentDate.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { start: weekStart, end: weekEnd };
};

const getMonthRange = () => {
  const currentDate = new Date();
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);
  return { start: monthStart, end: monthEnd };
};

router.get('/', async (req, res) => {
  console.log('Stock rotasına erişildi:', req.session); // Erişim logu
  const filter = req.query.filter;
  const search = req.query.search;
  let products = [];

  const searchCondition = search
    ? {
        [Op.or]: [
          { barcode: { [Op.like]: `%${search}%` } },
          { productName: { [Op.like]: `%${search}%` } },
          { productMainId: { [Op.like]: `%${search}%` } },
          { color: { [Op.like]: `%${search}%` } },
          { size: { [Op.like]: `%${search}%` } },
        ],
      }
    : {};

  const todayRange = getTodayRange();
  const weekRange = getWeekRange();
  const monthRange = getMonthRange();

  try {
    if (filter === 'zero') {
      products = await Product.findAll({
        where: { stock: 0, ...searchCondition },
      });
      console.log('Stoğu sıfır olan ürünler:', JSON.stringify(products, null, 2));
    } else if (filter === 'oneToTen') {
      products = await Product.findAll({
        where: { stock: { [Op.between]: [1, 10] }, ...searchCondition },
      });
    } else if (filter === 'highest') {
      products = await Product.findAll({
        where: searchCondition,
        order: [['stock', 'DESC']],
      });
    } else if (filter === 'todayOneToTen') {
      const productsWithHistory = await Product.findAll({
        include: [
          {
            model: StockHistory,
            where: { recordedAt: { [Op.between]: [todayRange.start, todayRange.end] } },
            required: true,
          },
        ],
      });
      products = productsWithHistory.filter(product => {
        const histories = product.StockHistories;
        if (histories.length < 2) return false;
        const latestHistory = histories[histories.length - 1];
        const previousHistory = histories[histories.length - 2];
        return (
          latestHistory.stock >= 1 &&
          latestHistory.stock <= 10 &&
          previousHistory.stock > 10
        );
      });
    } else if (filter === 'todayZero') {
      const productsWithHistory = await Product.findAll({
        include: [
          {
            model: StockHistory,
            where: { recordedAt: { [Op.between]: [todayRange.start, todayRange.end] } },
            required: true,
          },
        ],
      });
      products = productsWithHistory.filter(product => {
        const histories = product.StockHistories;
        if (histories.length < 2) return false;
        const latestHistory = histories[histories.length - 1];
        const previousHistory = histories[histories.length - 2];
        return latestHistory.stock === 0 && previousHistory.stock > 0;
      });
    } else if (filter === 'weekOneToTen') {
      const productsWithHistory = await Product.findAll({
        include: [
          {
            model: StockHistory,
            where: { recordedAt: { [Op.between]: [weekRange.start, weekRange.end] } },
            required: true,
          },
        ],
      });
      products = productsWithHistory.filter(product => {
        const histories = product.StockHistories;
        if (histories.length < 2) return false;
        const latestHistory = histories[histories.length - 1];
        const previousHistory = histories[histories.length - 2];
        return (
          latestHistory.stock >= 1 &&
          latestHistory.stock <= 10 &&
          previousHistory.stock > 10
        );
      });
    } else if (filter === 'weekZero') {
      const productsWithHistory = await Product.findAll({
        include: [
          {
            model: StockHistory,
            where: { recordedAt: { [Op.between]: [weekRange.start, weekRange.end] } },
            required: true,
          },
        ],
      });
      products = productsWithHistory.filter(product => {
        const histories = product.StockHistories;
        if (histories.length < 2) return false;
        const latestHistory = histories[histories.length - 1];
        const previousHistory = histories[histories.length - 2];
        return latestHistory.stock === 0 && previousHistory.stock > 0;
      });
    } else if (filter === 'monthOneToTen') {
      const productsWithHistory = await Product.findAll({
        include: [
          {
            model: StockHistory,
            where: { recordedAt: { [Op.between]: [monthRange.start, monthRange.end] } },
            required: true,
          },
        ],
      });
      products = productsWithHistory.filter(product => {
        const histories = product.StockHistories;
        if (histories.length < 2) return false;
        const latestHistory = histories[histories.length - 1];
        const previousHistory = histories[histories.length - 2];
        return (
          latestHistory.stock >= 1 &&
          latestHistory.stock <= 10 &&
          previousHistory.stock > 10
        );
      });
    } else if (filter === 'monthZero') {
      const productsWithHistory = await Product.findAll({
        include: [
          {
            model: StockHistory,
            where: { recordedAt: { [Op.between]: [monthRange.start, monthRange.end] } },
            required: true,
          },
        ],
      });
      products = productsWithHistory.filter(product => {
        const histories = product.StockHistories;
        if (histories.length < 2) return false;
        const latestHistory = histories[histories.length - 1];
        const previousHistory = histories[histories.length - 2];
        return latestHistory.stock === 0 && previousHistory.stock > 0;
      });
    } else {
      products = await Product.findAll({
        where: searchCondition,
      });
    }

    console.log('Stok sayfasında gösterilen ürünler:', JSON.stringify(products, null, 2));
    res.render('stock', { title: 'Stok Yönetimi', products, filter, search });
  } catch (error) {
    console.error('Stok sayfasında ürünler çekilirken hata oluştu:', error.message);
    res.status(500).send('Sunucu hatası: Ürünler çekilemedi. Lütfen tekrar deneyin.');
  }
});

// PDF indirme rotası (mevcut filtrelere uygun şekilde)
router.get('/download-pdf', async (req, res) => {
  console.log('PDF indirme rotasına erişildi:', req.session);
  const filter = req.query.filter;
  const search = req.query.search;
  let products = [];

  const searchCondition = search
    ? {
        [Op.or]: [
          { barcode: { [Op.like]: `%${search}%` } },
          { productName: { [Op.like]: `%${search}%` } },
          { productMainId: { [Op.like]: `%${search}%` } },
          { color: { [Op.like]: `%${search}%` } },
          { size: { [Op.like]: `%${search}%` } },
        ],
      }
    : {};

  try {
    if (filter === 'zero') {
      products = await Product.findAll({
        where: { stock: 0, ...searchCondition },
      });
    } else if (filter === 'oneToTen') {
      products = await Product.findAll({
        where: { stock: { [Op.between]: [1, 10] }, ...searchCondition },
      });
    } else if (filter === 'highest') {
      products = await Product.findAll({
        where: searchCondition,
        order: [['stock', 'DESC']],
      });
    } else {
      products = await Product.findAll({
        where: searchCondition,
      });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Disposition', 'attachment; filename="stock_report.pdf"');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    const fontPath = path.join(__dirname, '../public/fonts/Roboto-Regular.ttf');
    doc.registerFont('Roboto', fontPath);
    doc.font('Roboto');

    const logoPath = path.join(__dirname, '../public/logo.png');
    try {
      doc.image(logoPath, 50, 30, { width: 100 });
    } catch (error) {
      console.warn('Logo dosyası bulunamadı veya yüklenemedi:', error.message);
    }

    doc.fontSize(20).text('Stok Raporu', { align: 'center' });
    doc.moveDown();

    const tableTop = 150;
    const itemHeight = 50;
    let y = tableTop;

    doc.fontSize(10);
    doc.text('Barkod', 30, y);
    doc.text('Ürün İsmi', 110, y);
    doc.text('Model Kodu', 260, y);
    doc.text('Renk', 340, y);
    doc.text('Beden', 400, y);
    doc.text('Stok', 500, y);
    y += itemHeight;

    doc.moveTo(30, tableTop - 5).lineTo(550, tableTop - 5).stroke();
    doc.moveTo(30, y - 5).lineTo(550, y - 5).stroke();

    for (const product of products) {
      doc.text(product.barcode || 'N/A', 30, y);
      doc.text(product.productName || 'N/A', 110, y, { width: 150, ellipsis: true });
      doc.text(product.productMainId || 'N/A', 260, y);
      doc.text(product.color || 'N/A', 340, y);
      doc.text(product.size || 'N/A', 400, y);
      doc.text(product.stock.toString(), 500, y);

      if (product.image) {
        try {
          const response = await axios.get(product.image, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(response.data, 'binary');
          doc.image(imageBuffer, 450, y, { width: 40, height: 40 });
        } catch (error) {
          console.warn(`Görsel yüklenemedi (${product.image}):`, error.message);
          doc.text('N/A', 450, y);
        }
      } else {
        doc.text('N/A', 450, y);
      }

      y += itemHeight;
      if (y > 650) {
        doc.addPage();
        y = 50;
        doc.font('Roboto');
        doc.fontSize(10);
        doc.text('Barkod', 30, y);
        doc.text('Ürün İsmi', 110, y);
        doc.text('Model Kodu', 260, y);
        doc.text('Renk', 340, y);
        doc.text('Beden', 400, y);
        doc.text('Stok', 500, y);
        y += itemHeight;
      }
    }
    doc.end();
  } catch (error) {
    console.error('PDF oluşturulurken hata oluştu:', error.message);
    res.status(500).send('Sunucu hatası: PDF oluşturulamadı. Lütfen tekrar deneyin.');
  }
});

// Ürün detayları
router.get('/:barcode', async (req, res) => {
  console.log('Ürün detayı rotasına erişildi:', req.session);
  try {
    const product = await Product.findOne({ where: { barcode: req.params.barcode } });
    if (!product) {
      return res.status(404).send('Ürün bulunamadı');
    }
    res.render('productDetail', { title: `Ürün Detayı: ${product.productName}`, product });
  } catch (error) {
    console.error('Ürün detayı çekilirken hata oluştu:', error.message);
    res.status(500).send('Sunucu hatası: Ürün detayı çekilemedi. Lütfen tekrar deneyin.');
  }
});

// Ürün stok geçmişi
router.get('/:barcode/history', async (req, res) => {
  console.log('Stok geçmişi rotasına erişildi:', req.session);
  try {
    const product = await Product.findOne({ where: { barcode: req.params.barcode } });
    if (!product) {
      return res.status(404).send('Ürün bulunamadı');
    }
    const histories = await StockHistory.findAll({
      where: { productId: product.id },
      order: [['recordedAt', 'DESC']],
    });
    res.render('productHistory', {
      title: `Stok Geçmişi: ${product.productName}`,
      product,
      histories,
    });
  } catch (error) {
    console.error('Stok geçmişi çekilirken hata oluştu:', error.message);
    res.status(500).send('Sunucu hatası: Stok geçmişi çekilemedi. Lütfen tekrar deneyin.');
  }
});
// Debug route: Tüm ürünleri JSON olarak döner
router.get('/debug-products', async (req, res) => {
  try {
    const products = await Product.findAll();
    console.log('Debug - Tüm Ürünler:', JSON.stringify(products, null, 2));
    res.json(products);
  } catch (error) {
    console.error('Debug ürün sorgusunda hata:', error.message);
    res.status(500).json({ error: 'Ürünler alınamadı.' });
  }
});

module.exports = router;