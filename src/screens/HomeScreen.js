// src/screens/HomeScreen.js
import React, { useEffect, useMemo, useState,useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Image
} from "react-native";
import CustomHeader from "../components/CustomHeader";
import ProductSearch from "../components/ProductSearch";
import ProductList from "../components/ProductList";
import { getTopCategories, looksLikeSvg, capitalizeWords } from "../functions/function";
import MoreCategoriesGrid from "../components/MoreCategoriesGrid";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CartContext } from "../context/CartContext";  // ✅ use cart count here
import { SvgUri } from "react-native-svg";
// Tab button supporting SVG or raster icon
function TabButton({ label, iconUri, active, onPress, activeColor, inactiveColor = "#444" }) {
  const iconSize = 20;
  const tint = active ? activeColor : inactiveColor;
  const isSvg = looksLikeSvg(iconUri || "");

  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      {iconUri ? (
        isSvg ? (
          <SvgUri uri={iconUri} width={iconSize} height={iconSize} fill={tint} />
        ) : (
          <Image source={{ uri: iconUri }} style={{ width: iconSize, height: iconSize, tintColor: tint }} />
        )
      ) : null}
      <Text style={[styles.tabText, { color: tint }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
      const insets = useSafeAreaInsets();
        const { cart } = useContext(CartContext);         // ✅ get cart length

  const [tabs, setTabs] = useState([]);           // normalized tabs [{value,label,topicon,topbanner,topbannerbottom,...}]
  const [activeTab, setActiveTab] = useState(""); // string (category value)
  const activeIconColor = "#F57200";

  useEffect(() => {
    (async () => {
      try {
        const all = await getTopCategories();

        // Find 'all' (case-insensitive)
        const allCat = all.find(c => (c.category || '').toLowerCase() === 'all');
        // Other categories with toplist true, excluding 'all'
        const others = all.filter(c => c.toplist && (c.category || '').toLowerCase() !== 'all');

        // Build final tabs array: 'all' first (if exists), then others
        const ordered = [];
        if (allCat) ordered.push(allCat);
        ordered.push(...others);

        // Normalize to {value,label,...}
        const normalized = ordered.map(c => ({
          _id: c._id,
          value: c.category, // raw value for queries
          label: capitalizeWords(String(c.category || '')), // UI label capitalized
          topicon: c.topicon || null,
          topbanner: c.topbanner || null,
          topbannerbottom: c.topbannerbottom || null,
        }));

        setTabs(normalized);
        if (normalized.length > 0) {
          setActiveTab(prev =>
            prev && normalized.some(t => t.value === prev) ? prev : normalized[0].value
          );
        } else {
          setActiveTab("");
        }
      } catch (e) {
        console.error("Failed to load categories:", e?.message);
        setTabs([]);
        setActiveTab("");
      }
    })();
  }, []);

  const currentTab = useMemo(
    () => tabs.find(t => t.value === activeTab),
    [tabs, activeTab]
  );

  // Header background: use topbanner (image). If missing, fallback to color.
  const currentBackground = useMemo(() => {
    if (currentTab?.topbanner) {
      return { type: "image", value: currentTab.topbanner };
    }
    return { type: "color", value: "#2CA32C" };
  }, [currentTab]);

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

      <CustomHeader
        address="Tulsi"
        backgroundType={currentBackground.type}
        backgroundValue={currentBackground.value}
      >
        <ProductSearch />
        {/* Dynamic tabs from API (All first, others next) */}
        <View style={[styles.tabRow, { backgroundColor: "transparent" }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {tabs.map(t => (
              <TabButton
                key={t._id || t.value}
                label={t.label}
                iconUri={t.topicon}
                active={activeTab === t.value}
                onPress={() => setActiveTab(t.value)}
                activeColor={activeIconColor}
              />
            ))}
          </ScrollView>
        </View>
      </CustomHeader>
      <View style={styles.content}>
     <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 16 + insets.bottom, // ✅ keeps last row fully visible
          }}
        >
        {activeTab ? (
          
          // Pass the tab’s bottom banner to ProductList for its background
          <ProductList category={activeTab} backgroundUri={currentTab?.topbannerbottom || null} />
              
        ) : (
          <View style={{ padding: 16 }}>
            <Text style={{ color: "#444" }}>No categories available.</Text>
          </View>
        )}
      <MoreCategoriesGrid/>
      </ScrollView>
       {/* ✅ Global floating cart overlay */}
        {cart.length > 0 && (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              // this wrapper keeps touch target safe
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate("Cart")}
              style={{
                alignSelf: "flex-end",
                marginRight: 16,
                marginBottom: 12 + insets.bottom,
                backgroundColor: "#2c1e70",
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 30,
                elevation: 6,
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                zIndex: 9999, // ✅ ensure above everything
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>🛒 {cart.length}</Text>
            </TouchableOpacity>
          </View>
        )}
         <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 70,
              // this wrapper keeps touch target safe
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate("Cart")}
              style={{
                alignSelf: "flex-end",
                marginRight: 16,
                marginBottom: 12 + insets.bottom,
                backgroundColor: "#2c1e70",
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 30,
                elevation: 6,
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                zIndex: 9999, // ✅ ensure above everything
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Create products +</Text>
            </TouchableOpacity>
          </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    backgroundColor: "transparent",
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
  tabActive: {
    backgroundColor: "#ffffff33",
  },
  tabText: {
    fontWeight: "700",
    fontSize: 14,
  },
  content: { flex: 1 },
});