import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeMenu() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Robots CRUD</Text>
      <Text style={styles.description}>Choose an action.</Text>

      <Link href="/all" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>All Robots</Text>
        </Pressable>
      </Link>

      <Link href="/one" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>View One Robot</Text>
        </Pressable>
      </Link>

      <Link href="/add" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Add Robot</Text>
        </Pressable>
      </Link>

      <Link href="/modify" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Modify Robot</Text>
        </Pressable>
      </Link>

      <Link href="/delete" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Delete Robot</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
    backgroundColor: "#fafafa",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  description: {
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});