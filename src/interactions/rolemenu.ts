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
        description: 'ROLEMENU.DESCRIPTION',
        integration_types: [ApplicationIntegrationType.GuildInstall],
        name: 'ROLEMENU.NAME',
        options: [
          {
            description: 'ROLEMENU.OPTIONS.CREATE.DESCRIPTION',
            name: 'ROLEMENU.OPTIONS.CREATE.NAME',
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
                description: 'ROLEMENU.OPTIONS.CREATE.OPTIONS.CHANNEL.DESCRIPTION',
                name: 'ROLEMENU.OPTIONS.CREATE.OPTIONS.CHANNEL.NAME',
                type: ApplicationCommandOptionType.Channel,
              },
            ],
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            description: 'ROLEMENU.OPTIONS.EDIT.DESCRIPTION',
            name: 'ROLEMENU.OPTIONS.EDIT.NAME',
            options: [
              {
                description: 'ROLEMENU.OPTIONS.EDIT.OPTIONS.ID.DESCRIPTION',
                name: 'ROLEMENU.OPTIONS.EDIT.OPTIONS.ID.NAME',
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

      await interaction.deferReply({ ephemeral: isEphemeral });

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
          await interaction.deferReply({ ephemeral: true });

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
