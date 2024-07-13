import { URL } from 'node:url';
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
} from 'discord.js';
import { firestore } from 'firebase-admin';

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
              ? isComponentDisabled ?? false
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

export const testConditions = (search: SearchOptions[][], destructure: { [x: string]: any }) => {
  if (!Array.isArray(search)) return false;

  const comparators = {
      '!=': (a: any, b: any) => a !== b,
      '<': (a: any, b: any) => a < b,
      '<=': (a: any, b: any) => a <= b,
      '==': (a: any, b: any) => a === b,
      '>': (a: any, b: any) => a > b,
      '>=': (a: any, b: any) => a >= b,
      'array-contains': (a: any[], b: any) => a.includes(b),
      'array-contains-any': (a: any, b: any[]) => b.some((c: any) => a.includes(c)),
      in: (a: any, b: any) => b.includes(a),
      'not-in': (a: any, b: any) => !b.includes(a),
    },
    test = (obj: SearchOptions) =>
      comparators[destructure?.[obj.operator] ?? obj.operator]?.(destructure?.[obj.field] ?? obj.field, obj.target);

  return search.some(x => x.every(y => test(y)));
};

export interface SearchOptions {
  /** The condition's left operand */
  field: any;
  /** The condition's operator */
  operator: firestore.WhereFilterOp;
  /** The condition's right operand */
  target: any;
}

export const decreaseSizeCDN = async (url: string, options: { initialSize?: number; maxSize?: number } = {}) => {
  const { initialSize, maxSize } = options,
    fileSize = (await appFetch(url))?.data.length;

  let sizes = [4096, 2048, 1024, 600, 512, 300, 256, 128, 96, 64, 56, 32, 16],
    otherFileSize = fileSize;

  if (initialSize) sizes = sizes.filter(i => i < initialSize);
  while (maxSize ? maxSize < otherFileSize : fileSize === otherFileSize) {
    url = `${beforeMatch(url, '?')}?size=${sizes.shift()}`;
    otherFileSize = (await appFetch(url))?.data.length;
  }
  return url;
};

export const isEmpty = (obj: Record<any, any>) => {
  for (const prop in obj) if (Object.hasOwn(obj, prop)) return false;
  return true;
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
 */
export const truncateArray = (array: string[], limit: number) => {
  const copy = [...array],
    lengths = copy.map(v => v.length);
  let index = 0,
    length = 0;

  while (limit > length) {
    index++;
    length += lengths.shift();
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
  if (maxLength) tCM = truncateArray(tCM, maxLength);
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
  if (maxLength) tAM = truncateArray(tAM, maxLength);
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
  let invite = `https://discord.com/api/oauth2/authorize?client_id=${id}&scope=${options.scopes?.join('%20') || 'bot'}`;

  const { disableGuildSelect, guildId, integrationType, permissions, prompt, redirectURI } = options;
  if (permissions) invite += `&permissions=${new PermissionsBitField(permissions).bitfield}`;
  if (guildId) invite += `&guild_id=${guildId}`;
  if (disableGuildSelect) invite += `&disable_guild_select=${disableGuildSelect}`;
  if (redirectURI) invite += `&redirect_uri=${redirectURI}`;
  if (prompt) invite += `&prompt=${prompt}`;
  if (integrationType) invite += `&integration_type=${integrationType}`;

  return invite;
};

export const msToTime = (ms: number) => {
  const years = Math.floor(ms / 31536000000),
    days = Math.floor((ms % 31536000000) / 86400000),
    hours = Math.floor((ms % 86400000) / 3600000),
    minutes = Math.floor((ms % 3600000) / 60000),
    secs = Math.floor((ms % 60000) / 1000),
    miliSecs = Math.floor(ms % 1000);

  let str = '';
  if (years) str += `${years}y `;
  if (days) str += `${days}d `;
  if (hours) str += `${hours}h `;
  if (minutes) str += `${minutes}m `;
  if (secs) str += `${secs}s `;
  if (miliSecs) str += `${miliSecs}ms`;

  return str.trim() || '0s';
};

export const search = <O extends Record<any, any>>(object: O, key: keyof typeof object) => {
  let value: (typeof object)[typeof key];
  for (key in object) value = object[key];

  return value;
};

export const searchKey = <O extends Record<any, any>>(object: O, value: (typeof object)[keyof typeof object]) =>
  Object.keys(object).find(key => object[key] === value);
