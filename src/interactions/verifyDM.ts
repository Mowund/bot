import {
  ActionRowBuilder,
  ApplicationIntegrationType,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Colors,
  DiscordAPIError,
  EmbedBuilder,
  OAuth2Scopes,
} from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { appInvite } from '../utils.js';
import { Warnings } from '../../lib/structures/UserData.js';

export default class VerifyDM extends Command {
  constructor() {
    super([], { redirectIds: ['verify-dm'] });
  }

  async run(args: CommandArgs, interaction: ButtonInteraction<'cached'>): Promise<any> {
    const { __, client, integrationTypes, userData } = args,
      { message, user } = interaction,
      addToAccount = new ButtonBuilder()
        .setLabel(__('ADD_TO_ACCOUNT'))
        .setEmoji(client.useEmoji('invite'))
        .setStyle(ButtonStyle.Link)
        .setURL(
          appInvite(client.user.id, {
            integrationType: ApplicationIntegrationType.UserInstall,
            scopes: [OAuth2Scopes.ApplicationsCommands],
          }),
        )
        .setDisabled(integrationTypes.includes(ApplicationIntegrationType.UserInstall));

    await user.send('').catch(async (e: DiscordAPIError) => {
      if (e.code === 50007) {
        return interaction.update({
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              addToAccount,
              new ButtonBuilder()
                .setLabel(__('REVERIFY'))
                .setEmoji('🔁')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('verify-dm'),
            ),
          ],
        });
      }

      if (userData.disabledDM) {
        await userData.set({ $unset: { disabledDM: '' } });
        await userData.unsuppressWarning(Warnings.CannotDM);
      }

      return interaction.update({
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            addToAccount,
            new ButtonBuilder()
              .setLabel(__('FIXED'))
              .setEmoji(client.useEmoji('check'))
              .setStyle(ButtonStyle.Success)
              .setCustomId('verify-dm')
              .setDisabled(true),
          ),
        ],
        embeds: [new EmbedBuilder(message.embeds[0]).setColor(Colors.Green)],
      });
    });
  }
}
