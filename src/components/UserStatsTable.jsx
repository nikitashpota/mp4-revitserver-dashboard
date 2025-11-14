// components/UserStatsTable.jsx
import React, { useState, useMemo } from 'react';

const UserStatsTable = ({ userStats }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Фильтруем пользователей по введенному тексту
  const filteredStats = useMemo(() => {
    if (!searchText.trim()) {
      return userStats;
    }
    const search = searchText.toLowerCase();
    return userStats.filter(stat => 
      stat.user.toLowerCase().includes(search)
    );
  }, [userStats, searchText]);

  // Статистика по отфильтрованным данным
  const filteredTotalSyncs = filteredStats.reduce((sum, stat) => sum + stat.syncCount, 0);

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div 
        className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer" 
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Статистика по пользователям
          </h2>
          {!isCollapsed && (
            <span className="text-sm text-gray-500">
              ({filteredStats.length} из {userStats.length})
            </span>
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
          {/* Поисковое поле */}
          <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="w-full sm:w-auto flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Поиск по имени (например: АР, КР, Иванов)..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <svg 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchText && (
                  <button
                    onClick={() => setSearchText('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Мини-статистика по отфильтрованным данным */}
            {searchText && filteredStats.length > 0 && (
              <div className="bg-blue-50 px-3 py-2 rounded-lg text-sm">
                <span className="text-gray-600">Синхронизаций: </span>
                <span className="font-semibold text-blue-700">{filteredTotalSyncs}</span>
              </div>
            )}
          </div>

          {/* Подсказка */}
          {searchText && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              💡 Найдено пользователей: <span className="font-semibold">{filteredStats.length}</span>
              {filteredStats.length === 0 && ' - попробуйте другой запрос'}
            </div>
          )}

          {/* Таблица */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Количество синхронизаций
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Уникальных дней работы
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Среднее синхр./день
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStats.length > 0 ? (
                  filteredStats.map((stat, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.user}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {stat.syncCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-semibold text-gray-700">{stat.uniqueDays}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-semibold text-purple-600">{stat.avgSyncsPerDay}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">
                      {searchText ? 'Нет пользователей, соответствующих запросу' : 'Нет данных'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Итоги */}
          {filteredStats.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">
                  Итого {searchText ? `по запросу "${searchText}"` : 'по всем пользователям'}:
                </span>
                <div className="flex gap-6">
                  <span className="text-gray-900">
                    Синхронизаций: <span className="font-bold text-blue-600">{filteredTotalSyncs}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserStatsTable;
