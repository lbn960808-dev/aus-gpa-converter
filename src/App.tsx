import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  GraduationCap,
  Calculator,
  FileSpreadsheet,
  Info,
  BookOpen,
  Award,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  Moon,
  Sun,
  Download,
  Upload,
  PieChart as PieIcon,
  CheckSquare,
  Square
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import {
  Course,
  PRESET_SYSTEMS,
  CONVERSION_SYSTEMS,
  ConversionSystemId,
  convertToGPA7,
  getHonorsClassification,
  isGradeInvalid,
  isCreditsInvalid
} from './utils/calculator';

const SAMPLE_COURSES: Course[] = [
  { id: 's1', name: '高等微積分 (Advanced Calculus)', credits: 4, scale: 'percentage', grade: 88, excludeFromGPA: false },
  { id: 's2', name: '線性代數與矩陣 (Linear Algebra)', credits: 3, scale: 'percentage', grade: 78, excludeFromGPA: false },
  { id: 's3', name: '軟體工程導論 (Software Engineering)', credits: 3, scale: 'percentage', grade: 92, excludeFromGPA: false },
  { id: 's4', name: '資料庫系統 (Database Systems)', credits: 3, scale: 'percentage', grade: 70, excludeFromGPA: false },
  { id: 's5', name: '計算機網路 (Computer Networks)', credits: 3, scale: 'percentage', grade: 62, excludeFromGPA: false },
  { id: 's6', name: '體育與健康教育 (PE)', credits: 1, scale: 'percentage', grade: 85, excludeFromGPA: true }
];

export default function App() {
  // LocalStorage persistence initialization
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const saved = localStorage.getItem('aus_gpa_courses');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return PRESET_SYSTEMS[0].courses;
  });

  const [activePreset, setActivePreset] = useState<string>(() => {
    return localStorage.getItem('aus_gpa_preset') || 'taiwan-percentage';
  });

  const [conversionSystem, setConversionSystem] = useState<ConversionSystemId>(() => {
    return (localStorage.getItem('aus_gpa_system') as ConversionSystemId) || 'standard';
  });

  const [failPoint, setFailPoint] = useState<number>(() => {
    const saved = localStorage.getItem('aus_gpa_failpoint');
    return saved !== null ? parseFloat(saved) : 0.0;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('aus_gpa_dark') === 'true';
  });

  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [batchText, setBatchText] = useState<string>('');

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('aus_gpa_courses', JSON.stringify(courses));
      localStorage.setItem('aus_gpa_preset', activePreset);
      localStorage.setItem('aus_gpa_system', conversionSystem);
      localStorage.setItem('aus_gpa_failpoint', failPoint.toString());
      localStorage.setItem('aus_gpa_dark', darkMode.toString());
    } catch (e) {
      console.error(e);
    }
  }, [courses, activePreset, conversionSystem, failPoint, darkMode]);

  // Dark mode class toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Add course
  const addCourse = () => {
    const newCourse: Course = {
      id: Date.now().toString(),
      name: `課程 ${courses.length + 1}`,
      credits: 3,
      scale: 'percentage',
      grade: 80,
      excludeFromGPA: false
    };
    setCourses([...courses, newCourse]);
  };

  // Remove course
  const removeCourse = (id: string) => {
    if (courses.length <= 1) {
      alert('至少需保留一門課程');
      return;
    }
    setCourses(courses.filter(c => c.id !== id));
  };

  // Update course field
  const updateCourse = (id: string, field: keyof Course, value: any) => {
    setCourses(courses.map(c => {
      if (c.id === id) {
        const updated = { ...c, [field]: value };
        if (field === 'scale') {
          if (value === 'percentage') updated.grade = 80;
          else if (value === 'gpa43') updated.grade = 3.3;
          else if (value === 'gpa40') updated.grade = 3.0;
        }
        return updated;
      }
      return c;
    }));
  };

  // Load preset
  const handlePresetChange = (presetId: string) => {
    setActivePreset(presetId);
    const preset = PRESET_SYSTEMS.find(p => p.id === presetId);
    if (preset) {
      setCourses(JSON.parse(JSON.stringify(preset.courses)));
    }
  };

  // Load Sample Data
  const handleLoadSample = () => {
    setCourses(JSON.parse(JSON.stringify(SAMPLE_COURSES)));
    setActivePreset('');
  };

  // Reset confirmation execution
  const executeReset = () => {
    setCourses([
      { id: Date.now().toString(), name: '範例課程 1', credits: 3, scale: 'percentage', grade: 85, excludeFromGPA: false }
    ]);
    setActivePreset('');
    setConversionSystem('standard');
    setFailPoint(0.0);
    setShowResetModal(false);
  };

  // Batch Import Parser
  const handleBatchImport = () => {
    if (!batchText.trim()) return;
    const lines = batchText.trim().split('\n');
    const newCourses: Course[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(/[\t,]+/).map(p => p.trim());
      if (parts.length >= 2) {
        const name = parts[0] || `匯入課程 ${idx + 1}`;
        const credits = parseFloat(parts[1]) || 3;
        const grade = parts[2] !== undefined ? parseFloat(parts[2]) : 80;
        newCourses.push({
          id: `${Date.now()}-${idx}`,
          name,
          credits,
          scale: 'percentage',
          grade: isNaN(grade) ? 80 : grade,
          excludeFromGPA: false
        });
      }
    });

    if (newCourses.length > 0) {
      setCourses(newCourses);
      setShowBatchModal(false);
      setBatchText('');
    } else {
      alert('格式無法辨識，請確保每行包含「課程名稱、學分、成績」並以 Tab 或逗號分隔');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,Course Name,Credits,Scale,Grade,ExcludeFromGPA,GPA7,WAM\n";
    courses.forEach(c => {
      const res = convertToGPA7(c.scale, Number(c.grade), conversionSystem, failPoint);
      csvContent += `"${c.name}",${c.credits},${c.scale},${c.grade},${c.excludeFromGPA ? 'Yes' : 'No'},${res.gpa7},${res.mark}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Australia_GPA_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger celebration on high GPA
  const triggerCelebration = () => {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 }
    });
  };

  // Calculations with Edge Case Prevention (Division by zero / NaN safety)
  let totalCreditsValid = 0;
  let weightedGpaSum = 0;
  let weightedMarkSum = 0;
  let validCoursesCount = 0;

  const gradeBuckets: { [key: string]: number } = {
    'High Distinction (HD)': 0,
    'Distinction (D)': 0,
    'Credit (CR)': 0,
    'Pass (P)': 0,
    'Fail (N)': 0
  };

  courses.forEach(c => {
    const credits = Number(c.credits) || 0;
    const grade = Number(c.grade);

    if (!isCreditsInvalid(credits) && !isGradeInvalid(c)) {
      validCoursesCount++;
      // If course is excluded from GPA, it won't contribute to GPA & WAM denominators
      if (!c.excludeFromGPA) {
        const { gpa7, mark, gradeName } = convertToGPA7(c.scale, grade, conversionSystem, failPoint);
        weightedGpaSum += gpa7 * credits;
        weightedMarkSum += mark * credits;
        totalCreditsValid += credits;

        if (gradeBuckets[gradeName] !== undefined) {
          gradeBuckets[gradeName] += credits;
        } else {
          gradeBuckets['Fail (N)'] += credits;
        }
      }
    }
  });

  const gpa7Total = totalCreditsValid > 0 ? weightedGpaSum / totalCreditsValid : 0;
  const wamTotal = totalCreditsValid > 0 ? weightedMarkSum / totalCreditsValid : 0;
  const honors = getHonorsClassification(gpa7Total);

  // Chart data
  const chartData = [
    { name: 'HD (7.0)', credits: gradeBuckets['High Distinction (HD)'] || 0, color: '#f59e0b' },
    { name: 'D (6.0)', credits: gradeBuckets['Distinction (D)'] || 0, color: '#6366f1' },
    { name: 'CR (5.0)', credits: gradeBuckets['Credit (CR)'] || 0, color: '#10b981' },
    { name: 'P (4.0)', credits: gradeBuckets['Pass (P)'] || 0, color: '#0ea5e9' },
    { name: 'Fail', credits: gradeBuckets['Fail (N)'] || 0, color: '#f43f5e' },
  ].filter(item => item.credits > 0);

  const progressToD = Math.min(100, Math.max(0, (gpa7Total / 6.0) * 100));
  const progressToHD = Math.min(100, Math.max(0, (gpa7Total / 7.0) * 100));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 transition-colors duration-200">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Australia 7-Point GPA & WAM Converter
                </h1>
                <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  澳洲留學專用
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                支持台灣百分制、4.3 制、4.0 制無縫轉換至澳洲標準 7 分制 GPA 與 WAM
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="切換深色模式"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>說明</span>
            </button>
            <button
              onClick={() => setShowResetModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">重置</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* Quick Action & Preset Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center space-x-1">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>快速範本：</span>
              </span>
              {PRESET_SYSTEMS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetChange(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    activePreset === preset.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 lg:pl-4">
              <button
                onClick={handleLoadSample}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>載入測試數據</span>
              </button>
              <button
                onClick={() => setShowBatchModal(true)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>批次貼上匯入</span>
              </button>
              <button
                onClick={exportToCSV}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>匯出 CSV 報告</span>
              </button>
            </div>

          </div>

          {/* Conversion System selector row */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                評分對照表：
              </span>
              {CONVERSION_SYSTEMS.map(sys => (
                <button
                  key={sys.id}
                  onClick={() => setConversionSystem(sys.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    conversionSystem === sys.id
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {sys.name}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fail 點數：</span>
              <button
                onClick={() => setFailPoint(0.0)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  failPoint === 0.0 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                0.0
              </button>
              <button
                onClick={() => setFailPoint(1.0)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  failPoint === 1.0 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                1.0
              </button>
            </div>
          </div>
        </div>

        {/* Guide Banner */}
        {showGuide && (
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 mb-8 text-slate-700 dark:text-slate-200 relative animate-fadeIn">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 text-sm font-bold"
            >
              ✕
            </button>
            <h4 className="font-bold text-blue-900 dark:text-blue-300 text-base mb-3 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>澳洲大學 7 分制 (7-Point GPA) 與 WAM 說明指南</span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
              系統已啟用 <strong>LocalStorage 自動儲存</strong>功能，所有輸入資料與設定會隨時保留。對於 Pass/Fail 免算 GPA 科目，可勾選右側的「不採計至 GPA」選項進行排除。
            </p>
          </div>
        )}

        {/* Two-column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column: Course Input Table */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">課程成績輸入區</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {courses.length} 門課程 ({validCoursesCount} 門有效)
                </span>
              </div>
              <button
                onClick={addCourse}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>新增課程</span>
              </button>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto p-4 sm:p-6 flex-1">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 px-3">課程名稱</th>
                    <th className="pb-3 px-3 w-20">學分</th>
                    <th className="pb-3 px-3 w-32">成績制</th>
                    <th className="pb-3 px-3 w-28">原始成績</th>
                    <th className="pb-3 px-3 w-24 text-center">不計GPA</th>
                    <th className="pb-3 px-3 w-28 text-center">評等/GPA</th>
                    <th className="pb-3 px-3 w-12 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {courses.map((course, index) => {
                    const gradeInvalid = isGradeInvalid(course);
                    const creditsInvalid = isCreditsInvalid(course.credits);
                    const converted = convertToGPA7(course.scale, Number(course.grade), conversionSystem, failPoint);

                    return (
                      <tr key={course.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={course.name}
                            onChange={(e) => updateCourse(course.id, 'name', e.target.value)}
                            placeholder={`課程 ${index + 1}`}
                            className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={course.credits}
                            onChange={(e) => updateCourse(course.id, 'credits', parseFloat(e.target.value))}
                            className={`w-full bg-transparent border rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none text-center ${
                              creditsInvalid ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                            }`}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={course.scale}
                            onChange={(e) => updateCourse(course.id, 'scale', e.target.value as any)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                          >
                            <option value="percentage">百分制 (0-100)</option>
                            <option value="gpa43">4.3 制</option>
                            <option value="gpa40">4.0 制</option>
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          <div className="relative">
                            <input
                              type="number"
                              value={course.grade}
                              onChange={(e) => updateCourse(course.id, 'grade', parseFloat(e.target.value))}
                              className={`w-full bg-transparent border rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none text-center ${
                                gradeInvalid ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 text-rose-700' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
                              }`}
                            />
                            {gradeInvalid && (
                              <div className="absolute right-2 top-2.5 text-rose-500" title="成績超出有效範圍">
                                <AlertCircle className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => updateCourse(course.id, 'excludeFromGPA', !course.excludeFromGPA)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                            title={course.excludeFromGPA ? '已排除於 GPA 計算外' : '點擊以從 GPA 計算中排除'}
                          >
                            {course.excludeFromGPA ? (
                              <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold border ${
                            gradeInvalid || creditsInvalid ? 'bg-slate-100 text-slate-400 border-slate-200' : converted.badgeColor
                          }`}>
                            {gradeInvalid || creditsInvalid ? '無效' : `${converted.gpa7.toFixed(1)} (${converted.gradeName.split(' ')[0]})`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => removeCourse(course.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="刪除課程"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={addCourse}
                  className="inline-flex items-center space-x-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>新增一門課程</span>
                </button>
                <span className="text-xs text-slate-400">數據自動儲存於瀏覽器 LocalStorage</span>
              </div>
            </div>
          </div>

          {/* Right Column: Results Dashboard */}
          <div className="lg:col-span-4 space-y-6">

            {/* Primary GPA & WAM Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-blue-50 dark:bg-blue-950/20 rounded-full pointer-events-none opacity-50" />

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span>實時計算結果看板</span>
                </h3>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>安全防錯</span>
                </span>
              </div>

              {/* Big 7-Point GPA Display with Safe Edge Case Handling */}
              <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-6 text-center shadow-lg shadow-slate-900/10 mb-6 border border-slate-800">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Australia 7-Point GPA</span>
                <div className="text-5xl sm:text-6xl font-black tracking-tight my-2 text-blue-400">
                  {totalCreditsValid > 0 ? gpa7Total.toFixed(2) : '0.00'}
                  <span className="text-xl text-slate-400 font-normal"> / 7.0</span>
                </div>
                <button
                  onClick={triggerCelebration}
                  className="mt-2 text-xs text-blue-300 hover:text-white underline underline-offset-2 transition-colors"
                >
                  🎉 點此慶祝好成績
                </button>
              </div>

              {/* WAM & Total Credits Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-1">加權平均分 (WAM)</span>
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {totalCreditsValid > 0 ? wamTotal.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-xs text-slate-400 ml-0.5">/ 100</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-1">有效計算學分</span>
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalCreditsValid}</span>
                  <span className="text-xs text-slate-400 ml-0.5">學分</span>
                </div>
              </div>

              {/* Target Progress Bars */}
              <div className="space-y-3 mb-6 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-300">距離 Distinction 門檻 (GPA 6.0)</span>
                  <span className="text-blue-600 dark:text-blue-400">{progressToD.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${progressToD}%` }} />
                </div>

                <div className="flex justify-between text-xs font-semibold pt-1">
                  <span className="text-slate-600 dark:text-slate-300">距離 High Distinction (GPA 7.0)</span>
                  <span className="text-amber-600 dark:text-amber-400">{progressToHD.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressToHD}%` }} />
                </div>
              </div>

              {/* Honors Classification Banner */}
              <div className={`rounded-xl p-4 border ${honors.color}`}>
                <div className="flex items-start space-x-3">
                  <Award className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm mb-1">{honors.title}</h4>
                    <p className="text-xs leading-relaxed opacity-90">{honors.desc}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Data Visualization Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center space-x-2">
                <PieIcon className="w-4 h-4 text-blue-600" />
                <span>成績等級學分分佈比例</span>
              </h3>

              {chartData.length > 0 ? (
                <div className="h-48 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="credits"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        innerRadius={35}
                        paddingAngle={4}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                          borderColor: darkMode ? '#334155' : '#e2e8f0',
                          borderRadius: '0.5rem',
                          color: darkMode ? '#f8fafc' : '#0f172a',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-xs text-slate-400">
                  尚無有效採計課程數據
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                {chartData.map((item, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 dark:text-slate-300 truncate">{item.name} ({item.credits}學分)</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Batch Import Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center space-x-2">
              <Upload className="w-5 h-5 text-blue-600" />
              <span>批次貼上成績匯入</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              請從 Excel 或試算表複製多行資料貼上。每行格式為：<br />
              <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400">課程名稱 [Tab 或 逗號] 學分 [Tab 或 逗號] 成績</code>
            </p>
            <textarea
              rows={6}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder="例如：&#10;微積分	3	88&#10;普通物理	3	76&#10;會計學	3	92"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                取消
              </button>
              <button
                onClick={handleBatchImport}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
              >
                確認匯入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-fadeIn text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">確認重置所有資料？</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              這將會清除您目前輸入的所有課程、LocalStorage 快取與自訂設定，回復至初始狀態。
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
              >
                取消
              </button>
              <button
                onClick={executeReset}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-500/20"
              >
                確認重置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
        <p>Australia 7-Point GPA & WAM Converter © 2026 | 高穩定性留學成績試算與邊界防錯工具</p>
      </footer>
    </div>
  );
}
