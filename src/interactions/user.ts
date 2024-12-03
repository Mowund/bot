import util from 'node:util';
import {
  User as DiscordUser,
  UserFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  BaseInteraction,
  Colors,
  StringSelectMenuInteraction,
  StringSelectMenuBuilder,
  GuildMember,
  SnowflakeUtil,
  ApplicationFlagsBitField,
  ApplicationFlags,
  CommandInteractionOptionResolver,
  GuildMemberFlags,
  GuildMemberFlagsBitField,
  PermissionsBitField,
  APIInteractionGuildMember,
  ButtonComponent,
  PermissionFlagsBits,
  GuildTextBasedChannel,
  ApplicationIntegrationType,
  InteractionContextType,
  Snowflake,
  MessageFlags,
  ALLOWED_SIZES,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalMessageModalSubmitInteraction,
} from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { UserData, Warnings } from '../../lib/structures/UserData.js';
import { defaultLocale, imageOptions } from '../defaults.js';
import {
  toUTS,
  collMap,
  monthDiff,
  getFieldValue,
  appInvite,
  toUpperSnakeCase,
  arrayMap,
  isEmpty,
  compressJSON,
  decompressJSON,
  appFetch,
} from '../utils.js';
import { EmbeddedApplication, FullApplication } from '../../lib/interfaces/Application.js';
import { AppFlagEmoji, UserFlagEmoji } from '../../lib/App.js';
import { SearchedMember, JoinSourceType } from '../../lib/structures/MemberSearch.js';

export default class User extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'USER.INFO.VIEW_INFO',
        type: ApplicationCommandType.User,
      },
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'DESC.USER',
        integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'CMD.USER',
        options: [
          {
            description: 'DESC.USER_INFO',
            name: 'CMD.INFO',
            options: [
              {
                description: 'USER.INFO.DESC.USER',
                name: 'CMD.USER',
                type: ApplicationCommandOptionType.User,
              },
            ],
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            description: 'DESC.USER_SETTINGS',
            name: 'CMD.SETTINGS',
            type: ApplicationCommandOptionType.Subcommand,
          },
        ],
      },
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'DESC.APP',
        integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'CMD.APP',
        options: [
          {
            description: 'DESC.APP_INFO',
            name: 'CMD.INFO',
            options: [
              {
                description: 'APP.INFO.DESC.APP',
                max_length: 23,
                min_length: 17,
                name: 'CMD.APP',
                required: true,
                type: ApplicationCommandOptionType.String,
              },
            ],
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            description: 'DESC.APP_PERMISSIONS',
            name: 'CMD.PERMISSIONS',
            options: [
              {
                description: 'APP.INFO.DESC.APP',
                max_length: 23,
                min_length: 17,
                name: 'CMD.APP',
                required: true,
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
      { localize: __dl, supportedLocales } = client,
      { guild, guildId, user } = interaction;
    let { __, userData } = args;

    const settingsComponents = () => [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel(__('USER.SETTINGS.EPHEMERAL.EDIT'))
            .setEmoji('📝')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('user_settings_ephemeral'),
          new ButtonBuilder()
            .setLabel(__('USER.SETTINGS.LOCALE.EDIT'))
            .setEmoji('📝')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('user_settings_locale'),
          new ButtonBuilder()
            .setLabel(__('USER.SETTINGS.GAME.ICON.EDIT'))
            .setEmoji('🎮')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('user_settings_game_icon'),
        ),
      ],
      settingsFields = (data: UserData) => [
        {
          inline: true,
          name: `${__('LOCALE.EMOJI')} ${__('USER.SETTINGS.LOCALE.NAME')}`,
          value: __('LOCALE.NAME'),
        },
        data?.ephemeralResponses
          ? {
              inline: true,
              name: `${client.useEmoji('check')} ${__('USER.SETTINGS.EPHEMERAL.RESPONSES.NAME')}`,
              value: __('USER.SETTINGS.EPHEMERAL.RESPONSES.ENABLED'),
            }
          : {
              inline: true,
              name: `${client.useEmoji('no')} ${__('USER.SETTINGS.EPHEMERAL.RESPONSES.NAME')}`,
              value: __('USER.SETTINGS.EPHEMERAL.RESPONSES.DISABLED'),
            },
        data?.ignoreEphemeralRoles
          ? {
              inline: true,
              name: `${client.useEmoji('check')} ${__('USER.SETTINGS.EPHEMERAL.IGNORE_ROLES.NAME')}`,
              value: __('USER.SETTINGS.EPHEMERAL.IGNORE_ROLES.ENABLED'),
            }
          : {
              inline: true,
              name: `${client.useEmoji('no')} ${__('USER.SETTINGS.EPHEMERAL.IGNORE_ROLES.NAME')}`,
              value: __('USER.SETTINGS.EPHEMERAL.IGNORE_ROLES.DISABLED'),
            },
        {
          inline: true,
          name: `🎮 ${__('USER.SETTINGS.GAME.ICON.NAME')}`,
          value: data?.gameIcon || `**${__('NONE')}**`,
        },
      ],
      appInfoOpts = (app: FullApplication, embeddedApp: EmbeddedApplication, u: DiscordUser, sM: string | null) => {
        const flags = new ApplicationFlagsBitField(app.flags),
          iconURL = client.rest.cdn.appIcon(app.id, app.icon, imageOptions),
          emb = embed({
            addParams: sM ? { member: sM } : {},
            color: Colors.Blurple,
            title: `${client.useEmoji('info')} ${__('APP.INFO.TITLE')}`,
          })
            .setAuthor({ iconURL, name: app.name })
            .setThumbnail(iconURL)
            .addFields(
              { inline: true, name: `🪪 ${__('ID')}`, value: `\`${app.id}\`` },
              {
                inline: true,
                name: `📅 ${__('CREATED')}`,
                value: toUTS(SnowflakeUtil.timestampFrom(app.id)),
              },
              {
                inline: true,
                name: `🏷️ ${__('TAGS')}`,
                value: app.tags?.map((t: string) => `\`${t}\``).join(', ') || `**${__('NONE')}**`,
              },
              {
                inline: true,
                name: `${client.useEmoji('bot')} ${__('BOT.NOUN')}`,
                value: `${app.bot_public ? client.useEmoji('check') : client.useEmoji('no')} ${__('PUBLIC_BOT')}\n${
                  app.bot_require_code_grant ? client.useEmoji('check') : client.useEmoji('no')
                } ${__('REQUIRES_CODE_GRANT')}\n${
                  flags.has(ApplicationFlags.GatewayMessageContent)
                    ? client.useEmoji('check')
                    : flags.has(ApplicationFlags.GatewayMessageContentLimited)
                      ? client.useEmoji('maybe')
                      : client.useEmoji('no')
                } ${__('INTENT.MESSAGE_CONTENT')}\n${
                  flags.has(ApplicationFlags.GatewayGuildMembers)
                    ? client.useEmoji('check')
                    : flags.has(ApplicationFlags.GatewayGuildMembersLimited)
                      ? client.useEmoji('maybe')
                      : client.useEmoji('no')
                } ${__('INTENT.SERVER_MEMBERS')}\n${
                  flags.has(ApplicationFlags.GatewayPresence)
                    ? client.useEmoji('check')
                    : flags.has(ApplicationFlags.GatewayPresenceLimited)
                      ? client.useEmoji('maybe')
                      : client.useEmoji('no')
                } ${__('INTENT.PRESENCE')}`,
              },
            ),
          rows = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setLabel(__('PERMISSIONS'))
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('user_app_permissions')
                .setDisabled(!app.install_params),
              new ButtonBuilder()
                .setLabel(__('ADD_TO_SERVER'))
                .setEmoji(client.useEmoji('invite'))
                .setStyle(ButtonStyle.Link)
                .setURL(
                  app.custom_install_url ||
                    appInvite(app.id, {
                      permissions: app.install_params?.permissions as `${bigint}`,
                      scopes: app.install_params?.scopes,
                    }),
                )
                .setDisabled(!app.bot_public),
              new ButtonBuilder().setLabel(__('ICON')).setEmoji('🖼️').setStyle(ButtonStyle.Link).setURL(iconURL),
            ),
          ],
          emojiFlags = flags
            .toArray()
            .map(f => {
              const e = AppFlagEmoji[f] as AppFlagEmoji;
              return e && client.useEmoji(e);
            })
            .filter(v => v) as string[];

        if (u?.flags.has(UserFlags.BotHTTPInteractions))
          emojiFlags.unshift(client.useEmoji('slashCommand', 'botHTTPInteractions'));
        if (u?.system) {
          emojiFlags.unshift(
            client.useEmoji('official1') + client.useEmoji('official2') + client.useEmoji('official3'),
          );
        } else if (u?.bot) {
          if (u.flags.has(UserFlags.VerifiedBot))
            emojiFlags.unshift(client.useEmoji('verifiedApp1') + client.useEmoji('verifiedApp2'));
          else emojiFlags.unshift(client.useEmoji('app'));
        }

        let description = '';
        if (u) description += u.toString();
        if (emojiFlags.length) {
          if (description.length) description += ' ';
          description += emojiFlags.join(' ');
        }
        if (app.description) {
          if (description.length) description += '\n\n';
          description += app.description;
        }
        if (description.length) emb.setDescription(description);

        if (embeddedApp && flags.has(ApplicationFlags.Embedded)) {
          emb.addFields({
            inline: true,
            name: '📦 Embedded Application',
            value: `**Participants:** ${app.max_participants || 'Unlimited'}\n**Supported Platforms:** \`${embeddedApp.supported_platforms?.map(p => `\`${p}\``)}\`\n**Default Orientation:** \`${embeddedApp.default_orientation_lock_state}\``,
          });
        }

        if (app.privacy_policy_url || app.terms_of_service_url) rows.push(new ActionRowBuilder<ButtonBuilder>());
        if (app.privacy_policy_url) {
          rows[1].addComponents(
            new ButtonBuilder()
              .setLabel(__('PRIVACY_POLICY'))
              .setEmoji(client.useEmoji('privacySettings'))
              .setStyle(ButtonStyle.Link)
              .setURL(app.privacy_policy_url),
          );
        }
        if (app.terms_of_service_url) {
          rows[1].addComponents(
            new ButtonBuilder()
              .setLabel(__('TERMS_OF_SERVICE'))
              .setEmoji('📜')
              .setStyle(ButtonStyle.Link)
              .setURL(app.terms_of_service_url),
          );
        }

        return { embs: [emb], rows };
      },
      userInfoOpts = (u: DiscordUser, sM: string | null) => {
        const flags = u.system
          ? [client.useEmoji('official1') + client.useEmoji('official2') + client.useEmoji('official3')]
          : u.bot
            ? u.flags.has(UserFlags.VerifiedBot)
              ? [client.useEmoji('verifiedApp1') + client.useEmoji('verifiedApp2')]
              : [client.useEmoji('app')]
            : [];

        for (const f of u.flags.toArray()) {
          const e = UserFlagEmoji[f] as UserFlagEmoji;

          if (e) flags.push(client.useEmoji(e));
        }

        const emb = embed({
            addParams: sM ? { member: sM } : {},
            color: u.accentColor || Colors.Blurple,
            title: `${client.useEmoji('info')} ${__('USER.INFO.USER.TITLE')}`,
          })
            .setAuthor({
              iconURL: u.displayAvatarURL(imageOptions),
              name: u.discriminator === '0000' ? u.username : u.tag,
              url: `https://discord.com/users/${u.id}`,
            })
            .setThumbnail(u.displayAvatarURL(imageOptions))
            .setDescription(`${u} ${flags.join(' ')}`)
            .addFields(
              { inline: true, name: `🪪 ${__('ID')}`, value: `\`${u.id}\`` },
              { inline: true, name: `📅 ${__('CREATED')}`, value: toUTS(u.createdTimestamp) },
            ),
          row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel(__('AVATAR'))
              .setEmoji('🖼️')
              .setStyle(ButtonStyle.Link)
              .setURL(u.displayAvatarURL(imageOptions)),
          );

        if (u.banner) {
          const banner = u.bannerURL(imageOptions);
          emb.addFields({ name: `🖼️ ${__('BANNER')}`, value: '\u200B' }).setImage(banner);
          row.addComponents(
            new ButtonBuilder().setLabel(__('BANNER')).setEmoji('🖼️').setStyle(ButtonStyle.Link).setURL(banner),
          );
        }

        if (u.avatarDecorationData) {
          const decoration = u.avatarDecorationURL(imageOptions);
          row.addComponents(
            new ButtonBuilder().setLabel(__('DECORATION')).setEmoji('🖼️').setStyle(ButtonStyle.Link).setURL(decoration),
          );
        }

        return { embs: [emb], rows: [row] };
      },
      memberInfoOpts = async (m: GuildMember, s: SearchedMember, u: DiscordUser, sM?: string) => {
        client.log(util.inspect(m, { depth: null }));
        const mFlags = typeof m.flags === 'object' ? m.flags : new GuildMemberFlagsBitField(m.flags),
          flags = u?.bot
            ? u.flags.has(UserFlags.VerifiedBot)
              ? [client.useEmoji('verifiedApp1') + client.useEmoji('verifiedApp2')]
              : [client.useEmoji('app')]
            : [],
          rejoined = mFlags.has(GuildMemberFlags.DidRejoin),
          avatar = m.avatar
            ? client.rest.cdn.guildMemberAvatar(guildId, u.id, m.avatar, imageOptions)
            : u.displayAvatarURL(imageOptions),
          banner =
            m.banner &&
            (await appFetch(client.rest.cdn.guildMemberBanner(guildId, u.id, m.banner, { size: ALLOWED_SIZES[0] })))
              ? client.rest.cdn.guildMemberBanner(guildId, u.id, m.banner, imageOptions)
              : null;

        if (u.id === guild?.ownerId) flags.push(client.useEmoji('owner'));

        const premimSince = m.premiumSince ?? (m as any as APIInteractionGuildMember).premium_since;
        if (premimSince) {
          const pMonths = monthDiff(premimSince),
            months = [1, 2, 3, 6, 12, 15, 18, 24].find(mo => pMonths <= mo) || 24;

          flags.push(
            months === 1
              ? client.useEmoji('boosting1Month')
              : client.useEmoji(`boosting${months}Months`, `boosting${pMonths}Months`),
          );
        }

        if (!rejoined && Date.now() - m.joinedTimestamp < 1000 * 60 * 60 * 24 * 7)
          flags.push(client.useEmoji('newMember'));

        if (mFlags.has(GuildMemberFlags.CompletedOnboarding)) flags.push(client.useEmoji('completedOnboarding'));
        else if (mFlags.has(GuildMemberFlags.StartedOnboarding)) flags.push(client.useEmoji('startedOnboarding'));

        if (mFlags.has(1 << 6)) flags.push(client.useEmoji('completedGuideActions'));
        else if (mFlags.has(1 << 5)) flags.push(client.useEmoji('startedGuideActions'));

        if (mFlags.has(GuildMemberFlags.BypassesVerification)) flags.push(client.useEmoji('bypassedVerification'));

        if (mFlags.has(GuildMemberFlags.IsGuest)) flags.push(client.useEmoji('user', 'guest'));

        if (mFlags.has(GuildMemberFlags.DmSettingsUpsellAcknowledged))
          flags.push(client.useEmoji('settingsInfo', 'dmSettingsUpsellAcknowledged'));

        if (mFlags.has(GuildMemberFlags.AutomodQuarantinedUsernameOrGuildNickname))
          flags.push(client.useEmoji('automodded', 'quarantinedName'));

        if (s?.member.unusual_dm_activity_until > Date.now()) flags.push(client.useEmoji('suspiciousMessages'));
        if (u.flags.has(UserFlags.Spammer)) flags.push(client.useEmoji(UserFlagEmoji.Spammer));
        if (u.flags.has(UserFlags.Quarantined)) flags.push(client.useEmoji(UserFlagEmoji.Quarantined));

        if (s?.member.mute) flags.push(client.useEmoji('microphoneMutedGuild'));
        if (s?.member.deaf) flags.push(client.useEmoji('soundMutedGuild'));

        const addParams: Record<string, string> = {};
        if (typeof m.permissions !== 'object')
          addParams.permissions = (m as any as APIInteractionGuildMember).permissions;

        const emb = embed({
            addParams: sM ? { member: sM } : {},
            color: m.displayColor || u.accentColor || Colors.Blurple,
            title: `${client.useEmoji('info')} ${__('USER.INFO.MEMBER.TITLE')}`,
          })
            .setAuthor({
              iconURL: avatar,
              name: u.discriminator === '0000' ? u.username : u.tag,
              url: `https://discord.com/users/${u.id}`,
            })
            .setThumbnail(avatar)
            .setDescription(`${u} ${flags.join(' ')}`)
            .addFields(
              { inline: true, name: `🪪 ${__('ID')}`, value: `\`${u.id}\`` },
              {
                inline: true,
                name: `📅 ${__('CREATED')}`,
                value: toUTS(u.createdTimestamp),
              },
              {
                inline: true,
                name: m.pending
                  ? rejoined
                    ? `${client.useEmoji('pendingRejoin')} ${__('USER.INFO.MEMBER.REJOINED_PENDING')}`
                    : `${client.useEmoji('pendingJoin')} ${__('USER.INFO.MEMBER.JOINED_PENDING')}`
                  : rejoined
                    ? `${client.useEmoji('rejoin')} ${__('USER.INFO.MEMBER.REJOINED')}`
                    : `${client.useEmoji('join')} ${__('USER.INFO.MEMBER.JOINED')}`,
                value: toUTS(m.joinedTimestamp ?? Date.parse((m as any as APIInteractionGuildMember).joined_at)),
              },
            ),
          row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel(__('PERMISSIONS'))
              .setEmoji('🔒')
              .setStyle(ButtonStyle.Secondary)
              .setCustomId('user_member_permissions'),
            new ButtonBuilder().setLabel(__('AVATAR')).setEmoji('🖼️').setStyle(ButtonStyle.Link).setURL(avatar),
          ),
          mRoles = m.roles.cache?.filter(({ id }) => id !== guildId);

        client.log(typeof m.roles);
        const timeoutTimestamp =
          m.communicationDisabledUntilTimestamp ??
          Date.parse((m as any as APIInteractionGuildMember).communication_disabled_until);

        if (timeoutTimestamp > Date.now()) {
          emb.addFields({
            inline: true,
            name: `${client.useEmoji('timeout')} ${__('TIMEOUT_ENDS')}`,
            value: toUTS(timeoutTimestamp),
          });
        }

        if (s?.join_source_type) {
          let methodEmj = '';
          switch (s.join_source_type) {
            case JoinSourceType.BotInvite:
              methodEmj = `${client.useEmoji('bot')} `;
              break;
            case JoinSourceType.ServerDiscovery:
              methodEmj = `${client.useEmoji('discovery')} `;
              break;
            case JoinSourceType.StudentHub:
              methodEmj = `${client.useEmoji('studentHub')} `;
              break;
            case JoinSourceType.Invite:
            case JoinSourceType.VanityURL:
              methodEmj = `${client.useEmoji('link')} `;
              break;
            case JoinSourceType.ManualVerification:
              methodEmj = `${client.useEmoji('manualVerification')} `;
              break;
          }

          let value = `${methodEmj}${
            s.source_invite_code
              ? `[\`${s.source_invite_code}\`](https://discord.gg/${s.source_invite_code})`
              : `\`${__(`USER.INFO.MEMBER.JOIN_METHOD.${s.join_source_type}`)}\``
          }`;

          if (s.inviter_id) value += `\n${client.useEmoji('invite')} **${__('INVITED_BY')}:** <@${s.inviter_id}>`;

          emb.addFields({
            inline: true,
            name: `${client.useEmoji('joinMethod')} ${__('JOIN_METHOD')}`,
            value,
          });
        }

        if (mRoles?.size ?? (m as any as APIInteractionGuildMember).roles.length) {
          emb.addFields({
            name: `${client.useEmoji('role')} ${__('ROLES.NOUN')} [${__('COUNT', {
              count: mRoles?.size ?? (m as any as APIInteractionGuildMember).roles.length,
            })}]`,
            value: mRoles
              ? collMap(mRoles)
              : arrayMap((m as any as APIInteractionGuildMember).roles, { mapFunction: rI => `<@&${rI}>` }),
          });
        }

        if (banner) {
          emb.addFields({ name: `🖼️ ${__('BANNER')}`, value: '\u200B' }).setImage(banner);
          row.addComponents(
            new ButtonBuilder().setLabel(__('BANNER')).setEmoji('🖼️').setStyle(ButtonStyle.Link).setURL(banner),
          );
        }

        return { embs: [emb], rows: [row] };
      },
      appPermsOpts = (app: FullApplication, member: GuildMember, channel: GuildTextBasedChannel) => {
        if (!app.install_params) return { emb: embed({ type: 'error' }).setDescription(__('ERROR.NO_INSTALL_PARAMS')) };

        const iconURL = client.rest.cdn.appIcon(app.id, app.icon, imageOptions),
          installPerms = new PermissionsBitField(app.install_params.permissions as `${bigint}`),
          integratedPerms = guild?.roles.botRoleFor?.(client.user)?.permissions ?? null,
          overwrittenPerms = channel?.permissionsFor?.(client.user) ?? null,
          embs = [
            embed({
              title: `🔒 ${__('APP.PERMISSIONS.TITLE')}`,
            }).setAuthor({ iconURL, name: app.name }),
          ],
          rows =
            overwrittenPerms && member?.permissions.has?.(PermissionFlagsBits.ManageGuild)
              ? [
                  new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                      .setLabel(__('FIX_PERMISSIONS'))
                      .setEmoji('⚒️')
                      .setStyle(ButtonStyle.Link)
                      .setURL(
                        appInvite(client.user.id, {
                          disableGuildSelect: true,
                          guildId,
                          permissions: installPerms,
                          scopes: app.install_params.scopes,
                        }),
                      )
                      .setDisabled(
                        integratedPerms.has(PermissionFlagsBits.Administrator) ||
                          !installPerms.freeze().remove(integratedPerms || '0').bitfield,
                      ),
                  ),
                ]
              : [];

        {
          const descriptions = [''];
          let counter = 0;

          for (const iP of installPerms
            .toArray()
            .filter(iP2 => iP2 !== 'ManageEmojisAndStickers')
            .sort((a, b) => a.localeCompare(b))) {
            const text = `${
                integratedPerms || overwrittenPerms
                  ? integratedPerms?.has(iP)
                    ? client.useEmoji('check')
                    : overwrittenPerms?.has(iP)
                      ? client.useEmoji('maybe')
                      : client.useEmoji('no')
                  : client.useEmoji('neutral')
              } ${__(`PERM.${toUpperSnakeCase(iP)}`)}`,
              descLength = descriptions[counter].length;

            if ((descLength && descLength + 2) + text.length < 4096) {
              descriptions[counter] += descLength ? `\n${text}` : text;
            } else {
              embs[counter++].setTimestamp(null).data.footer = null;
              embs.push(embed());
              descriptions.push(text);
            }
          }

          descriptions.forEach((d, i) => embs[i].setDescription(d));

          embs.at(-1).addFields({
            name: `📍 ${__('LEGEND')}`,
            value: `${client.useEmoji('check')} ${__('APP.PERMISSIONS.LEGEND.CHECK')}\n${client.useEmoji(
              'maybe',
            )} ${__('APP.PERMISSIONS.LEGEND.MAYBE')}\n${client.useEmoji('no')} ${__(
              'APP.PERMISSIONS.LEGEND.NO',
            )}\n${client.useEmoji('neutral')} ${__('APP.PERMISSIONS.LEGEND.NEUTRAL')}`,
          });
        }

        return { embs, rows };
      },
      switchRow = (u: DiscordUser, m: GuildMember, disable: string, noApp: boolean, noMember = false) => {
        const row = new ActionRowBuilder<ButtonBuilder>();
        client.log(noMember);

        if (u.bot) {
          row.addComponents(
            new ButtonBuilder()
              .setLabel(__('APP.NOUN'))
              .setEmoji(client.useEmoji('bot'))
              .setStyle(noApp ? ButtonStyle.Danger : ButtonStyle.Primary)
              .setCustomId('user_app_info')
              .setDisabled(noApp || disable === 'user_app_info'),
          );
        }
        if (m || noMember) {
          row.addComponents(
            new ButtonBuilder()
              .setLabel(__('MEMBER'))
              .setEmoji(client.useEmoji('members'))
              .setStyle(noMember || (m && !m.user) ? ButtonStyle.Danger : ButtonStyle.Primary)
              .setCustomId('user_member_info')
              .setDisabled(noMember || disable === 'user_member_info'),
          );
        }
        if (m || noMember || u.bot) {
          row.addComponents(
            new ButtonBuilder()
              .setLabel(__('USER.NOUN'))
              .setEmoji(client.useEmoji('user'))
              .setStyle(ButtonStyle.Primary)
              .setCustomId('user_info')
              .setDisabled(disable === 'user_info'),
          );
        }

        return row;
      },
      // TODO: bots can't access embedded activity
      getFullApplication = async (id: Snowflake) => {
        const app = await client.rest.get(`/applications/${id}`).catch(e => {
            console.error(e);
            return null;
          }),
          rpc = await client.rest.get(`/applications/${id}/rpc`).catch(e => {
            console.error(e);
            return null;
          }),
          fullApp = (Object.assign(app || {}, rpc || {}) || {}) as FullApplication,
          embeddedApp = (await client.rest.get(`/applications/public?application_ids=${id}`).catch(e => {
            console.error(e);
            return null;
          })) as EmbeddedApplication;
        client.log(util.inspect(app, { colors: true, depth: null }));

        client.error(app);
        client.error(rpc);
        client.error(embeddedApp);

        return { app: isEmpty(fullApp) ? null : fullApp, embeddedApp };
      };

    if (
      (interaction.isChatInputCommand() &&
        [__dl('CMD.INFO'), __dl('CMD.PERMISSIONS')].includes(interaction.options.getSubcommand())) ||
      interaction.isUserContextMenuCommand()
    ) {
      const { channel, commandName, member, options } = interaction,
        appO = (options as CommandInteractionOptionResolver).getString?.(__dl('CMD.APP')),
        appId = appO?.match(/\d{17,20}/g)?.[0];

      client.log(appO, appId);
      if (appO && !appId) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(__('ERROR.INVALID.APP'))],
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });
      const userO = (await (appO
          ? client.users.fetch(appId, { force: true }).catch(() => null)
          : (options.getUser('user') ?? user).fetch(true))) as DiscordUser | null,
        memberO = userO.id === user.id ? member : options.getMember('user'),
        sM = memberO && !memberO.user ? compressJSON(memberO) : null,
        searchedMember = (
          memberO && !sM
            ? await client.memberSearch(guildId, { and_query: { user_id: { or_query: [userO.id] } } }).catch(() => null)
            : null
        )?.members[0] as SearchedMember,
        { app, embeddedApp } = await getFullApplication(appId || userO?.id);

      client.log(app);
      client.log(embeddedApp);

      if (appO && !app) {
        return interaction.editReply({
          embeds: [
            embed({ type: 'error' }).setDescription(
              __(userO ? (userO.bot ? 'ERROR.BOT_APP_NOT_FOUND' : 'ERROR.INVALID.APP') : 'ERROR.APP_NOT_FOUND'),
            ),
          ],
        });
      }

      const isPermsCmd =
          interaction.isChatInputCommand() && interaction.options.getSubcommand() === __dl('CMD.PERMISSIONS'),
        isUserInfoCmd = interaction.isChatInputCommand() && commandName === __dl('CMD.USER'),
        opts = isPermsCmd
          ? appPermsOpts(app, memberO, channel)
          : !isUserInfoCmd && app
            ? appInfoOpts(app, embeddedApp, userO, sM)
            : memberO
              ? await memberInfoOpts(memberO, searchedMember, userO, sM)
              : userInfoOpts(userO, sM),
        noApp = !app && userO?.bot;

      if (!isPermsCmd && (memberO || userO?.bot)) {
        opts.rows.unshift(
          switchRow(
            userO,
            memberO,
            !isUserInfoCmd && app ? 'user_app_info' : memberO ? 'user_member_info' : 'user_info',
            noApp,
          ),
        );
      }

      await interaction.editReply({
        components: opts.rows,
        embeds: opts.embs,
      });

      const suppressedWarnings = userData.suppressedWarnings ?? ({} as Record<Warnings, number>),
        warnings = [];
      if (!Object.hasOwn(suppressedWarnings, Warnings.BotAppNotFound) && noApp) warnings.push(Warnings.BotAppNotFound);
      if (!Object.hasOwn(suppressedWarnings, Warnings.InaccesibleMemberInfo) && memberO && !memberO.user)
        warnings.push(Warnings.InaccesibleMemberInfo);

      if (warnings.length) {
        await interaction.followUp({
          components:
            warnings.length === 1
              ? [
                  new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                      .setLabel(__('SUPPRESS_WARNING'))
                      .setEmoji('🔇')
                      .setStyle(ButtonStyle.Secondary)
                      .setCustomId('suppress-warning'),
                  ),
                ]
              : [],
          embeds: [
            embed({
              addParams:
                warnings.length === 1
                  ? {
                      warning: `${warnings[0]}`,
                    }
                  : {},
              type: 'warning',
            }).setDescription(
              __(
                `ERROR.${
                  warnings.includes(Warnings.BotAppNotFound)
                    ? warnings.includes(Warnings.InaccesibleMemberInfo)
                      ? 'INACCESSIBLE_APP_AND_MEMBER_INFO'
                      : 'BOT_APP_NOT_FOUND'
                    : 'INACCESSIBLE_MEMBER_INFO'
                }`,
              ),
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const { options } = interaction;

      switch (options.getSubcommand()) {
        case __dl('CMD.SETTINGS'): {
          return interaction.reply({
            components: settingsComponents(),
            embeds: [
              embed({ title: `${client.useEmoji('cog')} ${__('USER.SETTINGS.TITLE')}` }).addFields(
                settingsFields(userData),
              ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      const { channel, customId, member, message } = interaction,
        sameUser =
          (channel && message.reference ? await channel.messages.fetch(message.reference.messageId) : message)
            .interactionMetadata.user.id === user.id;

      if (!sameUser && customId.startsWith('user_settings')) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(__('ERROR.UNALLOWED.COMMAND'))],
          flags: MessageFlags.Ephemeral,
        });
      }

      switch (customId) {
        case 'user_app_info':
        case 'user_app_permissions':
        case 'user_member_info':
        case 'user_info': {
          const isPermsCmd = customId === 'user_app_permissions',
            isApp = customId.startsWith('user_app'),
            isMember = customId === 'user_member_info',
            userO = await client.users.fetch(getFieldValue(message.embeds[0], __('ID'))?.replaceAll('`', ''), {
              force: true,
            }),
            sM = new URLSearchParams(message.embeds.at(-1)?.footer?.iconURL).get('member'),
            memberO =
              userO.id === user.id ? member : guild?.members.cache.get(userO.id) || (sM ? decompressJSON(sM) : null),
            searchedMember = (
              memberO && !sM
                ? await client
                    .memberSearch(guildId, { and_query: { user_id: { or_query: [userO.id] } } })
                    .catch(() => null)
                : null
            )?.members[0] as SearchedMember,
            memberButtonBlocked =
              !sM &&
              (message.components[0].components as ButtonComponent[])?.find(c => c.customId === 'user_member_info')
                ?.style === ButtonStyle.Danger,
            noMember = isMember && !memberO,
            { app, embeddedApp } = await getFullApplication(userO.id),
            opts = isPermsCmd
              ? appPermsOpts(app, memberO, channel)
              : isApp && app
                ? appInfoOpts(app, embeddedApp, userO, sM)
                : isMember && memberO && !memberButtonBlocked
                  ? await memberInfoOpts(memberO, searchedMember, userO, sM)
                  : userInfoOpts(userO, sM);

          if (!isPermsCmd && (memberO || userO.bot || memberButtonBlocked || noMember)) {
            opts.rows.unshift(
              switchRow(
                userO,
                memberO,
                isApp ? 'user_app_info' : isMember && !noMember ? 'user_member_info' : 'user_info',
                !app && userO.bot,
                memberButtonBlocked || noMember,
              ),
            );
          }

          if (!isPermsCmd && sameUser) {
            await interaction.update({
              components: opts.rows,
              embeds: opts.embs,
            });
          } else {
            await interaction.reply({
              components: opts.rows,
              embeds: opts.embs,
              flags: MessageFlags.Ephemeral,
            });
          }
          if (noMember && !memberButtonBlocked) {
            await interaction.followUp({
              embeds: [embed({ type: 'error' }).setDescription(__('ERROR.NO_LONGER_MEMBER'))],
              flags: MessageFlags.Ephemeral,
            });
          }
          return;
        }
        case 'user_member_permissions': {
          const userO = await client.users.fetch(getFieldValue(message.embeds[0], __('ID'))?.replaceAll('`', ''), {
              force: true,
            }),
            sM = new URLSearchParams(message.embeds.at(-1)?.footer?.iconURL).get('member'),
            memberO =
              userO.id === user.id
                ? member
                : guild?.members.cache.get(userO.id) || (sM ? (decompressJSON(sM) as GuildMember) : null),
            { app } = await getFullApplication(userO.id);

          if (!memberO) {
            const opts = userInfoOpts(userO, null);

            opts.rows.unshift(switchRow(userO, memberO, 'user_info', !app && userO.bot, true));

            client.log(util.inspect(opts.rows, { depth: null }));

            if (sameUser) {
              await interaction.update({
                components: opts.rows,
                embeds: opts.embs,
              });
            } else {
              await interaction.reply({
                components: opts.rows,
                embeds: opts.embs,
                flags: MessageFlags.Ephemeral,
              });
            }

            return interaction.followUp({
              embeds: [embed({ type: 'error' }).setDescription(__('ERROR.NO_LONGER_MEMBER'))],
              flags: MessageFlags.Ephemeral,
            });
          }

          const avatar = memberO.avatar
              ? client.rest.cdn.guildMemberAvatar(guildId, userO.id, memberO.avatar, imageOptions)
              : userO.displayAvatarURL(imageOptions),
            emb = embed({
              color: memberO?.displayColor || userO.accentColor || Colors.Blurple,
              title: `🔒 ${__('PERMISSIONS')}`,
            })
              .setAuthor({
                iconURL: avatar,
                name: userO.discriminator === '0000' ? userO.username : userO.tag,
                url: `https://discord.com/users/${userO.id}`,
              })
              .setDescription(
                (memberO.permissions.bitfield
                  ? memberO.permissions
                  : new PermissionsBitField(BigInt(memberO.permissions as unknown as number))
                )
                  .toArray()
                  .filter(p => p !== 'ManageEmojisAndStickers')
                  .map(p => `\`${__(`PERM.${toUpperSnakeCase(p)}`)}\``)
                  .sort((a, b) => a.localeCompare(b))
                  .join(', ') || `**${__('NONE')}**`,
              );

          if (memberO?.guild) {
            emb.addFields(
              {
                inline: true,
                name: `${client.useEmoji('highestRole')} ${__('HIGHEST_ROLE')}`,
                value: memberO.roles.highest?.toString() || '@everyone',
              },
              {
                inline: true,
                name: `${client.useEmoji('hoistRole')} ${__('HOIST_ROLE')}`,
                value: memberO.roles.hoist?.toString() || '@everyone',
              },
              {
                inline: true,
                name: `${client.useEmoji('colorRole')} ${__('COLOR_ROLE')}`,
                value: memberO.roles.color?.toString() || '@everyone',
              },
            );
          }

          return interaction.reply({
            embeds: [emb],
            flags: MessageFlags.Ephemeral,
          });
        }
        case 'user_settings': {
          return interaction.update({
            components: settingsComponents(),
            embeds: [
              embed({ title: `${client.useEmoji('cog')} ${__('USER.SETTINGS.TITLE')}` }).addFields(
                settingsFields(userData),
              ),
            ],
          });
        }
        case 'user_settings_ephemeral_toggle':
        case 'user_settings_ephemeral_role_override': {
          if (customId === 'user_settings_ephemeral_toggle') {
            userData = await userData.set({
              [`$${userData.ephemeralResponses ? 'un' : ''}set`]: { ephemeralResponses: true },
            });
          } else {
            userData = await userData.set({
              [`$${userData.ignoreEphemeralRoles ? 'un' : ''}set`]: { ignoreEphemeralRoles: true },
            });
          }
        }
        // eslint-disable-next-line no-fallthrough
        case 'user_settings_ephemeral': {
          return interaction.update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(__('BACK'))
                  .setEmoji('↩️')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('user_settings'),
                userData.ephemeralResponses
                  ? new ButtonBuilder()
                      .setLabel(__('EPHEMERAL'))
                      .setEmoji('👁️')
                      .setStyle(ButtonStyle.Success)
                      .setCustomId('user_settings_ephemeral_toggle')
                  : new ButtonBuilder()
                      .setLabel(__('NOT_EPHEMERAL'))
                      .setEmoji('👁️')
                      .setStyle(ButtonStyle.Secondary)
                      .setCustomId('user_settings_ephemeral_toggle'),
                new ButtonBuilder()
                  .setLabel(__('USER.SETTINGS.EPHEMERAL.IGNORE_ROLES.NAME'))
                  .setEmoji(client.useEmoji('role'))
                  .setStyle(userData.ignoreEphemeralRoles ? ButtonStyle.Success : ButtonStyle.Secondary)
                  .setCustomId('user_settings_ephemeral_role_override')
                  .setDisabled(!!userData.ephemeralResponses),
              ),
            ],
            embeds: [
              embed(
                customId === 'user_settings_ephemeral'
                  ? {
                      color: Colors.Yellow,
                      localizer: __,
                      title: `${client.useEmoji('cog')} ${__('USER.SETTINGS.EPHEMERAL.EDITING')}`,
                    }
                  : {
                      color: Colors.Green,
                      localizer: __,
                      title: `${client.useEmoji('cog')} ${__('USER.SETTINGS.EPHEMERAL.EDITED')}`,
                    },
              ).addFields(settingsFields(userData)),
            ],
          });
        }
        case 'user_settings_locale_auto':
        case 'user_settings_locale_submit': {
          if (customId === 'user_settings_locale_auto') {
            userData = await userData.set(
              userData.locale
                ? { $unset: { locale: '' } }
                : {
                    $set: {
                      locale: supportedLocales.includes(interaction.locale) ? interaction.locale : defaultLocale,
                    },
                  },
            );
          } else {
            userData = await userData.set({
              $set: {
                locale: (interaction as StringSelectMenuInteraction).values[0],
              },
            });
          }
          __ = (phrase: string, replace?: Record<string, any>) =>
            __dl(
              {
                locale:
                  userData.locale ||
                  (supportedLocales.includes(interaction.locale) ? interaction.locale : defaultLocale),
                phrase,
              },
              replace,
            );
        }
        // eslint-disable-next-line no-fallthrough
        case 'user_settings_locale': {
          const selectMenu = new StringSelectMenuBuilder()
            .setPlaceholder(__('USER.SETTINGS.LOCALE.SELECT_PLACEHOLDER'))
            .setCustomId('user_settings_locale_submit');

          selectMenu.addOptions(
            supportedLocales
              .map((r: string) => ({
                default:
                  r ===
                  (userData.locale ||
                    (supportedLocales.includes(interaction.locale) ? interaction.locale : defaultLocale)),
                description: (r === defaultLocale ? `(${__('DEFAULT')}) ` : '') + r,
                emoji: __dl({ locale: r, phrase: 'LOCALE.EMOJI' }),
                label: __dl({ locale: r, phrase: 'LOCALE.NAME' }),
                value: r,
              }))
              .sort((a, b) => a.label.normalize().localeCompare(b.label.normalize())),
          );

          return interaction.update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(__('BACK'))
                  .setEmoji('↩️')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('user_settings'),
                new ButtonBuilder()
                  .setLabel(userData.locale ? __('NOT_AUTOMATIC') : __('AUTOMATIC'))
                  .setEmoji(client.useEmoji('bot'))
                  .setStyle(userData.locale ? ButtonStyle.Secondary : ButtonStyle.Success)
                  .setCustomId('user_settings_locale_auto'),
              ),
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
            ],
            embeds: [
              embed(
                customId === 'user_settings_locale_submit'
                  ? {
                      color: Colors.Green,
                      localizer: __,
                      title: `${client.useEmoji('cog')} ${__('USER.SETTINGS.LOCALE.EDITED')}`,
                    }
                  : {
                      color: Colors.Yellow,
                      localizer: __,
                      title: `${client.useEmoji('cog')} ${__('USER.SETTINGS.LOCALE.EDITING')}`,
                    },
              ).addFields(settingsFields(userData)),
            ],
          });
        }
        case 'user_settings_game_icon': {
          const modal = new ModalBuilder()
            .setCustomId('user_settings_game_icon_modal')
            .setTitle(__('USER.SETTINGS.GAME.ICON.EDITING'))
            .addComponents(
              new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                  .setCustomId('game_icon_input')
                  .setLabel(__('USER.SETTINGS.GAME.ICON.EDITING_LABEL'))
                  .setPlaceholder(userData?.gameIcon || __('USER.SETTINGS.GAME.ICON.INPUT_PLACEHOLDER'))
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false),
              ),
            );
          await interaction.showModal(modal);
        }
      }
    }

    if (interaction.isModalSubmit()) {
      const { channel, customId, message } = interaction,
        sameUser =
          (channel && message.reference ? await channel.messages.fetch(message.reference.messageId) : message)
            .interactionMetadata.user.id === user.id;

      if (!sameUser && customId.startsWith('user_settings')) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(__('ERROR.UNALLOWED.COMMAND'))],
          flags: MessageFlags.Ephemeral,
        });
      }

      switch (customId) {
        case 'user_settings_game_icon_modal': {
          const gameIcon = interaction.fields.getTextInputValue('game_icon_input');
          // Save the game icon to the database or user data
          userData = await userData.set({
            [`$${gameIcon ? '' : 'un'}set`]: { gameIcon },
          });
          await (interaction as ModalMessageModalSubmitInteraction).update({
            embeds: [
              embed({
                color: Colors.Green,
                localizer: __,
                title: `${client.useEmoji('cog')} ${__('USER.SETTINGS.GAME.ICON.EDITED')}`,
              }).addFields(settingsFields(userData)),
            ],
          });
        }
      }
    }
  }
}
