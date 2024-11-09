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
  ButtonInteraction,
  ModalBuilder,
  ModalMessageModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} from 'discord.js';
import parseDur from 'parse-duration';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { disableComponents, getFieldValue, msToTime, toUTS, truncate } from '../utils.js';

export default class Reminder extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'DESC.REMINDER',
        integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'CMD.REMINDER',
        options: [
          {
            description: 'DESC.REMINDER_CREATE',
            name: 'CMD.CREATE',
            options: [
              {
                description: 'REMINDER.CREATE.DESC.CONTENT',
                max_length: 4000,
                name: 'CMD.CONTENT',
                required: true,
                type: ApplicationCommandOptionType.String,
              },
              {
                autocomplete: true,
                description: 'REMINDER.CREATE.DESC.TIME',
                name: 'CMD.TIME',
                required: true,
                type: ApplicationCommandOptionType.String,
              },
            ],
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            description: 'DESC.REMINDER_LIST',
            name: 'CMD.LIST',
            type: ApplicationCommandOptionType.Subcommand,
          },
        ],
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    const { client, embed, isEphemeral, localize, userData } = args,
      { user } = interaction,
      minTime = 1000 * 60 * 3,
      maxTime = 1000 * 60 * 60 * 24 * 365.25 * 100,
      minRecursiveTime = minTime * 10,
      rows = [];

    if (interaction.isAutocomplete()) {
      const { value } = interaction.options.getFocused(),
        msTime = parseDur(value);

      return interaction.respond([
        {
          name:
            !msTime || msTime < minTime || msTime > maxTime
              ? localize('ERROR.INVALID.TIME_AUTOCOMPLETE', {
                  condition: msTime && (msTime > maxTime ? 'greater' : 'less'),
                  input: msToTime(msTime),
                  time:
                    msTime > maxTime
                      ? localize('TIME.YEARS', { count: maxTime / 365.25 / 24 / 60 / 60000 })
                      : localize('TIME.MINUTES', { count: minTime / 60000 }),
                })
              : msToTime(msTime),
          value,
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
              flags: MessageFlags.Ephemeral,
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
                        ? localize('TIME.YEARS', { count: maxTime / 365.25 / 24 / 60 / 60000 })
                        : localize('TIME.MINUTES', { count: minTime / 60000 }),
                  }),
                ),
              ],
              flags: MessageFlags.Ephemeral,
            });
          }

          await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });

          const reminder = await userData.reminders.set(reminderId, {
              content: contentO,
              timestamp: summedTime,
            }),
            emb = embed({ title: localize('REMINDER.CREATED'), type: 'success' })
              .setDescription(reminder.content)
              .addFields(
                {
                  inline: true,
                  name: `🪪 ${localize('ID')}`,
                  value: `\`${reminder.id}\``,
                },
                {
                  name: `📅 ${localize('TIMESTAMP')}`,
                  value: `${localize('REMINDER.TIMESTAMP', { timestamp: toUTS(reminder.timestamp) })}\n${localize(
                    'REMINDER.CREATED_AT',
                    { timestamp: toUTS(SnowflakeUtil.timestampFrom(reminder.id)) },
                  )}`,
                },
                {
                  name: `🔁 ${localize('NOT_RECURSIVE')}`,
                  value:
                    msTime < minRecursiveTime
                      ? localize('REMINDER.RECURSIVE.DISABLED', {
                          time: localize('TIME.MINUTES', { count: minRecursiveTime / 60000 }),
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
                .setLabel(localize('EDIT'))
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
          await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });

          const reminders = userData.reminders.cache,
            selectMenu = new StringSelectMenuBuilder()
              .setPlaceholder(localize('REMINDER.SELECT_LIST'))
              .setCustomId('reminder_select');

          let emb: EmbedBuilder;
          if (reminders?.size) {
            emb = embed({ title: `🔔 ${localize('REMINDER.LIST')}` });
            reminders
              .sort((a, b) => a.timestamp - b.timestamp)
              .forEach((r: Record<string, any>) => {
                selectMenu.addOptions({
                  description: truncate(r.content, 100),
                  label: new Date(r.timestamp).toLocaleString(userData.locale) + (r.recursive ? ' 🔁' : ''),
                  value: r.id,
                });
                emb.addFields({
                  name: toUTS(r.timestamp, TimestampStyles.ShortDateTime) + (r.recursive ? ' 🔁' : ''),
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
    } else if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
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
          flags: MessageFlags.Ephemeral,
        });
      }

      const reminderId =
        interaction instanceof StringSelectMenuInteraction
          ? interaction.values[0]
          : urlArgs.get('reminderId') || getFieldValue(message.embeds[0], localize('ID'))?.replaceAll('`', '');

      let reminder = reminderId ? await userData.reminders.fetch({ reminderId }) : null,
        emb = embed(
          message.interactionMetadata?.user.id === client.user.id || !message.interactionMetadata
            ? { addParams: { messageOwners: user.id }, footer: 'interacted' }
            : { footer: 'interacted' },
        );

      const idTimestamp = SnowflakeUtil.timestampFrom(reminderId);

      if (!isList) {
        if (reminder) {
          const msTime = reminder.timestamp - idTimestamp;
          emb
            .setTitle(`🔔 ${localize('REMINDER.INFO')}`)
            .setDescription(reminder.content)
            .addFields(
              {
                inline: true,
                name: `🪪 ${localize('ID')}`,
                value: `\`${reminder.id}\``,
              },
              {
                name: `📅 ${localize('TIMESTAMP')}`,
                value: `${localize('REMINDER.TIMESTAMP', { timestamp: toUTS(reminder.timestamp) })}\n${localize(
                  'REMINDER.CREATED_AT',
                  { timestamp: toUTS(idTimestamp) },
                )}`,
              },
              reminder.recursive
                ? {
                    name: `🔁 ${localize('RECURSIVE')}`,
                    value: localize('REMINDER.RECURSIVE.ON', {
                      timestamp: toUTS(reminder.timestamp + msTime),
                    }),
                  }
                : {
                    name: `🔁 ${localize('NOT_RECURSIVE')}`,
                    value:
                      msTime < minRecursiveTime
                        ? localize('REMINDER.RECURSIVE.DISABLED', {
                            time: localize('TIME.MINUTES', { count: minRecursiveTime / 60000 }),
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
                  .setLabel(localize('EDIT'))
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('reminder_edit')
                  .setDisabled(!reminder),
              ),
            );
          } else {
            const reminders = userData.reminders.cache,
              selectMenu = new StringSelectMenuBuilder()
                .setPlaceholder(localize('REMINDER.SELECT_LIST'))
                .setCustomId('reminder_select');

            if (reminders?.size) {
              emb.setTitle(`🔔 ${localize('REMINDER.LIST')}`);
              reminders
                .sort((a, b) => a.timestamp - b.timestamp)
                .forEach((r: Record<string, any>) => {
                  selectMenu.addOptions({
                    description: truncate(r.content, 100),
                    label: new Date(r.timestamp).toLocaleString(userData.locale) + (r.recursive ? ' 🔁' : ''),
                    value: r.id,
                  });
                  emb.addFields({
                    name: toUTS(r.timestamp, TimestampStyles.ShortDateTime) + (r.recursive ? ' 🔁' : ''),
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

          if ((!isList || customId === 'reminder_select') && !reminder) {
            await interaction.followUp({
              embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.REMINDER.NOT_FOUND', { reminderId }))],
              flags: MessageFlags.Ephemeral,
            });
            if (!message.webhookId) {
              return interaction.editReply({
                components: disableComponents(message.components, { enabledComponents: ['reminder_list'] }),
              });
            }
          }

          if (!message.webhookId)
            return interaction.followUp({ components: rows, embeds: [emb], flags: MessageFlags.Ephemeral });

          return interaction.editReply({
            components: rows,
            embeds: [emb],
          });
        }
        case 'reminder_edit':
        case 'reminder_recursive': {
          const msTime = reminder.timestamp - idTimestamp;
          if (customId === 'reminder_recursive') {
            reminder = await userData.reminders.set(reminderId, {
              recursive: !reminder.recursive,
            });

            emb
              .setTitle(`🔔 ${localize('REMINDER.EDITED')}`)
              .spliceFields(
                2,
                1,
                reminder.recursive
                  ? {
                      name: `🔁 ${localize('RECURSIVE')}`,
                      value: localize('REMINDER.RECURSIVE.ON', {
                        timestamp: toUTS(reminder.timestamp + msTime),
                      }),
                    }
                  : {
                      name: `🔁 ${localize('NOT_RECURSIVE')}`,
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
                .setLabel(localize('VIEW'))
                .setEmoji('🔎')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('reminder_view'),
              new ButtonBuilder()
                .setLabel(localize(`${reminder.recursive ? 'RECURSIVE' : 'NOT_RECURSIVE'}`))
                .setEmoji('🔁')
                .setStyle(reminder.recursive ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setCustomId('reminder_recursive')
                .setDisabled(msTime < minRecursiveTime),
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setLabel(localize('CONTENT.EDIT'))
                .setEmoji('✏️')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('reminder_edit_content'),
              new ButtonBuilder()
                .setLabel(localize('DELETE'))
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('reminder_delete'),
            ),
          );

          if (!message.webhookId)
            return interaction.reply({ components: rows, embeds: [emb], flags: MessageFlags.Ephemeral });
          return (interaction as ButtonInteraction).update({
            components: rows,
            embeds: [emb],
          });
        }
        case 'reminder_delete': {
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setLabel(localize('BACK'))
                .setEmoji('↩️')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('reminder_edit'),
              new ButtonBuilder()
                .setLabel(localize('YES'))
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success)
                .setCustomId('reminder_delete_confirm'),
            ),
          );
          const confirmText = `**${localize('REMINDER.DELETING_DESCRIPTION')}**\n\n`;
          return (interaction as ButtonInteraction).update({
            components: rows,
            embeds: [
              emb
                .setTitle(`🔔 ${localize('REMINDER.DELETING')}`)
                .setDescription(confirmText + truncate(reminder.content, 4096 - confirmText.length))
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
            embeds: [
              emb
                .setTitle(`🔕 ${localize('REMINDER.DELETED')}`)
                .setDescription(reminder.content)
                .setColor(Colors.Red),
            ],
          });
        }
        case 'reminder_edit_content': {
          return (interaction as ButtonInteraction).showModal(
            new ModalBuilder()
              .setTitle(localize('CONTENT.EDITING'))
              .setCustomId('reminder_edit_content_submit')
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('reminder_edit_content_input')
                    .setLabel(localize('CONTENT.EDITING_LABEL'))
                    .setMinLength(1)
                    .setMaxLength(4000)
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
              flags: MessageFlags.Ephemeral,
            });
          }

          reminder = await userData.reminders.set(reminderId, {
            content: inputF,
          });

          return (interaction as ModalMessageModalSubmitInteraction).update({
            embeds: [
              emb
                .setTitle(`🔔 ${localize('CONTENT.EDITED')}`)
                .setDescription(reminder.content)
                .setColor(Colors.Green),
            ],
          });
        }
      }
    }
  }
}
