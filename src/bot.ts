import process from 'node:process';
import { readdirSync } from 'node:fs';
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
} from 'discord.js';
import { App } from '../lib/App.js';
import { Command } from '../lib/structures/Command.js';
import { debugLevel } from './defaults.js';
import 'log-timestamp';

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
if (debugLevel > 1) client.on('debug', console.log).on('warn', console.warn).rest.on('rateLimited', console.error);

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

    if (client.isMainShard) {
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
            console.log(client.chalk.yellow(`Updated global command: ${cmd.name} (${cmd.id})`));
          }
        }
      }

      client.commands.set(file.match(/.+?(?=\.js)/g)?.[0], command);
    }

    if (client.isMainShard) {
      delCmds.forEach(async ({ name }, id) => {
        await client.application.commands.delete(id);
        console.log(client.chalk.red(`Deleted global command: ${name} (${id})`));
      });
    }

    for (const file of readdirSync(path.join(__dirname, '/events')).filter(f => f.endsWith('.js'))) {
      const event = new (await import(`./events/${file}`)).default();
      if (event.once) client.once(event.name, (...args) => event.run(client, ...args));
      else client.on(event.name, (...args) => event.run(client, ...args));
    }

    console.log(client.chalk.green(`Started shard ${client.shard.ids[0] + 1}`));

    client.user.setPresence({
      activities: [{ name: `🏓 /ping | ${client.shard.ids[0] + 1}/${client.shard.count}`, type: ActivityType.Custom }],
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
