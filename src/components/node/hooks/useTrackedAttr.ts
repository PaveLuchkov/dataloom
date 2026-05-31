import { useCallback } from 'react';

// The attribute-tracker highlight predicate, previously re-implemented inline in
// every node component (DataFrame, GroupBy, Function, …). One definition now.

export interface TrackerHighlight {
  query?: string;
  wholeWord?: boolean;
}

export function useTrackedAttr(trackerHighlight?: TrackerHighlight) {
  return useCallback(
    (name?: string) => {
      if (!trackerHighlight?.query) return false;
      const t = (name || '').toLowerCase();
      return trackerHighlight.wholeWord
        ? t === trackerHighlight.query
        : t.includes(trackerHighlight.query);
    },
    [trackerHighlight]
  );
}
