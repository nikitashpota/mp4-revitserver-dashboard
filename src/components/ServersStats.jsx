// components/ServersStats.jsx
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { bytesToMB } from '../utils/dataUtils';

const ServersStats = ({ filteredData }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Статистика по серверам
  const serversStats = useMemo(() => {
    const stats = {};
    
    filteredData.forEach(record => {
      const server = record['Сервер'];
      if (!server) return;
      
      if (!stats[server]) {
        stats[server] = {
          server,
          syncCount: 0,
          totalDataBytes: 0,
          models: new Set(),
          users: new Set(),
          lastActivity: null
        };
      }
      
      stats[server].syncCount += 1;
      stats[server].totalDataBytes += (record.supportSize || 0);
      
      if (record['Имя файла']) {
        stats[server].models.add(record['Имя файла']);
      }
      
      if (record['User']) {
        stats[server].users.add(record['User']);
      }
      
      if (record.parsedDate) {
        if (!stats[server].lastActivity || record.parsedDate > stats[server].lastActivity) {
          stats[server].lastActivity = record.parsedDate;
        }
      }
    });
    
    return Object.values(stats).map(stat => ({
      ...stat,
      totalDataMB: bytesToMB(stat.totalDataBytes),
      modelsCount: stat.models.size,
      usersCount: stat.users.size
    }));
  }, [filteredData]);

  // Расчет максимальных значений для процентов нагрузки
  const maxSyncCount = Math.max(...serversStats.map(s => s.syncCount), 1);
  const maxDataMB = Math.max(...serversStats.map(s => parseFloat(s.totalDataMB)), 1);

  // Данные для графика
  const chartData = serversStats.map(stat => ({
    server: stat.server,
    'Синхронизаций': stat.syncCount,
    'Объём (МБ)': parseFloat(stat.totalDataMB),
    'Моделей': stat.modelsCount,
    'Пользователей': stat.usersCount
  }));

  // Общая статистика
  const totalSyncs = serversStats.reduce((sum, s) => sum + s.syncCount, 0);
  const totalData = serversStats.reduce((sum, s) => sum + parseFloat(s.totalDataMB), 0);
  const totalModels = serversStats.reduce((sum, s) => sum + s.modelsCount, 0);
  const totalUsers = serversStats.reduce((sum, s) => sum + s.usersCount, 0);

  // Функция для определения цвета нагрузки
  const getLoadColor = (percent) => {
    if (percent >= 80) return 'bg-red-500';
    if (percent >= 60) return 'bg-orange-500';
    if (percent >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getLoadTextColor = (percent) => {
    if (percent >= 80) return 'text-red-700';
    if (percent >= 60) return 'text-orange-700';
    if (percent >= 40) return 'text-yellow-700';
    return 'text-green-700';
  };

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div 
        className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h2 className="text-lg font-semibold text-gray-900">
          Серверная статистика
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
          {/* Общая статистика */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-gray-600">Всего серверов</div>
              <div className="text-3xl font-bold text-blue-700">{serversStats.length}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-gray-600">Всего синхронизаций</div>
              <div className="text-3xl font-bold text-green-700">{totalSyncs}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-gray-600">Общий объём</div>
              <div className="text-3xl font-bold text-purple-700">{(totalData / 1024).toFixed(2)} ГБ</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="text-sm text-gray-600">Активных моделей</div>
              <div className="text-3xl font-bold text-orange-700">{totalModels}</div>
            </div>
          </div>

          {/* Нагрузка по серверам с прогресс-барами */}
          <div className="mb-8">
            <h3 className="text-md font-semibold text-gray-900 mb-4">
              Нагрузка по серверам (по количеству синхронизаций)
            </h3>
            <div className="space-y-4">
              {serversStats.map((server, index) => {
                const syncPercent = (server.syncCount / maxSyncCount) * 100;
                const dataPercent = (parseFloat(server.totalDataMB) / maxDataMB) * 100;
                
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold text-gray-900">{server.server}</div>
                        <span className={`text-sm font-semibold ${getLoadTextColor(syncPercent)}`}>
                          {syncPercent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {server.syncCount} синхронизаций
                      </div>
                    </div>
                    
                    {/* Progress bar для синхронизаций */}
                    <div className="w-full bg-gray-200 rounded-full h-4 mb-3 overflow-hidden">
                      <div 
                        className={`h-full ${getLoadColor(syncPercent)} transition-all duration-500 flex items-center justify-end pr-2`}
                        style={{ width: `${syncPercent}%` }}
                      >
                        {syncPercent > 15 && (
                          <span className="text-xs font-semibold text-white">
                            {syncPercent.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Дополнительная информация */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Объём данных</div>
                        <div className="font-semibold text-gray-900">{(server.totalDataMB/ 1024).toFixed(2)} ГБ</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Моделей</div>
                        <div className="font-semibold text-gray-900">{server.modelsCount}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Пользователей</div>
                        <div className="font-semibold text-gray-900">{server.usersCount}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Последняя активность</div>
                        <div className="font-semibold text-gray-900">
                          {server.lastActivity 
                            ? server.lastActivity.toLocaleDateString('ru-RU')
                            : 'Н/Д'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* График сравнения серверов */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-4">
              Сравнение серверов
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="server"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Количество', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Объём (МБ)', angle: 90, position: 'insideRight' }}
                />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="Синхронизаций" fill="#3b82f6" />
                <Bar yAxisId="left" dataKey="Моделей" fill="#10b981" />
                <Bar yAxisId="left" dataKey="Пользователей" fill="#8b5cf6" />
                <Bar yAxisId="right" dataKey="Объём (МБ)" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Предупреждения */}
          {serversStats.some(s => (s.syncCount / maxSyncCount) * 100 >= 80) && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-semibold text-red-800">Высокая нагрузка на сервера</div>
                  <div className="text-sm text-red-700 mt-1">
                    Один или несколько серверов работают с нагрузкой выше 80%. Рекомендуется:
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>Проверить производительность сервера</li>
                      <li>Рассмотреть балансировку нагрузки</li>
                      <li>Перенести часть моделей на другие серверы</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServersStats;
