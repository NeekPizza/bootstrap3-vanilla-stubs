/*!
 * bootstrap3-vanilla-stubs
 * Dependency-free replacement for Bootstrap 3's JavaScript plugins.
 * MIT License
 */

const hasDOM = typeof window !== 'undefined' && typeof document !== 'undefined';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise a selector / element / NodeList / array-like into an array of elements. */
function toElements(target, context) {
  if (target == null) return [];
  if (typeof target === 'string') {
    const root = context ? toElements(context)[0] : document;
    if (!root || typeof root.querySelectorAll !== 'function') return [];
    try {
      return Array.from(root.querySelectorAll(target));
    } catch {
      return [];
    }
  }
  if (target.nodeType || target === window) return [target];
  if (typeof target.length === 'number') return Array.from(target).filter(Boolean);
  return [];
}

/** Bootstrap 3 target resolution: `data-target` first, then a `#hash` href. */
function getTargetSelector(trigger) {
  let selector = trigger.getAttribute('data-target');
  if (!selector || selector === '#') {
    const href = trigger.getAttribute('href');
    selector = href ? href.replace(/.*(?=#[^\s]*$)/, '') : null;
  }
  return selector && selector !== '#' ? selector : null;
}

function resolveTargets(trigger) {
  const selector = getTargetSelector(trigger);
  return selector ? toElements(selector) : [];
}

function parseDataValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && value != null && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

/** Read `data-*` attributes for the given option keys. */
function dataOptions(element, keys) {
  const options = {};
  if (!element || !element.getAttribute) return options;
  for (const key of keys) {
    const value = element.getAttribute(`data-${key}`);
    if (value !== null) options[key] = parseDataValue(value);
  }
  return options;
}

function isDisabled(element) {
  return element.classList.contains('disabled') || element.hasAttribute('disabled');
}

function getRealJQuery() {
  const jq = hasDOM ? window.jQuery : undefined;
  return jq && jq.fn && jq.fn.jquery && !jq.__bs3VanillaShim ? jq : null;
}

/**
 * Fire a Bootstrap-style event (e.g. `show.bs.modal`). Native listeners receive a
 * cancelable CustomEvent with the full namespaced type; if a real jQuery is on the
 * page, the event is also triggered through it so `$(el).on('show.bs.modal')` works.
 * Returns `false` if any listener called `preventDefault()`.
 */
function dispatch(element, type, relatedTarget) {
  const event = new CustomEvent(type, {
    bubbles: true,
    cancelable: true,
    detail: { relatedTarget },
  });
  if (relatedTarget !== undefined) {
    Object.defineProperty(event, 'relatedTarget', { value: relatedTarget });
  }
  element.dispatchEvent(event);
  let prevented = event.defaultPrevented;

  const $ = getRealJQuery();
  if ($) {
    const jqEvent = $.Event(type, relatedTarget !== undefined ? { relatedTarget } : undefined);
    $(element).trigger(jqEvent);
    prevented = prevented || jqEvent.isDefaultPrevented();
  }
  return !prevented;
}

// ---------------------------------------------------------------------------
// Base plugin
// ---------------------------------------------------------------------------

const registries = new Map();

class Plugin {
  constructor(element) {
    this.element = element;
    registries.get(this.constructor).set(element, this);
  }

  static getInstance(element) {
    const el = toElements(element)[0];
    return el ? registries.get(this).get(el) || null : null;
  }

  static getOrCreateInstance(element, options) {
    const el = toElements(element)[0];
    if (!el) return null;
    return this.getInstance(el) || new this(el, options);
  }

  dispose() {
    registries.get(this.constructor).delete(this.element);
  }
}

function register(Klass) {
  registries.set(Klass, new WeakMap());
  return Klass;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

const modalStack = [];

function measureScrollbar() {
  const probe = document.createElement('div');
  probe.className = 'modal-scrollbar-measure';
  probe.style.cssText = 'position:absolute;top:-9999px;width:50px;height:50px;overflow:scroll';
  document.body.appendChild(probe);
  const width = probe.offsetWidth - probe.clientWidth;
  probe.remove();
  return width;
}

class Modal extends Plugin {
  static DEFAULTS = { backdrop: true, keyboard: true, show: true };

  constructor(element, options = {}) {
    super(element);
    this.options = {
      ...Modal.DEFAULTS,
      ...dataOptions(element, ['backdrop', 'keyboard', 'show']),
      ...options,
    };
    this.isShown = false;
    this.backdropElement = null;
    this.returnFocus = null;
    this.originalBodyPadding = '';
  }

  toggle(relatedTarget) {
    return this.isShown ? this.hide() : this.show(relatedTarget);
  }

  show(relatedTarget) {
    if (this.isShown) return;
    if (!dispatch(this.element, 'show.bs.modal', relatedTarget)) return;

    this.isShown = true;
    this.returnFocus = relatedTarget || document.activeElement;
    modalStack.push(this);

    const body = document.body;
    if (modalStack.length === 1) {
      const scrollbarWidth = measureScrollbar();
      this.originalBodyPadding = body.style.paddingRight;
      if (scrollbarWidth > 0 && document.documentElement.clientWidth < window.innerWidth) {
        const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
        body.style.paddingRight = `${current + scrollbarWidth}px`;
      }
      body.classList.add('modal-open');
    }

    if (this.options.backdrop) {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      if (this.element.classList.contains('fade')) backdrop.classList.add('fade');
      body.appendChild(backdrop);
      this.backdropElement = backdrop;
    }

    const el = this.element;
    el.style.display = 'block';
    el.scrollTop = 0;
    el.setAttribute('aria-hidden', 'false');
    void el.offsetWidth; // force reflow so CSS `.fade` transitions run
    el.classList.add('in');
    if (this.backdropElement) this.backdropElement.classList.add('in');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus();

    dispatch(el, 'shown.bs.modal', relatedTarget);
  }

  hide() {
    if (!this.isShown) return;
    if (!dispatch(this.element, 'hide.bs.modal')) return;
    this._close();
    dispatch(this.element, 'hidden.bs.modal');
  }

  /** Close without firing (or being cancelled by) events; used by hide(), dispose() and destroy(). */
  _close() {
    this.isShown = false;
    const index = modalStack.indexOf(this);
    if (index !== -1) modalStack.splice(index, 1);

    const el = this.element;
    el.classList.remove('in');
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');

    if (this.backdropElement) {
      this.backdropElement.remove();
      this.backdropElement = null;
    }

    if (modalStack.length === 0) {
      document.body.classList.remove('modal-open');
      document.body.style.paddingRight = this.originalBodyPadding;
    }

    const returnFocus = this.returnFocus;
    this.returnFocus = null;
    if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') {
      returnFocus.focus();
    }
  }

  /** Bootstrap 3 recalculates the modal position here; nothing to do without JS positioning. */
  handleUpdate() {}

  dispose() {
    if (this.isShown) this._close();
    super.dispose();
  }

  static topmost() {
    return modalStack[modalStack.length - 1] || null;
  }
}
register(Modal);

// ---------------------------------------------------------------------------
// Dropdown
// ---------------------------------------------------------------------------

const DROPDOWN_TOGGLE = '[data-toggle="dropdown"]';

function getDropdownParent(toggle) {
  const selector = toggle.getAttribute('data-target') ||
    (/#[A-Za-z]/.test(toggle.getAttribute('href') || '') ? toggle.getAttribute('href') : null);
  const parent = selector ? toElements(selector)[0] : null;
  return parent || toggle.parentElement;
}

function clearMenus(eventTarget) {
  for (const toggle of document.querySelectorAll(DROPDOWN_TOGGLE)) {
    const parent = getDropdownParent(toggle);
    if (!parent || !parent.classList.contains('open')) continue;
    // Bootstrap keeps the menu open when typing into a form field inside it.
    if (eventTarget && /^(input|textarea)$/i.test(eventTarget.tagName) && parent.contains(eventTarget)) {
      continue;
    }
    Dropdown.getOrCreateInstance(toggle).hide();
  }
}

class Dropdown extends Plugin {
  get parent() {
    return getDropdownParent(this.element);
  }

  isOpen() {
    return this.parent.classList.contains('open');
  }

  toggle() {
    if (isDisabled(this.element)) return;
    if (this.isOpen()) {
      clearMenus();
    } else {
      this.show();
    }
  }

  show() {
    if (isDisabled(this.element) || this.isOpen()) return;
    clearMenus();
    const parent = this.parent;
    if (!dispatch(parent, 'show.bs.dropdown', this.element)) return;
    parent.classList.add('open');
    this.element.setAttribute('aria-expanded', 'true');
    this.element.focus();
    dispatch(parent, 'shown.bs.dropdown', this.element);
  }

  hide() {
    if (!this.isOpen()) return;
    const parent = this.parent;
    if (!dispatch(parent, 'hide.bs.dropdown', this.element)) return;
    parent.classList.remove('open');
    this.element.setAttribute('aria-expanded', 'false');
    dispatch(parent, 'hidden.bs.dropdown', this.element);
  }

  menuItems() {
    return Array.from(
      this.parent.querySelectorAll('.dropdown-menu li:not(.disabled):not(.divider) a'),
    );
  }
}
register(Dropdown);

// ---------------------------------------------------------------------------
// Collapse
// ---------------------------------------------------------------------------

const COLLAPSE_TOGGLE = '[data-toggle="collapse"]';

class Collapse extends Plugin {
  static DEFAULTS = { toggle: true, parent: null };

  constructor(element, options = {}) {
    super(element);
    this.options = {
      ...Collapse.DEFAULTS,
      ...dataOptions(element, ['parent', 'toggle']),
      ...options,
    };
    if (this.options.toggle) this.toggle();
  }

  isShown() {
    return this.element.classList.contains('in');
  }

  toggle() {
    return this.isShown() ? this.hide() : this.show();
  }

  show() {
    if (this.isShown()) return;

    const parent = this.options.parent ? toElements(this.options.parent)[0] : null;
    const actives = parent
      ? Array.from(parent.querySelectorAll('.panel > .in, .panel > .collapsing'))
          .filter((active) => active !== this.element)
      : [];

    if (!dispatch(this.element, 'show.bs.collapse')) return;

    for (const active of actives) {
      Collapse.getOrCreateInstance(active, { toggle: false }).hide();
    }

    this.element.classList.add('in');
    this.element.setAttribute('aria-expanded', 'true');
    this.syncTriggers(true);
    dispatch(this.element, 'shown.bs.collapse');
  }

  hide() {
    if (!this.isShown()) return;
    if (!dispatch(this.element, 'hide.bs.collapse')) return;
    this.element.classList.remove('in');
    this.element.setAttribute('aria-expanded', 'false');
    this.syncTriggers(false);
    dispatch(this.element, 'hidden.bs.collapse');
  }

  syncTriggers(isOpen) {
    for (const trigger of document.querySelectorAll(COLLAPSE_TOGGLE)) {
      if (!resolveTargets(trigger).includes(this.element)) continue;
      trigger.classList.toggle('collapsed', !isOpen);
      trigger.setAttribute('aria-expanded', String(isOpen));
    }
  }
}
register(Collapse);

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

const TAB_TOGGLE = '[data-toggle="tab"], [data-toggle="pill"]';

function activate(element, container) {
  const tabToggles = (root) => root.querySelectorAll(TAB_TOGGLE);

  for (const active of Array.from(container.children).filter((c) => c.classList.contains('active'))) {
    active.classList.remove('active', 'in');
    for (const inner of active.querySelectorAll('.dropdown-menu > .active')) {
      inner.classList.remove('active');
    }
    for (const toggle of tabToggles(active)) toggle.setAttribute('aria-expanded', 'false');
  }

  element.classList.add('active');
  if (element.classList.contains('fade')) {
    void element.offsetWidth;
    element.classList.add('in');
  }
  for (const toggle of tabToggles(element)) toggle.setAttribute('aria-expanded', 'true');

  if (element.parentElement && element.parentElement.classList.contains('dropdown-menu')) {
    const dropdownLi = element.closest('li.dropdown');
    if (dropdownLi) {
      dropdownLi.classList.add('active');
      for (const toggle of tabToggles(dropdownLi)) toggle.setAttribute('aria-expanded', 'true');
    }
  }
}

class Tab extends Plugin {
  show() {
    const toggle = this.element;
    const ul = toggle.closest('ul:not(.dropdown-menu)');
    const li = toggle.closest('li');
    if (!li || li.classList.contains('active')) return;

    const actives = ul ? ul.querySelectorAll('li.active') : [];
    const previousLi = actives[actives.length - 1];
    const previous = previousLi ? previousLi.querySelector('a') : undefined;

    if (previous && !dispatch(previous, 'hide.bs.tab', toggle)) return;
    if (!dispatch(toggle, 'show.bs.tab', previous)) return;

    if (ul) activate(li, ul);
    const pane = resolveTargets(toggle)[0];
    if (pane && pane.parentElement) activate(pane, pane.parentElement);

    if (previous) dispatch(previous, 'hidden.bs.tab', toggle);
    dispatch(toggle, 'shown.bs.tab', previous);
  }
}
register(Tab);

// ---------------------------------------------------------------------------
// Data API (delegated document listeners)
// ---------------------------------------------------------------------------

function onClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  // Dropdowns: toggle, or close every open menu on an outside click.
  const dropdownToggle = target.closest(DROPDOWN_TOGGLE);
  if (dropdownToggle) {
    event.preventDefault();
    Dropdown.getOrCreateInstance(dropdownToggle).toggle();
  } else if (!target.closest('.dropdown form')) {
    clearMenus(target);
  }

  // Modals: dismiss buttons, backdrop clicks, then toggles.
  const dismiss = target.closest('[data-dismiss="modal"]');
  if (dismiss) {
    const modalEl = dismiss.closest('.modal');
    const modal = modalEl && Modal.getInstance(modalEl);
    if (modal) {
      event.preventDefault();
      modal.hide();
    }
  }

  const top = Modal.topmost();
  if (top && top.options.backdrop !== 'static' &&
      (target === top.element || target === top.backdropElement)) {
    top.hide();
  }

  const modalToggle = target.closest('[data-toggle="modal"]');
  if (modalToggle && !isDisabled(modalToggle)) {
    if (modalToggle.tagName === 'A') event.preventDefault();
    const modalEl = resolveTargets(modalToggle)[0];
    if (modalEl) {
      const existing = Modal.getInstance(modalEl);
      if (existing) {
        existing.toggle(modalToggle);
      } else {
        const options = dataOptions(modalToggle, ['backdrop', 'keyboard']);
        new Modal(modalEl, options).show(modalToggle);
      }
    }
  }

  // Collapse
  const collapseToggle = target.closest(COLLAPSE_TOGGLE);
  if (collapseToggle && !isDisabled(collapseToggle)) {
    if (collapseToggle.tagName === 'A') event.preventDefault();
    const parentOption = dataOptions(collapseToggle, ['parent']);
    for (const collapseEl of resolveTargets(collapseToggle)) {
      const collapse = Collapse.getOrCreateInstance(collapseEl, { ...parentOption, toggle: false });
      // An accordion sibling may have created this instance without a parent.
      if (parentOption.parent) collapse.options.parent = parentOption.parent;
      collapse.toggle();
    }
  }

  // Tabs / pills
  const tabToggle = target.closest(TAB_TOGGLE);
  if (tabToggle && !isDisabled(tabToggle)) {
    event.preventDefault();
    Tab.getOrCreateInstance(tabToggle).show();
  }
}

function onKeydown(event) {
  const { key } = event;
  const openToggle = Array.from(document.querySelectorAll(DROPDOWN_TOGGLE))
    .find((toggle) => getDropdownParent(toggle).classList.contains('open'));

  if (key === 'Escape' || key === 'Esc') {
    if (openToggle) {
      Dropdown.getOrCreateInstance(openToggle).hide();
      openToggle.focus();
      return;
    }
    const top = Modal.topmost();
    if (top && top.options.keyboard) top.hide();
    return;
  }

  if (key !== 'ArrowDown' && key !== 'ArrowUp') return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target || /^(input|textarea)$/i.test(target.tagName)) return;

  const toggle = target.closest(DROPDOWN_TOGGLE) ||
    (openToggle && getDropdownParent(openToggle).contains(target) ? openToggle : null);
  if (!toggle || isDisabled(toggle)) return;

  event.preventDefault();
  const dropdown = Dropdown.getOrCreateInstance(toggle);
  if (!dropdown.isOpen()) {
    dropdown.show();
    return;
  }
  const items = dropdown.menuItems();
  if (!items.length) return;
  let index = items.indexOf(target);
  if (key === 'ArrowUp' && index > 0) index -= 1;
  if (key === 'ArrowDown' && index < items.length - 1) index += 1;
  items[Math.max(index, 0)].focus();
}

function onFocusin(event) {
  const top = Modal.topmost();
  if (top && event.target !== top.element && !top.element.contains(event.target)) {
    top.element.focus();
  }
}

let initialized = false;

/**
 * Attach the delegated data-API listeners (idempotent) and, unless disabled,
 * install the jQuery-compatible plugin shim.
 */
function init({ jqueryShim = true } = {}) {
  if (!hasDOM) return;
  if (!initialized) {
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('focusin', onFocusin);
    initialized = true;
  }
  if (jqueryShim) installJQueryShim();
}

/** Remove the data-API listeners and close any open modals and dropdowns. */
function destroy() {
  if (!hasDOM) return;
  document.removeEventListener('click', onClick);
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('focusin', onFocusin);
  initialized = false;
  while (modalStack.length) modalStack[modalStack.length - 1]._close();
  clearMenus();
}

// ---------------------------------------------------------------------------
// jQuery compatibility
// ---------------------------------------------------------------------------

const PLUGINS = { modal: Modal, dropdown: Dropdown, collapse: Collapse, tab: Tab };

/** Plugins Bootstrap 3 ships that this library does not implement; calls are no-ops. */
const NOOP_PLUGINS = ['alert', 'button', 'carousel', 'scrollspy', 'tooltip', 'popover', 'affix'];

function callMethod(instance, name, method, arg) {
  if (method !== 'constructor' && !method.startsWith('_') && typeof instance[method] === 'function') {
    instance[method](arg);
  } else {
    console.warn(`[bootstrap3-vanilla-stubs] No method named "${method}" on ${name}`);
  }
}

function runPlugin(name, element, option, arg) {
  const Klass = PLUGINS[name];
  const objectOptions = option && typeof option === 'object' ? option : {};
  let instance = Klass.getInstance(element);

  if (!instance) {
    // A string command is run explicitly below, so don't let Collapse's
    // constructor auto-toggle first (Bootstrap 3 would toggle twice).
    const opts = typeof option === 'string' ? { toggle: false } : objectOptions;
    instance = new Klass(element, opts);
  }

  if (typeof option === 'string') {
    callMethod(instance, name, option, arg);
  } else if (name === 'modal' && instance.options.show) {
    instance.show(arg);
  }
}

function makePluginMethod(name) {
  const method = function (option, arg) {
    Array.prototype.forEach.call(this, (element) => {
      if (element && element.nodeType === 1) runPlugin(name, element, option, arg);
    });
    return this;
  };
  method.Constructor = PLUGINS[name];
  method.__bs3VanillaStub = true;
  return method;
}

function makeNoopPlugin() {
  const method = function () {
    return this;
  };
  method.__bs3VanillaStub = true;
  return method;
}

const PLUGIN_EVENT = /\.bs\.[a-z]+$/;
const listenerRecords = new WeakMap();

/** `click.myns` → listens to `click`; Bootstrap events such as `shown.bs.modal` keep their full type. */
function parseEventType(type) {
  if (PLUGIN_EVENT.test(type)) return { type, namespace: '' };
  const [base, ...ns] = type.split('.');
  return { type: base, namespace: ns.join('.') };
}

function splitTypes(types) {
  return String(types).trim().split(/\s+/).filter(Boolean);
}

/**
 * A minimal jQuery-like collection: enough for legacy code that calls
 * `$(sel).modal('show')`, binds `shown.bs.modal`, or toggles classes.
 */
function createJQueryShim() {
  class Collection {
    constructor(elements) {
      elements.forEach((element, i) => {
        this[i] = element;
      });
      this.length = elements.length;
    }
  }

  function $(selector, context) {
    if (typeof selector === 'function') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => selector($), { once: true });
      } else {
        setTimeout(() => selector($), 0);
      }
      return new Collection([document]);
    }
    if (selector instanceof Collection) return selector;
    if (typeof selector === 'string' && /^\s*</.test(selector)) {
      console.warn('[bootstrap3-vanilla-stubs] HTML string creation is not supported by the jQuery shim');
      return new Collection([]);
    }
    return new Collection(toElements(selector, context));
  }

  const fn = Collection.prototype;
  $.fn = fn;
  $.__bs3VanillaShim = true;

  fn.each = function (callback) {
    Array.prototype.forEach.call(this, (element, i) => callback.call(element, i, element));
    return this;
  };
  fn.get = function (index) {
    return index === undefined ? Array.from(this) : this[index < 0 ? this.length + index : index];
  };
  fn.find = function (selector) {
    const found = new Set();
    this.each((_, element) => toElements(selector, element).forEach((match) => found.add(match)));
    return new Collection([...found]);
  };
  fn.addClass = function (names) {
    return this.each((_, element) => element.classList.add(...splitTypes(names)));
  };
  fn.removeClass = function (names) {
    return this.each((_, element) => element.classList.remove(...splitTypes(names)));
  };
  fn.toggleClass = function (names, state) {
    return this.each((_, element) => {
      for (const name of splitTypes(names)) element.classList.toggle(name, state);
    });
  };
  fn.hasClass = function (name) {
    return Array.prototype.some.call(this, (element) => element.classList.contains(name));
  };

  fn.on = function (types, selector, handler) {
    if (typeof selector === 'function') {
      handler = selector;
      selector = null;
    }
    return this.each((_, element) => {
      const records = listenerRecords.get(element) || [];
      listenerRecords.set(element, records);
      for (const raw of splitTypes(types)) {
        const { type, namespace } = parseEventType(raw);
        const wrapper = (event) => {
          let current = event.target;
          if (selector) {
            current = event.target instanceof Element ? event.target.closest(selector) : null;
            if (!current || !element.contains(current)) return;
          } else {
            current = element;
          }
          if (handler.call(current, event) === false) {
            event.preventDefault();
            event.stopPropagation();
          }
        };
        element.addEventListener(type, wrapper);
        records.push({ type, namespace, selector, handler, wrapper });
      }
    });
  };
  fn.off = function (types, selector, handler) {
    if (typeof selector === 'function') {
      handler = selector;
      selector = null;
    }
    return this.each((_, element) => {
      const records = listenerRecords.get(element);
      if (!records) return;
      const filters = types ? splitTypes(types).map(parseEventType) : [{ type: '', namespace: '' }];
      for (let i = records.length - 1; i >= 0; i -= 1) {
        const record = records[i];
        const matches = filters.some((f) =>
          (!f.type || f.type === record.type) &&
          (!f.namespace || f.namespace === record.namespace) &&
          (!selector || selector === record.selector) &&
          (!handler || handler === record.handler));
        if (matches) {
          element.removeEventListener(record.type, record.wrapper);
          records.splice(i, 1);
        }
      }
    });
  };
  fn.one = function (types, selector, handler) {
    if (typeof selector === 'function') {
      handler = selector;
      selector = null;
    }
    const self = this;
    const once = function (event) {
      self.off(types, selector, once);
      return handler.call(this, event);
    };
    return this.on(types, selector, once);
  };
  fn.trigger = function (type) {
    return this.each((_, element) => {
      if (['click', 'focus', 'blur'].includes(type) && typeof element[type] === 'function') {
        element[type]();
      } else {
        element.dispatchEvent(new CustomEvent(parseEventType(type).type, { bubbles: true, cancelable: true }));
      }
    });
  };

  for (const name of Object.keys(PLUGINS)) fn[name] = makePluginMethod(name);
  for (const name of NOOP_PLUGINS) fn[name] = makeNoopPlugin();

  return $;
}

/**
 * Make `$(el).modal('show')`-style calls work.
 * - If a real jQuery is loaded, missing Bootstrap plugins are added to `jQuery.fn`
 *   (existing ones, e.g. from bootstrap.js, are left alone unless `force` is set).
 * - Otherwise a small shim is installed as `window.jQuery` (and `window.$` if free).
 */
function installJQueryShim({ force = false } = {}) {
  if (!hasDOM) return null;
  const jq = window.jQuery;
  if (jq && jq.fn) {
    for (const name of Object.keys(PLUGINS)) {
      if (force || !jq.fn[name]) jq.fn[name] = makePluginMethod(name);
    }
    for (const name of NOOP_PLUGINS) {
      if (force || !jq.fn[name]) jq.fn[name] = makeNoopPlugin();
    }
    return jq;
  }
  const shim = createJQueryShim();
  window.jQuery = shim;
  if (window.$ === undefined) window.$ = shim;
  return shim;
}

// ---------------------------------------------------------------------------
// Exports & global fallback
// ---------------------------------------------------------------------------

const Bootstrap3VanillaStubs = {
  Modal,
  Dropdown,
  Collapse,
  Tab,
  init,
  destroy,
  installJQueryShim,
  createJQueryShim,
};

if (hasDOM) {
  window.Bootstrap3VanillaStubs = Bootstrap3VanillaStubs;
  if (!window.BS3_VANILLA_STUBS_MANUAL_INIT) init();
}

export { Modal, Dropdown, Collapse, Tab, init, destroy, installJQueryShim, createJQueryShim };
export default Bootstrap3VanillaStubs;
