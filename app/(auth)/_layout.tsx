import { Stack } from 'expo-router';

import { PublicOnlyGuard } from '@/components/auth/route-guard';

/** Login and register. Anyone already signed in is sent to their landing route. */
export default function AuthLayout() {
  return (
    <PublicOnlyGuard>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </PublicOnlyGuard>
  );
}
