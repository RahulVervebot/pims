// OneSignalService.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import OneSignal from 'react-native-onesignal';

const ONE_SIGNAL_APP_ID = '53886d23-f2ee-43f6-99ac-9c3ac95cdb9d';

/*
  IMPORTANT:
  - Do NOT keep your REST API key in mobile app code in production.
  - Notification send API should ideally be called from your backend.
  - Below key is only shown because you asked for full file structure.
*/
const ONE_SIGNAL_REST_API_KEY = 'os_v2_app_koeg2i7s5zb7ngnmtq5msxg3txg74u6xm6le6v5emqj7dmuesh3xdqw4ojrcuocj3mzxx2fzz3pt5gvanyuyjlohbjw4besyvli6ley';

let isInitialized = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeStoreUrl = (value) => String(value || '').trim().toLowerCase();

export const initializeOneSignal = async () => {
  try {
    if (isInitialized) {
      console.log('ℹ️ OneSignal already initialized');
      return true;
    }

    console.log('\n🚀 ===== INITIALIZING ONESIGNAL =====');

    OneSignal.setAppId(ONE_SIGNAL_APP_ID);

    // Optional debug logs
    if (OneSignal.setLogLevel) {
      OneSignal.setLogLevel(6, 0);
    }

    // iOS permission listener
    if (OneSignal.onOSPermissionChanged) {
      OneSignal.onOSPermissionChanged((event) => {
        console.log('📱 Permission changed:', event);
      });
    }

    // Subscription listener
    if (OneSignal.onOSSubscriptionChanged) {
      OneSignal.onOSSubscriptionChanged((event) => {
        console.log('📱 Subscription changed:', event);
      });
    }

    // Ask permission on iOS
    if (Platform.OS === 'ios' && OneSignal.promptForPushNotificationsWithUserResponse) {
      await new Promise((resolve) => {
        OneSignal.promptForPushNotificationsWithUserResponse((accepted) => {
          console.log('🔔 Push permission accepted:', accepted);
          resolve(accepted);
        });
      });
    }

    // Give SDK/APNs time to finish registration
    await wait(4000);

    const state = await OneSignal.getDeviceState?.();
    console.log('✅ OneSignal initialized');
    console.log('📱 Device state after init:', {
      subscribed: state?.subscribed,
      hasNotificationPermission: state?.hasNotificationPermission,
      pushToken: state?.pushToken,
      userId: state?.userId,
    });

    isInitialized = true;
    console.log('🚀 ===== ONESIGNAL INIT COMPLETE =====\n');
    return true;
  } catch (error) {
    console.log('❌ initializeOneSignal error:', error?.message || error);
    return false;
  }
};

export const getOneSignalSubscriptionStatus = async () => {
  try {
    const state = await OneSignal.getDeviceState?.();

    const result = {
      subscribed: !!state?.subscribed,
      hasPermission: !!state?.hasNotificationPermission,
      pushToken: state?.pushToken || null,
      userId: state?.userId || null,
    };

    console.log('📱 OneSignal status:', result);
    return result;
  } catch (error) {
    console.log('❌ getOneSignalSubscriptionStatus error:', error?.message || error);
    return {
      subscribed: false,
      hasPermission: false,
      pushToken: null,
      userId: null,
    };
  }
};

export const canReceivePush = async () => {
  const state = await getOneSignalSubscriptionStatus();
  return !!(
    state.subscribed &&
    state.hasPermission &&
    state.pushToken &&
    state.userId
  );
};

export const tagDeviceWithStoreUrl = async (storeUrl) => {
  try {
    if (!storeUrl) {
      console.log('❌ storeUrl missing');
      return false;
    }

    const normalizedStoreUrl = normalizeStoreUrl(storeUrl);

    console.log('\n🏷️ ===== TAGGING DEVICE =====');
    console.log('Original storeUrl:', storeUrl);
    console.log('Normalized storeUrl:', normalizedStoreUrl);

    const state = await OneSignal.getDeviceState?.();
    console.log('📱 State before tagging:', {
      subscribed: state?.subscribed,
      hasNotificationPermission: state?.hasNotificationPermission,
      pushToken: state?.pushToken,
      userId: state?.userId,
    });

    // Save locally
    await AsyncStorage.setItem('storeurl', normalizedStoreUrl);

    // Send SDK tags
    OneSignal.sendTag('storeurl', normalizedStoreUrl);
    OneSignal.sendTag('app_user', 'true');
    OneSignal.sendTag('device_type', Platform.OS);

    // Give OneSignal some time to sync tags
    await wait(5000);

    console.log('✅ Tags sent successfully');
    console.log('🏷️ ===== TAGGING COMPLETE =====\n');
    return true;
  } catch (error) {
    console.log('❌ tagDeviceWithStoreUrl error:', error?.message || error);
    return false;
  }
};

// Optional helper if you have a real stable app user id
export const setExternalUserId = async (externalUserId) => {
  try {
    if (!externalUserId) {
      console.log('⚠️ setExternalUserId skipped - no externalUserId');
      return false;
    }

    if (OneSignal.setExternalUserId) {
      OneSignal.setExternalUserId(String(externalUserId));
      console.log('✅ External user id set:', externalUserId);
      return true;
    }

    console.log('⚠️ OneSignal.setExternalUserId not available');
    return false;
  } catch (error) {
    console.log('❌ setExternalUserId error:', error?.message || error);
    return false;
  }
};

export const debugOneSignalStatus = async () => {
  try {
    console.log('\n🔍 ===== ONESIGNAL DEBUG =====');

    const state = await OneSignal.getDeviceState?.();
    const localStoreUrl = await AsyncStorage.getItem('storeurl');

    console.log('📱 subscribed:', state?.subscribed);
    console.log('📱 hasNotificationPermission:', state?.hasNotificationPermission);
    console.log('📱 pushToken:', state?.pushToken || 'MISSING');
    console.log('📱 userId:', state?.userId || 'MISSING');
    console.log('🏪 local storeurl:', localStoreUrl || 'MISSING');

    if (state?.subscribed && state?.hasNotificationPermission && state?.pushToken) {
      console.log('✅ Device is ready for push');
    } else {
      console.log('❌ Device is NOT ready for push');
      if (!state?.subscribed) console.log('   - subscribed = false');
      if (!state?.hasNotificationPermission) console.log('   - permission = false');
      if (!state?.pushToken) console.log('   - pushToken missing');
      if (!state?.userId) console.log('   - userId missing');
    }

    console.log('🔍 ===== DEBUG END =====\n');
    return state;
  } catch (error) {
    console.log('❌ debugOneSignalStatus error:', error?.message || error);
    return null;
  }
};

export const sendNotificationToStoreUsers = async (

  title = 'Product Created',
  message = 'Product created successfully',
  productName = ''
) => {
  try {

    console.log('\n📢 ===== SEND STORE FILTER NOTIFICATION =====');

    const storeUrl = await AsyncStorage.getItem('storeurl');
    if (!storeUrl) {
      console.log('❌ No storeurl found in AsyncStorage');
      return false;
    }

    const normalizedStoreUrl = normalizeStoreUrl(storeUrl);

    const state = await OneSignal.getDeviceState?.();
    console.log('📱 Current device state before send:', {
      subscribed: state?.isSubscribed,
      hasNotificationPermission: state?.hasNotificationPermission,
      pushToken: state?.pushToken,
      userId: state?.userId,
    });

    if (!state?.isSubscribed || !state?.hasNotificationPermission || !state?.pushToken) {
      console.log('❌ Current device is not fully subscribed');
      console.log('   Fix notification permission / token / subscription first');
      return false;
    }

    const payload = {
      app_id: ONE_SIGNAL_APP_ID,
      filters: [
        {
          field: 'tag',
          key: 'storeurl',
          relation: '=',
          value: normalizedStoreUrl,
        },
      ],
      headings: {
        en: title || 'Product Created',
      },
      contents: {
        en: message || `${productName || 'Product'} created successfully`,
      },
      priority: 10,
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
    };

    console.log('📤 Sending filter notification with payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${ONE_SIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('📡 Filter send status:', response.status);
    console.log('📄 Filter send response:', responseText);

    let data = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      console.log('⚠️ Response JSON parse failed');
    }

    if (response.ok && data.id) {
      console.log('✅ Store filtered notification sent successfully');
      console.log('📢 ===== SEND COMPLETE =====\n');
      return true;
    }

    if (data?.errors?.length) {
      console.log('❌ OneSignal error:', data.errors[0]);
    }

    console.log('❌ Store filtered notification failed');
    console.log('📢 ===== SEND FAILED =====\n');
    return false;
  } catch (error) {
    console.log('❌ sendNotificationToStoreUsers error:', error?.message || error);
    return false;
  }
};

export const sendNotificationToAllUsers = async (
  title = 'Test Notification',
  message = 'This is a test notification'
) => {
  try {
    console.log('\n📢 ===== SEND ALL USERS NOTIFICATION =====');

    const payload = {
      app_id: ONE_SIGNAL_APP_ID,
      included_segments: ['All'],
      headings: { en: title },
      contents: { en: message },
      priority: 10,
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
    };

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${ONE_SIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('📡 Send all status:', response.status);
    console.log('📄 Send all response:', responseText);

    let data = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      console.log('⚠️ Response JSON parse failed');
    }

    if (response.ok && data.id) {
      console.log('✅ Notification sent to all users');
      console.log('📢 ===== SEND ALL COMPLETE =====\n');
      return true;
    }

    if (data?.errors?.length) {
      console.log('❌ OneSignal error:', data.errors[0]);
    }

    console.log('❌ Send all users failed');
    console.log('📢 ===== SEND ALL FAILED =====\n');
    return false;
  } catch (error) {
    console.log('❌ sendNotificationToAllUsers error:', error?.message || error);
    return false;
  }
};

export const testBasicNotification = async () => {
  return sendNotificationToAllUsers('Test', 'Basic notification test');
};

export const sendTestNotification = async (
  title = 'Test Notification',
  message = 'This is a test notification'
) => {
  try {
    console.log('\n🧪 ===== TEST FLOW START =====');
    await debugOneSignalStatus();
    const result = await sendNotificationToAllUsers(title, message);
    console.log('🧪 ===== TEST FLOW END =====\n');
    return result;
  } catch (error) {
    console.log('❌ sendTestNotification error:', error?.message || error);
    return false;
  }
};

export const forceEnablePushNotifications = async () => {
  try {
    let OneSignal = null;
    try {
      OneSignal = require('react-native-onesignal');
    } catch (e) {
      console.log('⚠️ OneSignal SDK not available');
      return false;
    }

    console.log('\n🔧 ═══════════════════════════════════════');
    console.log('🔧 FORCE ENABLING PUSH NOTIFICATIONS');
    console.log('🔧 ═══════════════════════════════════════');
    
    // Check current state
    let currentState = null;
    if (OneSignal.getDeviceState) {
      currentState = await OneSignal.getDeviceState();
      if (currentState) {
        console.log('\n📱 Before:');
        console.log('   Subscribed:', currentState.subscribed);
        console.log('   Has Permission:', currentState.hasNotificationPermission);
        console.log('   Push Token:', currentState.pushToken || 'NOT SET');
      }
    }
    
    // Force enable push
    console.log('\n🔄 Forcing push notification enable...');
    if (OneSignal.enablePush) {
      OneSignal.enablePush();
      console.log('✅ Called enablePush()');
    }
    
    // Also try setting external user ID to force sync
    const deviceId = await getOneSignalPlayerId();
    if (OneSignal.setExternalUserId) {
      OneSignal.setExternalUserId(deviceId);
      console.log('✅ Set external user ID:', deviceId);
    }
    
    // Wait for it to process
    console.log('\n⏳ Waiting 3 seconds for OneSignal to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check state again
    if (OneSignal.getDeviceState) {
      const updatedState = await OneSignal.getDeviceState();
      if (updatedState) {
        console.log('\n📱 After:');
        console.log('   Subscribed:', updatedState.subscribed ? '✅ YES' : '❌ NO');
        console.log('   Has Permission:', updatedState.hasNotificationPermission ? '✅ YES' : '❌ NO');
        console.log('   Push Token:', updatedState.pushToken || 'NOT SET');
        
        if (updatedState.subscribed) {
          console.log('\n✅ SUCCESS! Device is now SUBSCRIBED!');
        } else {
          console.log('\n⚠️ Still not subscribed - checking iOS permission...');
          
          // Request permission prompt again
          if (OneSignal.promptForPushNotificationsWithUserResponse) {
            console.log('📱 Requesting permission prompt again...');
            await new Promise((resolve) => {
              OneSignal.promptForPushNotificationsWithUserResponse((granted) => {
                console.log('📱 Permission response:', granted);
                resolve(granted);
              });
            });
            
            // Wait and check again
            await new Promise(resolve => setTimeout(resolve, 2000));
            const finalState = await OneSignal.getDeviceState();
            if (finalState) {
              console.log('\n📱 Final state:');
              console.log('   Subscribed:', finalState.subscribed ? '✅ YES' : '❌ NO');
              console.log('   Has Permission:', finalState.hasNotificationPermission ? '✅ YES' : '❌ NO');
            }
          }
        }
      }
    }
    
    console.log('🔧 ═══════════════════════════════════════\n');
    return true;
  } catch (error) {
    console.log('⚠️ Error enabling push:', error?.message);
    return false;
  }
};
