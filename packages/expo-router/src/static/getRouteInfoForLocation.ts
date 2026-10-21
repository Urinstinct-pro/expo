import Constants from 'expo-constants';
import type { MatchedRoute } from 'expo-server/private';

import { INTERNAL_SLOT_NAME } from '../constants';
import { parseQueryParams, safelyDecodeURIComponent } from '../fork/getStateFromPath-forks';
import { getNavigationConfig } from '../getLinkingConfig';
import { getRoutes } from '../getRoutes';
import { getRouteInfoFromState } from '../global-state/getRouteInfoFromState';
import { getStateFromPath } from '../link/linking';
import { matchDynamicName } from '../matchers';
import type { RequireContext } from '../types';

/** The `pathname`, `params`, and normalized `searchParams` for the route the server renders. */
export function getRouteInfoForLocation(context: RequireContext, location: URL) {
  const config = Constants.expoConfig?.extra?.router;
  const routeNode = getRoutes(context, {
    ...config,
    skipGenerated: true,
    ignoreEntryPoints: true,
    platform: 'web',
  });
  if (!routeNode) {
    return {
      pathname: location.pathname,
      params: {},
      searchParams: new URLSearchParams(location.search),
    };
  }
  const skipGenerated = config?.skipGenerated ?? false;
  const navigationConfig = getNavigationConfig(routeNode, true, {
    sitemap: !skipGenerated && (config?.sitemap ?? true),
    notFound: !skipGenerated && (config?.notFound ?? true),
  });
  const { pathname, params, searchParams } = getRouteInfoFromState(
    getStateFromPath(`${location.pathname}${location.search}`, navigationConfig)
  );
  return { pathname, params, searchParams };
}

/**
 * The same result as `getRouteInfoForLocation()` for a route the server already matched.
 * `params` are the captures of the manifest regex: still percent-encoded, and a catch-all
 * capture keeps its `/` separators. They and the query are read with the client's own rules,
 * so no route tree is built.
 */
export function getRouteInfoForMatchedRoute(
  route: Pick<MatchedRoute, 'page'>,
  params: Record<string, string | string[]>,
  location: URL
) {
  const name = route.page.replace(/^\//, '');
  const pathParams = decodePathParams(name, params);
  const queryParams = parseQueryParams(`${location.pathname}${location.search}`, {
    name,
    params: pathParams,
  });
  const routeInfo = getRouteInfoFromState({
    routes: [
      {
        name: INTERNAL_SLOT_NAME,
        state: { routes: [{ name, params: { ...pathParams, ...queryParams } }] },
      },
    ],
  });
  return {
    pathname: routeInfo.pathname,
    params: routeInfo.params,
    searchParams: routeInfo.searchParams,
  };
}

/** Decodes manifest captures the way `getStateFromPath` decodes matched segments. */
function decodePathParams(name: string, captures: Record<string, string | string[]>) {
  const params: Record<string, string | string[]> = {};
  for (const segment of name.split('/')) {
    const dynamic =
      segment === '+not-found' ? { name: 'not-found', deep: true } : matchDynamicName(segment);
    const value = dynamic ? captures[dynamic.name] : undefined;
    if (!dynamic || value == null) {
      continue;
    }
    const decoded = (Array.isArray(value) ? value : [value])
      .map(safelyDecodeURIComponent)
      .join('/');
    params[dynamic.name] = dynamic.deep ? decoded.split('/').filter(Boolean) : decoded;
  }
  return params;
}
