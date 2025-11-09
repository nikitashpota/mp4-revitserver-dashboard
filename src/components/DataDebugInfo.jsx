import React from 'react';

const DataDebugInfo = ({ data, filteredData }) => {
  const validDates = data.filter(r => r.parsedDate !== null && !isNaN(r.parsedDate.getTime())).length;
  const invalidDates = data.length - validDates;
  
  const uniqueServers = [...new Set(filteredData.map(d => d['Сервер']))].filter(Boolean);
  const uniqueModels = [...new Set(filteredData.map(d => d['Имя файла']))].filter(Boolean);
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-semibold text-blue-900 mb-2">
        📊 Информация о загруженных данных
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-600">Всего записей:</div>
          <div className="font-semibold text-gray-900">{data.length}</div>
        </div>
        <div>
          <div className="text-gray-600">Корректных дат:</div>
          <div className="font-semibold text-green-600">{validDates}</div>
        </div>
        {invalidDates > 0 && (
          <div>
            <div className="text-gray-600">Ошибок парсинга:</div>
            <div className="font-semibold text-red-600">{invalidDates}</div>
          </div>
        )}
        <div>
          <div className="text-gray-600">Серверов:</div>
          <div className="font-semibold text-gray-900">{uniqueServers.length}</div>
        </div>
        <div>
          <div className="text-gray-600">Моделей:</div>
          <div className="font-semibold text-gray-900">{uniqueModels.length}</div>
        </div>
      </div>
      {invalidDates > 0 && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          ⚠️ Некоторые даты не удалось распознать. Откройте консоль браузера (F12) для деталей.
        </div>
      )}
    </div>
  );
};

export default DataDebugInfo;
