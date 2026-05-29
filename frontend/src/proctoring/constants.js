/**
 * Centralized constants for the proctoring module.
 * Mirrors backend service ENUMs.
 */

export const VIOLATION_TYPES = {
  FULLSCREEN_EXIT:      'FULLSCREEN_EXIT',
  TAB_SWITCH:           'TAB_SWITCH',
  WINDOW_BLUR:          'WINDOW_BLUR',
  BROWSER_MINIMIZE:     'BROWSER_MINIMIZE',
  SCREEN_SHARE_STOPPED: 'SCREEN_SHARE_STOPPED',
  SCREEN_SHARE_DENIED:  'SCREEN_SHARE_DENIED',
  COPY_ATTEMPT:         'COPY_ATTEMPT',
  PASTE_ATTEMPT:        'PASTE_ATTEMPT',
  RIGHT_CLICK:          'RIGHT_CLICK',
  BLOCKED_SHORTCUT:     'BLOCKED_SHORTCUT',
  DEVTOOLS_OPENED:      'DEVTOOLS_OPENED',
  REFRESH_ATTEMPT:      'REFRESH_ATTEMPT',
  NAVIGATION_ATTEMPT:   'NAVIGATION_ATTEMPT',
  MULTIPLE_LOGIN:       'MULTIPLE_LOGIN',
  NETWORK_LOST:         'NETWORK_LOST',
};

export const VIOLATION_LABELS = {
  FULLSCREEN_EXIT:      'You exited fullscreen mode',
  TAB_SWITCH:           'You switched tabs',
  WINDOW_BLUR:          'Window lost focus',
  BROWSER_MINIMIZE:     'Browser was minimized',
  SCREEN_SHARE_STOPPED: 'Screen sharing stopped',
  SCREEN_SHARE_DENIED:  'Screen sharing was denied',
  COPY_ATTEMPT:         'Copy is disabled',
  PASTE_ATTEMPT:        'Paste is disabled',
  RIGHT_CLICK:          'Right-click is disabled',
  BLOCKED_SHORTCUT:     'This shortcut is blocked',
  DEVTOOLS_OPENED:      'Developer tools detected',
  REFRESH_ATTEMPT:      'Refresh is disabled',
  NAVIGATION_ATTEMPT:   'Navigation away is disabled',
  MULTIPLE_LOGIN:       'Multiple login detected',
  NETWORK_LOST:         'Internet connection lost',
};

export const MAX_FULLSCREEN_EXITS = 3;
export const MAX_WARNINGS = 5;
export const HEARTBEAT_INTERVAL_MS = 10_000;
export const ANSWER_AUTOSAVE_MS = 8_000;
