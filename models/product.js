module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    barcode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    productMainId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    timestamps: true,
  });

  Product.associate = (models) => {
    Product.hasMany(models.StockHistory, { foreignKey: 'productId', onDelete: 'CASCADE' });
  };

  return Product;
};
