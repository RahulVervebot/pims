import React, { useMemo, useState, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView,Dimensions } from "react-native";
import Svg, { Rect, Text as SvgText, Line, Circle } from "react-native-svg";

const TABS = [
  "POS Payment Collection",
  "Cash In & Out",
  "Cash Tender Details",
  "Tax Collection",
];

const DUMMY = {
  "POS Payment Collection": [
    { label: "Today", segments: [{ key: "Cash", value: 1110 }, { key: "Card", value: 960 }, { key: "EBT", value: 90 }] },
    { label: "This Week", segments: [{ key: "Cash", value: 980 }, { key: "Card", value: 1350 }, { key: "EBT", value: 410 }] },
    { label: "This Month", segments: [{ key: "Cash", value: 2020 }, { key: "Card", value: 1600 }, { key: "EBT", value: 1190 }] },
  ],
  "Cash In & Out": [
    { label: "Today", segments: [{ key: "Cash In", value: 220 }, { key: "Cash Out", value: 150 }] },
    { label: "This Week", segments: [{ key: "Cash In", value: 1180 }, { key: "Cash Out", value: 880 }] },
    { label: "This Month", segments: [{ key: "Cash In", value: 5200 }, { key: "Cash Out", value: 4600 }] },
  ],
  "Cash Tender Details": [
    { label: "Morning", segments: [{ key: "Cash", value: 320 }, { key: "Coins", value: 40 }] },
    { label: "Afternoon", segments: [{ key: "Cash", value: 480 }, { key: "Coins", value: 55 }] },
    { label: "Evening", segments: [{ key: "Cash", value: 610 }, { key: "Coins", value: 70 }] },
  ],
  "Tax Collection": [
    { label: "Today", segments: [{ key: "State Tax", value: 85 }, { key: "City Tax", value: 35 }] },
    { label: "This Week", segments: [{ key: "State Tax", value: 410 }, { key: "City Tax", value: 160 }] },
    { label: "This Month", segments: [{ key: "State Tax", value: 1820 }, { key: "City Tax", value: 690 }] },
  ]
};

const PALETTE = ["#F6C343", "#00D97E",  "#22B8CF","#8C54FF","#2C7BE5","#E63757" ];
const GOLD = "#FAD569";

function Legend({ keys }) {
  return (
    <View style={styles.legendWrap}>
      {keys.map((k, i) => (
        <View key={k} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: PALETTE[i % PALETTE.length] }]} />
          <Text style={styles.legendText}>{k}</Text>
        </View>
      ))}
    </View>
  );
}

/** Vertical stacked bars */
function StackedBarVertical({
  data,              // [{label, segments:[{key,value}]}]
  width = 320,
  height = 240,
  padding = { top: 12, right: 10, bottom: 36, left: 10 },
  barGap = 18,
  barWidth = 34,
  valueSuffix = "",
}) {
  const totals = useMemo(() => data.map(r => r.segments.reduce((s, seg) => s + (seg.value || 0), 0)), [data]);
  const max = useMemo(() => Math.max(1, ...totals), [totals]);
  const keys = useMemo(() => {
    const set = new Set();
    data.forEach(r => r.segments.forEach(s => set.add(s.key)));
    return Array.from(set);
  }, [data]);

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // X positions for each bar
  const count = data.length;
  const totalBarsWidth = count * barWidth + (count - 1) * barGap;
  const offsetX = (innerW - totalBarsWidth) / 2; // center bars

  return (
    <View style={{ paddingHorizontal: 12 }}>
      <Legend keys={keys} />
      <Svg width={width} height={height}>
        {/* axis line */}
        <Line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#DADDE1"
          strokeWidth={1}
        />

        {data.map((row, idx) => {
          const total = totals[idx];
          const x = padding.left + offsetX + idx * (barWidth + barGap);
          let y = height - padding.bottom; // start from baseline
          return (
            <React.Fragment key={row.label}>
              {/* stack segments from bottom to top */}
              {row.segments.map((seg, i) => {
                const h = (innerH * (seg.value || 0)) / max;
                y -= h;
                return (
                  <Rect
                    key={`${idx}-${seg.key}`}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={h}
                    rx={6}
                    ry={6}
                    fill={PALETTE[i % PALETTE.length]}
                  />
                );
              })}
              
              {/* total value above the bar */}
              <SvgText
                x={x + barWidth / 2}
                y={y - 4}
                fontSize="11"
                textAnchor="middle"
                fill="#111"
                fontWeight="600"
              >
                {`${total}${valueSuffix}`}
              </SvgText>
              {/* x label */}
              <SvgText
                x={x + barWidth / 2}
                y={height - padding.bottom + 14}
                fontSize="11"
                textAnchor="middle"
                fill="#333"
              >
                {row.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function TabCircle({ active }) {
  // simple circle with GOLD stroke, fill changes on active
  return (
    <Svg width={44} height={44}>
      <Circle
        cx={22}
        cy={22}
        r={18}
        fill={active ? GOLD : "#FFFFFF"}
        stroke={GOLD}
        strokeWidth={2}
      />
    </Svg>
  );
}

export default function ReportTabs({ initialTab = TABS[0], onTabChange }) {
  const [active, setActive] = useState(initialTab);
  const [chartW, setChartW] = useState(0);
 const screenH = Dimensions.get("window").height;
  const chartHeight = Math.floor(screenH * 0.6 ); // ✅ chart takes 80% of screen height
  const handleTab = useCallback((t) => {
    setActive(t);
    onTabChange && onTabChange(t);
  }, [onTabChange]);

  const { rows, suffix } = useMemo(() => {
    return { rows: DUMMY[active], suffix: "" };
  }, [active]);

  const onChartLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    setChartW(Math.floor(w));
  };

  return (
    <View style={styles.wrap}>
      {/* Title */}
      
      <View style={styles.header}>
        <Text style={styles.title}>{active}</Text>
        <Text style={styles.subtitle}>Dummy report — replace with API response later</Text>
      </View>

      {/* Chart ABOVE the tabs */}
      <View style={styles.chartBox} onLayout={onChartLayout}>
        {chartW > 0 && (
          <StackedBarVertical
            data={rows}
             width={Math.min(Math.max(chartW, 260), 640)}
            height={chartHeight}   // ✅ dynamic height
            valueSuffix={suffix}
          />
        )}
      </View>

   <Text style={styles.titlereport}>Reports</Text>
      {/* Tabs BELOW the chart */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        
        {TABS.map((t) => {
          const isActive = t === active;
          return (
            <TouchableOpacity key={t} onPress={() => handleTab(t)} style={styles.tabCol}>
              <TabCircle active={isActive} />
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                numberOfLines={2}
              >
                {t}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, 
},

  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  title: { fontSize: 16, fontWeight: "800", color: "#111" },
  titlereport:{
fontSize: 20, fontWeight: "800", color: "#111",paddingHorizontal: 16,
  },
  subtitle: { fontSize: 12, color: "#555", marginTop: 2 },

  chartBox: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 10,
  },

  // Tabs: circle svg with GOLD border + name, no blue bg
  tabsRow: {
    gap: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tabCol: {
    alignItems: "center",
    width: 120, // gives room for two-line labels; tweak if needed
  },
  tabLabel: {
    textAlign: "center",
    marginTop: 6,
    fontSize: 12,
    color: "#333",
    fontWeight: "700",
  },
  tabLabelActive: {
    color: "#000",
  },

  legendWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 12, color: "#333" },
});
