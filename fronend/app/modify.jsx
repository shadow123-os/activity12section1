import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const BASE_URL = "http://10.0.2.2:8000";

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error("Cannot reach the server. Check your connection.");
  }

  const body = await response.json();

  if (!response.ok) {
    const error = new Error(
      typeof body.detail === "string"
        ? body.detail
        : "The request failed. Check your input."
    );
    error.status = response.status;
    throw error;
  }

  return body;
}

export default function ModifyRobotScreen() {
  const [robots, setRobots] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();

      async function loadRobots() {
        setLoading(true);
        setError(null);

        try {
          const data = await request("/robots", {
            signal: controller.signal,
          });

          if (!Array.isArray(data)) {
            throw new Error("The server returned an invalid robot list.");
          }

          if (!controller.signal.aborted) {
            setRobots(data);
          }
        } catch (err) {
          if (!controller.signal.aborted) {
            setRobots([]);
            setError({
              message: err.message,
              code: err.status ?? null,
            });
          }
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      }

      loadRobots();
      return () => controller.abort();
    }, [attempt])
  );

  function chooseRobot(robot) {
    setSelected(robot);
    setName(robot.name);
    setPrice(String(robot.price));
    setDescription(robot.description);
    setImageUrl(robot.imageUrl || "");
    setError(null);
    setSuccess("");
  }

  async function saveRobot() {
    const amount = Number(price);
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const cleanImageUrl = imageUrl.trim();

    if (
      !cleanName ||
      !cleanDescription ||
      !price.trim() ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setError({
        message: "Enter a name, description, and valid nonnegative price.",
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

    if (
      robots.some(
        (robot) =>
          robot._id !== selected._id && robot.name === cleanName
      )
    ) {
      setError({
        message: "Another robot already has that name.",
        code: null,
      });
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess("");

    try {
      const updated = await request(
        `/robots/${encodeURIComponent(selected.name)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanName,
            price: amount,
            description: cleanDescription,
            imageUrl: cleanImageUrl,
          }),
        }
      );

      setSelected(updated);
      setRobots((current) =>
        current.map((robot) =>
          robot._id === updated._id ? updated : robot
        )
      );
      setSuccess(`${updated.name} updated successfully.`);
    } catch (err) {
      setError({
        message: err.message,
        code: err.status ?? null,
      });
    } finally {
      setSaving(false);
    }
  }

  const filteredRobots = robots.filter((robot) =>
    robot.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error.message}</Text>
          {error.code !== null && (
            <Text>Error code: {error.code}</Text>
          )}
          {!selected && (
            <Button
              title="Retry"
              onPress={() => setAttempt((value) => value + 1)}
            />
          )}
        </View>
      )}

      {selected ? (
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Edit {selected.name}</Text>

          <Text>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            editable={!saving}
            style={styles.input}
          />

          <Text>Price</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            editable={!saving}
            style={styles.input}
          />

          <Text>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            editable={!saving}
            style={styles.input}
          />

          <Text>Image URL</Text>
          <TextInput
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
            style={styles.input}
          />

          {success ? (
            <Text style={styles.success}>{success}</Text>
          ) : null}

          <Button
            title={saving ? "Saving..." : "Save Changes"}
            onPress={saveRobot}
            disabled={saving}
          />

          <Button
            title="Choose Another Robot"
            disabled={saving}
            onPress={() => {
              setSelected(null);
              setError(null);
              setSuccess("");
              setAttempt((value) => value + 1);
            }}
          />
        </ScrollView>
      ) : (
        <>
          <Text style={styles.title}>Select a Robot to Modify</Text>

          <TextInput
            placeholder="Search by robot name"
            value={query}
            onChangeText={setQuery}
            style={styles.input}
          />

          {loading && <ActivityIndicator size="large" />}

          <FlatList
            data={filteredRobots}
            keyExtractor={(robot) => robot._id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              !loading && !error ? (
                <Text>No matching robots.</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => chooseRobot(item)}
                style={styles.row}
              >
                <Text style={styles.name}>{item.name}</Text>
                <Text>${item.price.toFixed(2)}</Text>
              </Pressable>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
    backgroundColor: "#fafafa",
  },
  form: {
    gap: 12,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 6,
    padding: 12,
  },
  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
  },
  errorBox: {
    padding: 12,
    gap: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 6,
  },
  errorText: {
    color: "#991b1b",
  },
  success: {
    color: "#166534",
    fontWeight: "bold",
  },
});