// src/screens/HomeScreen.js
import React, { useEffect, useMemo, useState, useContext, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Image,
  RefreshControl,
} from "react-native";
import CustomHeader from "../components/CustomHeader";
import ProductSearch from "../components/ProductSearch";
import ProductList from "../components/ProductList";
import { getTopCategories, looksLikeSvg, capitalizeWords } from "../functions/function";
import MoreCategoriesGrid from "../components/MoreCategoriesGrid";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CartContext } from "../context/CartContext";
import { SvgUri } from "react-native-svg";
import CreateProductModal from "../components/CreateProductModal";
import { useNavigation } from "@react-navigation/native";
import Video from "react-native-video";
import TulsiScreen from "../assets/images/LoginScreen.png"
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
  const navigation = useNavigation();
  const [showCreate, setShowCreate] = useState(false);

  // Loader state
  const [showScreen, setShowScreen] = useState(false);

  const insets = useSafeAreaInsets();
  const { cart } = useContext(CartContext);
  const [address, setAdress] = useState("123 mg road");

  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  const activeIconColor = "#F57200";

  // Home pull-to-refresh state
  const [homeRefreshing, setHomeRefreshing] = useState(false);

  // Key to remount ProductList (so its useEffect runs even if category stays the same)
  const [listReloadKey, setListReloadKey] = useState(0);

  // Initial categories load (and hiding the loader video when done)
  useEffect(() => {
    (async () => {
      try {
        setShowScreen(true);
        const all = await getTopCategories();

        const allCat = all.find((c) => (c.category || "").toLowerCase() === "all");
        const others = all.filter((c) => c.toplist && (c.category || "").toLowerCase() !== "all");

        const ordered = [];
        if (allCat) ordered.push(allCat);
        ordered.push(...others);

        const normalized = ordered.map((c) => ({
          _id: c._id,
          value: c.category,
          label: capitalizeWords(String(c.category || "")),
          topicon: c.topicon || null,
          topbanner: c.topbanner || null,
          topbannerbottom: c.topbannerbottom || null,
        }));

        setTabs(normalized);
        if (normalized.length > 0) {
          setActiveTab((prev) => (prev && normalized.some((t) => t.value === prev) ? prev : normalized[0].value));
        } else {
          setActiveTab("");
        }
      } catch (e) {
        console.error("Failed to load categories:", e?.message);
        setTabs([]);
        setActiveTab("");
      } finally {
        // hide loader in all cases
        setShowScreen(false);
      }
    })();
  }, []);

  const currentTab = useMemo(() => tabs.find((t) => t.value === activeTab), [tabs, activeTab]);

  // Header background: use topbanner image if present, else color
  const currentBackground = useMemo(() => {
    if (currentTab?.topbanner) {
      return { type: "image", value: currentTab.topbanner };
    }
    return { type: "color", value: "#2CA32C" };
  }, [currentTab]);

  // Home pull-to-refresh handler:
  // 1) Show top spinner
  // 2) Remount ProductList via key so it re-fetches (no changes to ProductList needed)
  const onHomeRefresh = useCallback(async () => {
    try {
      setHomeRefreshing(true);
      // Small tick to ensure remount & re-run of ProductList useEffect
      setListReloadKey((k) => k + 1);
      // Optional tiny delay so spinner is visible even if fetch is very fast
      await new Promise((r) => setTimeout(r, 350));
    } finally {
      setHomeRefreshing(false);
    }
  }, []);

  // Full-screen loader video
  if (showScreen) {
    return (
      <View style={styles.loaderWrap}>
        <StatusBar backgroundColor="black" barStyle="light-content" />
        <Video
          source={require("../assets/images/Loader.mp4")}
          style={styles.video}
          resizeMode="cover"
          repeat
          muted
          playWhenInactive
          playInBackground={false}
        />
            {/* <Image 
                source={TulsiScreen}  // if TulsiScreen is a require/import image
                style={{ width: "100%", height: "100%" }} // add style to make it visible
                resizeMode="cover" // or 'cover' based on your need
              /> */}
      </View>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: currentBackground.type === "color" ? currentBackground.value : "#fff",
      }}
    >
      <StatusBar
        backgroundColor={currentBackground.type === "color" ? currentBackground.value : "transparent"}
        barStyle="light-content"
        translucent={currentBackground.type === "image"}
      />

      <CustomHeader backgroundType={currentBackground.type} backgroundValue={currentBackground.value}>
        <ProductSearch />
        {/* Dynamic tabs from API (All first, others next) */}
        <View style={[styles.tabRow, { backgroundColor: "transparent" }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {tabs.map((t) => (
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
          refreshControl={<RefreshControl refreshing={homeRefreshing} onRefresh={onHomeRefresh} />}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 16 + insets.bottom,
          }}
        >
          {activeTab ? (
            // Remount on refresh using listReloadKey; pass bottom banner as background
            <ProductList
              key={`${activeTab}-${listReloadKey}`}
              category={activeTab}
              backgroundUri={currentTab?.topbannerbottom || null}
            />
          ) : (
            <View style={{ padding: 16 }}>
              <Text style={{ color: "#444" }}>No categories available.</Text>
            </View>
          )}

          <MoreCategoriesGrid />
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
                zIndex: 9999,
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
          }}
        >
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
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
              zIndex: 9999,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Create products +</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CreateProductModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          // If you want to refresh immediately after product creation:
          setListReloadKey((k) => k + 1);
          setShowCreate(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    backgroundColor: "black",
  },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
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
