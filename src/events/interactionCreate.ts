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
  DiscordAPIError,
  DiscordjsError,
  EmbedBuilder,
  Events,
  InteractionContextType,
  InteractionReplyOptions,
  InteractionType,
  MessageComponentInteraction,
  MessageFlags,
  OAuth2Scopes,
  PermissionFlagsBits,
  PermissionsBitField,
  RepliableInteraction,
  RESTJSONErrorCodes,
} from 'discord.js';
import { Event } from '../../lib/structures/Event.js';
import { App, EmbedBuilderOptions } from '../../lib/App.js';
import { debugLevel, defaultLocale, imageOptions } from '../defaults.js';
import { appInvite, beforeMatch } from '../utils.js';
import { Warnings } from '../../lib/structures/UserData.js';

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
      isChatInput = interaction.isChatInputCommand(),
      integrationTypes = Object.keys(authorizingIntegrationOwners || {}).map(k =>
        parseInt(k),
      ) as ApplicationIntegrationType[],
      intName = beforeMatch(customId, '_') ?? commandName,
      command = client.commands.find(
        ({ options, structure }) =>
          structure.some(({ name }) => name === intName) || options?.redirectIds?.includes(intName),
      ),
      embColor =
        member?.displayColor ||
        (user.accentColor === undefined ? (await user.fetch(true)).accentColor : user.accentColor) ||
        Colors.Blurple,
      userData = await database.users.fetch(user.id);

    let { guild } = interaction;

    const __ = (phrase: string, replace?: Record<string, any>) =>
        client.__dl(
          {
            locale:
              userData.locale || (supportedLocales.includes(interaction.locale) ? interaction.locale : defaultLocale),
            phrase,
          },
          replace,
        ),
      __gl = (phrase: string, replace?: Record<string, any>) =>
        client.__dl(
          {
            locale:
              guild?.preferredLocale && supportedLocales.includes(guild?.preferredLocale)
                ? guild.preferredLocale
                : defaultLocale,
            phrase,
          },
          replace,
        );

    if (
      context === InteractionContextType.Guild &&
      integrationTypes.includes(ApplicationIntegrationType.GuildInstall)
    ) {
      if (!(guild ||= await client.guilds.fetch(guildId).catch(() => null))) {
        const isManager = (memberPermissions as PermissionsBitField).has(PermissionFlagsBits.ManageGuild);

        return (interaction as RepliableInteraction)
          .reply({
            components: isManager
              ? [
                  new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                      .setLabel(__('READD_TO_SERVER'))
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
                .setTitle(`❌ ${__('ERROR.NOUN')}`)
                .setDescription(__(`ERROR.NO_BOT_SCOPE.${isManager ? 'MANAGER' : 'MEMBER'}`)),
            ],
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }

      if (!guild.available) return;
    }

    const embed = (options: Omit<EmbedBuilderOptions, 'member' | 'user'> = {}): EmbedBuilder =>
      client.embedBuilder({
        ...options,
        avatar: member?.avatar && client.rest.cdn.guildMemberAvatar(guildId, user.id, member.avatar, imageOptions),
        color: options.color ?? embColor,
        localizer: options.localizer ?? __,
        member,
        user,
      });

    if (!command) {
      await client.reportError(new Error(`${customId ?? commandName} interaction not found as ${intName}`), {
        embed: { footer: 'requested', member, user },
      });
      return (interaction as RepliableInteraction)
        .reply({
          embeds: [embed({ type: 'error' }).setDescription(__('ERROR.NO_ASSOCIATED_SCRIPT'))],
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
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
      .run(
        { __, __gl, client, command, embed, guildData, intName, integrationTypes, isEphemeral, userData },
        interaction,
      )
      .catch(async (err: DiscordAPIError & (DiscordjsError | Error)) => {
        if (
          interaction.type === InteractionType.ApplicationCommandAutocomplete ||
          err.code === RESTJSONErrorCodes.UnknownInteraction
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
            isChatInput
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

        const eOpts: InteractionReplyOptions = {
          embeds: [
            embed({ type: 'error' }).setDescription(`${__('ERROR.EXECUTING_INTERACTION')}\n\`\`\`js\n${err}\`\`\``),
          ],
          flags: MessageFlags.Ephemeral,
        };
        return (interaction as RepliableInteraction).deferred || (interaction as RepliableInteraction).replied
          ? (interaction as RepliableInteraction).followUp(eOpts)
          : (interaction as RepliableInteraction).reply(eOpts);
      })
      .finally(async () => {
        if (interaction.isRepliable()) {
          if (
            userData.disabledDM &&
            !userData.hasSuppressedWarning(Warnings.CannotDM) &&
            ![client.__dl('CMD.REMINDER'), 'verify-dm'].includes(intName)
          ) {
            await userData.suppressWarning(Warnings.CannotDM, 12 * 60 * 60000);
            return interaction.followUp({
              components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                  new ButtonBuilder()
                    .setLabel(__('ADD_TO_ACCOUNT'))
                    .setEmoji(client.useEmoji('invite'))
                    .setStyle(ButtonStyle.Link)
                    .setURL(
                      appInvite(client.user.id, {
                        integrationType: ApplicationIntegrationType.UserInstall,
                        scopes: [OAuth2Scopes.ApplicationsCommands],
                      }),
                    )
                    .setDisabled(integrationTypes.includes(ApplicationIntegrationType.UserInstall)),
                  new ButtonBuilder()
                    .setLabel(__('VERIFY'))
                    .setEmoji('🔁')
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId('verify-dm'),
                ),
              ],
              embeds: [embed({ type: 'warning' }).setDescription(__('ERROR.CANNOT_DM'))],
              flags: MessageFlags.Ephemeral,
            });
          }
          if (debugLevel) {
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
        }
      });
  }
}
