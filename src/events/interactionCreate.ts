import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  BaseInteraction,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Colors,
  ComponentType,
  ContextMenuCommandInteraction,
  EmbedBuilder,
  Events,
  InteractionContextType,
  InteractionType,
  MessageComponentInteraction,
  PermissionFlagsBits,
  PermissionsBitField,
  RepliableInteraction,
  RESTJSONErrorCodes,
} from 'discord.js';
import { Event } from '../../lib/structures/Event.js';
import { App, EmbedBuilderOptions } from '../../lib/App.js';
import { debugLevel, defaultLocale, imageOptions } from '../defaults.js';
import { beforeMatch, appInvite } from '../utils.js';
import { UserDataSetOptions, Warnings } from '../../lib/structures/UserData.js';

export default class InteractionCreateEvent extends Event {
  constructor() {
    super(Events.InteractionCreate);
  }

  async run(client: App, interaction: BaseInteraction<'cached'>): Promise<any> {
    const { chalk, database, supportedLocales } = client,
      { channel, channelId, guildId, member, memberPermissions, type, user } = interaction,
      {
        authorizingIntegrationOwners,
        commandName,
        commandType,
        context,
        options: cmdOptions,
      } = interaction as ChatInputCommandInteraction,
      { componentType, customId } = interaction as MessageComponentInteraction,
      intName = beforeMatch(customId, '_') ?? commandName,
      command = client.commands.find(
        ({ options, structure }) =>
          structure.some(({ name }) => name === intName) || options?.redirectIds?.includes(intName),
      ),
      embColor =
        member?.displayColor ||
        (user.accentColor === undefined ? (await user.fetch(true)).accentColor : user.accentColor) ||
        Colors.Blurple;

    let { guild } = interaction,
      userData =
        (await database.users.fetch(user.id)) ||
        (await database.users.set(user.id, {
          locale: supportedLocales.includes(interaction.locale) ? interaction.locale : defaultLocale,
        }));

    {
      const expiredWarningSuppresions = Object.values(userData.suppressedWarnings ?? {}).some(v => Date.now() > v),
        noLocale =
          !customId?.startsWith('user_settings_locale_') &&
          (userData.autoLocale ?? true) &&
          userData.locale !== interaction.locale &&
          supportedLocales.includes(interaction.locale);

      if (expiredWarningSuppresions || noLocale) {
        const newUserData: UserDataSetOptions = {};

        if (expiredWarningSuppresions) {
          newUserData.suppressedWarnings = Object.fromEntries(
            Object.entries(userData.suppressedWarnings ?? {})
              .filter(([, v]) => Date.now() < v)
              .map(([k, v]) => [Warnings[k], v]),
          );
        }

        if (noLocale) {
          newUserData.autoLocale = true;
          newUserData.locale = interaction.locale;
        }

        userData = await userData.set(newUserData);
      }
    }

    const localize = (phrase: string, replace?: Record<string, any>) =>
      client.localize({ locale: userData.locale, phrase }, replace);

    if (
      context === InteractionContextType.Guild &&
      Object.keys(authorizingIntegrationOwners || {}).includes(`${ApplicationIntegrationType.GuildInstall}`)
    ) {
      if (!(guild ||= await client.guilds.fetch(guildId).catch(() => null))) {
        const isManager = (memberPermissions as PermissionsBitField).has(PermissionFlagsBits.ManageGuild);

        return (interaction as RepliableInteraction).reply({
          components: isManager
            ? [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                  new ButtonBuilder()
                    .setLabel(localize('READD_TO_SERVER'))
                    .setEmoji(client.discordEmoji)
                    .setStyle(ButtonStyle.Link)
                    .setURL(
                      appInvite(client.user.id, {
                        disableGuildSelect: true,
                        guildId,
                        permissions: client.application.installParams.permissions,
                        scopes: client.application.installParams.scopes,
                      }),
                    ),
                ),
              ]
            : [],
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Red)
              .setTitle(`❌ ${localize('ERROR.NOUN')}`)
              .setDescription(localize(`ERROR.NO_BOT_SCOPE.${isManager ? 'MANAGER' : 'MEMBER'}`)),
          ],
          ephemeral: true,
        });
      }

      if (!guild.available) return;
    }

    const embed = (options: Omit<EmbedBuilderOptions, 'member' | 'user'> = {}): EmbedBuilder =>
      client.embedBuilder({
        ...options,
        avatar: member?.avatar && client.rest.cdn.guildMemberAvatar(guildId, user.id, member.avatar, imageOptions),
        color: options.color ?? embColor,
        localizer: options.localizer ?? localize,
        member,
        user,
      });

    if (!command) {
      await client.reportError(new Error(`${customId ?? commandName} interaction not found as ${intName}`), {
        embed: { footer: 'requested', member, user },
      });
      return (interaction as RepliableInteraction).reply({
        embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.NO_ASSOCIATED_SCRIPT'))],
        ephemeral: true,
      });
    }

    const guildData = guildId && (await database.guilds.fetch(guildId)),
      nonEphChannelIds = guildData?.allowNonEphemeral?.channelIds,
      nonEphRoleIds = guildData?.allowNonEphemeral?.roleIds,
      isEphemeral =
        userData.ephemeralResponses ||
        (nonEphChannelIds &&
          !nonEphChannelIds.includes(channelId) &&
          (userData.ignoreEphemeralRoles || (nonEphRoleIds && !nonEphRoleIds.some(r => member?.roles.cache.has(r)))));

    return command
      .run({ client, embed, guildData, isEphemeral, localize, userData }, interaction)
      .catch(async err => {
        if (
          err.code === RESTJSONErrorCodes.UnknownInteraction ||
          interaction.type === InteractionType.ApplicationCommandAutocomplete
        )
          return;

        const options = (interaction as ChatInputCommandInteraction).options?.data.filter(
          o =>
            ![ApplicationCommandOptionType.Subcommand, ApplicationCommandOptionType.SubcommandGroup].includes(o.type),
        );
        await client.reportError(err, {
          consoleMessage: chalk.red('An error occured while running ') + chalk.yellow(`${customId || commandName}`),
          embed: { footer: 'requested', member, user },
          message: `An error occured while running ${
            interaction.isChatInputCommand()
              ? `</${commandName}${
                  cmdOptions.getSubcommandGroup(false)
                    ? ` ${cmdOptions.getSubcommandGroup(false)} ${cmdOptions.getSubcommand(false)}`
                    : cmdOptions.getSubcommand(false)
                      ? ` ${cmdOptions.getSubcommand(false)}`
                      : ''
                }:${interaction.commandId}>${options.length ? ` \`${options.map(o => `${o.name}:${o.value}`).join(' ')}\`` : ''}`
              : `\`${customId || (interaction as ContextMenuCommandInteraction).commandName}\``
          }`,
        });

        const eOpts = {
          embeds: [
            embed({ type: 'error' }).setDescription(
              `${localize('ERROR.EXECUTING_INTERACTION')}\n\`\`\`js\n${err}\`\`\``,
            ),
          ],
          ephemeral: true,
        };
        return (interaction as RepliableInteraction).deferred || (interaction as RepliableInteraction).replied
          ? (interaction as RepliableInteraction).followUp(eOpts)
          : (interaction as RepliableInteraction).reply(eOpts);
      })
      .finally(() => {
        if (debugLevel && interaction.type !== InteractionType.ApplicationCommandAutocomplete) {
          client.log(
            chalk.blue(user.tag) +
              chalk.gray(' (') +
              chalk.blue(user.id) +
              chalk.gray(') - ') +
              (guild
                ? chalk.cyan(guild.name) +
                  chalk.gray(' (') +
                  chalk.cyan(guildId) +
                  chalk.gray(') - ') +
                  chalk.green(`#${channel.name}`)
                : chalk.green('DM')) +
              chalk.gray(' (') +
              chalk.green(channelId) +
              chalk.gray('): ') +
              chalk.red(`${InteractionType[type]}`) +
              chalk.gray(':') +
              (commandType
                ? chalk.red(`${ApplicationCommandType[commandType]}`) + chalk.gray(':')
                : componentType
                  ? chalk.red(`${ComponentType[componentType]}`) + chalk.gray(':')
                  : '') +
              chalk.yellow(customId ?? commandName) +
              chalk.gray(':') +
              ((cmdOptions as any)?._group ? chalk.yellow((cmdOptions as any)?._group) + chalk.gray(':') : '') +
              ((cmdOptions as any)?._subcommand
                ? chalk.yellow((cmdOptions as any)?._subcommand) + chalk.gray(':')
                : '') +
              chalk.redBright(JSON.stringify(interaction, (_, v) => (typeof v === 'bigint' ? v.toString() : v))) +
              (cmdOptions ? chalk.gray(':') + JSON.stringify(cmdOptions) : ''),
          );
        }
      });
  }
}
