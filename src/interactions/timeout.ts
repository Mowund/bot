import {
  ApplicationCommandOptionType,
  BaseInteraction,
  PermissionFlagsBits,
  Snowflake,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import parseDur from 'parse-duration';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { msToTime } from '../utils.js';

export default class Timeout extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild],
        defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
        description: 'DESC.TIMEOUT',
        integration_types: [ApplicationIntegrationType.GuildInstall],
        name: 'CMD.TIMEOUT',
        options: [
          {
            description: 'TIMEOUT.DESC.USER',
            name: 'CMD.USER',
            required: true,
            type: ApplicationCommandOptionType.User,
          },
          {
            autocomplete: true,
            description: 'TIMEOUT.DESC.DURATION',
            name: 'CMD.DURATION',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'TIMEOUT.DESC.REASON',
            name: 'CMD.REASON',
            type: ApplicationCommandOptionType.String,
          },
        ],
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    const { embed, isEphemeral, localize } = args,
      { guild, member, memberPermissions, user } = interaction,
      maxDuration = 2419200000;

    if (interaction.isAutocomplete()) {
      const focused = interaction.options.getFocused(),
        msTime = parseDur(focused),
        acUserId = interaction.options.data.find(o => o.name === 'user')?.value as Snowflake,
        acMember = !msTime && acUserId && (await guild.members.fetch(acUserId).catch(() => null));

      return interaction.respond([
        msTime
          ? {
              name:
                msTime > maxDuration
                  ? localize('ERROR.INVALID.TIME_AUTOCOMPLETE', {
                      condition: 'greater',
                      input: msToTime(msTime),
                      time: localize('TIME.DAYS', { count: 28 }),
                    })
                  : msToTime(msTime),
              value: focused,
            }
          : {
              name: localize('TIMEOUT.DURATION.DEFAULT', {
                default: acMember
                  ? acMember.communicationDisabledUntilTimestamp > Date.now()
                    ? 'unset'
                    : 'set'
                  : 'notMember',
                time: localize('TIME.HOURS', { count: 1 }),
              }),
              value: '',
            },
      ]);
    }

    if (interaction.isChatInputCommand()) {
      const { options } = interaction,
        memberO = options.getMember('user'),
        durationO = options.getString('duration'),
        reasonO = options.getString('reason');

      if (!memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({
          embeds: [
            embed({ type: 'error' }).setDescription(
              localize('ERROR.PERM.USER.SINGLE.REQUIRES', { perm: localize('PERM.MODERATE_MEMBERS') }),
            ),
          ],
          ephemeral: true,
        });
      }

      if (!memberO) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(localize("Can't timeout who isn't a member of the server"))],
          ephemeral: true,
        });
      }

      if (guild.ownerId === memberO.id) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(localize("Can't timeout the server owner"))],
          ephemeral: true,
        });
      }

      if (memberO.roles.highest.position >= guild.members.me.roles.highest.position) {
        return interaction.reply({
          embeds: [
            embed({ type: 'error' }).setDescription(
              localize('The target has a role with a higher or same position as me'),
            ),
          ],
          ephemeral: true,
        });
      }

      if (memberO.roles.highest.position >= member.roles.highest.position) {
        return interaction.reply({
          embeds: [
            embed({ type: 'error' }).setDescription(
              localize("You can't timeout who has a role with a higher or same position as you"),
            ),
          ],
          ephemeral: true,
        });
      }

      if (!durationO && memberO.isCommunicationDisabled()) {
        await memberO.timeout(null, `${user.tag}${reasonO ? ` | ${reasonO}` : ''}`);

        return interaction.reply({
          embeds: [embed({ type: 'success' }).setDescription(`Removed timeout from ${memberO}`)],
          ephemeral: isEphemeral,
        });
      }

      const msTime = durationO ? parseDur(durationO) : 3600000;
      if (!msTime || msTime > maxDuration) {
        return interaction.reply({
          embeds: [
            embed({ type: 'error' }).setDescription(
              localize('ERROR.INVALID.TIME', {
                condition: msTime && 'greater',
                input: msTime ? msToTime(msTime) : durationO,
                time: localize('TIME.DAYS', { count: 28 }),
              }),
            ),
          ],
          ephemeral: true,
        });
      }

      await memberO.timeout(msTime, `${user.tag} | Timeouted for ${msToTime(msTime)}${reasonO ? ` | ${reasonO}` : ''}`);

      return interaction.reply({
        embeds: [
          embed({ type: 'success' }).setDescription(`${memberO} has been timed out for \`${msToTime(msTime)}\``),
        ],
        ephemeral: isEphemeral,
      });
    }
  }
}
