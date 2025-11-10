// components/ServersStats.jsx
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { bytesToMB } from '../utils/dataUtils';

const ServersStats = ({ filteredData }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
        // Зоны
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

  // Функция для получения цвета и иконки зоны
  const getZoneStyle = (zone) => {
    switch (zone) {
      case 'green':
        return {
          textColor: 'text-green-700',
          iconColor: 'text-green-600',
          label: 'Оптимально'
        };
      case 'yellow':
        return {
          textColor: 'text-yellow-700',
          iconColor: 'text-yellow-600',
          label: 'Требует внимания'
        };
      case 'red':
        return {
          textColor: 'text-red-700',
          iconColor: 'text-red-600',
          label: 'Критично'
        };
      default:
        return {
          textColor: 'text-gray-700',
          iconColor: 'text-gray-600',
          label: 'Неизвестно'
        };
    }
  };

  // Функция для получения рекомендаций
  const getRecommendations = (zone, stats) => {
    const recommendations = [];
    
    if (zone === 'red') {
      if (stats.usersCount > 70) {
        recommendations.push('КРИТИЧНО: Требуется новый Host сервер - превышен лимит пользователей');
      }
      if (stats.modelsCount > 100) {
        recommendations.push('КРИТИЧНО: Разделите модели на несколько серверов');
      }
      if (stats.avgModelSizeMB > 600) {
        recommendations.push('КРИТИЧНО: Очень большие модели замедляют работу - оптимизируйте их');
      }
      if (stats.totalDataGB > 100) {
        recommendations.push('КРИТИЧНО: Проверьте свободное место на сервере и производительность storage');
      }
    } else if (zone === 'yellow') {
      if (stats.usersCount > 20) {
        recommendations.push('Рекомендуется настроить Accelerator для удаленных офисов');
      }
      if (stats.modelsCount > 60) {
        recommendations.push('Рассмотрите возможность архивирования завершенных проектов');
      }
      if (stats.avgModelSizeMB > 400) {
        recommendations.push('Модели становятся большими - следите за их оптимизацией');
      }
      if (stats.totalDataGB >= 50) {
        recommendations.push('Проверьте доступное место на сервере');
      }
      recommendations.push('Следите за ростом нагрузки на сервер');
    } else {
      recommendations.push('Сервер работает оптимально');
      recommendations.push('Никаких действий не требуется');
    }
    
    return recommendations;
  };

  // Общая статистика
  const totalServers = serversStats.length;
  const criticalServers = serversStats.filter(s => s.overallZone === 'red').length;
  const warningServers = serversStats.filter(s => s.overallZone === 'yellow').length;
  const healthyServers = serversStats.filter(s => s.overallZone === 'green').length;

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div 
        className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Серверная статистика и здоровье
          </h2>
          <div className="flex gap-2 text-sm">
            {criticalServers > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                 {criticalServers} критичных
              </span>
            )}
            {warningServers > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                 {warningServers} требуют внимания
              </span>
            )}
            {healthyServers > 0 && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                 {healthyServers} здоровых
              </span>
            )}
          </div>
        </div>
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
          {/* Легенда зон */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Критерии оценки здоровья сервера</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="font-semibold text-green-800 mb-2"> ЗЕЛЕНАЯ ЗОНА</div>
                <ul className="space-y-1 text-green-700">
                  <li>• Пользователей: ≤ 20</li>
                  <li>• Моделей: ≤ 60</li>
                  <li>• Средний размер: ≤ 400 МБ</li>
                  <li>• Суммарный: &lt; 50 ГБ</li>
                </ul>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="font-semibold text-yellow-800 mb-2"> ЖЕЛТАЯ ЗОНА</div>
                <ul className="space-y-1 text-yellow-700">
                  <li>• Пользователей: 21-70</li>
                  <li>• Моделей: 61-100</li>
                  <li>• Средний размер: 401-600 МБ</li>
                  <li>• Суммарный: 50-100 ГБ</li>
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="font-semibold text-red-800 mb-2"> КРАСНАЯ ЗОНА</div>
                <ul className="space-y-1 text-red-700">
                  <li>• Пользователей: &gt; 70</li>
                  <li>• Моделей: &gt; 100</li>
                  <li>• Средний размер: &gt; 600 МБ</li>
                  <li>• Суммарный: &gt; 100 ГБ</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Детальная информация по каждому серверу */}
          <div className="space-y-6">
            {serversStats.map((server, index) => {
              const overallStyle = getZoneStyle(server.overallZone);
              const recommendations = getRecommendations(server.overallZone, server);
              
              return (
                <div key={index} className={`border ${overallStyle.borderColor} rounded-lg p-5 ${overallStyle.bgColor}`}>
                  {/* Заголовок сервера */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl ${overallStyle.iconColor}`}>{overallStyle.icon}</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{server.server}</h3>
                        <div className={`text-sm font-semibold ${overallStyle.textColor}`}>
                          {overallStyle.label}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>Синхронизаций: <span className="font-semibold">{server.syncCount}</span></div>
                      <div>Последняя активность: <span className="font-semibold">
                        {server.lastActivity ? server.lastActivity.toLocaleDateString('ru-RU') : 'Н/Д'}
                      </span></div>
                    </div>
                  </div>

                  {/* Показатели с зонами */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {/* Пользователи */}
                    <div className={`p-3 rounded-lg border ${getZoneStyle(server.userZone).borderColor} ${getZoneStyle(server.userZone).bgColor}`}>
                      <div className="text-xs text-gray-600 mb-1">Активных пользователей</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{server.usersCount}</span>
                        <span className={`text-xs font-semibold ${getZoneStyle(server.userZone).textColor}`}>
                          / {server.userZone === 'green' ? '20' : server.userZone === 'yellow' ? '70' : '70+'}
                        </span>
                      </div>
                      <div className={`text-xs mt-1 ${getZoneStyle(server.userZone).textColor}`}>
                        {server.userZone === 'green' ? '✓ Норма' : server.userZone === 'yellow' ? 'Близко к лимиту' : ' Превышен лимит'}
                      </div>
                    </div>

                    {/* Модели */}
                    <div className={`p-3 rounded-lg border ${getZoneStyle(server.modelZone).borderColor} ${getZoneStyle(server.modelZone).bgColor}`}>
                      <div className="text-xs text-gray-600 mb-1">Количество моделей</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{server.modelsCount}</span>
                        <span className={`text-xs font-semibold ${getZoneStyle(server.modelZone).textColor}`}>
                          / {server.modelZone === 'green' ? '60' : server.modelZone === 'yellow' ? '100' : '100+'}
                        </span>
                      </div>
                      <div className={`text-xs mt-1 ${getZoneStyle(server.modelZone).textColor}`}>
                        {server.modelZone === 'green' ? '✓ Норма' : server.modelZone === 'yellow' ? 'Много моделей' : 'Критично много'}
                      </div>
                    </div>

                    {/* Средний размер */}
                    <div className={`p-3 rounded-lg border ${getZoneStyle(server.avgSizeZone).borderColor} ${getZoneStyle(server.avgSizeZone).bgColor}`}>
                      <div className="text-xs text-gray-600 mb-1">Средний размер модели</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{server.avgModelSizeMB.toFixed(0)}</span>
                        <span className="text-xs text-gray-600">МБ</span>
                      </div>
                      <div className={`text-xs mt-1 ${getZoneStyle(server.avgSizeZone).textColor}`}>
                        {server.avgSizeZone === 'green' ? '✓ Оптимально' : server.avgSizeZone === 'yellow' ? 'Большие модели' : 'Очень большие'}
                      </div>
                    </div>

                    {/* Суммарный размер */}
                    <div className={`p-3 rounded-lg border ${getZoneStyle(server.totalSizeZone).borderColor} ${getZoneStyle(server.totalSizeZone).bgColor}`}>
                      <div className="text-xs text-gray-600 mb-1">Суммарный размер</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{server.totalDataGB.toFixed(1)}</span>
                        <span className="text-xs text-gray-600">ГБ</span>
                      </div>
                      <div className={`text-xs mt-1 ${getZoneStyle(server.totalSizeZone).textColor}`}>
                        {server.totalSizeZone === 'green' ? '✓ Достаточно места' : server.totalSizeZone === 'yellow' ? 'Проверить место' : ' Мало места'}
                      </div>
                    </div>
                  </div>

                  {/* Рекомендации */}
                  {recommendations.length > 0 && (
                    <div className={`p-3 rounded-lg border ${overallStyle.borderColor} bg-white`}>
                      <div className="font-semibold text-sm text-gray-900 mb-2">Рекомендации:</div>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className={overallStyle.textColor}>•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Общие выводы */}
          {(criticalServers > 0 || warningServers > 0) && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-semibold text-blue-800">Сводка по инфраструктуре</div>
                  <div className="text-sm text-blue-700 mt-1">
                    {criticalServers > 0 && (
                      <p className="mb-2">
                         <strong>{criticalServers} серверов</strong> находятся в критическом состоянии и требуют немедленных действий для предотвращения проблем с производительностью.
                      </p>
                    )}
                    {warningServers > 0 && (
                      <p>
                         <strong>{warningServers} серверов</strong> приближаются к пределу возможностей. Рекомендуется запланировать расширение инфраструктуры.
                      </p>
                    )}
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
