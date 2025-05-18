module.exports = {
  setExpiredCollections: {
    task: async ({ strapi }) => {
      try {
        console.log(
          `____________________Начата очистка просроченных сборов ${new Date()}____________________`
        );

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

        console.log(
          `____________________Закончена очистка просроченных сборов ${new Date()}____________________`
        );
      } catch (err) {
        console.error("Ошибка при сбросе просроченных сборов", err);
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
        console.log(
          `____________________Начата автосортировка заявок на волонтёра ${new Date()}____________________`
        );
        console.log("TMP:", process.env.TMP);
        console.log("TEMP:", process.env.TEMP);
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
        console.log(volunteerRole);

        requests.forEach((item) => {
          console.log(item);

          strapi.entityService.update(
            "plugin::users-permissions.user",
            item.user.id,
            {
              data: { role: volunteerRole.id },
            }
          );
        });

        console.log(
          `____________________Закончена автосортировка заявок на волонтёра ${new Date()}____________________`
        );
      } catch (err) {
        console.error("Ошибка при сортировка заявок на волонтёра", err);
      }
    },
    options: {
      rule: "* * * * *", // Каждый день в 12:00
      tz: "Europe/Moscow",
    },
  },
};
