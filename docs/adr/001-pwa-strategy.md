# ADR-001: Progressive Web App (PWA) Strategy

> Version: 1.0 | Date: 2026-02-18 | Author: SimQuip Team

## Status

Accepted

## Context

SimQuip is an equipment management application for hospital staff who may need to access equipment information across different parts of a large hospital campus. The application must be delivered through the Microsoft Power Platform as a Code App (web-only hosting model).

Key factors considered:

- **Connectivity**: Hospital environments can have inconsistent wireless coverage, particularly in basement levels, service corridors, and simulation labs. Staff need to at least load the application shell even when connectivity is intermittent.
- **Installability**: Staff should be able to add SimQuip to their device home screen for quick access, without going through a native app store. This reduces friction and IT overhead.
- **Hosting constraint**: Power Apps Code Apps are web-only -- there is no native mobile deployment path. The application runs inside the Power Apps host in a browser context.
- **Offline data**: Full offline data synchronisation is complex and introduces conflict resolution challenges. The initial release does not require offline CRUD operations; it requires an offline-capable shell that loads quickly and presents meaningful state while reconnecting.
- **Update distribution**: A PWA with service worker caching allows the application to update transparently when users next connect, without requiring manual intervention or app store review cycles.

## Decision

SimQuip will be built and delivered as a Progressive Web App (PWA) with the following characteristics:

1. **Service worker registration** is performed at application startup (`registerSw.ts`) to enable caching of the application shell (HTML, CSS, JS bundles).
2. **Offline shell support**: The service worker caches the built assets so the application shell loads even without a network connection. Data operations require connectivity and will show appropriate error states when offline.
3. **Installability**: The application includes a web app manifest enabling "Add to Home Screen" on supported browsers. The `usePwaInstall` hook manages the install prompt lifecycle.
4. **No offline data sync in initial release**: Data reads and writes require an active connection to Dataverse through the Power Apps SDK. Offline data caching and sync may be considered in a future release if usage patterns demonstrate a need.
5. **Web-only delivery**: The application is deployed exclusively through the Power Apps Code App hosting model. No native wrappers (Capacitor, Electron, etc.) are used.

## Consequences

**Benefits:**
- Users can install the app to their home screen for quick access without app store distribution.
- The application shell loads reliably even on slow or intermittent connections, providing a better perceived performance experience.
- Updates are deployed server-side and propagated automatically through service worker refresh cycles.
- No native build toolchain or app store submission process to maintain.
- Aligns with the Power Apps Code App web-only delivery model without fighting the platform.

**Trade-offs:**
- Offline capability is limited to the shell; users cannot view or edit equipment data without connectivity. This may require a future investment in offline data caching if hospital network conditions prove problematic.
- Service worker caching can cause stale-asset issues if the cache invalidation strategy is not managed carefully. Version-keyed cache names and appropriate update-on-activate logic are required.
- PWA install prompts are browser-dependent and may not be available in all embedded Power Apps host contexts. The `usePwaInstall` hook handles this gracefully by only showing the prompt when the browser supports it.
- Push notifications are not included in the initial release; reminder notifications rely on Power Automate flows and email/Teams channels instead.
