import {
  SnowflakeUtil,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Snowflake,
  APIEmbedField,
} from 'discord.js';
import { toUTS } from '../utils.js';
import { AppEvents, Event } from '../../lib/structures/Event.js';
import { App } from '../../lib/App.js';
import { ReminderData } from '../../lib/structures/ReminderData.js';

export default class ReminderFoundEvent extends Event {
  constructor() {
    super(AppEvents.ReminderFound);
  }

  async run(client: App, reminder: ReminderData): Promise<any> {
    const { isMainShard, users } = client,
      { content, id, recursive, timestamp, user: userData } = reminder;

    if (!isMainShard) return;

    await reminder.delete();

    const locale = userData?.locale || 'en-US',
      localize = (phrase: string, replace?: Record<string, any>) => client.localize({ locale, phrase }, replace),
      user = await users.fetch(userData.id),
      idTimestamp = SnowflakeUtil.timestampFrom(id),
      msTime = timestamp - idTimestamp,
      row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel(localize('REMINDER.COMPONENT.LIST'))
          .setEmoji('🗒️')
          .setStyle(ButtonStyle.Primary)
          .setCustomId('reminder_list'),
      ),
      fields: APIEmbedField[] = [
        {
          inline: true,
          name: `🪪 ${localize('ID')}`,
          value: `\`${id}\``,
        },
        {
          inline: true,
          name: `📅 ${localize('CREATED')}`,
          value: toUTS(idTimestamp),
        },
      ],
      params: { messageOwners: Snowflake; reminderId?: Snowflake } = { messageOwners: userData.id };

    if (recursive) {
      const recReminderId = SnowflakeUtil.generate().toString(),
        recReminder = await userData.reminders.set(recReminderId, {
          content: content,
          recursive,
          timestamp: SnowflakeUtil.timestampFrom(recReminderId) + msTime,
        });

      params.reminderId = recReminderId;
      fields.push({
        name: `🔁 ${localize('RECURSIVE')}`,
        value: localize('REMINDER.RECURSIVE.ON', { timestamp: toUTS(recReminder.timestamp) }),
      });

      row.addComponents(
        new ButtonBuilder()
          .setLabel(localize('EDIT'))
          .setEmoji('📝')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId('reminder_edit'),
      );
    }

    const emb = client
      .embedBuilder({
        addParams: params,
        color: Colors.Yellow,
        localizer: localize,
        timestamp,
        title: `${client.useEmoji('bellRinging')} ${localize('REMINDER.NEW')}`,
        user,
      })
      .setDescription(content)
      .addFields(fields);

    return user.send({
      components: [row],
      embeds: [emb],
    });
  }
}
