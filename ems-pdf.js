(function () {
  function fileName(name) {
    return String(name || "personnel").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-EMS-recert.pdf";
  }
  function inCycle(report, row) {
    return report.win && row.date >= report.win.start && row.date <= report.win.end;
  }
  window.exportEmsPersonPdf = function (name) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("PDF library did not load. Refresh and try again.");
      return;
    }
    var report = window.emsPersonReport ? window.emsPersonReport(name) : null;
    if (!report) { alert("Select a person first."); return; }
    var doc = new window.jspdf.jsPDF({ unit: "pt", format: "letter" });
    var pageWidth = doc.internal.pageSize.getWidth();
    var generated = new Date().toLocaleString();
    doc.setFillColor(59, 10, 10);
    doc.rect(0, 0, pageWidth, 78, "F");
    doc.setFillColor(212, 160, 23);
    doc.rect(0, 78, pageWidth, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Bowling Green Fire Department", 40, 32);
    doc.setFontSize(13);
    doc.setTextColor(212, 160, 23);
    doc.text("EMS Recertification Record", 40, 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(230, 230, 230);
    doc.text("Printable personnel copy", 40, 68);

    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(report.person.name, 40, 112);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    var cycle = report.win ? report.win.start + " through " + report.win.end : "Expiration date not set";
    doc.text("Certification level: " + (report.person.certificationLevel || "EMT") + "    KEMSIS ID: " + (report.person.kemsisId || "—") + "    Expiration: " + (report.person.expDate || "not set"), 40, 132);
    doc.text("Cycle: " + cycle + "    Status: " + report.status, 40, 148);
    if (report.needs && report.needs.length) {
      doc.setTextColor(155, 44, 44);
      doc.text("Still needed: " + report.needs.join("; "), 40, 164, { maxWidth: pageWidth - 80 });
    } else if (report.win) {
      doc.setTextColor(31, 122, 77);
      doc.text("All required categories are met for this cycle.", 40, 164);
    }

    doc.autoTable({
      startY: 182,
      head: [["Category", "Required", "Earned", "Still needed", "Status"]],
      body: report.categories.map(function (c) {
        return [c.key, String(c.need), String(c.earned), c.still > 0 ? String(c.still) : "—", c.tone || "—"];
      }),
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [59, 10, 10], textColor: [212, 160, 23] },
      columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 80 }, 2: { cellWidth: 80 }, 3: { cellWidth: 100 }, 4: { cellWidth: 90 } },
      didParseCell: function (hook) {
        if (hook.section !== "body" || hook.column.index !== 4) return;
        if (hook.cell.raw === "Short") hook.cell.styles.textColor = [155, 44, 44];
        if (hook.cell.raw === "Met") hook.cell.styles.textColor = [31, 122, 77];
        if (hook.cell.raw === "Ahead") hook.cell.styles.textColor = [36, 96, 150];
      }
    });

    var cycleRows = report.classes.filter(function (row) { return inCycle(report, row); });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    var y = doc.lastAutoTable.finalY + 24;
    doc.text("Classes in this recertification cycle", 40, y);
    doc.autoTable({
      startY: y + 8,
      head: [["Date", "Category", "Hours", "Course", "Standard"]],
      body: cycleRows.length ? cycleRows.map(function (row) {
        return [row.date || "", row.category || "", String(row.hours), row.course || "", row.standard || row.category || ""];
      }) : [["—", "—", "—", "No classes in this cycle", "—"]],
      styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [33, 24, 16], textColor: [212, 160, 23] },
      columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 90 }, 2: { cellWidth: 48 }, 3: { cellWidth: 150 }, 4: { cellWidth: 157 } }
    });

    var outside = report.classes.filter(function (row) { return !inCycle(report, row); });
    if (outside.length) {
      y = doc.lastAutoTable.finalY + 24;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Classes outside this cycle", 40, y);
      doc.autoTable({
        startY: y + 8,
        head: [["Date", "Category", "Hours", "Course"]],
        body: outside.map(function (row) {
          return [row.date || "", row.category || "", String(row.hours), row.course || ""];
        }),
        styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
        headStyles: { fillColor: [48, 54, 61], textColor: 255 },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 110 }, 2: { cellWidth: 50 }, 3: { cellWidth: 285 } }
      });
    }

    var pages = doc.internal.getNumberOfPages();
    for (var i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("BGFD EMS Recertification Tracker  ·  Generated " + generated, 40, 770);
      doc.text("Page " + i + " of " + pages, pageWidth - 90, 770);
    }
    doc.save(fileName(report.person.name));
  };
})();
