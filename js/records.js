/*
 * Local-only ticket/brief log. This is a static site with no server, so
 * there is no shared database — this stores records in this browser's
 * localStorage only (useful if quotes are taken on one in-store device).
 * For a real shared database across devices, this needs to POST to a
 * backend or a service like Google Sheets/Firebase/Formspree instead.
 */
window.ISHRecords = (function () {
  var STORAGE_KEY = 'ish_records';

  function getAll() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function save(record) {
    try {
      var records = getAll();
      records.unshift({
        id: record.id,
        type: record.type,
        timestamp: new Date().toISOString(),
        summary: record.summary,
        total: record.total,
        details: record.details
      });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      // localStorage unavailable (private browsing, storage full, etc.) —
      // fail silently, the customer's WhatsApp/email send still works.
    }
  }

  function clearAll() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* no-op */
    }
  }

  return { getAll: getAll, save: save, clearAll: clearAll };
})();

document.addEventListener('DOMContentLoaded', function () {
  var openLink = document.getElementById('viewRecordsLink');
  var dialog = document.getElementById('recordsDialog');
  var closeBtn = document.getElementById('recordsClose');
  var listEl = document.getElementById('recordsList');
  var emptyEl = document.getElementById('recordsEmpty');
  var clearBtn = document.getElementById('recordsClear');
  var exportBtn = document.getElementById('recordsExport');

  if (!openLink || !dialog || typeof dialog.showModal !== 'function') {
    return;
  }

  function render() {
    var records = window.ISHRecords.getAll();
    listEl.innerHTML = '';

    if (records.length === 0) {
      emptyEl.hidden = false;
      clearBtn.hidden = true;
      exportBtn.hidden = true;
      return;
    }

    emptyEl.hidden = true;
    clearBtn.hidden = false;
    exportBtn.hidden = false;

    records.forEach(function (record) {
      var item = document.createElement('li');
      item.className = 'records-item';

      var header = document.createElement('div');
      header.className = 'records-item-header';

      var idEl = document.createElement('strong');
      idEl.textContent = record.id;

      var dateEl = document.createElement('span');
      dateEl.className = 'records-item-date';
      dateEl.textContent = new Date(record.timestamp).toLocaleString();

      header.appendChild(idEl);
      header.appendChild(dateEl);

      var typeEl = document.createElement('span');
      typeEl.className = 'records-item-type';
      typeEl.textContent = record.type;

      var summaryEl = document.createElement('p');
      summaryEl.className = 'records-item-summary';
      summaryEl.textContent = record.summary;

      var totalEl = document.createElement('span');
      totalEl.className = 'records-item-total';
      totalEl.textContent = record.total != null ? 'R' + record.total : '';

      item.appendChild(header);
      item.appendChild(typeEl);
      item.appendChild(summaryEl);
      if (record.total != null) item.appendChild(totalEl);

      listEl.appendChild(item);
    });
  }

  openLink.addEventListener('click', function (event) {
    event.preventDefault();
    render();
    dialog.showModal();
  });

  closeBtn.addEventListener('click', function () {
    dialog.close();
  });

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  clearBtn.addEventListener('click', function () {
    if (window.confirm('Clear all saved tickets on this device? This cannot be undone.')) {
      window.ISHRecords.clearAll();
      render();
    }
  });

  exportBtn.addEventListener('click', function () {
    var records = window.ISHRecords.getAll();
    var rows = [['ID', 'Type', 'Date', 'Summary', 'Total']];
    records.forEach(function (record) {
      rows.push([
        record.id,
        record.type,
        new Date(record.timestamp).toLocaleString(),
        record.summary.replace(/\n/g, ' '),
        record.total != null ? record.total : ''
      ]);
    });

    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        var value = String(cell).replace(/"/g, '""');
        return '"' + value + '"';
      }).join(',');
    }).join('\n');

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'internet-smart-hub-tickets.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
});
