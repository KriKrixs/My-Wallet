"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import {
  Box,
  Container,
  Paper,
  Title,
  Text,
  Button,
  TextInput,
  PasswordInput,
  Stack,
  ThemeIcon,
  Badge,
  Alert,
  Divider,
  Select,
  Group,
  Loader,
  Center,
  SegmentedControl,
} from "@mantine/core";
import {
  IconWallet,
  IconServer,
  IconAlertCircle,
  IconLogin,
  IconShieldLock,
  IconUserCheck,
  IconUserPlus,
  IconCheck,
  IconFingerprint,
} from "@tabler/icons-react";
import { checkLdapEnabled, getAuthModeServerAction } from "@/lib/actions/auth-config";
import { registerLocalUser } from "@/lib/actions/auth-local";
import { generatePasskeyAuthenticationOptionsAction } from "@/lib/actions/passkey";

const mockUsers = [
  { label: "Kylian (Propriétaire)", value: "kylian@example.com", name: "Kylian" },
  { label: "Marie (Accès Complet)", value: "marie@example.com", name: "Marie" },
  { label: "Lucas (Lecture Seule)", value: "lucas@example.com", name: "Lucas" },
];

export default function LoginPage() {
  const [isLdapEnabled, setIsLdapEnabled] = useState<boolean | null>(null);
  const [authConfig, setAuthConfig] = useState<{
    mode: "OIDC" | "LDAP" | "LOCAL";
    oidcClientName: string;
    isOidcEnabled: boolean;
    isLdapEnabled: boolean;
  } | null>(null);
  const [oidcLoading, setOidcLoading] = useState(false);
  const [oidcAutoRedirecting, setOidcAutoRedirecting] = useState(false);

  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");

  const isDevLoginEnabled =
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN !== undefined && process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN !== ""
      ? process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true"
      : process.env.NODE_ENV === "development";

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  // Dev mock state
  const [selectedMockUser, setSelectedMockUser] = useState("kylian@example.com");

  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  useEffect(() => {
    getAuthModeServerAction().then((cfg) => {
      setAuthConfig(cfg);
      setIsLdapEnabled(cfg.isLdapEnabled);

      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const isLogout = urlParams.get("logout") === "true";

        // Auto SSO Redirect si OIDC est le mode actif et pas de déconnexion manuelle
        if (cfg.isOidcEnabled && (cfg.mode === "OIDC" || !isLogout) && !isLogout) {
          setOidcAutoRedirecting(true);
          signIn("authentik", { callbackUrl: "/" });
        }
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const u = username.trim();
    if (!u && !password) {
      setAuthError("Veuillez saisir votre identifiant et votre mot de passe.");
      return;
    }
    if (!u) {
      setAuthError("Veuillez saisir votre identifiant ou adresse e-mail.");
      return;
    }
    if (!password) {
      setAuthError("Veuillez saisir votre mot de passe.");
      return;
    }

    setLoading(true);

    const res = await signIn("active-directory", {
      username: u,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      let msg = "Identifiants incorrects.";
      try {
        const decoded = decodeURIComponent(res.error);
        if (decoded && decoded !== "CredentialsSignin") msg = decoded;
      } catch (_) {}
      setAuthError(msg);
    } else if (res?.ok) {
      window.location.href = "/";
    }
  };

  const handlePasskeyLogin = async () => {
    setAuthError(null);
    setAuthSuccess(null);
    setPasskeyLoading(true);

    try {
      const options = await generatePasskeyAuthenticationOptionsAction(username.trim() || undefined);
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const response = await startAuthentication({ optionsJSON: options });

      const res = await signIn("passkey", {
        credentialResponse: JSON.stringify(response),
        redirect: false,
      });

      if (res?.error) {
        let msg = "Connexion par Passkey refusée ou non reconnue.";
        try {
          const decoded = decodeURIComponent(res.error);
          if (decoded && decoded !== "CredentialsSignin") msg = decoded;
        } catch (_) {}
        setAuthError(msg);
      } else if (res?.ok) {
        window.location.href = "/";
      }
    } catch (err: any) {
      if (err?.name !== "NotAllowedError") {
        setAuthError(err?.message || "Erreur lors de la connexion par Passkey.");
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setRegErrors({});

    const errors: Record<string, string> = {};
    if (!regName.trim()) errors.regName = "Le nom complet est obligatoire.";
    if (!regEmail.trim() || !regEmail.includes("@")) errors.regEmail = "Veuillez saisir une adresse e-mail valide.";
    if (!regPassword || regPassword.length < 6) errors.regPassword = "Le mot de passe doit contenir au moins 6 caractères.";
    if (regPassword !== regConfirmPassword) errors.regConfirmPassword = "Les mots de passe ne correspondent pas.";

    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await registerLocalUser({
        name: regName,
        email: regEmail,
        password: regPassword,
      });

      // Tentative de connexion automatique après inscription réussie
      const res = await signIn("active-directory", {
        username: regEmail.trim(),
        password: regPassword,
        redirect: false,
      });

      setLoading(false);

      if (res?.ok) {
        window.location.href = "/";
      } else {
        setAuthSuccess("Votre compte a été créé avec succès ! Vous pouvez maintenant vous connecter.");
        setUsername(regEmail.trim());
        setMode("LOGIN");
      }
    } catch (err: any) {
      setLoading(false);
      setAuthError(err?.message || "Une erreur est survenue lors de la création du compte.");
    }
  };

  const handleMockLogin = () => {
    setLoading(true);
    const user = mockUsers.find((u) => u.value === selectedMockUser)!;
    signIn("dev-login", {
      email: user.value,
      name: user.name,
      role: "USER",
      callbackUrl: "/",
    });
  };

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 60% 20%, #0d1b3e 0%, #050a14 70%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Background grid */}
      <Box
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      <Container size="xs" style={{ width: "100%", position: "relative" }}>
        <Paper
          radius="xl"
          p={36}
          withBorder
          style={{
            backgroundColor: "rgba(13, 18, 35, 0.9)",
            backdropFilter: "blur(24px)",
            borderColor: "rgba(99, 179, 237, 0.15)",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* Header */}
          <Stack align="center" gap="xs" mb="lg">
            <ThemeIcon
              size={64}
              radius="xl"
              variant="gradient"
              gradient={{ from: "teal.6", to: "cyan.4", deg: 135 }}
              style={{ boxShadow: "0 0 32px rgba(32, 201, 151, 0.3)" }}
            >
              <IconWallet size={36} />
            </ThemeIcon>

            <Title
              order={2}
              ta="center"
              style={{ color: "#fff", fontWeight: 800, letterSpacing: "-0.5px", marginTop: 8 }}
            >
              MyWallet
            </Title>
            <Text c="dimmed" size="sm" ta="center">
              Gestion de budget familial & finances personnelles
            </Text>
          </Stack>

          {isLdapEnabled === null ? (
            <Center py="xl">
              <Loader color="teal" type="dots" />
            </Center>
          ) : (
            <Stack gap="md">
              {/* Segmented Control Mode Connexion / Inscription */}
              <SegmentedControl
                fullWidth
                size="sm"
                color="teal"
                value={mode}
                onChange={(val) => {
                  setMode(val as "LOGIN" | "REGISTER");
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                data={[
                  { label: "Se Connecter", value: "LOGIN" },
                  { label: "Créer un compte", value: "REGISTER" },
                ]}
              />

              {authError && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md" variant="light">
                  {authError}
                </Alert>
              )}

              {authSuccess && (
                <Alert icon={<IconCheck size={16} />} color="teal" radius="md" variant="light">
                  {authSuccess}
                </Alert>
              )}

              {/* ── AUTO REDIRECT OIDC LOADING ── */}
              {oidcAutoRedirecting && (
                <Paper p="lg" radius="md" style={{ backgroundColor: "#182036", textAlign: "center" }}>
                  <Loader color="cyan" size="md" mx="auto" mb="sm" />
                  <Text size="sm" c="white" fw={600}>
                    Redirection vers {authConfig?.oidcClientName || "Authentik"}...
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    Connexion automatique en cours.
                  </Text>
                </Paper>
              )}

              {/* ── FORMULAIRE DE CONNEXION (OIDC, LDAP, LOCAL OU PASSKEY) ── */}
              {mode === "LOGIN" && !oidcAutoRedirecting && (
                <Stack gap="md">
                  {authConfig?.isOidcEnabled && (
                    <>
                      <Button
                        size="md"
                        fullWidth
                        variant="gradient"
                        gradient={{ from: "cyan.6", to: "blue.6", deg: 135 }}
                        leftSection={<IconShieldLock size={20} />}
                        loading={oidcLoading}
                        onClick={() => {
                          setOidcLoading(true);
                          signIn("authentik", { callbackUrl: "/" });
                        }}
                      >
                        Se connecter avec {authConfig.oidcClientName || "Authentik"}
                      </Button>

                      <Divider label="OU COMPTE LOCAL / PASSKEY" labelPosition="center" color="rgba(255,255,255,0.1)" />
                    </>
                  )}

                  <form onSubmit={handleLogin}>
                    <Stack gap="md">
                      <TextInput
                        id="login-username"
                        label="Identifiant ou E-mail"
                        placeholder="votre_compte ou email@exemple.com"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        leftSection={<IconServer size={16} />}
                        size="sm"
                        radius="md"
                        styles={{
                          input: { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" },
                          label: { color: "rgba(255,255,255,0.7)", marginBottom: 4 },
                        }}
                        required
                      />

                      <PasswordInput
                        id="login-password"
                        label="Mot de passe"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        size="sm"
                        radius="md"
                        styles={{
                          input: { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" },
                          label: { color: "rgba(255,255,255,0.7)", marginBottom: 4 },
                        }}
                        required
                      />

                      <Button
                        id="login-btn"
                        type="submit"
                        size="md"
                        fullWidth
                        loading={loading}
                        variant="gradient"
                        gradient={{ from: "teal.7", to: "cyan.5", deg: 135 }}
                        leftSection={<IconLogin size={18} />}
                        radius="md"
                        mt={4}
                        style={{ fontWeight: 600 }}
                      >
                        Se connecter
                      </Button>
                    </Stack>
                  </form>

                  <Divider label="OU CONNEXION PAR PASSKEY" labelPosition="center" color="rgba(255,255,255,0.1)" />

                  <Button
                    variant="outline"
                    color="teal"
                    size="sm"
                    radius="md"
                    fullWidth
                    leftSection={<IconFingerprint size={18} />}
                    loading={passkeyLoading}
                    onClick={handlePasskeyLogin}
                  >
                    Connexion par Passkey / Biométrie
                  </Button>
                </Stack>
              )}

              {/* ── FORMULAIRE D'INSCRIPTION COMPTE LOCAL ── */}
              {mode === "REGISTER" && (
                <form onSubmit={handleRegister}>
                  <Stack gap="sm">
                    <TextInput
                      label="Nom complet"
                      placeholder="ex: Jean Dupont"
                      value={regName}
                      onChange={(e) => {
                        setRegName(e.target.value);
                        if (regErrors.regName) setRegErrors((prev) => ({ ...prev, regName: "" }));
                      }}
                      error={regErrors.regName}
                      size="sm"
                      radius="md"
                      styles={{
                        input: { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" },
                        label: { color: "rgba(255,255,255,0.7)", marginBottom: 4 },
                      }}
                      required
                    />

                    <TextInput
                      label="Adresse e-mail"
                      placeholder="jean.dupont@exemple.com"
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        if (regErrors.regEmail) setRegErrors((prev) => ({ ...prev, regEmail: "" }));
                      }}
                      error={regErrors.regEmail}
                      size="sm"
                      radius="md"
                      styles={{
                        input: { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" },
                        label: { color: "rgba(255,255,255,0.7)", marginBottom: 4 },
                      }}
                      required
                    />

                    <PasswordInput
                      label="Mot de passe (6 caractères min)"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        if (regErrors.regPassword) setRegErrors((prev) => ({ ...prev, regPassword: "" }));
                      }}
                      error={regErrors.regPassword}
                      size="sm"
                      radius="md"
                      styles={{
                        input: { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" },
                        label: { color: "rgba(255,255,255,0.7)", marginBottom: 4 },
                      }}
                      required
                    />

                    <PasswordInput
                      label="Confirmer le mot de passe"
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => {
                        setRegConfirmPassword(e.target.value);
                        if (regErrors.regConfirmPassword) setRegErrors((prev) => ({ ...prev, regConfirmPassword: "" }));
                      }}
                      error={regErrors.regConfirmPassword}
                      size="sm"
                      radius="md"
                      styles={{
                        input: { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" },
                        label: { color: "rgba(255,255,255,0.7)", marginBottom: 4 },
                      }}
                      required
                    />

                    <Button
                      type="submit"
                      size="md"
                      fullWidth
                      loading={loading}
                      variant="gradient"
                      gradient={{ from: "teal.7", to: "cyan.5", deg: 135 }}
                      leftSection={<IconUserPlus size={18} />}
                      radius="md"
                      mt="xs"
                      style={{ fontWeight: 600 }}
                    >
                      Créer mon compte
                    </Button>
                  </Stack>
                </form>
              )}

              {/* ── MODE DÉVELOPPEMENT LOCAL (SI ACTIF EN ENV) ── */}
              {isDevLoginEnabled && (
                <>
                  <Divider color="rgba(255,255,255,0.08)" my="xs" />
                  <Paper
                    p="sm"
                    radius="md"
                    style={{ backgroundColor: "rgba(255, 193, 7, 0.05)", border: "1px solid rgba(255,193,7,0.15)" }}
                  >
                    <Group gap="xs" mb="xs">
                      <IconShieldLock size={16} color="#fcc419" />
                      <Text size="xs" fw={700} c="yellow.4">
                        Mode Développeur — Connexion rapide
                      </Text>
                    </Group>

                    <Stack gap="xs">
                      <Select
                        id="mock-user-select"
                        data={mockUsers}
                        value={selectedMockUser}
                        onChange={(val) => val && setSelectedMockUser(val)}
                        size="xs"
                        radius="md"
                        styles={{
                          input: { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" },
                        }}
                      />

                      <Button
                        id="mock-login-btn"
                        size="xs"
                        fullWidth
                        variant="subtle"
                        color="yellow"
                        leftSection={<IconUserCheck size={16} />}
                        loading={loading}
                        onClick={handleMockLogin}
                      >
                        Tester avec ce profil de démo
                      </Button>
                    </Stack>
                  </Paper>
                </>
              )}
            </Stack>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
