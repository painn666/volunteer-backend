'use strict';

/**
 * money-collection service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::money-collection.money-collection');
