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
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { GuildData } from '../../lib/structures/GuildData.js';
import { arrayMap } from '../utils.js';

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
      { guildId, memberPermissions, user } = interaction,
      { __, client } = args,
      { database, localize: __dl } = client,
      settingsComponents = () => [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel(__('SERVER.SETTINGS.ALLOW_NON_EPHEMERAL.EDIT'))
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
            name: `👁️ ${__('SERVER.SETTINGS.ALLOW_NON_EPHEMERAL.NAME')}`,
            value: `**${__('CHANNELS.NOUN')}:** ${
              channels.length ? channels : __('ALL')
            }\n**${__('ROLES.NOUN')}:** ${roles.length ? roles : __('ALL')}`,
          },
        ];
      };

    if (interaction.isChatInputCommand()) {
      await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });
      const { options } = interaction;

      switch (options.getSubcommand()) {
        case __dl('CMD.SETTINGS'): {
          return interaction.editReply({
            components: memberPermissions.has(PermissionFlagsBits.ManageGuild) ? settingsComponents() : [],
            embeds: [
              embed({ title: `${client.useEmoji('cog')} ${__('SERVER.SETTINGS.TITLE')}` }).addFields(
                settingsFields(guildData),
              ),
            ],
          });
        }
      }
    }

    if (interaction.isButton() || interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
      const { customId, message } = interaction;

      if (message.interactionMetadata.user.id !== user.id) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(__('ERROR.UNALLOWED.COMMAND'))],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.update({
          components: settingsComponents(),
          embeds: [
            embed({ title: `${client.useEmoji('cog')} ${__('SERVER.SETTINGS.TITLE')}` }).addFields(
              settingsFields(guildData),
            ),
          ],
        });
        return interaction.followUp({
          embeds: [
            embed({ type: 'error' }).setDescription(
              __('ERROR.PERM.USER.SINGLE.NO_LONGER', { perm: __('PERM.MANAGE_GUILD') }),
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      switch (customId) {
        case 'server_settings': {
          return interaction.update({
            components: settingsComponents(),
            embeds: [
              embed({ title: `${client.useEmoji('cog')} ${__('SERVER.SETTINGS.TITLE')}` }).addFields(
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
                  $set: {
                    allowNonEphemeral: {
                      channelIds,
                      roleIds,
                    },
                  },
                });
                count = oldChannelIds.length - channelIds.length;
                title = count ? __('CHANNELS.REMOVING', { count }) : __('CHANNELS_AND_ROLES.REMOVING');
              } else {
                roleIds = roleIds.filter(r => !values.includes(r));
                guildData = await database.guilds.set(guildId, {
                  $set: {
                    allowNonEphemeral: {
                      channelIds,
                      roleIds,
                    },
                  },
                });
                count = oldRoleIds.length - roleIds.length;
                title = count ? __('ROLES.REMOVING', { count }) : __('CHANNELS_AND_ROLES.REMOVING');
              }

              color = Colors.Red;
            } else {
              if (isChannel) {
                channelIds = channelIds.filter(r => !values.includes(r));
                values.forEach(v => channelIds.push(v));

                guildData = await database.guilds.set(guildId, {
                  $set: {
                    allowNonEphemeral: {
                      channelIds,
                      roleIds,
                    },
                  },
                });
                count = channelIds.length - oldChannelIds.length;
                title = count ? __('CHANNELS.ADDING', { count }) : __('CHANNELS_AND_ROLES.ADDING');
              } else {
                roleIds = roleIds.filter(r => !values.includes(r));
                values.forEach(v => roleIds.push(v));

                guildData = await database.guilds.set(guildId, {
                  $set: {
                    allowNonEphemeral: {
                      channelIds,
                      roleIds,
                    },
                  },
                });
                count = roleIds.length - oldRoleIds.length;
                title = count ? __('ROLES.ADDING', { count }) : __('CHANNELS_AND_ROLES.ADDING');
              }
              color = Colors.Green;
            }
          } else if (customId.endsWith('_reset')) {
            if (isChannel) channelIds = [];
            else roleIds = [];
            guildData = await database.guilds.set(guildId, {
              $set: {
                allowNonEphemeral: { channelIds, roleIds },
              },
            });
            title = __(`${isChannel ? 'CHANNELS.NOUN' : 'ROLES.NOUN'}.RESET`);
            color = Colors.Red;
          } else if (isEdit) {
            title = __('CHANNELS_AND_ROLES.EDITING');
            color = Colors.Orange;
          } else if (isRemove) {
            title = __('CHANNELS_AND_ROLES.REMOVING');
            color = Colors.Red;
          } else {
            title = __('CHANNELS_AND_ROLES.ADDING');
            color = Colors.Green;
          }

          return (interaction as ButtonInteraction | RoleSelectMenuInteraction).update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(__('BACK'))
                  .setEmoji('↩️')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('server_settings'),
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(__('CHANNELS.RESET'))
                  .setEmoji('🔄')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('server_settings_ephemeral_channels_reset')
                  .setDisabled(!channelIds.length),
                new ButtonBuilder()
                  .setLabel(__('ROLES.RESET'))
                  .setEmoji('🔄')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('server_settings_ephemeral_roles_reset')
                  .setDisabled(!roleIds.length),
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(__('ADD'))
                  .setEmoji('➕')
                  .setStyle(ButtonStyle.Success)
                  .setCustomId('server_settings_ephemeral_add')
                  .setDisabled(!isEdit && !isRemove),
                new ButtonBuilder()
                  .setLabel(__('REMOVE'))
                  .setEmoji('➖')
                  .setStyle(ButtonStyle.Danger)
                  .setCustomId('server_settings_ephemeral_remove')
                  .setDisabled((!isEdit && isRemove) || (!channelIds.length && !roleIds.length)),
              ),
              new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
                new ChannelSelectMenuBuilder()
                  .setPlaceholder(
                    __(
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
                    __(isEdit ? 'ROLES.SELECT.DEFAULT' : isRemove ? 'ROLES.SELECT.REMOVE' : 'ROLES.SELECT.ADD'),
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
