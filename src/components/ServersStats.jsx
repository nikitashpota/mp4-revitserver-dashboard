// components/ServersStats.jsx
import React, { useMemo, useState } from 'react';
import { bytesToMB } from '../utils/dataUtils';

const ServersStats = ({ filteredData }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // 3 колонки × 4 ряда

  // Определение зон для каждого показателя
  const getZone = (metric, value) => {
    switch (metric) {
      case 'users':
        if (value <= 20) return 'green';
        if (value <= 70) return 'yellow';
        return 'red';
      
      case 'models':
        if (value <= 60) return 'green';
        if (value <= 100) return 'yellow';
        return 'red';
      
      case 'avgSize':
        if (value <= 400) return 'green';
        if (value <= 600) return 'yellow';
        return 'red';
      
      case 'totalSize':
        if (value < 50) return 'green';
        if (value <= 100) return 'yellow';
        return 'red';
      
      default:
        return 'green';
    }
  };

  // Определение общей зоны по худшему показателю
  const getOverallZone = (zones) => {
    if (zones.includes('red')) return 'red';
    if (zones.includes('yellow')) return 'yellow';
    return 'green';
  };

  // Статистика по серверам с зонами здоровья
  const serversStats = useMemo(() => {
    // Сначала собираем последний размер для каждой модели
    const modelStats = {};
    
    filteredData.forEach(record => {
      const server = record['Сервер'];
      const model = record['Имя файла'];
      if (!server || !model) return;
      
      const modelKey = `${server}::${model}`;
      
      if (!modelStats[modelKey]) {
        modelStats[modelKey] = {
          server,
          model,
          lastModelSize: 0,
          lastSync: null,
        };
      }
      
      // Берем последнее значение ModelSize
      if (record.parsedDate && (!modelStats[modelKey].lastSync || record.parsedDate > modelStats[modelKey].lastSync)) {
        modelStats[modelKey].lastSync = record.parsedDate;
        modelStats[modelKey].lastModelSize = record.modelSize || 0;
      }
    });
    
    // Теперь группируем по серверам
    const stats = {};
    
    filteredData.forEach(record => {
      const server = record['Сервер'];
      if (!server) return;
      
      if (!stats[server]) {
        stats[server] = {
          server,
          syncCount: 0,
          totalModelSizeBytes: 0,
          models: new Set(),
          users: new Set(),
          lastActivity: null
        };
      }
      
      stats[server].syncCount += 1;
      
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
    
    // Суммируем последние размеры моделей для каждого сервера
    Object.values(modelStats).forEach(modelStat => {
      if (stats[modelStat.server]) {
        stats[modelStat.server].totalModelSizeBytes += modelStat.lastModelSize;
      }
    });
    
    return Object.values(stats).map(stat => {
      const usersCount = stat.users.size;
      const modelsCount = stat.models.size;
      const totalDataMB = parseFloat(bytesToMB(stat.totalModelSizeBytes));
      const totalDataGB = totalDataMB / 1024;
      const avgModelSizeMB = modelsCount > 0 ? totalDataMB / modelsCount : 0;
      
      // Определяем зоны для каждого показателя
      const userZone = getZone('users', usersCount);
      const modelZone = getZone('models', modelsCount);
      const avgSizeZone = getZone('avgSize', avgModelSizeMB);
      const totalSizeZone = getZone('totalSize', totalDataGB);
      
      // Определяем общую зону (худший показатель)
      const overallZone = getOverallZone([userZone, modelZone, avgSizeZone, totalSizeZone]);
      
      return {
        ...stat,
        totalDataMB,
        totalDataGB,
        modelsCount,
        usersCount,
        avgModelSizeMB,
        userZone,
        modelZone,
        avgSizeZone,
        totalSizeZone,
        overallZone
      };
    }).sort((a, b) => {
      // Сортируем: сначала красные, потом желтые, потом зеленые
      const zoneOrder = { red: 0, yellow: 1, green: 2 };
      return zoneOrder[a.overallZone] - zoneOrder[b.overallZone];
    });
  }, [filteredData]);

  // Общая статистика
  const criticalServers = serversStats.filter(s => s.overallZone === 'red').length;
  const warningServers = serversStats.filter(s => s.overallZone === 'yellow').length;
  const healthyServers = serversStats.filter(s => s.overallZone === 'green').length;

  // Функция для получения цвета зоны
  const getZoneColor = (zone) => {
    switch (zone) {
      case 'green': return '#10b981';
      case 'yellow': return '#f59e0b';
      case 'red': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getZoneLabel = (zone) => {
    switch (zone) {
      case 'green': return 'Оптимально';
      case 'yellow': return 'Внимание';
      case 'red': return 'Критично';
      default: return 'Неизвестно';
    }
  };

  // Пагинация
  const totalPages = Math.ceil(serversStats.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentServers = serversStats.slice(startIndex, startIndex + itemsPerPage);

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

  // Компонент карточки сервера (минималистичный)
  const ServerCard = ({ server }) => {
    const criticalMetrics = [
      server.userZone === 'red' && 'Пользователи',
      server.modelZone === 'red' && 'Модели',
      server.avgSizeZone === 'red' && 'Размер',
      server.totalSizeZone === 'red' && 'Объём'
    ].filter(Boolean);

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
        {/* Заголовок с индикатором */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getZoneColor(server.overallZone) }}
              />
              <h3 className="text-base font-semibold text-gray-900">{server.server}</h3>
            </div>
            <div className="text-xs" style={{ color: getZoneColor(server.overallZone) }}>
              {getZoneLabel(server.overallZone)}
            </div>
          </div>
        </div>

        {/* Основные метрики (компактно) */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Пользователи */}
          <div>
            <div className="text-xs text-gray-500">Пользователей</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-gray-900">{server.usersCount}</span>
              <span className="text-xs text-gray-400">/ 70</span>
            </div>
          </div>

          {/* Модели */}
          <div>
            <div className="text-xs text-gray-500">Моделей</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-gray-900">{server.modelsCount}</span>
              <span className="text-xs text-gray-400">/ 100</span>
            </div>
          </div>

          {/* Средний размер */}
          <div>
            <div className="text-xs text-gray-500">Средний</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-gray-900">{server.avgModelSizeMB.toFixed(0)}</span>
              <span className="text-xs text-gray-400">МБ</span>
            </div>
          </div>

          {/* Суммарный */}
          <div>
            <div className="text-xs text-gray-500">Всего</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-gray-900">{server.totalDataGB.toFixed(1)}</span>
              <span className="text-xs text-gray-400">ГБ</span>
            </div>
          </div>
        </div>

        {/* Критические метрики (если есть) */}
        {criticalMetrics.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <div className="text-xs text-red-600 font-medium mb-1">
              ⚠ Критично:
            </div>
            <div className="text-xs text-gray-700">
              {criticalMetrics.join(', ')}
            </div>
          </div>
        )}

        {/* Последняя активность */}
        <div className="pt-3 border-t border-gray-100 mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Синхр.: {server.syncCount}</span>
            <span>{server.lastActivity ? server.lastActivity.toLocaleDateString('ru-RU') : 'Н/Д'}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div 
        className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Серверная статистика
          </h2>
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
          {/* Компактная легенда критериев */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-semibold text-gray-900 mb-3">Критерии оценки</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"/>
                <div>
                  <span className="font-medium">Зелёная зона:</span> ≤20 польз., ≤60 моделей, ≤400 МБ, &lt;50 ГБ
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"/>
                <div>
                  <span className="font-medium">Жёлтая зона:</span> 21-70 польз., 61-100 моделей, 401-600 МБ, 50-100 ГБ
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"/>
                <div>
                  <span className="font-medium">Красная зона:</span> &gt;70 польз., &gt;100 моделей, &gt;600 МБ, &gt;100 ГБ
                </div>
              </div>
            </div>
          </div>

          {/* Плитки серверов */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentServers.map((server, idx) => (
              <ServerCard key={idx} server={server} />
            ))}
          </div>

          {/* Пагинация */}
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
          />

          {/* Пустое состояние */}
          {serversStats.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Нет данных о серверах в выбранном диапазоне дат
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServersStats;