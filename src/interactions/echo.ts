import {
  ApplicationCommandOptionType,
  BaseInteraction,
  ChannelType,
  Colors,
  EmbedBuilder,
  GuildTextBasedChannel,
  PermissionFlagsBits,
  MessageCreateOptions,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import tc from 'tinycolor2';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { botOwners, imageOptions } from '../defaults.js';
import { isValidImage } from '../utils.js';

export default class Echo extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'ECHO.DESCRIPTION',
        integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'ECHO.NAME',
        options: [
          {
            description: 'ECHO.OPTIONS.CONTENT.DESCRIPTION',
            name: 'ECHO.OPTIONS.CONTENT.NAME',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'ECHO.OPTIONS.DESCRIPTION.DESCRIPTION',
            name: 'ECHO.OPTIONS.DESCRIPTION.NAME',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'ECHO.OPTIONS.TITLE.DESCRIPTION',
            name: 'ECHO.OPTIONS.TITLE.NAME',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'ECHO.OPTIONS.URL.DESCRIPTION',
            name: 'ECHO.OPTIONS.URL.NAME',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'ECHO.OPTIONS.COLOR.DESCRIPTION',
            name: 'ECHO.OPTIONS.COLOR.NAME',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'ECHO.OPTIONS.AUTHOR.DESCRIPTION',
            name: 'ECHO.OPTIONS.AUTHOR.NAME',
            type: ApplicationCommandOptionType.User,
          },
          {
            description: 'ECHO.OPTIONS.FOOTER.DESCRIPTION',
            name: 'ECHO.OPTIONS.FOOTER.NAME',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'ECHO.OPTIONS.TIMESTAMP.DESCRIPTION',
            name: 'ECHO.OPTIONS.TIMESTAMP.NAME',
            type: ApplicationCommandOptionType.Boolean,
          },
          {
            description: 'ECHO.OPTIONS.ATTACHMENT.DESCRIPTION',
            name: 'ECHO.OPTIONS.ATTACHMENT.NAME',
            type: ApplicationCommandOptionType.Attachment,
          },
          {
            description: 'ECHO.OPTIONS.IMAGE.DESCRIPTION',
            name: 'ECHO.OPTIONS.IMAGE.NAME',
            type: ApplicationCommandOptionType.Attachment,
          },
          {
            description: 'ECHO.OPTIONS.THUMBNAIL.DESCRIPTION',
            name: 'ECHO.OPTIONS.THUMBNAIL.NAME',
            type: ApplicationCommandOptionType.Attachment,
          },
          {
            description: 'ECHO.OPTIONS.TTS.DESCRIPTION',
            name: 'ECHO.OPTIONS.TTS.NAME',
            type: ApplicationCommandOptionType.Boolean,
          },
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
            description: 'ECHO.OPTIONS.CHANNEL.DESCRIPTION',
            name: 'ECHO.OPTIONS.CHANNEL.NAME',
            type: ApplicationCommandOptionType.Channel,
          },
        ],
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    if (interaction.isChatInputCommand()) {
      const { client, embed, isEphemeral, localize } = args,
        { member, memberPermissions, options, user } = interaction,
        contentO = options.getString('content')?.replaceAll('\\n', '\n').trim(),
        descriptionO = options.getString('description')?.replaceAll('\\n', '\n').trim(),
        titleO = options.getString('title'),
        urlO = options.getString('url'),
        authorO = options.getUser('author'),
        memberO = options.getMember('author'),
        footerO = options.getString('footer'),
        timestampO = options.getBoolean('timestamp'),
        attachmentO = options.getAttachment('attachment'),
        imageO = options.getAttachment('image'),
        thumbnailO = options.getAttachment('thumbnail'),
        colorO = tc(options.getString('color')).isValid()
          ? +tc(options.getString('color')).toHex()
          : ((memberO ?? member)?.displayColor ?? Colors.Blurple),
        ttsO = options.getBoolean('tts'),
        channelO = options.getChannel('channel') as GuildTextBasedChannel,
        enableEmbed = descriptionO || titleO || authorO || footerO || imageO || thumbnailO;

      if (
        !memberPermissions?.has(PermissionFlagsBits.ManageMessages) &&
        !botOwners.includes(user.id) &&
        (!isEphemeral || channelO) &&
        interaction.guild
      ) {
        return interaction.reply({
          embeds: [
            embed({ type: 'error' }).setDescription(
              localize('ECHO.INSUFFICIENT.PERMS', { perm: localize('PERM.MANAGE_MESSAGES') }),
            ),
          ],
          ephemeral: true,
        });
      }

      if ((imageO && !isValidImage(imageO.contentType)) || (thumbnailO && !isValidImage(thumbnailO.contentType))) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.INVALID.IMAGE.TYPE'))],
          ephemeral: true,
        });
      }

      if (!contentO && !enableEmbed) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(localize('ECHO.INSUFFICIENT.ARGS'))],
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: isEphemeral });

      const eEmb = new EmbedBuilder().setColor(colorO),
        eMsg = {
          files: attachmentO
            ? [
                {
                  attachment: attachmentO.url,
                  name: attachmentO.name,
                },
              ]
            : [],
        } as MessageCreateOptions;

      if (contentO) eMsg.content = contentO;
      if (ttsO) eMsg.tts = ttsO;

      if (enableEmbed) {
        if (authorO) {
          eEmb.setAuthor({
            iconURL: (memberO ?? authorO).displayAvatarURL(imageOptions),
            name: memberO?.displayName ?? authorO.username,
          });
        }
        if (descriptionO) eEmb.setDescription(descriptionO);
        if (titleO) eEmb.setTitle(titleO);
        if (urlO) eEmb.setURL(urlO);
        if (footerO) eEmb.setFooter({ text: footerO });
        if (timestampO) eEmb.setTimestamp(Date.now());
        if (imageO) eEmb.setImage(imageO.url);
        if (thumbnailO) eEmb.setThumbnail(thumbnailO.url);

        eMsg.embeds = [eEmb];
      }

      if (channelO) {
        if (!channelO.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages)) {
          return interaction.editReply({
            embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.CANNOT_SEND_CHANNEL_MESSAGES'))],
          });
        }

        const msg = await channelO.send(eMsg);
        return interaction.editReply({
          embeds: [
            embed({ title: localize('ECHO.SENT'), type: 'success' })
              .setDescription(localize('ECHO.GO_TO', { msgURL: msg.url }))
              .addFields({
                name: localize('GENERIC.CHANNEL.CHANNEL'),
                value: `${channelO} - \`${channelO.id}\``,
              }),
          ],
        });
      }

      return interaction.editReply(eMsg);
    }
  }
}
