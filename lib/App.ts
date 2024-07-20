/* eslint-disable @typescript-eslint/no-empty-function */

import process from 'node:process';
import { Buffer } from 'node:buffer';
import util from 'node:util';
import { Octokit } from '@octokit/core';
import {
  APIEmoji,
  APIInteractionGuildMember,
  ApplicationCommand,
  ApplicationCommandOptionType,
  ApplicationCommandType,
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
  User,
  Widget,
} from 'discord.js';
import firebase, { firestore } from 'firebase-admin';
import i18n, { GlobalCatalog, I18n } from 'i18n';
import { Chalk, ChalkInstance } from 'chalk';
import { defaultLocale, imageOptions, supportServer } from '../src/defaults.js';
import { addSearchParams, isEmpty, truncate } from '../src/utils.js';
import { Command } from './structures/Command.js';
import { DatabaseManager } from './managers/DatabaseManager.js';
import { Experiment } from './interfaces/Experiment.js';

export class App extends Client<true> {
  allShardsReady: boolean;
  appEmojis: Collection<string, APIEmoji>;
  chalk: ChalkInstance;
  commands: Collection<string, Command>;
  database: DatabaseManager;
  experiments: { data: Experiment[]; lastUpdated: number };
  firestore: firestore.Firestore;
  globalCommandCount: { chatInput: number; message: number; sum: { all: number; contextMenu: number }; user: number };
  i18n: I18n;
  octokit: Octokit;
  supportedLocales: string[];
  readonly isMainShard: boolean;
  readonly shardId: number;

  constructor(options: ClientOptions) {
    super(options);

    firebase.initializeApp({
      credential: firebase.credential.cert(JSON.parse(process.env.FIREBASE_TOKEN)),
    });

    this.allShardsReady = false;
    this.appEmojis = new Collection();
    this.chalk = new Chalk({ level: 3 });
    this.commands = new Collection();
    this.database = new DatabaseManager(this);
    this.firestore = firebase.firestore();
    this.i18n = i18n;
    this.isMainShard = this.shard.ids[0] === 0;
    this.shardId = this.shard.ids[0] + 1;
  }

  async login(token?: string) {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    await this.updateLocalizations();
    return super.login(token);
  }

  useEmoji(name: string) {
    if (!name) return '';
    const emoji = this.appEmojis.get(name);
    return formatEmoji(emoji);
  }

  localize = (phraseOrOptions: string | i18n.TranslateOptions, replace?: Record<string, any>) =>
    replace ? i18n.__mf(phraseOrOptions, replace) : i18n.__(phraseOrOptions);

  localizeObject(object: Record<string, any>, key: string) {
    object[`${key}Localizations`] ??= {};

    for (const locale of this.supportedLocales.filter((l: string) => l !== defaultLocale))
      object[`${key}Localizations`][locale] = this.localize({ locale, phrase: object[key] });

    object[key] = this.localize({ locale: defaultLocale, phrase: object[key] });
  }

  localizeData(data: Record<string, any>) {
    if ('name' in data) this.localizeObject(data, 'name');
    if ('description' in data) this.localizeObject(data, 'description');
    if ('options' in data) for (const opt of data.options) this.localizeData(opt);
    if ('choices' in data) for (const ch of data.choices) this.localizeData(ch);
  }

  fetchGuild(guild: Snowflake) {
    return this.guilds.cache.get(guild) || this.guilds.fetch({ force: true, guild }).catch(() => null) || null;
  }

  async fetchGuildGlobally(guildOrInvite: Snowflake | InviteResolvable | GuildTemplateResolvable) {
    let invite: Invite;
    const template: GuildTemplate = await this.fetchGuildTemplate(guildOrInvite).catch(() => null);

    if (template) {
      if (template.guild) return template.guild;
      guildOrInvite = template.guildId;
    } else {
      if (guildOrInvite) invite = await this.fetchInvite(guildOrInvite).catch(() => null);
      if (invite) guildOrInvite = invite.guild.id;
    }

    let guild: Guild | (InviteGuild & Widget & GuildPreview) = await this.fetchGuild(guildOrInvite),
      widget: Widget;

    if (!invite && !guild) {
      widget = await this.fetchGuildWidget(guildOrInvite).catch(() => null);
      if (widget?.instantInvite) invite = await this.fetchInvite(widget.instantInvite);
    }

    guild ||= Object.assign(
      invite?.guild || {},
      widget || {},
      await this.fetchGuildPreview(guildOrInvite).catch(() => {}),
    ) as InviteGuild & Widget & GuildPreview;

    if (isEmpty(guild)) guild = null;

    return guild;
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
    const emb = new EmbedBuilder().setTimestamp(options.timestamp ?? Date.now());
    options.localizer ??= this.localize;

    if (options.footer !== 'none') {
      emb.setFooter({
        iconURL: addSearchParams(
          new URL(
            options.avatar ||
              (options.member?.displayAvatarURL?.(imageOptions) ?? options.user.displayAvatarURL(imageOptions)),
          ),
          options.addParams,
        ).href,
        text: options.localizer(`GENERIC.${options.footer === 'interacted' ? 'INTERACTED_BY' : 'REQUESTED_BY'}`, {
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
          .setTitle(`${this.useEmoji('no')} ${options.title || options.localizer('GENERIC.ERROR')}`);
      case 'loading':
        return emb
          .setColor(Colors.Blurple)
          .setTitle(`${this.useEmoji('loading')} ${options.title || options.localizer('GENERIC.LOADING')}`);
      case 'success':
        return emb
          .setColor(Colors.Green)
          .setTitle(`${this.useEmoji('check')} ${options.title || options.localizer('GENERIC.SUCCESS')}`);
      case 'warning':
        return emb.setColor(Colors.Yellow).setTitle(`⚠️ ${options.title || options.localizer('GENERIC.WARNING')}`);
      case 'wip':
        return emb
          .setColor(Colors.Orange)
          .setTitle(`🔨 ${options.title || options.localizer('GENERIC.WIP')}`)
          .setDescription(options.localizer('GENERIC.WIP_COMMAND'));
      default:
        return (options.title ? emb.setTitle(options.title) : emb).setColor(options.color ?? null);
    }
  }

  /**
   * @returns The bot static catalog or supported languages
   * @param supportedLanguages Whether to return the supported languages instead of static catalog
   */
  async getBotStaticCatalog(supportedLanguages = false) {
    const folders = (
      await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: 'Mowund',
        path: 'locales',
        repo: 'i18n',
      })
    ).data as { name: string; path: string }[];

    let list: any;
    if (supportedLanguages) {
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
  timestamp?: number;
  title?: string;
  type?: 'error' | 'loading' | 'success' | 'warning' | 'wip';
  user: User;
}
