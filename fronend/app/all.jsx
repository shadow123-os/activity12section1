import { useCallback, useState } from "react";
import { Link, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

const BASE_URL = "http://10.0.2.2:8000";
const ROBOTS_PATH = "/robots";

export default function HomeScreen() {
  const [robots, setRobots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRobots = useCallback(async (signal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}${ROBOTS_PATH}`, { signal });

      if (!response.ok) {
        let detail = "";

        try {
          const body = await response.json();
          if (typeof body.detail === "string") {
            detail = body.detail;
          }
        } catch {
          // Some error responses have no JSON body.
        }

        const messages = {
          404: detail || "Robots not found.",
          503: "Service unavailable. Please try again later.",
          500: "Server error. Please try again later.",
        };

        const requestError = new Error(
          messages[response.status] || detail || "Unexpected server error."
        );
        requestError.status = response.status;
        throw requestError;
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("The server returned an invalid robot list.");
      }

      if (!signal?.aborted) {
        setRobots(data);
      }
    } catch (err) {
      if (signal?.aborted) return;

      console.log("Fetch robots error:", err);
      setRobots([]);

      const networkFailure =
        err instanceof TypeError ||
        /fetch failed|network request failed|failed to connect/i.test(
          err.message || ""
        );

      setError({
        message: networkFailure
          ? "Cannot reach the server. Check your connection."
          : err.message,
        code: err.status ?? null,
      });
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      fetchRobots(controller.signal);

      return () => controller.abort();
    }, [fetchRobots])
  );

  return (
    <View style={styles.container}>
      <Link href="/add" style={styles.addLink}>
        + Add Robot
      </Link>

      <Link href="/one" style={styles.addLink}>
        View One Robot
      </Link>

      <Link href="/modify" style={styles.addLink}>
        Modify Robot
      </Link>

      <Link href="/delete" style={styles.addLink}>
        Delete Robot
      </Link>

      {loading && (
        <ActivityIndicator size="large" style={styles.loading} />
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error.message}</Text>

          {error.code !== null && (
            <Text style={styles.errorCode}>Error code: {error.code}</Text>
          )}

          <Button
            title="Retry"
            onPress={() => fetchRobots()}
            disabled={loading}
          />
        </View>
      )}

      <FlatList
        data={robots}
        keyExtractor={(robot) => robot._id}
        ListEmptyComponent={
          !loading && !error ? <Text>No robots yet.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.image}
              />
            ) : null}

            <View style={styles.details}>
              <Text style={styles.name}>{item.name}</Text>
              <Text>${item.price.toFixed(2)}</Text>
              <Text>{item.description}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fafafa",
  },
  addLink: {
    color: "#2563eb",
    paddingBottom: 16,
  },
  loading: {
    marginVertical: 20,
  },
  errorBox: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    color: "#991b1b",
  },
  errorCode: {
    color: "#555",
    fontSize: 12,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  image: {
    width: 64,
    height: 64,
  },
  details: {
    flex: 1,
  },
  name: {
    fontWeight: "bold",
  },
});