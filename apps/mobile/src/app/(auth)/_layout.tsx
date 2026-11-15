import { Stack } from 'expo-router';
import { useStackOptions } from '@/components/role-layout';

export default function AuthLayout() {
  return <Stack screenOptions={useStackOptions()} />;
}
