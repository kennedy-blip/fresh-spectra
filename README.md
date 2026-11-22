# Fresh-Spectra

Fresh-Spectra is an offline-first produce and food-safety field lab built with React, TypeScript, Vite and Capacitor. It combines a Web Audio thump-resonance simulator and microphone analyzer, an sRGB → CIE XYZ → CIE L*a*b* optical sampler, a Q₁₀ shelf-life estimator, an offline ingredient/NOVA reference, and a local IndexedDB pantry ledger.

## Run locally

```bash
npm install
npm run dev
```

The live microphone and camera require a secure context (`https://` or `localhost`) and explicit browser permission. The synthetic acoustic presets and optical reference samples are available without hardware. `npm run build` runs strict TypeScript checks for the application and Capacitor/Vite configuration, then creates the production bundle in `dist/`.

## Offline and local data

- The pantry is stored in Dexie/IndexedDB on the current device. Scans are queued locally; this repository does not configure a remote sync endpoint or upload ingredient labels.
- A lightweight service worker caches the app shell in production. After the first online visit, the core interface and built-in reference libraries can open offline.
- Calculations are screening estimates. CIELAB camera readings depend on illumination and white balance; acoustic readings and °Bx are heuristic; the Q₁₀ window is not a pathogen test. Follow official local food-safety guidance.

## Android package

`capacitor.config.ts` defines the Android app identity. The GitHub Actions workflow at `.github/workflows/build-and-bundle-apk.yml` creates a Capacitor Android project, adds the camera and audio permissions needed by WebView capture, builds an installable **debug-signed** APK, writes a SHA-256 file, and uploads a deployable `dist/` bundle. Before syncing the web app into Android, CI removes the previous static release files so an older APK is not recursively embedded inside the next native package. On branch builds it publishes the newly built APK and checksum to `public/releases/` on that branch, an intentional binary exception so the Vercel static build can serve `/releases/freshspectra-release.apk` directly. Version tags (`v*`) publish the APK as a GitHub Release asset.

The APK is development/sideload signed, not Play Store signed. The download center checks for a valid APK content type before enabling its direct-download button. Until the first Android workflow has completed and its APK commit is in the deployed branch, Android users can install the offline-capable web app from Chrome's **⋮ → Install app** menu.

The CI APK uses Android's debug signing key and is suitable for development/sideload testing, not Play Store distribution. A production release should be signed in a protected release workflow with project-owned signing configuration; do not commit signing credentials.
