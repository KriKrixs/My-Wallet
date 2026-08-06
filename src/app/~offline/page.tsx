"use client";

import { useEffect, useState } from "react";
import { Container, Paper, Title, Text, Button, Stack, ThemeIcon, Badge } from "@mantine/core";
import { IconWifiOff, IconRefresh } from "@tabler/icons-react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      window.location.reload();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0b0f19",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        color: "#fff",
      }}
    >
      <Container size="xs">
        <Paper
          p="xl"
          radius="lg"
          style={{
            backgroundColor: "#121829",
            border: "1px solid rgba(255,255,255,0.08)",
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}
        >
          <Stack align="center" gap="md">
            <ThemeIcon size={72} radius="xl" color="red" variant="light">
              <IconWifiOff size={40} />
            </ThemeIcon>

            <div>
              <Badge color="red" variant="filled" mb="xs">
                Hors connexion
              </Badge>
              <Title order={2} style={{ color: "#fff" }} mb="xs">
                Connexion à l'application impossible
              </Title>
              <Text size="sm" c="dimmed">
                Cette application nécessite une connexion Internet active pour fonctionner et sécuriser vos données financières. Le mode hors-ligne n'est pas disponible.
              </Text>
            </div>

            <Button
              size="md"
              color="teal"
              fullWidth
              leftSection={<IconRefresh size={18} />}
              onClick={() => window.location.reload()}
            >
              Réessayer la connexion
            </Button>
          </Stack>
        </Paper>
      </Container>
    </div>
  );
}
