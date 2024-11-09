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

export default class SuppressWarning extends Command {
  constructor() {
    super([], { redirectIds: ['suppress-warning'] });
  }

  async run(args: CommandArgs, interaction: ButtonInteraction<'cached'>): Promise<any> {
    const { embed, localize, userData } = args,
      { message } = interaction,
      warning = +new URLSearchParams(message.embeds.at(-1)?.footer?.iconURL).get('warning');

    if (warning == null) {
      await interaction.update({
        components: disableComponents(message.components, { disabledComponents: ['suppress-warning'] }),
      });
      return interaction.followUp({
        embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.WARNING_NOT_FOUND'))],
        flags: MessageFlags.Ephemeral,
      });
    }

    await userData.suppressWarning(warning);

    return interaction.update({
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel(localize('SUPPRESSED_WARNING'))
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
