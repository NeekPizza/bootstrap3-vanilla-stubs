import { describe, expect, it } from 'vitest';
import { Tab } from '../src/index.js';
import { $id, click, mount, recordEvents } from './helpers.js';

const TABS_HTML = `
  <ul class="nav nav-tabs" id="nav">
    <li class="active" id="li-home"><a id="t-home" href="#home" data-toggle="tab" aria-expanded="true">Home</a></li>
    <li id="li-profile"><a id="t-profile" href="#profile" data-toggle="tab">Profile</a></li>
    <li class="dropdown" id="li-more">
      <a id="t-more" href="#" class="dropdown-toggle" data-toggle="dropdown">More</a>
      <ul class="dropdown-menu">
        <li id="li-extra"><a id="t-extra" href="#extra" data-toggle="tab">Extra</a></li>
      </ul>
    </li>
    <li class="disabled"><a id="t-disabled" class="disabled" href="#profile" data-toggle="tab">Off</a></li>
  </ul>
  <div class="tab-content">
    <div class="tab-pane fade in active" id="home"></div>
    <div class="tab-pane fade" id="profile"></div>
    <div class="tab-pane fade" id="extra"></div>
  </div>
`;

const active = (id) => $id(id).classList.contains('active');

describe('Tab: data API', () => {
  it('switches the active tab and pane on click', () => {
    mount(TABS_HTML);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    $id('t-profile').dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(active('li-profile')).toBe(true);
    expect(active('li-home')).toBe(false);
    expect(active('profile')).toBe(true);
    expect($id('profile').classList.contains('in')).toBe(true);
    expect(active('home')).toBe(false);
    expect($id('home').classList.contains('in')).toBe(false);
    expect($id('t-profile').getAttribute('aria-expanded')).toBe('true');
    expect($id('t-home').getAttribute('aria-expanded')).toBe('false');
  });

  it('activates tabs inside a dropdown and marks the dropdown li active', () => {
    mount(TABS_HTML);
    click($id('t-extra'));
    expect(active('li-extra')).toBe(true);
    expect(active('li-more')).toBe(true);
    expect(active('extra')).toBe(true);

    click($id('t-home'));
    expect(active('li-more')).toBe(false);
    expect(active('li-extra')).toBe(false);
    expect(active('home')).toBe(true);
  });

  it('supports data-toggle="pill" and non-fade panes', () => {
    mount(`
      <ul class="nav nav-pills"><li class="active"><a href="#a" data-toggle="pill">A</a></li>
      <li id="li-b"><a id="pb" href="#b" data-toggle="pill">B</a></li></ul>
      <div class="tab-content"><div class="tab-pane active" id="a"></div><div class="tab-pane" id="b"></div></div>
    `);
    click($id('pb'));
    expect(active('li-b')).toBe(true);
    expect(active('b')).toBe(true);
    expect($id('b').classList.contains('in')).toBe(false);
  });

  it('ignores disabled tabs and already-active tabs', () => {
    mount(TABS_HTML);
    const log = recordEvents(document, ['show.bs.tab']);
    click($id('t-disabled'));
    click($id('t-home'));
    expect(log).toHaveLength(0);
    expect(active('home')).toBe(true);
  });
});

describe('Tab: events and API', () => {
  it('fires hide/show/hidden/shown with relatedTarget', () => {
    mount(TABS_HTML);
    const log = recordEvents(document, ['hide.bs.tab', 'show.bs.tab', 'hidden.bs.tab', 'shown.bs.tab']);
    click($id('t-profile'));

    expect(log.map((e) => e.type)).toEqual(['hide.bs.tab', 'show.bs.tab', 'hidden.bs.tab', 'shown.bs.tab']);
    expect(log[0].relatedTarget).toBe($id('t-profile'));
    expect(log[1].relatedTarget).toBe($id('t-home'));
    expect(log[3].relatedTarget).toBe($id('t-home'));
  });

  it('cancels when show.bs.tab or hide.bs.tab is prevented', () => {
    mount(TABS_HTML);
    const block = (e) => e.preventDefault();
    $id('t-profile').addEventListener('show.bs.tab', block);
    click($id('t-profile'));
    expect(active('li-profile')).toBe(false);

    $id('t-profile').removeEventListener('show.bs.tab', block);
    $id('t-home').addEventListener('hide.bs.tab', block);
    click($id('t-profile'));
    expect(active('li-profile')).toBe(false);
  });

  it('show() works programmatically, including with no previous tab or pane', () => {
    mount(`
      <ul class="nav"><li id="li"><a id="lonely" href="#missing" data-toggle="tab">x</a></li></ul>
      <a id="orphan" data-toggle="tab" href="#missing">no li</a>
    `);
    Tab.getOrCreateInstance('#lonely').show();
    expect(active('li')).toBe(true);
    expect(() => Tab.getOrCreateInstance('#orphan').show()).not.toThrow();
  });
});
