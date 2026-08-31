import AuthGate from "@/components/auth/AuthGate";

export const metadata = {
  title: "Safar Yig'uvchi | SafarTrip",
  description: "O'zingiz uchun ideal safarni yig'ing",
};

export default function TripBuilderLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
