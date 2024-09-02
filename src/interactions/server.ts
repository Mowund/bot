import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ApplicationCommandOptionType,
  BaseInteraction,
  ButtonInteraction,
  Colors,
  RoleSelectMenuBuilder,
  RoleSelectMenuInteraction,
  ColorResolvable,
  ChannelSelectMenuInteraction,
  ChannelSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
  PresenceUpdateStatus,
  StickerFormatType,
  ActivityType,
  PresenceStatus,
  GuildFeature,
  GuildSystemChannelFlags,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { GuildData } from '../../lib/structures/GuildData.js';
import { imageOptions, premiumLimits } from '../defaults.js';
import { arrayMap, toUTS } from '../utils.js';

export default class Server extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild],
        description: 'DESC.SERVER',
        integrationTypes: [ApplicationIntegrationType.GuildInstall],
        name: 'CMD.SERVER',
        options: [
          {
            description: 'DESC.SERVER_INFO',
            name: 'CMD.INFO',
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            description: 'DESC.SERVER_SETTINGS',
            name: 'CMD.SETTINGS',
            type: ApplicationCommandOptionType.Subcommand,
          },
        ],
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    let { guildData } = args;
    const { embed, isEphemeral } = args,
      { guild, guildId, memberPermissions, user } = interaction,
      { client, localize } = args,
      { database } = client,
      settingsComponents = () => [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel(localize('SERVER.SETTINGS.ALLOW_NON_EPHEMERAL.EDIT'))
            .setEmoji('📝')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!memberPermissions.has(PermissionFlagsBits.ManageGuild))
            .setCustomId('server_settings_ephemeral_edit'),
        ),
      ],
      settingsFields = (data: GuildData) => {
        const channels =
            arrayMap(data?.allowNonEphemeral?.channelIds, { mapFunction: cI => `<#${cI}>`, maxValues: 20 }) ?? [],
          roles = arrayMap(data?.allowNonEphemeral?.roleIds, { mapFunction: rI => `<@&${rI}>`, maxValues: 20 }) ?? [];

        return [
          {
            inline: true,
            name: `👁️ ${localize('SERVER.SETTINGS.ALLOW_NON_EPHEMERAL.NAME')}`,
            value: `**${localize('CHANNELS.NOUN')}:** ${
              channels.length ? channels : localize('ALL')
            }\n**${localize('ROLES.NOUN')}:** ${roles.length ? roles : localize('ALL')}`,
          },
        ];
      };

    if (interaction.isChatInputCommand()) {
      await interaction.deferReply({ ephemeral: isEphemeral });
      const { options } = interaction;

      switch (options.getSubcommand()) {
        case 'info': {
          const premiumLimit = premiumLimits[guild.premiumTier],
            emojiLimit =
              (guild.features as `${GuildFeature}`[] & string[]).includes('MORE_EMOJI') && guild.premiumTier < 3
                ? 200
                : premiumLimit.emojis,
            roles = guild.roles.cache.filter(r => r.id !== guildId),
            webhooks = await guild.fetchWebhooks(),
            emb = embed({ title: `${client.useEmoji('info')} ${localize('SERVER.INFO.TITLE')}` }).addFields(
              { inline: true, name: `🪪 ${localize('ID')}`, value: `\`${guild.id}\`` },
              {
                inline: true,
                name: `${client.useEmoji('owner')} ${localize('OWNER.NOUN')}`,
                value: `<@${guild.ownerId}>`,
              },
              {
                inline: true,
                name: `📅 ${localize('CREATED')}`,
                value: toUTS(guild.createdTimestamp),
              },
              {
                inline: true,
                name: `${client.useEmoji('role')} ${localize('ROLES.NOUN')} [${localize('COUNT', {
                  count: roles.size,
                })} / ${localize('COUNT', { count: 250 })}]`,
                value: `${client.useEmoji('members')} ${localize('COUNTER.COMMON', {
                  count: roles.filter(r => !r.tags?.botId && !r.tags?.integrationId).size,
                })}\n${client.useEmoji('bot')} ${localize('COUNTER.BOT', {
                  count: roles.filter(r => r.tags?.botId).size,
                })}\n${client.useEmoji('cog')} ${localize('COUNTER.INTEGRATED', {
                  count: roles.filter(r => r.tags?.integrationId).size,
                })}`,
              },
              {
                inline: true,
                name: `${client.useEmoji('emojiGhost')} ${localize('EMOJIS')} [${localize('COUNT', {
                  count: guild.emojis.cache.size,
                })} / ${emojiLimit * 2}]`,
                value: `- **${localize('COUNT', {
                  count: guild.emojis.cache.filter(e => !e.animated && !e.managed).size,
                })} / ** ${localize('COUNTER.STATIC', {
                  count: emojiLimit,
                })}\n- **${localize('COUNT', {
                  count: guild.emojis.cache.filter(e => e.animated && !e.managed).size,
                })} / ** ${localize('COUNTER.ANIMATED', {
                  count: emojiLimit,
                })}\n- ${localize('COUNTER.INTEGRATED', {
                  count: guild.emojis.cache.filter(e => e.managed).size,
                })}`,
              },
              {
                inline: true,
                name: `${client.useEmoji('sticker')} ${localize('STICKERS')} [${guild.stickers.cache.size} / ${
                  premiumLimit.stickers
                }]`,
                value: `- **${localize('COUNT', {
                  count: guild.stickers.cache.filter(e => e.format === StickerFormatType.PNG).size,
                })}** PNG\n- **${localize('COUNT', {
                  count: guild.stickers.cache.filter(e => e.format === StickerFormatType.APNG).size,
                })}** APNG\n- **${localize('COUNT', {
                  count: guild.stickers.cache.filter(e => e.format === StickerFormatType.Lottie).size,
                })}** Lottie\n- **${localize('COUNT', {
                  count: guild.stickers.cache.filter(e => e.format === StickerFormatType.GIF).size,
                })}** GIF`,
              },
              {
                inline: true,
                name: `${client.useEmoji('members')} ${localize('MEMBERS')} [${localize('COUNT', {
                  count: guild.memberCount,
                })}]`,
                value: `**${client.useEmoji('statusOnline')} ${localize('COUNT', {
                  count: guild.members.cache.filter(
                    m =>
                      m.presence &&
                      !([PresenceUpdateStatus.Idle, PresenceUpdateStatus.DoNotDisturb] as PresenceStatus[]).includes(
                        m.presence.status,
                      ) &&
                      !m.presence.activities.some(a => a.type === ActivityType.Streaming),
                  ).size,
                })}** ${localize('ONLINE')}\n${client.useEmoji('statusIdle')} **${localize('COUNT', {
                  count: guild.members.cache.filter(m => m.presence?.status === PresenceUpdateStatus.Idle).size,
                })}** ${localize('IDLE')}\n${client.useEmoji('statusDND')} **${localize('COUNT', {
                  count: guild.members.cache.filter(m => m.presence?.status === PresenceUpdateStatus.DoNotDisturb).size,
                })}** ${localize('DO_NOT_DISTURB')}\n${client.useEmoji('statusStreaming')} **${localize('COUNT', {
                  count: guild.members.cache.filter(m =>
                    m.presence?.activities.some(a => a.type === ActivityType.Streaming),
                  ).size,
                })}** ${localize('STREAMING')}\n${client.useEmoji('statusOffline')} **${localize('COUNT', {
                  count: guild.memberCount - guild.members.cache.filter(m => m.presence).size,
                })}** ${localize('OFFLINE')}\n- **${localize('COUNT', {
                  count: guild.maximumMembers,
                })}** ${localize('MAXIMUM')}`,
              },
              {
                inline: true,
                name: `${client.useEmoji('systemMessage')} ${localize('SYSTEM_MESSAGES')}`,
                value: `${
                  guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotifications)
                    ? client.useEmoji('no')
                    : client.useEmoji('check')
                } ${localize('JOIN_MESSAGES')}\n${
                  guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotificationReplies)
                    ? client.useEmoji('no')
                    : client.useEmoji('check')
                } ${localize('WAVE_BUTTON')}\n${
                  guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressPremiumSubscriptions)
                    ? client.useEmoji('no')
                    : client.useEmoji('check')
                } ${localize('BOOST_MESSAGES')}\n${
                  guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressGuildReminderNotifications)
                    ? client.useEmoji('no')
                    : client.useEmoji('check')
                } ${localize('SETUP_TIPS')}\n${
                  guild.systemChannel
                    ? `${client.useEmoji('channelText')} ${guild.systemChannel}`
                    : `${client.useEmoji('channelTextLocked')} **${localize('NO_CHANNEL')}**`
                }`,
              },
              {
                inline: true,
                name: `${client.useEmoji('webhook')} ${localize('WEBHOOKS')} [${localize('COUNT', {
                  count: webhooks.size,
                })}]`,
                value: `${client.useEmoji('cog')} **${localize('COUNT', {
                  count: webhooks.filter(e => e.isIncoming()).size,
                })}** ${localize('INCOMING')}\n${client.useEmoji('channelFollower')} ${localize(
                  'COUNTER.CHANNEL_FOLLOWER',
                  {
                    count: webhooks.filter(e => e.isChannelFollower()).size,
                  },
                )}\n${client.useEmoji('bot')} ${localize('COUNTER.APPLICATION', {
                  count: webhooks.filter(e => e.isApplicationCreated()).size,
                })}`,
              },
              {
                inline: true,
                name: `${client.useEmoji('security')} ${localize('SECURITY')}`,
                value: `${`${client.useEmoji('banHammer')} ${localize('COUNTER.BAN', {
                  count: guild.bans.cache.size,
                })}`}`,
              },
              {
                name: `${client.useEmoji('browseChannels')} ${localize('CHANNELS.NOUN')} [${localize('COUNT', {
                  count: guild.channels.cache.size,
                })} / ${localize('COUNT', {
                  count: 1500,
                })}]`,
                value: `- ${client.useEmoji('browseChannels')} **[${localize('COUNT', {
                  count: guild.channels.cache.filter(
                    c =>
                      ![ChannelType.AnnouncementThread, ChannelType.PrivateThread, ChannelType.PublicThread].includes(
                        c.type,
                      ),
                  ).size,
                })} / ${localize('COUNT', {
                  count: 500,
                })}]:** ${client.useEmoji('channelCategory')} ${localize('COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size,
                })} | ${client.useEmoji('channelText')} ${localize('COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size,
                })} | ${client.useEmoji('channelNews')} ${localize('COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement).size,
                })} | ${client.useEmoji('channelVoice')} ${localize('COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size,
                })} | ${client.useEmoji('channelStage')} ${localize('COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size,
                })} | ${client.useEmoji('channelForum')} ${localize('COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size,
                })} | ${client.useEmoji('channelMedia')} ${localize('COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildMedia).size,
                })}\n- ${client.useEmoji('channelThread')} **[${localize('COUNT', {
                  count: guild.channels.cache.filter(c =>
                    [ChannelType.AnnouncementThread, ChannelType.PrivateThread, ChannelType.PublicThread].includes(
                      c.type,
                    ),
                  ).size,
                })} / ${localize('COUNT', {
                  count: 1000,
                })}]:** ${client.useEmoji('channelText', 'publicThread')} ${localize('COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.PublicThread).size,
                })} | ${client.useEmoji('channelTextLocked', 'privateThread')} ${localize('COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.PrivateThread).size,
                })} | ${client.useEmoji('channelNews', 'newsThread')} ${localize('COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.AnnouncementThread).size,
                })}`,
              },
              {
                inline: true,
                name: `⭐ ${localize('FEATURES')}`,
                value: arrayMap(guild.features, { mapFunction: a => `\`${a}\``, maxLength: 934, reverse: true }),
              },
            ),
            rows = [new ActionRowBuilder<ButtonBuilder>()];

          if (guild.icon) {
            emb
              .setThumbnail(guild.iconURL(imageOptions))
              .setAuthor({ iconURL: guild.iconURL(imageOptions), name: guild.name });
            rows[0].addComponents(
              new ButtonBuilder()
                .setLabel(localize('ICON'))
                .setEmoji('🖼️')
                .setStyle(ButtonStyle.Link)
                .setURL(guild.iconURL(imageOptions)),
            );
          } else {
            emb.setAuthor({ name: guild.name });
          }

          if (guild.rulesChannel || guild.publicUpdatesChannel) {
            emb.spliceFields(10, 0, {
              name: `${client.useEmoji('community')} ${localize('CHANNELS.COMMUNITY')}`,
              value: `${guild.rulesChannel ? `- **${localize('RULES')}:** ${guild.rulesChannel}\n` : ''}${
                guild.publicUpdatesChannel ? `- **${localize('PUBLIC_UPDATES')}:** ${guild.publicUpdatesChannel}\n` : ''
              }`,
            });
          }
          if (guild.features.includes(GuildFeature.VanityURL)) {
            await guild.fetchVanityData();
            emb.spliceFields(9, 0, {
              inline: true,
              name: `🔗 ${localize('VANITY_URL')}`,
              value: `${`- **${localize('INVITE')}:** [\`${guild.vanityURLCode}\`](https://discord.gg/${
                guild.vanityURLCode
              })\n- ${localize('COUNTER.USES', { count: guild.vanityURLUses })}`}`,
            });
          }

          const badges = [];
          let description = '';

          if (guild.verified) badges.push(client.useEmoji('verified'));
          if (guild.partnered) badges.push(client.useEmoji('partnered'));
          if (badges.length) description += `${badges.join(' ')}${guild.description ? '\n' : ''}`;
          if (guild.description) description += guild.description;

          if (description.length) emb.setDescription(description);

          if (guild.icon && guild.banner && (guild.splash || guild.discoverySplash))
            rows.push(new ActionRowBuilder<ButtonBuilder>());
          if (guild.banner) {
            const banner = guild.bannerURL(imageOptions);
            emb.addFields({ name: `🖼️ ${localize('BANNER')}`, value: '\u200B' }).setImage(banner);
            rows[0].addComponents(
              new ButtonBuilder().setLabel(localize('BANNER')).setEmoji('🖼️').setStyle(ButtonStyle.Link).setURL(banner),
            );
          }
          if (guild.splash) {
            rows
              .at(-1)
              .addComponents(
                new ButtonBuilder()
                  .setLabel(localize('SPLASH'))
                  .setEmoji('🖼️')
                  .setStyle(ButtonStyle.Link)
                  .setURL(guild.splashURL(imageOptions)),
              );
          }
          if (guild.discoverySplash) {
            rows
              .at(-1)
              .addComponents(
                new ButtonBuilder()
                  .setLabel(localize('DISCOVERY_SPLASH'))
                  .setEmoji('🖼️')
                  .setStyle(ButtonStyle.Link)
                  .setURL(guild.discoverySplashURL(imageOptions)),
              );
          }

          if (!rows[0].components.length) rows.shift();

          return interaction.editReply({ components: rows, embeds: [emb] });
        }
        case 'settings': {
          return interaction.editReply({
            components: memberPermissions.has(PermissionFlagsBits.ManageGuild) ? settingsComponents() : [],
            embeds: [
              embed({ title: `${client.useEmoji('cog')} ${localize('SERVER.SETTINGS.TITLE')}` }).addFields(
                settingsFields(guildData),
              ),
            ],
          });
        }
      }
    }

    if (interaction.isButton() || interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
      const { message } = interaction,
        { customId } = interaction;

      if (message.interaction.user.id !== user.id) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.UNALLOWED.COMMAND'))],
          ephemeral: true,
        });
      }

      if (!memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.update({
          components: settingsComponents(),
          embeds: [
            embed({ title: `${client.useEmoji('cog')} ${localize('SERVER.SETTINGS.TITLE')}` }).addFields(
              settingsFields(guildData),
            ),
          ],
        });
        return interaction.followUp({
          embeds: [
            embed({ type: 'error' }).setDescription(
              localize('ERROR.PERM.USER.SINGLE.NO_LONGER', { perm: localize('PERM.MANAGE_GUILD') }),
            ),
          ],
          ephemeral: true,
        });
      }

      switch (customId) {
        case 'server_settings': {
          return interaction.update({
            components: settingsComponents(),
            embeds: [
              embed({ title: `${client.useEmoji('cog')} ${localize('SERVER.SETTINGS.TITLE')}` }).addFields(
                settingsFields(guildData),
              ),
            ],
          });
        }
        case 'server_settings_ephemeral_edit':
        case 'server_settings_ephemeral_add':
        case 'server_settings_ephemeral_remove':
        case 'server_settings_ephemeral_channels_add_submit':
        case 'server_settings_ephemeral_channels_remove_submit':
        case 'server_settings_ephemeral_channels_reset':
        case 'server_settings_ephemeral_roles_add_submit':
        case 'server_settings_ephemeral_roles_remove_submit':
        case 'server_settings_ephemeral_roles_reset': {
          const isEdit = customId === 'server_settings_ephemeral_edit',
            isRemove =
              !customId.includes('add') &&
              (message.components.at(-1).components.at(-1).customId.endsWith('remove_submit') ||
                customId.includes('remove')),
            isChannel = customId.includes('channels');

          let color: ColorResolvable,
            count: number,
            title: string,
            channelIds = guildData?.allowNonEphemeral?.channelIds || [],
            roleIds = guildData?.allowNonEphemeral?.roleIds || [];

          if (customId.endsWith('_submit')) {
            const { values } = interaction as
                | RoleSelectMenuInteraction<'cached'>
                | ChannelSelectMenuInteraction<'cached'>,
              oldChannelIds = channelIds,
              oldRoleIds = roleIds;

            if (isRemove) {
              if (isChannel) {
                channelIds = channelIds.filter(r => !values.includes(r));
                guildData = await database.guilds.set(guildId, {
                  allowNonEphemeral: {
                    channelIds,
                    roleIds,
                  },
                });
                count = oldChannelIds.length - channelIds.length;
                title = count ? localize('CHANNELS.REMOVING', { count }) : localize('CHANNELS_AND_ROLES.REMOVING');
              } else {
                roleIds = roleIds.filter(r => !values.includes(r));
                guildData = await database.guilds.set(guildId, {
                  allowNonEphemeral: {
                    channelIds,
                    roleIds,
                  },
                });
                count = oldRoleIds.length - roleIds.length;
                title = count ? localize('ROLES.REMOVING', { count }) : localize('CHANNELS_AND_ROLES.REMOVING');
              }

              color = Colors.Red;
            } else {
              if (isChannel) {
                channelIds = channelIds.filter(r => !values.includes(r));
                values.forEach(v => channelIds.push(v));

                guildData = await database.guilds.set(guildId, {
                  allowNonEphemeral: {
                    channelIds,
                    roleIds,
                  },
                });
                count = channelIds.length - oldChannelIds.length;
                title = count ? localize('CHANNELS.ADDING', { count }) : localize('CHANNELS_AND_ROLES.ADDING');
              } else {
                roleIds = roleIds.filter(r => !values.includes(r));
                values.forEach(v => roleIds.push(v));

                guildData = await database.guilds.set(guildId, {
                  allowNonEphemeral: {
                    channelIds,
                    roleIds,
                  },
                });
                count = roleIds.length - oldRoleIds.length;
                title = count ? localize('ROLES.ADDING', { count }) : localize('CHANNELS_AND_ROLES.ADDING');
              }
              color = Colors.Green;
            }
          } else if (customId.endsWith('_reset')) {
            if (isChannel) channelIds = [];
            else roleIds = [];
            guildData = await database.guilds.set(guildId, {
              allowNonEphemeral: { channelIds, roleIds },
            });
            title = localize(`${isChannel ? 'CHANNELS.NOUN' : 'ROLES.NOUN'}.RESET`);
            color = Colors.Red;
          } else if (isEdit) {
            title = localize('CHANNELS_AND_ROLES.EDITING');
            color = Colors.Orange;
          } else if (isRemove) {
            title = localize('CHANNELS_AND_ROLES.REMOVING');
            color = Colors.Red;
          } else {
            title = localize('CHANNELS_AND_ROLES.ADDING');
            color = Colors.Green;
          }

          return (interaction as ButtonInteraction | RoleSelectMenuInteraction).update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('BACK'))
                  .setEmoji('↩️')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('server_settings'),
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('CHANNELS.RESET'))
                  .setEmoji('🔄')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('server_settings_ephemeral_channels_reset')
                  .setDisabled(!channelIds.length),
                new ButtonBuilder()
                  .setLabel(localize('ROLES.RESET'))
                  .setEmoji('🔄')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('server_settings_ephemeral_roles_reset')
                  .setDisabled(!roleIds.length),
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('ADD'))
                  .setEmoji('➕')
                  .setStyle(ButtonStyle.Success)
                  .setCustomId('server_settings_ephemeral_add')
                  .setDisabled(!isEdit && !isRemove),
                new ButtonBuilder()
                  .setLabel(localize('REMOVE'))
                  .setEmoji('➖')
                  .setStyle(ButtonStyle.Danger)
                  .setCustomId('server_settings_ephemeral_remove')
                  .setDisabled((!isEdit && isRemove) || (!channelIds.length && !roleIds.length)),
              ),
              new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
                new ChannelSelectMenuBuilder()
                  .setPlaceholder(
                    localize(
                      isEdit ? 'CHANNELS.SELECT.DEFAULT' : isRemove ? 'CHANNELS.SELECT.REMOVE' : 'CHANNELS.SELECT.ADD',
                    ),
                  )
                  .setChannelTypes(
                    ChannelType.AnnouncementThread,
                    ChannelType.GuildAnnouncement,
                    ChannelType.GuildText,
                    ChannelType.GuildVoice,
                    ChannelType.GuildStageVoice,
                    ChannelType.PrivateThread,
                    ChannelType.PublicThread,
                  )
                  .setMinValues(1)
                  .setMaxValues(25)
                  .setCustomId(
                    isRemove
                      ? 'server_settings_ephemeral_channels_remove_submit'
                      : 'server_settings_ephemeral_channels_add_submit',
                  )
                  .setDisabled(isEdit || (isRemove && !channelIds.length)),
              ),
              new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                new RoleSelectMenuBuilder()
                  .setPlaceholder(
                    localize(isEdit ? 'ROLES.SELECT.DEFAULT' : isRemove ? 'ROLES.SELECT.REMOVE' : 'ROLES.SELECT.ADD'),
                  )
                  .setMinValues(1)
                  .setMaxValues(25)
                  .setCustomId(
                    isRemove
                      ? 'server_settings_ephemeral_roles_remove_submit'
                      : 'server_settings_ephemeral_roles_add_submit',
                  )
                  .setDisabled(isEdit || (isRemove && !roleIds.length)),
              ),
            ],
            embeds: [embed({ color, title }).addFields(settingsFields(guildData))],
          });
        }
      }
    }
  }
}
