import { Events, Guild } from 'discord.js';
import { App } from '../../lib/App.js';
import { Event } from '../../lib/structures/Event.js';
import { debugLevel } from '../defaults.js';

export default class GuildDeleteEvent extends Event {
  constructor() {
    super(Events.GuildDelete);
  }

  run(client: App, guild: Guild): any {
    const { chalk } = client;
    client.updateMowundDescription();

    if (debugLevel) {
      client.log(
        chalk.red('Left ') + chalk.blue(guild.name) + chalk.gray(' (') + chalk.blue(guild.id) + chalk.gray(')'),
      );
    }
  }
}
