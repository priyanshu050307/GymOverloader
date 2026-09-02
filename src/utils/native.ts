import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Initializes native mobile features (Status bar styling & back button handler)
 */
export function initNativeApp(onBackPress?: () => boolean): void {
  if (!isNativePlatform()) return;

  // Set dark status bar
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#090a0f' }).catch(() => {});

  // Handle hardware back button on Android
  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (onBackPress) {
      const handled = onBackPress();
      if (handled) return;
    }
    if (canGoBack) {
      window.history.back();
    } else {
      CapApp.minimizeApp();
    }
  }).catch(() => {});
}

/**
 * Trigger haptic vibration for set completion, PR earned, or button presses
 */
export async function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light'): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    switch (type) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
    }
  } catch {
    // Ignore haptic errors on unsupported web views
  }
}
