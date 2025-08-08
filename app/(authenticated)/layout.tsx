import AuthWrapper from '@/components/auth/AuthWrapper';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthWrapper>
      {children}
    </AuthWrapper>
  );
} 