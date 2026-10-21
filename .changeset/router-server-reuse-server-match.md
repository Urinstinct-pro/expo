---
'@expo/router-server': patch
---

Accept the matched `route` in the render options. When the server passes it, the renderer no longer rebuilds the route tree to resolve the page's `pathname` and `params`.
