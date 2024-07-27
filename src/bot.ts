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
  formatEmoji,
  RESTJSONErrorCodes,
  SnowflakeUtil,
  PartialEmoji,
  resolveFile,
  resolveBase64,
} from 'discord.js';
import cs from 'console-stamp';
import looksSame from 'looks-same';
import { App } from '../lib/App.js';
import { Command } from '../lib/structures/Command.js';
import { decreaseSizeCDN } from './utils.js';
import { debugLevel, imageOptions, isDev } from './defaults.js';

cs(console, {
  format: ':date(dd/mm/yyyy HH:MM:ss.l)',
});

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
        const emjFilePath = new URL('../../src/emojis.json', import.meta.url),
          emjColl = new Collection(
            Object.entries(
              JSON.parse(readFileSync(emjFilePath, 'utf8')) as Record<
                string,
                `<:${string}:${string}>` | `<a:${string}:${string}>`
              >,
            ),
          ).mapValues(x => parseEmoji(x) as APIEmoji | PartialEmoji),
          mergedColl = emjColl
            .merge(
              client.appEmojis,
              x => ({ keep: true, value: x }),
              y => ({ keep: true, value: y }),
              x => ({ keep: true, value: x }),
            )
            .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));

        if (mergedColl.some(x => !emjColl.has(x.name) || x.id !== client.appEmojis.get(x.name)?.id)) {
          client.log(client.chalk.yellow('Updating emojis...'));

          const updatedEntries = await mergedColl.reduce(
            async (accPromise: Promise<[string, `<:${string}:${string}>` | `<a:${string}:${string}>`][]>, emj) => {
              const acc = await accPromise,
                { id, name } = emj,
                emjFormatted = formatEmoji(emj),
                emjJSON = emjColl.get(name),
                emjJSONTimestamp = emjJSON?.id ? SnowflakeUtil.timestampFrom(emjJSON.id) : 0,
                emjApp = client.appEmojis.get(name) || client.appEmojis.find(e => e.id === id),
                emjAppTimestamp = emjApp?.id ? SnowflakeUtil.timestampFrom(emjApp.id) : 0,
                emojiUrl = `https://cdn.discordapp.com/emojis/${emj.id}.${emj.animated ? 'gif' : 'png'}?size=${imageOptions.size}`;

              if (emjAppTimestamp > emjJSONTimestamp) {
                if (emjJSON) {
                  const emjAppFormatted = formatEmoji(emjApp);
                  acc.push([name, emjAppFormatted]);
                  if (isDev)
                    client.log(client.chalk.green(`Updated ${client.chalk.gray(emjAppFormatted)} emoji from JSON`));
                } else if (!acc.find(([n]) => n === name)) {
                  acc.push([name, emjFormatted]);
                  if (isDev) {
                    client.log(client.chalk.green(`Added ${client.chalk.gray(emjFormatted)} emoji to JSON`));
                  } else {
                    await client.rest.delete(`/applications/${client.application.id}/emojis/${emjApp.id}`);
                    client.appEmojis.delete(name);
                    client.log(client.chalk.red(`Deleted ${client.chalk.gray(formatEmoji(emjApp))} emoji from app`));
                  }
                }
              } else if (emjAppTimestamp === emjJSONTimestamp) {
                if (name !== emjApp.name) {
                  const emjAppFormatted = formatEmoji(emjApp);
                  client.log(
                    client.chalk.blue(
                      `Renamed ${client.chalk.gray(emjFormatted)} to ${client.chalk.gray(emjAppFormatted)} from JSON`,
                    ),
                  );
                  acc.push([emjApp.name, emjAppFormatted]);
                } else {
                  acc.push([name, emjFormatted]);
                }
              } else {
                try {
                  if (emjApp) {
                    await client.rest.delete(`/applications/${client.application.id}/emojis/${emjApp.id}`);
                    client.log(client.chalk.red(`Deleted ${client.chalk.gray(formatEmoji(emjApp))} emoji from app`));
                  }

                  client.log(
                    client.chalk.blue(
                      `Fetching emoji ${client.chalk.gray(emjFormatted)} from ${client.chalk.gray(emojiUrl)}`,
                    ),
                  );

                  const resolveAndCreateEmoji = async (url: string, mismatches = 0): Promise<APIEmoji | null> => {
                      try {
                        const { data: imageData } = await resolveFile(url),
                          newEmoji = (await client.rest.post(`/applications/${client.application.id}/emojis`, {
                            body: { image: resolveBase64(imageData), name },
                          })) as APIEmoji,
                          { data: newImageData } = await resolveFile(
                            `https://cdn.discordapp.com/emojis/${newEmoji.id}.${newEmoji.animated ? 'gif' : 'png'}?size=${imageOptions.size}`,
                          ),
                          { equal } = await looksSame(imageData, newImageData);

                        if (!equal) {
                          await client.rest.delete(`/applications/${client.application.id}/emojis/${newEmoji.id}`);
                          return resolveAndCreateEmoji(url, mismatches + 1);
                        }
                        if (mismatches) {
                          client.log(
                            client.chalk.magenta(
                              `Fixed duplicated image for emoji ${client.chalk.gray(emjFormatted)} (${mismatches} attempts)`,
                            ),
                          );
                        }

                        return newEmoji;
                      } catch (err) {
                        if (err.code === RESTJSONErrorCodes.InvalidFormBodyOrContentType) {
                          const newUrl = await decreaseSizeCDN(url, { initialSize: 256, maxSize: 256000 });
                          if (newUrl !== url) {
                            client.log(
                              client.chalk.blue(
                                `Refetching emoji ${client.chalk.gray(emjFormatted)} from ${client.chalk.gray(url)}`,
                              ),
                            );
                          }
                          return resolveAndCreateEmoji(newUrl, mismatches);
                        }

                        client.error(`Error creating emoji: `, err);
                        return null;
                      }
                    },
                    newEmoji = await resolveAndCreateEmoji(emojiUrl);

                  if (newEmoji) {
                    client.appEmojis.set(name, newEmoji);
                    client.log(client.chalk.green(`Added ${client.chalk.gray(formatEmoji(newEmoji))} emoji to app`));
                    acc.push([name, formatEmoji(newEmoji)]);
                  }
                } catch (err) {
                  client.error(client.chalk.red(`Error adding emoji ${client.chalk.gray(emjFormatted)}:`, err));
                }
              }

              return acc;
            },
            Promise.resolve([] as [string, `<:${string}:${string}>` | `<a:${string}:${string}>`][]),
          );

          if (isDev) {
            writeFileSync(
              emjFilePath,
              JSON.stringify(
                Object.fromEntries(updatedEntries.sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }))),
                null,
                2,
              ),
            );
          }

          // Update emojis in other shards
          await client.shard.broadcastEval(async (c: App) => {
            if (!c.isMainShard && c.application) {
              const eD = (await c.rest.get(`/applications/${c.application.id}/emojis`)) as {
                items: APIEmoji[];
              };
              eD.items.forEach(e => {
                c.log(e.name, c.appEmojis.get(e.name));
                c.appEmojis.set(e.name, e);
                c.log(e.name, c.appEmojis.get(e.name));
              });
              c.log(c.chalk.yellow('Updated emojis'));
            }
          });

          client.log(client.chalk.yellow('Finished updating emojis'));
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
