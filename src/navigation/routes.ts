export type RouteName = 'home' | 'chat' | 'results' | 'details' | 'group';

export type Route =
  | {name: 'home'}
  | {name: 'chat'; preset?: string; seq?: number}
  | {name: 'results'}
  | {name: 'details'; titleId: string}
  | {name: 'group'};

/** Stable key per screen used to remember where focus was before navigating. */
export const routeKey = (route: Route): string => route.name;

export interface NavigationApi {
  stack: Route[];
  route: Route;
  push: (route: Route) => void;
  pop: () => void;
  reset: (route: Route) => void;
  /** Remembers the last focused element id for a screen. */
  rememberFocus: (key: string, focusId: string) => void;
  /** Recalls the last focused element id for a screen (focus restoration). */
  recallFocus: (key: string) => string | undefined;
}
