import { BaseInteraction, InteractionContextType, ApplicationIntegrationType, MessageFlags } from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';

export default class Ping extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'DESC.PING',
        integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'CMD.PING',
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    if (!interaction.isChatInputCommand()) return;

    const { __, client, embed, isEphemeral } = args,
      {
        resource: { message },
      } = await interaction.deferReply({
        flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
        withResponse: true,
      }),
      emb = embed({ title: `🏓 ${__('PING.TITLE')}` }).addFields(
        {
          inline: true,
          name: `⌛ ${__('PING.RESPONSE_TIME')}`,
          value: `\`${message.createdTimestamp - interaction.createdTimestamp}ms\``,
        },
        {
          inline: true,
          name: `💓 ${__('PING.API_LATENCY')}`,
          value: `\`${Math.round(client.ping)}ms\``,
        },
        {
          name: `💎 ${__('SHARD')}`,
          value: `**${__('CURRENT')}:** \`${client.shardId}\`\n**${__('TOTAL')}:** \`${await client.ws.getShardCount()}\``,
        },
      );

    return interaction.editReply({
      embeds: [emb],
    });
  }
}
