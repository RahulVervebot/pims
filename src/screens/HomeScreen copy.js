import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView, ImageBackground } from "react-native";
import ProductList from "../components/ProductList";
import CategoryList from "../components/CategoryList";
import CustomHeader from "../components/CustomHeader";
import ReportScreen from "./ReportScreen";
import ProductSearch from "../components/ProductSearch";
import AllIcon from "../assets/icons/HomeIcon.svg"

// helper: accept local asset number OR url string
const getImageSource = (val) => (typeof val === "number" ? val : { uri: val });

// Reusable tab button with icon + label
function TabButton({ label, Icon, active, onPress, activeColor, inactiveColor = "#444" }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      {Icon ? (
        <Icon width={20} height={20} fill={active ? activeColor : inactiveColor} />
      ) : null}
      <Text style={[styles.tabText, { color: active ? activeColor : inactiveColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState("all");

  const tabBackgrounds = {
    all: { type: "color", value: "#2CA32C" }, // local asset ✅
    category: { type: "color", value: "#2CA32C" },
    kids: { type: "image", value: "https://picsum.photos/800/200" }, // remote url ✅
  };
  const activeIconColor = "#F57200";
  const currentBackground = tabBackgrounds[activeTab];

  const renderTabRowBackground = (children) => {
    return (
      <View style={[styles.tabRow, { backgroundColor: 'transparent' }]}>
        {children}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor:
          currentBackground.type === "color" ? currentBackground.value : "#fff",
      }}
    >
      <StatusBar
        backgroundColor={
          currentBackground.type === "color" ? currentBackground.value : "transparent"
        }
        barStyle="light-content"
        translucent={currentBackground.type === "image"}
      />

      {/* Pass a resolved source to CustomHeader to avoid type issues */}
<CustomHeader
  address="Tulsi"
  backgroundType={currentBackground.type}
  backgroundValue={currentBackground.value}   // ✅ this is the only one CustomHeader reads
>
<ProductSearch />
     {renderTabRowBackground(
          <>
            {/* ALL tab with icon */}
            <TabButton
              label="All"
              Icon={AllIcon}
              active={activeTab === "all"}
              onPress={() => setActiveTab("all")}
              activeColor={activeIconColor}
            />

            {/* Category tab (no icon yet; add your CategoryIcon when ready) */}
            <TabButton
              label="Category"
              Icon={null} // e.g. CategoryIcon
              active={activeTab === "category"}
              onPress={() => setActiveTab("category")}
              activeColor={activeIconColor}
            />

            {/* Kids tab (no icon yet; add your KidsIcon when ready) */}
            <TabButton
              label="Kids"
              Icon={null} // e.g. KidsIcon
              active={activeTab === "kids"}
              onPress={() => setActiveTab("kids")}
              activeColor={activeIconColor}
            />
          </>
        )}
</CustomHeader>

      <View style={styles.content}>
        {activeTab === "all" && <ProductList category="all" />}
        {activeTab === "category" && <CategoryList category="category" />}
        {activeTab === "kids" && <ReportScreen category="kids" />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
tabRow: {
    flexDirection: "row",
    // fixed typo: "transparent"
    backgroundColor: "transparent",
    gap: 10,
    paddingVertical: 8,
  },
  tab: {
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  tabText: {
    fontWeight: "700",
    fontSize: 14,
  },
  content: { flex: 1 },
});