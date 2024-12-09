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
