import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import React from "react";
import { useNavigation } from "@react-navigation/native";

export default function Categories() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.navigate("ProductList", { category: "Men" })}
      >
        <Text>Men</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.navigate("Profile", { category: "Women" })}
      >
        <Text>Women</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.navigate("ProductList", { category: "Kids" })}
      >
        <Text>Kids</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
  },
  tab: {
    padding: 10,
    backgroundColor: "#eee",
    borderRadius: 6,
  },
});
