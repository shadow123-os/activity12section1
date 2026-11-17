import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";

const BASE_URL = "http://10.0.2.2:8000";

export default function AddRobot() {
  const router = useRouter();
  const submitting = useRef(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  async function saveRobot() {
    if (submitting.current || success) return;

    setError(null);

    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const cleanImageUrl = imageUrl.trim();
    const amount = Number(price);

    if (
      !cleanName ||
      !price.trim() ||
      !cleanDescription ||
      !cleanImageUrl
    ) {
      setError({ message: "All fields are required.", code: null });
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      setError({
        message: "Enter a valid price of zero or more.",
        code: null,
      });
      return;
    }

    try {
      const url = new URL(cleanImageUrl);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error();
      }
    } catch {
      setError({
        message: "Enter a valid image URL beginning with http:// or https://.",
        code: null,
      });
      return;
    }

    submitting.current = true;
    setSaving(true);

    try {
      let response;

      try {
        response = await fetch(`${BASE_URL}/robots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanName,
            price: amount,
            description: cleanDescription,
            imageUrl: cleanImageUrl,
          }),
        });
      } catch {
        throw new Error(
          "Cannot reach the server. Check your connection."
        );
      }

      const body = await response.json();

      if (!response.ok) {
        const requestError = new Error(
          typeof body.detail === "string"
            ? body.detail
            : "Could not save the robot."
        );
        requestError.status = response.status;
        throw requestError;
      }

      setSuccess(`${body.name} added successfully.`);
    } catch (err) {
      setError({
        message: err.message,
        code: err.status ?? null,
      });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.form}
      keyboardShouldPersistTaps="handled"
    >
      <Text>Name</Text>
      <TextInput
        placeholder="Robot name"
        value={name}
        onChangeText={setName}
        editable={!saving && !success}
        style={styles.input}
      />

      <Text>Price</Text>
      <TextInput
        placeholder="Price"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        editable={!saving && !success}
        style={styles.input}
      />

      <Text>Description</Text>
      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        editable={!saving && !success}
        style={styles.input}
      />

      <Text>Image URL</Text>
      <TextInput
        placeholder="https://robohash.org/robot5"
        value={imageUrl}
        onChangeText={setImageUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        editable={!saving && !success}
        style={styles.input}
      />

      {error && (
        <>
          <Text style={styles.error}>{error.message}</Text>
          {error.code !== null && (
            <Text>Error code: {error.code}</Text>
          )}
        </>
      )}

      {success ? (
        <>
          <Text style={styles.success}>{success}</Text>
          <Button
            title="Return to Robots"
            onPress={() => router.replace("/all")}
          />
        </>
      ) : (
        <Button
          title={saving ? "Saving..." : "Save Robot"}
          onPress={saveRobot}
          disabled={saving}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: 16,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 6,
    padding: 12,
  },
  error: {
    color: "#b91c1c",
  },
  success: {
    color: "#166534",
    fontWeight: "bold",
  },
});