(function () {
  var SRC = "https://raw.githubusercontent.com/nickatkinsbgky/bgfd-training-app/e3e3cb3a6613c2509d99455d451645fe25f2e2cc/ems-recert.js";
  function ensureTables() {
    if (!document.getElementById("emrReqStyle")) {
      var style = document.createElement("style");
      style.id = "emrReqStyle";
      style.textContent = ".req-wrap{margin:0 0 14px}.req-wrap table{min-width:0;width:min(720px,100%)}.req-wrap h3{margin:0 0 4px}#personReq[hidden]{display:none}.req-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}";
      document.head.appendChild(style);
    }
    if (!document.getElementById("levelReqWrap")) {
      var stats = document.getElementById("stats");
      if (stats && stats.parentNode) {
        var section = document.createElement("section");
        section.className = "req-wrap";
        section.id = "levelReqWrap";
        section.innerHTML = "<h3>Kentucky recertification requirements by level</h3><p class='muted' id='emrReqNote'></p><div class='req-grid'><div><h3>EMR</h3><div class='wrap'><table><thead><tr><th class='left'>Category</th><th>Required hours</th></tr></thead><tbody id='emrReqBody'></tbody></table></div></div><div><h3>AEMT</h3><div class='wrap'><table><thead><tr><th class='left'>Category</th><th>Required hours</th></tr></thead><tbody id='aemtReqBody'></tbody></table></div></div><div><h3>Paramedic</h3><div class='wrap'><table><thead><tr><th class='left'>Category</th><th>Required hours</th></tr></thead><tbody id='paramedicReqBody'></tbody></table></div></div></div>";
        stats.parentNode.insertBefore(section, stats.nextSibling);
      }
    }
    if (!document.getElementById("personReq")) {
      var sum = document.getElementById("sumStatus");
      if (sum && sum.parentNode) {
        var person = document.createElement("section");
        person.className = "req-wrap";
        person.id = "personReq";
        person.hidden = true;
        person.innerHTML = "<h3 id='personReqTitle'>Kentucky recertification requirements</h3><p class='muted' id='personReqNote'></p><div class='wrap'><table><thead><tr><th class='left'>Category</th><th>Required hours</th></tr></thead><tbody id='emrReqBodyPerson'></tbody></table></div>";
        sum.parentNode.insertBefore(person, sum.nextSibling);
      }
    }
    if (!document.getElementById("newPeds")) {
      var course = document.getElementById("newCourse");
      if (course && course.parentNode) {
        var wrap = document.createElement("div");
        wrap.innerHTML = "<label><input id='newPeds' type='checkbox' /> Pediatric content</label>";
        course.parentNode.parentNode.appendChild(wrap);
      }
    }
  }
  fetch(SRC).then(function (res) {
    if (!res.ok) throw new Error("Could not load EMS tracker script");
    return res.text();
  }).then(function (code) {
    ensureTables();
    var insert = [
      "  var LEVEL_REQS = {",
      "    EMR: [",
      "      { key: \"CPR/AED\", label: \"CPR/AED\", need: 1 },",
      "      { key: \"PAHT\", label: \"Pediatric abusive head trauma\", need: 1 },",
      "      { key: \"SVAT\", label: \"Sexual violence awareness training\", need: 1 },",
      "      { key: \"Airway\", label: \"Airway\", need: 1.5 },",
      "      { key: \"Cardiovascular\", label: \"Cardiology\", need: 2 },",
      "      { key: \"Trauma\", label: \"Trauma\", need: 1 },",
      "      { key: \"Medical\", label: \"Medical\", need: 2.5 },",
      "      { key: \"Operations\", label: \"Operations\", need: 1 }",
      "    ],",
      "    AEMT: [",
      "      { key: \"CPR/AED\", label: \"CPR/AED\", need: 1 },",
      "      { key: \"PAHT\", label: \"Pediatric abusive head trauma\", need: 1 },",
      "      { key: \"SVAT\", label: \"Sexual violence awareness training\", need: 1 },",
      "      { key: \"Airway\", label: \"Airway\", need: 5 },",
      "      { key: \"Cardiovascular\", label: \"Cardiology\", need: 6 },",
      "      { key: \"Trauma\", label: \"Trauma\", need: 4 },",
      "      { key: \"Medical\", label: \"Medical\", need: 7 },",
      "      { key: \"Operations\", label: \"Operations\", need: 3 }",
      "    ],",
      "    Paramedic: [",
      "      { key: \"CPR/AED\", label: \"CPR/AED\", need: 1 },",
      "      { key: \"PAHT\", label: \"Pediatric abusive head trauma\", need: 1 },",
      "      { key: \"SVAT\", label: \"Sexual violence awareness training\", need: 1 },",
      "      { key: \"Airway\", label: \"Airway\", need: 6 },",
      "      { key: \"Cardiovascular\", label: \"Cardiology\", need: 7 },",
      "      { key: \"Trauma\", label: \"Trauma\", need: 5 },",
      "      { key: \"Medical\", label: \"Medical\", need: 8 },",
      "      { key: \"Operations\", label: \"Operations\", need: 4 }",
      "    ]",
      "  };",
      "  var PEDS_NEED = { AEMT: 2.5, Paramedic: 3 };",
      "  function reqList(level) { return LEVEL_REQS[level] || null; }",
      "  function catsFor(person) {",
      "    var reqs = reqList(certLevel(person));",
      "    if (!reqs) return CATS.map(function (c) { return { key: c.key, need: c.need, label: c.key }; });",
      "    return CATS.map(function (c) {",
      "      var match = reqs.filter(function (row) { return row.key === c.key; })[0];",
      "      return { key: c.key, need: match ? match.need : c.need, label: match ? match.label : c.key };",
      "    });",
      "  }",
      "  function needFor(person, key) {",
      "    var match = catsFor(person).filter(function (c) { return c.key === key; })[0];",
      "    return match ? match.need : 0;",
      "  }",
      "  function isPediatric(record) {",
      "    if (!record) return false;",
      "    if (record.pediatric) return true;",
      "    if (record.category === \"PAHT\") return true;",
      "    return /pediatr|peds|\\bchild\\b|infant/i.test(String(record.course || \"\") + \" \" + String(record.standard || \"\"));",
      "  }",
      "  function pediatricHours(name, win) {",
      "    var total = 0;",
      "    db.records.forEach(function (r) {",
      "      if (r.name !== name || !isPediatric(r)) return;",
      "      if (win && (r.date < win.start || r.date > win.end)) return;",
      "      total += Number(r.hours) || 0;",
      "    });",
      "    return Math.round(total * 100) / 100;",
      "  }",
      "  function reqRows(level) {",
      "    var rows = reqList(level) || [];",
      "    var total = rows.reduce(function (sum, row) { return sum + row.need; }, 0);",
      "    var html = rows.map(function (row) {",
      "      return \"<tr><td class='left'>\" + row.label + \"</td><td>\" + row.need + \"</td></tr>\";",
      "    }).join(\"\");",
      "    if (PEDS_NEED[level]) html += \"<tr><td class='left'>Pediatric content, within the total</td><td>\" + PEDS_NEED[level] + \"</td></tr>\";",
      "    return html + \"<tr><td class='left'><b>Total</b></td><td><b>\" + total + \"</b></td></tr>\";",
      "  }",
      "  function fillReqTable() {",
      "    var emr = document.getElementById(\"emrReqBody\");",
      "    var aemt = document.getElementById(\"aemtReqBody\");",
      "    var medic = document.getElementById(\"paramedicReqBody\");",
      "    var personBody = document.getElementById(\"emrReqBodyPerson\");",
      "    if (emr) emr.innerHTML = reqRows(\"EMR\");",
      "    if (aemt) aemt.innerHTML = reqRows(\"AEMT\");",
      "    if (medic) medic.innerHTML = reqRows(\"Paramedic\");",
      "    if (personBody && selected) personBody.innerHTML = reqRows(certLevel(selected));",
      "    var note = document.getElementById(\"emrReqNote\");",
      "    if (note) note.textContent = \"EMR, AEMT, and Paramedic hours apply when that certification level is selected. EMT keeps the existing category hours. Roster cells show earned / required. AEMT needs 2.5 pediatric hours and Paramedic needs 3 pediatric hours inside the total. PAHT and classes marked pediatric, or with pediatric in the course name, count.\";",
      "    var title = document.getElementById(\"personReqTitle\");",
      "    var personNote = document.getElementById(\"personReqNote\");",
      "    if (title && selected) title.textContent = \"Kentucky \" + certLevel(selected) + \" recertification requirements\";",
      "    if (personNote && selected) { var peds = PEDS_NEED[certLevel(selected)]; personNote.textContent = peds ? (\"Category hours plus \" + peds + \" hours of pediatric content within the total. Mark new classes as pediatric content when they qualify.\") : (\"These hours apply because this person is certified as an \" + certLevel(selected) + \".\"); }",
      "  }",
      ""
    ].join("\n");
    code = code.replace("  var KEY =", insert + "  var KEY =");
    code = code.replace("    CATS.forEach(function (c) {\n      hours[c.key] = hoursFor(person.name, c.key, win);\n      if (hours[c.key] < c.need) needs.push(c.key + \" \" + (Math.round((c.need - hours[c.key]) * 100) / 100));\n    });", "    catsFor(person).forEach(function (c) {\n      hours[c.key] = hoursFor(person.name, c.key, win);\n      if (hours[c.key] < c.need) needs.push(c.key + \" \" + (Math.round((c.need - hours[c.key]) * 100) / 100));\n    });\n    var pedsNeed = PEDS_NEED[certLevel(person)] || 0;\n    if (pedsNeed) {\n      var peds = pediatricHours(person.name, win);\n      hours.Pediatric = peds;\n      if (peds < pedsNeed) needs.push(\"Pediatric \" + (Math.round((pedsNeed - peds) * 100) / 100));\n    }");
    code = code.replace("CATS.map(function (c) { return \"<th>\" + c.key + \" (\" + c.need + \")</th>\"; })", "CATS.map(function (c) { return \"<th>\" + c.key + \"</th>\"; })");
    code = code.replace("      var cells = CATS.map(function (c) {\n        var val = row.s.win ? row.s.hours[c.key] : \"\";\n        var cls = row.s.win ? (val >= c.need ? \"hrs met\" : \"hrs short\") : \"\";\n        return \"<td class='\" + cls + \"'>\" + val + \"</td>\";\n      }).join(\"\");", "      var cells = catsFor(row.p).map(function (c) {\n        var val = row.s.win ? row.s.hours[c.key] : \"\";\n        var cls = row.s.win ? (val >= c.need ? \"hrs met\" : \"hrs short\") : \"\";\n        return \"<td class='\" + cls + \"'>\" + (row.s.win ? (val + \" / \" + c.need) : \"\") + \"</td>\";\n      }).join(\"\");");
    code = code.replace("    person.certificationLevel = level;\n    save();\n    var editCert = document.getElementById(\"editCert\");\n    var sumCert = document.getElementById(\"sumCert\");\n    if (selected && selected.name === name) {\n      if (editCert) editCert.value = level;\n      if (sumCert) sumCert.value = level;\n    }\n  }", "    person.certificationLevel = level;\n    save();\n    var editCert = document.getElementById(\"editCert\");\n    var sumCert = document.getElementById(\"sumCert\");\n    if (selected && selected.name === name) {\n      if (editCert) editCert.value = level;\n      if (sumCert) sumCert.value = level;\n    }\n    var app = document.getElementById(\"app\");\n    var personView = document.getElementById(\"personView\");\n    var deptView = document.getElementById(\"deptView\");\n    var focusView = document.getElementById(\"focusView\");\n    if (app && !app.hidden) render();\n    if (personView && !personView.hidden && selected && selected.name === name) showSummary(name);\n    if (deptView && !deptView.hidden && document.getElementById(\"deptYear\") && document.getElementById(\"deptYear\").value) renderDept();\n    if (focusView && !focusView.hidden && document.getElementById(\"focusYear\") && document.getElementById(\"focusYear\").value) renderFocus();\n  }");
    code = code.replace("    document.getElementById(\"sumCats\").innerHTML = CATS.map(function (c) {", "    var reqPanel = document.getElementById(\"personReq\");\n    if (reqPanel) reqPanel.hidden = !reqList(certLevel(selected));\n    fillReqTable();\n    document.getElementById(\"sumCats\").innerHTML = catsFor(selected).map(function (c) {");
    code = code.replace("    }).join(\"\");\n    var classes = [];", "    }).join(\"\") + (PEDS_NEED[certLevel(selected)] ? (function () { var need = PEDS_NEED[certLevel(selected)]; var earned = s.win ? pediatricHours(selected.name, s.win) : 0; var cls = s.win ? tone(earned, need) : \"\"; return \"<div class='\" + cls + \"'><span>Pediatric</span><b>\" + earned + \"</b><span>of \" + need + \"</span></div>\"; })() : \"\");\n    var classes = [];");
    code = code.replace("      var req = CATS.filter(function (c) { return c.key === r.category; })[0];", "      var req = catsFor(selected).filter(function (c) { return c.key === r.category; })[0];");
    code = code.replace("      var met = CATS.filter(function (c) { return s.hours[c.key] >= c.need; }).length;\n      return { p: p, s: s, met: met, pct: pct(met, CATS.length) };", "      var cats = catsFor(p);\n      var met = cats.filter(function (c) { return s.hours[c.key] >= c.need; }).length;\n      var pedsNeed = PEDS_NEED[certLevel(p)] || 0;\n      var pedsMet = !pedsNeed || (s.hours.Pediatric || 0) >= pedsNeed;\n      return { p: p, s: s, met: met + (pedsMet ? 1 : 0), total: cats.length + (pedsNeed ? 1 : 0), pct: pct(met + (pedsMet ? 1 : 0), cats.length + (pedsNeed ? 1 : 0)) };");
    code = code.replace("return row.met === CATS.length", "return row.met === row.total");
    code = code.replace("row.met + \" / \" + CATS.length", "row.met + \" / \" + row.total");
    code = code.replace("var metCount = rows.filter(function (row) { return row.s.hours[c.key] >= c.need; }).length;", "var metCount = rows.filter(function (row) { return row.s.hours[c.key] >= needFor(row.p, c.key); }).length;");
    code = code.replace("return sum + Math.min(row.s.hours[c.key] / c.need, 1);", "return sum + Math.min((row.s.hours[c.key] || 0) / needFor(row.p, c.key), 1);");
    code = code.replace("return \"<tr><td class='left'>\" + esc(c.key) + \"</td><td>\" + c.need + \"</td><td>\"", "return \"<tr><td class='left'>\" + esc(c.key) + \"</td><td>\" + [\"EMR\", \"AEMT\"].map(function (level) { return needFor({ certificationLevel: level }, c.key); }).join(\" / \") + \" / \" + c.need + \"</td><td>\"");
    code = code.replace("        var earned = hoursFor(p.name, c.key, cycle(p.expDate));\n        var pace = paceOf(earned, c.need, p.expDate);\n        counts[pace.bucket] += 1;\n        if (pace.bucket === \"short\") {\n          gap += Math.max(0, c.need - earned);\n          behind.push({ p: p, earned: earned, pace: pace, need: c.need });\n        }", "        var need = needFor(p, c.key);\n        var earned = hoursFor(p.name, c.key, cycle(p.expDate));\n        var pace = paceOf(earned, need, p.expDate);\n        counts[pace.bucket] += 1;\n        if (pace.bucket === \"short\") {\n          gap += Math.max(0, need - earned);\n          behind.push({ p: p, earned: earned, pace: pace, need: need });\n        }");
    code = code.replace("return paceOf(earned, c.need, p.expDate).bucket === \"short\";", "return paceOf(earned, needFor(p, c.key), p.expDate).bucket === \"short\";");
    code = code.replace("return hoursFor(p.name, c.key, cycle(p.expDate)) + 0.001 >= c.need;", "return hoursFor(p.name, c.key, cycle(p.expDate)) + 0.001 >= needFor(p, c.key);");
    code = code.replace("Required ' + row.c.need + '", "Required ' + needFor({ certificationLevel: \"Paramedic\" }, row.c.key) + \" Paramedic / \" + needFor({ certificationLevel: \"AEMT\" }, row.c.key) + \" AEMT / \" + row.c.need + \" EMT+ '");
    code = code.replace("categories: CATS.map(function (c) {", "categories: catsFor(person).map(function (c) {");
    code = code.replace("var cat = document.getElementById(\"newCat\").value; db.records.push({ name: selected.name, date: date, category: cat, standard: \"KBEMS | \" + cat + \" | \" + cat, hours: hours, course: document.getElementById(\"newCourse\").value.trim() });", "var cat = document.getElementById(\"newCat\").value; var pedsBox = document.getElementById(\"newPeds\"); db.records.push({ name: selected.name, date: date, category: cat, standard: \"KBEMS | \" + cat + \" | \" + cat, hours: hours, course: document.getElementById(\"newCourse\").value.trim(), pediatric: !!(pedsBox && pedsBox.checked) }); if (pedsBox) pedsBox.checked = false;");
    code = code.replace("ensureCertLevels();\n\n\n  window.emsPersonReport", "ensureCertLevels();\n  fillReqTable();\n\n  window.emsPersonReport");
    (0, eval)(code);
  }).catch(function (err) {
    alert("EMS tracker did not load. Refresh the page. " + err.message);
  });
})();
