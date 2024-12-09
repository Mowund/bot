import process from 'node:process';
import { Buffer } from 'node:buffer';
import util from 'node:util';
import { Octokit } from '@octokit/core';
import {
  APIInteractionGuildMember,
  ApplicationCommand,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationEmoji,
  Client,
  ClientOptions,
  Collection,
  ColorResolvable,
  Colors,
  EmbedBuilder,
  formatEmoji,
  Guild,
  GuildMember,
  GuildPreview,
  GuildTemplate,
  GuildTemplateResolvable,
  Invite,
  InviteGuild,
  InviteResolvable,
  Routes,
  Snowflake,
  SnowflakeUtil,
  User,
  Widget,
} from 'discord.js';
import i18n, { GlobalCatalog, I18n } from 'i18n';
import { Chalk, ChalkInstance } from 'chalk';
import { MongoClient } from 'mongodb';
import { defaultLocale, imageOptions, supportServer } from '../src/defaults.js';
import { addSearchParams, isEmpty, Overwrite, truncate } from '../src/utils.js';
import { Command } from './structures/Command.js';
import { DatabaseManager } from './managers/DatabaseManager.js';
import { Experiment } from './interfaces/Experiment.js';
import { MemberSearchQuery, MemberSearch } from './structures/MemberSearch.js';

export class App extends Client<true> {
  allShardsReady: boolean;
  chalk: ChalkInstance;
  commands: Collection<string, Command>;
  database: DatabaseManager;
  experiments: { data: Experiment[]; lastUpdated: number };
  globalCommandCount: { chatInput: number; message: number; sum: { all: number; contextMenu: number }; user: number };
  i18n: I18n;
  mongo: MongoClient;
  octokit: Octokit;
  supportedLocales: string[];
  isMainShard: boolean;
  shardId: number;

  constructor(options: ClientOptions) {
    super(options);

    this.allShardsReady = false;
    this.chalk = new Chalk({ level: 3 });
    this.commands = new Collection();
    this.database = new DatabaseManager(this);
    this.i18n = i18n;
    this.mongo = new MongoClient(process.env.MONGO_URI!, {
      pkFactory: { createPk: () => SnowflakeUtil.generate().toString() },
    });
  }

  async login(token?: string) {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    await this.updateLocalizations();

    return super.login(token);
  }

  async memberSearch(guildId: Snowflake, query: MemberSearchQuery) {
    const result = (await this.rest.post(`/guilds/${guildId}/members-search`, {
      body: query,
    })) as MemberSearch;
    return result;
  }

  useEmoji<N extends string, C extends string = ''>(name: N, customName?: C) {
    const emoji = (this.application.emojis.cache.find(e => e.name === name) ||
      this.application.emojis.cache.find(e => e.name === 'missing')) as Overwrite<
      ApplicationEmoji,
      {
        name: C extends '' ? N : C;
      }
    >;
    if (!emoji) return '🚫';
    if (emoji.name !== name) return formatEmoji({ ...emoji, name });
    if (customName) return formatEmoji({ ...emoji, name: customName as typeof emoji.name });
    return formatEmoji(emoji);
  }

  get discordEmoji() {
    return this.useEmoji(new Date().getMonth() === 9 ? 'discordHalloween' : 'discord');
  }

  __dl = (phraseOrOptions: string | i18n.TranslateOptions, replace?: Record<string, any>) =>
    replace ? i18n.__mf(phraseOrOptions, replace) : i18n.__(phraseOrOptions);

  __obj(object: Record<string, any>, key: string) {
    object[`${key}Localizations`] ??= {};

    for (const locale of this.supportedLocales.filter((l: string) => l !== defaultLocale))
      object[`${key}Localizations`][locale] = this.__dl({ locale, phrase: object[key] });

    object[key] = this.__dl({ locale: defaultLocale, phrase: object[key] });
  }

  __data(data: Record<string, any>) {
    if ('name' in data) this.__obj(data, 'name');
    if ('description' in data) this.__obj(data, 'description');
    if ('options' in data) for (const opt of data.options) this.__data(opt);
    if ('choices' in data) for (const ch of data.choices) this.__data(ch);
  }

  async fetchGuildGlobally<I extends boolean = false>(
    guildOrInvite: Snowflake | InviteResolvable | GuildTemplateResolvable,
    _intersectMergedTyping?: I,
  ) {
    const results: {
      guild: Guild;
      invite: Invite;
      mergedGuild: I extends true
        ? Guild | InviteGuild | GuildPreview | Widget
        : Guild & InviteGuild & GuildPreview & Widget;
      preview: GuildPreview;
      template: GuildTemplate;
      widget: Widget;
    } = {
      guild: null,
      invite: null,
      mergedGuild: null,
      preview: null,
      template: null,
      widget: null,
    };

    results.template = await this.fetchGuildTemplate(guildOrInvite).catch(() => null);

    if (results.template) {
      if (results.template.guild) {
        (results.mergedGuild as Guild) = results.guild = results.template.guild;
        return results;
      }
      guildOrInvite = results.template.guildId;
    } else {
      if (guildOrInvite) results.invite = await this.fetchInvite(guildOrInvite).catch(() => null);
      if (results.invite) guildOrInvite = results.invite.guild.id;
    }

    results.guild = await this.guilds.fetch({ force: true, guild: guildOrInvite }).catch(() => null);
    if (results.guild) {
      (results.mergedGuild as Guild) = results.guild;
      return results;
    }

    if (!results.invite) {
      results.widget = await this.fetchGuildWidget(guildOrInvite).catch(() => null);
      if (results.widget?.instantInvite) results.invite = await this.fetchInvite(results.widget.instantInvite);
    }

    results.preview = await this.fetchGuildPreview(guildOrInvite).catch(() => null);

    results.mergedGuild = Object.assign(
      results.invite?.guild || {},
      results.widget || {},
      results.preview || {},
    ) as typeof results.mergedGuild;

    if (isEmpty(results.mergedGuild)) results.mergedGuild = null;

    return results;
  }

  async updateLocalizations() {
    const folders = (
        await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: 'Mowund',
          path: 'locales',
          repo: 'i18n',
        })
      ).data as { name: string; path: string }[],
      locales: string[] = [],
      staticCatalog: GlobalCatalog = {};

    for (const folder of folders) {
      locales.push(folder.name);
      staticCatalog[folder.name] = JSON.parse(
        Buffer.from(
          (
            (await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
              owner: 'Mowund',
              path: `${folder.path}/bot.json`,
              repo: 'i18n',
            })) as { data: { content: string } }
          ).data.content,
          'base64',
        ).toString(),
      );
    }
    this.supportedLocales = locales;

    i18n.configure({
      defaultLocale,
      locales,
      objectNotation: true,
      retryInDefaultLocale: true,
      staticCatalog: staticCatalog,
    });
  }

  async updateExperiments() {
    const res = (await this.octokit
      .request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: 'xHyroM',
        path: 'data/client/experiments/experiments.json',
        repo: 'discord-datamining',
      })
      .catch(() => null)) as { data: { content: string } };

    if (res) {
      this.experiments = {
        data: JSON.parse(Buffer.from(res.data.content, 'base64').toString()) as Experiment[],
        lastUpdated: Date.now(),
      };
    }
  }

  countCommands(commands: Collection<string, ApplicationCommand>) {
    const chatInput = commands
        .filter(c => c.type === ApplicationCommandType.ChatInput)
        .reduce(
          (acc1, value1) =>
            acc1 +
            (value1.options?.reduce(
              (acc2, value2) =>
                acc2 +
                (value2.type === ApplicationCommandOptionType.SubcommandGroup
                  ? value2.options.reduce(acc3 => ++acc3, 0)
                  : value2.type === ApplicationCommandOptionType.Subcommand
                    ? 1
                    : 0),
              0,
            ) || 1),
          0,
        ),
      message = commands.filter(c => c.type === ApplicationCommandType.Message).size,
      user = commands.filter(c => c.type === ApplicationCommandType.User).size,
      contextMenu = message + user;

    return {
      chatInput,
      message,
      sum: {
        all: contextMenu + chatInput,
        contextMenu,
      },
      user,
    };
  }

  embedBuilder(options: EmbedBuilderOptions) {
    options.localizer ??= this.__dl;

    const emb = new EmbedBuilder();

    if (options.footer !== 'none') {
      emb.setFooter({
        iconURL: addSearchParams(
          new URL(
            options.avatar ||
              (options.member?.displayAvatarURL?.(imageOptions) ?? options.user.displayAvatarURL(imageOptions)),
          ),
          options.addParams,
        ).href,
        text: options.localizer(`${options.footer === 'interacted' ? 'INTERACTED_BY' : 'REQUESTED_BY'}`, {
          userName:
            options.member?.displayName ??
            (options.member as any as APIInteractionGuildMember)?.nick ??
            options.user.displayName,
        }),
      });
    }

    switch (options.type) {
      case 'error':
        return emb
          .setColor(Colors.Red)
          .setTitle(`${this.useEmoji('no')} ${options.title || options.localizer('ERROR.NOUN')}`);
      case 'loading':
        return emb
          .setColor(Colors.Blurple)
          .setTitle(`${this.useEmoji('loading')} ${options.title || options.localizer('LOADING')}`);
      case 'success':
        return emb
          .setColor(Colors.Green)
          .setTitle(`${this.useEmoji('check')} ${options.title || options.localizer('SUCCESS')}`);
      case 'warning':
        return emb.setColor(Colors.Yellow).setTitle(`⚠️ ${options.title || options.localizer('WARNING')}`);
      case 'wip':
        return emb
          .setColor(Colors.Orange)
          .setTitle(`🔨 ${options.title || options.localizer('WIP')}`)
          .setDescription(options.localizer('WIP_COMMAND'));
      default:
        return (options.title ? emb.setTitle(options.title) : emb).setColor(options.color ?? null);
    }
  }

  /**
   * @returns The bot static catalog or supported locales
   * @param supportedLocales Whether to return the supported locales instead of static catalog
   */
  async getBotStaticCatalog(supportedLocales = false) {
    const folders = (
      await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: 'Mowund',
        path: 'locales',
        repo: 'i18n',
      })
    ).data as { name: string; path: string }[];

    let list: any;
    if (supportedLocales) {
      list = [];
      for (const folder of folders) list.push(folder.name);
    } else {
      list = {};
      for (const folder of folders) {
        list[folder.name] = JSON.parse(
          Buffer.from(
            (
              (await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                owner: 'Mowund',
                path: `${folder.path}/bot.json`,
                repo: 'i18n',
              })) as { data: { content: string } }
            ).data.content,
            'base64',
          ).toString(),
        );
      }
    }

    return list;
  }

  /** Updates Mowund support server description */
  updateMowundDescription() {
    this.shard.broadcastEval(
      async (c: this, { serverId }) =>
        c.guilds.cache.get(serverId)?.edit({
          description: `Mowund is a multi-purpose bot with ${c.globalCommandCount.sum.all} commands in ${(
            (await c.shard.fetchClientValues('guilds.cache.size')) as number[]
          ).reduce((acc, a) => acc + a, 0)} servers.`,
        }),
      { context: { serverId: supportServer.id } },
    );
  }

  reportError(error: Error, options: { consoleMessage?: string; embed?: EmbedBuilderOptions; message?: string } = {}) {
    const { consoleMessage, embed, message } = options;

    if (consoleMessage || message) this.error(consoleMessage || this.chalk.red(message));
    this.error(util.inspect(error, { depth: null }));

    return this.rest.post(Routes.channelMessages(supportServer.errorChannelId), {
      body: {
        embeds: [
          this.embedBuilder({ footer: 'none', type: 'error', ...embed }).setDescription(
            `${message ? `${message}\n` : ''}\`\`\`ts\n${truncate(
              error.toString(),
              4096 - 9 - (message ? message.length + 1 : 0),
            )}\`\`\``,
          ),
        ],
      },
    });
  }

  log = (message: any, ...optionalParams: any[]) =>
    console.log(
      this.chalk.gray('[') + this.chalk.magenta(this.shardId) + this.chalk.gray(']'),
      message,
      ...optionalParams,
    );

  error = (message: any, ...optionalParams: any[]) =>
    console.error(
      this.chalk.gray('[') + this.chalk.magenta(this.shardId) + this.chalk.gray(']'),
      message,
      ...optionalParams,
    );
}

export interface EmbedBuilderOptions {
  addParams?: Record<string, string>;
  avatar?: string;
  color?: ColorResolvable;
  footer?: 'interacted' | 'requested' | 'none';
  localizer?: (phrase: string, replace?: Record<string, any>) => string;
  member?: GuildMember;
  title?: string;
  type?: 'error' | 'loading' | 'success' | 'warning' | 'wip';
  user: User;
}

export enum UserFlagEmoji {
  ActiveDeveloper = 'activeDeveloper',
  BugHunterLevel1 = 'bugHunterLvl1',
  BugHunterLevel2 = 'bugHunterLvl2',
  CertifiedModerator = 'moderatorProgramsAlumni',
  HypeSquadOnlineHouse1 = 'bravery',
  HypeSquadOnlineHouse2 = 'brilliance',
  HypeSquadOnlineHouse3 = 'balance',
  Hypesquad = 'hypeSquadEvents',
  Partner = 'partneredServerOwner',
  PremiumEarlySupporter = 'earlySupporter',
  Quarantined = 'quarantined',
  Spammer = 'unusualAccountActivity',
  Staff = 'discordEmployee',
  TeamPseudoUser = 'teamUser',
  VerifiedDeveloper = 'earlyVerifiedBotDeveloper',
}

export enum AppFlagEmoji {
  ApplicationAutoModerationRuleCreateBadge = 'automod',
  VerificationPendingGuildLimit = 'unusualGrowth',
  ApplicationCommandBadge = 'appCommandBadge',
}
