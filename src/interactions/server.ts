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
        description: 'SERVER.DESCRIPTION',
        integration_types: [ApplicationIntegrationType.GuildInstall],
        name: 'SERVER.NAME',
        options: [
          {
            description: 'SERVER.OPTIONS.INFO.DESCRIPTION',
            name: 'SERVER.OPTIONS.INFO.NAME',
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            description: 'SERVER.OPTIONS.SETTINGS.DESCRIPTION',
            name: 'SERVER.OPTIONS.SETTINGS.NAME',
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
            .setLabel(localize('SERVER.OPTIONS.SETTINGS.ALLOW_NON_EPHEMERAL.EDIT'))
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
            name: `👁️ ${localize('SERVER.OPTIONS.SETTINGS.ALLOW_NON_EPHEMERAL.NAME')}`,
            value: `**${localize('GENERIC.CHANNELS.CHANNELS')}:** ${
              channels.length ? channels : localize('GENERIC.ALL')
            }\n**${localize('GENERIC.ROLES.ROLES')}:** ${roles.length ? roles : localize('GENERIC.ALL')}`,
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
            emb = embed({ title: `${client.useEmoji('info')} ${localize('SERVER.OPTIONS.INFO.TITLE')}` }).addFields(
              { inline: true, name: `🪪 ${localize('GENERIC.ID')}`, value: `\`${guild.id}\`` },
              {
                inline: true,
                name: `${client.useEmoji('owner')} ${localize('GENERIC.OWNER')}`,
                value: `<@${guild.ownerId}>`,
              },
              {
                inline: true,
                name: `📅 ${localize('GENERIC.CREATED')}`,
                value: toUTS(guild.createdTimestamp),
              },
              {
                inline: true,
                name: `${client.useEmoji('role')} ${localize('GENERIC.ROLES.ROLES')} [${localize('GENERIC.COUNT', {
                  count: roles.size,
                })} / ${localize('GENERIC.COUNT', { count: 250 })}]`,
                value: `${client.useEmoji('members')} ${localize('GENERIC.COUNTER.COMMON', {
                  count: roles.filter(r => !r.tags?.botId && !r.tags?.integrationId).size,
                })}\n${client.useEmoji('bot')} ${localize('GENERIC.COUNTER.BOT', {
                  count: roles.filter(r => r.tags?.botId).size,
                })}\n${client.useEmoji('cog')} ${localize('GENERIC.COUNTER.INTEGRATED', {
                  count: roles.filter(r => r.tags?.integrationId).size,
                })}`,
              },
              {
                inline: true,
                name: `${client.useEmoji('emojiGhost')} ${localize('GENERIC.EMOJIS')} [${localize('GENERIC.COUNT', {
                  count: guild.emojis.cache.size,
                })} / ${emojiLimit * 2}]`,
                value: `- **${localize('GENERIC.COUNT', {
                  count: guild.emojis.cache.filter(e => !e.animated && !e.managed).size,
                })} / ** ${localize('GENERIC.COUNTER.STATIC', {
                  count: emojiLimit,
                })}\n- **${localize('GENERIC.COUNT', {
                  count: guild.emojis.cache.filter(e => e.animated && !e.managed).size,
                })} / ** ${localize('GENERIC.COUNTER.ANIMATED', {
                  count: emojiLimit,
                })}\n- ${localize('GENERIC.COUNTER.INTEGRATED', {
                  count: guild.emojis.cache.filter(e => e.managed).size,
                })}`,
              },
              {
                inline: true,
                name: `${client.useEmoji('sticker')} ${localize('GENERIC.STICKERS')} [${guild.stickers.cache.size} / ${
                  premiumLimit.stickers
                }]`,
                value: `- **${localize('GENERIC.COUNT', {
                  count: guild.stickers.cache.filter(e => e.format === StickerFormatType.PNG).size,
                })}** PNG\n- **${localize('GENERIC.COUNT', {
                  count: guild.stickers.cache.filter(e => e.format === StickerFormatType.APNG).size,
                })}** APNG\n- **${localize('GENERIC.COUNT', {
                  count: guild.stickers.cache.filter(e => e.format === StickerFormatType.Lottie).size,
                })}** Lottie\n- **${localize('GENERIC.COUNT', {
                  count: guild.stickers.cache.filter(e => e.format === StickerFormatType.GIF).size,
                })}** GIF`,
              },
              {
                inline: true,
                name: `${client.useEmoji('members')} ${localize('GENERIC.MEMBERS')} [${localize('GENERIC.COUNT', {
                  count: guild.memberCount,
                })}]`,
                value: `**${client.useEmoji('statusOnline')} ${localize('GENERIC.COUNT', {
                  count: guild.members.cache.filter(
                    m =>
                      m.presence &&
                      !([PresenceUpdateStatus.Idle, PresenceUpdateStatus.DoNotDisturb] as PresenceStatus[]).includes(
                        m.presence.status,
                      ) &&
                      !m.presence.activities.some(a => a.type === ActivityType.Streaming),
                  ).size,
                })}** ${localize('GENERIC.ONLINE')}\n${client.useEmoji('statusIdle')} **${localize('GENERIC.COUNT', {
                  count: guild.members.cache.filter(m => m.presence?.status === PresenceUpdateStatus.Idle).size,
                })}** ${localize('GENERIC.IDLE')}\n${client.useEmoji('statusDND')} **${localize('GENERIC.COUNT', {
                  count: guild.members.cache.filter(m => m.presence?.status === PresenceUpdateStatus.DoNotDisturb).size,
                })}** ${localize('GENERIC.DO_NOT_DISTURB')}\n${client.useEmoji('statusStreaming')} **${localize(
                  'GENERIC.COUNT',
                  {
                    count: guild.members.cache.filter(m =>
                      m.presence?.activities.some(a => a.type === ActivityType.Streaming),
                    ).size,
                  },
                )}** ${localize('GENERIC.STREAMING')}\n${client.useEmoji('statusOffline')} **${localize(
                  'GENERIC.COUNT',
                  {
                    count: guild.memberCount - guild.members.cache.filter(m => m.presence).size,
                  },
                )}** ${localize('GENERIC.OFFLINE')}\n- **${localize('GENERIC.COUNT', {
                  count: guild.maximumMembers,
                })}** ${localize('GENERIC.MAXIMUM')}`,
              },
              {
                inline: true,
                name: `${client.useEmoji('systemMessage')} ${localize('GENERIC.SYSTEM_MESSAGES')}`,
                value: `${
                  guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotifications)
                    ? client.useEmoji('no')
                    : client.useEmoji('check')
                } ${localize('GENERIC.JOIN_MESSAGES')}\n${
                  guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotificationReplies)
                    ? client.useEmoji('no')
                    : client.useEmoji('check')
                } ${localize('GENERIC.WAVE_BUTTON')}\n${
                  guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressPremiumSubscriptions)
                    ? client.useEmoji('no')
                    : client.useEmoji('check')
                } ${localize('GENERIC.BOOST_MESSAGES')}\n${
                  guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressGuildReminderNotifications)
                    ? client.useEmoji('no')
                    : client.useEmoji('check')
                } ${localize('GENERIC.SETUP_TIPS')}\n${
                  guild.systemChannel
                    ? `${client.useEmoji('channelText')} ${guild.systemChannel}`
                    : `${client.useEmoji('channelTextLocked')} **${localize('GENERIC.NO_CHANNEL')}**`
                }`,
              },
              {
                inline: true,
                name: `${client.useEmoji('webhook')} ${localize('GENERIC.WEBHOOKS')} [${localize('GENERIC.COUNT', {
                  count: webhooks.size,
                })}]`,
                value: `${client.useEmoji('cog')} **${localize('GENERIC.COUNT', {
                  count: webhooks.filter(e => e.isIncoming()).size,
                })}** ${localize('GENERIC.INCOMING')}\n${client.useEmoji('channelFollower')} ${localize(
                  'GENERIC.COUNTER.CHANNEL_FOLLOWER',
                  {
                    count: webhooks.filter(e => e.isChannelFollower()).size,
                  },
                )}\n${client.useEmoji('bot')} ${localize('GENERIC.COUNTER.APPLICATION', {
                  count: webhooks.filter(e => e.isApplicationCreated()).size,
                })}`,
              },
              {
                inline: true,
                name: `${client.useEmoji('security')} ${localize('GENERIC.SECURITY')}`,
                value: `${`${client.useEmoji('banHammer')} ${localize('GENERIC.COUNTER.BAN', {
                  count: guild.bans.cache.size,
                })}`}`,
              },
              {
                name: `${client.useEmoji('browseChannels')} ${localize('GENERIC.CHANNELS.CHANNELS')} [${localize(
                  'GENERIC.COUNT',
                  {
                    count: guild.channels.cache.size,
                  },
                )} / ${localize('GENERIC.COUNT', {
                  count: 1500,
                })}]`,
                value: `- ${client.useEmoji('browseChannels')} **[${localize('GENERIC.COUNT', {
                  count: guild.channels.cache.filter(
                    c =>
                      ![ChannelType.AnnouncementThread, ChannelType.PrivateThread, ChannelType.PublicThread].includes(
                        c.type,
                      ),
                  ).size,
                })} / ${localize('GENERIC.COUNT', {
                  count: 500,
                })}]:** ${client.useEmoji('channelCategory')} ${localize('GENERIC.COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size,
                })} | ${client.useEmoji('channelText')} ${localize('GENERIC.COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size,
                })} | ${client.useEmoji('channelNews')} ${localize('GENERIC.COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement).size,
                })} | ${client.useEmoji('channelVoice')} ${localize('GENERIC.COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size,
                })} | ${client.useEmoji('channelStage')} ${localize('GENERIC.COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size,
                })} | ${client.useEmoji('channelForum')} ${localize('GENERIC.COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size,
                })} | ${client.useEmoji('channelMedia')} ${localize('GENERIC.COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.GuildMedia).size,
                })}\n- ${client.useEmoji('channelThread')} **[${localize('GENERIC.COUNT', {
                  count: guild.channels.cache.filter(c =>
                    [ChannelType.AnnouncementThread, ChannelType.PrivateThread, ChannelType.PublicThread].includes(
                      c.type,
                    ),
                  ).size,
                })} / ${localize('GENERIC.COUNT', {
                  count: 1000,
                })}]:** ${client.useEmoji('channelText', 'publicThread')} ${localize('GENERIC.COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.PublicThread).size,
                })} | ${client.useEmoji('channelTextLocked', 'privateThread')} ${localize('GENERIC.COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.PrivateThread).size,
                })} | ${client.useEmoji('channelNews', 'newsThread')} ${localize('GENERIC.COUNT', {
                  count: guild.channels.cache.filter(c => c.type === ChannelType.AnnouncementThread).size,
                })}`,
              },
              {
                inline: true,
                name: `⭐ ${localize('GENERIC.FEATURES')}`,
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
                .setLabel(localize('GENERIC.ICON'))
                .setEmoji('🖼️')
                .setStyle(ButtonStyle.Link)
                .setURL(guild.iconURL(imageOptions)),
            );
          } else {
            emb.setAuthor({ name: guild.name });
          }

          if (guild.rulesChannel || guild.publicUpdatesChannel) {
            emb.spliceFields(10, 0, {
              name: `${client.useEmoji('community')} ${localize('GENERIC.CHANNELS.COMMUNITY')}`,
              value: `${guild.rulesChannel ? `- **${localize('GENERIC.RULES')}:** ${guild.rulesChannel}\n` : ''}${
                guild.publicUpdatesChannel
                  ? `- **${localize('GENERIC.PUBLIC_UPDATES')}:** ${guild.publicUpdatesChannel}\n`
                  : ''
              }`,
            });
          }
          if (guild.features.includes(GuildFeature.VanityURL)) {
            await guild.fetchVanityData();
            emb.spliceFields(9, 0, {
              inline: true,
              name: `🔗 ${localize('GENERIC.VANITY_URL')}`,
              value: `${`- **${localize('GENERIC.INVITE')}:** [\`${guild.vanityURLCode}\`](https://discord.gg/${
                guild.vanityURLCode
              })\n- ${localize('GENERIC.COUNTER.USES', { count: guild.vanityURLUses })}`}`,
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
            emb.addFields({ name: `🖼️ ${localize('GENERIC.BANNER')}`, value: '\u200B' }).setImage(banner);
            rows[0].addComponents(
              new ButtonBuilder()
                .setLabel(localize('GENERIC.BANNER'))
                .setEmoji('🖼️')
                .setStyle(ButtonStyle.Link)
                .setURL(banner),
            );
          }
          if (guild.splash) {
            rows
              .at(-1)
              .addComponents(
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.SPLASH'))
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
                  .setLabel(localize('GENERIC.DISCOVERY_SPLASH'))
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
              embed({ title: `${client.useEmoji('cog')} ${localize('SERVER.OPTIONS.SETTINGS.TITLE')}` }).addFields(
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

      if (message.interactionMetadata.user.id !== user.id) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.UNALLOWED.COMMAND'))],
          ephemeral: true,
        });
      }

      if (!memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.update({
          components: settingsComponents(),
          embeds: [
            embed({ title: `${client.useEmoji('cog')} ${localize('SERVER.OPTIONS.SETTINGS.TITLE')}` }).addFields(
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
              embed({ title: `${client.useEmoji('cog')} ${localize('SERVER.OPTIONS.SETTINGS.TITLE')}` }).addFields(
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
                title = count
                  ? localize('GENERIC.CHANNELS.REMOVING', { count })
                  : localize('GENERIC.CHANNELS_AND_ROLES.REMOVING');
              } else {
                roleIds = roleIds.filter(r => !values.includes(r));
                guildData = await database.guilds.set(guildId, {
                  allowNonEphemeral: {
                    channelIds,
                    roleIds,
                  },
                });
                count = oldRoleIds.length - roleIds.length;
                title = count
                  ? localize('GENERIC.ROLES.REMOVING', { count })
                  : localize('GENERIC.CHANNELS_AND_ROLES.REMOVING');
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
                title = count
                  ? localize('GENERIC.CHANNELS.ADDING', { count })
                  : localize('GENERIC.CHANNELS_AND_ROLES.ADDING');
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
                title = count
                  ? localize('GENERIC.ROLES.ADDING', { count })
                  : localize('GENERIC.CHANNELS_AND_ROLES.ADDING');
              }
              color = Colors.Green;
            }
          } else if (customId.endsWith('_reset')) {
            if (isChannel) channelIds = [];
            else roleIds = [];
            guildData = await database.guilds.set(guildId, {
              allowNonEphemeral: { channelIds, roleIds },
            });
            title = localize(`GENERIC.${isChannel ? 'CHANNELS' : 'ROLES'}.RESET`);
            color = Colors.Red;
          } else if (isEdit) {
            title = localize('GENERIC.CHANNELS_AND_ROLES.EDITING');
            color = Colors.Orange;
          } else if (isRemove) {
            title = localize('GENERIC.CHANNELS_AND_ROLES.REMOVING');
            color = Colors.Red;
          } else {
            title = localize('GENERIC.CHANNELS_AND_ROLES.ADDING');
            color = Colors.Green;
          }

          return (interaction as ButtonInteraction | RoleSelectMenuInteraction).update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.BACK'))
                  .setEmoji('↩️')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('server_settings'),
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.CHANNELS.RESET'))
                  .setEmoji('🔄')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('server_settings_ephemeral_channels_reset')
                  .setDisabled(!channelIds.length),
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.ROLES.RESET'))
                  .setEmoji('🔄')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('server_settings_ephemeral_roles_reset')
                  .setDisabled(!roleIds.length),
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.ADD'))
                  .setEmoji('➕')
                  .setStyle(ButtonStyle.Success)
                  .setCustomId('server_settings_ephemeral_add')
                  .setDisabled(!isEdit && !isRemove),
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.REMOVE'))
                  .setEmoji('➖')
                  .setStyle(ButtonStyle.Danger)
                  .setCustomId('server_settings_ephemeral_remove')
                  .setDisabled((!isEdit && isRemove) || (!channelIds.length && !roleIds.length)),
              ),
              new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
                new ChannelSelectMenuBuilder()
                  .setPlaceholder(
                    localize(
                      isEdit
                        ? 'GENERIC.CHANNELS.SELECT.DEFAULT'
                        : isRemove
                          ? 'GENERIC.CHANNELS.SELECT.REMOVE'
                          : 'GENERIC.CHANNELS.SELECT.ADD',
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
                    localize(
                      isEdit
                        ? 'GENERIC.ROLES.SELECT.DEFAULT'
                        : isRemove
                          ? 'GENERIC.ROLES.SELECT.REMOVE'
                          : 'GENERIC.ROLES.SELECT.ADD',
                    ),
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
