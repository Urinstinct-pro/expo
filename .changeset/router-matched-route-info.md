---
'expo-router': patch
---

Add `getRouteInfoForMatchedRoute()` to the internal static exports. It returns the server render `pathname`, `params`, and `searchParams` from the route the server already matched, without building the route tree.
