// Native feature utilities for Capacitor
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Check if running as native app
export const isNative = Capacitor.isNativePlatform();
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isIOS = Capacitor.getPlatform() === 'ios';

// Haptic feedback for page turns
export async function hapticPageTurn(): Promise<void> {
  if (!isNative) return;

  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Haptics not available, ignore
  }
}

// Haptic feedback for button taps
export async function hapticTap(): Promise<void> {
  if (!isNative) return;

  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // Haptics not available, ignore
  }
}

// Configure status bar for reading mode
export async function setStatusBarForReading(isDark: boolean): Promise<void> {
  if (!isNative) return;

  try {
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light
    });
    await StatusBar.setBackgroundColor({
      color: isDark ? '#0f172a' : '#f1f5f9'
    });
  } catch {
    // Status bar not available, ignore
  }
}

// Hide status bar for immersive reading
export async function hideStatusBar(): Promise<void> {
  if (!isNative) return;

  try {
    await StatusBar.hide();
  } catch {
    // Not available, ignore
  }
}

// Show status bar
export async function showStatusBar(): Promise<void> {
  if (!isNative) return;

  try {
    await StatusBar.show();
  } catch {
    // Not available, ignore
  }
}
