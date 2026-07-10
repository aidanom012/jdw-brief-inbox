import { redirect } from "next/navigation";
import { canUseLocalDevPasscode, getCurrentRole } from "@/lib/auth";
import { PasscodeLogin } from "@/components/PasscodeLogin";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  if (getCurrentRole()) {
    redirect("/inbox");
  }

  return (
    <PasscodeLogin
      showError={searchParams.error === "1"}
      showLocalDevPasscode={canUseLocalDevPasscode()}
    />
  );
}
