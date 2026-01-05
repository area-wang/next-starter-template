"use client";

import { useMemo, useState } from "react";
import provinceData from "./const/ province.json";
import cityData from "./const/city.json";

type Tab = "monthly" | "bonus";

type ProvinceItem = {
  code: string;
  name: string;
  province: string;
};

type CityItem = {
  code: string;
  name: string;
  province: string;
  city: string;
};

const PROVINCES: ProvinceItem[] = provinceData as ProvinceItem[];
const CITIES: CityItem[] = cityData as CityItem[];

const CITY_DEFAULTS: Record<
  string,
  {
    pension: number;
    medical: number;
    unemployment: number;
    maternity: number;
    injury: number;
    housing: number;
  }
> = {
  "440300": { pension: 8, medical: 2, unemployment: 0.3, maternity: 0, injury: 0, housing: 12 },
  "440100": { pension: 8, medical: 2, unemployment: 0.3, maternity: 0, injury: 0, housing: 12 },
  "110100": { pension: 8, medical: 2, unemployment: 0.2, maternity: 0, injury: 0.2, housing: 12 },
  "310100": { pension: 8, medical: 2, unemployment: 0.5, maternity: 0, injury: 0.5, housing: 7 },
};

const EMPLOYER_BASE_RATES = {
  pension: 16,
  medical: 9,
  unemployment: 0.5,
  maternity: 0.8,
  injury: 0.2,
  housing: 12,
};

const STANDARD_DEDUCTION = 5000;

// 综合所得年度累计应纳税所得额税率表
// 档次对应：
// 1）不超过 36000 元的，税率 3%，速算扣除数 0
// 2）超过 36000 至 144000 元的部分，税率 10%，速算扣除数 2520
// 3）超过 144000 至 300000 元的部分，税率 20%，速算扣除数 16920
// 4）超过 300000 至 420000 元的部分，税率 25%，速算扣除数 31920
// 5）超过 420000 至 660000 元的部分，税率 30%，速算扣除数 52920
// 6）超过 660000 至 960000 元的部分，税率 35%，速算扣除数 85920
// 7）超过 960000 元的部分，税率 45%，速算扣除数 181920
const TAX_BRACKETS = [
  { limit: 36000, rate: 0.03, quick: 0 },
  { limit: 144000, rate: 0.1, quick: 2520 },
  { limit: 300000, rate: 0.2, quick: 16920 },
  { limit: 420000, rate: 0.25, quick: 31920 },
  { limit: 660000, rate: 0.3, quick: 52920 },
  { limit: 960000, rate: 0.35, quick: 85920 },
  { limit: Infinity, rate: 0.45, quick: 181920 },
];

const baseInputClass =
  "rounded-xl bg-slate-100 px-3 py-2.5 text-sm text-slate-900 border border-transparent focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white";

type SelectOption = {
  value: string;
  label: string;
};

type DropdownSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
};

function DropdownSelect({ value, onChange, options, placeholder }: DropdownSelectProps) {
  const [open, setOpen] = useState(false);

  const selected = options.find((opt) => opt.value === value);

  return (
    <div
      className="relative w-full"
      tabIndex={0}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className={`${baseInputClass} w-full flex items-center justify-between`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={selected ? "text-slate-900" : "text-slate-400"}>
          {selected ? selected.label : placeholder ?? "请选择"}
        </span>
        <span className="ml-2 text-xs text-slate-500">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl bg-white shadow-lg border border-slate-200 py-1 max-h-64 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`flex w-full items-center px-3 py-2 text-sm text-left hover:bg-slate-50 ${
                opt.value === value ? "text-teal-600" : "text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function parseNumber(value: string): number {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function calcTaxByBase(base: number): number {
  if (base <= 0) return 0;

  for (const b of TAX_BRACKETS) {
    if (base <= b.limit) {
      return base * b.rate - b.quick;
    }
  }
  return 0;
}

function calcPersonalTax(monthlyTaxable: number): number {
  const base = monthlyTaxable - STANDARD_DEDUCTION;
  return calcTaxByBase(base);
}

export default function SalaryCalculatorPage() {
  const [tab, setTab] = useState<Tab>("monthly");

  const [resultTab, setResultTab] = useState<"summary" | "income">("summary");

  const [provinceCode, setProvinceCode] = useState("44");
  const [cityCode, setCityCode] = useState("440300");

  const [monthlyIncome, setMonthlyIncome] = useState("20500");
  const [socialBase, setSocialBase] = useState("");
  const [pensionRate, setPensionRate] = useState("8");
  const [medicalRate, setMedicalRate] = useState("2");
  const [unemploymentRate, setUnemploymentRate] = useState("0.3");
  const [maternityRate, setMaternityRate] = useState("0");
  const [injuryRate, setInjuryRate] = useState("0");

  const [useHousingFund, setUseHousingFund] = useState(true);
  const [housingRate, setHousingRate] = useState("12");
  const [housingBase, setHousingBase] = useState("");

  const [startMonth, setStartMonth] = useState("1");
  const [endMonth, setEndMonth] = useState("12");
  const [additionalDeduction, setAdditionalDeduction] = useState("0");

  const [salaryMonth, setSalaryMonth] = useState(() => String(new Date().getMonth() + 1));

  const [startMonthDraft, setStartMonthDraft] = useState("1");
  const [endMonthDraft, setEndMonthDraft] = useState("12");
  const [salaryMonthDraft, setSalaryMonthDraft] = useState(() => String(new Date().getMonth() + 1));

  const [bonusIncome, setBonusIncome] = useState("30000");

  function parseMonth(value: string): number | null {
    const n = Math.round(parseNumber(value));
    if (!Number.isFinite(n)) return null;
    return n;
  }

  function getSafeStartMonth(value: string) {
    const n = parseMonth(value);
    if (n === null) return 1;
    if (n < 1 || n > 12) return 1;
    return n;
  }

  function getSafeEndMonth(value: string) {
    const n = parseMonth(value);
    if (n === null) return 12;
    if (n < 1 || n > 12) return 12;
    return n;
  }

  function ensureSalaryMonthInRange(rangeStart: number, rangeEnd: number) {
    const nowMonth = new Date().getMonth() + 1;
    const raw = parseMonth(salaryMonth);
    const m = raw === null || raw < 1 || raw > 12 ? nowMonth : raw;
    if (m < rangeStart || m > rangeEnd) {
      const next = String(rangeStart);
      const shouldSyncDraft = salaryMonthDraft.trim() === "" || salaryMonthDraft === salaryMonth;
      setSalaryMonth(next);
      if (shouldSyncDraft) setSalaryMonthDraft(next);
    }
  }

  function handleStartMonthBlur(nextRaw: string) {
    const end = getSafeEndMonth(endMonth);
    let start = getSafeStartMonth(nextRaw);
    if (start > end) start = 1;
    const next = String(start);
    setStartMonth(next);
    setStartMonthDraft(next);
    ensureSalaryMonthInRange(start, end);
  }

  function handleEndMonthBlur(nextRaw: string) {
    const start = getSafeStartMonth(startMonth);
    let end = getSafeEndMonth(nextRaw);
    if (end < start) end = 12;
    const next = String(end);
    setEndMonth(next);
    setEndMonthDraft(next);
    ensureSalaryMonthInRange(start, end);
  }

  function handleSalaryMonthBlur(nextRaw: string) {
    const s = getSafeStartMonth(startMonth);
    const e = getSafeEndMonth(endMonth);
    const raw = parseMonth(nextRaw);
    if (raw === null || raw < 1 || raw > 12) {
      const next = String(s);
      setSalaryMonth(next);
      setSalaryMonthDraft(next);
      return;
    }
    if (raw < s || raw > e) {
      const next = String(s);
      setSalaryMonth(next);
      setSalaryMonthDraft(next);
      return;
    }
    const next = String(raw);
    setSalaryMonth(next);
    setSalaryMonthDraft(next);
  }

  function applyCityDefaults(code: string) {
    const d = CITY_DEFAULTS[code];
    if (!d) return;
    setPensionRate(String(d.pension));
    setMedicalRate(String(d.medical));
    setUnemploymentRate(String(d.unemployment));
    setMaternityRate(String(d.maternity));
    setInjuryRate(String(d.injury));
    setHousingRate(String(d.housing));
  }

  function handleCityChange(nextCityCode: string) {
    setCityCode(nextCityCode);
    applyCityDefaults(nextCityCode);
  }

  function handleProvinceChange(nextProvinceCode: string) {
    setProvinceCode(nextProvinceCode);
    const firstCity = CITIES.find((c) => c.province === nextProvinceCode);
    if (firstCity) {
      handleCityChange(firstCity.code);
    }
  }

  const monthlyResult = useMemo(() => {
    const income = parseNumber(monthlyIncome);
    if (income <= 0) {
      return {
        social: 0,
        housing: 0,
        tax: 0,
        takeHome: 0,
        breakdown: {
          pensionPersonal: 0,
          pensionCompany: 0,
          medicalPersonal: 0,
          medicalCompany: 0,
          unemploymentPersonal: 0,
          unemploymentCompany: 0,
          maternityPersonal: 0,
          maternityCompany: 0,
          injuryPersonal: 0,
          injuryCompany: 0,
          housingPersonal: 0,
          housingCompany: 0,
        },
      };
    }

    const sb = socialBase.trim() === "" ? income : parseNumber(socialBase);
    const hb = housingBase.trim() === "" ? income : parseNumber(housingBase);

    const pensionR = parseNumber(pensionRate);
    const medicalR = parseNumber(medicalRate);
    const unemploymentR = parseNumber(unemploymentRate);
    const maternityR = parseNumber(maternityRate);
    const injuryR = parseNumber(injuryRate);

    const pensionPersonal = (sb * pensionR) / 100;
    const medicalPersonal = (sb * medicalR) / 100;
    const unemploymentPersonal = (sb * unemploymentR) / 100;
    const maternityPersonal = (sb * maternityR) / 100;
    const injuryPersonal = (sb * injuryR) / 100;

    const pensionCompany = (sb * EMPLOYER_BASE_RATES.pension) / 100;
    const medicalCompany = (sb * EMPLOYER_BASE_RATES.medical) / 100;
    const unemploymentCompany = (sb * EMPLOYER_BASE_RATES.unemployment) / 100;
    const maternityCompany = (sb * EMPLOYER_BASE_RATES.maternity) / 100;
    const injuryCompany = (sb * EMPLOYER_BASE_RATES.injury) / 100;

    const socialAmount =
      pensionPersonal +
      medicalPersonal +
      unemploymentPersonal +
      maternityPersonal +
      injuryPersonal;

    const housingPersonal = useHousingFund ? (hb * parseNumber(housingRate)) / 100 : 0;
    const housingCompany = useHousingFund ? (hb * EMPLOYER_BASE_RATES.housing) / 100 : 0;

    const extraDeduction = Math.max(0, parseNumber(additionalDeduction));
    const taxable = income - socialAmount - housingPersonal - extraDeduction;
    const tax = calcPersonalTax(taxable);
    const takeHome = income - socialAmount - housingPersonal - tax;

    return {
      social: Math.max(0, socialAmount),
      housing: Math.max(0, housingPersonal),
      tax: Math.max(0, tax),
      takeHome: Math.max(0, takeHome),
      breakdown: {
        pensionPersonal: Math.max(0, pensionPersonal),
        pensionCompany: Math.max(0, pensionCompany),
        medicalPersonal: Math.max(0, medicalPersonal),
        medicalCompany: Math.max(0, medicalCompany),
        unemploymentPersonal: Math.max(0, unemploymentPersonal),
        unemploymentCompany: Math.max(0, unemploymentCompany),
        maternityPersonal: Math.max(0, maternityPersonal),
        maternityCompany: Math.max(0, maternityCompany),
        injuryPersonal: Math.max(0, injuryPersonal),
        injuryCompany: Math.max(0, injuryCompany),
        housingPersonal: Math.max(0, housingPersonal),
        housingCompany: Math.max(0, housingCompany),
      },
    };
  }, [
    monthlyIncome,
    socialBase,
    housingBase,
    pensionRate,
    medicalRate,
    unemploymentRate,
    maternityRate,
    injuryRate,
    housingRate,
    useHousingFund,
    additionalDeduction,
  ]);

  const bonusResult = useMemo(() => {
    const income = parseNumber(bonusIncome);
    if (income <= 0) return { tax: 0, afterTax: 0 };

    const avg = income / 12;
    const tax = calcPersonalTax(avg) * 12;
    const afterTax = income - tax;
    return { tax: Math.max(0, tax), afterTax: Math.max(0, afterTax) };
  }, [bonusIncome]);

  const cityOptions = useMemo(
    () => CITIES.filter((c) => c.province === provinceCode),
    [provinceCode],
  );

  const currentCity = useMemo(
    () => CITIES.find((c) => c.code === cityCode),
    [cityCode],
  );

  const incomeDetails = useMemo(() => {
    const income = parseNumber(monthlyIncome);
    if (income <= 0) return [] as {
      month: number;
      preTax: number;
      cumulativePreTax: number;
      monthFund: number;
      cumulativeFund: number;
      cumulativeDeduction: number;
      cumulativeAdditional: number;
      monthTax: number;
      netSalary: number;
    }[];

    const monthFund = monthlyResult.social + monthlyResult.housing;

    const rows: {
      month: number;
      preTax: number;
      cumulativePreTax: number;
      monthFund: number;
      cumulativeFund: number;
      cumulativeDeduction: number;
      cumulativeAdditional: number;
      monthTax: number;
      netSalary: number;
    }[] = [];

    let cumulativePreTax = 0;
    let cumulativeFund = 0;
    let cumulativeDeduction = 0;
    let cumulativeAdditional = 0;
    let cumulativeTaxPaid = 0;

    let start = Math.round(parseNumber(startMonth));
    let end = Math.round(parseNumber(endMonth));

    if (!Number.isFinite(start) || start < 1) start = 1;
    if (!Number.isFinite(end) || end > 12) end = 12;
    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    const extraPerMonth = Math.max(0, parseNumber(additionalDeduction));

    for (let m = start; m <= end; m += 1) {
      cumulativePreTax += income;
      cumulativeFund += monthFund;
      cumulativeDeduction += STANDARD_DEDUCTION;
      cumulativeAdditional += extraPerMonth;

      const taxable =
        cumulativePreTax -
        cumulativeFund -
        cumulativeDeduction -
        cumulativeAdditional;

      const cumulativeTax = calcTaxByBase(taxable);
      const monthTax = Math.max(0, cumulativeTax - cumulativeTaxPaid);
      cumulativeTaxPaid += monthTax;

      const netSalary = income - monthFund - monthTax;

      rows.push({
        month: m,
        preTax: income,
        cumulativePreTax,
        monthFund,
        cumulativeFund,
        cumulativeDeduction,
        cumulativeAdditional,
        monthTax,
        netSalary,
      });
    }

    return rows;
  }, [
    monthlyIncome,
    monthlyResult.social,
    monthlyResult.housing,
    startMonth,
    endMonth,
    additionalDeduction,
  ]);

  const effectiveSalaryMonth = useMemo(() => {
    let start = Math.round(parseNumber(startMonth));
    let end = Math.round(parseNumber(endMonth));
    if (!Number.isFinite(start) || start < 1) start = 1;
    if (!Number.isFinite(end) || end > 12) end = 12;
    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    const nowMonth = new Date().getMonth() + 1;

    let m = salaryMonth.trim() === "" ? nowMonth : Math.round(parseNumber(salaryMonth));
    if (!Number.isFinite(m) || m < 1 || m > 12) m = nowMonth;

    if (m < start || m > end) return start;
    return m;
  }, [salaryMonth, startMonth, endMonth]);

  const selectedIncomeRow = useMemo(() => {
    if (incomeDetails.length === 0) return null;
    return incomeDetails.find((r) => r.month === effectiveSalaryMonth) ?? incomeDetails[0];
  }, [incomeDetails, effectiveSalaryMonth]);

  return (
    <div className="mx-auto w-full max-w-xl bg-white rounded-2xl shadow-md px-8 py-6">
        <div className="flex mb-6 border border-slate-100 rounded-full bg-slate-50 p-1 text-sm">
          <button
            onClick={() => setTab("monthly")}
            className={`flex-1 py-2 rounded-full transition ${
              tab === "monthly"
                ? "bg-teal-500 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            月工资计算器
          </button>
          <button
            onClick={() => setTab("bonus")}
            className={`flex-1 py-2 rounded-full transition ${
              tab === "bonus"
                ? "bg-teal-500 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            年终奖计算器
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-slate-500 mb-1">城市选择：</label>
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-2">
              <span className="w-6 text-xs text-slate-500 text-right">省</span>
              <DropdownSelect
                value={provinceCode}
                onChange={handleProvinceChange}
                options={PROVINCES.map((p) => ({ value: p.province, label: p.name }))}
                placeholder="请选择省份"
              />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <span className="w-6 text-xs text-slate-500 text-right">市</span>
              <DropdownSelect
                value={cityCode}
                onChange={handleCityChange}
                options={cityOptions.map((c) => ({ value: c.code, label: c.name }))}
                placeholder="请选择城市"
              />
            </div>
          </div>
        </div>

        {tab === "monthly" ? (
          <>
            <div className="mb-4">
              <label className="block text-sm text-slate-500 mb-1">
                <span className="text-teal-500 mr-1">*</span>月工资收入：
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  type="text"
                  className={`${baseInputClass} flex-1`}
                  placeholder="请输入月工资收入"
                />
                <span className="text-sm text-slate-500">元</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-500 mb-1">起始月份：</label>
                <input
                  value={startMonthDraft}
                  onChange={(e) => setStartMonthDraft(e.target.value)}
                  onBlur={(e) => handleStartMonthBlur(e.target.value)}
                  type="text"
                  min={0}
                  max={12}
                  className={`${baseInputClass} w-full`}
                  placeholder="例如 1"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">结束月份：</label>
                <input
                  value={endMonthDraft}
                  onChange={(e) => setEndMonthDraft(e.target.value)}
                  onBlur={(e) => handleEndMonthBlur(e.target.value)}
                  type="text"
                  min={1}
                  max={12}
                  className={`${baseInputClass} w-full`}
                  placeholder="例如 12"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm text-slate-500 mb-1">计算月份：</label>
              <div className="flex items-center gap-2">
                <input
                  value={salaryMonthDraft}
                  onChange={(e) => setSalaryMonthDraft(e.target.value)}
                  onBlur={(e) => handleSalaryMonthBlur(e.target.value)}
                  type="text"
                  min={1}
                  max={12}
                  className={`${baseInputClass} flex-1`}
                  placeholder="默认当前月, 不在月份区间取起始月份"
                />
                <span className="text-sm text-slate-500">月</span>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm text-slate-500 mb-1">每月专项附加扣除：</label>
              <div className="flex items-center gap-2">
                <input
                  value={additionalDeduction}
                  onChange={(e) => setAdditionalDeduction(e.target.value)}
                  type="text"
                  className={`${baseInputClass} flex-1`}
                  placeholder="如子女教育、住房贷款等"
                />
                <span className="text-sm text-slate-500">元/月</span>
              </div>
            </div>

            <div className="mb-2">
              <label className="block text-sm text-slate-500 mb-1">社保缴纳基数：</label>
              <div className="flex items-center gap-2">
                <input
                  value={socialBase}
                  onChange={(e) => setSocialBase(e.target.value)}
                  type="text"
                  className={`${baseInputClass} flex-1`}
                  placeholder="请输入社保缴纳基数（默认为月工资收入）"
                />
                <span className="text-sm text-slate-500">元</span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {[
                { label: "养老保险", value: pensionRate, set: setPensionRate },
                { label: "医疗保险", value: medicalRate, set: setMedicalRate },
                { label: "失业保险", value: unemploymentRate, set: setUnemploymentRate },
                { label: "生育保险", value: maternityRate, set: setMaternityRate },
                { label: "工伤保险", value: injuryRate, set: setInjuryRate },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <label className="w-20 text-sm text-slate-500">
                    <span className="text-teal-500 mr-1">*</span>
                    {item.label}：
                  </label>
                  <input
                    value={item.value}
                    onChange={(e) => item.set(e.target.value)}
                    type="text"
                    className={`${baseInputClass} flex-1`}
                  />
                  <span className="text-sm text-slate-500 mr-1">%</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-slate-500">是否缴纳公积金：</span>
              <button
                type="button"
                onClick={() => setUseHousingFund((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  useHousingFund ? "bg-teal-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    useHousingFund ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {useHousingFund && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="w-24 text-sm text-slate-500">
                    <span className="text-teal-500 mr-1">*</span>公积金比例：
                  </label>
                  <input
                    value={housingRate}
                    onChange={(e) => setHousingRate(e.target.value)}
                    type="text"
                    className={`${baseInputClass} flex-1`}
                  />
                  <span className="text-sm text-slate-500 mr-1">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-24 text-sm text-slate-500">公积金基数：</label>
                  <input
                    value={housingBase}
                    onChange={(e) => setHousingBase(e.target.value)}
                    type="text"
                    className={`${baseInputClass} flex-1`}
                    placeholder="请输入公积金缴纳基数（默认为月工资收入）"
                  />
                  <span className="text-sm text-slate-500 mr-1">元</span>
                </div>
              </div>
            )}

            <button
              type="button"
              className="mt-6 w-full rounded-full bg-teal-500 py-2.5 text-sm font-medium text-white shadow hover:bg-teal-600 transition"
            >
              计算
            </button>

            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 space-y-1">
              <div className="flex justify-between font-medium text-teal-600">
                <span>预计到手工资（{effectiveSalaryMonth}月）：</span>
                <span>{(selectedIncomeRow ? selectedIncomeRow.netSalary : monthlyResult.takeHome).toFixed(2)} 元</span>
              </div>
            </div>

            <div className="mt-4 flex gap-6 text-sm border-b border-slate-100">
              <button
                type="button"
                onClick={() => setResultTab("summary")}
                className={`pb-2 -mb-px border-b-2 transition ${
                  resultTab === "summary"
                    ? "border-teal-500 text-teal-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                计算结果
              </button>
              <button
                type="button"
                onClick={() => setResultTab("income")}
                className={`pb-2 -mb-px border-b-2 transition ${
                  resultTab === "income"
                    ? "border-teal-500 text-teal-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                收入明细
              </button>
            </div>

            {resultTab === "summary" && (
              <>
                <div className="mt-6 rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 text-sm font-medium text-slate-700">
                    计算结果明细
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-slate-700">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-slate-500">项目</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-500">个人缴纳部分</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-500">企业缴纳部分</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-2">养老保险</td>
                          <td className="px-4 py-2 text-right">
                            {monthlyResult.breakdown.pensionPersonal.toFixed(2)} 元（{pensionRate}%）
                          </td>
                          <td className="px-4 py-2 text-right">
                            {monthlyResult.breakdown.pensionCompany.toFixed(2)} 元（{EMPLOYER_BASE_RATES.pension}%）
                          </td>
                        </tr>
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-2">医疗保险</td>
                          <td className="px-4 py-2 text-right">
                            {monthlyResult.breakdown.medicalPersonal.toFixed(2)} 元（{medicalRate}%）
                          </td>
                          <td className="px-4 py-2 text-right">
                            {monthlyResult.breakdown.medicalCompany.toFixed(2)} 元（{EMPLOYER_BASE_RATES.medical}%）
                          </td>
                        </tr>
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-2">失业保险</td>
                          <td className="px-4 py-2 text-right">
                            {monthlyResult.breakdown.unemploymentPersonal.toFixed(2)} 元（{unemploymentRate}%）
                          </td>
                          <td className="px-4 py-2 text-right">
                            {monthlyResult.breakdown.unemploymentCompany.toFixed(2)} 元（{EMPLOYER_BASE_RATES.unemployment}%）
                          </td>
                        </tr>
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-2">工伤保险</td>
                          <td className="px-4 py-2 text-right">
                            {monthlyResult.breakdown.injuryPersonal > 0
                              ? `${monthlyResult.breakdown.injuryPersonal.toFixed(2)} 元（${injuryRate}%）`
                              : "无"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {monthlyResult.breakdown.injuryCompany.toFixed(2)} 元（{EMPLOYER_BASE_RATES.injury}%）
                          </td>
                        </tr>
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-2">生育保险</td>
                          <td className="px-4 py-2 text-right">
                            {monthlyResult.breakdown.maternityPersonal > 0
                              ? `${monthlyResult.breakdown.maternityPersonal.toFixed(2)} 元（${maternityRate}%）`
                              : "无"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {monthlyResult.breakdown.maternityCompany.toFixed(2)} 元（{EMPLOYER_BASE_RATES.maternity}%）
                          </td>
                        </tr>
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-2">住房公积金</td>
                          <td className="px-4 py-2 text-right">
                            {useHousingFund
                              ? `${monthlyResult.breakdown.housingPersonal.toFixed(2)} 元（${housingRate}%）`
                              : "无"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {useHousingFund
                              ? `${monthlyResult.breakdown.housingCompany.toFixed(2)} 元（${EMPLOYER_BASE_RATES.housing}%）`
                              : "无"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-xs leading-relaxed text-slate-600 space-y-2">
                  <div className="font-medium text-slate-700">
                    【{currentCity ? currentCity.name : "当前城市"}】工资
                    {monthlyIncome || "0"}
                    元税后工资解读
                  </div>
                  <p>
                    每个公司为个人缴纳社保公积金的比例有所不同，以下数据仅供参考。本页展示的五险一金金额是按照当前输入的缴纳比例和基数计算得出。
                  </p>
                  <p>
                    在当前设置下，个人每月五险一金合计支出约为
                    {(monthlyResult.social + monthlyResult.housing).toFixed(2)} 元，企业为你缴纳的五险一金约为
                    {(
                      monthlyResult.breakdown.pensionCompany +
                      monthlyResult.breakdown.medicalCompany +
                      monthlyResult.breakdown.unemploymentCompany +
                      monthlyResult.breakdown.maternityCompany +
                      monthlyResult.breakdown.injuryCompany +
                      (useHousingFund ? monthlyResult.breakdown.housingCompany : 0)
                    ).toFixed(2)} 元。
                  </p>
                  <p>
                    你的税前工资为 {monthlyIncome || "0"} 元，扣除五险一金和专项附加扣除后，应纳税所得额约为
                    {(
                      parseNumber(monthlyIncome) -
                      monthlyResult.social -
                      monthlyResult.housing -
                      Math.max(0, parseNumber(additionalDeduction))
                    ).toFixed(2)}
                    元（如小于 0 按 0 计），{effectiveSalaryMonth} 月对应个人所得税约为
                    {(selectedIncomeRow ? selectedIncomeRow.monthTax : monthlyResult.tax).toFixed(2)} 元，
                    {effectiveSalaryMonth} 月到手工资约为
                    {(selectedIncomeRow ? selectedIncomeRow.netSalary : monthlyResult.takeHome).toFixed(2)} 元。
                  </p>
                </div> */}

                <div className="mt-4 rounded-2xl bg-white border border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600 space-y-1">
                  <div className="font-medium text-slate-700">工资个税预扣预缴计算公式</div>
                  <p>
                    应纳税所得额 = 累计税前工资收入 - 累计五险一金（个人缴纳部分） - 累计专项附加扣除 - 累计减除费用
                  </p>
                  <p>应纳税额 = 应纳税所得额 × 预扣税率 - 速算扣除数</p>
                  <p>当月应纳税额 = 应纳税额 - 累计已缴纳税额</p>
                </div>
              </>
            )}

            {resultTab === "income" && (
              <div className="mt-6 rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 text-sm font-medium text-slate-700">
                  收入明细（按月预扣预缴）
                </div>
                <div className="overflow-x-auto">
                  {incomeDetails.length === 0 ? (
                    <div className="px-4 py-6 text-xs text-slate-500">
                      请输入月工资和五险一金后查看收入明细。
                    </div>
                  ) : (
                    <table className="min-w-full text-xs text-slate-700">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 min-w-[64px] text-left font-medium text-slate-500">月份</th>
                          <th className="px-3 py-2 min-w-[120px] text-right font-medium text-slate-500">当月税前工资</th>
                          <th className="px-3 py-2 min-w-[120px] text-right font-medium text-slate-500">累计税前工资</th>
                          <th className="px-3 py-2 min-w-[120px] text-right font-medium text-slate-500">当月五险一金</th>
                          <th className="px-3 py-2 min-w-[120px] text-right font-medium text-slate-500">累计五险一金</th>
                          <th className="px-3 py-2 min-w-[120px] text-right font-medium text-slate-500">累计减除费用</th>
                          <th className="px-3 py-2 min-w-[140px] text-right font-medium text-slate-500">累计专项附加扣除</th>
                          <th className="px-3 py-2 min-w-[100px] text-right font-medium text-slate-500">当月个税</th>
                          <th className="px-3 py-2 min-w-[120px] text-right font-medium text-slate-500">当月税后工资</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incomeDetails.map((row) => (
                          <tr key={row.month} className="border-t border-slate-100">
                            <td className="px-3 py-2">{row.month}</td>
                            <td className="px-3 py-2 text-right">{row.preTax.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{row.cumulativePreTax.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{row.monthFund.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{row.cumulativeFund.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{row.cumulativeDeduction.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{row.cumulativeAdditional.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{row.monthTax.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{row.netSalary.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 mt-1">
              <label className="block text-sm text-slate-500 mb-1">
                <span className="text-teal-500 mr-1">*</span>年终奖收入：
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={bonusIncome}
                  onChange={(e) => setBonusIncome(e.target.value)}
                  type="text"
                  className={`${baseInputClass} flex-1`}
                  placeholder="请输入年终奖金额"
                />
                <span className="text-sm text-slate-500">元</span>
              </div>
            </div>

            <button
              type="button"
              className="mt-6 w-full rounded-full bg-teal-500 py-2.5 text-sm font-medium text-white shadow hover:bg-teal-600 transition"
            >
              计算
            </button>

            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>年终奖个税：</span>
                <span>{bonusResult.tax.toFixed(2)} 元</span>
              </div>
              <div className="flex justify-between font-medium text-teal-600">
                <span>到手年终奖：</span>
                <span>{bonusResult.afterTax.toFixed(2)} 元</span>
              </div>
            </div>
          </>
        )}
    </div>
  );
}
