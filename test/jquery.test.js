import { describe, expect, it, vi } from 'vitest';
import Bootstrap3VanillaStubs, {
  Collapse, Dropdown, Modal, createJQueryShim, destroy, init, installJQueryShim,
} from '../src/index.js';
import { $id, click, mount } from './helpers.js';

describe('global fallback', () => {
  it('exposes the API on window and auto-installs the jQuery shim', () => {
    expect(window.Bootstrap3VanillaStubs).toBe(Bootstrap3VanillaStubs);
    expect(window.jQuery.__bs3VanillaShim).toBe(true);
    expect(window.$).toBe(window.jQuery);
  });

  it('init is idempotent and destroy detaches the data API', () => {
    mount('<button id="t" data-toggle="collapse" data-target="#c"></button><div id="c" class="collapse"></div>');
    init();
    init({ jqueryShim: false });
    click($id('t'));
    expect($id('c').classList.contains('in')).toBe(true); // toggled once, not twice

    destroy();
    click($id('t'));
    expect($id('c').classList.contains('in')).toBe(true);
  });
});

describe('jQuery shim: plugin methods', () => {
  const $ = createJQueryShim();

  it('.modal() supports show/hide/toggle and option objects, and chains', () => {
    mount('<div class="modal" id="m"></div>');
    const result = $('#m').modal('show');
    expect(result).toBeInstanceOf($.fn.constructor);
    expect(Modal.getInstance('#m').isShown).toBe(true);

    $('#m').modal('hide');
    expect(Modal.getInstance('#m').isShown).toBe(false);
    $('#m').modal('toggle');
    expect(Modal.getInstance('#m').isShown).toBe(true);
  });

  it('.modal(options) creates and shows unless show: false', () => {
    mount('<div class="modal" id="a"></div><div class="modal" id="b"></div>');
    $('#a').modal({ backdrop: 'static', keyboard: false });
    expect(Modal.getInstance('#a').isShown).toBe(true);
    expect(Modal.getInstance('#a').options).toMatchObject({ backdrop: 'static', keyboard: false });

    $('#b').modal({ show: false });
    expect(Modal.getInstance('#b').isShown).toBe(false);
    $('#b').modal();
    expect(Modal.getInstance('#b').isShown).toBe(false);
  });

  it('.dropdown(), .collapse() and .tab() map onto the plugins', () => {
    mount(`
      <div class="dropdown" id="dd"><button id="t" data-toggle="dropdown"></button><ul class="dropdown-menu"></ul></div>
      <div id="c" class="collapse"></div>
      <ul class="nav"><li class="active"><a href="#p1" data-toggle="tab">1</a></li><li id="li2"><a id="tab2" href="#p2" data-toggle="tab">2</a></li></ul>
      <div class="tab-content"><div class="tab-pane active" id="p1"></div><div class="tab-pane" id="p2"></div></div>
    `);
    $('#t').dropdown();
    expect($id('dd').classList.contains('open')).toBe(false);
    $('#t').dropdown('toggle');
    expect($id('dd').classList.contains('open')).toBe(true);
    expect(Dropdown.getInstance('#t')).not.toBeNull();

    $('#c').collapse('show');
    expect($id('c').classList.contains('in')).toBe(true);
    $('#c').collapse('toggle');
    expect($id('c').classList.contains('in')).toBe(false);
    $('#c').collapse();
    expect($id('c').classList.contains('in')).toBe(false); // existing instance: no-op, like BS3

    mount('<div id="fresh" class="collapse"></div>');
    $('#fresh').collapse({ toggle: true });
    expect($id('fresh').classList.contains('in')).toBe(true);
    expect(Collapse.getInstance('#fresh')).not.toBeNull();

    mount(`
      <ul class="nav"><li class="active"><a href="#p1" data-toggle="tab">1</a></li><li id="li2"><a id="tab2" href="#p2" data-toggle="tab">2</a></li></ul>
      <div class="tab-content"><div class="tab-pane active" id="p1"></div><div class="tab-pane" id="p2"></div></div>
    `);
    $('#tab2').tab('show');
    expect($id('li2').classList.contains('active')).toBe(true);
  });

  it('unknown methods warn instead of throwing; unimplemented plugins are no-ops', () => {
    mount('<div class="modal" id="m"></div>');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => $('#m').modal('explode')).not.toThrow();
    expect(() => $('#m').modal('_private')).not.toThrow();
    expect(() => $('#m').modal('constructor')).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();

    for (const name of ['tooltip', 'popover', 'carousel', 'scrollspy', 'affix', 'alert', 'button']) {
      const collection = $('#m');
      expect(collection[name]('anything')).toBe(collection);
    }
  });

  it('exposes Constructor on plugin methods like Bootstrap 3', () => {
    expect($.fn.modal.Constructor).toBe(Modal);
  });
});

describe('jQuery shim: core helpers', () => {
  const $ = createJQueryShim();

  it('selects by selector, element, array, context, and shim collection', () => {
    mount('<div id="wrap"><p class="x">a</p><p class="x">b</p></div><p class="x">c</p>');
    expect($('.x').length).toBe(3);
    expect($('.x', '#wrap').length).toBe(2);
    expect($($id('wrap')).get(0)).toBe($id('wrap'));
    expect($([$id('wrap'), null]).length).toBe(1);
    const collection = $('.x');
    expect($(collection)).toBe(collection);
    expect($('#wrap').find('.x').length).toBe(2);
    expect($('.x').get(-1).textContent).toBe('c');
    expect($('.x').get()).toHaveLength(3);
    expect($(null).length).toBe(0);
    expect($({}).length).toBe(0);
    expect($('[[invalid').length).toBe(0);
    expect($('.x', '#nope').length).toBe(0);
  });

  it('warns on HTML strings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect($('<div>').length).toBe(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('runs ready callbacks', async () => {
    const ready = vi.fn();
    $(ready);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(ready).toHaveBeenCalledWith($);
  });

  it('defers ready callbacks until DOMContentLoaded while loading', () => {
    const state = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const ready = vi.fn();
    $(ready);
    state.mockRestore();
    expect(ready).not.toHaveBeenCalled();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(ready).toHaveBeenCalledWith($);
  });

  it('class helpers chain', () => {
    mount('<div id="d" class="a"></div>');
    $('#d').addClass('b c').removeClass('a').toggleClass('d');
    expect($id('d').className).toBe('b c d');
    expect($('#d').hasClass('c')).toBe(true);
    $('#d').toggleClass('d', true);
    expect($('#d').hasClass('d')).toBe(true);
  });

  it('on/off/one bind Bootstrap events and namespaced native events', () => {
    mount('<div class="modal" id="m"></div><button id="b"></button>');
    const shown = vi.fn();
    const clicked = vi.fn();
    const onceHandler = vi.fn();

    $('#m').on('shown.bs.modal', shown);
    $('#b').on('click.myns', clicked).one('click', onceHandler);
    $('#m').modal('show');
    $('#b').trigger('click');
    $('#b').trigger('click');

    expect(shown).toHaveBeenCalledTimes(1);
    expect(shown.mock.contexts[0]).toBe($id('m'));
    expect(clicked).toHaveBeenCalledTimes(2);
    expect(onceHandler).toHaveBeenCalledTimes(1);

    $('#b').off('.myns');
    $('#b').trigger('click');
    expect(clicked).toHaveBeenCalledTimes(2);
  });

  it('supports delegated handlers, returning false, and off() variants', () => {
    mount('<ul id="list"><li><a id="link" href="#">x</a></li></ul><a id="other" href="#">y</a>');
    const handler = vi.fn(() => false);
    $('#list').on('click', 'a', handler);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    $id('link').dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.contexts[0]).toBe($id('link'));
    expect(event.defaultPrevented).toBe(true);

    click($id('list'));
    expect(handler).toHaveBeenCalledTimes(1);

    $('#list').off('click', 'a', handler);
    click($id('link'));
    expect(handler).toHaveBeenCalledTimes(1);

    const other = vi.fn();
    $('#other').on('focus custom', other).off();
    $('#other').trigger('custom');
    $('#other').off('click');
    expect(other).not.toHaveBeenCalled();
  });

  it('one() supports a delegate selector', () => {
    mount('<div id="wrap"><span id="s"></span></div>');
    const handler = vi.fn();
    $('#wrap').one('custom', 'span', handler);
    $('#s').trigger('custom.ns');
    $('#s').trigger('custom');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('real jQuery integration', () => {
  function fakeJQuery() {
    const triggered = [];
    const jq = (element) => ({
      trigger(event) {
        triggered.push({ element, event });
        if (event.type === 'show.bs.modal' && jq.block) event.prevented = true;
      },
    });
    jq.fn = { jquery: '3.7.1' };
    jq.Event = (type, props) => ({
      type,
      ...props,
      prevented: false,
      isDefaultPrevented() {
        return this.prevented;
      },
    });
    jq.triggered = triggered;
    return jq;
  }

  it('adds missing plugins to jQuery.fn without clobbering existing ones', () => {
    const saved = window.jQuery;
    const jq = fakeJQuery();
    const existingTooltip = () => {};
    jq.fn.tooltip = existingTooltip;
    window.jQuery = jq;
    try {
      expect(installJQueryShim()).toBe(jq);
      expect(typeof jq.fn.modal).toBe('function');
      expect(jq.fn.tooltip).toBe(existingTooltip);

      installJQueryShim({ force: true });
      expect(jq.fn.tooltip).not.toBe(existingTooltip);
    } finally {
      window.jQuery = saved;
    }
  });

  it('mirrors Bootstrap events through jQuery so .on("shown.bs.modal") handlers fire', () => {
    const saved = window.jQuery;
    const jq = fakeJQuery();
    window.jQuery = jq;
    try {
      mount('<button id="t" data-toggle="modal" data-target="#m"></button><div class="modal" id="m"></div>');
      click($id('t'));
      const types = jq.triggered.map((t) => t.event.type);
      expect(types).toEqual(['show.bs.modal', 'shown.bs.modal']);
      expect(jq.triggered[0].event.relatedTarget).toBe($id('t'));

      Modal.getInstance('#m').hide();
      jq.block = true;
      click($id('t'));
      expect(Modal.getInstance('#m').isShown).toBe(false);
    } finally {
      window.jQuery = saved;
    }
  });

  it('installs window.jQuery but leaves an existing window.$ alone', () => {
    const savedJQ = window.jQuery;
    const saved$ = window.$;
    const other = () => 'not jquery';
    window.jQuery = undefined;
    window.$ = other;
    try {
      const shim = installJQueryShim();
      expect(window.jQuery).toBe(shim);
      expect(window.$).toBe(other);
    } finally {
      window.jQuery = savedJQ;
      window.$ = saved$;
    }
  });
});
