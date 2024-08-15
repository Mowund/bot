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
        description: 'DESC.ECHO',
        integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'CMD.ECHO',
        options: [
          {
            description: 'ECHO.DESC.CONTENT',
            name: 'CMD.CONTENT',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'ECHO.DESC.DESCRIPTION',
            name: 'CMD.DESCRIPTION',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'ECHO.DESC.TITLE',
            name: 'CMD.TITLE',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'ECHO.DESC.URL',
            name: 'CMD.URL',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'ECHO.DESC.COLOR',
            name: 'CMD.COLOR',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'ECHO.DESC.AUTHOR',
            name: 'CMD.AUTHOR',
            type: ApplicationCommandOptionType.User,
          },
          {
            description: 'ECHO.DESC.FOOTER',
            name: 'CMD.FOOTER',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'ECHO.DESC.TIMESTAMP',
            name: 'CMD.TIMESTAMP',
            type: ApplicationCommandOptionType.Boolean,
          },
          {
            description: 'ECHO.DESC.ATTACHMENT',
            name: 'CMD.ATTACHMENT',
            type: ApplicationCommandOptionType.Attachment,
          },
          {
            description: 'ECHO.DESC.IMAGE',
            name: 'CMD.IMAGE',
            type: ApplicationCommandOptionType.Attachment,
          },
          {
            description: 'ECHO.DESC.THUMBNAIL',
            name: 'CMD.THUMBNAIL',
            type: ApplicationCommandOptionType.Attachment,
          },
          {
            description: 'ECHO.DESC.TTS',
            name: 'CMD.TTS',
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
            description: 'ECHO.DESC.CHANNEL',
            name: 'CMD.CHANNEL',
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
        contentO = options
          .getString('content')
          ?.replaceAll('\\n', '\n')
          .replace(/<:(\w+):>/gi, (_, p1) => client.useEmoji(p1))
          .trim(),
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
                name: localize('CHANNEL.CHANNEL'),
                value: `${channelO} - \`${channelO.id}\``,
              }),
          ],
        });
      }

      return interaction.editReply(eMsg);
    }
  }
}
