import process from 'node:process';
import { readdirSync } from 'node:fs';
import { setTimeout } from 'node:timers';
import { fileURLToPath } from 'node:url';
import path, { dirname } from 'node:path';
import {
  RESTJSONErrorCodes,
  GatewayIntentBits,
  Partials,
  disableValidators,
  DiscordAPIError,
  ActivityType,
  PresenceUpdateStatus,
  ChatInputApplicationCommandData,
} from 'discord.js';
import { App } from '../lib/App.js';
import { Command } from '../lib/util/Command.js';
import { debugLevel } from './defaults.js';
import { fetchURL } from './utils.js';
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
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  });

process.on('uncaughtException', (err: DiscordAPIError) => {
  if (err.code !== RESTJSONErrorCodes.UnknownInteraction) {
    console.error(err);
    process.exit();
  }
});

if (!debugLevel) disableValidators();
if (debugLevel > 1) client.on('debug', console.log).on('warn', console.warn).rest.on('rateLimited', console.error);

client.on('ready', async () => {
  try {
    client.user.setPresence({
      activities: [{ name: 'starting...', type: ActivityType.Watching }],
      status: PresenceUpdateStatus.Idle,
    });

    client.splitedCmds = client.splitCmds(await client.application.commands.fetch());

    await (async function updateData() {
      client.badDomains = await fetchURL('https://bad-domains.walshy.dev/domains.json');
      client.experiments = {
        data: await fetchURL('https://distools.app/api/datamining/experiments'),
        lastUpdated: Date.now(),
      };

      if (debugLevel) console.log(client.chalk.cyan('Data updated'));
      setTimeout(updateData, 300000);
    })();

    await client.updateMowundDescription();

    const appCmds = await client.application.commands.fetch({ withLocalizations: true });
    let delCmds = [];

    appCmds.each(c => (delCmds = delCmds.concat(c)));

    for (const file of readdirSync(path.join(__dirname, '/interactions')).filter(f => f.endsWith('.js'))) {
      const event = new (await import(`./interactions/${file}`)).default() as Command;

      for (const dt of event.structure as ChatInputApplicationCommandData[]) {
        client.autoLocalizeCommand(dt);

        const searchCmd = appCmds.find(c => c.name === dt.name),
          dataEquals = searchCmd?.equals(dt, true);

        if (!event.options?.guildOnly) {
          const found = delCmds.find(c => c.name === dt.name);
          delCmds = found ? delCmds.filter(c => c.name !== dt.name || c.guildId) : delCmds;

          if (!dataEquals) {
            const cmd = await client.application.commands.create(dt);
            console.log(client.chalk.yellow(`Updated global command: ${cmd.name} (${cmd.id})`));
          }
        }
      }

      client.commands.set(file.match(/.+?(?=\.js)/g)?.[0], event);
    }

    delCmds.forEach(c => {
      client.application.commands.delete(c.id);
      console.log(client.chalk.red(`Deleted global command: ${c.name} (${c.id})`));
    });

    for (const file of readdirSync(path.join(__dirname, '/events')).filter(f => f.endsWith('.js'))) {
      const event = new (await import(`./events/${file}`)).default();
      if (event.once) client.once(event.name, (...args) => event.run(client, ...args));
      else client.on(event.name, (...args) => event.run(client, ...args));
    }

    console.log(client.chalk.green('Bot started'));
    client.user.setPresence({
      activities: [{ name: '/ping', type: ActivityType.Watching }],
      status: PresenceUpdateStatus.Online,
    });

    await (async function findReminders() {
      const reminders = await client.dbFind(
        '/reminders',
        [[{ field: 'timestamp', operator: '<=', target: Date.now() }]],
        {
          cacheReference: { collection: 'users', options: ['id'] },
          findAndSet: 'delete',
        },
      );

      reminders.forEach(reminder => client.emit('reminderFound', reminder[0]));
      setTimeout(findReminders, 5000);
    })();
  } catch (err) {
    client.user.setPresence({
      activities: [{ name: 'an error occurred', type: ActivityType.Watching }],
      status: PresenceUpdateStatus.DoNotDisturb,
    });
    console.error(err);
  }
});

client.login(process.env.TOKEN);
