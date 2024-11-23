import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { disableComponents } from '../utils.js';
import { Warnings } from '../../lib/structures/UserData.js';

export default class SuppressWarning extends Command {
  constructor() {
    super([], { redirectIds: ['suppress-warning'] });
  }

  async run(args: CommandArgs, interaction: ButtonInteraction<'cached'>): Promise<any> {
    const { __, embed, userData } = args,
      { message } = interaction,
      warningId = new URLSearchParams(message.embeds.at(-1)?.footer?.iconURL).get('warning');

    if (!Warnings[+warningId]) {
      await interaction.update({
        components: disableComponents(message.components, { disabledComponents: ['suppress-warning'] }),
      });
      return interaction.followUp({
        embeds: [embed({ type: 'error' }).setDescription(__('ERROR.WARNING_NOT_FOUND', { warningId }))],
        flags: MessageFlags.Ephemeral,
      });
    }

    await userData.suppressWarning(+warningId);

    return interaction.update({
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel(__('SUPPRESSED_WARNING'))
            .setEmoji('🔇')
            .setStyle(ButtonStyle.Danger)
            .setCustomId('suppress-warning')
            .setDisabled(true),
        ),
      ],
      embeds: [new EmbedBuilder(message.embeds[0]).setColor(Colors.Orange)],
    });
  }
}
