import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifestPath = resolve('android/app/src/main/AndroidManifest.xml');
let manifest = await readFile(manifestPath, 'utf8');
const declarations = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
  '<uses-feature android:name="android.hardware.microphone" android:required="false" />',
];
const missing = declarations.filter((declaration) => !manifest.includes(declaration));
if (missing.length > 0) {
  manifest = manifest.replace(/(<manifest\b[^>]*>)/, `$1\n    ${missing.join('\n    ')}`);
  await writeFile(manifestPath, manifest);
}
