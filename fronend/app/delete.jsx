import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
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
        : "The request failed."
    );
    error.status = response.status;
    throw error;
  }

  return body;
}

export default function DeleteRobotScreen() {
  const [robots, setRobots] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();

      async function loadRobots() {
        setLoading(true);
        setError(null);
        setSelected(null);

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

  async function deleteRobot() {
    if (!selected || deleting) return;

    setDeleting(true);
    setError(null);
    setSuccess("");

    try {
      const result = await request(
        `/robots/${encodeURIComponent(selected.name)}`,
        { method: "DELETE" }
      );

      setRobots((current) =>
        current.filter((robot) => robot._id !== selected._id)
      );
      setSuccess(result.message);
      setSelected(null);
    } catch (err) {
      setError({
        message: err.message,
        code: err.status ?? null,
      });
    } finally {
      setDeleting(false);
    }
  }

  const filteredRobots = robots.filter((robot) =>
    robot.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delete a Robot</Text>

      {success ? (
        <Text style={styles.success}>{success}</Text>
      ) : null}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error.message}</Text>

          {error.code !== null && (
            <Text>Error code: {error.code}</Text>
          )}

          <Button
            title="Reload Robot List"
            disabled={deleting}
            onPress={() => {
              setSuccess("");
              setAttempt((value) => value + 1);
            }}
          />
        </View>
      )}

      {selected ? (
        <View style={styles.confirmation}>
          <Text style={styles.name}>{selected.name}</Text>
          <Text>${selected.price.toFixed(2)}</Text>
          <Text>{selected.description}</Text>
          <Text>Permanently delete this robot?</Text>

          <Button
            title={deleting ? "Deleting..." : "Confirm Delete"}
            color="#b91c1c"
            onPress={deleteRobot}
            disabled={deleting}
          />

          <Button
            title="Cancel"
            disabled={deleting}
            onPress={() => {
              setSelected(null);
              setError(null);
            }}
          />
        </View>
      ) : (
        <>
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
                style={styles.row}
                onPress={() => {
                  setSelected(item);
                  setError(null);
                  setSuccess("");
                }}
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
    gap: 16,
    backgroundColor: "#fafafa",
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
  confirmation: {
    padding: 16,
    gap: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  success: {
    color: "#166534",
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
});