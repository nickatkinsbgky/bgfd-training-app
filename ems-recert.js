(function () {
  var SRC = "https://raw.githubusercontent.com/nickatkinsbgky/bgfd-training-app/e3e3cb3a6613c2509d99455d451645fe25f2e2cc/ems-recert.js";
  fetch(SRC).then(function (res) {
    if (!res.ok) throw new Error("Could not load EMS tracker script");
    return res.text();
  }).then(function (code) {
    var insert = [
      "  var EMR_REQS = [",
      "    { key: \"CPR/AED\", label: \"CPR/AED\", need: 1 },",
      "    { key: \"PAHT\", label: \"Pediatric abusive head trauma\", need: 1 },",
      "    { key: \"SVAT\", label: \"Sexual violence awareness training\", need: 1 },",
      "    { key: \"Airway\", label: \"Airway\", need: 1.5 },",
      "    { key: \"Cardiovascular\", label: \"Cardiology\", need: 2 },",
      "    { key: \"Trauma\", label: \"Trauma\", need: 1 },",
      "    { key: \"Medical\", label: \"Medical\", need: 2.5 },",
      "    { key: \"Operations\", label: \"Operations\", need: 1 }",
      "  ];",
      "  function catsFor(person) {",
      "    if (certLevel(person) !== \"EMR\") return CATS.map(function (c) { return { key: c.key, need: c.need, label: c.key }; });",
      "    return CATS.map(function (c) {",
      "      var match = EMR_REQS.filter(function (row) { return row.key === c.key; })[0];",
      "      return { key: c.key, need: match ? match.need : c.need, label: match ? match.label : c.key };",
      "    });",
      "  }",
      "  function needFor(person, key) {",
      "    var match = catsFor(person).filter(function (c) { return c.key === key; })[0];",
      "    return match ? match.need : 0;",
      "  }",
      "  function reqRows() {",
      "    var total = EMR_REQS.reduce(function (sum, row) { return sum + row.need; }, 0);",
      "    return EMR_REQS.map(function (row) {",
      "      return \"<tr><td class='left'>\" + row.label + \"</td><td>\" + row.need + \"</td></tr>\";",
      "    }).join(\"\") + \"<tr><td class='left'><b>Total</b></td><td><b>\" + total + \"</b></td></tr>\";",
      "  }",
      "  function fillReqTable() {",
      "    var html = reqRows();",
      "    [\"emrReqBody\", \"emrReqBodyPerson\"].forEach(function (id) {",
      "      var body = document.getElementById(id);",
      "      if (body) body.innerHTML = html;",
      "    });",
      "    var note = document.getElementById(\"emrReqNote\");",
      "    if (note) note.textContent = \"Applied automatically when Certification Level is EMR. EMT, AEMT, and Paramedic keep the existing category hours. Roster cells show earned / required.\";",
      "  }",
      ""
    ].join("\n");
    code = code.replace("  var KEY =", insert + "  var KEY =");
    code = code.replace("    CATS.forEach(function (c) {\n      hours[c.key] = hoursFor(person.name, c.key, win);\n      if (hours[c.key] < c.need) needs.push(c.key + \" \" + (Math.round((c.need - hours[c.key]) * 100) / 100));\n    });", "    catsFor(person).forEach(function (c) {\n      hours[c.key] = hoursFor(person.name, c.key, win);\n      if (hours[c.key] < c.need) needs.push(c.key + \" \" + (Math.round((c.need - hours[c.key]) * 100) / 100));\n    });");
    code = code.replace("CATS.map(function (c) { return \"<th>\" + c.key + \" (\" + c.need + \")</th>\"; })", "CATS.map(function (c) { return \"<th>\" + c.key + \"</th>\"; })");
    code = code.replace("      var cells = CATS.map(function (c) {\n        var val = row.s.win ? row.s.hours[c.key] : \"\";\n        var cls = row.s.win ? (val >= c.need ? \"hrs met\" : \"hrs short\") : \"\";\n        return \"<td class='\" + cls + \"'>\" + val + \"</td>\";\n      }).join(\"\");", "      var cells = catsFor(row.p).map(function (c) {\n        var val = row.s.win ? row.s.hours[c.key] : \"\";\n        var cls = row.s.win ? (val >= c.need ? \"hrs met\" : \"hrs short\") : \"\";\n        return \"<td class='\" + cls + \"'>\" + (row.s.win ? (val + \" / \" + c.need) : \"\") + \"</td>\";\n      }).join(\"\");");
    code = code.replace("    person.certificationLevel = level;\n    save();\n    var editCert = document.getElementById(\"editCert\");\n    var sumCert = document.getElementById(\"sumCert\");\n    if (selected && selected.name === name) {\n      if (editCert) editCert.value = level;\n      if (sumCert) sumCert.value = level;\n    }\n  }", "    person.certificationLevel = level;\n    save();\n    var editCert = document.getElementById(\"editCert\");\n    var sumCert = document.getElementById(\"sumCert\");\n    if (selected && selected.name === name) {\n      if (editCert) editCert.value = level;\n      if (sumCert) sumCert.value = level;\n    }\n    var app = document.getElementById(\"app\");\n    var personView = document.getElementById(\"personView\");\n    var deptView = document.getElementById(\"deptView\");\n    var focusView = document.getElementById(\"focusView\");\n    if (app && !app.hidden) render();\n    if (personView && !personView.hidden && selected && selected.name === name) showSummary(name);\n    if (deptView && !deptView.hidden && document.getElementById(\"deptYear\") && document.getElementById(\"deptYear\").value) renderDept();\n    if (focusView && !focusView.hidden && document.getElementById(\"focusYear\") && document.getElementById(\"focusYear\").value) renderFocus();\n  }");
    code = code.replace("    document.getElementById(\"sumCats\").innerHTML = CATS.map(function (c) {", "    var reqPanel = document.getElementById(\"personReq\");\n    if (reqPanel) reqPanel.hidden = certLevel(selected) !== \"EMR\";\n    document.getElementById(\"sumCats\").innerHTML = catsFor(selected).map(function (c) {");
    code = code.replace("      var req = CATS.filter(function (c) { return c.key === r.category; })[0];", "      var req = catsFor(selected).filter(function (c) { return c.key === r.category; })[0];");
    code = code.replace("      var met = CATS.filter(function (c) { return s.hours[c.key] >= c.need; }).length;\n      return { p: p, s: s, met: met, pct: pct(met, CATS.length) };", "      var cats = catsFor(p);\n      var met = cats.filter(function (c) { return s.hours[c.key] >= c.need; }).length;\n      return { p: p, s: s, met: met, total: cats.length, pct: pct(met, cats.length) };");
    code = code.replace("return row.met === CATS.length", "return row.met === row.total");
    code = code.replace("row.met + \" / \" + CATS.length", "row.met + \" / \" + row.total");
    code = code.replace("var metCount = rows.filter(function (row) { return row.s.hours[c.key] >= c.need; }).length;", "var metCount = rows.filter(function (row) { return row.s.hours[c.key] >= needFor(row.p, c.key); }).length;");
    code = code.replace("return sum + Math.min(row.s.hours[c.key] / c.need, 1);", "return sum + Math.min((row.s.hours[c.key] || 0) / needFor(row.p, c.key), 1);");
    code = code.replace("return \"<tr><td class='left'>\" + esc(c.key) + \"</td><td>\" + c.need + \"</td><td>\"", "return \"<tr><td class='left'>\" + esc(c.key) + \"</td><td>\" + (needFor({ certificationLevel: \"EMR\" }, c.key) === c.need ? c.need : (needFor({ certificationLevel: \"EMR\" }, c.key) + \" EMR / \" + c.need + \" other\")) + \"</td><td>\"");
    code = code.replace("        var earned = hoursFor(p.name, c.key, cycle(p.expDate));\n        var pace = paceOf(earned, c.need, p.expDate);\n        counts[pace.bucket] += 1;\n        if (pace.bucket === \"short\") {\n          gap += Math.max(0, c.need - earned);\n          behind.push({ p: p, earned: earned, pace: pace, need: c.need });\n        }", "        var need = needFor(p, c.key);\n        var earned = hoursFor(p.name, c.key, cycle(p.expDate));\n        var pace = paceOf(earned, need, p.expDate);\n        counts[pace.bucket] += 1;\n        if (pace.bucket === \"short\") {\n          gap += Math.max(0, need - earned);\n          behind.push({ p: p, earned: earned, pace: pace, need: need });\n        }");
    code = code.replace("return paceOf(earned, c.need, p.expDate).bucket === \"short\";", "return paceOf(earned, needFor(p, c.key), p.expDate).bucket === \"short\";");
    code = code.replace("return hoursFor(p.name, c.key, cycle(p.expDate)) + 0.001 >= c.need;", "return hoursFor(p.name, c.key, cycle(p.expDate)) + 0.001 >= needFor(p, c.key);");
    code = code.replace("Required ' + row.c.need + '", "Required ' + (needFor({ certificationLevel: \"EMR\" }, row.c.key) === row.c.need ? row.c.need : (needFor({ certificationLevel: \"EMR\" }, row.c.key) + \" EMR / \" + row.c.need + \" other\")) + '");
    code = code.replace("categories: CATS.map(function (c) {", "categories: catsFor(person).map(function (c) {");
    code = code.replace("ensureCertLevels();\n\n\n  window.emsPersonReport", "ensureCertLevels();\n  fillReqTable();\n\n  window.emsPersonReport");
    (0, eval)(code);
  }).catch(function (err) {
    alert("EMS tracker did not load. Refresh the page. " + err.message);
  });
})();
