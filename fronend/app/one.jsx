import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const BASE_URL = "http://10.0.2.2:8000";

async function getJson(path, signal) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, { signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("Cannot reach the server. Check your connection.");
  }

  const body = await response.json();

  if (!response.ok) {
    const error = new Error(
      typeof body.detail === "string"
        ? body.detail
        : "Could not load robots."
    );
    error.status = response.status;
    throw error;
  }

  return body;
}

export default function OneRobotScreen() {
  const [robots, setRobots] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState(null);
  const [robot, setRobot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();

      async function load() {
        setLoading(true);
        setError(null);
        setRobot(null);
        setRobots([]);

        try {
          const path =
            selectedName === null
              ? "/robots"
              : `/robots/${encodeURIComponent(selectedName)}`;

          const data = await getJson(path, controller.signal);

          if (controller.signal.aborted) return;

          if (selectedName === null) {
            if (!Array.isArray(data)) {
              throw new Error("The server returned an invalid robot list.");
            }
            setRobots(data);
          } else {
            setRobot(data);
          }
        } catch (err) {
          if (!controller.signal.aborted) {
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

      load();

      return () => controller.abort();
    }, [selectedName, attempt])
  );

  const filteredRobots = robots.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {selectedName === null ? "Select a Robot" : "Robot Details"}
      </Text>

      {selectedName !== null && (
        <Button
          title="Choose another robot"
          onPress={() => setSelectedName(null)}
        />
      )}

      {loading && <ActivityIndicator size="large" />}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error.message}</Text>
          {error.code !== null && (
            <Text>Error code: {error.code}</Text>
          )}
          <Button
            title="Retry"
            onPress={() => setAttempt((value) => value + 1)}
          />
        </View>
      )}

      {!loading && !error && selectedName === null && (
        <>
          <TextInput
            placeholder="Search by robot name"
            value={query}
            onChangeText={setQuery}
            style={styles.input}
          />

          <FlatList
            data={filteredRobots}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={<Text>No matching robots.</Text>}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedName(item.name)}
                style={styles.row}
              >
                <Text style={styles.name}>{item.name}</Text>
                <Text>${item.price.toFixed(2)}</Text>
              </Pressable>
            )}
          />
        </>
      )}

      {!loading && !error && robot && (
        <View style={styles.details}>
          {robot.imageUrl ? (
            <Image
              source={{ uri: robot.imageUrl }}
              style={styles.image}
            />
          ) : null}
          <Text style={styles.title}>{robot.name}</Text>
          <Text>${robot.price.toFixed(2)}</Text>
          <Text>{robot.description}</Text>
        </View>
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
    fontWeight: "bold",
    fontSize: 18,
  },
  details: {
    gap: 12,
  },
  image: {
    width: 160,
    height: 160,
  },
  errorBox: {
    padding: 16,
    gap: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
  },
  errorText: {
    color: "#991b1b",
  },
});