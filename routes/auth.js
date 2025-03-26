const express = require('express');
const router = express.Router();
const { User } = require('../models');

// GET /login: Giriş formunu render eder.
router.get('/login', (req, res) => {
  const error = req.query.error;
  res.render('login', { title: 'Giriş Yap', error });
});

// POST /login: Giriş işlemini gerçekleştirir ve başarılıysa /stock'a yönlendirir.
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Boş alan kontrolü
    if (!username || !password) {
      return res.redirect('/login?error=Eksik alanlar var');
    }

    // Kullanıcı adıyla eşleşen kaydı bul
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.redirect('/login?error=Kullanıcı bulunamadı');
    }

    // Şifre kontrolü
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.redirect('/login?error=Hatalı şifre');
    }

    // Giriş başarılı: Session bilgisini kaydet ve /stock'a yönlendir
    req.session.isAuthenticated = true;
    return res.redirect('/stock');
  } catch (err) {
    console.error(err);
    return res.redirect('/login?error=Sunucu hatası');
  }
});

// GET /logout: Oturumu sonlandırır.
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/stock');
    }
    res.redirect('/login');
  });
});

module.exports = router;
