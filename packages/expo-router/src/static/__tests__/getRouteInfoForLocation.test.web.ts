import { inMemoryContext } from '../../testing-library/context-stubs';
import { getRouteInfoForLocation, getRouteInfoForMatchedRoute } from '../getRouteInfoForLocation';

const context = inMemoryContext({
  index: () => null,
  '[locale]/index': () => null,
  'posts/[id]': () => null,
  '(group)/platform/[...slug]': () => null,
  'nested/_layout': () => null,
  'nested/index': () => null,
  '+not-found': () => null,
});

// The manifest captures are the raw, still-encoded regex groups the server extracts.
const cases: [href: string, page: string, captures: Record<string, string>, pathname: string][] = [
  ['/', '/index', {}, '/'],
  ['/?page=2', '/index', {}, '/'],
  ['/en?a=b,c&2=x&1=y', '/[locale]/index', { locale: 'en' }, '/en'],
  ['/en?locale=fr&x=1', '/[locale]/index', { locale: 'en' }, '/en'],
  ['/posts/a%20b?x=1&x=2', '/posts/[id]', { id: 'a%20b' }, '/posts/a b'],
  ['/platform/a/b%2Fc/', '/(group)/platform/[...slug]', { slug: 'a/b%2Fc' }, '/platform/a/b/c'],
  ['/nested?q=1', '/nested/index', {}, '/nested'],
  ['/missing/deep?q=1', '/+not-found', { 'not-found': 'missing/deep' }, '/missing/deep'],
];

beforeEach(() => {
  // A query key that repeats a path param logs a warning in both code paths.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

it.each(cases)('matches the route tree result for %s', (href, page, captures, expectedPathname) => {
  const location = new URL(href, 'http://localhost');
  const fromTree = getRouteInfoForLocation(context, location);
  const fromMatch = getRouteInfoForMatchedRoute({ page }, captures, location);

  expect(fromTree.pathname).toBe(expectedPathname);
  expect(fromMatch.pathname).toBe(fromTree.pathname);
  expect(fromMatch.params).toEqual(fromTree.params);
  expect(fromMatch.searchParams.toString()).toBe(fromTree.searchParams.toString());
});

it('returns fresh objects for every call', () => {
  const location = new URL('http://localhost/posts/1?x=1');
  const route = { page: '/posts/[id]' };
  const captures = { id: '1' };
  const first = getRouteInfoForMatchedRoute(route, captures, location);
  (first.params as Record<string, unknown>).x = 'mutated';
  first.searchParams.set('x', 'mutated');

  const second = getRouteInfoForMatchedRoute(route, captures, location);
  expect(second.params).toEqual({ id: '1', x: '1' });
  expect(second.searchParams.toString()).toBe('x=1');
});
