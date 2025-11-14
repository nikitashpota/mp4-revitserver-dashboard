// components/ModelCleanup.jsx
import React, { useMemo, useState } from 'react';
import { bytesToMB } from '../utils/dataUtils';

const ModelCleanup = ({ filteredData }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Пороговые значения SupportSize в МБ
  const THRESHOLDS = {
    WARNING: 150,  // Желтая зона
    CRITICAL: 200, // Красная зона
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
          maxSupportSize: 0,
          lastSync: null,
          users: new Set(),
        };
      }

      stats[key].syncCount += 1;
      
      // Храним максимальный SupportSize
      if (supportSize > stats[key].maxSupportSize) {
        stats[key].maxSupportSize = supportSize;
      }

      if (record.parsedDate && (!stats[key].lastSync || record.parsedDate > stats[key].lastSync)) {
        stats[key].lastSync = record.parsedDate;
      }

      if (record['User']) stats[key].users.add(record['User']);
    });

    return Object.values(stats)
      .map(stat => {
        const supportSizeMB = parseFloat(bytesToMB(stat.maxSupportSize));
        let status = 'good';
        let statusLabel = 'Норма';
        let statusColor = 'green';

        if (supportSizeMB >= THRESHOLDS.CRITICAL) {
          status = 'critical';
          statusLabel = 'Требует очистки';
          statusColor = 'red';
        } else if (supportSizeMB >= THRESHOLDS.WARNING) {
          status = 'warning';
          statusLabel = 'Требует внимания';
          statusColor = 'yellow';
        }

        return {
          ...stat,
          supportSizeMB,
          status,
          statusLabel,
          statusColor,
          usersCount: stat.users.size,
        };
      })
      .filter(stat => stat.status !== 'good') // Показываем только проблемные
      .sort((a, b) => b.supportSizeMB - a.supportSizeMB);
  }, [filteredData]);

  // Статистика по зонам
  const criticalModels = modelsAnalysis.filter(m => m.status === 'critical').length;
  const warningModels = modelsAnalysis.filter(m => m.status === 'warning').length;
  const totalProblematicSyncs = modelsAnalysis.reduce((sum, m) => sum + m.syncCount, 0);

  const getStatusBadge = (status, label) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[status]}`}>
        {label}
      </span>
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
            Очистка моделей (анализ SupportSize)
          </h2>
          {!isCollapsed && (
            <div className="flex gap-2 text-sm">
              {criticalModels > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                  {criticalModels} критичных
                </span>
              )}
              {warningModels > 0 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                  {warningModels} требуют внимания
                </span>
              )}
            </div>
          )}
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
          {/* Пороговые значения и краткая статистика */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Критерии */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Критерии оценки SupportSize</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-700">Норма</span>
                  </div>
                  <span className="font-semibold text-gray-900">&lt; 150 МБ</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-700">Требует внимания</span>
                  </div>
                  <span className="font-semibold text-gray-900">150-199 МБ</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-700">Требует очистки</span>
                  </div>
                  <span className="font-semibold text-gray-900">≥ 200 МБ</span>
                </div>
              </div>
            </div>

            {/* Сводка */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Сводка по проблемным моделям</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Всего проблемных моделей:</span>
                  <span className="font-bold text-gray-900">{modelsAnalysis.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Критичных (≥200 МБ):</span>
                  <span className="font-bold text-red-600">{criticalModels}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Требуют внимания (150-199):</span>
                  <span className="font-bold text-yellow-600">{warningModels}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Синхронизаций всего:</span>
                  <span className="font-bold text-blue-600">{totalProblematicSyncs}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Таблица проблемных моделей */}
          {modelsAnalysis.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Модель
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Сервер
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max SupportSize (МБ)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Синхронизаций
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Пользователей
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Последняя синхронизация
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {modelsAnalysis.map((model, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-gray-50 ${
                        model.status === 'critical' ? 'bg-red-50' : 
                        model.status === 'warning' ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(model.status, model.statusLabel)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="font-medium truncate">{model.model}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {model.server}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-bold ${
                          model.status === 'critical' ? 'text-red-700' : 
                          model.status === 'warning' ? 'text-yellow-700' : 'text-gray-900'
                        }`}>
                          {model.supportSizeMB}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {model.syncCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {model.usersCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {model.lastSync ? model.lastSync.toLocaleDateString('ru-RU') : 'Н/Д'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
              <div className="text-green-600 text-lg font-semibold mb-2">
                Все модели в норме!
              </div>
              <div className="text-green-700 text-sm">
                Нет моделей с SupportSize ≥ 150 МБ
              </div>
            </div>
          )}

          {/* Рекомендации */}
          {modelsAnalysis.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-semibold text-blue-800 mb-2">Рекомендации по очистке</div>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Удалите неиспользуемые семейства и виды</li>
                    <li>• Очистите неиспользуемые импортированные CAD-файлы</li>
                    <li>• Выполните аудит модели и исправьте ошибки</li>
                    <li>• Удалите неиспользуемые предупреждения и элементы</li>
                    <li>• Рассмотрите возможность разделения больших моделей на части</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelCleanup;
