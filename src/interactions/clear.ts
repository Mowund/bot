import { setTimeout } from 'node:timers';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  BaseInteraction,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  CommandInteractionOptionResolver,
  PermissionFlagsBits,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { botOwners } from '../defaults.js';

export default class Clear extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild],
        defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
        integrationTypes: [ApplicationIntegrationType.GuildInstall],
        name: 'CLEAR.DELETE_AFTER_THIS',
        type: ApplicationCommandType.Message,
      },
      {
        contexts: [InteractionContextType.Guild],
        defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
        description: 'DESC.CLEAR',
        integrationTypes: [ApplicationIntegrationType.GuildInstall],
        name: 'CMD.CLEAR',
        options: [
          {
            description: 'CLEAR.DESC.COUNT',
            max_value: 100,
            min_value: 1,
            name: 'CMD.COUNT',
            required: true,
            type: ApplicationCommandOptionType.Integer,
          },
          {
            description: 'CLEAR.DESC.DELETE_PINNED',
            name: 'CMD.DELETE_PINNED',
            type: ApplicationCommandOptionType.Boolean,
          },
        ],
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    const { __, client, embed, isEphemeral } = args,
      { localize: __dl } = client,
      { channel, memberPermissions, user } = interaction;

    // TODO: Create a confirmation menu
    // TODO: Delete user-specific messages
    // TODO: Let users delete their own messages without manage messages permission
    if (interaction.isCommand()) {
      const { options } = interaction,
        countO = (options as CommandInteractionOptionResolver)?.getInteger(__dl('CMD.COUNT')) ?? 100,
        delPinsO = (options as CommandInteractionOptionResolver)?.getBoolean(__dl('CMD.DELETE-PINNED')),
        messageO = (options as CommandInteractionOptionResolver)?.getMessage(__dl('CMD.MESSAGE')),
        msg = await interaction.deferReply({
          fetchReply: true,
          flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
        });

      if (!memberPermissions?.has(PermissionFlagsBits.ManageMessages) && !botOwners.includes(user.id)) {
        return interaction.editReply({
          embeds: [
            embed({ type: 'error' }).setDescription(
              __('ERROR.PERM.USER.SINGLE.REQUIRES', { perm: __('PERM.MANAGE_MESSAGES') }),
            ),
          ],
        });
      }

      const msgs = await channel.messages.fetch({ after: messageO?.id, before: msg.id, limit: countO }),
        fMsgs = msgs.filter(m => !m.pinned),
        pinCnt = msgs.size - fMsgs.size,
        rows = [new ActionRowBuilder<ButtonBuilder>()];

      if (!fMsgs.size)
        return interaction.editReply({ embeds: [embed({ type: 'error' }).setDescription(`No messages to delete`)] });

      rows[0].addComponents(
        new ButtonBuilder()
          .setLabel(__('YES'))
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
          .setCustomId('clear_delete'),
      );

      client.log({ msgCnt: fMsgs.size, pinCnt });
      return interaction.editReply({
        components: rows,
        embeds: [
          embed({
            addParams: {
              afterMsg: messageO?.id ?? `${+msgs.last().id - 1}`,
              beforeMsg: msg.id,
              delPins: `${delPinsO}`,
            },
            color: Colors.Red,
            title: '🗑️ Deleting Messages',
          }).setDescription(
            `Are you sure you want to delete all \`${(delPinsO ? msgs : fMsgs).size}\` messages up to [this](${
              msgs.last().url
            })?${
              pinCnt
                ? delPinsO
                  ? `\n\`${pinCnt}\` pinned messages will be deleted together`
                  : `\n\`${pinCnt}\` messages were ignored as they are pinned`
                : ''
            }`,
          ),
        ],
      });
    }

    if (interaction.isButton()) {
      const { customId, message } = interaction;

      if (message.interactionMetadata.user.id !== user.id) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(__('ERROR.UNALLOWED.COMMAND'))],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!memberPermissions?.has(PermissionFlagsBits.ManageMessages) && !botOwners.includes(user.id)) {
        return interaction.editReply({
          embeds: [
            embed({ type: 'error' }).setDescription(
              __('ERROR.PERM.USER.SINGLE.NO_LONGER', { perm: __('PERM.MANAGE_MESSAGES') }),
            ),
          ],
        });
      }

      switch (customId) {
        case 'clear_delete': {
          const embedParams = new URLSearchParams(message.embeds[0].footer.iconURL),
            delPinsP = embedParams.get('delPins'),
            msgs = await channel.messages.fetch({
              after: embedParams.get('afterMsg'),
              before: embedParams.get('beforeMsg'),
            }),
            delMsgs = await channel.bulkDelete(delPinsP ? msgs : msgs.filter(m => !m.pinned), true),
            pinCnt = delMsgs.filter(m => m.pinned).size,
            emb = embed({
              addParams: { messageOwners: user.id },
              type: 'success',
            }).setDescription(
              `${delMsgs.size} messages were deleted${
                pinCnt
                  ? delPinsP
                    ? `\n\`${pinCnt}\` pinned messages were deleted together`
                    : `\n\`${pinCnt}\` messages were ignored as they are pinned`
                  : ''
              }`,
            );

          if (!isEphemeral)
            return interaction.reply({ embeds: [emb] }).then(() => setTimeout(() => interaction.deleteReply(), 5000));

          return interaction.update({
            components: [],
            embeds: [emb],
          });
        }
      }
    }
  }
}
