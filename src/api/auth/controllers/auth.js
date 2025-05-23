const crypto = require("crypto");
const _ = require("lodash");
const { concat, compact, isArray } = require("lodash/fp");
const utils = require("@strapi/utils");
const {
  validateCallbackBody,
  validateRegisterBody,
  validateSendEmailConfirmationBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
  validateEmailConfirmationBody,
  validateChangePasswordBody,
} = require("../../../../node_modules/@strapi/plugin-users-permissions/server/controllers/validation/auth");
const https = require("https");
const { ApplicationError, ValidationError, ForbiddenError } = utils.errors;
const sanitizeUser = (user, ctx) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel("plugin::users-permissions.user");

  return strapi.contentAPI.sanitize.output(user, userSchema, { auth });
};
module.exports = ({ strapi }) => ({
  async register(ctx) {
    console.log("abc");

    const pluginStore = await strapi.store({
      type: "plugin",
      name: "users-permissions",
    });
    const settings = await pluginStore.get({ key: "advanced" });

    if (!settings.allow_register) {
      throw new ApplicationError("Регистрация временно отключена");
    }

    const { register } = strapi.config.get("plugin::users-permissions");
    const alwaysAllowedKeys = [
      "phone",
      "password",
      "email",
      "firstname",
      "surname",
      "phone",
      "gender",
      "birthDate",
    ];

    const allowedKeys = compact(
      concat(
        alwaysAllowedKeys,
        isArray(register?.allowedFields) ? register.allowedFields : []
      )
    );

    const invalidKeys = Object.keys(ctx.request.body).filter(
      (key) => !allowedKeys.includes(key)
    );
    if (invalidKeys.length > 0) {
      throw new ValidationError(
        `Неверные параметры: ${invalidKeys.join(", ")}`
      );
    }

    const params = {
      ..._.pick(ctx.request.body, allowedKeys),
      provider: "local",
    };

    const { password, email, firstname, surname, phone, gender, birthDate } =
      params;
    // Валидация phone
    console.log(params);

    if (
      !phone ||
      phone.length < 10 ||
      !password ||
      password.length < 3 ||
      !email ||
      email.length < 6 ||
      !firstname ||
      firstname.length < 3 ||
      !surname ||
      surname.length < 10 ||
      gender === null ||
      gender === undefined ||
      !birthDate
    ) {
      return ctx.unauthorized("Введены неправильные данные");
    }
    let sanitizedPhone = phone;

    // Удаляем символ '+' в начале номера телефона, если он есть
    if (sanitizedPhone.startsWith("+")) {
      sanitizedPhone = sanitizedPhone.slice(1);
    }

    const phoneRegex = /^[0-9]{6,12}$/; // только цифры, от 6 до 12
    if (!phoneRegex.test(sanitizedPhone)) {
      throw new ValidationError("Неверный формат телефона");
    }

    // Обновляем параметр phone в params
    params.phone = sanitizedPhone;

    const role = await strapi.db
      .query("plugin::users-permissions.role")
      .findOne({ where: { type: settings.default_role } });
    if (!role) {
      throw new ApplicationError("Не удалось найти роль по умолчанию");
    }

    const existingUser = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { email: email } });
    if (existingUser) {
      throw new ApplicationError("Такой пользователь уже существует");
    }

    try {
      // Создание нового пользователя
      const newUser = {
        phone,
        password,
        role: role.id,
        confirmed: !settings.email_confirmation,
        email,
        firstname,
        surname,
        gender,
        birthDate,
      };

      const user = await strapi
        .plugin("users-permissions")
        .service("user")
        .add(newUser);
      const jwt = strapi
        .plugin("users-permissions")
        .service("jwt")
        .issue({ id: user.id });

      // Исключаем поля, которые не нужно отправлять в ответ
      const safeUser = _.omit(user, [
        "password",
        "role",
        "resetPasswordToken",
        "confirmationToken",
      ]);

      return ctx.send({
        jwt,
        user: safeUser,
      });
    } catch (error) {
      // Обработка ошибок при создании пользователя
      console.error("Ошибка регистрации:", error);
      if (error instanceof ValidationError) {
        throw new ValidationError(error.message);
      } else {
        throw new ApplicationError("Ошибка при регистрации пользователя");
      }
    }
  },
  async login(ctx) {
    const { email, password } = ctx.request.body;

    // Проверка, что оба параметра переданы
    if (!email || !password) {
      return ctx.badRequest("Параметры email и password обязательны.");
    }

    // Поиск пользователя по номеру телефона
    const user = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { email },
      });

    // Проверка, что пользователь существует и пароль верный
    if (
      !user ||
      !(await strapi
        .plugin("users-permissions")
        .service("user")
        .validatePassword(password, user.password))
    ) {
      return ctx.unauthorized("Неверный логин или пароль.");
    }

    // Проверка, подтвержден ли аккаунт
    if (!user.confirmed) {
      return ctx.unauthorized("Аккаунт не подтвержден.");
    }

    // Проверка, заблокирован ли аккаунт
    if (user.blocked) {
      return ctx.unauthorized("Аккаунт заблокирован.");
    }

    // Генерация JWT токена
    const jwt = strapi.plugin("users-permissions").service("jwt").issue({
      id: user.id,
    });

    // Возвращаем токен и информацию о пользователе
    return ctx.send({
      jwt,
      user: await sanitizeUser(user, ctx),
    });
  },
});
