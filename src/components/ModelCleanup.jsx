// components/ModelCleanup.jsx
import React, { useMemo, useState } from 'react';
import { bytesToMB } from '../utils/dataUtils';

const ModelCleanup = ({ filteredData }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Пороговые значения SupportSize в МБ
  const THRESHOLDS = {
    WARNING: 150,
    CRITICAL: 200,
  };

  // Анализ моделей по SupportSize
  const modelsAnalysis = useMemo(() => {
    const stats = {};

    filteredData.forEach(record => {
      const model = record['Имя файла'];
      const server = record['Сервер'];
      const supportSize = record.supportSize || 0;
      
      if (!model || !server) return;

      const key = `${server}::${model}`;
      
      if (!stats[key]) {
        stats[key] = {
          model,
          server,
          syncCount: 0,
          lastSupportSize: 0,
          lastSync: null,
          users: new Set(),
        };
      }

      stats[key].syncCount += 1;
      
      if (record.parsedDate && (!stats[key].lastSync || record.parsedDate > stats[key].lastSync)) {
        stats[key].lastSync = record.parsedDate;
        stats[key].lastSupportSize = supportSize;
      }

      if (record['User']) stats[key].users.add(record['User']);
    });

    return Object.values(stats)
      .map(stat => {
        const supportSizeMB = parseFloat(bytesToMB(stat.lastSupportSize));
        let status = 'good';
        let statusLabel = 'Норма';

        if (supportSizeMB >= THRESHOLDS.CRITICAL) {
          status = 'critical';
          statusLabel = 'Требует очистки';
        } else if (supportSizeMB >= THRESHOLDS.WARNING) {
          status = 'warning';
          statusLabel = 'Требует внимания';
        }

        return {
          ...stat,
          supportSizeMB,
          status,
          statusLabel,
          usersCount: stat.users.size,
        };
      })
      .sort((a, b) => b.supportSizeMB - a.supportSizeMB);
  }, [filteredData]);

  // Статистика
  const criticalModels = modelsAnalysis.filter(m => m.status === 'critical').length;
  const warningModels = modelsAnalysis.filter(m => m.status === 'warning').length;
  const goodModels = modelsAnalysis.length - criticalModels - warningModels;

  // Пагинация
  const totalPages = Math.ceil(modelsAnalysis.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentModels = modelsAnalysis.slice(startIndex, endIndex);

  // Сброс страницы при изменении itemsPerPage
  const handleItemsPerPageChange = (newValue) => {
    setItemsPerPage(newValue);
    setCurrentPage(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'good': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      {/* Заголовок */}
      <div 
        className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Контроль чистоты моделей
          </h2>
          <div className="flex gap-3 text-xs">
            {criticalModels > 0 && (
              <span className="text-red-600 font-medium">
                {criticalModels} критичных
              </span>
            )}
            {warningModels > 0 && (
              <span className="text-yellow-600 font-medium">
                {warningModels} требуют внимания
              </span>
            )}
            <span className="text-gray-500">
              Всего: {modelsAnalysis.length}
            </span>
          </div>
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
          {/* Компактная статистика */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex gap-8 text-sm">
              <div>
                <span className="text-gray-500">Всего:</span>
                <span className="ml-2 font-semibold text-gray-900">{modelsAnalysis.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Критичных:</span>
                <span className="ml-2 font-semibold text-red-600">{criticalModels}</span>
              </div>
              <div>
                <span className="text-gray-500">Требуют внимания:</span>
                <span className="ml-2 font-semibold text-yellow-600">{warningModels}</span>
              </div>
              <div>
                <span className="text-gray-500">В норме:</span>
                <span className="ml-2 font-semibold text-green-600">{goodModels}</span>
              </div>
            </div>

            {/* Критерии (компактно) */}
            <div className="flex gap-4 text-xs text-gray-500">
              <span>Норма: &lt;150 МБ</span>
              <span>Внимание: 150-199</span>
              <span>Критично: ≥200</span>
            </div>
          </div>

          {/* Управление пагинацией */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">Показывать:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={modelsAnalysis.length}>Все ({modelsAnalysis.length})</option>
              </select>
              <span className="text-gray-500">
                {startIndex + 1}–{Math.min(endIndex, modelsAnalysis.length)} из {modelsAnalysis.length}
              </span>
            </div>

            {/* Навигация по страницам */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                        onClick={() => setCurrentPage(pageNum)}
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
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Вперед
                </button>
              </div>
            )}
          </div>

          {/* Минималистичная таблица */}
          {modelsAnalysis.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Модель
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Сервер
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Support (МБ)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Синхр.
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Польз.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Статус
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentModels.map((model, idx) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                        <div className="truncate">{model.model}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {model.server}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${getStatusColor(model.status)}`}>
                        {model.supportSizeMB}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">
                        {model.syncCount}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">
                        {model.usersCount}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${getStatusColor(model.status)}`}>
                          {model.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              Нет данных о моделях
            </div>
          )}

          {/* Повторная навигация внизу (для удобства) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Назад
              </button>
              
              <span className="text-sm text-gray-600">
                Страница {currentPage} из {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Вперед
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelCleanup;
