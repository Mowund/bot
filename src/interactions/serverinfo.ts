import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ApplicationCommandOptionType,
  BaseInteraction,
  ChannelType,
  PresenceUpdateStatus,
  StickerFormatType,
  ActivityType,
  PresenceStatus,
  GuildFeature,
  GuildSystemChannelFlags,
  ApplicationIntegrationType,
  InteractionContextType,
  Collection,
  Snowflake,
  GuildEmoji,
  GuildPreviewEmoji,
  SnowflakeUtil,
  MessageFlags,
} from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { imageOptions, premiumLimits } from '../defaults.js';
import { arrayMap, toUTS } from '../utils.js';

export default class Server extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'DESC.SERVERINFO',
        integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'CMD.SERVERINFO',
        options: [
          {
            description: 'SERVER.INFO.DESC.GUILD',
            name: 'CMD.GUILD',
            type: ApplicationCommandOptionType.String,
          },
        ],
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    const { embed, isEphemeral } = args,
      { client, localize } = args;

    if (interaction.isChatInputCommand()) {
      await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });
      const { options } = interaction,
        guildO = options.getString('guild'),
        global = await client.fetchGuildGlobally(guildO ?? interaction.guildId, true),
        { mergedGuild: guild } = global;

      if (!guild) {
        return interaction.editReply({
          embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.GUILD_NOT_FOUND'))],
        });
      }

      const emb = embed({ title: `${client.useEmoji('info')} ${localize('SERVER.INFO.TITLE')}` }).addFields({
          inline: true,
          name: `🪪 ${localize('ID')}`,
          value: `\`${guild.id}\``,
        }),
        premiumLimit = 'premiumTier' in guild ? premiumLimits[guild.premiumTier] : null,
        rows = [new ActionRowBuilder<ButtonBuilder>()];

      if ('icon' in guild && guild.icon) {
        const icon = client.rest.cdn.icon(guild.id, guild.icon, imageOptions);
        emb.setThumbnail(icon).setAuthor({ iconURL: icon, name: guild.name });
        rows[0].addComponents(
          new ButtonBuilder().setLabel(localize('ICON')).setEmoji('🖼️').setStyle(ButtonStyle.Link).setURL(icon),
        );
      } else {
        emb.setAuthor({ name: guild.name });
      }

      if ('ownerId' in guild) {
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('owner')} ${localize('OWNER.NOUN')}`,
          value: `<@${guild.ownerId}>`,
        });
      }

      emb.addFields({
        inline: true,
        name: `📅 ${localize('CREATED')}`,
        value: toUTS('createdTimestamp' in guild ? guild.createdTimestamp : SnowflakeUtil.timestampFrom(guild.id)),
      });

      if ('roles' in guild) {
        const roles = guild.roles.cache.filter(r => r.id !== guild.id);
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('role')} ${localize('ROLES.NOUN')} [${localize('COUNT', {
            count: roles.size,
          })} / ${localize('COUNT', { count: 250 })}]`,
          value: `${client.useEmoji('members')} ${localize('COUNTER.COMMON', {
            count: roles.filter(r => !r.tags?.botId && !r.tags?.integrationId).size,
          })}\n${client.useEmoji('bot')} ${localize('COUNTER.BOT', {
            count: roles.filter(r => r.tags?.botId).size,
          })}\n${client.useEmoji('cog')} ${localize('COUNTER.INTEGRATED', {
            count: roles.filter(r => r.tags?.integrationId).size,
          })}`,
        });
      }

      if ('emojis' in guild) {
        const emojiLimit =
            'premiumTier' in guild
              ? (guild.features as `${GuildFeature}`[] & string[]).includes('MORE_EMOJI') && guild.premiumTier < 3
                ? 200
                : premiumLimit.emojis
              : null,
          emojis = ('cache' in guild.emojis ? guild.emojis.cache : guild.emojis) as Collection<
            Snowflake,
            GuildEmoji | GuildPreviewEmoji
          >;

        emb.addFields({
          inline: true,
          name: `${client.useEmoji('emojiGhost')} ${localize('EMOJIS')} [${localize('COUNT', { count: emojis.size })}${emojiLimit ? ` / ${emojiLimit * 2}` : ''}]`,
          value:
            `- ${localize(`COUNTER.STATIC${emojiLimit ? '_RATIO' : ''}`, { count: emojis.filter(e => !e.animated && !e.managed).size, limit: emojiLimit })}\n` +
            `- ${localize(`COUNTER.ANIMATED${emojiLimit ? '_RATIO' : ''}`, { count: emojis.filter(e => e.animated && !e.managed).size, limit: emojiLimit })}\n` +
            `- ${localize('COUNTER.INTEGRATED', { count: emojis.filter(e => e.managed).size })}`,
        });
      }

      if ('stickers' in guild) {
        const stickers = 'cache' in guild.stickers ? guild.stickers.cache : guild.stickers;

        emb.addFields({
          inline: true,
          name: `${client.useEmoji('sticker')} ${localize('STICKERS')} [${localize('COUNT', { count: stickers.size })}${premiumLimit ? ` / ${premiumLimit.stickers}` : ''}]`,
          value: `- **${localize('COUNT', {
            count: stickers.filter(e => e.format === StickerFormatType.PNG).size,
          })}** PNG\n- **${localize('COUNT', {
            count: stickers.filter(e => e.format === StickerFormatType.APNG).size,
          })}** APNG\n- **${localize('COUNT', {
            count: stickers.filter(e => e.format === StickerFormatType.Lottie).size,
          })}** Lottie\n- **${localize('COUNT', {
            count: stickers.filter(e => e.format === StickerFormatType.GIF).size,
          })}** GIF`,
        });
      }

      {
        const memberCount =
            ('memberCount' in guild && guild.memberCount) ||
            global.invite?.memberCount ||
            ('approximateMemberCount' in guild && guild.approximateMemberCount),
          presenceCount =
            global.invite?.presenceCount ||
            ('presenceCount' in guild && guild.presenceCount) ||
            ('approximatePresenceCount' in guild && guild.approximatePresenceCount),
          onlineCount =
            'members' in guild && 'cache' in guild.members
              ? guild.members.cache.filter(
                  m =>
                    m.presence &&
                    !([PresenceUpdateStatus.Idle, PresenceUpdateStatus.DoNotDisturb] as PresenceStatus[]).includes(
                      m.presence.status,
                    ) &&
                    !m.presence.activities.some(a => a.type === ActivityType.Streaming),
                ).size
              : presenceCount;
        let value = `${client.useEmoji('statusOnline')} **${localize('COUNT', { count: onlineCount })}** ${localize('ONLINE')}`;

        if ('members' in guild && 'cache' in guild.members) {
          const idleCount = guild.members?.cache
              ? guild.members.cache.filter(m => m.presence?.status === PresenceUpdateStatus.Idle).size
              : 0,
            dndCount = guild.members?.cache
              ? guild.members.cache.filter(m => m.presence?.status === PresenceUpdateStatus.DoNotDisturb).size
              : 0,
            streamingCount = guild.members?.cache
              ? guild.members.cache.filter(m => m.presence?.activities.some(a => a.type === ActivityType.Streaming))
                  .size
              : 0;
          value += `\n${client.useEmoji('statusIdle')} **${localize('COUNT', { count: idleCount })}** ${localize('IDLE')}`;
          value += `\n${client.useEmoji('statusDND')} **${localize('COUNT', { count: dndCount })}** ${localize('DO_NOT_DISTURB')}`;
          value += `\n${client.useEmoji('statusStreaming')} **${localize('COUNT', { count: streamingCount })}** ${localize('STREAMING')}`;
        }

        if (memberCount)
          value += `\n${client.useEmoji('statusOffline')} **${localize('COUNT', { count: memberCount - presenceCount })}** ${localize('OFFLINE')}`;

        if ('maximumMembers' in guild)
          value += `\n- **${localize('COUNT', { count: guild.maximumMembers })}** ${localize('MAXIMUM')}`;

        const name = `${client.useEmoji('members')} ${localize('MEMBERS')}${memberCount ? ` [${localize('COUNT', { count: memberCount })}]` : ''}`;

        if ('members' in guild && 'cache' in guild.members) emb.addFields({ inline: true, name, value });
        else emb.spliceFields(2, 0, { inline: true, name, value });
      }

      if ('systemChannelFlags' in guild) {
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('systemMessage')} ${localize('SYSTEM_MESSAGES')}`,
          value: `${
            guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotifications)
              ? client.useEmoji('no')
              : client.useEmoji('check')
          } ${localize('JOIN_MESSAGES')}\n${
            guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotificationReplies)
              ? client.useEmoji('no')
              : client.useEmoji('check')
          } ${localize('WAVE_BUTTON')}\n${
            guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressPremiumSubscriptions)
              ? client.useEmoji('no')
              : client.useEmoji('check')
          } ${localize('BOOST_MESSAGES')}\n${
            guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressGuildReminderNotifications)
              ? client.useEmoji('no')
              : client.useEmoji('check')
          } ${localize('SETUP_TIPS')}\n${
            guild.systemChannel
              ? `${client.useEmoji('channelText')} ${guild.systemChannel}`
              : `${client.useEmoji('channelTextLocked')} **${localize('NO_CHANNEL')}**`
          }`,
        });
      }

      if ('fetchWebhooks' in guild) {
        const webhooks = await guild.fetchWebhooks();
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('webhook')} ${localize('WEBHOOKS')} [${localize('COUNT', {
            count: webhooks.size,
          })}]`,
          value: `${client.useEmoji('cog')} **${localize('COUNT', {
            count: webhooks.filter(e => e.isIncoming()).size,
          })}** ${localize('INCOMING')}\n${client.useEmoji('channelFollower')} ${localize('COUNTER.CHANNEL_FOLLOWER', {
            count: webhooks.filter(e => e.isChannelFollower()).size,
          })}\n${client.useEmoji('bot')} ${localize('COUNTER.APPLICATION', {
            count: webhooks.filter(e => e.isApplicationCreated()).size,
          })}`,
        });
      }

      const hasCommunity = 'rulesChannel' in guild && (guild.rulesChannel || guild.publicUpdatesChannel);
      if (hasCommunity) {
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('community')} ${localize('CHANNELS.COMMUNITY')}`,
          value: `${guild.rulesChannel ? `${client.useEmoji('rules')} ${guild.rulesChannel}\n` : ''}${
            guild.publicUpdatesChannel
              ? `${client.useEmoji('channelNewsLocked', 'publicUpdates')} ${guild.publicUpdatesChannel}\n`
              : ''
          }`,
        });
      }

      if ('bans' in guild) {
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('security')} ${localize('SECURITY')}`,
          value: `${`${client.useEmoji('banHammer')} ${localize('COUNTER.BAN', {
            count: guild.bans.cache.size,
          })}`}`,
        });
      }

      if ('fetchVanityData' in guild && guild.features.includes(GuildFeature.VanityURL)) {
        await guild.fetchVanityData();
        emb.addFields({
          inline: !hasCommunity,
          name: `🔗 ${localize('VANITY_URL')}`,
          value: `${`- **${localize('INVITE')}:** [\`${guild.vanityURLCode}\`](https://discord.gg/${
            guild.vanityURLCode
          })\n- ${localize('COUNTER.USES', { count: guild.vanityURLUses })}`}`,
        });
      }

      if ('channels' in guild && 'cache' in guild.channels) {
        emb.addFields({
          inline: false,
          name: `${client.useEmoji('browseChannels')} ${localize('CHANNELS.NOUN')} [${localize('COUNT', {
            count: guild.channels.cache.size,
          })} / ${localize('COUNT', {
            count: 1500,
          })}]`,
          value: `- ${client.useEmoji('browseChannels')} **[${localize('COUNT', {
            count: guild.channels.cache.filter(
              c =>
                ![ChannelType.AnnouncementThread, ChannelType.PrivateThread, ChannelType.PublicThread].includes(c.type),
            ).size,
          })} / ${localize('COUNT', {
            count: 500,
          })}]:** ${client.useEmoji('channelCategory')} ${localize('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size,
          })} | ${client.useEmoji('channelText')} ${localize('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size,
          })} | ${client.useEmoji('channelNews')} ${localize('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement).size,
          })} | ${client.useEmoji('channelVoice')} ${localize('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size,
          })} | ${client.useEmoji('channelStage')} ${localize('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size,
          })} | ${client.useEmoji('channelForum')} ${localize('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size,
          })} | ${client.useEmoji('channelMedia')} ${localize('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildMedia).size,
          })}\n- ${client.useEmoji('channelThread')} **[${localize('COUNT', {
            count: guild.channels.cache.filter(c =>
              [ChannelType.AnnouncementThread, ChannelType.PrivateThread, ChannelType.PublicThread].includes(c.type),
            ).size,
          })} / ${localize('COUNT', {
            count: 1000,
          })}]:** ${client.useEmoji('channelText', 'publicThread')} ${localize('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.PublicThread).size,
          })} | ${client.useEmoji('channelTextLocked', 'privateThread')} ${localize('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.PrivateThread).size,
          })} | ${client.useEmoji('channelNews', 'newsThread')} ${localize('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.AnnouncementThread).size,
          })}`,
        });
      }

      if ('features' in guild) {
        emb.addFields({
          inline: false,
          name: `⭐ ${localize('FEATURES')}`,
          value: arrayMap(guild.features, { mapFunction: a => `\`${a}\``, maxLength: 934 }),
        });
      }

      const badges = [];
      let description = '';

      if ('verified' in guild && guild.verified) badges.push(client.useEmoji('verified'));
      if ('partnered' in guild && guild.partnered) badges.push(client.useEmoji('partnered'));

      if ('description' in guild) {
        if (badges.length) description += `${badges.join(' ')}${guild.description ? '\n' : ''}`;
        if (guild.description) description += guild.description;

        if (description.length) emb.setDescription(description);
      }

      if (
        'icon' in guild &&
        guild.icon &&
        'banner' in guild &&
        guild.banner &&
        (guild.splash || ('discoverySplash' in guild && guild.discoverySplash))
      )
        rows.push(new ActionRowBuilder<ButtonBuilder>());

      if ('banner' in guild && guild.banner) {
        const banner = guild.bannerURL(imageOptions);
        emb.addFields({ name: `🖼️ ${localize('BANNER')}`, value: '\u200B' }).setImage(banner);
        rows[0].addComponents(
          new ButtonBuilder().setLabel(localize('BANNER')).setEmoji('🖼️').setStyle(ButtonStyle.Link).setURL(banner),
        );
      }

      if ('splash' in guild && guild.splash) {
        const splash = client.rest.cdn.splash(guild.id, guild.splash, imageOptions);
        rows
          .at(-1)
          .addComponents(
            new ButtonBuilder().setLabel(localize('SPLASH')).setEmoji('🖼️').setStyle(ButtonStyle.Link).setURL(splash),
          );
      }

      if ('discoverySplash' in guild && guild.discoverySplash) {
        const discoverySplash = client.rest.cdn.discoverySplash(guild.id, guild.discoverySplash, imageOptions);
        rows
          .at(-1)
          .addComponents(
            new ButtonBuilder()
              .setLabel(localize('DISCOVERY_SPLASH'))
              .setEmoji('🖼️')
              .setStyle(ButtonStyle.Link)
              .setURL(discoverySplash),
          );
      }

      if (!rows[0].components.length) rows.shift();

      return interaction.editReply({ components: rows, embeds: [emb] });
    }
  }
}
