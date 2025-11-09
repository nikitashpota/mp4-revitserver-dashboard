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
    return 'АР (Архитектура)';
  if (/[_\s]АИ[\d.]*[_\s]?/i.test(upper) || /[_\s]AI[\d.]*[_\s]?/i.test(upper))
    return 'АИ (Интерьеры)';
  if (
    /[_\s]КР[\d.]*[_\s]?/i.test(upper) ||
    /[_\s]КЖ[\d.]*[_\s]?/i.test(upper) ||
    /[_\s]КМ[\d.]*[_\s]?/i.test(upper)
  )
    return 'КР (Конструкции)';
  if (/[_\s]ОВ[\d.]*[_\s]?/i.test(upper) || /[_\s]OV[\d.]*[_\s]?/i.test(upper))
    return 'ОВ (Вентиляция)';
  if (/[_\s]ВК[\d.]*[_\s]?/i.test(upper) || /[_\s]VK[\d.]*[_\s]?/i.test(upper))
    return 'ВК (Водоснабжение)';
  if (
    /[_\s]ЭМ[\d.]*[_\s]?/i.test(upper) ||
    /[_\s]ЭО[\d.]*[_\s]?/i.test(upper) ||
    /[_\s]EM[\d.]*[_\s]?/i.test(upper)
  )
    return 'ЭОМ (Электрика)';
  if (/[_\s]ГП[\d.]*[_\s]?/i.test(upper) || /[_\s]GP[\d.]*[_\s]?/i.test(upper))
    return 'ГП (Генплан)';

  return 'Прочее';
};

const COLORS = {
  'АР (Архитектура)': '#3b82f6',
  'АИ (Интерьеры)': '#0e3573ff',
  'КР (Конструкции)': '#10b981',
  'ОВ (Вентиляция)': '#8b5cf6',
  'ВК (Водоснабжение)': '#f59e0b',
  'ЭОМ (Электрика)': '#ec4899',
  'ГП (Генплан)': '#06b6d4',
  'Прочее': '#6b7280',
};

const ModelsAnalytics = ({ filteredData }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // ---------- Данные для серверов и моделей ----------
  const { serverOptions, modelOptionsByServer, serverModelMap } = useMemo(() => {
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

    const serverOpts = [{ value: '', label: 'Выберите сервер' }, ...Array.from(serversSet).map(s => ({ value: s, label: s }))];

    const modelOptsBySrv = {};
    Object.entries(map).forEach(([srv, modelsSet]) => {
      modelOptsBySrv[srv] = [
        { value: '', label: 'Выберите модель' },
        ...Array.from(modelsSet).map(m => ({ value: m, label: m })),
      ];
    });

    return { serverOptions: serverOpts, modelOptionsByServer: modelOptsBySrv, serverModelMap: map };
  }, [filteredData]);

  const [selectedServerForGrowth, setSelectedServerForGrowth] = useState('');
  const [selectedModelForGrowth, setSelectedModelForGrowth] = useState('');

  const handleServerChange = useCallback(
    opt => {
      const srv = opt?.value ?? '';
      setSelectedServerForGrowth(srv);
      setSelectedModelForGrowth(''); // сбрасываем модель при смене сервера
    },
    [],
  );

  const handleModelChange = useCallback(opt => setSelectedModelForGrowth(opt?.value ?? ''), []);

  // ---------- Рейтинг моделей ----------
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
          totalDataBytes: 0,
          lastSync: null,
          users: new Set(),
        };
      }

      stats[key].syncCount += 1;
      stats[key].totalDataBytes += record.supportSize || 0;

      if (record.parsedDate && (!stats[key].lastSync || record.parsedDate > stats[key].lastSync)) {
        stats[key].lastSync = record.parsedDate;
      }

      if (record['User']) stats[key].users.add(record['User']);
    });

    return Object.values(stats)
      .map(stat => ({
        ...stat,
        totalDataMB: bytesToMB(stat.totalDataBytes),
        usersCount: stat.users.size,
        type: extractModelType(stat.model),
      }))
      .sort((a, b) => b.syncCount - a.syncCount);
  }, [filteredData]);

  // ---------- Распределение по типам ----------
  const modelsByType = useMemo(() => {
    const types = {};

    modelsRating.forEach(m => {
      const t = m.type;
      if (!types[t]) {
        types[t] = { name: t, count: 0, totalDataMB: 0, syncCount: 0 };
      }
      types[t].count += 1;
      types[t].totalDataMB += parseFloat(m.totalDataMB);
      types[t].syncCount += m.syncCount;
    });

    return Object.values(types).sort((a, b) => b.syncCount - a.syncCount);
  }, [modelsRating]);

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
        daily[key] = { date: key, size: 0, ts: r.parsedDate.getTime() };
      }
      daily[key].size += r.supportSize || 0;
    });

    return Object.values(daily)
      .sort((a, b) => a.ts - b.ts)
      .map(d => ({ date: d.date, sizeMB: parseFloat(bytesToMB(d.size)) }));
  }, [filteredData, selectedServerForGrowth, selectedModelForGrowth]);

  const top10Models = modelsRating.slice(0, 10);

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
        <h2 className="text-lg font-semibold text-gray-900">
          Аналитика по моделям
        </h2>
        <button className="text-gray-500 hover:text-gray-700 transition">
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
              Распределение моделей по типам
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Бублик (Donut Chart) */}
              <div>
              238      <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={modelsByType}
                      dataKey="syncCount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}   
                      outerRadius={150}  

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
                        `${value} синхр.`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Легенда справа (остаётся без изменений) */}
              <div className="space-y-3">
                {modelsByType.map((type, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[type.name] || '#6b7280' }}
                      />
                      <div>
                        <div className="font-medium text-sm text-gray-900">{type.name}</div>
                        <div className="text-xs text-gray-500">{type.count} моделей</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{type.syncCount} синхр.</div>
                      <div className="text-xs text-gray-500">{type.totalDataMB.toFixed(2)} МБ</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ---------- Топ-10 моделей ---------- */}
          <div className="mb-8">
            <h3 className="text-md font-semibold text-gray-900 mb-4">
              Top-10 самых активных моделей
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Модель</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сервер</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Синхронизаций</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Объём (МБ)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователей</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {top10Models.map((model, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {i + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{model.model}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{model.server}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: COLORS[model.type] || '#6b7280' }}
                        >
                          {model.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {model.syncCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {model.totalDataMB}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{model.usersCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

              {/* Модель (с поиском) */}
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
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Размер (МБ)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sizeMB"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Размер модели (МБ)"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                {selectedServerForGrowth && selectedModelForGrowth
                  ? 'Недостаточно данных для построения графика'
                  : 'Выберите сервер и модель для отображения графика роста'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelsAnalytics;