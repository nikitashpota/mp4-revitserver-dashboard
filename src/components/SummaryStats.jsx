// components/SummaryStats.jsx
import React from 'react';

// Функция: байты → ГБ (2 знака после запятой)
const bytesToGB = (bytes) => {
  return ((bytes || 0) / (1024 * 1024 * 1024)).toFixed(2);
};

const SummaryStats = ({ filteredData }) => {
  const uniqueUsers = [...new Set(filteredData.map(d => d['User']).filter(Boolean))].length;

  const serverVolumes = filteredData.reduce((acc, record) => {
    const server = record['Сервер'];
    const size = Number(record.supportSize) || 0;
    if (!server) return acc;
    acc[server] = (acc[server] || 0) + size;
    return acc;
  }, {});

  const totalBytes = Object.values(serverVolumes).reduce((sum, size) => sum + size, 0);
  const totalDataGB = bytesToGB(totalBytes);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Общая статистика
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Уникальные пользователи */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-gray-600">Уникальных пользователей</div>
          <div className="text-3xl font-bold text-blue-700">{uniqueUsers}</div>
        </div>

        {/* Общий объём — теперь в ГБ */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-gray-600">Объём отправленных данных</div>
          <div className="text-3xl font-bold text-green-700">
            {totalDataGB} ГБ
          </div>
        </div>

        {/* По серверам — в ГБ */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">По серверам</div>
          <div className="space-y-2">
            {Object.entries(serverVolumes).length > 0 ? (
              Object.entries(serverVolumes).map(([server, size]) => {
                const sizeGB = bytesToGB(size);
                return (
                  <div key={server} className="flex justify-between text-sm">
                    <span className="text-gray-600">{server}</span>
                    <span className="font-semibold text-gray-900">
                      {sizeGB} ГБ
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">Нет данных</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryStats;