/** Local notifications through the service worker registration. Everything is feature-detected and never throws. */
export type Perm = 'granted' | 'denied' | 'default' | 'unsupported';

export function permission(): Perm {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<Perm> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function notify(title: string, body: string, tag: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' });
    return true;
  } catch {
    return false;
  }
}

interface PeriodicSync {
  register(tag: string, opts: { minInterval: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
}

/** Best effort: lets Chrome wake the service worker now and then so a reminder can fire with the app closed. */
export async function setPeriodicReminders(on: boolean): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & { periodicSync?: PeriodicSync };
    if (!reg.periodicSync) return;
    if (on) await reg.periodicSync.register('forge-reminders', { minInterval: 60 * 60 * 1000 });
    else await reg.periodicSync.unregister('forge-reminders');
  } catch {
    /* unsupported or not allowed: in-app reminders still work */
  }
}
