// components/reports/tabs/CashInOutTab.jsx
import React, { useMemo } from "react";
import {
  View, ScrollView, Text, StyleSheet, FlatList, Dimensions, Platform,
} from "react-native";
import { SectionCard, DonutPie, LegendList, SummaryRow, PALETTE, currency, safeNumber, sumBy } from "../shared/ReportUI";

function CashTable({ kind, rows }) {
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
    const amtText = isOut ? `- $ ${currency(amtAbs)}` : `$ ${currency(amtAbs)}`;
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
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </View>
  );
}

export default function CashInOutTab({ data }) {
  const screenW = Dimensions.get("window").width;
  const screenH = Dimensions.get("window").height;
  const donutSize = Math.min(Math.max(screenW - 48, 260), screenW >= 768 ? 520 : 420);
  const donutHeight = Math.min(Math.max(Math.floor(screenH * 0.42), 240), screenW >= 768 ? 420 : 360);

  const {
    headerSummary, series, legendItems, hasData, cashInList, cashOutList,
  } = useMemo(() => {
    // data can be { payment_method_summaries: [...] } or [...]
    const list = Array.isArray(data?.payment_method_summaries) ? data.payment_method_summaries
               : Array.isArray(data) ? data : [];
    const cash = list.find((x) => String(x?.name || "").toLowerCase() === "cash") || list[0];

    if (!cash) {
      return { headerSummary: null, series: [], legendItems: [], hasData: false, cashInList: [], cashOutList: [] };
    }

    const totalAmount = safeNumber(cash.amount);
    const totalCount = safeNumber(cash.count);
    const cashInList = Array.isArray(cash.total_cash_in) ? cash.total_cash_in : [];
    const cashOutList = Array.isArray(cash.total_cash_out) ? cash.total_cash_out : [];

    const totalCashIn = sumBy(cashInList, (x) => safeNumber(x?.cash_in));
    const totalCashOut = sumBy(cashOutList, (x) => Math.abs(safeNumber(x?.cash_out)));

    const series = [
      { key: "Cash In", value: totalCashIn, count: cashInList.length, color: PALETTE[0] },
      { key: "Cash Out", value: totalCashOut, count: cashOutList.length, color: PALETTE[1] },
    ];
    const legendItems = series.map((s) => ({ key: s.key, value: s.value, count: s.count, color: s.color }));
    const hasData = series.some((s) => s.value > 0);
    const headerSummary = { title: "Cash", amount: totalAmount, count: totalCount };

    return { headerSummary, series, legendItems, hasData, cashInList, cashOutList };
  }, [data]);

  return (
    <View style={{ gap: 12 }}>
      {headerSummary && (
        <SectionCard>
          <SummaryRow title={headerSummary.title} amount={headerSummary.amount} count={headerSummary.count} />
        </SectionCard>
      )}

      <SectionCard title="Overview">
        {hasData ? (
          <DonutPie series={series} width={donutSize} height={donutHeight} innerRatio={0.56} labelMinAngle={8} />
        ) : (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <Text style={{ color: "#666", fontSize: 13, fontStyle: "italic" }}>No data for this range.</Text>
          </View>
        )}
      </SectionCard>

      {hasData && (
        <>
          <SectionCard title="Details">
            <LegendList items={legendItems} />
          </SectionCard>

          <SectionCard title="Transactions">
            <View style={{ gap: 16 }}>
              <CashTable kind="in" rows={cashInList} />
              <CashTable kind="out" rows={cashOutList} />
            </View>
          </SectionCard>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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

  // fixed column widths to align header & rows + enable horizontal scroll
  colAmt: { flexBasis: 120, width: 120,paddingRight: 8 },
  colReason: { flexBasis: 260, width: 260 },
  colCashier: { flexBasis: 140, width: 140 },
  colDate: { flexBasis: 180, width: 180 },
});
