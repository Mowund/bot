import {
  ActionRowBuilder,
  Collection,
  ApplicationCommandOptionType,
  ChannelType,
  PermissionFlagsBits,
  BaseInteraction,
  Role,
  GuildTextBasedChannel,
  StringSelectMenuBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
} from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { botOwners } from '../defaults.js';
import { collMap } from '../utils.js';

export default class RoleMenu extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild],
        defaultMemberPermissions: PermissionFlagsBits.ManageRoles,
        description: 'DESC.ROLEMENU',
        integrationTypes: [ApplicationIntegrationType.GuildInstall],
        name: 'CMD.ROLEMENU',
        options: [
          {
            description: 'DESC.ROLEMENU_CREATE',
            name: 'CMD.CREATE',
            options: [
              {
                channelTypes: [
                  ChannelType.AnnouncementThread,
                  ChannelType.GuildAnnouncement,
                  ChannelType.GuildText,
                  ChannelType.GuildVoice,
                  ChannelType.GuildStageVoice,
                  ChannelType.PrivateThread,
                  ChannelType.PublicThread,
                ],
                description: 'ROLEMENU.CREATE.DESC.CHANNEL',
                name: 'CMD.CHANNEL',
                type: ApplicationCommandOptionType.Channel,
              },
            ],
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            description: 'DESC.ROLEMENU_EDIT',
            name: 'CMD.EDIT',
            options: [
              {
                description: 'ROLEMENU.EDIT.DESC.ID',
                name: 'CMD.ID',
                type: ApplicationCommandOptionType.String,
              },
            ],
            type: ApplicationCommandOptionType.Subcommand,
          },
        ],
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    const { client, embed, isEphemeral } = args,
      { guild, user } = interaction;

    if (interaction.isChatInputCommand()) {
      const { options } = interaction,
        channelO = (options.getChannel('channel') ?? interaction.channel) as GuildTextBasedChannel;

      await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });

      if (!botOwners.includes(user.id)) {
        return interaction.editReply({
          embeds: [embed({ type: 'wip' })],
        });
      }

      switch (options.getSubcommand()) {
        case 'create': {
          if (!channelO.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages)) {
            return interaction.editReply({
              embeds: [embed({ type: 'error' }).setDescription("Can't send messages on this channel")],
            });
          }

          const menuRows = [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('rolemenu_giverole')
                .setPlaceholder('Escolha um cargo')
                .setMinValues(0)
                .setMaxValues(2)
                .addOptions(
                  {
                    description: 'Cargo de aniversariantes',
                    emoji: '🎂',
                    label: 'Aniversariantes',
                    value: '503219168007421971',
                  },
                  {
                    description: 'Cargo de mutados',
                    emoji: '⛔',
                    label: 'Mutados',
                    value: '531313330703433758',
                  },
                ),
            ),
          ];

          await channelO.send({
            components: menuRows,
            embeds: [embed({ title: 'Escolha Algum Cargo' }).setDescription('🎂 Aniversariantes\n⛔ Mutados')],
          });

          return interaction.editReply({
            embeds: [embed().setDescription(`rolemenu criado em: ${channelO.toString()}`)],
          });
        }
      }
    } else if (interaction.isStringSelectMenu()) {
      const { customId, values } = interaction;

      switch (customId) {
        case 'rolemenu_giverole': {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          let roles = new Collection<string, Role>();
          for (let rId of values) {
            rId = rId.split(' ').join('');
            const role = guild.roles.cache.filter(r => r.id === rId);

            if (!role) return interaction.reply(`Role ${rId} not found`);

            roles = roles.concat(role);
          }

          return interaction.editReply({
            embeds: [
              embed({ title: 'Cargos Selecionados' }).setDescription(collMap(roles) || 'Nenhum cargo selecionado'),
            ],
          });
        }
      }
    }
  }
}
