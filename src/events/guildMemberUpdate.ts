import { Events, GuildMember, TextChannel } from 'discord.js';
import { Event } from '../../lib/structures/Event.js';
import { App } from '../../lib/App';

export default class GuildMemberUpdateEvent extends Event {
  constructor() {
    super(Events.GuildMemberUpdate);
  }

  async run(client: App, oldMember: GuildMember, newMember: GuildMember): Promise<any> {
    if (oldMember.pending && !newMember.pending) {
      const guildData = await client.database.guilds.fetch(newMember.guild.id);

      if (
        !newMember.guild.available ||
        !guildData?.autorole?.enabled ||
        (!guildData.autorole?.allowBots && newMember.user.bot) ||
        !newMember.guild.roles.cache.has(guildData.autorole?.roleId)
      )
        return;

      return newMember.roles.add(guildData.autorole?.roleId, 'Autorole');
    }

    if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
      const updateRoles = [
          '584460982726950912',
          '692078877496967199',
          '531265681459773440',
          '531267169464483860',
          '531267678564778006',
          '531267771162689546',
          '602143940321214475',
        ],
        allRole = '772968044816498709';

      if (updateRoles.every(elem => newMember.roles.cache.has(elem))) {
        const message = await (newMember.guild.channels.cache.get('530867109505269781') as TextChannel).messages.fetch(
          '552319710792908870',
        );

        message.reactions.cache.each(r => r.users.remove(newMember.id));

        newMember.roles.remove(updateRoles);
        newMember.roles.add(allRole);
      } else if (newMember.roles.cache.has(allRole) && updateRoles.some(elem => newMember.roles.cache.has(elem))) {
        newMember.roles.remove(allRole);
      }
    }
  }
}
