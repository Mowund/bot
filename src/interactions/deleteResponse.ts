import {
  ApplicationCommandType,
  BaseInteraction,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';

export default class DeleteResponse extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM],
        integrationTypes: [ApplicationIntegrationType.GuildInstall],
        name: 'DELETE_RESPONSE',
        type: ApplicationCommandType.Message,
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    if (!interaction.isMessageContextMenuCommand()) return;

    const { client, embed, localize } = args,
      { options, user } = interaction,
      messageO = options.getMessage('message');

    if (
      messageO.author.id !== client.user.id ||
      (messageO.inGuild() &&
        !(
          messageO.interaction?.user.id === user.id ||
          new URLSearchParams(messageO.embeds.at(-1)?.footer?.iconURL)
            .get('messageOwners')
            ?.split('-')
            .includes(user.id)
        ))
    ) {
      return interaction.reply({
        embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.UNALLOWED.DELETE_RESPONSE'))],
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    await messageO.delete();
    return interaction.deleteReply();
  }
}
