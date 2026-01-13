// src/function/reports/pos_reports.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function SaleSummaryPaymentType(startdate, enddate) {
  const [storeUrl, token] = await Promise.all([
    AsyncStorage.getItem('storeurl'),
    AsyncStorage.getItem('access_token'),
  ]);
  if (!storeUrl || !token) {
    throw new Error('Missing store_url or access_token in AsyncStorage.');
  }
console.log("token",token);
  const qs = new URLSearchParams({ startDate: startdate, endDate: enddate }).toString();

  const res = await fetch(
    `${storeUrl}/pos/app/sales-summary/payment-type-report?${qs}`,
    {
      method: 'GET',
      headers: { accept: 'application/json', access_token: token },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch PaymentTypeReport (${res.status}): ${text || 'No details'}`);
  }

  const json = await res.json();
  console.log('[PaymentTypeReport][raw json]:', json);

  // ✅ Normalize shapes
  let arr = [];
  if (Array.isArray(json)) {
    arr = json;
  } else if (Array.isArray(json?.payment_type)) {
    // <-- Your real payload
    arr = json.payment_type;
  } else {
    // Last-resort: pick the first array value in the object
    const firstArray = Object.values(json).find((v) => Array.isArray(v));
    if (firstArray) arr = firstArray;
  }

  console.log('[PaymentTypeReport][normalized array length]:', arr.length);
  return arr;
}

export async function SaleSummaryCashReport(startdate, enddate) {
  const [storeUrl, token] = await Promise.all([
    AsyncStorage.getItem('storeurl'),
    AsyncStorage.getItem('access_token'),
  ]);
  if (!storeUrl || !token) {
    throw new Error('Missing store_url or access_token in AsyncStorage.');
  }

  const qs = new URLSearchParams({ startDate: startdate, endDate: enddate }).toString();

  const res = await fetch(
    `${storeUrl}/pos/app/sales-summary/cash-in-cash-out-report?${qs}`,
    {
      method: 'GET',
      headers: { accept: 'application/json', access_token: token },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch CashReport (${res.status}): ${text || 'No details'}`);
  }

  const json = await res.json();
  console.log('[CashReport][raw json]:', json);

  // ✅ Normalize shapes
  let arr = [];
  if (Array.isArray(json)) {
    arr = json;
  } else if (Array.isArray(json?.payment_method_summaries)) {
    // <-- Your real payload
    arr = json.payment_method_summaries;
  } else {
    // Last-resort: pick the first array value in the object
    const firstArray = Object.values(json).find((v) => Array.isArray(v));
    if (firstArray) arr = firstArray;
  }

  console.log('[CashReport][normalized array length]:', arr.length);
  return arr;
}

export async function SaleSummaryRefundReport(startdate, enddate) {
  const [storeUrl, token] = await Promise.all([
    AsyncStorage.getItem('storeurl'),
    AsyncStorage.getItem('access_token'),
  ]);
  if (!storeUrl || !token) {
    throw new Error('Missing store_url or access_token in AsyncStorage.');
  }

  const qs = new URLSearchParams({ startDate: startdate, endDate: enddate }).toString();

  const res = await fetch(`${storeUrl}/pos/app/sales-summary/refund-report?${qs}`, {
    method: 'GET',
    headers: { accept: 'application/json', access_token: token },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch RefundReport (${res.status}): ${text || 'No details'}`);
  }

  const json = await res.json();
  console.log('[RefundReport][raw json]:', json);

  // Normalize to a stable shape
  const obj = Array.isArray(json) ? { refund_data: json } : (json && typeof json === 'object' ? json : {});

  const refund_data = Array.isArray(obj.refund_data) ? obj.refund_data : [];

  // Use server totals if valid; otherwise derive from list
  const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
  const derivedTotal = refund_data.reduce((s, r) => s + (isNum(r?.amount_total) ? r.amount_total : 0), 0);

  const total_refunds = isNum(obj.total_refunds) ? obj.total_refunds : derivedTotal;
  const total_refunds_count = isNum(obj.total_refunds_count) ? obj.total_refunds_count : refund_data.length;

  const normalized = { total_refunds, total_refunds_count, refund_data };
  console.log('[RefundReport][normalized]:', normalized);

  return normalized;
}

export async function SaleSummaryTaxReport(startdate, enddate) {
  const [storeUrl, token] = await Promise.all([
    AsyncStorage.getItem('storeurl'),
    AsyncStorage.getItem('access_token'),
  ]);
  if (!storeUrl || !token) {
    throw new Error('Missing store_url or access_token in AsyncStorage.');
  }

  const qs = new URLSearchParams({ startDate: startdate, endDate: enddate }).toString();

  const res = await fetch(
    `${storeUrl}/pos/app/sales-summary/tax-report?${qs}`,
    {
      method: 'GET',
      headers: { accept: 'application/json', access_token: token },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch TaxReport (${res.status}): ${text || 'No details'}`);
  }

  const json = await res.json();
  console.log('[Tax Report][raw json]:', json);

  // ✅ Normalize shapes
  let arr = [];
  if (Array.isArray(json)) {
    arr = json;
  } else if (Array.isArray(json?.result)) {
    // <-- Your real payload
    arr = json.result;
  } else {
    // Last-resort: pick the first array value in the object
    const firstArray = Object.values(json).find((v) => Array.isArray(v));
    if (firstArray) arr = firstArray;
  }

  console.log('[TaxReport][normalized array length]:', arr.length);
  return arr;
}

export async function SaleSummaryDepartmentAllianceReport(startdate, enddate) {
  const [storeUrl, token] = await Promise.all([
    AsyncStorage.getItem('storeurl'),
    AsyncStorage.getItem('access_token'),
  ]);
  if (!storeUrl || !token) {
    throw new Error('Missing store_url or access_token in AsyncStorage.');
  }

  const qs = new URLSearchParams({ startDate: startdate, endDate: enddate }).toString();

  const res = await fetch(
    `${storeUrl}/pos/app/sales-summary/department/with-alliance-report?${qs}`,
    {
      method: 'GET',
      headers: { accept: 'application/json', access_token: token },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch Department (${res.status}): ${text || 'No details'}`);
  }

  const json = await res.json();
  console.log('[Department Report][raw json]:', json);

  // ✅ Normalize shapes
  let arr = [];
  if (Array.isArray(json)) {
    arr = json;
  } else if (Array.isArray(json?.departmentSales)) {
    // <-- Your real payload
    arr = json.departmentSales;
  } else {
    // Last-resort: pick the first array value in the object
    const firstArray = Object.values(json).find((v) => Array.isArray(v));
    if (firstArray) arr = firstArray;
  }

  console.log('[Department Report][normalized array length]:', arr.length);
  return arr;
}

export async function HourlyReport(startDate, endDate, option = 'pos_hourly_sales', companyId = 1) {
  // Accept both 'storeUrl' and 'storeurl' just in case
  const [storeUrl, token] = await Promise.all([
    AsyncStorage.getItem('storeurl'),
    AsyncStorage.getItem('access_token'),
    
  ]);
  console.log("storeUrl:",storeUrl);
console.log("start:",startDate,"end:",endDate);
  if (!storeUrl || !token) {
    throw new Error('Missing storeUrl or access_token in AsyncStorage.');
  }
console.log("token:",token);
  const qs = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    option,
    company_id: String(companyId),
  }).toString();

const fetchurl = `${storeUrl}/pos/app/hourly-sales-report?startDate=${startDate}&endDate=${endDate}&companyId=${companyId}&option=pos_hourly_sales`
console.log("fetchurl:",fetchurl);
  const res = await fetch(fetchurl, {
    method: 'GET',
    headers: { accept: 'application/json', access_token: token},
    // redirect: 'follow',
    // credentials: 'omit',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Hourly report failed (${res.status}): ${text || 'No details'}`);
  }

  return res.json(); // return raw JSON so the screen can keep its current shape handling
}