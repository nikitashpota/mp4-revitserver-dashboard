// components/ServersStats.jsx
import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { bytesToMB } from '../utils/dataUtils';

// Функция для получения номера недели в году
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

// Функция для получения даты понедельника по номеру недели
const getMondayFromWeek = (weekKey) => {
  const [year, week] = weekKey.split('-W');
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
};

// Функция для форматирования даты понедельника
const formatWeekLabel = (weekKey) => {
  const monday = getMondayFromWeek(weekKey);
  const day = monday.getDate().toString().padStart(2, '0');
  const month = (monday.getMonth() + 1).toString().padStart(2, '0');
  const year = monday.getFullYear();
  return `${day}.${month}.${year}`;
};

const ServersStats = ({ filteredData }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showGraphs, setShowGraphs] = useState(true);
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

  // НОВОЕ: Данные для графиков активности по неделям для каждого сервера
  const weeklyActivityByServer = useMemo(() => {
    const serverWeeks = {};

    filteredData.forEach(record => {
      const server = record['Сервер'];
      const model = record['Имя файла'];
      const user = record['User'];
      const date = record.parsedDate;

      if (!server || !date) return;

      const weekKey = getWeekNumber(date);

      if (!serverWeeks[server]) {
        serverWeeks[server] = {};
      }

      if (!serverWeeks[server][weekKey]) {
        serverWeeks[server][weekKey] = {
          weekKey,
          models: new Set(),
          users: new Set(),
        };
      }

      if (model) serverWeeks[server][weekKey].models.add(model);
      if (user) serverWeeks[server][weekKey].users.add(user);
    });

    // Преобразуем в массивы для графиков
    const result = {};
    Object.entries(serverWeeks).forEach(([server, weeks]) => {
      result[server] = Object.values(weeks)
        .map(week => ({
          week: week.weekKey,
          weekLabel: formatWeekLabel(week.weekKey),
          activeModels: week.models.size,
          activeUsers: week.users.size,
        }))
        .sort((a, b) => a.week.localeCompare(b.week));
    });

    return result;
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

  // НОВОЕ: Компонент графика активности для сервера
  const ServerActivityChart = ({ serverName, data }) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400 text-sm">
          Недостаточно данных для построения графика
        </div>
      );
    }

    const CustomTooltip = ({ active, payload }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2">
            <p className="text-xs font-medium text-gray-900 mb-1">
              Неделя с {payload[0].payload.weekLabel}
            </p>
            <p className="text-xs text-blue-600 font-semibold">
              Модели: {payload[0].value}
            </p>
            <p className="text-xs text-green-600 font-semibold">
              Пользователи: {payload[1].value}
            </p>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">
          Динамика активности: {serverName}
        </h4>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="weekLabel" 
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) => {
                if (value === 'activeModels') return 'Активные модели';
                if (value === 'activeUsers') return 'Активные пользователи';
                return value;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="activeModels" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="activeUsers" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
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

          {/* НОВОЕ: Кнопка переключения графиков */}
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-md font-semibold text-gray-900">Обзор серверов</h3>
            <button
              onClick={() => setShowGraphs(!showGraphs)}
              className="w-44 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              {showGraphs ? 'Скрыть активность' : 'Показать активность'}
            </button>
          </div>

          {/* НОВОЕ: Графики активности по неделям */}
          {showGraphs && (
            <div className="mb-8 space-y-4">
              <h3 className="text-md font-semibold text-gray-900 mb-4">
                Недельная динамика активности
              </h3>
              {serversStats.map((server, idx) => (
                <ServerActivityChart 
                  key={idx}
                  serverName={server.server}
                  data={weeklyActivityByServer[server.server] || []}
                />
              ))}
            </div>
          )}

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
