import AuthGate from "@/components/auth/AuthGate";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
