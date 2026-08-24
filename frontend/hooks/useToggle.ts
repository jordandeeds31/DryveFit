import { useCallback, useState } from "react";

const useToggle = (initial = false) => {
  const [isOpen, setIsOpen] = useState(initial);

  // Stable across re-renders (setIsOpen itself is guaranteed stable by
  // useState) — callers relying on these in a dependency array, e.g. a
  // memoized header render function, would otherwise see a new function
  // identity on every render regardless of whether isOpen actually changed.
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, toggle, open, close };
};

export default useToggle;
