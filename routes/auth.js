const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
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
    console.log('Giriş denemesi:', { username });

    // Boş alan kontrolü
    if (!username || !password) {
      console.log('Eksik alanlar var');
      return res.redirect('/login?error=Eksik alanlar var');
    }

    // Kullanıcı adıyla eşleşen kaydı bul
    const user = await User.findOne({ where: { username } });
    if (!user) {
      console.log('Kullanıcı bulunamadı:', username);
      return res.redirect('/login?error=Kullanıcı bulunamadı');
    }

    console.log('Kullanıcı bulundu:', user.username);
    console.log('Hashlenmiş şifre:', user.password);

    // Şifre kontrolü
    const valid = await bcrypt.compare(password, user.password);
    console.log('Şifre eşleşti mi?', valid);
    if (!valid) {
      console.log('Hatalı şifre:', username);
      return res.redirect('/login?error=Hatalı şifre');
    }

    // Giriş başarılı: Session bilgisini kaydet ve /stock'a yönlendir
    req.session.isAuthenticated = true;
    console.log('Oturum kaydediliyor:', req.session);
    req.session.save(err => {
      if (err) {
        console.error('Oturum kaydetme hatası:', err);
        return res.redirect('/login?error=Oturum kaydetme hatası');
      }
      console.log('Oturum başarıyla kaydedildi:', req.session);
      return res.redirect('/stock');
    });
  } catch (err) {
    console.error('Giriş hatası:', err);
    return res.redirect('/login?error=Sunucu hatası');
  }
});

// GET /logout: Oturumu sonlandırır.
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Oturum sonlandırma hatası:', err);
      return res.redirect('/stock');
    }
    console.log('Oturum sonlandırıldı');
    res.redirect('/login');
  });
});

module.exports = router;