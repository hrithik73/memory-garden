import { Alert, Platform } from 'react-native';

// React Native's Alert does nothing on web, so fall back to the browser's own dialogs there.

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

/** Ask before doing something destructive; calls `onConfirm` if the person agrees. */
export function confirmDestructive(title: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(title)) onConfirm();
    return;
  }
  Alert.alert(title, undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}
