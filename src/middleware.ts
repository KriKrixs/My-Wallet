import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/((?!health|api/health|api/auth|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)",
  ],
};
