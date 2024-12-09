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
  MessageFlags,
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
        integrationTypes: [ApplicationIntegrationType.GuildInstall],
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
    const { __, client, embed, isEphemeral } = args,
      { __dl: __dl, globalCommandCount } = client,
      { installParams } = client.application,
      { guild, guildId } = interaction,
      botMember = guild?.members.cache.get(client.user.id),
      pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url)).toString());

    if (interaction.isChatInputCommand()) {
      const { options } = interaction;
      await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });

      switch (options.getSubcommand()) {
        case __dl('CMD.INFO'): {
          const guildCommandCount =
              guildId && client.countCommands(await client.application.commands.fetch({ guildId })),
            embs = [
              embed({
                color: botMember?.displayColor || Colors.Blurple,
                title: `${client.useEmoji('info')} ${__('BOT.INFO.TITLE')}`,
              })
                .setAuthor({ iconURL: client.user.displayAvatarURL(imageOptions), name: client.user.displayName })
                .addFields(
                  {
                    inline: true,
                    name: `${client.useEmoji('discovery')} ${__('SERVERS')}`,
                    value: client.allShardsReady
                      ? `\`${__('COUNT', {
                          count: ((await client.shard.fetchClientValues('guilds.cache.size')) as number[]).reduce(
                            (acc, c) => acc + c,
                            0,
                          ),
                        })}\``
                      : `${client.useEmoji('loading')} ${__('LOADING')}`,
                  },
                  {
                    inline: true,
                    name: `${client.useEmoji('members')} ${__('MEMBERS')}`,
                    value: client.allShardsReady
                      ? `\`${__('COUNT', {
                          count: (
                            await client.shard.broadcastEval(c =>
                              c.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
                            )
                          ).reduce((acc, c) => acc + c, 0),
                        })}\``
                      : `${client.useEmoji('loading')} ${__('LOADING')}`,
                  },
                  {
                    inline: true,
                    name: `${client.useEmoji('apps')} ${__('COMMANDS')} [${__('COUNT', {
                      count: globalCommandCount.sum.all,
                    })}${
                      guildCommandCount.sum.all
                        ? ` + ${__('COUNT', {
                            count: guildCommandCount.sum.all,
                          })}`
                        : ''
                    }]`,
                    value: `- ${client.useEmoji('slashCommand')} \`${__('COUNT', {
                      count: globalCommandCount.chatInput,
                    })}\`${
                      guildCommandCount.chatInput
                        ? ` + \`${__('COUNT', {
                            count: guildCommandCount.chatInput,
                          })}\``
                        : ''
                    }\n- ${client.useEmoji('contextMenuCommand')} \`${__('COUNT', {
                      count: globalCommandCount.sum.contextMenu,
                    })}\`${
                      guildCommandCount.sum.contextMenu
                        ? ` + \`${__('COUNT', {
                            count: guildCommandCount.sum.contextMenu,
                          })}\``
                        : ''
                    }`,
                  },
                  {
                    inline: true,
                    name: `${client.useEmoji('ramMemory')} ${__('BOT.INFO.MEMORY_USAGE')}`,
                    value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\`/\`${(
                      process.memoryUsage().heapTotal /
                      1024 /
                      1024
                    ).toFixed(2)} MB\``,
                  },
                  {
                    inline: true,
                    name: `${client.useEmoji('discordJS')} ${__('BOT.INFO.DISCORDJS_VERSION')}`,
                    value: `[\`${version}\`](https://discord.js.org)`,
                  },
                  {
                    inline: true,
                    name: `${client.useEmoji('nodeJS')} ${__('BOT.INFO.NODEJS_VERSION')}`,
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
                  .setLabel(__('SUPPORT_SERVER'))
                  .setEmoji(client.useEmoji('discord'))
                  .setStyle(ButtonStyle.Link)
                  .setURL(supportServer.invite),
                new ButtonBuilder()
                  .setLabel(__('ADD_TO_SERVER'))
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
              name: `💎 ${__('SHARD')}`,
              value: `**${__('CURRENT')}:** \`${
                ShardClientUtil.shardIdForGuildId(guildId, await client.ws.getShardCount()) + 1
              }\`\n**${__('TOTAL')}:** \`${await client.ws.getShardCount()}\` `,
            });
          }

          embs[0].addFields(
            {
              inline: true,
              name: `🕑 ${__('UPTIME')}`,
              value: `\`${msToTime(client.uptime)}\` | ${toUTS(Date.now() - client.uptime)}`,
            },
            {
              inline: true,
              name: `📅 ${__('CREATED')}`,
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
