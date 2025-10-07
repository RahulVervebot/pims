import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Platform,
} from "react-native";
import {
  SectionCard,
  SummaryRow,
  currency,
  safeNumber,
} from "../shared/ReportUI";

function RefundsTable({ rows }) {
  const count = Array.isArray(rows) ? rows.length : 0;

  const renderHeader = () => (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.th, styles.colName]}>NAME</Text>
      <Text style={[styles.th, styles.colAmt]}>AMOUNT</Text>
    </View>
  );

  const renderItem = ({ item, index }) => {
    const amtRaw = safeNumber(item?.amount_total);
    const amtAbs = Math.abs(amtRaw);
    const prefix = amtRaw < 0 ? "- " : "";
    const amtText = `${prefix}$ ${currency(amtAbs)}`;

    return (
      <View style={[styles.tr, index % 2 === 1 && styles.trAlt]}>
        <Text style={[styles.td, styles.colName]} numberOfLines={1}>
          {item?.name || "-"}
        </Text>
        <Text style={[styles.td, styles.colAmt]} numberOfLines={1}>
          {amtText}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.tableWrap}>
      <View style={styles.tableTitleRow}>
        <Text style={styles.tableTitle}>Refunds</Text>
        <Text style={styles.tableCount}>({count})</Text>
      </View>

      {/* Horizontal scroll for small screens; fixed column widths keep header aligned */}
      <ScrollView horizontal bounces={false} showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: 520, flex: 1 }}>
          {renderHeader()}
          <FlatList
            data={rows || []}
            keyExtractor={(item, idx) => `${item?.name || "refund"}-${idx}`}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            scrollEnabled={false} // let parent screen handle vertical scroll
          />
        </View>
      </ScrollView>
    </View>
  );
}

export default function RefundReportTab({ data }) {
  const {
    totalAmount,
    totalCount,
    refunds,
    hasData,
  } = useMemo(() => {
    const totalAmount = safeNumber(data?.total_refunds);
    const totalCount = safeNumber(data?.total_refunds_count);
    const refunds = Array.isArray(data?.refund_data) ? data.refund_data : [];
    const hasData = refunds.length > 0;
    return { totalAmount, totalCount, refunds, hasData };
  }, [data]);

  return (
    <View style={{ gap: 12 }}>
      <SectionCard>
        <SummaryRow title="Refunds" amount={totalAmount} count={totalCount} />
      </SectionCard>

      <SectionCard title="Refunds List">
        {hasData ? (
          <RefundsTable rows={refunds} />
        ) : (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <Text style={{ color: "#666", fontSize: 13, fontStyle: "italic" }}>
              No refunds for this range.
            </Text>
          </View>
        )}
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  // table shell
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

  // header
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

  // rows
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

  // fixed column widths (align header & rows; enable horizontal scroll)
  colName: { flexBasis: 360, width: 360, paddingRight: 8 },
  colAmt: { flexBasis: 140, width: 140, textAlign: "right", paddingRight: 8 },
});
