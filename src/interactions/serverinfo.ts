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
      { __, client } = args,
      { __dl: __dl } = client;

    if (interaction.isChatInputCommand()) {
      await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });
      const { options } = interaction,
        guildO = options.getString(__dl('CMD.GUILD')),
        global = await client.fetchGuildGlobally(guildO ?? interaction.guildId, true),
        { mergedGuild: guild } = global;

      if (!guild) {
        return interaction.editReply({
          embeds: [embed({ type: 'error' }).setDescription(__('ERROR.GUILD_NOT_FOUND'))],
        });
      }

      const emb = embed({ title: `${client.useEmoji('info')} ${__('SERVER.INFO.TITLE')}` }).addFields({
          inline: true,
          name: `🪪 ${__('ID')}`,
          value: `\`${guild.id}\``,
        }),
        premiumLimit = 'premiumTier' in guild ? premiumLimits[guild.premiumTier] : null,
        rows = [new ActionRowBuilder<ButtonBuilder>()];

      if ('icon' in guild && guild.icon) {
        const icon = client.rest.cdn.icon(guild.id, guild.icon, imageOptions);
        emb.setThumbnail(icon).setAuthor({ iconURL: icon, name: guild.name });
        rows[0].addComponents(
          new ButtonBuilder().setLabel(__('ICON')).setEmoji('🖼️').setStyle(ButtonStyle.Link).setURL(icon),
        );
      } else {
        emb.setAuthor({ name: guild.name });
      }

      if ('ownerId' in guild) {
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('owner')} ${__('OWNER.NOUN')}`,
          value: `<@${guild.ownerId}>`,
        });
      }

      emb.addFields({
        inline: true,
        name: `📅 ${__('CREATED')}`,
        value: toUTS('createdTimestamp' in guild ? guild.createdTimestamp : SnowflakeUtil.timestampFrom(guild.id)),
      });

      if ('roles' in guild) {
        const roles = guild.roles.cache.filter(r => r.id !== guild.id);
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('role')} ${__('ROLES.NOUN')} [${__('COUNT', {
            count: roles.size,
          })} / ${__('COUNT', { count: 250 })}]`,
          value: `${client.useEmoji('members')} ${__('COUNTER.COMMON', {
            count: roles.filter(r => !r.tags?.botId && !r.tags?.integrationId).size,
          })}\n${client.useEmoji('bot')} ${__('COUNTER.BOT', {
            count: roles.filter(r => r.tags?.botId).size,
          })}\n${client.useEmoji('cog')} ${__('COUNTER.INTEGRATED', {
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
          name: `${client.useEmoji('emojiGhost')} ${__('EMOJIS')} [${__('COUNT', { count: emojis.size })}${emojiLimit ? ` / ${emojiLimit * 2}` : ''}]`,
          value:
            `- ${__(`COUNTER.STATIC${emojiLimit ? '_RATIO' : ''}`, { count: emojis.filter(e => !e.animated && !e.managed).size, limit: emojiLimit })}\n` +
            `- ${__(`COUNTER.ANIMATED${emojiLimit ? '_RATIO' : ''}`, { count: emojis.filter(e => e.animated && !e.managed).size, limit: emojiLimit })}\n` +
            `- ${__('COUNTER.INTEGRATED', { count: emojis.filter(e => e.managed).size })}`,
        });
      }

      if ('stickers' in guild) {
        const stickers = 'cache' in guild.stickers ? guild.stickers.cache : guild.stickers;

        emb.addFields({
          inline: true,
          name: `${client.useEmoji('sticker')} ${__('STICKERS')} [${__('COUNT', { count: stickers.size })}${premiumLimit ? ` / ${premiumLimit.stickers}` : ''}]`,
          value: `- **${__('COUNT', {
            count: stickers.filter(e => e.format === StickerFormatType.PNG).size,
          })}** PNG\n- **${__('COUNT', {
            count: stickers.filter(e => e.format === StickerFormatType.APNG).size,
          })}** APNG\n- **${__('COUNT', {
            count: stickers.filter(e => e.format === StickerFormatType.Lottie).size,
          })}** Lottie\n- **${__('COUNT', {
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
        let value = `${client.useEmoji('statusOnline')} **${__('COUNT', { count: onlineCount })}** ${__('ONLINE')}`;

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
          value += `\n${client.useEmoji('statusIdle')} **${__('COUNT', { count: idleCount })}** ${__('IDLE')}`;
          value += `\n${client.useEmoji('statusDND')} **${__('COUNT', { count: dndCount })}** ${__('DO_NOT_DISTURB')}`;
          value += `\n${client.useEmoji('statusStreaming')} **${__('COUNT', { count: streamingCount })}** ${__('STREAMING')}`;
        }

        if (memberCount)
          value += `\n${client.useEmoji('statusOffline')} **${__('COUNT', { count: memberCount - presenceCount })}** ${__('OFFLINE')}`;

        if ('maximumMembers' in guild)
          value += `\n- **${__('COUNT', { count: guild.maximumMembers })}** ${__('MAXIMUM')}`;

        const name = `${client.useEmoji('members')} ${__('MEMBERS')}${memberCount ? ` [${__('COUNT', { count: memberCount })}]` : ''}`;

        if ('members' in guild && 'cache' in guild.members) emb.addFields({ inline: true, name, value });
        else emb.spliceFields(2, 0, { inline: true, name, value });
      }

      if ('systemChannelFlags' in guild) {
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('systemMessage')} ${__('SYSTEM_MESSAGES')}`,
          value: `${
            guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotifications)
              ? client.useEmoji('no')
              : client.useEmoji('check')
          } ${__('JOIN_MESSAGES')}\n${
            guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotificationReplies)
              ? client.useEmoji('no')
              : client.useEmoji('check')
          } ${__('WAVE_BUTTON')}\n${
            guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressPremiumSubscriptions)
              ? client.useEmoji('no')
              : client.useEmoji('check')
          } ${__('BOOST_MESSAGES')}\n${
            guild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressGuildReminderNotifications)
              ? client.useEmoji('no')
              : client.useEmoji('check')
          } ${__('SETUP_TIPS')}\n${
            guild.systemChannel
              ? `${client.useEmoji('channelText')} ${guild.systemChannel}`
              : `${client.useEmoji('channelTextLocked')} **${__('NO_CHANNEL')}**`
          }`,
        });
      }

      if ('fetchWebhooks' in guild) {
        const webhooks = await guild.fetchWebhooks();
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('webhook')} ${__('WEBHOOKS')} [${__('COUNT', {
            count: webhooks.size,
          })}]`,
          value: `${client.useEmoji('cog')} **${__('COUNT', {
            count: webhooks.filter(e => e.isIncoming()).size,
          })}** ${__('INCOMING')}\n${client.useEmoji('channelFollower')} ${__('COUNTER.CHANNEL_FOLLOWER', {
            count: webhooks.filter(e => e.isChannelFollower()).size,
          })}\n${client.useEmoji('bot')} ${__('COUNTER.APPLICATION', {
            count: webhooks.filter(e => e.isApplicationCreated()).size,
          })}`,
        });
      }

      const hasCommunity = 'rulesChannel' in guild && (guild.rulesChannel || guild.publicUpdatesChannel);
      if (hasCommunity) {
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('community')} ${__('CHANNELS.COMMUNITY')}`,
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
          name: `${client.useEmoji('security')} ${__('SECURITY')}`,
          value: `${`${client.useEmoji('banHammer')} ${__('COUNTER.BAN', {
            count: guild.bans.cache.size,
          })}`}`,
        });
      }

      if ('fetchVanityData' in guild && guild.features.includes(GuildFeature.VanityURL)) {
        await guild.fetchVanityData();
        emb.addFields({
          inline: !hasCommunity,
          name: `🔗 ${__('VANITY_URL')}`,
          value: `${`- **${__('INVITE')}:** [\`${guild.vanityURLCode}\`](https://discord.gg/${
            guild.vanityURLCode
          })\n- ${__('COUNTER.USES', { count: guild.vanityURLUses })}`}`,
        });
      }

      if ('channels' in guild && 'cache' in guild.channels) {
        emb.addFields({
          inline: false,
          name: `${client.useEmoji('browseChannels')} ${__('CHANNELS.NOUN')} [${__('COUNT', {
            count: guild.channels.cache.size,
          })} / ${__('COUNT', {
            count: 1500,
          })}]`,
          value: `- ${client.useEmoji('browseChannels')} **[${__('COUNT', {
            count: guild.channels.cache.filter(
              c =>
                ![ChannelType.AnnouncementThread, ChannelType.PrivateThread, ChannelType.PublicThread].includes(c.type),
            ).size,
          })} / ${__('COUNT', {
            count: 500,
          })}]:** ${client.useEmoji('channelCategory')} ${__('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size,
          })} | ${client.useEmoji('channelText')} ${__('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size,
          })} | ${client.useEmoji('channelNews')} ${__('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement).size,
          })} | ${client.useEmoji('channelVoice')} ${__('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size,
          })} | ${client.useEmoji('channelStage')} ${__('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size,
          })} | ${client.useEmoji('channelForum')} ${__('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size,
          })} | ${client.useEmoji('channelMedia')} ${__('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.GuildMedia).size,
          })}\n- ${client.useEmoji('channelThread')} **[${__('COUNT', {
            count: guild.channels.cache.filter(c =>
              [ChannelType.AnnouncementThread, ChannelType.PrivateThread, ChannelType.PublicThread].includes(c.type),
            ).size,
          })} / ${__('COUNT', {
            count: 1000,
          })}]:** ${client.useEmoji('channelText', 'publicThread')} ${__('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.PublicThread).size,
          })} | ${client.useEmoji('channelTextLocked', 'privateThread')} ${__('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.PrivateThread).size,
          })} | ${client.useEmoji('channelNews', 'newsThread')} ${__('COUNT', {
            count: guild.channels.cache.filter(c => c.type === ChannelType.AnnouncementThread).size,
          })}`,
        });
      }

      if ('features' in guild) {
        emb.addFields({
          inline: false,
          name: `⭐ ${__('FEATURES')}`,
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
        emb.addFields({ name: `🖼️ ${__('BANNER')}`, value: '\u200B' }).setImage(banner);
        rows[0].addComponents(
          new ButtonBuilder().setLabel(__('BANNER')).setEmoji('🖼️').setStyle(ButtonStyle.Link).setURL(banner),
        );
      }

      if ('splash' in guild && guild.splash) {
        const splash = client.rest.cdn.splash(guild.id, guild.splash, imageOptions);
        rows
          .at(-1)
          .addComponents(
            new ButtonBuilder().setLabel(__('SPLASH')).setEmoji('🖼️').setStyle(ButtonStyle.Link).setURL(splash),
          );
      }

      if ('discoverySplash' in guild && guild.discoverySplash) {
        const discoverySplash = client.rest.cdn.discoverySplash(guild.id, guild.discoverySplash, imageOptions);
        rows
          .at(-1)
          .addComponents(
            new ButtonBuilder()
              .setLabel(__('DISCOVERY_SPLASH'))
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
