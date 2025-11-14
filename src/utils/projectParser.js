// utils/projectParser.js

/**
 * Парсит название модели по шаблону: МП4_ШКОЛ_МИНС_БФ_R23.rvt
 * @param {string} filename - название файла модели
 * @returns {object} - объект с полями: organization, objectType, project, section
 */
export const parseModelName = (filename) => {
  if (!filename) return null;

  // Убираем расширение
  const nameWithoutExt = filename.replace(/\.(rvt|RVT)$/, '');
  
  // Разбиваем по подчеркиванию или пробелу
  const parts = nameWithoutExt.split(/[_\s]+/).filter(p => p.trim());
  
  if (parts.length < 3) {
    return {
      organization: parts[0] || 'Неизвестно',
      objectType: parts[1] || 'Неизвестно',
      project: parts[2] || nameWithoutExt,
      section: extractSection(nameWithoutExt),
      full: nameWithoutExt,
    };
  }

  return {
    organization: parts[0],       // МП4
    objectType: parts[1],          // ШКОЛ
    project: parts[2],             // МИНС
    section: extractSection(nameWithoutExt), // АР, КР и т.д.
    full: nameWithoutExt,
  };
};

/**
 * Извлекает раздел (АР, КР и т.д.) из названия модели
 */
export const extractSection = (filename) => {
  if (!filename) return 'Прочее';
  
  const upper = filename.toUpperCase();

  // Проверяем различные варианты обозначений разделов
  if (/[_\s]АР[\d.]*[_\s]?/i.test(upper) || /[_\s]AR[\d.]*[_\s]?/i.test(upper))
    return 'АР';
  if (/[_\s]АИ[\d.]*[_\s]?/i.test(upper) || /[_\s]AI[\d.]*[_\s]?/i.test(upper))
    return 'АИ';
  if (
    /[_\s]КР[\d.]*[_\s]?/i.test(upper) ||
    /[_\s]КЖ[\d.]*[_\s]?/i.test(upper) ||
    /[_\s]КМ[\d.]*[_\s]?/i.test(upper)
  )
    return 'КР';
  if (/[_\s]ОВ[\d.]*[_\s]?/i.test(upper) || /[_\s]OV[\d.]*[_\s]?/i.test(upper))
    return 'ОВ';
  if (/[_\s]ВК[\d.]*[_\s]?/i.test(upper) || /[_\s]VK[\d.]*[_\s]?/i.test(upper))
    return 'ВК';
  if (
    /[_\s]ЭМ[\d.]*[_\s]?/i.test(upper) ||
    /[_\s]ЭО[\d.]*[_\s]?/i.test(upper) ||
    /[_\s]EM[\d.]*[_\s]?/i.test(upper)
  )
    return 'ЭОМ';
  if (/[_\s]ГП[\d.]*[_\s]?/i.test(upper) || /[_\s]GP[\d.]*[_\s]?/i.test(upper))
    return 'ГП';

  return 'Прочее';
};

/**
 * Группирует данные по проектам
 */
export const groupByProjects = (data) => {
  const projects = {};

  data.forEach(record => {
    const parsed = parseModelName(record['Имя файла']);
    if (!parsed) return;

    const projectKey = parsed.project;
    if (!projects[projectKey]) {
      projects[projectKey] = {
        name: projectKey,
        sections: {},
        totalSyncs: 0,
        users: new Set(),
      };
    }

    projects[projectKey].totalSyncs += 1;
    if (record['User']) projects[projectKey].users.add(record['User']);

    // Группируем по разделам внутри проекта
    const sectionKey = parsed.section;
    if (!projects[projectKey].sections[sectionKey]) {
      projects[projectKey].sections[sectionKey] = {
        name: sectionKey,
        models: {},
        totalSyncs: 0,
        users: new Set(),
      };
    }

    projects[projectKey].sections[sectionKey].totalSyncs += 1;
    if (record['User']) projects[projectKey].sections[sectionKey].users.add(record['User']);

    // Группируем модели внутри раздела
    const modelKey = record['Имя файла'];
    if (!projects[projectKey].sections[sectionKey].models[modelKey]) {
      projects[projectKey].sections[sectionKey].models[modelKey] = {
        name: modelKey,
        server: record['Сервер'],
        syncCount: 0,
        users: new Set(),
        firstModelSize: null,
        lastModelSize: null,
        firstSyncDate: null,
        lastSyncDate: null,
        dailySyncs: {},
      };
    }

    const model = projects[projectKey].sections[sectionKey].models[modelKey];
    model.syncCount += 1;
    if (record['User']) model.users.add(record['User']);

    // Отслеживаем первый и последний размер модели
    if (record.parsedDate) {
      if (!model.firstSyncDate || record.parsedDate < model.firstSyncDate) {
        model.firstSyncDate = record.parsedDate;
        model.firstModelSize = record.modelSize || 0;
      }
      if (!model.lastSyncDate || record.parsedDate > model.lastSyncDate) {
        model.lastSyncDate = record.parsedDate;
        model.lastModelSize = record.modelSize || 0;
      }

      // Группируем синхронизации по дням
      const dateKey = record.parsedDate.toLocaleDateString('ru-RU');
      if (!model.dailySyncs[dateKey]) {
        model.dailySyncs[dateKey] = 0;
      }
      model.dailySyncs[dateKey] += 1;
    }
  });

  return projects;
};
