import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUserWallets } from "@/lib/actions/finance";
import DashboardClient from "./dashboard-client";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  // S'assurer que l'utilisateur a au moins un portefeuille personnel
  const count = await db.walletUser.count({ where: { userId } });
  if (count === 0) {
    await db.wallet.create({
      data: {
        name: "Portefeuille Personnel",
        isPersonal: true,
        ownerId: userId,
        users: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });
  }

  const wallets = await getUserWallets();
  const initialWalletId = (session.user as any).activeWalletId || (wallets[0] ? wallets[0].id : "");

  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#0b0f19" }} />}>
      <DashboardClient initialWallets={wallets} initialWalletId={initialWalletId} user={session.user} />
    </Suspense>
  );
}
