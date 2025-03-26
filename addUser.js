// addUser.js
require('dotenv').config();
const { sequelize, User } = require('./models'); // models klasöründeki index.js dosyasının User modelini içe aktardığından emin olun

const addUser = async () => {
  try {
    // Veritabanını mevcut yapıyla senkronize eder. force: true kullanmadığımızdan, veriler silinmez.
    await sequelize.sync();
    
    // Buradaki kullanıcı adı ve şifreyi istediğiniz gibi değiştirebilirsiniz.
    const username = 'erbil'; // Kullanıcı adı
    const password = 'erbil123'; // Güçlü bir şifre belirleyin
    
    // Yeni kullanıcı oluşturulur. (Password, User modelindeki hook sayesinde otomatik hashlenir)
    const user = await User.create({ username, password });
    
    console.log(`Kullanıcı oluşturuldu: ${user.username}`);
    process.exit(0);
  } catch (error) {
    console.error('Kullanıcı ekleme hatası:', error);
    process.exit(1);
  }
};

addUser();
