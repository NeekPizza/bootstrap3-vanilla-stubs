import { describe, expect, it, vi } from 'vitest';
import { Modal } from '../src/index.js';
import { $id, click, keydown, mount, recordEvents } from './helpers.js';

const MODAL_HTML = `
  <button id="open" data-toggle="modal" data-target="#m">Open</button>
  <a id="open-link" href="#m" data-toggle="modal">Open link</a>
  <div class="modal fade" id="m" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog"><div class="modal-content" id="content">
      <button id="close" type="button" class="close" data-dismiss="modal">&times;</button>
      <input id="field">
    </div></div>
  </div>
  <button id="outside">Outside</button>
`;

const isOpen = (el) => el.classList.contains('in') && el.style.display === 'block';

describe('Modal: data API', () => {
  it('opens from a data-toggle="modal" trigger and adds a backdrop', () => {
    mount(MODAL_HTML);
    click($id('open'));

    const modal = $id('m');
    expect(isOpen(modal)).toBe(true);
    expect(modal.getAttribute('aria-hidden')).toBe('false');
    expect(document.body.classList.contains('modal-open')).toBe(true);
    const backdrop = document.querySelector('.modal-backdrop');
    expect(backdrop).not.toBeNull();
    expect(backdrop.classList.contains('in')).toBe(true);
    expect(backdrop.classList.contains('fade')).toBe(true);
    expect(document.activeElement).toBe(modal);
  });

  it('resolves the target from href and prevents link navigation', () => {
    mount(MODAL_HTML);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    $id('open-link').dispatchEvent(event);

    expect(isOpen($id('m'))).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it('closes via data-dismiss="modal" and restores focus to the trigger', () => {
    mount(MODAL_HTML);
    click($id('open'));
    click($id('close'));

    const modal = $id('m');
    expect(isOpen(modal)).toBe(false);
    expect(modal.style.display).toBe('none');
    expect(modal.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('.modal-backdrop')).toBeNull();
    expect(document.body.classList.contains('modal-open')).toBe(false);
    expect(document.activeElement).toBe($id('open'));
  });

  it('closes when the background (the .modal element itself) is clicked', () => {
    mount(MODAL_HTML);
    click($id('open'));
    click($id('content'));
    expect(isOpen($id('m'))).toBe(true);

    click($id('m'));
    expect(isOpen($id('m'))).toBe(false);
  });

  it('closes when the backdrop element is clicked', () => {
    mount(MODAL_HTML);
    click($id('open'));
    click(document.querySelector('.modal-backdrop'));
    expect(isOpen($id('m'))).toBe(false);
  });

  it('ignores background clicks with data-backdrop="static"', () => {
    mount(MODAL_HTML);
    $id('m').setAttribute('data-backdrop', 'static');
    click($id('open'));
    click($id('m'));
    expect(isOpen($id('m'))).toBe(true);
  });

  it('closes on Escape', () => {
    mount(MODAL_HTML);
    click($id('open'));
    keydown('Escape');
    expect(isOpen($id('m'))).toBe(false);
  });

  it('ignores Escape with data-keyboard="false"', () => {
    mount(MODAL_HTML);
    $id('m').setAttribute('data-keyboard', 'false');
    click($id('open'));
    keydown('Escape');
    expect(isOpen($id('m'))).toBe(true);
  });

  it('reads backdrop/keyboard options from the trigger', () => {
    mount(MODAL_HTML);
    $id('open').setAttribute('data-backdrop', 'false');
    click($id('open'));
    expect(document.querySelector('.modal-backdrop')).toBeNull();
    expect(isOpen($id('m'))).toBe(true);
  });

  it('toggles an existing instance from its trigger', () => {
    mount(MODAL_HTML);
    click($id('open'));
    Modal.getInstance('#m').hide();
    click($id('open'));
    expect(isOpen($id('m'))).toBe(true);
  });

  it('does nothing for disabled triggers or missing targets', () => {
    mount(`${MODAL_HTML}<button id="bad" data-toggle="modal" data-target="#nope">x</button>`);
    $id('open').classList.add('disabled');
    click($id('open'));
    click($id('bad'));
    expect(isOpen($id('m'))).toBe(false);
  });

  it('keeps focus inside the open modal', () => {
    mount(MODAL_HTML);
    click($id('open'));
    $id('outside').focus();
    expect(document.activeElement).toBe($id('m'));

    $id('field').focus();
    expect(document.activeElement).toBe($id('field'));
  });
});

describe('Modal: events', () => {
  it('fires show/shown/hide/hidden with relatedTarget', () => {
    mount(MODAL_HTML);
    const log = recordEvents($id('m'), ['show.bs.modal', 'shown.bs.modal', 'hide.bs.modal', 'hidden.bs.modal']);
    click($id('open'));
    click($id('close'));

    expect(log.map((e) => e.type)).toEqual([
      'show.bs.modal', 'shown.bs.modal', 'hide.bs.modal', 'hidden.bs.modal',
    ]);
    expect(log[0].relatedTarget).toBe($id('open'));
    expect(log[1].relatedTarget).toBe($id('open'));
  });

  it('cancels showing when show.bs.modal is prevented', () => {
    mount(MODAL_HTML);
    $id('m').addEventListener('show.bs.modal', (e) => e.preventDefault());
    click($id('open'));
    expect(isOpen($id('m'))).toBe(false);
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });

  it('cancels hiding when hide.bs.modal is prevented', () => {
    mount(MODAL_HTML);
    click($id('open'));
    $id('m').addEventListener('hide.bs.modal', (e) => e.preventDefault());
    keydown('Escape');
    expect(isOpen($id('m'))).toBe(true);
  });

  it('events bubble so they can be delegated from document', () => {
    mount(MODAL_HTML);
    const handler = vi.fn();
    document.addEventListener('shown.bs.modal', handler);
    click($id('open'));
    document.removeEventListener('shown.bs.modal', handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].target).toBe($id('m'));
  });
});

describe('Modal: programmatic API', () => {
  it('show/hide/toggle work and are idempotent', () => {
    mount(MODAL_HTML);
    const modal = Modal.getOrCreateInstance('#m');
    expect(Modal.getOrCreateInstance($id('m'))).toBe(modal);

    modal.show();
    modal.show();
    expect(document.querySelectorAll('.modal-backdrop')).toHaveLength(1);
    modal.toggle();
    expect(isOpen($id('m'))).toBe(false);
    modal.hide();
    modal.toggle();
    expect(isOpen($id('m'))).toBe(true);
    expect(() => modal.handleUpdate()).not.toThrow();
  });

  it('stacks modals: body stays modal-open until the last one closes', () => {
    mount(`${MODAL_HTML}<div class="modal" id="m2"></div>`);
    const first = Modal.getOrCreateInstance('#m');
    const second = Modal.getOrCreateInstance('#m2');
    first.show();
    second.show();
    expect(document.querySelectorAll('.modal-backdrop')).toHaveLength(2);

    keydown('Escape');
    expect(second.isShown).toBe(false);
    expect(first.isShown).toBe(true);
    expect(document.body.classList.contains('modal-open')).toBe(true);

    first.hide();
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });

  it('adds tabindex when missing and gives no backdrop fade for non-fade modals', () => {
    mount('<div class="modal" id="plain"></div>');
    Modal.getOrCreateInstance('#plain', { backdrop: true }).show();
    expect($id('plain').getAttribute('tabindex')).toBe('-1');
    expect(document.querySelector('.modal-backdrop').classList.contains('fade')).toBe(false);
  });

  it('dispose hides the modal and forgets the instance', () => {
    mount(MODAL_HTML);
    const modal = Modal.getOrCreateInstance('#m');
    modal.show();
    modal.dispose();
    expect(isOpen($id('m'))).toBe(false);
    expect(Modal.getInstance('#m')).toBeNull();
  });

  it('getInstance returns null for unknown elements', () => {
    expect(Modal.getInstance('#does-not-exist')).toBeNull();
    expect(Modal.getOrCreateInstance(null)).toBeNull();
  });
});
