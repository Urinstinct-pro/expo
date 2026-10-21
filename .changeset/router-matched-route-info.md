---
'expo-router': patch
---

Replace `getRouteInfoForLocation()` in the internal static exports with `getRouteInfoForMatchedRoute()`. It returns the server render `pathname`, `params`, and `searchParams` from the route the server already matched, without building the route tree.
