import { requireSession } from '@/server/session';
import View from './view';

export default async function Page() {
  await requireSession();
  return <View />;
}
