import {
  ApplicationCommandOptionType,
  BaseInteraction,
  Colors,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { imageOptions } from '../defaults.js';

export default class Kill extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'KILL.DESCRIPTION',
        integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'KILL.NAME',
        options: [
          {
            description: 'KILL.OPTIONS.USER.DESCRIPTION',
            name: 'KILL.OPTIONS.USER.NAME',
            type: ApplicationCommandOptionType.User,
          },
        ],
      },
    ]);
  }

  run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    if (!interaction.isChatInputCommand()) return;

    const { embed, isEphemeral, localize } = args,
      { member, options, user } = interaction,
      userO = options.getUser('user') ?? user,
      memberO = options.getMember('user') ?? member;

    return interaction.reply({
      embeds: [
        embed({ color: Colors.Red })
          .setAuthor({
            iconURL: (memberO ?? userO).displayAvatarURL(imageOptions),
            name: memberO?.displayName ?? userO.username,
          })
          .setDescription(localize('KILL.DIED')),
      ],
      ephemeral: isEphemeral,
    });
  }
}
