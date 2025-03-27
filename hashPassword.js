// hashPassword.js
const bcrypt = require('bcryptjs');

const password = 'erbil123'; // Hash'lemek istediğiniz şifre
bcrypt.genSalt(10, (err, salt) => {
  bcrypt.hash(password, salt, (err, hash) => {
    console.log('Hashlenmiş şifre:', hash);
  });
});