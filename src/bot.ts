import process from 'node:process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { setTimeout } from 'node:timers';
import { fileURLToPath } from 'node:url';
import path, { dirname } from 'node:path';
import {
  GatewayIntentBits,
  Partials,
  disableValidators,
  DiscordAPIError,
  ActivityType,
  PresenceUpdateStatus,
  ChatInputApplicationCommandData,
  Collection,
  Snowflake,
  ApplicationCommand,
  APIEmoji,
  parseEmoji,
  resolveImage,
  formatEmoji,
  RESTJSONErrorCodes,
} from 'discord.js';
import { App } from '../lib/App.js';
import { Command } from '../lib/structures/Command.js';
import { debugLevel, imageOptions } from './defaults.js';
import 'log-timestamp';
import { decreaseSizeCDN } from './utils.js';

const __filename = fileURLToPath(import.meta.url),
  __dirname = dirname(__filename),
  client = new App({
    allowedMentions: { parse: [] },
    intents: [
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildEmojisAndStickers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  });

process.on('uncaughtException', async (err: DiscordAPIError) => {
  if (
    !(['UND_ERR_CONNECT_TIMEOUT', 'ENOTFOUND'] as (number | string)[]).includes(err.code) ||
    !(err instanceof DiscordAPIError)
  ) {
    await client.reportError(err);
    process.exit();
  }
});

if (!debugLevel) disableValidators();
if (debugLevel > 1) client.on('debug', client.log).on('warn', client.error).rest.on('rateLimited', client.error);

client.on('ready', async () => {
  try {
    client.user.setPresence({
      activities: [{ name: '🕑 Starting...', type: ActivityType.Custom }],
      status: PresenceUpdateStatus.Idle,
    });

    await client.application.fetch();
    const appCmds = await client.application.commands.fetch({ withLocalizations: true });
    let delCmds = new Collection<Snowflake, ApplicationCommand>(appCmds);
    client.globalCommandCount = client.countCommands(appCmds);

    {
      // Fetch emojis
      const emojisData = (await client.rest.get(`/applications/${client.application.id}/emojis`)) as {
        items: APIEmoji[];
      };
      emojisData.items.forEach(e => client.appEmojis.set(e.name, e));
      client.log(client.chalk.yellow('Fetched emojis'));

      if (client.isMainShard) {
        // Update emojis
        if (process.env.NODE_ENV === 'development') {
          const emjFile = new URL('../../src/emojis.json', import.meta.url),
            emojisJSON = JSON.parse(readFileSync(emjFile, 'utf8')) as Record<string, string>,
            combinedEmojis = { ...emojisJSON };

          for (const [name, emoji] of client.appEmojis) combinedEmojis[name] ||= formatEmoji(emoji);

          const emojisToUpdate = Object.entries(combinedEmojis).sort(([a], [b]) => a.localeCompare(b));

          if (!client.appEmojis.hasAll(...Object.keys(combinedEmojis))) {
            client.log(client.chalk.yellow('Adding missing emojis...'));

            const updatedEntries = await Promise.all(
                emojisToUpdate.map(async ([name, formatted]) => {
                  const emj = parseEmoji(formatted),
                    clientEmj = client.appEmojis.get(name);
                  let emojiUrl = `https://cdn.discordapp.com/emojis/${emj.id}`;

                  if (clientEmj) {
                    const formattedClientEmj = formatEmoji(clientEmj);
                    if (formattedClientEmj !== formatted) {
                      client.log(
                        client.chalk.yellow(`Updated ${client.chalk.gray(formattedClientEmj)} emoji from JSON`),
                      );
                      return [name, formattedClientEmj];
                    }
                    if (!Object.keys(emojisJSON).includes(name))
                      client.log(client.chalk.green(`Added ${client.chalk.gray(formatted)} emoji to JSON`));
                  } else {
                    try {
                      const imageType =
                        (await fetch(`${emojiUrl}.gif`).then(res => (res.ok ? 'gif' : null))) ||
                        (await fetch(emojiUrl).then(res => (res.ok ? 'png' : null)));

                      if (imageType) {
                        emojiUrl += `.${imageType}?size=${imageOptions.size}`;
                        client.log(
                          client.chalk.blue(
                            `Fetching emoji ${client.chalk.gray(formatted)} from ${client.chalk.gray(emojiUrl)}`,
                          ),
                        );

                        const resolveAndCreateEmoji = async (url: string): Promise<APIEmoji | null> => {
                            try {
                              const image = await resolveImage(url),
                                newEmoji = (await client.rest.post(`/applications/${client.application.id}/emojis`, {
                                  body: { image, name },
                                })) as APIEmoji;
                              return newEmoji;
                            } catch (err) {
                              if (err.code === RESTJSONErrorCodes.InvalidFormBodyOrContentType) {
                                return resolveAndCreateEmoji(
                                  await decreaseSizeCDN(url, { initialSize: 256, maxSize: 256000 }),
                                );
                              }
                              client.error(`Error creating emoji: `, err);
                              return null;
                            }
                          },
                          newEmoji = await resolveAndCreateEmoji(emojiUrl);
                        if (newEmoji) {
                          client.appEmojis.set(name, newEmoji);
                          client.log(
                            client.chalk.green(`Added ${client.chalk.gray(formatEmoji(newEmoji))} emoji to app`),
                          );
                          return [name, formatEmoji(newEmoji)];
                        }
                      }
                    } catch (err) {
                      client.error(client.chalk.red(`Error adding emoji ${client.chalk.gray(formatted)}:`, err));
                    }
                  }

                  return [name, formatted];
                }),
              ),
              updatedCombinedEmojis = Object.fromEntries(updatedEntries);
            if (Object.entries(updatedCombinedEmojis).some(([name, formatted]) => combinedEmojis[name] !== formatted))
              writeFileSync(emjFile, JSON.stringify(updatedCombinedEmojis, null, 2));
          }
        }

        await (async function updateData() {
          await client.updateExperiments();
          setTimeout(updateData, 300000);
        })();

        const metadata = [
          {
            description: 'ROLE_CONNECTION.LEVEL.DESCRIPTION',
            key: 'level',
            name: 'ROLE_CONNECTION.LEVEL.NAME',
            type: 2,
          },
          {
            description: 'ROLE_CONNECTION.MOWANS.DESCRIPTION',
            key: 'mowans',
            name: 'ROLE_CONNECTION.MOWANS.NAME',
            type: 2,
          },
          {
            description: 'ROLE_CONNECTION.PLAYING_SINCE.DESCRIPTION',
            key: 'playingsince',
            name: 'ROLE_CONNECTION.PLAYING_SINCE.NAME',
            type: 6,
          },
        ];
        for (const d of metadata) client.localizeData(d);
        await client.application.editRoleConnectionMetadataRecords(metadata);
      }
    }

    for (const file of readdirSync(path.join(__dirname, '/interactions')).filter(f => f.endsWith('.js'))) {
      const command = new (await import(`./interactions/${file}`)).default() as Command;

      for (const dt of command.structure as ChatInputApplicationCommandData[]) {
        client.localizeData(dt);

        if (client.isMainShard && !command.options?.guildOnly) {
          const searchCmd = appCmds.find(c => c.name === dt.name),
            dataEquals = searchCmd?.equals(dt, true),
            found = delCmds.find(c => c.name === dt.name);
          if (found) delCmds = delCmds.filter(c => c.name !== dt.name || c.guildId);

          if (!dataEquals) {
            const cmd = await client.application.commands.create(dt);
            client.log(client.chalk.yellow(`Updated global command: ${cmd.name} (${cmd.id})`));
          }
        }
      }

      client.commands.set(file.match(/.+?(?=\.js)/g)?.[0], command);
    }

    if (client.isMainShard) {
      delCmds.forEach(async ({ name }, id) => {
        await client.application.commands.delete(id);
        client.log(client.chalk.red(`Deleted global command: ${name} (${id})`));
      });
    }

    for (const file of readdirSync(path.join(__dirname, '/events')).filter(f => f.endsWith('.js'))) {
      const event = new (await import(`./events/${file}`)).default();
      if (event.once) client.once(event.name, (...args) => event.run(client, ...args));
      else client.on(event.name, (...args) => event.run(client, ...args));
    }

    client.log(client.chalk.green('Started shard'));

    client.user.setPresence({
      activities: [{ name: `🏓 /ping | ${client.shardId}/${client.shard.count}`, type: ActivityType.Custom }],
      status: PresenceUpdateStatus.Online,
    });

    if (client.isMainShard) {
      (async function findReminders() {
        for (const r of await client.database.reminders.find([
          [{ field: 'timestamp', operator: '<=', target: Date.now() }],
        ]))
          client.emit('reminderFound', r[1]);

        setTimeout(findReminders, 5000);
      })();
    }
  } catch (err) {
    await client.reportError(err);
    client.user.setPresence({
      activities: [{ name: '⛔ An error occurred', type: ActivityType.Custom }],
      status: PresenceUpdateStatus.DoNotDisturb,
    });
  }
});

client.login();
