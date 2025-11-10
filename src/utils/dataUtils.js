// utils/dataUtils.js
// VERSION: 6.0 – Поддержка SupportSize И ModelSize (байты)

console.log('dataUtils.js v6.0 – SupportSize + ModelSize (байты)');

/**
 * Bytes → MB
 */
export const bytesToMB = (bytes) => {
  return ((bytes || 0) / (1024 * 1024)).toFixed(2);
};

/**
 * Парсинг даты
 */
export const parseDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const months = {
      января: 0, февраля: 1, марта: 2, апреля: 3,
      мая: 4, июня: 5, июля: 6, августа: 7,
      сентября: 8, октября: 9, ноября: 10, декабря: 11,
    };
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length < 4) return null;

    const day = parseInt(parts[0], 10);
    const monthName = parts[1].toLowerCase();
    const year = parseInt(parts[2], 10);
    const month = months[monthName];
    if (isNaN(day) || isNaN(year) || month === undefined) return null;

    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  } catch (e) {
    console.warn('parseDate error:', dateStr, e);
    return null;
  }
};

export const formatDateForInput = (date) => {
  return date && !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : '';
};

/**
 * Парсинг TSV
 */
export const parseTSVData = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  if (!lines.length) return [];

  const headers = lines[0].split('\t').map(h => h.trim());
  const data = lines.slice(1).map(line => {
    const vals = line.split('\t');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] || '').trim();
    });
    return obj;
  });

  console.log(`Parsed ${data.length} rows, headers:`, headers);
  return data;
};

/**
 * Обработка: SupportSize и ModelSize (байты) — с логированием
 */
export const processData = (rawData) => {
  console.log('processData – extracting SupportSize and ModelSize (байты)');

  const processed = rawData.map((record, idx) => {
    // Извлекаем SupportSize
    let supportSize = 0;
    const supportSizeKeys = [
      'SupportSize (байты)',
      'SupportSize  (байты)',
      'SupportSize(байты)',
    ];

    for (const key of supportSizeKeys) {
      if (record.hasOwnProperty(key)) {
        supportSize = parseInt(record[key], 10) || 0;
        if (idx === 0) console.log(`Found SupportSize in column: "${key}" → ${supportSize} bytes`);
        break;
      }
    }

    // Извлекаем ModelSize
    let modelSize = 0;
    const modelSizeKeys = [
      'ModelSize (байты)',
      'ModelSize  (байты)',
      'ModelSize(байты)',
    ];

    for (const key of modelSizeKeys) {
      if (record.hasOwnProperty(key)) {
        modelSize = parseInt(record[key], 10) || 0;
        if (idx === 0) console.log(`Found ModelSize in column: "${key}" → ${modelSize} bytes`);
        break;
      }
    }

    if (idx === 0) {
      if (supportSize === 0) console.warn('SupportSize column not found!');
      if (modelSize === 0) console.warn('ModelSize column not found!');
      console.log('Available columns:', Object.keys(record));
    }

    return {
      ...record,
      parsedDate: parseDate(record['Date (UTC)']),
      supportSize, // для статистики по пользователям (сумма синхронизаций)
      modelSize,   // для статистики по моделям (последнее значение)
    };
  });

  return processed;
};