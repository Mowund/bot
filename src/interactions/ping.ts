import { ShardClientUtil, BaseInteraction, InteractionContextType, ApplicationIntegrationType } from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';

export default class Ping extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'DESC.PING',
        integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'CMD.PING',
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    if (!interaction.isChatInputCommand()) return;

    const { client, embed, isEphemeral, localize } = args,
      { guildId } = interaction,
      itc = await interaction.deferReply({ ephemeral: isEphemeral, fetchReply: true }),
      emb = embed({ title: `🏓 ${localize('PING.TITLE')}` }).addFields(
        {
          inline: true,
          name: `⌛ ${localize('PING.RESPONSE_TIME')}`,
          value: `\`${itc.createdTimestamp - interaction.createdTimestamp}ms\``,
        },
        {
          inline: true,
          name: `💓 ${localize('PING.API_LATENCY')}`,
          value: `\`${Math.round(client.ws.ping)}ms\``,
        },
      );

    if (interaction.inGuild()) {
      emb.addFields({
        name: `💎 ${localize('SHARD')}`,
        value: `**${localize('CURRENT')}:** \`${
          ShardClientUtil.shardIdForGuildId(guildId, client.shard.count) + 1
        }\`\n**${localize('TOTAL')}:** \`${client.shard.count}\``,
      });
    }

    return interaction.editReply({
      embeds: [emb],
    });
  }
}
