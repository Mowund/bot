import { URL } from 'node:url';
import { Buffer } from 'node:buffer';
import zlib from 'node:zlib';
import {
  ButtonStyle,
  discordSort,
  ActionRowBuilder,
  Collection,
  Embed,
  Snowflake,
  TimestampStyles,
  TimestampStylesString,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ActionRow,
  MessageActionRowComponent,
  ButtonComponent,
  MessageActionRowComponentBuilder,
  PermissionsBitField,
  PermissionResolvable,
  StringSelectMenuComponent,
  OAuth2Scopes,
  ApplicationIntegrationType,
  ALLOWED_SIZES,
  DataManager,
} from 'discord.js';
import { TimeUnit, timeUnitDivisor } from './defaults.js';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type Rename<T, K extends keyof T, N extends string> = Omit<T, K> & { [P in N]: T[K] };

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type ClassProperties<C> = { [K in keyof C as C[K] extends Function ? never : K]: C[K] };

type ClassRenamedAndOmitted<C> = Omit<
  'id' extends keyof ClassProperties<C> ? Rename<ClassProperties<C>, 'id', '_id'> : ClassProperties<C>,
  'client'
>;

export type DataClassProperties<C, IncludeManager extends boolean = false> = Partial<{
  [K in keyof ClassRenamedAndOmitted<C>]: ClassRenamedAndOmitted<C>[K] extends DataManager<any, infer Holds, any>
    ? IncludeManager extends true
      ? ClassRenamedAndOmitted<C>[K] | DataClassProperties<Holds>[]
      : DataClassProperties<Holds>[]
    : ClassRenamedAndOmitted<C>[K];
}>;

export const compressJSON = (json: any) => {
  const compressedData = zlib.deflateSync(JSON.stringify(json));
  return compressedData.toString('base64');
};

export const decompressJSON = (string: string) => {
  const compressedData = Buffer.from(string, 'base64'),
    decompressedJSON = zlib.inflateSync(compressedData).toString();
  return JSON.parse(decompressedJSON);
};

export type Overwrite<T, U> = Omit<T, keyof U> & U;

export type MergeTypes<A, B> = {
  [key in keyof A]: key extends keyof B ? B[key] : A[key];
} & B;

export const afterMatch = (str: string, match: string) => {
  const i = str.indexOf(match);
  return (i > 0 && str?.substring(i + 1)) || '';
};
export const beforeMatch = (str: string, match: string) => str?.substring(0, str.indexOf(match)) || str;

export const toUpperSnakeCase = (str: string) =>
  str
    .replace(/([A-Z]+(?![a-z])|[A-Z])/g, g => `_${g}`)
    .replace(/^_/, '')
    .toUpperCase();

export const isValidImage = (contentType: string) => ['image/jpeg', 'image/png', 'image/gif'].includes(contentType);

/**
 * Modifies components of action rows based on specified options.
 * @param rows Array of action rows to modify.
 * @param options The function's options.
 * @param options.disableLinkButtons Whether to disable link buttons. Default is `false`.
 * @param options.enabledComponents Array of component custom IDs that will remain enabled.
 * @param options.disabledComponents Array of component custom IDs that will be disabled.
 * @param options.defaultValues Array of objects with component custom IDs and their respective default values.
 * @returns Modified array of action rows with components disabled or set to default values.
 */
export const disableComponents = (
  rows: ActionRow<MessageActionRowComponent>[] = [],
  options: {
    disableLinkButtons?: boolean;
    enabledComponents?: string[];
    disabledComponents?: string[];
    defaultValues?: { customId: string; values: string[] }[];
  } = {},
): ActionRowBuilder<MessageActionRowComponentBuilder>[] => {
  const { defaultValues = [], disableLinkButtons = false, disabledComponents, enabledComponents = [] } = options,
    enabledSet = new Set(enabledComponents),
    disabledSet = disabledComponents ? new Set(disabledComponents) : null;

  return rows.map(row => {
    const rowBuilder = ActionRowBuilder.from(row) as ActionRowBuilder<MessageActionRowComponentBuilder>;

    row.components.forEach((component, index) => {
      const { customId, style } = component as ButtonComponent,
        isLinkButton = style === ButtonStyle.Link,
        isComponentEnabled = enabledSet.has(customId),
        isComponentDisabled = disabledSet?.has(customId);

      (rowBuilder.components[index] as ButtonBuilder).setDisabled(
        isComponentEnabled
          ? false
          : disableLinkButtons && isLinkButton
            ? true
            : disabledSet
              ? (isComponentDisabled ?? false)
              : !isLinkButton,
      );

      if (defaultValues.length && customId) {
        const defaultValue = defaultValues.find(dv => dv.customId === customId);
        if (defaultValue) {
          (component as StringSelectMenuComponent).options.forEach((option, optionIndex) => {
            const isDefault = defaultValue.values.includes(option.value);
            (rowBuilder.components[index] as StringSelectMenuBuilder).options[optionIndex].setDefault(isDefault);
          });
        }
      }
    });

    return rowBuilder;
  });
};

export const decreaseSizeCDN = async (url: string, options: { initialSize?: number; maxSize?: number } = {}) => {
  const { initialSize, maxSize } = options,
    fileSize = +(await fetch(url))?.headers?.get('content-length');

  let sizes = Array.from(ALLOWED_SIZES),
    otherFileSize = fileSize;

  if (initialSize) sizes = sizes.filter(i => i < initialSize);
  while (maxSize ? maxSize < otherFileSize : fileSize === otherFileSize) {
    url = `${beforeMatch(url, '?')}?size=${sizes.shift()}`;
    otherFileSize = +(await fetch(url))?.headers?.get('content-length');
  }
  return url;
};

export const isEmpty = (obj: Record<any, any>) => {
  for (const prop in obj) if (Object.hasOwn(obj, prop)) return false;
  return true;
};

export function getEnumKeyByValue<T extends { [k: string]: any }, V extends number | string>(
  enumObj: T,
  value: V,
): { [K in keyof T]: T[K] extends V ? K : never }[keyof T] | null {
  for (const [key, val] of Object.entries(enumObj))
    if (val === value) return key as T[keyof T] extends V ? keyof T : never;
  return null;
}

/**
 * @returns The keys with empty values from an object
 * @param obj The object to filter the keys
 * @param options The function's options
 * @param options.recursion Whether to also recursively get empty nested keys (Default: True)
 * @param options.removeFalsy Whether to get all falsy values (Default: False)
 * @param options.removeNull Whether to get null values (Default: False)
 */
export const getEmptyKeys = (
  obj: Record<any, any>,
  options: { removeFalsy?: boolean; removeNull?: boolean; recursion?: boolean } = {},
  parentKey = '',
): string[] => {
  const keys: string[] = [];

  Object.keys(obj).forEach(k => {
    const v = obj[k],
      fullKey = parentKey ? `${parentKey}.${k}` : k;

    if (options.recursion && v && typeof v === 'object' && !Array.isArray(v))
      keys.push(...getEmptyKeys(v, options, fullKey));
    else if ((options.removeNull && v === null) || (options.removeFalsy ? !!v : v != null)) keys.push(fullKey);
  });

  return keys;
};

/**
 * @returns Remove keys with empty values from an object
 * @param object The object to filter the values
 * @param options The function's options
 * @param options.recursion Whether to also recursively filter nested objects (Default: True)
 * @param options.removeFalsy Whether to remove all falsy values (Default: False)
 * @param options.removeNull Whether to remove null values (Default: False)
 */
export const removeEmpty = (
  object: Record<string, any>,
  options: { removeFalsy?: boolean; removeNull?: boolean; recursion?: boolean } = {},
) =>
  Object.fromEntries(
    Object.entries(object)
      .filter(([, v]) => (!options.removeNull && v === null) || (options.removeFalsy ? !!v : v != null))
      .map(([k, v]) => [k, (options.recursion ?? true) && v?.constructor === Object ? removeEmpty(v, options) : v]),
  );

export const toUTS = (time = Date.now(), style: TimestampStylesString = TimestampStyles.RelativeTime) =>
  `<t:${new Date(time).getTime().toString().slice(0, -3)}:${style}>`;

export const appFetch = async (input: RequestInfo, init?: RequestInit) => {
  try {
    const res = await (await fetch(input, init)).text();
    try {
      return JSON.parse(res);
    } catch {
      return res;
    }
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const bufferFetch = async (input: RequestInfo, init?: RequestInit): Promise<Buffer | null> => {
  try {
    const res = await fetch(input, init),
      arrayBuffer = await res.arrayBuffer();

    return Buffer.from(arrayBuffer);
  } catch (e) {
    console.error(e);
    return null;
  }
};

/**
 * Search for an embed field with its name and return its value
 * @returns {string} The value of the field
 * @param {Object} embed The embed that will be used to search for its fields
 * @param {string} fieldName The name of the field that will be searched for
 */
export const getFieldValue = (embed: Embed, fieldName: string): string =>
  embed?.fields?.find(({ name }) => name === fieldName || name.includes(fieldName))?.value ?? null;

/**
 * Adds new parameters to a URL
 * @returns The new URL
 * @param url The URL used to add new parameters
 * @param params The parameters to be added
 */
export const addSearchParams = (url: URL, params: Record<string, string> = {}) =>
  Object.keys(params).length
    ? new URL(
        `${url.origin}${url.pathname}?${new URLSearchParams([
          ...Array.from(url.searchParams.entries()),
          ...Object.entries(params),
        ])}`,
      )
    : url;

/**
 * Differences in months two dates
 * @returns How much months between the two dates
 * @param dateFrom The first date
 * @param dateTo The second date (Default: Current date)
 */
export const monthDiff = (dateFrom: Date | string, dateTo: Date | string = new Date()) =>
  (typeof dateFrom === 'string' ? (dateFrom = new Date(dateFrom)) : dateFrom) &&
  (typeof dateTo === 'string' ? (dateTo = new Date(dateTo)) : dateTo)
    ? dateTo.getMonth() - dateFrom.getMonth() + 12 * (dateTo.getFullYear() - dateFrom.getFullYear())
    : null;

/**
 * Truncates a string with ellipsis
 * @returns The string truncated with ellipsis
 * @param input The string to truncate
 * @param limit The limit of characters to be displayed until truncated (Default: 1024)
 */
export const truncate = (input: string, limit = 1024) =>
  input?.length > limit ? `${input.substring(0, limit - 3)}...` : input;

/**
 * Truncates an array
 * @returns The truncated array
 * @param array The array to truncate
 * @param limit The limit of total characters to be included inside of an array
 * @param extra The extra characters to be added every iteration (Default: 0)
 * @param offset The extra characters to be added to the total length (Default: 0)
 */
export const truncateArray = (array: string[], limit: number, extra = 0, offset = 0) => {
  const copy = [...array],
    lengths = copy.map(v => v.length);
  let index = 0;

  while (limit > offset) {
    index++;
    offset += lengths.shift() + extra;
  }

  return limit ? copy.splice(1 - index) : copy;
};

/**
 * @returns The mapped collections
 * @param collections The collections to map
 * @param options The function's options
 * @param options.mapValue Map something else instead of the mention
 * @param options.maxLength The limit of total characters to be included inside of the mapped collections
 * @param options.maxValues The maximum amount of mapped collections to return (Default: 40)
 * @param options.reverse Whether to reverse the mapping (Default: True)
 */
export const collMap = (
  collections: Collection<string, any>,
  options: {
    mapFunction?: (value: any, key: string, collection: Collection<string, any>) => string;
    maxLength?: number;
    maxValues?: number;
    reverse?: boolean;
  } = {},
) => {
  const { mapFunction = c => `${c}`, maxLength, maxValues = 40, reverse = true } = options,
    cM = discordSort(collections).map(mapFunction);
  let tCM = cM;

  if (reverse) tCM.reverse();
  if (cM.length > maxValues) tCM = tCM.slice(0, maxValues);
  if (maxLength) tCM = truncateArray(tCM, maxLength, 2, 6);
  if (cM.length > tCM.length) tCM.push(`\`+${cM.length - tCM.length}\``);

  return tCM.join(', ');
};

export const arrayMap = (
  array: string[],
  options: {
    autoSort?: boolean;
    mapFunction?: (value: string, index: number, array: string[]) => string;
    maxLength?: number;
    maxValues?: number | null;
    reverse?: boolean;
  } = {},
) => {
  const { autoSort = true, mapFunction = a => a, maxLength, maxValues = 40, reverse } = options,
    aM = array ? (autoSort ? array.sort((a, b) => a.localeCompare(b)).map(mapFunction) : array) : [];
  let tAM = aM;

  if (reverse) tAM.reverse();
  if (maxValues !== null && aM.length > maxValues) tAM = tAM.slice(0, maxValues);
  if (maxLength) tAM = truncateArray(tAM, maxLength, 2, 6);
  if (aM.length > tAM.length) tAM.push(`\`+${aM.length - tAM.length}\``);

  return tAM.join(', ');
};

/**
 * @returns Simplify a string by normalizing and lowercasing it
 * @param string The string to simplify
 */
export const simplify = (string: string) =>
  string
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * @returns The app invite
 * @param id The app id
 */
export const appInvite = (
  id: Snowflake,
  options: {
    disableGuildSelect?: boolean;
    guildId?: Snowflake;
    integrationType?: ApplicationIntegrationType;
    permissions?: PermissionResolvable;
    prompt?: 'none' | 'consent';
    scopes?: readonly OAuth2Scopes[];
    redirectURI?: string;
  } = {},
) => {
  let invite = `https://discord.com/api/oauth2/authorize?client_id=${id}&scope=${options.scopes?.join('%20') || 'app'}`;

  const { disableGuildSelect, guildId, integrationType, permissions, prompt, redirectURI } = options;
  if (permissions) invite += `&permissions=${new PermissionsBitField(permissions).bitfield}`;
  if (guildId) invite += `&guild_id=${guildId}`;
  if (disableGuildSelect) invite += `&disable_guild_select=${disableGuildSelect}`;
  if (redirectURI) invite += `&redirect_uri=${redirectURI}`;
  if (prompt) invite += `&prompt=${prompt}`;
  if (integrationType) invite += `&integration_type=${integrationType}`;

  return invite;
};

export const parseMs = <E extends TimeUnit = never, I extends TimeUnit = TimeUnit>(
  ms: number,
  { excludeUnits, includeUnits }: { excludeUnits?: E[]; includeUnits?: I[] } = {},
) => {
  type FinalUnits = Exclude<I, E>;
  const filteredUnits: FinalUnits[] = (includeUnits || Object.values(TimeUnit)).filter(
      unit => !excludeUnits?.includes(unit as E),
    ) as FinalUnits[],
    unitsObject = filteredUnits.reduce(
      (acc, unit) => {
        const unitValue = timeUnitDivisor[unit];
        if (unitValue) {
          const value = Math.floor(ms / unitValue);
          if (value) acc[unit] = value;
          ms %= unitValue;
        }
        return acc;
      },
      {} as Partial<Record<FinalUnits, number>>,
    );

  return {
    ...unitsObject,
    toLocaleString: (localizer: (phrase: string, replace?: Record<string, any>) => string) =>
      Object.entries(unitsObject)
        .map(([unit, value]) => localizer(`TIME.${getEnumKeyByValue(TimeUnit, unit).toUpperCase()}`, { count: value }))
        .join(' ') || '0s',
    toString: () =>
      Object.entries(unitsObject)
        .map(([unit, value]) => `${value}${unit}`)
        .join(' ') || '0s',
  } as Record<FinalUnits, number> & {
    toLocaleString(localizer: (phrase: string, replace?: Record<string, any>) => string): string;
    toString(): string;
  };
};

export const msToTime = (ms: number) =>
  parseMs(ms, {
    excludeUnits:
      ms > 1000 ? [TimeUnit.Milliseconds, TimeUnit.Weeks, TimeUnit.Months] : [TimeUnit.Weeks, TimeUnit.Months],
  }).toString();

export const search = <O extends Record<any, any>>(object: O, key: keyof typeof object) => {
  let value: (typeof object)[typeof key];
  for (key in object) value = object[key];

  return value;
};

export const searchKey = <O extends Record<any, any>>(object: O, value: (typeof object)[keyof typeof object]) =>
  Object.keys(object).find(key => object[key] === value);
