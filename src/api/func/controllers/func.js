const crypto = require("crypto");
const checkAuthentication = async (ctx) => {
  const authHeader = ctx.request.headers["authorization"];
  if (!authHeader) {
    return ctx.unauthorized("Токен не найден");
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    // Проверяем, является ли пользователь администратором
    const decodedAdmin =
      await strapi.admin.services.token.decodeJwtToken(token);

    if (decodedAdmin && decodedAdmin.payload.id) {
      const adminUser = await strapi.entityService.findOne(
        "admin::user",
        decodedAdmin.payload.id
      );

      if (adminUser) {
        ctx.state.user = adminUser; // Добавляем администратора в контекст
        return true; // Авторизация успешна
      }
    }
  } catch (err) {
    // Если ошибка, пробуем проверить как обычного пользователя
  }

  try {
    // Проверяем токен обычного пользователя
    const user =
      await strapi.plugins["users-permissions"].services.jwt.verify(token);

    // Добавляем пользователя в контекст
    ctx.state.user = user;

    // Проверяем, совпадает ли id пользователя из токена с переданным в запросе
    const { userId } = ctx.request.body || ctx.request.query;
    if (userId && parseInt(userId) !== user.id) {
      return false; // id не совпадают
    }

    return true; // Авторизация успешна
  } catch (err) {
    return false;
  }
};
const getDiffInHours = (date1, date2) => {
  const diffTime = Math.abs(date2 - date1);
  const diffHours = Math.ceil(diffTime / (60 * 60 * 1000));
  return diffHours;
};
async function getSelfData(ctx) {
  const { userId, populate } = ctx.request.query;
  const authError = await checkAuthentication(ctx);
  if (authError == false) {
    return ctx.unauthorized(
      "Токен не найден или не совпадает с id пользователя"
    );
  }

  try {
    const populateArray =
      typeof populate === "string" ? populate.split(",") : [];

    const user = await strapi.entityService.findOne(
      "plugin::users-permissions.user",
      ctx.state.user.id,

      { populate: populateArray }
    );
    if (!user) {
      return ctx.notFound("Пользователь не найден");
    }
    return { success: true, data: user };
  } catch (error) {
    return ctx.internalServerError("Ошибка при создании запроса на помощь");
  }
}
async function createAidRequest(ctx) {
  const { userId, aidRequest } = ctx.request.body;
  const authError = await checkAuthentication(ctx);
  if (authError == false) {
    return ctx.unauthorized(
      "Токен не найден или не совпадает с id пользователя"
    );
  }
  try {
    const user = await strapi.entityService.findOne(
      "plugin::users-permissions.user",
      ctx.state.user.id,
      { populate: ["role"] }
    );
    if (!user) {
      return ctx.notFound("Пользователь не найден");
    }

    const userLastRequest =
      user && user.aid_requests && user.aid_requests.length
        ? user.aid_requests[user.aid_requests.length - 1]
        : null;

    if (
      !aidRequest.slp &&
      !aidRequest.phoneNumber &&
      !aidRequest.town &&
      !aidRequest.region &&
      !aidRequest.descriptionOfAid
    ) {
      return ctx.badRequest("Запрос на помощь не имеет обязательных полей");
    }
    if (userLastRequest !== null) {
      const diff = getDiffInHours(
        new Date(userLastRequest.createdAt),
        new Date()
      );
      if (diff < 1) {
        return ctx.badRequest("Вы уже отправили заявку на помощь");
      }
    }
    const aidRequests = await strapi.entityService.create(
      "api::aid-request.aid-request",
      {
        data: {
          aidRequester: user.id,
          slp: aidRequest.slp,
          phoneNumber: aidRequest.phoneNumber,
          town: aidRequest.town,
          region: aidRequest.region,
          descriptionOfAid: aidRequest.descriptionOfAid,
          additionalInformation: aidRequest.additionalInformation || "",
          directionOfAssistance: aidRequest.directionOfAssistance,
          coordinates: aidRequest.coordinates || "",
          confirmed: false,
          completed: false,
        },
      }
    );
    return { success: true, data: aidRequests };
  } catch (error) {
    console.log(error, error.details.errors);

    return ctx.internalServerError("Ошибка при создании запроса на помощь");
  }
}
async function getAidRequests(ctx) {
  const { userId } = ctx.request.query;
  const authError = await checkAuthentication(ctx);
  if (authError == false) {
    return ctx.unauthorized(
      "Токен не найден или не совпадает с id пользователя"
    );
  }

  try {
    const user = await strapi.entityService.findOne(
      "plugin::users-permissions.user",
      ctx.state.user.id,
      { populate: ["role"] }
    );
    if (!user) {
      return ctx.notFound("Пользователь не найден");
    }
    if (user.role.name === "user") {
      return ctx.unauthorized("Пользователь не имеет доступа к этой функции");
    }
    const aidRequests = await strapi.entityService.findMany(
      "api::aid-request.aid-request",
      { populate: ["designatedVolunteer"] }
    );
    console.log(aidRequests);

    return {
      success: true,
      data: aidRequests.filter((item) => {
        return (
          item.confirmed === true &&
          item.completed !== true &&
          item.designatedVolunteer === null
        );
      }),
    };
  } catch (error) {
    return ctx.internalServerError("Ошибка при создании запроса на помощь");
  }
}
async function completeAidRequest(ctx) {
  const { userId, aidId } = ctx.request.body;
  const authError = await checkAuthentication(ctx);
  if (authError == false) {
    return ctx.unauthorized(
      "Токен не найден или не совпадает с id пользователя"
    );
  }

  try {
    const user = await strapi.entityService.findOne(
      "plugin::users-permissions.user",
      ctx.state.user.id,
      { populate: ["role", "aid_requests_taken"] }
    );
    if (!user) {
      return ctx.notFound("Пользователь не найден");
    }
    if (user.role.name === "user") {
      return ctx.unauthorized("Пользователь не имеет доступа к этой функции");
    }
    const request = await strapi.entityService.findOne(
      "api::aid-request.aid-request",
      aidId
    );
    const diff = getDiffInHours(new Date(request.updatedAt), new Date());
    if (diff <= 12) {
      return ctx.badRequest(
        "Запрос на помощь не может быть завершен раньше, чем через 12 часов после его принятия"
      );
    }
    user.aid_requests_taken
      .filter((request) => request.completed === true)
      .forEach((request) => {
        const diff = getDiffInHours(
          new Date(request.completedDate),
          new Date()
        );
        if (diff <= 1) {
          return ctx.badRequest(
            "Пользователь не может завершить запрос на помощь раньше, чем через 1 час после завершения предыдущего запроса"
          );
        }
      });
    const aidRequest = await strapi.entityService.update(
      "api::aid-request.aid-request",
      aidId,
      {
        data: {
          completed: true,
          completedDate: new Date(),
        },
      }
    );
    return { success: true, data: aidRequest };
  } catch (error) {
    console.log(error);

    return ctx.internalServerError("Ошибка при создании запроса на помощь");
  }
}
async function cancelAidRequest(ctx) {
  const { userId, aidId } = ctx.request.query;
  console.log(userId, aidId);
  const authError = await checkAuthentication(ctx);

  if (authError == false) {
    return ctx.unauthorized(
      "Токен не найден или не совпадает с id пользователя"
    );
  }

  try {
    const user = await strapi.entityService.findOne(
      "plugin::users-permissions.user",
      ctx.state.user.id,
      { populate: ["role"] }
    );
    if (!user) {
      return ctx.notFound("Пользователь не найден");
    }
    if (user.role.name === "volunteer") {
      return ctx.unauthorized("Пользователь не имеет доступа к этой функции");
    }

    const aidRequest = await strapi.entityService.delete(
      "api::aid-request.aid-request",
      aidId
    );
    return { success: true, data: aidRequest };
  } catch (error) {
    console.log(error);

    return ctx.internalServerError("Ошибка при создании запроса на помощь");
  }
}
async function takeAidRequest(ctx) {
  const { userId, aidId } = ctx.request.body;
  const authError = await checkAuthentication(ctx);
  if (authError == false) {
    return ctx.unauthorized(
      "Токен не найден или не совпадает с id пользователя"
    );
  }
  console.log(aidId, userId);

  try {
    const user = await strapi.entityService.findOne(
      "plugin::users-permissions.user",
      ctx.state.user.id,
      { populate: ["role"] }
    );
    if (!user) {
      return ctx.notFound("Пользователь не найден");
    }
    console.count("take");
    if (user.role.name.name === "user") {
      return ctx.unauthorized("Пользователь не имеет доступа к этой функции");
    }
    console.count("take");
    const aidRequest = await strapi.entityService.findOne(
      "api::aid-request.aid-request",
      aidId,
      { populate: ["designatedVolunteer"] }
    );
    console.count("take");
    await strapi.entityService.update("api::aid-request.aid-request", aidId, {
      data: {
        designatedVolunteer: user.id,
      },
    });
    console.count("take");
    return { success: true, data: aidRequest };
  } catch (error) {
    return ctx.internalServerError("Ошибка при взятии заявки на помощь");
  }
}
async function createMoneyCollection(ctx) {
  const { userId, collectionData } = ctx.request.body;
  const authError = await checkAuthentication(ctx);
  if (authError == false) {
    return ctx.unauthorized(
      "Токен не найден или не совпадает с id пользователя"
    );
  }

  try {
    const user = await strapi.entityService.findOne(
      "plugin::users-permissions.user",
      ctx.state.user.id,
      { populate: ["role", "money_collections"] }
    );
    if (!user) {
      return ctx.notFound("Пользователь не найден");
    }
    if (user.role.name === "user") {
      return ctx.unauthorized("Пользователь не имеет доступа к этой функции");
    }
    const userMoneyCollections = Array.isArray(user.money_collections)
      ? user.money_collections[user.money_collections.length - 1]
      : null;

    if (userMoneyCollections !== null) {
      const diff = getDiffInHours(
        new Date(userMoneyCollections.createdAt),
        new Date()
      );
      if (diff <= 24) {
        return ctx.badRequest("Вы уже создали сбор за последние 24 часа");
      }
    }
    if (
      !collectionData.slp ||
      !collectionData.title ||
      !collectionData.moneyNeeded ||
      !collectionData.donationLink ||
      !collectionData.collectionEndDate
    ) {
      return ctx.badRequest("Введены неправильные данные");
    }
    console.log(collectionData);

    const collection = await strapi.entityService.create(
      "api::money-collection.money-collection",
      {
        data: {
          creator: user.id,
          slp: collectionData.slp,
          title: collectionData.title,
          moneyNeeded: collectionData.moneyNeeded,
          collectionEndDate: collectionData.collectionEndDate,
          donationLink: collectionData.donationLink,
          confirmed: false,
          completed: false,
          titlePicture: collectionData.file,
        },
      }
    );
    return { success: true, data: collection };
  } catch (error) {
    console.log(error);

    return ctx.internalServerError("Ошибка при создании запроса на помощь");
  }
}

async function becomeVolunteer(ctx) {
  const { userId, volunteerFile } = ctx.request.body;
  const authError = await checkAuthentication(ctx);
  console.log(volunteerFile);

  if (authError == false) {
    return ctx.unauthorized(
      "Токен не найден или не совпадает с id пользователя"
    );
  }

  try {
    const user = await strapi.entityService.findOne(
      "plugin::users-permissions.user",
      ctx.state.user.id,
      { populate: ["role", "money_collections"] }
    );
    if (!user) {
      return ctx.notFound("Пользователь не найден");
    }
    const volunteerRequests = Array.isArray(user.volunteer_request);
    if (user.role.name === "volunteer" || volunteerRequests) {
      return ctx.unauthorized("Уже имеет заявку на волонтера");
    }
    if (!volunteerFile) {
      return ctx.badRequest("Введены неправильные данные");
    }
    console.log(volunteerFile);

    const volunteerRequest = await strapi.entityService.create(
      "api::volonteer-request.volonteer-request",
      {
        data: {
          user: user.id,
          requestApproved: false,
          volunteerImage: volunteerFile,
        },
      }
    );
    return { success: true, data: volunteerRequest };
  } catch (error) {
    console.log(error);

    return ctx.internalServerError("Ошибка при отправке заявки на волонтера");
  }
}

async function getQuantityOfCompletedAids(ctx) {
  try {
    const aidRequests = await strapi.entityService.findMany(
      "api::aid-request.aid-request"
    );
    console.log(aidRequests);

    return {
      success: true,
      data: aidRequests.filter((item) => {
        return item.confirmed === true && item.completed === true;
      }).length,
    };
  } catch (error) {
    return ctx.internalServerError("Ошибка");
  }
}
const getFilesFromFolder = async (ctx) => {
  try {
    const folder = await strapi.entityService.findMany(
      "plugin::upload.folder",
      {
        filters: { name: "galleryOfAids" },
        limit: 1,
      }
    );

    if (!folder.length) {
      return ctx.badRequest("Folder not found");
    }

    const folderId = folder[0].id;

    const files = await strapi.entityService.findMany("plugin::upload.file", {
      filters: {
        folder: folderId,
      },
      sort: [{ name: "asc" }],
    });

    ctx.send(files);
  } catch (err) {
    console.error(err);
    ctx.internalServerError("Failed to fetch files");
  }
};
module.exports = {
  getFilesFromFolder,
  checkAuthentication,
  createAidRequest,
  getAidRequests,
  completeAidRequest,
  takeAidRequest,
  createMoneyCollection,
  getQuantityOfCompletedAids,
  getSelfData,
  becomeVolunteer,
  cancelAidRequest,
  // getMoneyCollections,
};
