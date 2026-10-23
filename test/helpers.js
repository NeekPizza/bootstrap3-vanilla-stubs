import { afterEach } from 'vitest';
import { destroy, init } from '../src/index.js';

export function mount(html) {
  document.body.innerHTML = html;
}

export const $id = (id) => document.getElementById(id);

export function click(element) {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

export function keydown(key, target = document.body) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

/** Record every Bootstrap event of the given types fired on `element` (or bubbling to it). */
export function recordEvents(element, types) {
  const log = [];
  for (const type of types) {
    element.addEventListener(type, (event) => log.push({ type, relatedTarget: event.relatedTarget }));
  }
  return log;
}

afterEach(() => {
  // Close open modals/menus, then re-attach listeners for the next test.
  destroy();
  init();
  document.body.innerHTML = '';
  document.body.className = '';
  document.body.removeAttribute('style');
});
