// components/SummaryStats.jsx
import React from 'react';

const SummaryStats = ({ filteredData }) => {
  // Уникальные пользователи
  const uniqueUsers = [...new Set(filteredData.map(d => d['User']).filter(Boolean))].length;

  // Уникальные модели
  const uniqueModels = [...new Set(filteredData.map(d => d['Имя файла']).filter(Boolean))].length;

  // Статистика по серверам
  const serverStats = filteredData.reduce((acc, record) => {
    const server = record['Сервер'];
    if (!server) return acc;
    
    if (!acc[server]) {
      acc[server] = {
        syncCount: 0,
        users: new Set(),
        models: new Set(),
      };
    }
    
    acc[server].syncCount += 1;
    if (record['User']) acc[server].users.add(record['User']);
    if (record['Имя файла']) acc[server].models.add(record['Имя файла']);
    
    return acc;
  }, {});

  // Общее количество синхронизаций
  const totalSyncs = filteredData.length;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Общая статистика
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Уникальные пользователи */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-gray-600 mb-1">Уникальных пользователей</div>
          <div className="text-3xl font-bold text-blue-700">{uniqueUsers}</div>
          <div className="text-xs text-blue-600 mt-2">Активных в период</div>
        </div>

        {/* Уникальные модели */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-gray-600 mb-1">Уникальных моделей</div>
          <div className="text-3xl font-bold text-green-700">{uniqueModels}</div>
          <div className="text-xs text-green-600 mt-2">В работе</div>
        </div>

        {/* Всего синхронизаций */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-sm text-gray-600 mb-1">Всего синхронизаций</div>
          <div className="text-3xl font-bold text-purple-700">{totalSyncs}</div>
          <div className="text-xs text-purple-600 mt-2">За выбранный период</div>
        </div>
      </div>

      {/* Статистика по серверам */}
      {Object.keys(serverStats).length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">По серверам</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(serverStats).map(([server, stats]) => (
              <div key={server} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="font-semibold text-gray-900 mb-2">{server}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Синхронизаций:</span>
                    <span className="font-semibold text-gray-900">{stats.syncCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Пользователей:</span>
                    <span className="font-semibold text-blue-600">{stats.users.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Моделей:</span>
                    <span className="font-semibold text-green-600">{stats.models.size}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryStats;
