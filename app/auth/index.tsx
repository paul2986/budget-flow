
// This file has been removed as part of the offline-first refactor
// The app no longer requires authentication
import { Redirect } from 'expo-router';

export default function AuthIndex() {
  return <Redirect href="/" />;
}
