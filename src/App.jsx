// App.jsx
import { useState, useMemo } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import DateFilter from './components/DateFilter';
import UserStatsTable from './components/UserStatsTable';
import ActivityChart from './components/ActivityChart';
import EmptyState from './components/EmptyState';
import SummaryStats from './components/SummaryStats';
import { parseTSVData, processData, formatDateForInput, bytesToMB } from './utils/dataUtils';

function App() {
  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedServer, setSelectedServer] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const handleFileLoaded = (text) => {
    const parsed = parseTSVData(text);
    const withDates = processData(parsed);
    setData(withDates);

    const validDates = withDates
      .map(d => d.parsedDate)
      .filter(d => d && !isNaN(d.getTime()));

    if (validDates.length > 0) {
      const minDate = new Date(Math.min(...validDates));
      const maxDate = new Date(Math.max(...validDates));
      setStartDate(formatDateForInput(minDate));
      setEndDate(formatDateForInput(maxDate));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const filteredData = useMemo(() => {
    if (!data.length) return [];
    if (!startDate || !endDate) return data;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return data.filter(record => {
      const recordDate = record.parsedDate;
      return recordDate && !isNaN(recordDate.getTime()) && recordDate >= start && recordDate <= end;
    });
  }, [data, startDate, endDate]);

  const servers = useMemo(() => {
    return [...new Set(filteredData.map(d => d['Сервер']))].filter(Boolean);
  }, [filteredData]);

  const models = useMemo(() => {
    if (!selectedServer) return [];
    return [...new Set(filteredData
      .filter(d => d['Сервер'] === selectedServer)
      .map(d => d['Имя файла']))].filter(Boolean);
  }, [filteredData, selectedServer]);

  // Статистика пользователей с учетом уникальных дней
  const userStats = useMemo(() => {
    const stats = {};

    filteredData.forEach(record => {
      const user = record['User'];
      if (!user) return;

      if (!stats[user]) {
        stats[user] = {
          user: user,
          syncCount: 0,
          totalDataBytes: 0,
          days: new Set()
        };
      }

      stats[user].syncCount += 1;
      stats[user].totalDataBytes += record.supportSize;
      
      // Добавляем уникальные дни
      if (record.parsedDate) {
        const dateKey = record.parsedDate.toLocaleDateString('ru-RU');
        stats[user].days.add(dateKey);
      }
    });

    return Object.values(stats)
      .map(stat => ({
        user: stat.user,
        syncCount: stat.syncCount,
        totalDataMB: bytesToMB(stat.totalDataBytes),
        avgDataPerDay: stat.days.size > 0 
          ? bytesToMB(stat.totalDataBytes / stat.days.size)
          : '0.00'
      }))
      .sort((a, b) => parseFloat(b.totalDataMB) - parseFloat(a.totalDataMB));
  }, [filteredData]);

  // Данные для графика
  const chartData = useMemo(() => {
    if (!selectedServer || !selectedModel) return [];

    const filtered = filteredData.filter(record =>
      record['Сервер'] === selectedServer &&
      record['Имя файла'] === selectedModel
    );

    const dailyData = {};

    filtered.forEach(record => {
      const date = record.parsedDate;
      if (!date) return;

      const dateKey = date.toLocaleDateString('ru-RU');

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          dataSizeMB: 0,
          syncCount: 0
        };
      }

      dailyData[dateKey].dataSizeMB += record.supportSize;
      dailyData[dateKey].syncCount += 1;
    });

    return Object.values(dailyData)
      .map(day => ({
        ...day,
        dataSizeMB: parseFloat(bytesToMB(day.dataSizeMB))
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date.split('.').reverse().join('-'));
        const dateB = new Date(b.date.split('.').reverse().join('-'));
        return dateA - dateB;
      });
  }, [filteredData, selectedServer, selectedModel]);

  // Детальные данные для выбранной модели (для таблицы пользователей в графике)
  const modelDetailedData = useMemo(() => {
    if (!selectedServer || !selectedModel) return [];
    
    return filteredData.filter(record =>
      record['Сервер'] === selectedServer &&
      record['Имя файла'] === selectedModel
    );
  }, [filteredData, selectedServer, selectedModel]);

  const handleServerChange = (server) => {
    setSelectedServer(server);
    setSelectedModel('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FileUpload
          onFileLoaded={handleFileLoaded}
          recordCount={data.length}
        />

        {data.length > 0 ? (
          <>
            <DateFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              filteredCount={filteredData.length}
            />

            <SummaryStats filteredData={filteredData} />

            <UserStatsTable userStats={userStats} />

            <ActivityChart
              chartData={chartData}
              detailedData={modelDetailedData}
              servers={servers}
              models={models}
              selectedServer={selectedServer}
              selectedModel={selectedModel}
              onServerChange={handleServerChange}
              onModelChange={setSelectedModel}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

export default App;
