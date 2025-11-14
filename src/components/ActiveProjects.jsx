// components/ActiveProjects.jsx
import React, { useMemo, useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { bytesToMB } from '../utils/dataUtils';
import { groupByProjects } from '../utils/projectParser';

const SECTION_COLORS = {
  'АР': '#3b82f6',
  'АИ': '#0e3573ff',
  'КР': '#10b981',
  'ОВ': '#8b5cf6',
  'ВК': '#f59e0b',
  'ЭОМ': '#ec4899',
  'ГП': '#06b6d4',
  'Прочее': '#6b7280',
};

const ActiveProjects = ({ filteredData }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sortBy, setSortBy] = useState('syncs');
  
  // Пагинация для каждого уровня
  const [projectsPage, setProjectsPage] = useState(1);
  const [sectionsPage, setSectionsPage] = useState(1);
  const [modelsPage, setModelsPage] = useState(1);
  const itemsPerPage = 12; // 3 колонки × 4 ряда

  // Группируем данные по проектам
  const projectsData = useMemo(() => {
    return groupByProjects(filteredData);
  }, [filteredData]);

  // Преобразуем в массив для сортировки
  const projectsList = useMemo(() => {
    return Object.values(projectsData).map(project => ({
      ...project,
      usersCount: project.users.size,
      sectionsCount: Object.keys(project.sections).length,
    }));
  }, [projectsData]);

  // Сортировка проектов
  const sortedProjects = useMemo(() => {
    const sorted = [...projectsList];
    switch (sortBy) {
      case 'syncs':
        return sorted.sort((a, b) => b.totalSyncs - a.totalSyncs);
      case 'users':
        return sorted.sort((a, b) => b.usersCount - a.usersCount);
      default:
        return sorted;
    }
  }, [projectsList, sortBy]);

  // Получаем список разделов выбранного проекта
  const sectionsList = useMemo(() => {
    if (!selectedProject || !projectsData[selectedProject]) return [];
    
    return Object.values(projectsData[selectedProject].sections).map(section => ({
      ...section,
      usersCount: section.users.size,
      modelsCount: Object.keys(section.models).length,
    })).sort((a, b) => b.totalSyncs - a.totalSyncs);
  }, [selectedProject, projectsData]);

  // Получаем список моделей выбранного раздела
  const modelsList = useMemo(() => {
    if (!selectedProject || !selectedSection || !projectsData[selectedProject]?.sections[selectedSection]) {
      return [];
    }
    
    return Object.values(projectsData[selectedProject].sections[selectedSection].models).map(model => ({
      ...model,
      usersCount: model.users.size,
      firstModelSizeMB: bytesToMB(model.firstModelSize || 0),
      lastModelSizeMB: bytesToMB(model.lastModelSize || 0),
      growthMB: bytesToMB((model.lastModelSize || 0) - (model.firstModelSize || 0)),
      dailySyncsArray: Object.entries(model.dailySyncs).map(([date, count]) => ({
        date,
        count,
      })).sort((a, b) => {
        const dateA = new Date(a.date.split('.').reverse().join('-'));
        const dateB = new Date(b.date.split('.').reverse().join('-'));
        return dateA - dateB;
      }),
    })).sort((a, b) => b.syncCount - a.syncCount);
  }, [selectedProject, selectedSection, projectsData]);

  // Пагинация для проектов
  const projectsTotalPages = Math.ceil(sortedProjects.length / itemsPerPage);
  const projectsStartIndex = (projectsPage - 1) * itemsPerPage;
  const currentProjects = sortedProjects.slice(projectsStartIndex, projectsStartIndex + itemsPerPage);

  // Пагинация для разделов
  const sectionsTotalPages = Math.ceil(sectionsList.length / itemsPerPage);
  const sectionsStartIndex = (sectionsPage - 1) * itemsPerPage;
  const currentSections = sectionsList.slice(sectionsStartIndex, sectionsStartIndex + itemsPerPage);

  // Пагинация для моделей
  const modelsTotalPages = Math.ceil(modelsList.length / itemsPerPage);
  const modelsStartIndex = (modelsPage - 1) * itemsPerPage;
  const currentModels = modelsList.slice(modelsStartIndex, modelsStartIndex + itemsPerPage);

  // Сброс пагинации при переходе между уровнями
  const handleProjectClick = (projectName) => {
    setSelectedProject(projectName);
    setSelectedSection(null);
    setSectionsPage(1);
    setModelsPage(1);
  };

  const handleSectionClick = (sectionName) => {
    setSelectedSection(sectionName);
    setModelsPage(1);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setSelectedSection(null);
    setProjectsPage(1);
  };

  const handleBackToSections = () => {
    setSelectedSection(null);
    setSectionsPage(1);
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

  // Компонент плитки проекта (минималистичная)
  const ProjectCard = ({ project }) => (
    <div
      onClick={() => handleProjectClick(project.name)}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition cursor-pointer"
    >
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{project.name}</h3>
        <div className="text-xs text-gray-500">{project.sectionsCount} разделов</div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-xs text-gray-500">Синхронизаций</div>
          <div className="text-lg font-semibold text-gray-900">{project.totalSyncs}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Пользователей</div>
          <div className="text-lg font-semibold text-gray-900">{project.usersCount}</div>
        </div>
      </div>
    </div>
  );

  // Компонент плитки раздела (минималистичная с цветной меткой)
  const SectionCard = ({ section }) => (
    <div
      onClick={() => handleSectionClick(section.name)}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition cursor-pointer"
    >
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: SECTION_COLORS[section.name] || '#6b7280' }}
          />
          <h3 className="text-base font-semibold text-gray-900">{section.name}</h3>
        </div>
        <div className="text-xs text-gray-500">{section.modelsCount} моделей</div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-xs text-gray-500">Синхронизаций</div>
          <div className="text-lg font-semibold text-gray-900">{section.totalSyncs}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Пользователей</div>
          <div className="text-lg font-semibold text-gray-900">{section.usersCount}</div>
        </div>
      </div>
    </div>
  );

  // Компонент плитки модели (минималистичная)
  const ModelCard = ({ model }) => {
    const growthPercent = model.firstModelSize > 0 
      ? (((model.lastModelSize - model.firstModelSize) / model.firstModelSize) * 100).toFixed(1)
      : 0;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-900 mb-1 break-words line-clamp-2">{model.name}</h4>
          <div className="text-xs text-gray-500">{model.server}</div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <div>
            <div className="text-gray-500">Синхр.</div>
            <div className="text-base font-semibold text-gray-900">{model.syncCount}</div>
          </div>
          <div>
            <div className="text-gray-500">Польз.</div>
            <div className="text-base font-semibold text-gray-900">{model.usersCount}</div>
          </div>
          <div>
            <div className="text-gray-500">Рост</div>
            <div className={`text-base font-semibold ${parseFloat(growthPercent) > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              {growthPercent}%
            </div>
          </div>
        </div>

        {/* Размеры модели */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs border-t border-gray-100 pt-3">
          <div>
            <div className="text-gray-500">Начальный</div>
            <div className="font-semibold text-gray-900">{model.firstModelSizeMB} МБ</div>
          </div>
          <div>
            <div className="text-gray-500">Текущий</div>
            <div className="font-semibold text-gray-900">{model.lastModelSizeMB} МБ</div>
          </div>
        </div>

        {/* Мини-график активности */}
        {model.dailySyncsArray.length > 1 && (
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs text-gray-500 mb-2">Активность</div>
            <ResponsiveContainer width="100%" height={50}>
              <LineChart data={model.dailySyncsArray}>
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  // Хлебные крошки
  const Breadcrumbs = () => (
    <div className="flex items-center gap-2 text-sm mb-4">
      <button
        onClick={handleBackToProjects}
        className="text-blue-600 hover:text-blue-800 font-medium"
      >
        Все проекты
      </button>
      {selectedProject && (
        <>
          <span className="text-gray-400">/</span>
          <button
            onClick={handleBackToSections}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {selectedProject}
          </button>
        </>
      )}
      {selectedSection && (
        <>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">{selectedSection}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div 
        className="px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Активные проекты
          </h2>
          {!isCollapsed && (
            <span className="text-sm text-gray-500">
              {sortedProjects.length} проектов
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
          <Breadcrumbs />

          {/* Сортировка (только на уровне проектов) */}
          {!selectedProject && (
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setSortBy('syncs')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  sortBy === 'syncs' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                По активности
              </button>
              <button
                onClick={() => setSortBy('users')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  sortBy === 'users' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                По пользователям
              </button>
            </div>
          )}

          {/* Отображение плиток в зависимости от уровня */}
          {!selectedProject ? (
            <>
              {/* Уровень 1: Проекты */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentProjects.map((project, idx) => (
                  <ProjectCard key={idx} project={project} />
                ))}
              </div>
              <Pagination 
                currentPage={projectsPage} 
                totalPages={projectsTotalPages} 
                onPageChange={setProjectsPage} 
              />
            </>
          ) : !selectedSection ? (
            <>
              {/* Уровень 2: Разделы */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentSections.map((section, idx) => (
                  <SectionCard key={idx} section={section} />
                ))}
              </div>
              <Pagination 
                currentPage={sectionsPage} 
                totalPages={sectionsTotalPages} 
                onPageChange={setSectionsPage} 
              />
            </>
          ) : (
            <>
              {/* Уровень 3: Модели */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentModels.map((model, idx) => (
                  <ModelCard key={idx} model={model} />
                ))}
              </div>
              <Pagination 
                currentPage={modelsPage} 
                totalPages={modelsTotalPages} 
                onPageChange={setModelsPage} 
              />
            </>
          )}

          {/* Пустое состояние */}
          {sortedProjects.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Нет данных о проектах в выбранном диапазоне дат
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActiveProjects;
