// components/ActiveProjects.jsx
import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  const [sortBy, setSortBy] = useState('syncs'); // 'syncs' | 'users' | 'growth'

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
      case 'growth':
        // Можно добавить логику сортировки по росту
        return sorted.sort((a, b) => b.totalSyncs - a.totalSyncs);
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

  // Компонент плитки проекта
  const ProjectCard = ({ project }) => (
    <div
      onClick={() => {
        setSelectedProject(project.name);
        setSelectedSection(null);
      }}
      className="bg-white border-2 border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-lg transition cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
        <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
          {project.sectionsCount} разделов
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-blue-50 rounded p-2">
          <div className="text-gray-600 text-xs">Синхронизаций</div>
          <div className="text-xl font-bold text-blue-600">{project.totalSyncs}</div>
        </div>
        <div className="bg-green-50 rounded p-2">
          <div className="text-gray-600 text-xs">Пользователей</div>
          <div className="text-xl font-bold text-green-600">{project.usersCount}</div>
        </div>
      </div>
    </div>
  );

  // Компонент плитки раздела
  const SectionCard = ({ section }) => (
    <div
      onClick={() => setSelectedSection(section.name)}
      className="bg-white border-2 border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-lg transition cursor-pointer"
      style={{ borderLeftWidth: '6px', borderLeftColor: SECTION_COLORS[section.name] || '#6b7280' }}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900">{section.name}</h3>
        <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-semibold">
          {section.modelsCount} моделей
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-blue-50 rounded p-2">
          <div className="text-gray-600 text-xs">Синхронизаций</div>
          <div className="text-xl font-bold text-blue-600">{section.totalSyncs}</div>
        </div>
        <div className="bg-green-50 rounded p-2">
          <div className="text-gray-600 text-xs">Пользователей</div>
          <div className="text-xl font-bold text-green-600">{section.usersCount}</div>
        </div>
      </div>
    </div>
  );

  // Компонент плитки модели (детальная)
  const ModelCard = ({ model }) => {
    const growthPercent = model.firstModelSize > 0 
      ? (((model.lastModelSize - model.firstModelSize) / model.firstModelSize) * 100).toFixed(1)
      : 0;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition">
        <div className="mb-4">
          <h4 className="text-md font-bold text-gray-900 mb-1 break-words">{model.name}</h4>
          <div className="text-xs text-gray-500">{model.server}</div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
          <div className="bg-blue-50 rounded p-2">
            <div className="text-gray-600">Синхр.</div>
            <div className="text-lg font-bold text-blue-600">{model.syncCount}</div>
          </div>
          <div className="bg-green-50 rounded p-2">
            <div className="text-gray-600">Польз.</div>
            <div className="text-lg font-bold text-green-600">{model.usersCount}</div>
          </div>
          <div className="bg-purple-50 rounded p-2">
            <div className="text-gray-600">Рост</div>
            <div className={`text-lg font-bold ${parseFloat(growthPercent) > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
              {growthPercent}%
            </div>
          </div>
        </div>

        {/* Размеры модели */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="bg-gray-50 rounded p-2">
            <div className="text-gray-600">Начальный размер</div>
            <div className="font-semibold text-gray-900">{model.firstModelSizeMB} МБ</div>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <div className="text-gray-600">Текущий размер</div>
            <div className="font-semibold text-gray-900">{model.lastModelSizeMB} МБ</div>
          </div>
        </div>

        {/* Мини-график активности */}
        {model.dailySyncsArray.length > 1 && (
          <div className="mt-3">
            <div className="text-xs text-gray-600 mb-1">Активность по дням</div>
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={model.dailySyncsArray}>
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  // Хлебные крошки для навигации
  const Breadcrumbs = () => (
    <div className="flex items-center gap-2 text-sm mb-4">
      <button
        onClick={() => {
          setSelectedProject(null);
          setSelectedSection(null);
        }}
        className="text-blue-600 hover:text-blue-800 font-medium"
      >
        Все проекты
      </button>
      {selectedProject && (
        <>
          <span className="text-gray-400">/</span>
          <button
            onClick={() => setSelectedSection(null)}
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
            📊 Активные проекты
          </h2>
          {!isCollapsed && (
            <span className="text-sm text-gray-500">
              {sortedProjects.length} проектов
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
            // Уровень 1: Проекты
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedProjects.map((project, idx) => (
                <ProjectCard key={idx} project={project} />
              ))}
            </div>
          ) : !selectedSection ? (
            // Уровень 2: Разделы
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sectionsList.map((section, idx) => (
                <SectionCard key={idx} section={section} />
              ))}
            </div>
          ) : (
            // Уровень 3: Модели
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modelsList.map((model, idx) => (
                <ModelCard key={idx} model={model} />
              ))}
            </div>
          )}

          {/* Пустое состояние */}
          {sortedProjects.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Нет данных о проектах в выбранном диапазоне дат
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActiveProjects;
