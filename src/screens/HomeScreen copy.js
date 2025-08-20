import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import ProductList from "../components/ProductList";
import ReportList from "../components/CategoryList"
import CustomHeader from '../components/CustomHeader';
export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState("men"); // default tab

   const tabBackgrounds = {
    men: { type: "color", value: "#4c669f" },
      women: { type: "color", value: "#ff9a9e" },
    kids: { type: "image", value: "https://picsum.photos/800/200" },
  };

  const currentBackground = tabBackgrounds[activeTab];
    const renderTabRowBackground = (children) => {
    if (currentBackground.type === "image") {
      return (
        <View
          style={[
            styles.tabRow,
            { backgroundColor: "transparent" }, // transparent to show image
          ]}
        >
          {children}
        </View>
      );
    } else if (currentBackground.type === "gradient") {
      return (
        <LinearGradient
          colors={currentBackground.value}
          style={styles.tabRow}
        >
          {children}
        </LinearGradient>
      );
    } else {
      return (
        <View
          style={[
            styles.tabRow,
            { backgroundColor: currentBackground.value },
          ]}
        >
          {children}
        </View>
      );
    }
  };
  return (
   <View style={{ flex: 1 }}>
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
          style={[styles.tab, activeTab === "women" && styles.activeTab]}
          onPress={() => setActiveTab("women")}
        >
          <Text style={styles.tabText}>Women</Text>
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
        {activeTab === "women" && <ReportList category="women" />}
        {activeTab === "kids" && <ProductList category="kids" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  tabRow: { flexDirection: "row",backgroundColor: "007bff"},
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
