import process from 'node:process';
import { GuildPremiumTier, ImageURLOptions } from 'discord.js';

export const botOwners = process.env.OWNERS?.split(','),
  isDev = process.env.NODE_ENV === 'development',
  debugLevel = +(process.env.DEBUG_LEVEL ?? isDev),
  defaultLocale = 'en-US',
  imageOptions: ImageURLOptions = { extension: 'png', size: 4096 },
  premiumLimits = {
    [GuildPremiumTier.None]: { emojis: 50, stickers: 5 },
    [GuildPremiumTier.Tier1]: { emojis: 100, stickers: 15 },
    [GuildPremiumTier.Tier2]: { emojis: 150, stickers: 30 },
    [GuildPremiumTier.Tier3]: { emojis: 250, stickers: 60 },
  },
  supportServer = {
    errorChannelId: '1062084806025937018',
    id: '420007989261500418',
    invite: 'https://discord.gg/f85rEGJ',
  };

export enum UserFlagEmoji {
  ActiveDeveloper = 'activeDeveloper',
  BotHTTPInteractions = 'commands',
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
  Spammer = 'likelySpammer',
  Staff = 'discordEmployee',
  TeamPseudoUser = 'teamUser',
  VerifiedDeveloper = 'earlyVerifiedBotDeveloper',
}

export enum AppFlagEmoji {
  ApplicationAutoModerationRuleCreateBadge = 'automod',
  VerificationPendingGuildLimit = 'unusualGrowth',
  ApplicationCommandBadge = 'slashCommands',
}
