import { Wordmark } from "@/components/layout/Wordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Wordmark className="mb-10" showTagline />
        {children}
      </div>
    </main>
  );
}
