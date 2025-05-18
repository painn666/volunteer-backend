module.exports = {
  upload: {
    config: {
      sizeLimit: 5000000, // <-- сюда
      providerOptions: {
        // параметры провайдера, например credentials и т.п.
      },
    },
  },
};
