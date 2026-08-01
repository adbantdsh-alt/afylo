import { Redirect } from 'expo-router';

// La racine du site est « login-first » (façon instagram.com) :
// on atterrit directement sur l'écran de connexion / inscription.
export default function Index() {
  return <Redirect href="/login" />;
}
