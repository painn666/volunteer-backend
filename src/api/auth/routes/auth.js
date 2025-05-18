module.exports = {
  routes: [
    {
      method: "POST",
      path: "/auth/local",
      handler: "api::auth.auth.login",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/auth/register",
      handler: "api::auth.auth.register",
      config: {
        policies: [],
      },
    },
    // {
    //   method: "POST",
    //   path: "/auth/change-password",
    //   handler: "api::auth.cauth.changePassword",
    //   config: {
    //     policies: [],
    //   },
    // },
  ],
};
