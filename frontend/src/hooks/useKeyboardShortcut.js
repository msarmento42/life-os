import { useEffect, useCallback } from 'react';

export function useKeyboardShortcut(combo, callback, dependencies = []) {
  const memoizedCallback = useCallback(callback, dependencies);

  useEffect(() => {
    const handler = (event) => {
      const { key, metaKey, ctrlKey, shiftKey, altKey } = event;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

      // Determine the "command" key based on OS (Cmd on Mac, Ctrl on Windows/Linux)
      const commandKey = isMac ? metaKey : ctrlKey;

      // Check if the combo matches
      const keyMatch = combo.key ? key.toLowerCase() === combo.key.toLowerCase() : true;
      const commandMatch = combo.meta !== undefined ? commandKey === combo.meta : true; // 'meta' in combo means Cmd/Ctrl
      const shiftMatch = combo.shift !== undefined ? shiftKey === combo.shift : true;
      const altMatch = combo.alt !== undefined ? altKey === combo.alt : true;
      const ctrlMatch = combo.ctrl !== undefined ? ctrlKey === combo.ctrl : true; // Explicit Ctrl if not using 'meta'

      if (keyMatch && commandMatch && shiftMatch && altMatch && ctrlMatch) {
        memoizedCallback(event);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [combo, memoizedCallback]);
}
