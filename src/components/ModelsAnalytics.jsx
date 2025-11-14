// components/ModelsAnalytics.jsx
import React, { useMemo, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { bytesToMB } from '../utils/dataUtils';
import Select from 'react-select';

const extractModelType = (filename) => {
  if (!filename) return 'Неизвестно';
  const upper = filename.toUpperCase();

  if (/[_\s]АР[\d.]*[_\s]?/i.test(upper) || /[_\s]AR[\d.]*[_\s]?/i.test(upper))
    return 'АР';
  if (/[_\s]АИ[\d.]*[_\s]?/i.test(upper) || /[_\s]AI[\d.]*[_\s]?/i.test(upper))
    return 'АИ';
  if (
    /[_\s]КР[\d.]*[_\s]?/i.test(upper) ||
    /[_\s]КЖ[\d.]*[_\s]?/i.test(upper) ||
    /[_\s]КМ[\d.]*[_\s]?/i.test(upper)
  )
    return 'КР';
  if (/[_\s]ОВ[\d.]*[_\s]?/i.test(upper) || /[_\s]OV[\d.]*[_\s]?/i.test(upper))
    return 'ОВ';
  if (/[_\s]ВК[\d.]*[_\s]?/i.test(upper) || /[_\s]VK[\d.]*[_\s]?/i.test(upper))
    return 'ВК';
  if (
    /[_\s]ЭМ[\d.]*[_\s]?/i.test(upper) ||
    /[_\s]ЭО[\d.]*[_\s]?/i.test(upper) ||
    /[_\s]EM[\d.]*[_\s]?/i.test(upper)
  )
    return 'ЭОМ';
  if (/[_\s]ГП[\d.]*[_\s]?/i.test(upper) || /[_\s]GP[\d.]*[_\s]?/i.test(upper))
    return 'ГП';

  return 'Прочее';
};

const COLORS = {
  'АР': '#3b82f6',
  'АИ': '#0e3573ff',
  'КР': '#10b981',
  'ОВ': '#8b5cf6',
  'ВК': '#f59e0b',
  'ЭОМ': '#ec4899',
  'ГП': '#06b6d4',
  'Прочее': '#6b7280',
};

const TYPE_LABELS = {
  'АР': 'Архитектура',
  'АИ': 'Интерьеры',
  'КР': 'Конструкции',
  'ОВ': 'Вентиляция',
  'ВК': 'Водоснабжение',
  'ЭОМ': 'Электрика',
  'ГП': 'Генплан',
  'Прочее': 'Прочее',
};

const ModelsAnalytics = ({ filteredData }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // ---------- Данные для серверов и моделей ----------
  const { serverOptions, modelOptionsByServer } = useMemo(() => {
    const serversSet = new Set();
    const map = {};

    filteredData.forEach(r => {
      const srv = r['Сервер'];
      const mdl = r['Имя файла'];
      if (!srv || !mdl) return;
      serversSet.add(srv);
      if (!map[srv]) map[srv] = new Set();
      map[srv].add(mdl);
    });

    const serverOpts = [
      { value: '', label: 'Выберите сервер' },
      ...Array.from(serversSet).map(s => ({ value: s, label: s }))
    ];

    const modelOptsBySrv = {};
    Object.entries(map).forEach(([srv, modelsSet]) => {
      modelOptsBySrv[srv] = [
        { value: '', label: 'Выберите модель' },
        ...Array.from(modelsSet).map(m => ({ value: m, label: m })),
      ];
    });

    return { serverOptions: serverOpts, modelOptionsByServer: modelOptsBySrv };
  }, [filteredData]);

  const [selectedServerForGrowth, setSelectedServerForGrowth] = useState('');
  const [selectedModelForGrowth, setSelectedModelForGrowth] = useState('');

  const handleServerChange = useCallback(
    opt => {
      const srv = opt?.value ?? '';
      setSelectedServerForGrowth(srv);
      setSelectedModelForGrowth('');
    },
    [],
  );

  const handleModelChange = useCallback(opt => setSelectedModelForGrowth(opt?.value ?? ''), []);

  // ---------- Рейтинг моделей (СОРТИРОВКА ПО РАЗМЕРУ) ----------
  const modelsRating = useMemo(() => {
    const stats = {};

    filteredData.forEach(record => {
      const model = record['Имя файла'];
      const server = record['Сервер'];
      if (!model) return;

      const key = `${server}::${model}`;
      if (!stats[key]) {
        stats[key] = {
          model,
          server,
          syncCount: 0,
          lastModelSize: 0,
          lastSync: null,
          users: new Set(),
        };
      }

      stats[key].syncCount += 1;

      if (record.parsedDate && (!stats[key].lastSync || record.parsedDate > stats[key].lastSync)) {
        stats[key].lastSync = record.parsedDate;
        stats[key].lastModelSize = record.modelSize || 0;
      }

      if (record['User']) stats[key].users.add(record['User']);
    });

    return Object.values(stats)
      .map(stat => ({
        ...stat,
        totalDataMB: parseFloat(bytesToMB(stat.lastModelSize)),
        totalDataGB: parseFloat(bytesToMB(stat.lastModelSize)) / 1024,
        usersCount: stat.users.size,
        type: extractModelType(stat.model),
      }))
      .sort((a, b) => b.totalDataMB - a.totalDataMB); // ИЗМЕНЕНО: сортировка по размеру
  }, [filteredData]);

  // ---------- Распределение по типам (в ГБ) ----------
  const modelsByType = useMemo(() => {
    const types = {};

    modelsRating.forEach(m => {
      const t = m.type;
      if (!types[t]) {
        types[t] = { name: t, count: 0, totalDataGB: 0, syncCount: 0 };
      }
      types[t].count += 1;
      types[t].totalDataGB += m.totalDataGB;
      types[t].syncCount += m.syncCount;
    });

    return Object.values(types).sort((a, b) => b.totalDataGB - a.totalDataGB);
  }, [modelsRating]);

  // Вычисляем общий размер для процентов
  const totalGB = useMemo(() => {
    return modelsByType.reduce((sum, type) => sum + type.totalDataGB, 0);
  }, [modelsByType]);

  // ---------- График роста ----------
  const modelGrowthData = useMemo(() => {
    if (!selectedServerForGrowth || !selectedModelForGrowth) return [];

    const data = filteredData.filter(
      r => r['Сервер'] === selectedServerForGrowth && r['Имя файла'] === selectedModelForGrowth,
    );

    const daily = {};
    data.forEach(r => {
      if (!r.parsedDate) return;
      const key = r.parsedDate.toLocaleDateString('ru-RU');
      
      if (!daily[key]) {
        daily[key] = { 
          date: key, 
          size: 0, 
          ts: r.parsedDate.getTime(),
          lastUpdate: r.parsedDate
        };
      }
      
      if (r.parsedDate >= daily[key].lastUpdate) {
        daily[key].lastUpdate = r.parsedDate;
        daily[key].size = r.modelSize || 0;
      }
    });

    return Object.values(daily)
      .sort((a, b) => a.ts - b.ts)
      .map(d => ({ date: d.date, sizeMB: parseFloat(bytesToMB(d.size)) }));
  }, [filteredData, selectedServerForGrowth, selectedModelForGrowth]);

  // ---------- Пагинация ----------
  const totalPages = Math.ceil(modelsRating.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentModels = modelsRating.slice(startIndex, startIndex + itemsPerPage);

  // Компонент пагинации
  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Назад
        </button>
        
        <div className="flex gap-1">
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 text-sm rounded ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Вперед
        </button>
      </div>
    );
  };

  // ДОБАВЛЕНО: Функция для отображения процентов на кольце
  const renderLabel = (entry) => {
    const percent = totalGB > 0 ? ((entry.totalDataGB / totalGB) * 100).toFixed(1) : 0;
    return `${percent}%`;
  };

  // ---------- Стили react-select ----------
  const selectStyles = {
    control: (provided, state) => ({
      ...provided,
      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
      boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
      '&:hover': { borderColor: '#9ca3af' },
    }),
  };

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div
        className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Аналитика по моделям
          </h2>
          {!isCollapsed && (
            <span className="text-sm text-gray-500">
              {modelsRating.length} моделей
            </span>
          )}
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <svg
            className={`w-5 h-5 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-6">
          {/* ---------- Распределение по типам ---------- */}
          <div className="mb-8">
            <h3 className="text-md font-semibold text-gray-900 mb-4">
              Распределение моделей по разделам
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ИСПРАВЛЕНО: Donut Chart с центрированием и процентами */}
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={modelsByType}
                      dataKey="totalDataGB"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}   
                      outerRadius={120}
                      label={renderLabel}
                      labelLine={false}
                    >
                      {modelsByType.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      formatter={(value, name) => [
                        `${value.toFixed(2)} ГБ`,
                        TYPE_LABELS[name] || name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Компактная легенда */}
              <div className="space-y-2">
                {modelsByType.map((type, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[type.name] || '#6b7280' }}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {type.name} · {TYPE_LABELS[type.name]}
                        </div>
                        <div className="text-xs text-gray-500">{type.count} моделей</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{type.syncCount}</div>
                      <div className="text-xs text-gray-500">{type.totalDataGB.toFixed(2)} ГБ</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ---------- Таблица всех моделей с пагинацией ---------- */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold text-gray-900">
                Все модели (по размеру)
              </h3>
              <div className="text-sm text-gray-500">
                {startIndex + 1}–{Math.min(startIndex + itemsPerPage, modelsRating.length)} из {modelsRating.length}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Модель</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сервер</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Раздел</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Синхр.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Размер (МБ)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Польз.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentModels.map((model, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {startIndex + i + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                        <div className="truncate font-medium">{model.model}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {model.server}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: COLORS[model.type] || '#6b7280' }}
                        >
                          {model.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {model.syncCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        {model.totalDataMB.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">
                        {model.usersCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </div>

          {/* ---------- График роста модели ---------- */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-4">
              Рост размера модели во времени
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Сервер */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сервер
                </label>
                <Select
                  value={serverOptions.find(o => o.value === selectedServerForGrowth) ?? null}
                  onChange={handleServerChange}
                  options={serverOptions}
                  isSearchable
                  placeholder="Выберите сервер"
                  classNamePrefix="react-select"
                  styles={selectStyles}
                />
              </div>

              {/* Модель */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Модель
                </label>
                <Select
                  value={
                    (modelOptionsByServer[selectedServerForGrowth] || []).find(
                      o => o.value === selectedModelForGrowth,
                    ) ?? null
                  }
                  onChange={handleModelChange}
                  options={modelOptionsByServer[selectedServerForGrowth] || []}
                  isSearchable
                  isDisabled={!selectedServerForGrowth}
                  placeholder="Выберите модель"
                  classNamePrefix="react-select"
                  styles={selectStyles}
                />
              </div>
            </div>

            {modelGrowthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={modelGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Размер модели (МБ)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sizeMB"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Размер (МБ)"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400">
                {selectedServerForGrowth && selectedModelForGrowth
                  ? 'Недостаточно данных для построения графика'
                  : 'Выберите сервер и модель для отображения графика роста'}
              </div>
            )}
          </div>

          {/* Пустое состояние */}
          {modelsRating.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Нет данных о моделях в выбранном диапазоне дат
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelsAnalytics;