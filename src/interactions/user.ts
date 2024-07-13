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
} from 'discord.js';
import { parse, stringify } from 'zipson';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { UserData, Warnings } from '../../lib/structures/UserData.js';
import { defaultLocale, AppEmoji, UserFlagEmoji, imageOptions, AppFlagEmoji } from '../defaults.js';
import { toUTS, collMap, monthDiff, getFieldValue, appInvite, toUpperSnakeCase, arrayMap, isEmpty } from '../utils.js';
import { EmbeddedApplication, FullApplication } from '../../lib/interfaces/Application.js';

export default class User extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'USER.OPTIONS.INFO.VIEW_INFO',
        type: ApplicationCommandType.User,
      },
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'USER.DESCRIPTION',
        integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'USER.NAME',
        options: [
          {
            description: 'USER.OPTIONS.INFO.DESCRIPTION',
            name: 'USER.OPTIONS.INFO.NAME',
            options: [
              {
                description: 'USER.OPTIONS.INFO.OPTIONS.USER.DESCRIPTION',
                name: 'USER.OPTIONS.INFO.OPTIONS.USER.NAME',
                type: ApplicationCommandOptionType.User,
              },
            ],
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            description: 'USER.OPTIONS.SETTINGS.DESCRIPTION',
            name: 'USER.OPTIONS.SETTINGS.NAME',
            type: ApplicationCommandOptionType.Subcommand,
          },
        ],
      },
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'APP.DESCRIPTION',
        integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'APP.NAME',
        options: [
          {
            description: 'APP.OPTIONS.INFO.DESCRIPTION',
            name: 'APP.OPTIONS.INFO.NAME',
            options: [
              {
                description: 'APP.OPTIONS.INFO.OPTIONS.APP.DESCRIPTION',
                max_length: 23,
                min_length: 17,
                name: 'APP.OPTIONS.INFO.OPTIONS.APP.NAME',
                required: true,
                type: ApplicationCommandOptionType.String,
              },
            ],
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            description: 'APP.OPTIONS.PERMISSIONS.DESCRIPTION',
            name: 'APP.OPTIONS.PERMISSIONS.NAME',
            options: [
              {
                description: 'APP.OPTIONS.INFO.OPTIONS.APP.DESCRIPTION',
                max_length: 23,
                min_length: 17,
                name: 'APP.OPTIONS.INFO.OPTIONS.APP.NAME',
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
      { database, supportedLocales } = client,
      { guild, guildId, user } = interaction;
    let { localize, userData } = args;

    const settingsComponents = () => [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel(localize('USER.OPTIONS.SETTINGS.EPHEMERAL.EDIT'))
            .setEmoji('📝')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('user_settings_ephemeral'),
          new ButtonBuilder()
            .setLabel(localize('USER.OPTIONS.SETTINGS.LOCALE.EDIT'))
            .setEmoji('📝')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('user_settings_locale'),
        ),
      ],
      settingsFields = (data: UserData) => [
        {
          inline: true,
          name: `${localize('GENERIC.LOCALE.EMOJI')} ${localize('USER.OPTIONS.SETTINGS.LOCALE.NAME')}`,
          value: localize('GENERIC.LOCALE.NAME'),
        },
        data?.ephemeralResponses
          ? {
              inline: true,
              name: `${AppEmoji.check} ${localize('USER.OPTIONS.SETTINGS.EPHEMERAL.RESPONSES.NAME')}`,
              value: localize('USER.OPTIONS.SETTINGS.EPHEMERAL.RESPONSES.ENABLED'),
            }
          : {
              inline: true,
              name: `${AppEmoji.no} ${localize('USER.OPTIONS.SETTINGS.EPHEMERAL.RESPONSES.NAME')}`,
              value: localize('USER.OPTIONS.SETTINGS.EPHEMERAL.RESPONSES.DISABLED'),
            },
        data?.ignoreEphemeralRoles
          ? {
              inline: true,
              name: `${AppEmoji.check} ${localize('USER.OPTIONS.SETTINGS.EPHEMERAL.IGNORE_ROLES.NAME')}`,
              value: localize('USER.OPTIONS.SETTINGS.EPHEMERAL.IGNORE_ROLES.ENABLED'),
            }
          : {
              inline: true,
              name: `${AppEmoji.no} ${localize('USER.OPTIONS.SETTINGS.EPHEMERAL.IGNORE_ROLES.NAME')}`,
              value: localize('USER.OPTIONS.SETTINGS.EPHEMERAL.IGNORE_ROLES.DISABLED'),
            },
      ],
      appInfoOpts = (app: FullApplication, embeddedApp: EmbeddedApplication, sM: string | null) => {
        const flags = new ApplicationFlagsBitField(app.flags),
          iconURL = client.rest.cdn.appIcon(app.id, app.icon, imageOptions),
          emb = embed({
            addParams: sM ? { member: sM } : {},
            color: Colors.Blurple,
            title: `${AppEmoji.info} ${localize('APP.OPTIONS.INFO.TITLE')}`,
          })
            .setAuthor({ iconURL, name: app.name })
            .setThumbnail(iconURL)
            .addFields(
              { inline: true, name: `🪪 ${localize('GENERIC.ID')}`, value: `\`${app.id}\`` },
              {
                inline: true,
                name: `📅 ${localize('GENERIC.CREATED')}`,
                value: toUTS(SnowflakeUtil.timestampFrom(app.id)),
              },
              {
                inline: true,
                name: `🏷️ ${localize('GENERIC.TAGS')}`,
                value: app.tags?.map((t: string) => `\`${t}\``).join(', ') || localize('GENERIC.NONE'),
              },
              {
                inline: true,
                name: `${AppEmoji.integration} ${localize('GENERIC.BOT')}`,
                value: `${app.bot_public ? AppEmoji.check : AppEmoji.no} ${localize('GENERIC.PUBLIC_BOT')}\n${
                  app.bot_require_code_grant ? AppEmoji.check : AppEmoji.no
                } ${localize('GENERIC.REQUIRES_CODE_GRANT')}\n${
                  flags.has(ApplicationFlags.GatewayMessageContent)
                    ? AppEmoji.check
                    : flags.has(ApplicationFlags.GatewayMessageContentLimited)
                      ? AppEmoji.maybe
                      : AppEmoji.no
                } ${localize('GENERIC.INTENT.MESSAGE_CONTENT')}\n${
                  flags.has(ApplicationFlags.GatewayGuildMembers)
                    ? AppEmoji.check
                    : flags.has(ApplicationFlags.GatewayGuildMembersLimited)
                      ? AppEmoji.maybe
                      : AppEmoji.no
                } ${localize('GENERIC.INTENT.SERVER_MEMBERS')}\n${
                  flags.has(ApplicationFlags.GatewayPresence)
                    ? AppEmoji.check
                    : flags.has(ApplicationFlags.GatewayPresenceLimited)
                      ? AppEmoji.maybe
                      : AppEmoji.no
                } ${localize('GENERIC.INTENT.PRESENCE')}`,
              },
            ),
          rows = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setLabel(localize('GENERIC.PERMISSIONS'))
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('user_app_permissions')
                .setDisabled(!app.install_params),
              new ButtonBuilder()
                .setLabel(localize('GENERIC.ADD_TO_SERVER'))
                .setEmoji('🔗')
                .setStyle(ButtonStyle.Link)
                .setURL(
                  app.custom_install_url ||
                    appInvite(app.id, {
                      permissions: app.install_params?.permissions as `${bigint}`,
                      scopes: app.install_params?.scopes,
                    }),
                )
                .setDisabled(!app.bot_public),
              new ButtonBuilder()
                .setLabel(localize('GENERIC.ICON'))
                .setEmoji('🖼️')
                .setStyle(ButtonStyle.Link)
                .setURL(iconURL),
            ),
          ],
          descriptions = [],
          emojiFlags = flags
            .toArray()
            .map(f => AppFlagEmoji[f])
            .filter(v => v);

        if (emojiFlags.length) descriptions.push(emojiFlags.join(' '));
        if (app.description) descriptions.push(app.description);
        emb.setDescription(descriptions.join('\n'));

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
              .setLabel(localize('GENERIC.PRIVACY_POLICY'))
              .setEmoji(AppEmoji.privacySettings)
              .setStyle(ButtonStyle.Link)
              .setURL(app.privacy_policy_url),
          );
        }
        if (app.terms_of_service_url) {
          rows[1].addComponents(
            new ButtonBuilder()
              .setLabel(localize('GENERIC.TERMS_OF_SERVICE'))
              .setEmoji('📜')
              .setStyle(ButtonStyle.Link)
              .setURL(app.terms_of_service_url),
          );
        }

        return { emb, rows };
      },
      userInfoOpts = (u: DiscordUser, sM: string | null) => {
        const flags = u.system
          ? [AppEmoji.verifiedSystem]
          : u.bot
            ? u.flags.has(UserFlags.VerifiedBot)
              ? [AppEmoji.verifiedBot]
              : [AppEmoji.bot]
            : [];
        for (const flag of u.flags.toArray()) flags.push(UserFlagEmoji[flag]);

        const emb = embed({
            addParams: sM ? { member: sM } : {},
            color: u.accentColor || Colors.Blurple,
            title: `${AppEmoji.info} ${localize('USER.OPTIONS.INFO.USER.TITLE')}`,
          })
            .setAuthor({
              iconURL: u.displayAvatarURL(imageOptions),
              name: u.tag,
              url: `https://discord.com/users/${u.id}`,
            })
            .setThumbnail(u.displayAvatarURL(imageOptions))
            .setDescription(`${u} ${flags.join(' ')}`)
            .addFields(
              { inline: true, name: `🪪 ${localize('GENERIC.ID')}`, value: `\`${u.id}\`` },
              { inline: true, name: `📅 ${localize('GENERIC.CREATED')}`, value: toUTS(u.createdTimestamp) },
            ),
          row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel(localize('GENERIC.AVATAR'))
              .setEmoji('🖼️')
              .setStyle(ButtonStyle.Link)
              .setURL(u.displayAvatarURL(imageOptions)),
          );

        if (u.banner) {
          emb
            .addFields({ name: `🖼️ ${localize('GENERIC.BANNER')}`, value: '\u200B' })
            .setImage(u.bannerURL(imageOptions));
          row.addComponents(
            new ButtonBuilder()
              .setLabel(localize('GENERIC.BANNER'))
              .setEmoji('🖼️')
              .setStyle(ButtonStyle.Link)
              .setURL(u.bannerURL(imageOptions)),
          );
        }

        return { emb, rows: [row] };
      },
      memberInfoOpts = (m: GuildMember, u: DiscordUser) => {
        console.log(util.inspect(m, { depth: null }));
        const mFlags = typeof m.flags === 'object' ? m.flags : new GuildMemberFlagsBitField(m.flags),
          flags = u?.bot ? (u.flags.has(UserFlags.VerifiedBot) ? [AppEmoji.verifiedBot] : [AppEmoji.bot]) : [],
          rejoined = mFlags.has(GuildMemberFlags.DidRejoin),
          avatar = m.avatar
            ? client.rest.cdn.guildMemberAvatar(guildId, u.id, m.avatar, imageOptions)
            : u.displayAvatarURL(imageOptions),
          banner = client.rest.cdn.guildMemberBanner(guildId, u.id, m.banner, imageOptions);

        if (u.id === guild?.ownerId) flags.push(AppEmoji.serverOwner);

        const premimSince = m.premiumSince ?? (m as any as APIInteractionGuildMember).premium_since;
        if (premimSince) {
          const pMonths = monthDiff(premimSince);

          flags.push(
            pMonths <= 1
              ? AppEmoji.boosting1Month
              : pMonths === 2
                ? AppEmoji.boosting2Months
                : pMonths >= 3 && pMonths < 6
                  ? AppEmoji.boosting3Months
                  : pMonths >= 6 && pMonths < 12
                    ? AppEmoji.boosting6Months
                    : pMonths >= 12 && pMonths < 15
                      ? AppEmoji.boosting12Months
                      : pMonths >= 15 && pMonths < 18
                        ? AppEmoji.boosting15Months
                        : AppEmoji.boosting18Months,
          );
        }

        if (!rejoined && Date.now() - m.joinedTimestamp < 1000 * 60 * 60 * 24 * 7) flags.push(AppEmoji.newMember);

        if (mFlags.has(GuildMemberFlags.CompletedOnboarding)) flags.push(AppEmoji.completedOnboarding);
        else if (mFlags.has(GuildMemberFlags.StartedOnboarding)) flags.push(AppEmoji.startedOnboarding);

        if (mFlags.has(1 << 6)) flags.push(AppEmoji.completedHomeActions);
        else if (mFlags.has(1 << 5)) flags.push(AppEmoji.startedHomeActions);

        if (mFlags.has(GuildMemberFlags.BypassesVerification)) flags.push(AppEmoji.bypassedVerification);
        if (u.flags.has(UserFlags.Spammer)) flags.push(AppEmoji.likelySpammer);

        const addParams: Record<string, string> = {};
        if (typeof m.permissions !== 'object')
          addParams.permissions = (m as any as APIInteractionGuildMember).permissions;

        const emb = embed({
            addParams: !m.user ? { member: stringify(m) } : {},
            color: m.displayColor || u.accentColor || Colors.Blurple,
            title: `${AppEmoji.info} ${localize('USER.OPTIONS.INFO.MEMBER.TITLE')}`,
          })
            .setAuthor({
              iconURL: avatar,
              name: u.tag,
              url: `https://discord.com/users/${m.id}`,
            })
            .setThumbnail(avatar)
            .setDescription(`${u} ${flags.join(' ')}`)
            .addFields(
              { inline: true, name: `🪪 ${localize('GENERIC.ID')}`, value: `\`${u.id}\`` },
              {
                inline: true,
                name: `📅 ${localize('GENERIC.CREATED')}`,
                value: toUTS(u.createdTimestamp),
              },
              {
                inline: true,
                name: m.pending
                  ? rejoined
                    ? `${AppEmoji.pendingRejoin} ${localize('USER.OPTIONS.INFO.MEMBER.REJOINED_PENDING')}`
                    : `${AppEmoji.pendingJoin} ${localize('USER.OPTIONS.INFO.MEMBER.JOINED_PENDING')}`
                  : rejoined
                    ? `${AppEmoji.rejoin} ${localize('USER.OPTIONS.INFO.MEMBER.REJOINED')}`
                    : `${AppEmoji.join} ${localize('USER.OPTIONS.INFO.MEMBER.JOINED')}`,
                value: toUTS(m.joinedTimestamp ?? Date.parse((m as any as APIInteractionGuildMember).joined_at)),
              },
            ),
          row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel(localize('GENERIC.PERMISSIONS'))
              .setEmoji('🔒')
              .setStyle(ButtonStyle.Secondary)
              .setCustomId('user_member_permissions'),
            new ButtonBuilder()
              .setLabel(localize('GENERIC.AVATAR'))
              .setEmoji('🖼️')
              .setStyle(ButtonStyle.Link)
              .setURL(avatar),
          ),
          mRoles = m.roles.cache?.filter(({ id }) => id !== guildId);

        console.log(typeof m.roles);

        const timeoutTimestamp =
          m.communicationDisabledUntilTimestamp ??
          Date.parse((m as any as APIInteractionGuildMember).communication_disabled_until);

        if (timeoutTimestamp > Date.now()) {
          emb.spliceFields(3, 0, {
            inline: true,
            name: `${AppEmoji.timeout} ${localize('GENERIC.TIMEOUT_ENDS')}`,
            value: toUTS(timeoutTimestamp),
          });
        }

        if (mRoles?.size ?? (m as any as APIInteractionGuildMember).roles.length) {
          emb.addFields({
            name: `${AppEmoji.role} ${localize('GENERIC.ROLES.ROLES')} [${localize('GENERIC.COUNT', {
              count: mRoles?.size ?? (m as any as APIInteractionGuildMember).roles.length,
            })}]`,
            value: mRoles
              ? collMap(mRoles)
              : arrayMap((m as any as APIInteractionGuildMember).roles, { mapFunction: rI => `<@&${rI}>` }),
          });
        }

        if (banner) {
          emb.addFields({ name: `🖼️ ${localize('GENERIC.BANNER')}`, value: '\u200B' }).setImage(banner);
          row.addComponents(
            new ButtonBuilder()
              .setLabel(localize('GENERIC.BANNER'))
              .setEmoji('🖼️')
              .setStyle(ButtonStyle.Link)
              .setURL(banner),
          );
        }

        return { emb, rows: [row] };
      },
      appPermsOpts = (app: FullApplication, member: GuildMember, channel: GuildTextBasedChannel) => {
        if (!app.install_params)
          return { emb: embed({ type: 'error' }).setDescription(localize('ERROR.NO_INSTALL_PARAMS')) };

        const iconURL = client.rest.cdn.appIcon(app.id, app.icon, imageOptions),
          installPerms = new PermissionsBitField(app.install_params.permissions as `${bigint}`),
          integratedPerms = guild?.roles.botRoleFor?.(client.user)?.permissions ?? null,
          overwrittenPerms = channel?.permissionsFor?.(client.user) ?? null,
          emb = embed({
            title: `🔒 ${localize('APP.OPTIONS.PERMISSIONS.TITLE')}`,
          })
            .setAuthor({ iconURL, name: app.name })
            .setDescription(
              installPerms
                .toArray()
                .filter(p => p !== 'ManageEmojisAndStickers')
                .map(
                  p =>
                    `${
                      integratedPerms || overwrittenPerms
                        ? integratedPerms?.has(p)
                          ? AppEmoji.check
                          : overwrittenPerms?.has(p)
                            ? AppEmoji.maybe
                            : AppEmoji.no
                        : AppEmoji.neutral
                    } ${localize(`PERM.${toUpperSnakeCase(p)}`)}`,
                )
                .sort((a, b) => a.localeCompare(b))
                .join('\n'),
            )
            .addFields({
              name: `📍 ${localize('GENERIC.LEGEND')}`,
              value: `${AppEmoji.check} ${localize('APP.OPTIONS.PERMISSIONS.LEGEND.CHECK')}\n${
                AppEmoji.maybe
              } ${localize('APP.OPTIONS.PERMISSIONS.LEGEND.MAYBE')}\n${AppEmoji.no} ${localize(
                'APP.OPTIONS.PERMISSIONS.LEGEND.NO',
              )}\n${AppEmoji.neutral} ${localize('APP.OPTIONS.PERMISSIONS.LEGEND.NEUTRAL')}`,
            }),
          rows =
            overwrittenPerms && member?.permissions.has?.(PermissionFlagsBits.ManageGuild)
              ? [
                  new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                      .setLabel(localize('GENERIC.FIX_PERMISSIONS'))
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

        return { emb, rows };
      },
      switchRow = (u: DiscordUser, m: GuildMember, disable: string, noApp: boolean, noMember = false) => {
        const row = new ActionRowBuilder<ButtonBuilder>();
        console.log(noMember);

        if (u.bot) {
          row.addComponents(
            new ButtonBuilder()
              .setLabel(localize('GENERIC.APP'))
              .setEmoji(AppEmoji.integration)
              .setStyle(noApp ? ButtonStyle.Danger : ButtonStyle.Primary)
              .setCustomId('user_app_info')
              .setDisabled(noApp || disable === 'user_app_info'),
          );
        }
        if (m || noMember) {
          row.addComponents(
            new ButtonBuilder()
              .setLabel(localize('GENERIC.MEMBER'))
              .setEmoji(AppEmoji.members)
              .setStyle(noMember || (m && !m.user) ? ButtonStyle.Danger : ButtonStyle.Primary)
              .setCustomId('user_member_info')
              .setDisabled(noMember || disable === 'user_member_info'),
          );
        }
        if (m || noMember || u.bot) {
          row.addComponents(
            new ButtonBuilder()
              .setLabel(localize('GENERIC.USER'))
              .setEmoji(AppEmoji.user)
              .setStyle(ButtonStyle.Primary)
              .setCustomId('user_info')
              .setDisabled(disable === 'user_info'),
          );
        }

        return row;
      },
      // TODO: bots can't access embedded activity
      getFullApplication = async (id: Snowflake) => {
        const app = (Object.assign(
            (await client.rest.get(`/applications/${id}`).catch(() => {})) || {},
            await client.rest.get(`/applications/${id}/rpc`).catch(() => {}),
          ) || {}) as FullApplication,
          embeddedApp = (await client.rest
            .get(`/applications/public?application_ids=${id}`)
            .catch(() => {})) as EmbeddedApplication;
        console.log(util.inspect(app, { colors: true, depth: null }));

        return { app: isEmpty(app) ? null : app, embeddedApp: isEmpty(embeddedApp) ? null : embeddedApp };
      };

    if (
      (interaction.isChatInputCommand() && ['info', 'permissions'].includes(interaction.options.getSubcommand())) ||
      interaction.isUserContextMenuCommand()
    ) {
      const { channel, commandName, options } = interaction,
        appO = (options as CommandInteractionOptionResolver).getString?.('app'),
        appId = appO?.match(/\d{17,20}/g)?.[0];

      console.log(appO, appId);
      if (appO && !appId) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.INVALID.APP'))],
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: isEphemeral });
      const userO = (await (appO
          ? client.users.fetch(appId, { force: true }).catch(() => null)
          : (options.getUser('user') ?? user).fetch(true))) as DiscordUser | null,
        memberO = options.getMember('user') ?? guild?.members.cache.get(userO?.id),
        sM = memberO && !memberO.user ? stringify(memberO) : null,
        { app, embeddedApp } = await getFullApplication(appId || userO?.id);

      console.log(app);
      console.log(embeddedApp);

      if (appO && !app) {
        return interaction.editReply({
          embeds: [
            embed({ type: 'error' }).setDescription(
              localize(userO ? (userO.bot ? 'ERROR.BOT_APP_NOT_FOUND' : 'ERROR.INVALID.APP') : 'ERROR.APP_NOT_FOUND'),
            ),
          ],
        });
      }

      const isPermsCmd = interaction.isChatInputCommand() && interaction.options.getSubcommand() === 'permissions',
        isUserInfoCmd = interaction.isChatInputCommand() && commandName === 'user',
        opts = isPermsCmd
          ? appPermsOpts(app, memberO, channel)
          : !isUserInfoCmd && app
            ? appInfoOpts(app, embeddedApp, sM)
            : memberO
              ? memberInfoOpts(memberO, userO)
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
        embeds: [opts.emb],
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
                      .setLabel(localize('GENERIC.SUPPRESS_WARNING'))
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
                      warning: `${Warnings[warnings[0]]}`,
                    }
                  : {},
              type: 'warning',
            }).setDescription(
              localize(
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
          ephemeral: true,
        });
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const { options } = interaction;

      switch (options.getSubcommand()) {
        case 'settings': {
          return interaction.reply({
            components: settingsComponents(),
            embeds: [
              embed({ title: `⚙️ ${localize('USER.OPTIONS.SETTINGS.TITLE')}` }).addFields(settingsFields(userData)),
            ],
            ephemeral: true,
          });
        }
      }
    }

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      const { channel, customId, message } = interaction,
        sameUser =
          (channel && message.reference ? await channel.messages.fetch(message.reference.messageId) : message)
            .interactionMetadata.user.id === user.id;
      console.log(message.reference);
      console.log(message.interactionMetadata);

      if (!sameUser && customId.startsWith('user_settings')) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.UNALLOWED.COMMAND'))],
          ephemeral: true,
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
            userO = await client.users.fetch(
              getFieldValue(message.embeds[0], localize('GENERIC.ID'))?.replaceAll('`', ''),
              { force: true },
            ),
            sM = new URLSearchParams(message.embeds.at(-1)?.footer?.iconURL).get('member'),
            memberO = guild?.members.cache.get(userO.id) || (sM ? parse(sM) : null),
            memberButtonBlocked =
              !sM &&
              (message.components[0].components as ButtonComponent[])?.find(c => c.customId === 'user_member_info')
                ?.style === ButtonStyle.Danger,
            // TODO: check if member button is blurple instead, also fix it still disabling the user button
            noMember = isMember && !memberO,
            { app, embeddedApp } = await getFullApplication(userO.id),
            opts = isPermsCmd
              ? appPermsOpts(app, memberO, channel)
              : isApp && app
                ? appInfoOpts(app, embeddedApp, sM)
                : isMember && memberO && !memberButtonBlocked
                  ? memberInfoOpts(memberO, userO)
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
              embeds: [opts.emb],
            });
          } else {
            await interaction.reply({
              components: opts.rows,
              embeds: [opts.emb],
              ephemeral: true,
            });
          }
          if (noMember && !memberButtonBlocked) {
            await interaction.followUp({
              embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.NO_LONGER_MEMBER'))],
              ephemeral: true,
            });
          }
          return;
        }
        case 'user_member_permissions': {
          const userO = await client.users.fetch(
              getFieldValue(message.embeds[0], localize('GENERIC.ID'))?.replaceAll('`', ''),
              { force: true },
            ),
            sM = new URLSearchParams(message.embeds.at(-1)?.footer?.iconURL).get('member'),
            memberO = guild?.members.cache.get(userO.id) || (sM ? (parse(sM) as GuildMember) : null),
            { app } = await getFullApplication(userO.id);

          if (!memberO) {
            const opts = userInfoOpts(userO, null);

            opts.rows.unshift(switchRow(userO, memberO, 'user_info', !app && userO.bot, true));

            console.log(util.inspect(opts.rows, { depth: null }));

            if (sameUser) {
              await interaction.update({
                components: opts.rows,
                embeds: [opts.emb],
              });
            } else {
              await interaction.reply({
                components: opts.rows,
                embeds: [opts.emb],
                ephemeral: true,
              });
            }

            return interaction.followUp({
              embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.NO_LONGER_MEMBER'))],
              ephemeral: true,
            });
          }

          const emb = embed({
            color: memberO?.displayColor || userO.accentColor || Colors.Blurple,
            title: `🔒 ${localize('GENERIC.PERMISSIONS')}`,
          }).setDescription(
            (memberO.permissions.bitfield
              ? memberO.permissions
              : new PermissionsBitField(BigInt(memberO.permissions as unknown as number))
            )
              .toArray()
              .filter(p => p !== 'ManageEmojisAndStickers')
              .map(p => `\`${localize(`PERM.${toUpperSnakeCase(p)}`)}\``)
              .sort((a, b) => a.localeCompare(b))
              .join(', ') || `**${localize('GENERIC.NONE')}**`,
          );

          if (memberO?.guild) {
            emb.addFields(
              {
                inline: true,
                name: `${AppEmoji.highestRole} ${localize('GENERIC.HIGHEST_ROLE')}`,
                value: memberO.roles.highest?.toString() || '@everyone',
              },
              {
                inline: true,
                name: `${AppEmoji.hoistRole} ${localize('GENERIC.HOIST_ROLE')}`,
                value: memberO.roles.hoist?.toString() || '@everyone',
              },
              {
                inline: true,
                name: `${AppEmoji.colorRole} ${localize('GENERIC.COLOR_ROLE')}`,
                value: memberO.roles.color?.toString() || '@everyone',
              },
            );
          }

          return interaction.reply({
            embeds: [emb],
            ephemeral: true,
          });
        }
        case 'user_settings': {
          return interaction.update({
            components: settingsComponents(),
            embeds: [
              embed({ title: `⚙️ ${localize('USER.OPTIONS.SETTINGS.TITLE')}` }).addFields(settingsFields(userData)),
            ],
          });
        }
        case 'user_settings_ephemeral_toggle':
        case 'user_settings_ephemeral_role_override': {
          userData = await database.users.set(
            user.id,
            customId === 'user_settings_ephemeral_toggle'
              ? { ephemeralResponses: !userData.ephemeralResponses }
              : { ignoreEphemeralRoles: !userData.ignoreEphemeralRoles },
          );
        }
        // eslint-disable-next-line no-fallthrough
        case 'user_settings_ephemeral': {
          return interaction.update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.BACK'))
                  .setEmoji('↩️')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('user_settings'),
                userData?.ephemeralResponses
                  ? new ButtonBuilder()
                      .setLabel(localize('GENERIC.EPHEMERAL'))
                      .setEmoji('👁️')
                      .setStyle(ButtonStyle.Success)
                      .setCustomId('user_settings_ephemeral_toggle')
                  : new ButtonBuilder()
                      .setLabel(localize('GENERIC.NOT_EPHEMERAL'))
                      .setEmoji('👁️')
                      .setStyle(ButtonStyle.Secondary)
                      .setCustomId('user_settings_ephemeral_toggle'),
                userData?.ignoreEphemeralRoles
                  ? new ButtonBuilder()
                      .setLabel(localize('USER.OPTIONS.SETTINGS.EPHEMERAL.IGNORE_ROLES.NAME'))
                      .setEmoji(AppEmoji.role)
                      .setStyle(ButtonStyle.Success)
                      .setCustomId('user_settings_ephemeral_role_override')
                      .setDisabled(userData?.ephemeralResponses)
                  : new ButtonBuilder()
                      .setLabel(localize('USER.OPTIONS.SETTINGS.EPHEMERAL.IGNORE_ROLES.NAME'))
                      .setEmoji(AppEmoji.role)
                      .setStyle(ButtonStyle.Secondary)
                      .setDisabled(userData?.ephemeralResponses)
                      .setCustomId('user_settings_ephemeral_role_override'),
              ),
            ],
            embeds: [
              embed(
                customId === 'user_settings_ephemeral'
                  ? {
                      color: Colors.Yellow,
                      localizer: localize,
                      title: `⚙️ ${localize('USER.OPTIONS.SETTINGS.EPHEMERAL.EDITING')}`,
                    }
                  : {
                      color: Colors.Green,
                      localizer: localize,
                      title: `⚙️ ${localize('USER.OPTIONS.SETTINGS.EPHEMERAL.EDITED')}`,
                    },
              ).addFields(settingsFields(userData)),
            ],
          });
        }
        case 'user_settings_locale_auto':
        case 'user_settings_locale_submit': {
          if (customId === 'user_settings_locale_auto') {
            userData = await database.users.set(user.id, {
              autoLocale: !userData.autoLocale,
              locale:
                (!userData.autoLocale && supportedLocales.includes(interaction.locale) && interaction.locale) ||
                userData.locale,
            });
          } else {
            userData = await database.users.set(user.id, {
              autoLocale: false,
              locale: (interaction as StringSelectMenuInteraction).values[0],
            });
          }
          localize = (phrase: string, replace?: Record<string, any>) =>
            client.localize({ locale: userData.locale, phrase }, replace);
        }
        // eslint-disable-next-line no-fallthrough
        case 'user_settings_locale': {
          const selectMenu = new StringSelectMenuBuilder()
            .setPlaceholder(localize('USER.OPTIONS.SETTINGS.LOCALE.SELECT_PLACEHOLDER'))
            .setCustomId('user_settings_locale_submit');

          selectMenu.addOptions(
            supportedLocales
              .map((r: string) => ({
                default: r === userData.locale,
                description: (r === defaultLocale ? `(${localize('GENERIC.DEFAULT')}) ` : '') + r,
                emoji: client.localize({ locale: r, phrase: 'GENERIC.LOCALE.EMOJI' }),
                label: client.localize({ locale: r, phrase: 'GENERIC.LOCALE.NAME' }),
                value: r,
              }))
              .sort((a, b) => a.label.normalize().localeCompare(b.label.normalize())),
          );

          return interaction.update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.BACK'))
                  .setEmoji('↩️')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('user_settings'),
                new ButtonBuilder()
                  .setLabel(userData.autoLocale ? localize('GENERIC.AUTOMATIC') : localize('GENERIC.NOT_AUTOMATIC'))
                  .setEmoji(AppEmoji.integration)
                  .setStyle(userData.autoLocale ? ButtonStyle.Success : ButtonStyle.Secondary)
                  .setCustomId('user_settings_locale_auto'),
              ),
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
            ],
            embeds: [
              embed(
                customId === 'user_settings_locale_submit'
                  ? {
                      color: Colors.Green,
                      localizer: localize,
                      title: `⚙️ ${localize('USER.OPTIONS.SETTINGS.LOCALE.EDITED')}`,
                    }
                  : {
                      color: Colors.Yellow,
                      localizer: localize,
                      title: `⚙️ ${localize('USER.OPTIONS.SETTINGS.LOCALE.EDITING')}`,
                    },
              ).addFields(settingsFields(userData)),
            ],
          });
        }
      }
    }
  }
}
