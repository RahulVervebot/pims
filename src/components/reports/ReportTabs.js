import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import Svg, { Circle } from "react-native-svg";

const ACTIVE_ICON = "#F6C343"; // requested active color
const INACTIVE_ICON = "#9EA0A6";

function DefaultTabIcon({ active }) {
  const color = active ? ACTIVE_ICON : INACTIVE_ICON;
  return (
    <Svg width={44} height={44}>
      {/* simple ring icon; no background highlight */}
      <Circle cx={22} cy={22} r={18} fill="#FFFFFF" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

/**
 * props:
 *  - tabs: [{ key, component, icon?: ReactComp, renderIcon?: ({active, color})=>ReactNode }]
 *  - apiData: { [key]: any }
 *  - initialTab?: string
 *  - onTabChange?: (key)=>void
 */
export default function ReportTabs({ tabs = [], apiData = {}, initialTab, onTabChange }) {
  const [activeKey, setActiveKey] = useState(initialTab || tabs?.[0]?.key);
  const active = useMemo(() => tabs.find((t) => t.key === activeKey), [tabs, activeKey]);
  const ActiveComp = active?.component;

  const handleTab = useCallback(
    (key) => {
      setActiveKey(key);
      onTabChange && onTabChange(key);
    },
    [onTabChange]
  );

  const renderIcon = (t, isActive) => {
    const color = isActive ? ACTIVE_ICON : INACTIVE_ICON;

    if (typeof t.renderIcon === "function") return t.renderIcon({ active: isActive, color });

    if (t.icon) {
      const Icon = t.icon;
      // Pass common props most react-native-svg icons accept
      return (
        <Icon
          width={44}
          height={44}
          color={color}
          stroke={color}
          fill={color === INACTIVE_ICON ? "none" : color}
        />
      );
    }

    return <DefaultTabIcon active={isActive} />;
  };

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{activeKey}</Text>
        <Text style={styles.subtitle}>Interactive report view</Text>
      </View>

      {/* Body + Fixed Footer (no shadow, no borders) */}
      <View style={styles.bodyContainer}>
        {/* Scrollable content */}
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {ActiveComp ? (
            <ActiveComp data={apiData[activeKey]} />
          ) : (
            <View style={{ padding: 16 }}>
              <Text>Tab not configured.</Text>
            </View>
          )}
          <View style={{ height: 12 }} />
        </ScrollView>

        {/* Fixed footer (no shadow, no borders, no active bg) */}
        <View style={styles.footer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {tabs.map((t) => {
              const isActive = t.key === activeKey;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => handleTab(t.key)}
                  style={styles.tabCol}
                  activeOpacity={0.85}
                >
                  {renderIcon(t, isActive)}
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={2}>
                    {t.key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#F7F7F8" },

  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  title: { fontSize: 18, fontWeight: "800", color: "#111" },
  subtitle: { fontSize: 12, color: "#555", marginTop: 2 },

  bodyContainer: { flex: 1 },

  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 12, gap: 12 },

  // Footer: fixed, no shadow, no borders, plain background
  footer: {
    backgroundColor: "#fff",
    paddingTop: 8,
  },
  footerHeader: { paddingHorizontal: 14, paddingBottom: 4 },
  footerTitle: { fontSize: 14, fontWeight: "800", color: "#111" },

  tabsRow: { gap: 18, paddingVertical: 10, paddingHorizontal: 12 },
  tabCol: {
    alignItems: "center",
    width: 140,
    paddingVertical: 4,
    borderRadius: 12,
  },
  // no active background color
  tabLabel: {
    textAlign: "center",
    marginTop: 6,
    fontSize: 12,
    color: "#333",
    fontWeight: "700",
  },
  tabLabelActive: { color: "#000" },
});
