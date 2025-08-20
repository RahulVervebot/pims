import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView } from "react-native";
import ProductList from "../components/ProductList";
import CategoryList from "../components/CategoryList";
import CustomHeader from "../components/CustomHeader";
import ReportScreen from "./ReportScreen";
export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState("men"); // default tab
  const tabBackgrounds = {
    men: { type: "color", value: "#4c669f" },
   category: { type: "color", value: "#ff9a9e" },
   // category: { type: "gif", value: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif" }, // fixed value (no array for color)
    kids: { type: "image", value: "https://picsum.photos/800/200" },
  };
  backgroundType="gif"
  backgroundValue=""
  const currentBackground = tabBackgrounds[activeTab];

  const renderTabRowBackground = (children) => {
    if (currentBackground.type === "image") {
      return (
        <View style={[styles.tabRow, { backgroundColor: "transparent" }]}>
          {children}
        </View>
      );
    } else {
      return (
        <View
          style={[styles.tabRow, { backgroundColor: currentBackground.value }]}
        >
          {children}
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: currentBackground.type === "color" ? currentBackground.value : "#fff" }}>
      {/* StatusBar color match */}
      <StatusBar
        backgroundColor={currentBackground.type === "color" ? currentBackground.value : "transparent"}
        barStyle="light-content" // you can change to "dark-content"
        translucent={currentBackground.type === "image" || currentBackground.type === "gradient"}
      />

      <CustomHeader
        address="123, MG Road"
        backgroundType={currentBackground.type}
        backgroundValue={currentBackground.value}
      />

      {renderTabRowBackground(
        <>
          <TouchableOpacity
            style={[styles.tab, activeTab === "men" && styles.activeTab]}
            onPress={() => setActiveTab("men")}
          >
            <Text style={styles.tabText}>Men</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "category" && styles.activeTab]}
            onPress={() => setActiveTab("category")}
          >
            <Text style={styles.tabText}>Category</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "kids" && styles.activeTab]}
            onPress={() => setActiveTab("kids")}
          >
            <Text style={styles.tabText}>Kids</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Content Area */}
      <View style={styles.content}>
        {activeTab === "men" && <ProductList category="men" />}
        {activeTab === "category" && <CategoryList category="category" />}
        {activeTab === "kids" && <ReportScreen category="kids" />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  tabRow: { flexDirection: "row", backgroundColor: "#007bff" },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#eee",
    marginRight: 10,
  },
  activeTab: { backgroundColor: "#007bff" },
  tabText: { color: "#000" },
  content: { flex: 1 },
});
