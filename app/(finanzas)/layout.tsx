import { FinanceProvider } from "@/components/finance/finance-provider";
import { FinanceShell } from "@/components/finance/finance-shell";

export default function FinanzasLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <FinanceProvider>
      <FinanceShell>{children}</FinanceShell>
    </FinanceProvider>
  );
}

