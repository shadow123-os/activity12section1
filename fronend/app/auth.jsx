import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

const BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:8000"
    : "http://127.0.0.1:8000";

const TOKEN_KEY = "activity12.jwt";

async function request(path, options) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof body.detail === "string" ? body.detail : `HTTP ${response.status}`
    );
  }

  return body;
}

export default function Activity12Auth() {
  const [email, setEmail] = useState("activity12@example.com");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [greeting, setGreeting] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login() {
    setBusy(true);
    setError("");
    setStatus("");
    setGreeting("");

    try {
      const body = await request("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (typeof body.token !== "string" || !body.token) {
        throw new Error("The server did not return a token.");
      }

      await AsyncStorage.setItem(TOKEN_KEY, body.token);
      setPassword("");
      setStatus("Login successful. JWT saved in AsyncStorage.");
      console.log("Activity 12: JWT saved in AsyncStorage.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadProtected() {
    setBusy(true);
    setError("");
    setGreeting("");

    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);

      if (!token) {
        throw new Error("Log in first to save a token.");
      }

      const body = await request("/protected", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGreeting(body.msg);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.form}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Activity 12 Login</Text>

      <Text>Email</Text>
      <TextInput
        style={styles.input}
        accessibilityLabel="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text>Password</Text>
      <TextInput
        style={styles.input}
        accessibilityLabel="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button
        title="Log in"
        onPress={login}
        disabled={busy || !email.trim() || !password}
      />

      {status ? <Text style={styles.success}>{status}</Text> : null}

      <Button
        title="Load protected data"
        onPress={loadProtected}
        disabled={busy}
      />

      {greeting ? <Text style={styles.success}>{greeting}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 6,
    padding: 12,
  },
  success: { color: "#166534", fontWeight: "bold" },
  error: { color: "#b91c1c" },
});