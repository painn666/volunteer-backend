module.exports = {
  setExpiredCollections: {
    task: async ({ strapi }) => {
      try {
        const collections = await strapi.entityService.findMany(
          "api::money-collection.money-collection",
          1
        );

        const today = new Date();
        // Обнуляем время, чтобы сравнивать только даты
        today.setHours(0, 0, 0, 0);

        const filteredCollections = collections.filter((item) => {
          const collectionEndDate = new Date(item.collectionEndDate);
          // Обнуляем время в collectionEndDate
          collectionEndDate.setHours(0, 0, 0, 0);

          // Проверяем, что дата окончания сбора <= сегодняшней
          return collectionEndDate <= today;
        });

        filteredCollections.forEach((item) => {
          strapi.entityService.update(
            "api::money-collection.money-collection",
            item.id,
            {
              data: { completed: true },
            }
          );
        });
      } catch (err) {
        console.error("Error", err);
      }
    },
    options: {
      rule: "* * * * *", // Каждый день в 12:00
      tz: "Europe/Moscow",
    },
  },
  checkValidVolunteerRequests: {
    task: async ({ strapi }) => {
      try {
        const requests = await strapi.entityService.findMany(
          "api::volonteer-request.volonteer-request",
          {
            filters: {
              requestApproved: true,
            },
            populate: ["user"],
          }
        );
        const volunteerRole = await strapi.db
          .query("plugin::users-permissions.role")
          .findOne({
            where: { name: "volunteer" },
          });

        requests.forEach((item) => {
          strapi.entityService.update(
            "plugin::users-permissions.user",
            item.user.id,
            {
              data: { role: volunteerRole.id },
            }
          );
        });
      } catch (err) {
        console.error("Error", err);
      }
    },
    options: {
      rule: "* * * * *", // Каждый день в 12:00
      tz: "Europe/Moscow",
    },
  },
};
