// components/reports/ReportTabs.jsx
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import Svg, { Circle } from "react-native-svg";

const GOLD = "#319241";

function TabCircle({ active }) {
  return (
    <Svg width={44} height={44}>
      <Circle cx={22} cy={22} r={18} fill={active ? GOLD : "#FFFFFF"} stroke={GOLD} strokeWidth={2} />
    </Svg>
  );
}

/**
 * props:
 * - tabs: [{ key: 'POS Payment Collection', component: PosPaymentCollectionTab }, ...]
 * - apiData: { [key]: dataForThatTab }
 * - initialTab: string
 * - onTabChange?: (key)=>void
 */
export default function ReportTabs({ tabs = [], apiData = {}, initialTab, onTabChange }) {
  const [activeKey, setActiveKey] = useState(initialTab || tabs?.[0]?.key);
  const active = tabs.find((t) => t.key === activeKey);
  const ActiveComp = active?.component;

  const handleTab = useCallback(
    (key) => {
      setActiveKey(key);
      onTabChange && onTabChange(key);
    },
    [onTabChange]
  );

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{activeKey}</Text>
        <Text style={styles.subtitle}>Interactive report view</Text>
      </View>

      {/* Body scroll */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {ActiveComp ? (
          <ActiveComp data={apiData[activeKey]} />
        ) : (
          <View style={{ padding: 16 }}>
            <Text>Tab not configured.</Text>
          </View>
        )}

        {/* Bottom tabs selector */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Reports</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {tabs.map((t) => {
              const isActive = t.key === activeKey;
              return (
                <TouchableOpacity key={t.key} onPress={() => handleTab(t.key)} style={styles.tabCol}>
                  <TabCircle active={isActive} />
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={2}>
                    {t.key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#F7F7F8" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  title: { fontSize: 18, fontWeight: "800", color: "#111" },
  subtitle: { fontSize: 12, color: "#555", marginTop: 2 },

  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 12, paddingBottom: 16, gap: 12 },

  // bottom card
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  cardHeader: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: "800", color: "#111" },

  // tabs row
  tabsRow: { gap: 18, paddingVertical: 10, paddingHorizontal: 12 },
  tabCol: { alignItems: "center", width: 140 },
  tabLabel: { textAlign: "center", marginTop: 6, fontSize: 12, color: "#333", fontWeight: "700" },
  tabLabelActive: { color: "#000" },
});
