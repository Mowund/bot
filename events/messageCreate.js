import { debugMode } from '../defaults.js';

export const eventName = 'messageCreate';
export async function execute({ chalk, client }, message) {
  // TODO
  if (message.author.bot || message.guild.id !== '420007989261500418') return;

  const scamReportTimeout = 15000;
  if (client.badDomains.some(w => message.content.includes(w))) {
    if (!message.author.lastScamTimestamp || Date.now() - message.author.lastScamTimestamp > scamReportTimeout) {
      const guildSettings = await client.dbGet(message.guild);

      if (guildSettings.log.badDomains && guildSettings.log.channel) {
        const logChannel = await message.guild.channels.cache.get(guildSettings.logChannel);

        logChannel.send(`Bad word: ${message.content}`);
        if (debugMode) console.log(chalk.gray('Bad word detected: ') + chalk.red(message.content));
      }
    }
    message.author.lastScamTimestamp = message.createdTimestamp;
  } else if (Date.now() - message.author.lastScamTimestamp > scamReportTimeout) {
    delete message.author.lastScamTimestamp;
  }
}