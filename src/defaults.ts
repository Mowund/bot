import process from 'node:process';
import { ALLOWED_SIZES, GuildPremiumTier, ImageURLOptions, Locale } from 'discord.js';

export const botOwners = process.env.OWNERS?.split(','),
  isDev = process.env.NODE_ENV === 'development',
  debugLevel = +(process.env.DEBUG_LEVEL ?? isDev),
  defaultLocale = Locale.EnglishUS,
  imageOptions: ImageURLOptions = { extension: 'png', size: ALLOWED_SIZES.at(-1) },
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
  },
  mongoDB = 'Mowund';

export enum TimeUnit {
  Years = 'y',
  Months = 'mo',
  Weeks = 'w',
  Days = 'd',
  Hours = 'h',
  Minutes = 'm',
  Seconds = 's',
  Milliseconds = 'ms',
}

export const timeUnitDivisor = {
  [TimeUnit.Years]: 365 * 24 * 60 * 60 * 1000,
  [TimeUnit.Months]: 30 * 24 * 60 * 60 * 1000,
  [TimeUnit.Weeks]: 7 * 24 * 60 * 60 * 1000,
  [TimeUnit.Days]: 24 * 60 * 60 * 1000,
  [TimeUnit.Hours]: 60 * 60 * 1000,
  [TimeUnit.Minutes]: 60 * 1000,
  [TimeUnit.Seconds]: 1000,
  [TimeUnit.Milliseconds]: 1,
};
