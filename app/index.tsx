/**
 * The entry route. Sends each role to its own landing screen, and everyone else
 * to login.
 *
 * The mapping lives in lib/auth/permissions.ts, so this file never names a
 * role or a route.
 */

import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { landingRoute } from '@/lib/auth/permissions';

export default function IndexRoute() {
  const { status, role } = useAuth();

  if (status === 'restoring') {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator />
      </View>
    );
  }

  if (status === 'authenticated' && role) {
    return <Redirect href={landingRoute(role) as never} />;
  }

  return <Redirect href="/login" />;
}
