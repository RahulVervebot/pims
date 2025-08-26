// ZSDKModule.js
import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The native module 'ZSDKModule' is not linked.\n` +
  `• iOS: run 'cd ios && pod install', open the .xcworkspace, clean build, and run on a real device.\n` +
  `• Android: make sure the package is added (or autolinked) and rebuild the app.\n` +
  `• Ensure the native class name is exactly 'ZSDKModule' (getName / RCT_EXPORT_MODULE).`;

const ZSDKModule = NativeModules.ZSDKModule ?? new Proxy({}, {
  get() {
    throw new Error(LINKING_ERROR);
  },
});

export default ZSDKModule;