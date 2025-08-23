// src/components/MoreCategoriesGrid.js
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getTopCategories, capitalizeWords } from "../functions/function";

const PASTELS = ["#FFF3E0","#E8F5E9","#E3F2FD","#F3E5F5","#FFFDE7","#FCE4EC","#E0F7FA"];

export default function MoreCategoriesGrid() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Responsive grid
  const NUM_COLUMNS = isTablet ? 5 : 3;
  const H_PADDING = 12;
  const COL_GAP = isTablet ? 10 : 8;

  const cardWidth = useMemo(() => {
    const inner = width - H_PADDING * 2 - (NUM_COLUMNS - 1) * COL_GAP;
    return Math.floor(inner / NUM_COLUMNS);
  }, [width, NUM_COLUMNS]);

  const imageSize = cardWidth;

  const [allCats, setAllCats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const cats = await getTopCategories();
        setAllCats((cats || []).filter(c => !c.toplist));
      } catch (e) {
        console.error("Failed to fetch categories:", e?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goToCategory = (cat) => {
    navigation.navigate("CategoryProducts", {
      category: cat.category,
      backgroundUri: cat.topbannerbottom || null,
    });
  };

  const renderItem = ({ item, index }) => {
    const bg = PASTELS[index % PASTELS.length];
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => goToCategory(item)}
        style={[styles.card, { backgroundColor: bg, width: cardWidth }]}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={[styles.image, { width: imageSize, height: imageSize }]}
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.imagePlaceholder,
              { width: imageSize, height: imageSize },
            ]}
          >
            <Text style={{ color: "#aaa", fontSize: 12 }}>No Image</Text>
          </View>
        )}
        <Text style={styles.title} numberOfLines={2}>
          {capitalizeWords(item.category)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2C1E70" />
      </View>
    );
  }

  if (!allCats?.length) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#666" }}>No categories available.</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingBottom: 16 }}>
      <FlatList
        key={NUM_COLUMNS}                           // reflow on breakpoint change
        data={allCats}
        keyExtractor={(item) => item._id || item.category}
        numColumns={NUM_COLUMNS}
        scrollEnabled={false}                        // let parent ScrollView scroll
        removeClippedSubviews={false}                // avoid bottom cut-off
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        columnWrapperStyle={{ gap: COL_GAP, marginBottom: COL_GAP }}
        contentContainerStyle={{
          paddingHorizontal: H_PADDING,
          paddingTop: 6,
          paddingBottom: 24,                         // extra space for last row
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 10, alignItems: "center" },
  image: { borderRadius: 10, resizeMode: "cover", marginBottom: 8 },
  imagePlaceholder: { backgroundColor: "#f2f2f2", alignItems: "center", justifyContent: "center" },
  title: { textAlign: "center", color: "#222", fontWeight: "700", fontSize: 12 },
  center: { justifyContent: "center", alignItems: "center", paddingVertical: 16 },
});
