import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardClient from "./dashboard-client";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  // Récupérer les portefeuilles de l'utilisateur
  let userWallets = await db.walletUser.findMany({
    where: { userId },
    include: { wallet: true },
  });

  // Si aucun portefeuille, en créer un personnel automatiquement
  if (userWallets.length === 0) {
    const newWallet = await db.wallet.create({
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

    userWallets = [
      {
        walletId: newWallet.id,
        userId,
        role: "OWNER",
        wallet: newWallet,
      },
    ];
  }

  const wallets = userWallets.map((uw) => ({
    id: uw.wallet.id,
    name: uw.wallet.name,
    currency: uw.wallet.currency,
    isPersonal: uw.wallet.isPersonal,
    role: uw.role as any,
    isOwner: uw.wallet.ownerId === userId,
  }));

  const initialWalletId = (session.user as any).activeWalletId || wallets[0].id;

  return <DashboardClient initialWallets={wallets} initialWalletId={initialWalletId} user={session.user} />;
}
