// ReportTabs.jsx
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  FlatList,
  Platform,
} from "react-native";
import Svg, { Path, Text as SvgText, Circle } from "react-native-svg";

const TABS = [
  "POS Payment Collection",
  "Cash In & Out",
  "Cash Tender Details",
  "Tax Collection",
];

const PALETTE = [
  "#F6C343",
  "#00D97E",
  "#22B8CF",
  "#8C54FF",
  "#2C7BE5",
  "#E63757",
  "#FF7A59",
  "#5E72E4",
  "#11CDEF",
  "#2DCE89",
];
const GOLD = "#FAD569";

// ------------ utils ------------
const currency = (n) => {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
};
const safeNumber = (v, def = 0) => (typeof v === "number" && isFinite(v) ? v : def);
const sumBy = (arr, pick) =>
  Array.isArray(arr) ? arr.reduce((s, x) => s + safeNumber(pick(x)), 0) : 0;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (Math.PI / 180) * angleDeg;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function donutSlicePath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`;
}

// ------------ small UI bits ------------
function SectionCard({ title, children, right }) {
  return (
    <View style={styles.card}>
      {!!title && (
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
          {right}
        </View>
      )}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function TabCircle({ active }) {
  return (
    <Svg width={44} height={44}>
      <Circle cx={22} cy={22} r={18} fill={active ? GOLD : "#FFFFFF"} stroke={GOLD} strokeWidth={2} />
    </Svg>
  );
}

function DonutPie({ series = [], width = 320, height = 320, innerRatio = 0.56, labelMinAngle = 8 }) {
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = Math.min(cx, cy) - 6;
  const rInner = rOuter * innerRatio;

  const total = useMemo(() => {
    const t = series.reduce((s, v) => s + safeNumber(v.value), 0);
    return t <= 0 ? 1 : t;
  }, [series]);

  const slices = useMemo(() => {
    let acc = -90; // start at top
    return series.map((s) => {
      const angle = (safeNumber(s.value) / total) * 360;
      const start = acc;
      const end = acc + angle;
      acc = end;
      const mid = (start + end) / 2;
      const rLabel = rInner + (rOuter - rInner) * 0.5;
      const { x, y } = polarToCartesian(cx, cy, rLabel, mid);
      return { ...s, start, end, angle, labelX: x, labelY: y };
    });
  }, [series, total, cx, cy, rInner, rOuter]);

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height}>
        {slices.map((s, i) => (
          <Path key={`${s.key}-${i}`} d={donutSlicePath(cx, cy, rOuter, rInner, s.start, s.end)} fill={s.color} />
        ))}
        {slices.map((s, i) => {
          if (!isFinite(s.angle) || s.angle < labelMinAngle) return null;
          return (
            <SvgText
              key={`lbl-${s.key}-${i}`}
              x={s.labelX}
              y={s.labelY}
              fontSize="11"
              fontWeight="700"
              textAnchor="middle"
              alignmentBaseline="middle"
              fill="#111"
            >
              {currency(s.value)}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

function LegendList({ items }) {
  return (
    <View style={styles.legendCol}>
      {items.map((it, i) => (
        <View style={styles.legendRow} key={`${it.key}-${i}`}>
          <View style={[styles.legendSwatch, { backgroundColor: it.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.legendName}>{it.key}</Text>
            {typeof it.count === "number" && <Text style={styles.legendMeta}>Count: {it.count}</Text>}
          </View>
          <Text style={styles.legendAmount}>₹ {currency(it.value)}</Text>
        </View>
      ))}
    </View>
  );
}

function SummaryRow({ title, amount, count }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <View style={styles.summaryRight}>
        <Text style={styles.summaryAmt}>₹ {currency(amount)}</Text>
        <Text style={styles.summaryCnt}>Count: {count}</Text>
      </View>
    </View>
  );
}

// ---------- Cash In/Out tables ----------
function CashTable({ kind, rows }) {
  // kind: "in" | "out"
  const isOut = kind === "out";
  const header = isOut ? "Cash Out" : "Cash In";
  const count = Array.isArray(rows) ? rows.length : 0;

  const renderHeader = () => (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.th, styles.colAmt]}>AMOUNT</Text>
      <Text style={[styles.th, styles.colReason]}>REASON</Text>
      <Text style={[styles.th, styles.colCashier]}>CASHIER</Text>
      <Text style={[styles.th, styles.colDate]}>DATE</Text>
    </View>
  );

  const renderItem = ({ item, index }) => {
    const amtRaw = isOut ? safeNumber(item?.cash_out) : safeNumber(item?.cash_in);
    const amtAbs = Math.abs(amtRaw);
    const amtText = isOut ? `- ₹ ${currency(amtAbs)}` : `₹ ${currency(amtAbs)}`;
    return (
      <View style={[styles.tr, index % 2 === 1 && styles.trAlt]}>
        <Text style={[styles.td, styles.colAmt]} numberOfLines={1}>{amtText}</Text>
        <Text style={[styles.td, styles.colReason]} numberOfLines={1}>{item?.payment_ref || "-"}</Text>
        <Text style={[styles.td, styles.colCashier]} numberOfLines={1}>{item?.res_name || "-"}</Text>
        <Text style={[styles.td, styles.colDate]} numberOfLines={1}>{item?.create_date || "-"}</Text>
      </View>
    );
  };

  return (
    <View style={styles.tableWrap}>
      <View style={styles.tableTitleRow}>
        <Text style={styles.tableTitle}>{header}</Text>
        <Text style={styles.tableCount}>({count})</Text>
      </View>

      {/* horizontal scroll for narrow screens */}
      <ScrollView horizontal bounces={false} showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: 700, flex: 1 }}>
          {renderHeader()}
          <FlatList
            data={rows || []}
            keyExtractor={(item, idx) =>
              `${kind}-${item?.session_name || "sess"}-${item?.create_date || "dt"}-${idx}`
            }
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            scrollEnabled={false} // let the main page scroll vertically
          />
        </View>
      </ScrollView>
    </View>
  );
}

function CashIOSection({ cashInList, cashOutList }) {
  return (
    <View style={{ gap: 16 }}>
      <CashTable kind="in" rows={cashInList} />
      <CashTable kind="out" rows={cashOutList} />
    </View>
  );
}

// ------------ MAIN ------------
export default function ReportTabs({ initialTab = TABS[0], onTabChange, apiData = {} }) {
  const [active, setActive] = useState(initialTab);
  const screenW = Dimensions.get("window").width;
  const screenH = Dimensions.get("window").height;
  const isTablet = screenW >= 768;

  // keep chart reasonable; rest of the page will scroll
  const donutSize = Math.min(Math.max(screenW - 48, 260), isTablet ? 520 : 420);
  const donutHeight = Math.min(Math.max(Math.floor(screenH * 0.42), 240), isTablet ? 420 : 360);

  const handleTab = useCallback(
    (t) => {
      setActive(t);
      onTabChange && onTabChange(t);
    },
    [onTabChange]
  );

  // ----- normalization per tab -----
  const { series, legendItems, subtitle, headerSummary, cashInList, cashOutList } = useMemo(() => {
    let series = [];
    let legendItems = [];
    let subtitle = "Connect this tab to its API when ready";
    let headerSummary = null;
    let cashInList = [];
    let cashOutList = [];

    if (active === "POS Payment Collection") {
      const arr = Array.isArray(apiData[active]) ? apiData[active] : [];
      if (arr.length) {
        subtitle = "Payment-wise totals (₹ inside slices) and counts (in the list)";
        series = arr.map((row, idx) => ({
          key: row?.name ?? `PM-${idx + 1}`,
          value: safeNumber(row?.total_amount),
          count: safeNumber(row?.count),
          color: PALETTE[idx % PALETTE.length],
          raw: row,
        }));
        legendItems = series.map((s) => ({
          key: s.key,
          value: s.value,
          count: s.count,
          color: s.color,
        }));
      }
    }

    if (active === "Cash In & Out") {
      const src = apiData[active];
      const list = Array.isArray(src?.payment_method_summaries)
        ? src.payment_method_summaries
        : Array.isArray(src)
        ? src
        : [];

      const cash =
        list.find((x) => String(x?.name || "").toLowerCase() === "cash") || list[0];

      if (cash) {
        subtitle = "Cash In vs Cash Out (₹ inside slices). Summary shows total cash sales.";
        const totalAmount = safeNumber(cash.amount);
        const totalCount = safeNumber(cash.count);

        cashInList = Array.isArray(cash.total_cash_in) ? cash.total_cash_in : [];
        cashOutList = Array.isArray(cash.total_cash_out) ? cash.total_cash_out : [];

        const totalCashIn = sumBy(cashInList, (x) => safeNumber(x?.cash_in));
        const totalCashOut = sumBy(cashOutList, (x) => Math.abs(safeNumber(x?.cash_out)));

        headerSummary = { title: `Cash`, amount: totalAmount, count: totalCount };

        series = [
          { key: "Cash In", value: totalCashIn, count: cashInList.length, color: PALETTE[0] },
          { key: "Cash Out", value: totalCashOut, count: cashOutList.length, color: PALETTE[1] },
        ];
        legendItems = series.map((s) => ({ key: s.key, value: s.value, count: s.count, color: s.color }));
      }
    }

    return { series, legendItems, subtitle, headerSummary, cashInList, cashOutList };
  }, [active, apiData]);

  const hasData = series.length > 0 && series.some((s) => s.value > 0);

  return (
    <View style={styles.wrap}>
      {/* Header (static) */}
      <View style={styles.header}>
        <Text style={styles.title}>{active}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Body (scrollable) */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Optional summary (for Cash In & Out) */}
        {headerSummary && (
          <SectionCard>
            <SummaryRow title={headerSummary.title} amount={headerSummary.amount} count={headerSummary.count} />
          </SectionCard>
        )}

        {/* Chart */}
        <SectionCard title="Overview">
          {hasData ? (
            <DonutPie
              series={series}
              width={donutSize}
              height={donutHeight}
              innerRatio={0.56}
              labelMinAngle={8}
            />
          ) : (
            <View style={styles.noData}>
              <Text style={styles.noDataText}>No data for this range.</Text>
            </View>
          )}
        </SectionCard>

        {/* Legend + Details */}
        {hasData && (
          <SectionCard title="Details">
            <LegendList items={legendItems} />
          </SectionCard>
        )}

        {/* Cash In/Out tables only for that tab */}
        {active === "Cash In & Out" && hasData && (
          <SectionCard title="Transactions">
            <CashIOSection cashInList={cashInList} cashOutList={cashOutList} />
          </SectionCard>
        )}

        {/* Tabs at the bottom */}
        <SectionCard title="Reports">
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
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={2}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SectionCard>

        {/* bottom padding to ensure last card fully scrolls above home indicator */}
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

  // card
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: "#111" },
  cardBody: { paddingHorizontal: 14, paddingVertical: 10 },

  // chart
  noData: { paddingVertical: 32, alignItems: "center" },
  noDataText: { color: "#666", fontSize: 13, fontStyle: "italic" },

  // legend
  legendCol: { gap: 10 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendName: { fontSize: 13, fontWeight: "700", color: "#111" },
  legendMeta: { fontSize: 12, color: "#555" },
  legendAmount: { fontSize: 13, fontWeight: "700", color: "#111" },

  // summary
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#FFF7E6",
  },
  summaryTitle: { fontSize: 14, fontWeight: "800", color: "#111", flex: 1 },
  summaryRight: { alignItems: "flex-end" },
  summaryAmt: { fontSize: 13, fontWeight: "700", color: "#111" },
  summaryCnt: { fontSize: 12, color: "#555" },

  // tabs
  tabsRow: { gap: 18, paddingVertical: 6 },
  tabCol: { alignItems: "center", width: 120 },
  tabLabel: { textAlign: "center", marginTop: 6, fontSize: 12, color: "#333", fontWeight: "700" },
  tabLabelActive: { color: "#000" },

  // tables
  tableWrap: {
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EEE",
  },
  tableTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#fff",
    gap: 6,
  },
  tableTitle: { fontSize: 14, fontWeight: "800", color: "#111" },
  tableCount: { fontSize: 12, color: "#666", fontWeight: "700" },

  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#FAFAFA",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#E6E6E6",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  th: { fontSize: 12, fontWeight: "800", color: "#333" },

  tr: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
  },
  trAlt: { backgroundColor: "#FCFCFC" },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: "#EFEFEF" },

  td: { fontSize: 12, color: "#222" },

  // column widths (consistent header & rows)
  colAmt: { flexBasis: 120, width: 120},
  colReason: { flexBasis: 260, width: 260 },
  colCashier: { flexBasis: 140, width: 140 },
  colDate: { flexBasis: 180, width: 180 },
});
