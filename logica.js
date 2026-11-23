/* Gestor de Tarefas do BPO: regras de datas, repetição e filtros.
   Funções puras, sem tela. Usadas pelo app no navegador e pelos testes (Node). */
(function (raiz) {
  'use strict';

  // ---------- datas (sempre no fuso local, no formato AAAA-MM-DD) ----------
  function doTexto(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var p = s.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (d.getFullYear() !== +p[0] || d.getMonth() !== +p[1] - 1 || d.getDate() !== +p[2]) return null;
    return d;
  }
  function paraTexto(d) {
    var m = d.getMonth() + 1, dia = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dia < 10 ? '0' : '') + dia;
  }
  function hoje(agora) { var a = agora || new Date(); return paraTexto(new Date(a.getFullYear(), a.getMonth(), a.getDate())); }
  function somaDias(s, n) { var d = doTexto(s); d.setDate(d.getDate() + n); return paraTexto(d); }
  function diasNoMes(ano, mes0) { return new Date(ano, mes0 + 1, 0).getDate(); }
  function diaDaSemana(s) { return doTexto(s).getDay(); } // 0 = domingo
  function compara(a, b) { return a < b ? -1 : a > b ? 1 : 0; } // texto AAAA-MM-DD ordena como data

  function formata(s) {
    var d = doTexto(s); if (!d) return '';
    var dd = d.getDate(), mm = d.getMonth() + 1;
    return (dd < 10 ? '0' : '') + dd + '/' + (mm < 10 ? '0' : '') + mm + '/' + d.getFullYear();
  }

  // ---------- repetição ----------
  // tipos: nenhuma, diaria, dias_uteis, semanal, mensal, anual
  // mensal guarda diaMes (1 a 31): em meses mais curtos cai no último dia, sem "escorregar" depois.
  var TIPOS = ['nenhuma', 'diaria', 'dias_uteis', 'semanal', 'mensal', 'anual'];
  var NOMES_REPETICAO = {
    nenhuma: 'Não repete', diaria: 'Todo dia', dias_uteis: 'Dias úteis (seg a sex)',
    semanal: 'Toda semana', mensal: 'Todo mês', anual: 'Todo ano'
  };

  function mesmoDiaNoMes(ano, mes0, diaMes) {
    var dia = Math.min(diaMes, diasNoMes(ano, mes0));
    return paraTexto(new Date(ano, mes0, dia));
  }

  // Próxima data depois de "s" para a repetição "r". Devolve null se não repete.
  function proximaData(s, r) {
    if (!r || !r.tipo || r.tipo === 'nenhuma') return null;
    var d = doTexto(s); if (!d) return null;
    switch (r.tipo) {
      case 'diaria': return somaDias(s, 1);
      case 'dias_uteis': {
        var n = somaDias(s, 1);
        while (diaDaSemana(n) === 0 || diaDaSemana(n) === 6) n = somaDias(n, 1);
        return n;
      }
      case 'semanal': return somaDias(s, 7);
      case 'mensal': {
        var diaMes = r.diaMes || d.getDate();
        var ano = d.getFullYear(), mes0 = d.getMonth() + 1;
        if (mes0 > 11) { mes0 = 0; ano++; }
        return mesmoDiaNoMes(ano, mes0, diaMes);
      }
      case 'anual': {
        var diaA = r.diaMes || d.getDate();
        return mesmoDiaNoMes(d.getFullYear() + 1, r.mes0 != null ? r.mes0 : d.getMonth(), diaA);
      }
    }
    return null;
  }

  // Ao criar ou mudar a repetição, guarda o dia de referência (evita 31 virar 28 para sempre).
  function normalizaRepeticao(r, data) {
    var tipo = r && TIPOS.indexOf(r.tipo) >= 0 ? r.tipo : 'nenhuma';
    var out = { tipo: tipo };
    var d = doTexto(data);
    if ((tipo === 'mensal' || tipo === 'anual') && d) {
      out.diaMes = (r && r.diaMes) || d.getDate();
      if (tipo === 'anual') out.mes0 = (r && r.mes0 != null) ? r.mes0 : d.getMonth();
    }
    return out;
  }

  // Datas em que a tarefa repetida vai acontecer entre "de" e "ate" (inclusive),
  // a partir da data atual dela. A primeira é a própria data da tarefa.
  function ocorrencias(tarefa, de, ate, limite) {
    var out = [];
    if (!tarefa.data) return out;
    var s = tarefa.data, n = 0, max = limite || 400;
    while (s && compara(s, ate) <= 0 && n < max) {
      if (compara(s, de) >= 0) out.push(s);
      if (!tarefa.repeticao || tarefa.repeticao.tipo === 'nenhuma') break;
      s = proximaData(s, tarefa.repeticao);
      n++;
    }
    return out;
  }

  // ---------- tarefas ----------
  var contador = 0;
  function novoId() {
    contador++;
    return 't' + Date.now().toString(36) + contador.toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }

  function criaTarefa(campos, agora) {
    var data = campos.data && doTexto(campos.data) ? campos.data : null;
    return {
      id: campos.id || novoId(),
      titulo: String(campos.titulo || '').trim(),
      listaId: campos.listaId || null,
      data: data,
      importante: !!campos.importante,
      repeticao: data ? normalizaRepeticao(campos.repeticao, data) : { tipo: 'nenhuma' },
      notas: String(campos.notas || ''),
      concluida: false,
      concluidaEm: null,
      criadaEm: (agora || new Date()).toISOString()
    };
  }

  // Conclui a tarefa. Se ela repete, devolve a próxima (para o app incluir na lista).
  function conclui(tarefa, agora) {
    tarefa.concluida = true;
    tarefa.concluidaEm = (agora || new Date()).toISOString();
    if (!tarefa.data || !tarefa.repeticao || tarefa.repeticao.tipo === 'nenhuma') return null;
    var prox = proximaData(tarefa.data, tarefa.repeticao);
    if (!prox) return null;
    var nova = criaTarefa({
      titulo: tarefa.titulo, listaId: tarefa.listaId, data: prox, importante: tarefa.importante,
      repeticao: tarefa.repeticao, notas: tarefa.notas
    }, agora);
    nova.repeticao = JSON.parse(JSON.stringify(tarefa.repeticao));
    tarefa.repeticao = { tipo: 'nenhuma' }; // a concluída vira histórico; quem repete é a nova
    tarefa.serieContinuaEm = nova.id;
    return nova;
  }

  function reabre(tarefa) { tarefa.concluida = false; tarefa.concluidaEm = null; }

  function ordenaPorData(a, b) {
    if (a.data && b.data) { var c = compara(a.data, b.data); if (c) return c; }
    else if (a.data) return -1; else if (b.data) return 1;
    if (a.importante !== b.importante) return a.importante ? -1 : 1;
    return compara(a.criadaEm || '', b.criadaEm || '');
  }

  // Visões: hoje, importante, planejado, todas, concluidas, lista:<id>
  function filtra(tarefas, visao, hojeTxt) {
    var pend = tarefas.filter(function (t) { return !t.concluida; });
    var r;
    if (visao === 'hoje') r = pend.filter(function (t) { return t.data && compara(t.data, hojeTxt) <= 0; });
    else if (visao === 'importante') r = pend.filter(function (t) { return t.importante; });
    else if (visao === 'planejado') r = pend.filter(function (t) { return !!t.data; });
    else if (visao === 'todas') r = pend.slice();
    else if (visao === 'concluidas') {
      return tarefas.filter(function (t) { return t.concluida; })
        .sort(function (a, b) { return compara(b.concluidaEm || '', a.concluidaEm || ''); });
    }
    else if (visao && visao.indexOf('lista:') === 0) {
      var id = visao.slice(6);
      r = pend.filter(function (t) { return t.listaId === id; });
    } else r = pend.slice();
    return r.sort(ordenaPorData);
  }

  // Grupos da visão Planejado.
  function grupoDaData(s, hojeTxt) {
    if (!s) return 'Sem data';
    var c = compara(s, hojeTxt);
    if (c < 0) return 'Atrasadas';
    if (c === 0) return 'Hoje';
    if (s === somaDias(hojeTxt, 1)) return 'Amanhã';
    if (compara(s, somaDias(hojeTxt, 7)) <= 0) return 'Próximos 7 dias';
    return 'Mais adiante';
  }

  function contagens(tarefas, listas, hojeTxt) {
    var c = { hoje: 0, importante: 0, planejado: 0, todas: 0, atrasadas: 0 };
    listas.forEach(function (l) { c['lista:' + l.id] = 0; });
    tarefas.forEach(function (t) {
      if (t.concluida) return;
      c.todas++;
      if (t.importante) c.importante++;
      if (t.data) { c.planejado++; if (compara(t.data, hojeTxt) <= 0) c.hoje++; if (compara(t.data, hojeTxt) < 0) c.atrasadas++; }
      if (t.listaId && c['lista:' + t.listaId] != null) c['lista:' + t.listaId]++;
    });
    return c;
  }

  // ---------- calendário ----------
  // Semanas do mês (domingo a sábado), com os dias de fora do mês para completar a grade.
  function gradeDoMes(ano, mes0) {
    var primeiro = new Date(ano, mes0, 1);
    var inicio = new Date(ano, mes0, 1 - primeiro.getDay());
    var ultimo = new Date(ano, mes0, diasNoMes(ano, mes0));
    var fim = new Date(ano, mes0, diasNoMes(ano, mes0) + (6 - ultimo.getDay()));
    var semanas = [], semana = [];
    for (var d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      semana.push({ data: paraTexto(d), doMes: d.getMonth() === mes0, dia: d.getDate() });
      if (semana.length === 7) { semanas.push(semana); semana = []; }
    }
    return semanas;
  }

  // Itens por dia na faixa "de"-"ate": tarefas reais e as próximas repetições previstas.
  // mostrarConcluidas inclui as concluídas no dia em que venciam.
  function itensDoCalendario(tarefas, de, ate, mostrarConcluidas) {
    var porDia = {};
    function poe(dia, item) { (porDia[dia] = porDia[dia] || []).push(item); }
    tarefas.forEach(function (t) {
      if (!t.data) return;
      if (t.concluida) {
        if (mostrarConcluidas && compara(t.data, de) >= 0 && compara(t.data, ate) <= 0) poe(t.data, { tarefa: t, prevista: false });
        return;
      }
      ocorrencias(t, de, ate).forEach(function (dia) {
        poe(dia, { tarefa: t, prevista: dia !== t.data });
      });
    });
    Object.keys(porDia).forEach(function (k) {
      porDia[k].sort(function (a, b) {
        if (a.prevista !== b.prevista) return a.prevista ? 1 : -1;
        if (a.tarefa.concluida !== b.tarefa.concluida) return a.tarefa.concluida ? 1 : -1;
        if (a.tarefa.importante !== b.tarefa.importante) return a.tarefa.importante ? -1 : 1;
        return compara(a.tarefa.titulo.toLowerCase(), b.tarefa.titulo.toLowerCase());
      });
    });
    return porDia;
  }

  // ---------- dados salvos ----------
  function dadosVazios() { return { versao: 1, listas: [], tarefas: [] }; }

  // Confere e conserta um arquivo de backup antes de usar. Lança erro com mensagem clara.
  function validaDados(obj) {
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.tarefas) || !Array.isArray(obj.listas)) {
      throw new Error('Este arquivo não é um backup do Gestor de Tarefas.');
    }
    var ids = {};
    var listas = obj.listas.filter(function (l) { return l && l.id && l.nome; }).map(function (l) {
      ids[l.id] = true; return { id: String(l.id), nome: String(l.nome), cor: l.cor || '#5E9BD6' };
    });
    var tarefas = obj.tarefas.filter(function (t) { return t && t.id && t.titulo; }).map(function (t) {
      var data = t.data && doTexto(t.data) ? t.data : null;
      return {
        id: String(t.id), titulo: String(t.titulo), listaId: t.listaId && ids[t.listaId] ? t.listaId : null,
        data: data, importante: !!t.importante,
        repeticao: data ? normalizaRepeticao(t.repeticao, data) : { tipo: 'nenhuma' },
        notas: String(t.notas || ''), concluida: !!t.concluida, concluidaEm: t.concluidaEm || null,
        criadaEm: t.criadaEm || new Date().toISOString(), serieContinuaEm: t.serieContinuaEm || undefined
      };
    });
    return { versao: 1, listas: listas, tarefas: tarefas };
  }

  // CSV para o Excel em português: separador ; e BOM no início.
  function paraCSV(dados) {
    var nomes = {}; dados.listas.forEach(function (l) { nomes[l.id] = l.nome; });
    function cel(v) { v = String(v == null ? '' : v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var linhas = [['Tarefa', 'Cliente ou lista', 'Data', 'Repete', 'Importante', 'Situação', 'Concluída em', 'Notas'].join(';')];
    dados.tarefas.slice().sort(ordenaPorData).forEach(function (t) {
      linhas.push([
        cel(t.titulo), cel(nomes[t.listaId] || ''), cel(formata(t.data)),
        cel(NOMES_REPETICAO[(t.repeticao && t.repeticao.tipo) || 'nenhuma']),
        t.importante ? 'Sim' : 'Não', t.concluida ? 'Concluída' : 'Pendente',
        cel(t.concluidaEm ? formata(t.concluidaEm.slice(0, 10)) : ''), cel(t.notas)
      ].join(';'));
    });
    return '﻿' + linhas.join('\r\n');
  }

  // Rotina modelo de BPO para começar (o cliente é uma lista; a pessoa ajusta depois).
  function rotinaModelo(listaId, hojeTxt) {
    var d = doTexto(hojeTxt);
    function proximoDiaDoMes(dia) {
      var s = mesmoDiaNoMes(d.getFullYear(), d.getMonth(), dia);
      if (compara(s, hojeTxt) < 0) {
        var m = d.getMonth() + 1, a = d.getFullYear(); if (m > 11) { m = 0; a++; }
        s = mesmoDiaNoMes(a, m, dia);
      }
      return s;
    }
    function proximoDiaUtil() { var s = hojeTxt; while (diaDaSemana(s) === 0 || diaDaSemana(s) === 6) s = somaDias(s, 1); return s; }
    function proximaSegunda() { var s = hojeTxt; while (diaDaSemana(s) !== 1) s = somaDias(s, 1); return s; }
    var modelos = [
      { titulo: 'Conciliação bancária do dia', data: proximoDiaUtil(), repeticao: { tipo: 'dias_uteis' } },
      { titulo: 'Contas a pagar da semana para aprovação', data: proximaSegunda(), repeticao: { tipo: 'semanal' } },
      { titulo: 'Cobrar clientes em atraso', data: proximaSegunda(), repeticao: { tipo: 'semanal' } },
      { titulo: 'Pedir documentos do mês ao cliente', data: proximoDiaDoMes(1), repeticao: { tipo: 'mensal' } },
      { titulo: 'Fechamento do mês', data: proximoDiaDoMes(5), repeticao: { tipo: 'mensal' }, importante: true },
      { titulo: 'Enviar documentos à contabilidade', data: proximoDiaDoMes(7), repeticao: { tipo: 'mensal' } },
      { titulo: 'Relatório do mês e reunião com o cliente', data: proximoDiaDoMes(10), repeticao: { tipo: 'mensal' }, importante: true }
    ];
    return modelos.map(function (m) { m.listaId = listaId; return criaTarefa(m); });
  }

  var api = {
    doTexto: doTexto, paraTexto: paraTexto, hoje: hoje, somaDias: somaDias, diasNoMes: diasNoMes,
    diaDaSemana: diaDaSemana, compara: compara, formata: formata, TIPOS: TIPOS, NOMES_REPETICAO: NOMES_REPETICAO,
    proximaData: proximaData, normalizaRepeticao: normalizaRepeticao, ocorrencias: ocorrencias,
    novoId: novoId, criaTarefa: criaTarefa, conclui: conclui, reabre: reabre, ordenaPorData: ordenaPorData,
    filtra: filtra, grupoDaData: grupoDaData, contagens: contagens, gradeDoMes: gradeDoMes,
    itensDoCalendario: itensDoCalendario, dadosVazios: dadosVazios, validaDados: validaDados,
    paraCSV: paraCSV, rotinaModelo: rotinaModelo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Logica = api;
})(this);
