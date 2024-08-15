import process from 'node:process';
import { readFileSync } from 'node:fs';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  BaseInteraction,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  ShardClientUtil,
  version,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { imageOptions, supportServer } from '../defaults.js';
import { toUTS, appInvite, msToTime } from '../utils.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';

export default class Bot extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild],
        description: 'DESC.BOT',
        integration_types: [ApplicationIntegrationType.GuildInstall],
        name: 'CMD.BOT',
        options: [
          {
            description: 'DESC.BOT_INFO',
            name: 'CMD.INFO',
            type: ApplicationCommandOptionType.Subcommand,
          },
        ],
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    const { client, embed, isEphemeral, localize } = args,
      { globalCommandCount } = client,
      { installParams } = client.application,
      { guild, guildId } = interaction,
      botMember = guild?.members.cache.get(client.user.id),
      pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url)).toString());

    if (interaction.isChatInputCommand()) {
      const { options } = interaction;
      await interaction.deferReply({ ephemeral: isEphemeral });

      switch (options.getSubcommand()) {
        case 'info': {
          const guildCommandCount =
              guildId && client.countCommands(await client.application.commands.fetch({ guildId })),
            embs = [
              embed({
                color: botMember?.displayColor || Colors.Blurple,
                title: `${client.useEmoji('info')} ${localize('BOT.INFO.TITLE')}`,
              })
                .setAuthor({ iconURL: client.user.displayAvatarURL(imageOptions), name: client.user.displayName })
                .addFields(
                  {
                    inline: true,
                    name: `${client.useEmoji('discovery')} ${localize('SERVERS')}`,
                    value: client.allShardsReady
                      ? `\`${localize('COUNT', {
                          count: ((await client.shard.fetchClientValues('guilds.cache.size')) as number[]).reduce(
                            (acc, c) => acc + c,
                            0,
                          ),
                        })}\``
                      : `${client.useEmoji('loading')} ${localize('LOADING')}`,
                  },
                  {
                    inline: true,
                    name: `${client.useEmoji('members')} ${localize('MEMBERS')}`,
                    value: client.allShardsReady
                      ? `\`${localize('COUNT', {
                          count: (
                            await client.shard.broadcastEval(c =>
                              c.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
                            )
                          ).reduce((acc, c) => acc + c, 0),
                        })}\``
                      : `${client.useEmoji('loading')} ${localize('LOADING')}`,
                  },
                  {
                    inline: true,
                    name: `${client.useEmoji('apps')} ${localize('COMMANDS')} [${localize('COUNT', {
                      count: globalCommandCount.sum.all,
                    })}${
                      guildCommandCount.sum.all
                        ? ` + ${localize('COUNT', {
                            count: guildCommandCount.sum.all,
                          })}`
                        : ''
                    }]`,
                    value: `- ${client.useEmoji('slashCommand')} \`${localize('COUNT', {
                      count: globalCommandCount.chatInput,
                    })}\`${
                      guildCommandCount.chatInput
                        ? ` + \`${localize('COUNT', {
                            count: guildCommandCount.chatInput,
                          })}\``
                        : ''
                    }\n- ${client.useEmoji('contextMenuCommand')} \`${localize('COUNT', {
                      count: globalCommandCount.sum.contextMenu,
                    })}\`${
                      guildCommandCount.sum.contextMenu
                        ? ` + \`${localize('COUNT', {
                            count: guildCommandCount.sum.contextMenu,
                          })}\``
                        : ''
                    }`,
                  },
                  {
                    inline: true,
                    name: `${client.useEmoji('ramMemory')} ${localize('BOT.INFO.MEMORY_USAGE')}`,
                    value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\`/\`${(
                      process.memoryUsage().heapTotal /
                      1024 /
                      1024
                    ).toFixed(2)} MB\``,
                  },
                  {
                    inline: true,
                    name: `${client.useEmoji('discordJS')} ${localize('BOT.INFO.DISCORDJS_VERSION')}`,
                    value: `[\`${version}\`](https://discord.js.org)`,
                  },
                  {
                    inline: true,
                    name: `${client.useEmoji('nodeJS')} ${localize('BOT.INFO.NODEJS_VERSION')}`,
                    value: `[\`${process.versions.node}\`](https://nodejs.org)`,
                  },
                ),
            ],
            rows = [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel('GitHub')
                  .setEmoji(client.useEmoji('github'))
                  .setStyle(ButtonStyle.Link)
                  .setURL(pkg.repository.url),
                new ButtonBuilder()
                  .setLabel(localize('SUPPORT_SERVER'))
                  .setEmoji(client.useEmoji('discord'))
                  .setStyle(ButtonStyle.Link)
                  .setURL(supportServer.invite),
                new ButtonBuilder()
                  .setLabel(localize('ADD_TO_SERVER'))
                  .setEmoji(client.useEmoji('invite'))
                  .setStyle(ButtonStyle.Link)
                  .setURL(
                    appInvite(client.user.id, { permissions: installParams.permissions, scopes: installParams.scopes }),
                  ),
              ),
            ];

          if (guild) {
            embs[0].addFields({
              inline: true,
              name: `💎 ${localize('SHARD')}`,
              value: `**${localize('CURRENT')}:** \`${
                ShardClientUtil.shardIdForGuildId(guildId, client.shard.count) + 1
              }\`\n**${localize('TOTAL')}:** \`${client.shard.count}\` `,
            });
          }

          embs[0].addFields(
            {
              inline: true,
              name: `🕑 ${localize('UPTIME')}`,
              value: `\`${msToTime(client.uptime)}\` | ${toUTS(Date.now() - client.uptime)}`,
            },
            {
              inline: true,
              name: `📅 ${localize('CREATED')}`,
              value: toUTS(client.user.createdTimestamp),
            },
          );

          return interaction.editReply({
            components: rows,
            embeds: embs,
          });
        }
      }
    }
  }
}
