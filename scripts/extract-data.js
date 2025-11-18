const XLSX = require('xlsx');
const pdfParse = require('pdf-parse').default || require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Функция за извличане на данни от Excel файл
function extractFromExcel(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('Excel данни:');
    console.log(JSON.stringify(data.slice(0, 20), null, 2)); // Първите 20 реда
    
    return data;
  } catch (error) {
    console.error('Грешка при четене на Excel:', error);
    return null;
  }
}

// Функция за извличане на данни от PDF
async function extractFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    // pdf-parse може да се импортира по различен начин
    let parseFunction = pdfParse;
    if (typeof pdfParse !== 'function' && pdfParse.default) {
      parseFunction = pdfParse.default;
    }
    const data = await parseFunction(dataBuffer);
    
    // Търсим брутния външен дълг в текста
    const text = data.text;
    
    // Патърн за намиране на брутен външен дълг (множество варианти)
    const patterns = [
      /Брутният външен дълг[^\d]*(\d{1,3}(?:\s?\d{3})*(?:\.\d+)?)\s*млн\.?\s*евро/gi,
      /брутен външен дълг[^\d]*(\d{1,3}(?:\s?\d{3})*(?:\.\d+)?)\s*млн\.?\s*евро/gi,
      /(\d{1,3}(?:\s?\d{3})*(?:\.\d+)?)\s*млн\.?\s*евро[^.]*брутен[^.]*външен[^.]*дълг/gi,
    ];
    
    let debtValue = null;
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Извличаме числото от първото съвпадение
        const numberMatch = matches[0].match(/(\d{1,3}(?:\s?\d{3})*(?:\.\d+)?)/);
        if (numberMatch) {
          debtValue = parseFloat(numberMatch[1].replace(/\s/g, ''));
          break;
        }
      }
    }
    
    // Ако не намерим с горните патърни, търсим в таблиците
    if (!debtValue) {
      // Търсим числа близо до "Брутен външен дълг"
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('брутен') && lines[i].toLowerCase().includes('външен')) {
          // Търсим число в същия ред или следващите няколко реда
          for (let j = i; j < Math.min(i + 5, lines.length); j++) {
            const numberMatch = lines[j].match(/(\d{1,3}(?:\s?\d{3})*(?:\.\d+)?)\s*млн/);
            if (numberMatch) {
              debtValue = parseFloat(numberMatch[1].replace(/\s/g, ''));
              break;
            }
          }
          if (debtValue) break;
        }
      }
    }
    
    const fileName = path.basename(filePath);
    const monthMatch = fileName.match(/2025(\d{2})/);
    const month = monthMatch ? monthMatch[1] : 'unknown';
    
    return {
      month: month,
      fileName: fileName,
      debt: debtValue,
      text: text.substring(0, 500) // Първите 500 символа за проверка
    };
  } catch (error) {
    console.error(`Грешка при четене на PDF ${filePath}:`, error.message);
    return null;
  }
}

// Главна функция
async function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  const results = {
    excel: null,
    pdf: []
  };
  
  // Първо прочитаме Excel файла
  const excelPath = path.join(dataDir, 's_ged_press_a2_bg.xlsx');
  if (fs.existsSync(excelPath)) {
    console.log('=== Четене на Excel файл ===');
    const excelData = extractFromExcel(excelPath);
    results.excel = excelData;
    
    // Извличаме данните за месеците от Excel
    if (excelData && excelData.length > 4) {
      const headerRow = excelData[3];
      const dataRow = excelData[4]; // Ред с "Брутен външен дълг"
      
      const monthlyData = {};
      // VIII.2024 е в колона 1, XII.2024 в колона 3, VII.2025 в колона 5, VIII.2025 в колона 7
      if (dataRow[1]) monthlyData['2024-08'] = dataRow[1];
      if (dataRow[3]) monthlyData['2024-12'] = dataRow[3];
      if (dataRow[5]) monthlyData['2025-07'] = dataRow[5];
      if (dataRow[7]) monthlyData['2025-08'] = dataRow[7];
      
      console.log('\n=== Данни от Excel ===');
      console.log(JSON.stringify(monthlyData, null, 2));
    }
  }
  
  // След това прочитаме PDF файловете
  const pdfFiles = fs.readdirSync(dataDir)
    .filter(file => file.endsWith('.pdf'))
    .sort();
  
  console.log('\n=== Четене на PDF файлове ===');
  for (const file of pdfFiles) {
    const pdfPath = path.join(dataDir, file);
    const pdfData = await extractFromPDF(pdfPath);
    if (pdfData) {
      results.pdf.push(pdfData);
      console.log(`${pdfData.fileName}: ${pdfData.debt ? pdfData.debt.toLocaleString('bg-BG') + ' млн. EUR' : 'Не намерено'}`);
    }
  }
  
  // Запазваме резултатите в JSON файл
  const outputPath = path.join(dataDir, 'extracted-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n=== Резултатите са запазени в ${outputPath} ===`);
}

main().catch(console.error);

