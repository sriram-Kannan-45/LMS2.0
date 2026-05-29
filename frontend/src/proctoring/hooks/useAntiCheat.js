/**
 * useAntiCheat — global event blockers for the duration of an exam.
 *
 *   - Right-click context menu
 *   - Copy / cut / paste
 *   - Keyboard shortcuts: Ctrl+T, Ctrl+W, Ctrl+N, Ctrl+R, F5, F12,
 *     Ctrl+Shift+I/J/C/U, Alt+Tab (best-effort), Ctrl+P
 *   - Refresh / navigation away (beforeunload)
 *
 * Note: the browser cannot truly block OS-level shortcuts (Alt-Tab,
 * Cmd-Tab, Win-key). We log them as violations via `onBlocked`.
 *
 *   useAntiCheat({ enabled, onViolation: (type) => ... });
 */
import { useEffect } from 'react';

const BLOCKED_KEYS = [
  // F-keys
  { match: e => e.key === 'F12' || e.code === 'F12' },
  // DevTools
  { match: e => e.ctrlKey && e.shiftKey && /^[ijcu]$/i.test(e.key) },
  // Refresh
  { match: e => e.key === 'F5' || e.code === 'F5' },
  { match: e => e.ctrlKey && /^r$/i.test(e.key) },
  // New tab / window / close
  { match: e => e.ctrlKey && /^[twn]$/i.test(e.key) },
  // Print / Save / Find
  { match: e => e.ctrlKey && /^[psaf]$/i.test(e.key) },
  // Alt-Tab — best-effort
  { match: e => e.altKey && (e.key === 'Tab' || e.code === 'Tab') },
];

export default function useAntiCheat({ enabled = true, onViolation } = {}) {
  useEffect(() => {
    if (!enabled) return;

    const onContext = (e) => {
      e.preventDefault();
      onViolation?.('RIGHT_CLICK');
    };

    const onCopy = (e) => { e.preventDefault(); onViolation?.('COPY_ATTEMPT'); };
    const onPaste = (e) => { e.preventDefault(); onViolation?.('PASTE_ATTEMPT'); };
    const onCut = (e) => { e.preventDefault(); onViolation?.('COPY_ATTEMPT'); };

    const onKeyDown = (e) => {
      for (const rule of BLOCKED_KEYS) {
        if (rule.match(e)) {
          e.preventDefault();
          e.stopPropagation();
          onViolation?.('BLOCKED_SHORTCUT', { key: e.key, code: e.code });
          return;
        }
      }
    };

    const onBeforeUnload = (e) => {
      onViolation?.('REFRESH_ATTEMPT');
      e.preventDefault();
      e.returnValue = ''; // shows a generic browser warning
      return '';
    };

    // DevTools detection (heuristic — gap between outer and inner sizes)
    let devtoolsOpen = false;
    const dtCheck = () => {
      const widthGap = window.outerWidth - window.innerWidth;
      const heightGap = window.outerHeight - window.innerHeight;
      const open = widthGap > 200 || heightGap > 200;
      if (open && !devtoolsOpen) {
        devtoolsOpen = true;
        onViolation?.('DEVTOOLS_OPENED');
      } else if (!open) {
        devtoolsOpen = false;
      }
    };
    const dtTimer = setInterval(dtCheck, 1500);

    document.addEventListener('contextmenu', onContext, true);
    document.addEventListener('copy', onCopy, true);
    document.addEventListener('paste', onPaste, true);
    document.addEventListener('cut', onCut, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      clearInterval(dtTimer);
      document.removeEventListener('contextmenu', onContext, true);
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('paste', onPaste, true);
      document.removeEventListener('cut', onCut, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [enabled, onViolation]);
}
