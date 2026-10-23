import { describe, expect, it } from 'vitest';
import { Dropdown } from '../src/index.js';
import { $id, click, keydown, mount, recordEvents } from './helpers.js';

const DROPDOWN_HTML = `
  <div class="dropdown" id="dd1">
    <button id="t1" class="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">Menu 1</button>
    <ul class="dropdown-menu">
      <li><a id="i1" href="#">One</a></li>
      <li class="divider"></li>
      <li class="disabled"><a id="i-disabled" href="#">Disabled</a></li>
      <li><a id="i2" href="#">Two</a></li>
    </ul>
    <form><input id="search"></form>
  </div>
  <div class="dropdown" id="dd2">
    <a id="t2" href="#" data-toggle="dropdown">Menu 2</a>
    <ul class="dropdown-menu"><li><a href="#">Three</a></li></ul>
  </div>
  <button id="outside">Outside</button>
`;

const isOpen = (id) => $id(id).classList.contains('open');

describe('Dropdown: data API', () => {
  it('toggles the parent .open class and aria-expanded on click', () => {
    mount(DROPDOWN_HTML);
    click($id('t1'));
    expect(isOpen('dd1')).toBe(true);
    expect($id('t1').getAttribute('aria-expanded')).toBe('true');

    click($id('t1'));
    expect(isOpen('dd1')).toBe(false);
    expect($id('t1').getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on an outside click', () => {
    mount(DROPDOWN_HTML);
    click($id('t1'));
    click($id('outside'));
    expect(isOpen('dd1')).toBe(false);
  });

  it('closes when a menu item is clicked', () => {
    mount(DROPDOWN_HTML);
    click($id('t1'));
    click($id('i1'));
    expect(isOpen('dd1')).toBe(false);
  });

  it('stays open for clicks inside a form in the dropdown', () => {
    mount(DROPDOWN_HTML);
    click($id('t1'));
    click($id('search'));
    expect(isOpen('dd1')).toBe(true);
  });

  it('only one menu is open at a time', () => {
    mount(DROPDOWN_HTML);
    click($id('t1'));
    click($id('t2'));
    expect(isOpen('dd1')).toBe(false);
    expect(isOpen('dd2')).toBe(true);
  });

  it('prevents default navigation on anchor toggles', () => {
    mount(DROPDOWN_HTML);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    $id('t2').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores disabled toggles', () => {
    mount(DROPDOWN_HTML);
    $id('t1').setAttribute('disabled', '');
    click($id('t1'));
    expect(isOpen('dd1')).toBe(false);
  });

  it('supports data-target pointing at a separate parent', () => {
    mount(`
      <div id="host"><ul class="dropdown-menu"></ul></div>
      <button id="remote" data-toggle="dropdown" data-target="#host">x</button>
    `);
    click($id('remote'));
    expect(isOpen('host')).toBe(true);
  });
});

describe('Dropdown: keyboard', () => {
  it('closes on Escape and returns focus to the toggle', () => {
    mount(DROPDOWN_HTML);
    click($id('t1'));
    $id('i1').focus();
    keydown('Escape', $id('i1'));
    expect(isOpen('dd1')).toBe(false);
    expect(document.activeElement).toBe($id('t1'));
  });

  it('opens with ArrowDown on the toggle, then moves through enabled items', () => {
    mount(DROPDOWN_HTML);
    $id('t1').focus();
    const event = keydown('ArrowDown', $id('t1'));
    expect(event.defaultPrevented).toBe(true);
    expect(isOpen('dd1')).toBe(true);

    keydown('ArrowDown', $id('t1'));
    expect(document.activeElement).toBe($id('i1'));
    keydown('ArrowDown', $id('i1'));
    expect(document.activeElement).toBe($id('i2'));
    keydown('ArrowDown', $id('i2'));
    expect(document.activeElement).toBe($id('i2'));
    keydown('ArrowUp', $id('i2'));
    expect(document.activeElement).toBe($id('i1'));
  });

  it('ignores arrow keys typed into inputs or outside dropdowns', () => {
    mount(DROPDOWN_HTML);
    click($id('t1'));
    expect(keydown('ArrowDown', $id('search')).defaultPrevented).toBe(false);
    expect(keydown('ArrowDown', $id('outside')).defaultPrevented).toBe(false);
  });

  it('does nothing on arrows when the menu has no items', () => {
    mount('<div class="dropdown" id="empty"><button id="te" data-toggle="dropdown">x</button><ul class="dropdown-menu"></ul></div>');
    $id('te').focus();
    keydown('ArrowDown', $id('te'));
    expect(() => keydown('ArrowDown', $id('te'))).not.toThrow();
    expect(isOpen('empty')).toBe(true);
  });
});

describe('Dropdown: events and API', () => {
  it('fires show/shown/hide/hidden on the parent with the toggle as relatedTarget', () => {
    mount(DROPDOWN_HTML);
    const log = recordEvents($id('dd1'), [
      'show.bs.dropdown', 'shown.bs.dropdown', 'hide.bs.dropdown', 'hidden.bs.dropdown',
    ]);
    click($id('t1'));
    click($id('outside'));
    expect(log.map((e) => e.type)).toEqual([
      'show.bs.dropdown', 'shown.bs.dropdown', 'hide.bs.dropdown', 'hidden.bs.dropdown',
    ]);
    expect(log.every((e) => e.relatedTarget === $id('t1'))).toBe(true);
  });

  it('respects preventDefault on show and hide', () => {
    mount(DROPDOWN_HTML);
    const stopShow = (e) => e.preventDefault();
    $id('dd1').addEventListener('show.bs.dropdown', stopShow);
    click($id('t1'));
    expect(isOpen('dd1')).toBe(false);

    $id('dd1').removeEventListener('show.bs.dropdown', stopShow);
    $id('dd1').addEventListener('hide.bs.dropdown', (e) => e.preventDefault());
    click($id('t1'));
    click($id('outside'));
    expect(isOpen('dd1')).toBe(true);
  });

  it('exposes toggle/show/hide programmatically', () => {
    mount(DROPDOWN_HTML);
    const dropdown = Dropdown.getOrCreateInstance('#t1');
    dropdown.toggle();
    expect(isOpen('dd1')).toBe(true);
    dropdown.show();
    expect(isOpen('dd1')).toBe(true);
    dropdown.hide();
    dropdown.hide();
    expect(isOpen('dd1')).toBe(false);
  });
});
