//@OnlyCurrentDoc
var csvContent; 

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Import CSV data 👉')
    .addItem('Import from URL', 'importCSVFromUrl')
    .addItem('Import from Drive', 'importCSVFromDrive')
    .addItem('Import via Drag-and-Drop', 'showDropDialog')
    .addToUi();
}

function doGet(e) {
  const html = 'Hie this is a CSV Importer for Google Sheets';
  return HtmlService.createHtmlOutput(html);
}

function showDropDialog() {
  var html = HtmlService.createHtmlOutputFromFile('Page')
    .setWidth(400)
    .setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'CSV Importer');
}

function displayToastAlert(message) {
  SpreadsheetApp.getActive().toast(message, '⚠ Alert');
}

function importCSVFromUrl() {
  var url = promptUserForInput('Please enter the URL of the CSV file:');
  var contents = Utilities.parseCsv(UrlFetchApp.fetch(url));
  var sheetName = promptUserForInput(
    'Enter the sheet name to append or create:'
  );
  sheetName = writeDataToSheet(contents, sheetName);
  displayToastAlert(
    'The CSV file was successfully imported into ' + sheetName + '.'
  );
}

function importCSVFromDrive() {
  var fileName = promptUserForInput(
    'Please enter the name of the CSV file to import from Google Drive:'
  );
  var sheetName = promptUserForInput(
    'Enter the sheet name to append or create:'
  );
  var files = findFilesInDrive(fileName);

  if (files.length === 0) {
    displayToastAlert(
      'No files with the name "' + fileName + '" were found in Google Drive.'
    );
    return;
  } else if (files.length > 1) {
    displayToastAlert(
      'Multiple files with the name ' +
        fileName +
        ' were found. This program does not support picking the right file yet.'
    );
    return;
  }

  var file = files[0];
  var contents = Utilities.parseCsv(file.getBlob().getDataAsString());

  var createNewSheet = confirm('Do you want to create a new sheet?');
  var sheet = writeDataToSheet(contents, sheetName, createNewSheet);

  displayToastAlert(
    'The CSV file was successfully imported into ' + sheet + '.'
  );
}

function filterData(data, selectedColumns, filterValue, filterOption) {
  if (!filterValue) {
    // If no filter value is specified, return only selected columns
    return data.map(function (row) {
      return selectedColumns.map(function (index) {
        return row[index];
      });
    });
  }

  return data.filter(function (row) {
    return row.some(function (cell, index) {
      if (
        selectedColumns.length === 0 ||
        selectedColumns.indexOf(index) !== -1
      ) {
        switch (filterOption) {
          case 'contains':
            return cell.toLowerCase().includes(filterValue.toLowerCase());
          case 'startsWith':
            return cell.toLowerCase().startsWith(filterValue.toLowerCase());
          case 'endsWith':
            return cell.toLowerCase().endsWith(filterValue.toLowerCase());
          default:
            return true;
        }
      }
      return true;
    });
  });
}

function importCSVFromDropbox(options) {
  if (!options.csvContent) {
    displayToastAlert('Error: CSV content is empty.');
    return;
  }
  var selectedColumns = options.selectedColumns;
  var filterValue = options.filterValue;
  var filterOption = options.filterOption;
  var contents = Utilities.parseCsv(options.csvContent);
  var filteredData = filterData(
    contents,
    selectedColumns,
    filterValue,
    filterOption
  );

  var sheet = writeDataToSheet(
    filteredData,
    options.sheetName,
    options.createNewSheet
  );

  displayToastAlert(
    'The CSV file was successfully imported into ' + sheet + '.'
  );
}

function writeDataToSheet(data, sheetName, createNewSheet) {
  var ss = SpreadsheetApp.getActive();
  var sheet;

  if (createNewSheet) {
    var sheetNumber = 1;
    var newSheetName = sheetName || 'Sheet';

    while (ss.getSheetByName(newSheetName + sheetNumber)) {
      sheetNumber++;
    }

    sheet = ss.insertSheet(newSheetName + sheetNumber);
  } else {
    sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getActiveSheet();
  }

  var lastRow = sheet.getLastRow();

  if (lastRow > 0) {
    lastRow += 1; // Move to the next row
  }

  sheet.getRange(lastRow + 1, 1, data.length, data[0].length).setValues(data);
  return sheet.getName();
}

function promptUserForInput(promptText) {
  var ui = SpreadsheetApp.getUi();
  var prompt = ui.prompt(promptText);
  var response = prompt.getResponseText();
  return response;
}

function findFilesInDrive(filename) {
  var files = DriveApp.getFilesByName(filename);
  var result = [];
  while (files.hasNext()) result.push(files.next());
  return result;
}
