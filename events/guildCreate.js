'use strict';

const db = require('../database.js'),
  { debugMode } = require('../defaults');
require('colors');

module.exports = {
  name: 'guildCreate',
  async execute(client, i18n, guild) {
    await db.guildSet(guild, { language: guild.preferredLocale });
    if (debugMode) {
      console.log(
        'Joined '.green + guild.name.blue + ' ('.gray + guild.id.blue + ') - '.gray + guild.preferredLocale.blue,
      );
    }
  },
};
