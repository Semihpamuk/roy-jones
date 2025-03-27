module.exports = (sequelize, DataTypes) => {
  const StockHistory = sequelize.define('StockHistory', {
    productId: {
      type: DataTypes.INTEGER, // STRING yerine INTEGER
      allowNull: false,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    change: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    recordedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    timestamps: true,
  });

  StockHistory.associate = (models) => {
    StockHistory.belongsTo(models.Product, { foreignKey: 'productId' });
  };

  return StockHistory;
};