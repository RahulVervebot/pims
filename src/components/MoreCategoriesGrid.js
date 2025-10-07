// src/components/MoreCategoriesGrid.js
import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getTopCategories, capitalizeWords } from "../functions/product-function";
import AsyncStorage from '@react-native-async-storage/async-storage';

const PASTELS = ["#FFF3E0","#E8F5E9","#E3F2FD","#F3E5F5","#FFFDE7","#FCE4EC","#E0F7FA"];

/** Small image wrapper that shows a spinner while loading and a fallback on error */
const ProgressiveImage = memo(function ProgressiveImage({ uri, size, style }) {
  const [loading, setLoading] = useState(!!uri);
  const [error, setError] = useState(false);

  if (!uri || error) {
    return (
      <View style={[styles.image, styles.imagePlaceholder, { width: size, height: size }, style]}>
        <Text style={{ color: "#aaa", fontSize: 12 }}>{error ? "No Image" : "No Image"}</Text>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loaderOverlay]}>
          <ActivityIndicator />
        </View>
      )}
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size }, style]}
        resizeMode="cover"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setError(true); setLoading(false); }}
      />
    </View>
  );
});

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
  const [bottomBanner, setBottomBanner] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const cats = await getTopCategories();
        const bb = await AsyncStorage.getItem('bottombanner');
        setBottomBanner(bb || '');
        // keep non-toplist only
        setAllCats((cats || []).filter((c) => !c.toplist));
      } catch (e) {
        console.log("Failed to fetch categories:", e?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goToCategory = useCallback((cat) => {
    navigation.navigate("CategoryProducts", {
        id: String(cat._id),
       category: cat.category,
      backgroundUri: cat.topbannerbottom || bottomBanner,
    });
  }, [navigation, bottomBanner]);

  const renderItem = useCallback(({ item, index }) => {
    const bg = PASTELS[index % PASTELS.length];
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => goToCategory(item)}
        style={[styles.card, { backgroundColor: bg, width: cardWidth }]}
      >
        <ProgressiveImage uri={`data:image/webp;base64,${item.image}`} size={imageSize} />
        <Text style={styles.title} numberOfLines={2}>
          {capitalizeWords(item.category)}
        </Text>
      </TouchableOpacity>
    );
  }, [cardWidth, imageSize, goToCategory]);

  const keyExtractor = useCallback((item) => String(item._id || item.category), []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ color: "#666", marginTop: 6 }}>Loading categories…</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingBottom: 16 }}>
      <FlatList
        key={NUM_COLUMNS} // reflow on breakpoint change
        data={allCats}
        keyExtractor={keyExtractor}
        numColumns={NUM_COLUMNS}
        // IMPORTANT: keep virtualization ON
        scrollEnabled={true}
        nestedScrollEnabled={true} // allow nested lists inside parent scroll
        renderItem={renderItem}
        columnWrapperStyle={{ gap: COL_GAP, marginBottom: COL_GAP }}
        contentContainerStyle={{
          paddingHorizontal: H_PADDING,
          paddingTop: 6,
          paddingBottom: 24,
        }}
        // Performance knobs for big lists
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        getItemLayout={(_, index) => {
          // approximate item height to help virtualization (card has image + text + paddings)
          const cardHeight = imageSize + 10 /*padding*/ + 18 /*title area approx*/;
          return { length: cardHeight, offset: cardHeight * Math.floor(index / NUM_COLUMNS), index };
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: "#666" }}>No categories found.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 10, alignItems: "center" },
  image: { borderRadius: 10, marginBottom: 8 },
  imagePlaceholder: { backgroundColor: "#f2f2f2", alignItems: "center", justifyContent: "center" },
  loaderOverlay: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 10 },

  title: { textAlign: "center", color: "#222", fontWeight: "700", fontSize: 12 },
  center: { justifyContent: "center", alignItems: "center", paddingVertical: 16 },
});
