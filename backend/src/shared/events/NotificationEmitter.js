'use strict';
const EventEmitter = require('events');

/**
 * NotificationEmitter — application-wide event bus for notification events.
 *
 * Design Patterns demonstrated:
 *  - Singleton  : only one instance exists (via static getInstance())
 *  - Observer   : emitters publish events; subscribers react without tight coupling
 *
 * Usage:
 *   // Publisher (e.g. budgetAlertJob):
 *   notificationEmitter.emit('budget.alert', { userId, budget, percentage, userEmail, emailEnabled });
 *
 *   // Subscriber (e.g. notifications.service):
 *   notificationEmitter.on('budget.alert', handler);
 */
class NotificationEmitter extends EventEmitter {
  /** @type {NotificationEmitter|null} */
  static #instance = null;

  constructor() {
    super();
    this.setMaxListeners(20);
  }

  /**
   * Returns the single shared instance (Singleton pattern).
   * @returns {NotificationEmitter}
   */
  static getInstance() {
    if (!NotificationEmitter.#instance) {
      NotificationEmitter.#instance = new NotificationEmitter();
    }
    return NotificationEmitter.#instance;
  }
}

module.exports = NotificationEmitter.getInstance();
