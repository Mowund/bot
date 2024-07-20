import util from 'node:util';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  BaseInteraction,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  StringSelectMenuBuilder,
  SnowflakeUtil,
  TimestampStyles,
  StringSelectMenuInteraction,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  ButtonInteraction,
  ModalBuilder,
  ModalMessageModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import parseDur from 'parse-duration';
import chalk from 'chalk';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { disableComponents, getFieldValue, msToTime, toUTS, truncate } from '../utils.js';

export default class Reminder extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'REMINDER.DESCRIPTION',
        integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'REMINDER.NAME',
        options: [
          {
            description: 'REMINDER.OPTIONS.CREATE.DESCRIPTION',
            name: 'REMINDER.OPTIONS.CREATE.NAME',
            options: [
              {
                description: 'REMINDER.OPTIONS.CREATE.OPTIONS.CONTENT.DESCRIPTION',
                max_length: 1024,
                name: 'REMINDER.OPTIONS.CREATE.OPTIONS.CONTENT.NAME',
                required: true,
                type: ApplicationCommandOptionType.String,
              },
              {
                autocomplete: true,
                description: 'REMINDER.OPTIONS.CREATE.OPTIONS.TIME.DESCRIPTION',
                name: 'REMINDER.OPTIONS.CREATE.OPTIONS.TIME.NAME',
                required: true,
                type: ApplicationCommandOptionType.String,
              },
            ],
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            description: 'REMINDER.OPTIONS.LIST.DESCRIPTION',
            name: 'REMINDER.OPTIONS.LIST.NAME',
            type: ApplicationCommandOptionType.Subcommand,
          },
        ],
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    const { client, embed, isEphemeral, localize, userData } = args,
      { channel, user } = interaction,
      minTime = 1000 * 60 * 3,
      maxTime = 1000 * 60 * 60 * 24 * 365.25 * 100,
      minRecursiveTime = minTime * 10,
      rows = [];

    if (interaction.isAutocomplete()) {
      const focused = interaction.options.getFocused(),
        msTime = parseDur(focused);

      return interaction.respond([
        {
          name:
            !msTime || msTime < minTime || msTime > maxTime
              ? localize('ERROR.INVALID.TIME_AUTOCOMPLETE', {
                  condition: msTime && (msTime > maxTime ? 'greater' : 'less'),
                  input: msToTime(msTime),
                  time:
                    msTime > maxTime
                      ? localize('GENERIC.TIME.YEARS', { count: maxTime / 365.25 / 24 / 60 / 60000 })
                      : localize('GENERIC.TIME.MINUTES', { count: minTime / 60000 }),
                })
              : msToTime(msTime),
          value: focused,
        },
      ]);
    }

    if (interaction.isChatInputCommand()) {
      const { options } = interaction,
        contentO = options
          .getString('content')
          ?.replace(/((\\n|\n)(\s*)?)+/g, '\n')
          .trim(),
        timeO = options.getString('time');

      switch (options.getSubcommand()) {
        case 'create': {
          const msTime = parseDur(timeO),
            reminderId = SnowflakeUtil.generate().toString(),
            summedTime = msTime + SnowflakeUtil.timestampFrom(reminderId);

          if (!contentO) {
            return interaction.reply({
              embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.REMINDER.EMPTY_CONTENT'))],
              ephemeral: true,
            });
          }

          if (!msTime || msTime < minTime || msTime > maxTime) {
            return interaction.reply({
              embeds: [
                embed({ type: 'error' }).setDescription(
                  localize('ERROR.INVALID.TIME', {
                    condition: msTime && (msTime > maxTime ? 'greater' : 'less'),
                    input: msTime ? msToTime(msTime) : timeO,
                    time:
                      msTime > maxTime
                        ? localize('GENERIC.TIME.YEARS', { count: maxTime / 365.25 / 24 / 60 / 60000 })
                        : localize('GENERIC.TIME.MINUTES', { count: minTime / 60000 }),
                  }),
                ),
              ],
              ephemeral: true,
            });
          }

          await interaction.deferReply({ ephemeral: isEphemeral });

          const reminder = await userData.reminders.set(reminderId, {
              channelId: interaction.guild ? channel.id : null,
              content: contentO,
              msTime,
              timestamp: summedTime,
              userId: user.id,
            }),
            emb = embed({ title: localize('REMINDER.CREATED'), type: 'success' }).addFields(
              {
                name: `📄 ${localize('GENERIC.CONTENT.CONTENT')}`,
                value: reminder.content,
              },
              {
                inline: true,
                name: `🪪 ${localize('GENERIC.ID')}`,
                value: `\`${reminder.id}\``,
              },
              {
                inline: true,
                name: `${client.useEmoji('channelText')} ${localize('GENERIC.CHANNEL.CHANNEL')}`,
                value: reminder.channelId
                  ? `<#${reminder.channelId}> - \`${reminder.channelId}\``
                  : `**${localize('GENERIC.DIRECT_MESSAGE')}**`,
              },
              {
                name: `📅 ${localize('GENERIC.TIMESTAMP')}`,
                value: `${localize('REMINDER.TIMESTAMP', { timestamp: toUTS(reminder.timestamp) })}\n${localize(
                  'REMINDER.CREATED_AT',
                  { timestamp: toUTS(SnowflakeUtil.timestampFrom(reminder.id)) },
                )}`,
              },
              {
                name: `🔁 ${localize('GENERIC.NOT_RECURSIVE')}`,
                value:
                  reminder.msTime < minRecursiveTime
                    ? localize('REMINDER.RECURSIVE.DISABLED', {
                        time: localize('GENERIC.TIME.MINUTES', { count: minRecursiveTime / 60000 }),
                      })
                    : localize('REMINDER.RECURSIVE.OFF'),
              },
            );

          rows.push(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setLabel(localize('REMINDER.COMPONENT.LIST'))
                .setEmoji('🗒️')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('reminder_list'),
              new ButtonBuilder()
                .setLabel(localize('GENERIC.EDIT'))
                .setEmoji('📝')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('reminder_edit'),
            ),
          );

          return interaction.editReply({
            components: rows,
            embeds: [emb],
          });
        }
        case 'list': {
          await interaction.deferReply({ ephemeral: isEphemeral });

          const reminders = await client.database.users.cache.get(user.id).reminders.fetch(),
            selectMenu = new StringSelectMenuBuilder()
              .setPlaceholder(localize('REMINDER.SELECT_LIST'))
              .setCustomId('reminder_select');

          let emb: EmbedBuilder;
          if (reminders.size) {
            emb = embed({ title: `🔔 ${localize('REMINDER.LIST')}` });
            reminders
              .sort((a, b) => a.timestamp - b.timestamp)
              .forEach((r: Record<string, any>) => {
                selectMenu.addOptions({
                  description: truncate(r.content, 100),
                  label: new Date(r.timestamp).toLocaleString(userData.locale),
                  value: r.id,
                });
                emb.addFields({
                  name: `${toUTS(r.timestamp, TimestampStyles.ShortDateTime)}${r.isRecursive ? ' 🔁' : ''}`,
                  value: truncate(r.content, 300),
                });
              });

            rows.push(new ActionRowBuilder().addComponents(selectMenu));
          } else {
            emb = embed({ color: Colors.Red, title: `🔕 ${localize('REMINDER.LIST')}` }).setDescription(
              localize('ERROR.REMINDER.EMPTY'),
            );
          }

          return interaction.editReply({
            components: rows,
            embeds: [emb],
          });
        }
      }
    } else if (
      interaction.isButton() ||
      interaction.isChannelSelectMenu() ||
      interaction.isStringSelectMenu() ||
      interaction.isModalSubmit()
    ) {
      let { customId } = interaction,
        isList = customId === 'reminder_list';
      const { message } = interaction,
        urlArgs = new URLSearchParams(message.embeds.at(-1)?.footer?.iconURL);

      if (
        !(message.interactionMetadata?.user.id === user.id || urlArgs.get('messageOwners') === user.id) &&
        !(!message.interactionMetadata && isList)
      ) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.UNALLOWED.COMMAND'))],
          ephemeral: true,
        });
      }

      const reminderId =
        interaction instanceof StringSelectMenuInteraction
          ? interaction.values[0]
          : urlArgs.get('reminderId') || getFieldValue(message.embeds[0], localize('GENERIC.ID'))?.replaceAll('`', '');

      let reminder = reminderId ? await userData.reminders.fetch({ reminderId }) : null,
        emb = embed(
          message.interactionMetadata?.user.id === client.user.id || !message.interactionMetadata
            ? { addParams: { messageOwners: user.id }, footer: 'interacted' }
            : { footer: 'interacted' },
        );

      if (!isList) {
        if (reminder) {
          emb.setTitle(`🔔 ${localize('REMINDER.INFO')}`).addFields(
            {
              name: `📄 ${localize('GENERIC.CONTENT.CONTENT')}`,
              value: reminder.content,
            },
            {
              inline: true,
              name: `🪪 ${localize('GENERIC.ID')}`,
              value: `\`${reminder.id}\``,
            },
            {
              inline: true,
              name: `${client.useEmoji('channelText')} ${localize('GENERIC.CHANNEL.CHANNEL')}`,
              value: reminder.channelId
                ? `<#${reminder.channelId}> - \`${reminder.channelId}\``
                : `**${localize('GENERIC.DIRECT_MESSAGE')}**`,
            },
            {
              name: `📅 ${localize('GENERIC.TIMESTAMP')}`,
              value: `${localize('REMINDER.TIMESTAMP', { timestamp: toUTS(reminder.timestamp) })}\n${localize(
                'REMINDER.CREATED_AT',
                { timestamp: toUTS(SnowflakeUtil.timestampFrom(reminder.id)) },
              )}`,
            },
            reminder.isRecursive
              ? {
                  name: `🔁 ${localize('GENERIC.RECURSIVE')}`,
                  value: localize('REMINDER.RECURSIVE.ON', { timestamp: toUTS(reminder.timestamp + reminder.msTime) }),
                }
              : {
                  name: `🔁 ${localize('GENERIC.NOT_RECURSIVE')}`,
                  value:
                    reminder.msTime < minRecursiveTime
                      ? localize('REMINDER.RECURSIVE.DISABLED', {
                          time: localize('GENERIC.TIME.MINUTES', { count: minRecursiveTime / 60000 }),
                        })
                      : localize('REMINDER.RECURSIVE.OFF'),
                },
          );
        } else if (customId === 'reminder_select') {
          isList = true;
        } else {
          emb = EmbedBuilder.from(message.embeds[0])
            .setTitle(`🔕 ${localize('REMINDER.INFO')}`)
            .setColor(Colors.Red);
          customId = 'reminder_view';
        }
      }

      switch (customId) {
        case 'reminder_list':
        case 'reminder_select':
        case 'reminder_view': {
          await interaction.deferUpdate();
          if (message.webhookId) {
            await interaction.editReply({
              components: disableComponents(message.components, {
                defaultValues: [{ customId: 'reminder_select', values: [reminderId] }],
              }),
            });
          }

          if (!isList) {
            rows.push(
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('REMINDER.COMPONENT.LIST'))
                  .setEmoji('🗒️')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('reminder_list'),
                new ButtonBuilder()
                  .setEmoji('📝')
                  .setLabel(localize('GENERIC.EDIT'))
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('reminder_edit')
                  .setDisabled(!reminder),
              ),
            );
          } else {
            const reminders = await userData.reminders.fetch(),
              selectMenu = new StringSelectMenuBuilder()
                .setPlaceholder(localize('REMINDER.SELECT_LIST'))
                .setCustomId('reminder_select');

            if (reminders.size) {
              emb.setTitle(`🔔 ${localize('REMINDER.LIST')}`);
              reminders
                .sort((a, b) => a.timestamp - b.timestamp)
                .forEach((r: Record<string, any>) => {
                  selectMenu.addOptions({
                    description: truncate(r.content, 100),
                    label: new Date(r.timestamp).toLocaleString(userData.locale),
                    value: r.id,
                  });
                  emb.addFields({
                    name: `${toUTS(r.timestamp, TimestampStyles.ShortDateTime)}${r.isRecursive ? ' 🔁' : ''}`,
                    value: truncate(r.content, 300),
                  });
                });

              rows.push(new ActionRowBuilder().addComponents(selectMenu));
            } else {
              emb
                .setTitle(`🔕 ${localize('REMINDER.LIST')}`)
                .setColor(Colors.Red)
                .setDescription(localize('ERROR.REMINDER.EMPTY'));
            }
          }

          client.log(util.inspect(rows, { depth: null }));
          if ((!isList || customId === 'reminder_select') && !reminder) {
            client.log(chalk.red('1'));
            await interaction.followUp({
              embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.REMINDER.NOT_FOUND', { reminderId }))],
              ephemeral: true,
            });
            if (!message.webhookId) {
              client.log(chalk.green('2'));
              return interaction.editReply({
                components: disableComponents(message.components, { enabledComponents: ['reminder_list'] }),
              });
            }
          }

          client.log(chalk.yellow('3'));
          if (!message.webhookId) return interaction.followUp({ components: rows, embeds: [emb], ephemeral: true });

          client.log(chalk.blue('4'));
          return interaction.editReply({
            components: rows,
            embeds: [emb],
          });
        }
        case 'reminder_edit':
        case 'reminder_recursive': {
          if (customId === 'reminder_recursive') {
            reminder = await userData.reminders.set(reminderId, {
              isRecursive: !reminder.isRecursive,
            });

            emb
              .setTitle(`🔔 ${localize('REMINDER.EDITED')}`)
              .spliceFields(
                4,
                1,
                reminder.isRecursive
                  ? {
                      name: `🔁 ${localize('GENERIC.RECURSIVE')}`,
                      value: localize('REMINDER.RECURSIVE.ON', {
                        timestamp: toUTS(reminder.timestamp + reminder.msTime),
                      }),
                    }
                  : {
                      name: `🔁 ${localize('GENERIC.NOT_RECURSIVE')}`,
                      value: localize('REMINDER.RECURSIVE.OFF'),
                    },
              )
              .setColor(Colors.Yellow);
          } else {
            emb.setTitle(`🔔 ${localize('REMINDER.EDITING')}`).setColor(Colors.Yellow);
          }
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setLabel(localize('GENERIC.VIEW'))
                .setEmoji('🔎')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('reminder_view'),
              new ButtonBuilder()
                .setLabel(localize(`GENERIC.${reminder.isRecursive ? 'RECURSIVE' : 'NOT_RECURSIVE'}`))
                .setEmoji('🔁')
                .setStyle(reminder.isRecursive ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setCustomId('reminder_recursive')
                .setDisabled(reminder.msTime < minRecursiveTime),
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setLabel(localize('GENERIC.CONTENT.EDIT'))
                .setEmoji('✏️')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('reminder_edit_content'),
              new ButtonBuilder()
                .setLabel(localize('GENERIC.CHANNEL.EDIT'))
                .setEmoji(client.useEmoji('channelText'))
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('reminder_edit_channel'),
              new ButtonBuilder()
                .setLabel(localize('GENERIC.DELETE'))
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('reminder_delete'),
            ),
          );

          if (!message.webhookId) return interaction.reply({ components: rows, embeds: [emb], ephemeral: true });
          return (interaction as ButtonInteraction).update({
            components: rows,
            embeds: [emb],
          });
        }
        case 'reminder_delete': {
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setLabel(localize('GENERIC.BACK'))
                .setEmoji('↩️')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('reminder_edit'),
              new ButtonBuilder()
                .setLabel(localize('GENERIC.YES'))
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success)
                .setCustomId('reminder_delete_confirm'),
            ),
          );
          return (interaction as ButtonInteraction).update({
            components: rows,
            embeds: [
              emb
                .setTitle(`🔔 ${localize('REMINDER.DELETING')}`)
                .setDescription(localize('REMINDER.DELETING_DESCRIPTION'))
                .setColor(Colors.Orange),
            ],
          });
        }
        case 'reminder_delete_confirm': {
          await userData.reminders.delete(reminderId);
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setLabel(localize('REMINDER.COMPONENT.LIST'))
                .setEmoji('🗒️')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('reminder_list'),
            ),
          );
          return (interaction as ButtonInteraction).update({
            components: rows,
            embeds: [emb.setTitle(`🔕 ${localize('REMINDER.DELETED')}`).setColor(Colors.Red)],
          });
        }
        case 'reminder_edit_content': {
          return (interaction as ButtonInteraction).showModal(
            new ModalBuilder()
              .setTitle(localize('GENERIC.CONTENT.EDITING'))
              .setCustomId('reminder_edit_content_submit')
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('reminder_edit_content_input')
                    .setLabel(localize('GENERIC.CONTENT.EDITING_LABEL'))
                    .setMinLength(1)
                    .setMaxLength(1024)
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder(truncate(reminder.content, 100)),
                ),
              ),
          );
        }
        case 'reminder_edit_content_submit': {
          const { fields } = interaction as ModalMessageModalSubmitInteraction,
            inputF = fields
              .getTextInputValue('reminder_edit_content_input')
              ?.replace(/((\\n|\n)(\s*)?)+/g, '\n')
              .trim();

          if (!inputF) {
            return interaction.reply({
              embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.REMINDER.EMPTY_CONTENT'))],
              ephemeral: true,
            });
          }

          reminder = await userData.reminders.set(reminderId, {
            content: inputF,
          });

          return (interaction as ModalMessageModalSubmitInteraction).update({
            embeds: [
              emb
                .setTitle(`🔔 ${localize('GENERIC.CONTENT.EDITED')}`)
                .spliceFields(0, 1, {
                  name: `📄 ${localize('GENERIC.CONTENT.CONTENT')}`,
                  value: reminder.content,
                })
                .setColor(Colors.Green),
            ],
          });
        }
        case 'reminder_dm':
        case 'reminder_edit_channel_submit':
          reminder = await userData.reminders.set(reminderId, {
            channelId:
              (customId !== 'reminder_dm' && (interaction as ChannelSelectMenuInteraction).channels.first()?.id) ||
              null,
          });
        // eslint-disable-next-line no-fallthrough
        case 'reminder_edit_channel': {
          const isEdit = customId === 'reminder_edit_channel';
          return (interaction as ButtonInteraction).update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.BACK'))
                  .setEmoji('↩️')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('reminder_edit'),
                new ButtonBuilder()
                  .setLabel(localize(`GENERIC.${reminder.channelId ? 'NOT_DIRECT_MESSAGE' : 'DIRECT_MESSAGE'}`))
                  .setEmoji(client.useEmoji('user'))
                  .setStyle(reminder.channelId ? ButtonStyle.Secondary : ButtonStyle.Success)
                  .setCustomId('reminder_dm')
                  .setDisabled(!reminder.channelId),
              ),
              new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
                new ChannelSelectMenuBuilder()
                  .setMinValues(0)
                  .setDefaultChannels([reminder.channelId].filter(Boolean))
                  .setPlaceholder(localize('GENERIC.CHANNEL.SELECT_PLACEHOLDER'))
                  .setChannelTypes(
                    ChannelType.AnnouncementThread,
                    ChannelType.GuildAnnouncement,
                    ChannelType.GuildText,
                    ChannelType.GuildVoice,
                    ChannelType.GuildStageVoice,
                    ChannelType.PrivateThread,
                    ChannelType.PublicThread,
                  )
                  .setCustomId('reminder_edit_channel_submit'),
              ),
            ],
            embeds: [
              emb
                .setTitle(`🔔 ${localize(`GENERIC.CHANNEL.${isEdit ? 'EDITING' : 'EDITED'}`)}`)
                .spliceFields(2, 1, {
                  inline: true,
                  name: `${client.useEmoji('channelText')} ${localize('GENERIC.CHANNEL.CHANNEL')}`,
                  value: reminder.channelId
                    ? `<#${reminder.channelId}> - \`${reminder.channelId}\``
                    : `**${localize('GENERIC.DIRECT_MESSAGE')}**`,
                })
                .setColor(isEdit ? Colors.Yellow : Colors.Green),
            ],
          });
        }
      }
    }
  }
}
