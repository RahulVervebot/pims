// components/reports/tabs/PosPaymentCollectionTab.jsx
import React, { useMemo } from "react";
import { View, Dimensions, Text } from "react-native";
import { DonutPie, LegendList, SectionCard, PALETTE, safeNumber } from "../shared/ReportUI";

export default function PosPaymentCollectionTab({ data }) {
  const screenW = Dimensions.get("window").width;
  const screenH = Dimensions.get("window").height;
  const donutSize = Math.min(Math.max(screenW - 48, 260), screenW >= 768 ? 520 : 420);
  const donutHeight = Math.min(Math.max(Math.floor(screenH * 0.42), 240), screenW >= 768 ? 420 : 360);

  const { series, legendItems, hasData } = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];
    const series = arr.map((row, idx) => ({
      key: row?.name ?? `PM-${idx + 1}`,
      value: safeNumber(row?.total_amount),
      count: safeNumber(row?.count),
      color: PALETTE[idx % PALETTE.length],
      raw: row,
    }));
    const legendItems = series.map((s) => ({ key: s.key, value: s.value, count: s.count, color: s.color }));
    const hasData = series.some((s) => s.value > 0);
    return { series, legendItems, hasData };
  }, [data]);

  return (
    <View style={{ gap: 12 }}>
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
        <SectionCard title="Details">
          <LegendList items={legendItems} />
        </SectionCard>
      )}
    </View>
  );
}
