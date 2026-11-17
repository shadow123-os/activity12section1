import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="all" options={{ title: "All Robots" }} />
      <Stack.Screen name="one" options={{ title: "View One Robot" }} />
      <Stack.Screen name="add" options={{ title: "Add Robot" }} />
      <Stack.Screen name="modify" options={{ title: "Modify Robot" }} />
      <Stack.Screen name="delete" options={{ title: "Delete Robot" }} />
    </Stack>
  );
}