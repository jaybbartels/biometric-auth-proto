import BiometricDashboard from '@/components/BiometricDashboard';

export const metadata = {
  title: 'Passive Biometric Authentication Prototype',
  description: 'Real-time security test verification with Supabase and Vercel'
};

export default function Home() {
  return <BiometricDashboard />;
}
