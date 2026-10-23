import { describe, expect, it } from 'vitest';
import { Collapse } from '../src/index.js';
import { $id, click, mount, recordEvents } from './helpers.js';

const isOpen = (id) => $id(id).classList.contains('in');

describe('Collapse: data API', () => {
  it('toggles the target via data-target and syncs trigger state', () => {
    mount(`
      <button id="t" class="collapsed" data-toggle="collapse" data-target="#c" aria-expanded="false">x</button>
      <div id="c" class="collapse">content</div>
    `);
    click($id('t'));
    expect(isOpen('c')).toBe(true);
    expect($id('t').classList.contains('collapsed')).toBe(false);
    expect($id('t').getAttribute('aria-expanded')).toBe('true');
    expect($id('c').getAttribute('aria-expanded')).toBe('true');

    click($id('t'));
    expect(isOpen('c')).toBe(false);
    expect($id('t').classList.contains('collapsed')).toBe(true);
    expect($id('t').getAttribute('aria-expanded')).toBe('false');
  });

  it('resolves the target from href and prevents navigation', () => {
    mount('<a id="t" href="#c" data-toggle="collapse">x</a><div id="c" class="collapse"></div>');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    $id('t').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(isOpen('c')).toBe(true);
  });

  it('toggles every element matched by a class selector', () => {
    mount(`
      <button id="t" data-toggle="collapse" data-target=".multi">x</button>
      <div id="a" class="collapse multi"></div><div id="b" class="collapse multi"></div>
    `);
    click($id('t'));
    expect(isOpen('a') && isOpen('b')).toBe(true);
  });

  it('acts as an accordion with data-parent', () => {
    mount(`
      <div class="panel-group" id="acc">
        <div class="panel">
          <a id="t1" data-toggle="collapse" data-parent="#acc" href="#p1">1</a>
          <div id="p1" class="panel-collapse collapse in"></div>
        </div>
        <div class="panel">
          <a id="t2" data-toggle="collapse" data-parent="#acc" href="#p2">2</a>
          <div id="p2" class="panel-collapse collapse"></div>
        </div>
      </div>
    `);
    click($id('t2'));
    expect(isOpen('p2')).toBe(true);
    expect(isOpen('p1')).toBe(false);
    expect($id('t1').classList.contains('collapsed')).toBe(true);

    click($id('t1'));
    expect(isOpen('p1')).toBe(true);
    expect(isOpen('p2')).toBe(false);
  });

  it('ignores disabled triggers and missing targets', () => {
    mount(`
      <button id="t" class="disabled" data-toggle="collapse" data-target="#c">x</button>
      <button id="none" data-toggle="collapse">x</button>
      <button id="bad" data-toggle="collapse" data-target="#[invalid">x</button>
      <div id="c" class="collapse"></div>
    `);
    click($id('t'));
    expect(() => click($id('none'))).not.toThrow();
    expect(() => click($id('bad'))).not.toThrow();
    expect(isOpen('c')).toBe(false);
  });
});

describe('Collapse: events and API', () => {
  it('fires show/shown/hide/hidden and honours preventDefault', () => {
    mount('<div id="c" class="collapse"></div>');
    const log = recordEvents($id('c'), [
      'show.bs.collapse', 'shown.bs.collapse', 'hide.bs.collapse', 'hidden.bs.collapse',
    ]);
    const collapse = Collapse.getOrCreateInstance('#c', { toggle: false });
    collapse.show();
    collapse.hide();
    expect(log.map((e) => e.type)).toEqual([
      'show.bs.collapse', 'shown.bs.collapse', 'hide.bs.collapse', 'hidden.bs.collapse',
    ]);

    const block = (e) => e.preventDefault();
    $id('c').addEventListener('show.bs.collapse', block);
    collapse.show();
    expect(isOpen('c')).toBe(false);
    $id('c').removeEventListener('show.bs.collapse', block);

    collapse.show();
    $id('c').addEventListener('hide.bs.collapse', block);
    collapse.hide();
    expect(isOpen('c')).toBe(true);
  });

  it('toggles on construction by default, like Bootstrap 3', () => {
    mount('<div id="c" class="collapse"></div>');
    Collapse.getOrCreateInstance('#c');
    expect(isOpen('c')).toBe(true);
  });

  it('show/hide are idempotent', () => {
    mount('<div id="c" class="collapse in"></div>');
    const collapse = Collapse.getOrCreateInstance('#c', { toggle: false });
    collapse.show();
    expect(isOpen('c')).toBe(true);
    collapse.toggle();
    collapse.hide();
    expect(isOpen('c')).toBe(false);
  });
});
