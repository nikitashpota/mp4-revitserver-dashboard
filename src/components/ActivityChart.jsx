// components/ActivityChart.jsx
import React, { useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { bytesToMB } from '../utils/dataUtils';
import Select from 'react-select';

const ActivityChart = ({
  chartData,
  detailedData = [],
  servers,
  models,
  selectedServer,
  selectedModel,
  onServerChange,
  onModelChange,
}) => {
  const totalSyncs = chartData.reduce((sum, day) => sum + day.syncCount, 0);
  const totalDataMB = chartData.reduce((sum, day) => sum + (day.dataSizeMB || 0), 0);
  const avgDataMB = chartData.length > 0 ? totalDataMB / chartData.length : 0;

  // ---------- Статистика по пользователям ----------
  const userStats = useMemo(() => {
    if (!detailedData.length) return [];

    const stats = {};

    detailedData.forEach(record => {
      const user = record['User'];
      if (!user) return;

      const dateKey = record.parsedDate?.toLocaleDateString('ru-RU');

      if (!stats[user]) {
        stats[user] = {
          user,
          syncCount: 0,
          totalDataBytes: 0,
          days: new Set(),
        };
      }

      if (dateKey) stats[user].days.add(dateKey);
      stats[user].syncCount += 1;
      stats[user].totalDataBytes += (record.supportSize || 0);
    });

    return Object.values(stats)
      .map(stat => ({
        user: stat.user,
        syncCount: stat.syncCount,
        totalDataMB: bytesToMB(stat.totalDataBytes),
        avgDataPerDay:
          stat.days.size > 0
            ? bytesToMB(stat.totalDataBytes / stat.days.size)
            : '0.00',
      }))
      .sort((a, b) => parseFloat(b.totalDataMB) - parseFloat(a.totalDataMB));
  }, [detailedData]);

  const uniqueUsersCount = userStats.length;

  // ---------- Опции для react-select ----------
  const serverOptions = useMemo(
    () => [
      { value: '', label: 'Выберите сервер' },
      ...servers.map(s => ({ value: s, label: s })),
    ],
    [servers],
  );

  const modelOptions = useMemo(() => {
    if (!selectedServer) return [{ value: '', label: 'Сначала выберите сервер' }];

    const filtered = models
      .filter(m => {
        // Предполагаем, что models – массив строк. Если модели уже привязаны к серверам,
        // замените логику фильтрации на соответствующую.
        return true;
      })
      .map(m => ({ value: m, label: m }));

    return [{ value: '', label: 'Выберите модель' }, ...filtered];
  }, [models, selectedServer]);

  const handleServerChange = useCallback(
    option => onServerChange(option?.value ?? ''),
    [onServerChange],
  );

  const handleModelChange = useCallback(
    option => onModelChange(option?.value ?? ''),
    [onModelChange],
  );

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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        График активности по дням
      </h2>

      {/* ---------- Выпадающие списки с поиском ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Сервер
          </label>
          <Select
            value={serverOptions.find(o => o.value === selectedServer) ?? null}
            onChange={handleServerChange}
            options={serverOptions}
            isSearchable
            placeholder="Выберите сервер"
            classNamePrefix="react-select"
            styles={selectStyles}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Модель
          </label>
          <Select
            value={modelOptions.find(o => o.value === selectedModel) ?? null}
            onChange={handleModelChange}
            options={modelOptions}
            isSearchable
            isDisabled={!selectedServer}
            placeholder="Выберите модель"
            classNamePrefix="react-select"
            styles={selectStyles}
          />
        </div>
      </div>

      {/* ---------- График и статистика ---------- */}
      {chartData.length > 0 ? (
        <div className="mt-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
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
                label={{
                  value: 'Объём данных (МБ)',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value, name) => {
                  if (name === 'dataSizeMB') return [value + ' МБ', 'SupportSize'];
                  if (name === 'syncCount') return [value, 'Синхронизаций'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar
                dataKey="dataSizeMB"
                fill="#3b82f6"
                name="Объём данных (МБ)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Краткая статистика */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Всего синхронизаций</div>
              <div className="text-2xl font-bold text-blue-600">{totalSyncs}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Общий об.дан</div>
              <div className="text-2xl font-bold text-green-600">
                {totalDataMB.toFixed(2)} МБ
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Средний об.дан/день</div>
              <div className="text-2xl font-bold text-purple-600">
                {avgDataMB.toFixed(2)} МБ
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Уникальных пользователей</div>
              <div className="text-2xl font-bold text-orange-600">
                {uniqueUsersCount}
              </div>
            </div>
          </div>

          {/* Таблица пользователей */}
          {userStats.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-semibold text-gray-900 mb-3">
                Статистика по пользователям
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Пользователь
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Синхронизаций
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Общий объём (МБ)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Средний объём/день (МБ)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userStats.map((stat, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {stat.user}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {stat.syncCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-semibold">{stat.totalDataMB}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-semibold text-purple-600">
                            {stat.avgDataPerDay}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          {selectedServer && selectedModel
            ? 'Нет данных для выбранной модели в указанном диапазоне дат'
            : 'Выберите сервер и модель для отображения графика'}
        </div>
      )}
    </div>
  );
};

export default ActivityChart;