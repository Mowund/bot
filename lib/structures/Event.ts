/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */

import { Events } from 'discord.js';
import { App } from '../App.js';

export class Event {
  name: AppEvents | Events;
  once: boolean;

  constructor(name: AppEvents | Events, once?: boolean) {
    this.name = name;
    this.once = once;
  }

  run(client: App, ...data: any): Promise<any> {
    throw new SyntaxError('This should be overwritten in the actual event!');
  }
}

export enum AppEvents {
  ReminderFound = 'reminderFound',
  UpdateDB = 'updateDB',
}
