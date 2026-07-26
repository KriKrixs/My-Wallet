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
} from "@mantine/core";
import {
  IconWallet,
  IconServer,
  IconAlertCircle,
  IconLogin,
  IconShieldLock,
  IconUserCheck,
} from "@tabler/icons-react";
import { checkLdapEnabled } from "@/lib/actions/auth-config";

const mockUsers = [
  { label: "Kylian (Propriétaire)", value: "kylian@example.com", name: "Kylian" },
  { label: "Marie (Accès Complet)", value: "marie@example.com", name: "Marie" },
  { label: "Lucas (Lecture Seule)", value: "lucas@example.com", name: "Lucas" },
];

export default function LoginPage() {
  const [isLdapEnabled, setIsLdapEnabled] = useState<boolean | null>(null);

  // LDAP form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ldapError, setLdapError] = useState<string | null>(null);

  // Dev mock state
  const [selectedMockUser, setSelectedMockUser] = useState("kylian@example.com");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkLdapEnabled().then((enabled) => setIsLdapEnabled(enabled));
  }, []);

  const handleLdapLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setLdapError(null);

    const res = await signIn("active-directory", {
      username: username.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      // NextAuth encode l'erreur dans l'URL, on la décode
      let msg = "Identifiants incorrects ou serveur Active Directory inaccessible.";
      try {
        const decoded = decodeURIComponent(res.error);
        if (decoded && decoded !== "CredentialsSignin") msg = decoded;
      } catch (_) {}
      setLdapError(msg);
    } else if (res?.ok) {
      window.location.href = "/";
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
          <Stack align="center" gap="xs" mb="xl">
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

          {isLdapEnabled === null && (
            <Center py="xl">
              <Loader color="teal" type="dots" />
            </Center>
          )}

          {/* ── MODE PRODUCTION : formulaire LDAP ── */}
          {isLdapEnabled === true && (
            <form onSubmit={handleLdapLogin}>
              <Stack gap="md">
                {ldapError && (
                  <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md" variant="light">
                    {ldapError}
                  </Alert>
                )}

                <TextInput
                  id="ldap-username"
                  label="Identifiant Active Directory"
                  placeholder="utilisateur ou utilisateur@domaine.local"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  leftSection={<IconServer size={16} />}
                  size="md"
                  radius="md"
                  styles={{
                    input: { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" },
                    label: { color: "rgba(255,255,255,0.7)", marginBottom: 6 },
                  }}
                  required
                />

                <PasswordInput
                  id="ldap-password"
                  label="Mot de passe"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  size="md"
                  radius="md"
                  styles={{
                    input: { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" },
                    label: { color: "rgba(255,255,255,0.7)", marginBottom: 6 },
                  }}
                  required
                />

                <Button
                  id="ldap-login-btn"
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
                  Se connecter via Active Directory
                </Button>
              </Stack>
            </form>
          )}

          {/* ── MODE DÉVELOPPEMENT : liste mockée ── */}
          {isLdapEnabled === false && (
            <Stack gap="md">
              <Paper
                p="md"
                radius="md"
                style={{ backgroundColor: "rgba(255, 193, 7, 0.06)", border: "1px solid rgba(255,193,7,0.2)" }}
              >
                <Group gap="xs" mb="sm">
                  <IconShieldLock size={18} color="#fcc419" />
                  <Text size="xs" fw={700} c="yellow.4">
                    Comptes de test — Mode Développement Local
                  </Text>
                </Group>

                <Stack gap="xs">
                  <Select
                    id="mock-user-select"
                    label="Choisir un profil"
                    data={mockUsers}
                    value={selectedMockUser}
                    onChange={(val) => val && setSelectedMockUser(val)}
                    size="sm"
                    radius="md"
                    styles={{
                      input: { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" },
                      label: { color: "rgba(255,255,255,0.6)", marginBottom: 4 },
                    }}
                  />

                  <Button
                    id="mock-login-btn"
                    size="sm"
                    fullWidth
                    variant="gradient"
                    gradient={{ from: "teal.7", to: "cyan.5", deg: 135 }}
                    leftSection={<IconUserCheck size={18} />}
                    loading={loading}
                    onClick={handleMockLogin}
                    radius="md"
                    style={{ fontWeight: 600 }}
                  >
                    Se connecter avec ce profil
                  </Button>
                </Stack>
              </Paper>

              <Divider color="rgba(255,255,255,0.06)" />
              <Text size="xs" c="dimmed" ta="center">
                Passez <Text span c="teal.4" fw={600}>NEXT_PUBLIC_LDAP_ENABLED=&quot;true&quot;</Text> dans votre <Text span ff="monospace">.env</Text> pour activer la connexion Active Directory.
              </Text>
            </Stack>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
