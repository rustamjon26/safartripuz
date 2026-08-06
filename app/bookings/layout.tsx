import AuthGate from "@/components/auth/AuthGate";

export default function BookingsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
