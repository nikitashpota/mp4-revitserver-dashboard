// components/UserStatsTable.jsx
import React, { useState, useMemo } from 'react';

const UserStatsTable = ({ userStats, filteredData }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [modelsPage, setModelsPage] = useState(1);
  const itemsPerPage = 12;
  const modelsPerPage = 10;

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

  // Статистика по моделям для выбранного пользователя
  const userModelsStats = useMemo(() => {
    if (!selectedUser || !filteredData) return [];

    const modelsMap = {};

    filteredData.forEach(record => {
      if (record['User'] !== selectedUser) return;

      const model = record['Имя файла'];
      const server = record['Сервер'];
      if (!model) return;

      const key = `${server}::${model}`;
      
      if (!modelsMap[key]) {
        modelsMap[key] = {
          model,
          server,
          syncCount: 0,
          lastSync: null,
          days: new Set(),
        };
      }

      modelsMap[key].syncCount += 1;
      
      if (record.parsedDate) {
        const dateKey = record.parsedDate.toLocaleDateString('ru-RU');
        modelsMap[key].days.add(dateKey);
        
        if (!modelsMap[key].lastSync || record.parsedDate > modelsMap[key].lastSync) {
          modelsMap[key].lastSync = record.parsedDate;
        }
      }
    });

    return Object.values(modelsMap)
      .map(stat => ({
        ...stat,
        uniqueDays: stat.days.size,
        avgSyncsPerDay: stat.days.size > 0 
          ? (stat.syncCount / stat.days.size).toFixed(1)
          : '0.0',
      }))
      .sort((a, b) => b.syncCount - a.syncCount);
  }, [selectedUser, filteredData]);

  // Пагинация пользователей
  const totalPages = Math.ceil(filteredStats.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentUsers = filteredStats.slice(startIndex, startIndex + itemsPerPage);

  // Пагинация моделей
  const modelsTotalPages = Math.ceil(userModelsStats.length / modelsPerPage);
  const modelsStartIndex = (modelsPage - 1) * modelsPerPage;
  const currentModels = userModelsStats.slice(modelsStartIndex, modelsStartIndex + modelsPerPage);

  // Сброс пагинации при поиске
  const handleSearchChange = (text) => {
    setSearchText(text);
    setCurrentPage(1);
  };

  // Обработчик выбора пользователя
  const handleUserClick = (userName) => {
    if (selectedUser === userName) {
      setSelectedUser(null);
    } else {
      setSelectedUser(userName);
      setModelsPage(1);
    }
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
  };

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

  // Компонент карточки пользователя (минималистичный)
  const UserCard = ({ user, isActive }) => (
    <div
      onClick={() => handleUserClick(user.user)}
      className={`bg-white border rounded-lg p-4 hover:shadow-md transition cursor-pointer ${
        isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{user.user}</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-xs text-gray-500">Синхр.</div>
          <div className="text-lg font-semibold text-gray-900">{user.syncCount}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Дней</div>
          <div className="text-lg font-semibold text-gray-900">{user.uniqueDays}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Среднее</div>
          <div className="text-lg font-semibold text-blue-600">{user.avgSyncsPerDay}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div 
        className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer" 
        onClick={() => !selectedUser && setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Статистика по пользователям
          </h2>
          {!isCollapsed && !selectedUser && (
            <span className="text-sm text-gray-500">
              {filteredStats.length} пользователей
            </span>
          )}
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
          {!selectedUser ? (
            <>
              {/* Поисковое поле */}
              <div className="mb-6">
                <div className="relative max-w-md">
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Поиск по имени..."
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
                      onClick={() => handleSearchChange('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Карточки пользователей */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentUsers.map((user, idx) => (
                  <UserCard key={idx} user={user} isActive={false} />
                ))}
              </div>

              {/* Пагинация */}
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
              />

              {/* Пустое состояние */}
              {filteredStats.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  {searchText ? 'Нет пользователей, соответствующих запросу' : 'Нет данных о пользователях'}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Хлебные крошки */}
              <div className="mb-6">
                <button
                  onClick={handleBackToUsers}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Все пользователи
                </button>
              </div>

              {/* Информация о пользователе */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-3">{selectedUser}</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Всего синхронизаций</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {userStats.find(u => u.user === selectedUser)?.syncCount || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Уникальных дней</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {userStats.find(u => u.user === selectedUser)?.uniqueDays || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Моделей</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {userModelsStats.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Таблица моделей */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-900">
                    Модели пользователя
                  </h4>
                  <div className="text-sm text-gray-500">
                    {modelsStartIndex + 1}–{Math.min(modelsStartIndex + modelsPerPage, userModelsStats.length)} из {userModelsStats.length}
                  </div>
                </div>

                {userModelsStats.length > 0 ? (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Модель</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сервер</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Синхр.</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Дней</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Среднее/день</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Последняя</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {currentModels.map((model, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {modelsStartIndex + idx + 1}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                                <div className="truncate font-medium">{model.model}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {model.server}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {model.syncCount}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-center font-semibold">
                                {model.uniqueDays}
                              </td>
                              <td className="px-4 py-3 text-sm text-purple-600 text-center font-semibold">
                                {model.avgSyncsPerDay}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {model.lastSync ? model.lastSync.toLocaleDateString('ru-RU') : 'Н/Д'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <Pagination 
                      currentPage={modelsPage} 
                      totalPages={modelsTotalPages} 
                      onPageChange={setModelsPage} 
                    />
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    Нет данных о моделях для этого пользователя
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default UserStatsTable;