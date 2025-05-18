module.exports = {
  routes: [
    {
      method: "POST",
      path: "/aidRequest",
      handler: "api::func.func.createAidRequest",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/moneyCollection",
      handler: "api::func.func.createMoneyCollection",
      config: {
        policies: [],
      },
    },
    {
      method: "DELETE",
      path: "/cancelAidRequest",
      handler: "api::func.func.cancelAidRequest",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/becomeVolunteer",
      handler: "api::func.func.becomeVolunteer",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/selfData",
      handler: "api::func.func.getSelfData",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/quantityOfAids",
      handler: "api::func.func.getQuantityOfCompletedAids",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/galleryOfAids",
      handler: "api::func.func.getFilesFromFolder",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/AidRequests",
      handler: "api::func.func.getAidRequests",
      config: {
        policies: [],
      },
    },
    {
      method: "PUT",
      path: "/TakeAidRequest",
      handler: "api::func.func.takeAidRequest",
      config: {
        policies: [],
      },
    },
    {
      method: "PUT",
      path: "/CompleteAidRequest",
      handler: "api::func.func.completeAidRequest",
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
