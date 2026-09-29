import { router } from 'expo-router';

/** Back, or the library root when the screen is the first in the stack (e.g. opened by a deep link). */
export function closeScreen() {
  if (router.canGoBack()) router.back();
  else router.replace('/library');
}
