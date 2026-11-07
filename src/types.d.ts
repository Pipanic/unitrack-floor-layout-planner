// Declarations for the type-check (build.ps1 -Check) only: never built into
// the page. The planner is plain JavaScript, checked leniently (not strict),
// and this says what its JSDoc can't: the extra things it finds on `window`,
// and that elements looked up by id or met as an event's target are used as
// the inputs, buttons and images they are, without a cast at every use.

interface Window {
  /** Claude.ai's artifact sandbox, when the planner runs there (offerDownload). */
  claude?: any;
  /** The test suites' hook (js/test-hook.js). */
  __planner: object;
}

// Selector lookups give the page's own elements, all HTML or SVG ones it made.
interface ParentNode {
  querySelector(selectors: string): HTMLElement | null;
  querySelectorAll(selectors: string): NodeListOf<HTMLElement>;
}

interface HTMLElement {
  value: any;
  disabled: boolean;
  checked: boolean;
  src: string;
  files: FileList;
  placeholder: string;
  select(): void;
  decode(): Promise<void>;
}

interface EventTarget {
  id: string;
  value: any;
  files: FileList;
  closest(selectors: string): HTMLElement | null;
  blur(): void;
}

// Selector lookups from an element (closest) give the page's own elements too.
interface Element {
  closest(selectors: string): HTMLElement | null;
}

// Functions that keep their pending timer on themselves (`fn._t`).
declare namespace flashHint { let _t: number; }
declare namespace flashAutosaveMsg { let _t: number; }
declare namespace flashSaveLoadMsg { let _t: number; }
