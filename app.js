/* Gestor de Tarefas do BPO: a tela. A lógica de datas está em logica.js. */
(function () {
  'use strict';
  var L = window.Logica;
  var CHAVE = 'gestor-tarefas-bpo:v1';
  var CHAVE_BACKUP = 'gestor-tarefas-bpo:ultimo-backup';
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var SEMANA_CURTA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var CORES = ['#5E9BD6', '#F7C948', '#1F8A4C', '#C2410C', '#7C3AED', '#0E7490', '#DB2777', '#6B7A92'];
  var VISOES = [
    { id: 'hoje', nome: 'Hoje', ic: '☀', sub: 'Atrasadas e as de hoje' },
    { id: 'importante', nome: 'Importante', ic: '★', sub: 'Marcadas com estrela' },
    { id: 'planejado', nome: 'Planejado', ic: '▦', sub: 'Tudo que tem data' },
    { id: 'calendario', nome: 'Calendário', ic: '▤', sub: 'O mês inteiro' },
    { id: 'todas', nome: 'Todas', ic: '≡', sub: 'Todas as pendentes' },
    { id: 'concluidas', nome: 'Concluídas', ic: '✓', sub: 'Histórico do que foi feito' }
  ];

  var dados = L.dadosVazios();
  var podeSalvar = true;
  var estado = { visao: 'hoje', aberta: null, mes: null, ano: null, diaEscolhido: null, mostrarConcluidas: false };
  var desfazer = null, timerAviso = null;

  function $(id) { return document.getElementById(id); }
  function hojeTxt() { return L.hoje(); }

  // cria elemento sem usar innerHTML com texto do usuário
  function el(tag, attrs, filhos) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (filhos || []).forEach(function (f) { if (f != null) e.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
    return e;
  }

  // ---------- guardar ----------
  function carrega() {
    try {
      var s = localStorage.getItem(CHAVE);
      if (s) dados = L.validaDados(JSON.parse(s));
      localStorage.setItem(CHAVE + ':teste', '1'); localStorage.removeItem(CHAVE + ':teste');
    } catch (e) { podeSalvar = false; }
    $('aviso-salvar').hidden = podeSalvar;
  }
  function salva() {
    if (!podeSalvar) return;
    try { localStorage.setItem(CHAVE, JSON.stringify(dados)); }
    catch (e) { podeSalvar = false; $('aviso-salvar').hidden = false; }
  }
  function fotografia() { return JSON.stringify(dados); }
  function mudou(msg, antes) {
    salva(); desenha();
    if (msg) avisa(msg, antes);
  }

  function avisa(msg, antes) {
    clearTimeout(timerAviso);
    $('aviso-texto').textContent = msg;
    desfazer = antes || null;
    $('aviso-desfazer').hidden = !antes;
    $('aviso').hidden = false;
    timerAviso = setTimeout(function () { $('aviso').hidden = true; desfazer = null; }, 6000);
  }

  // ---------- ajudantes ----------
  function lista(id) { for (var i = 0; i < dados.listas.length; i++) if (dados.listas[i].id === id) return dados.listas[i]; return null; }
  function tarefa(id) { for (var i = 0; i < dados.tarefas.length; i++) if (dados.tarefas[i].id === id) return dados.tarefas[i]; return null; }

  function dataAmigavel(s) {
    var h = hojeTxt();
    if (s === h) return 'Hoje';
    if (s === L.somaDias(h, 1)) return 'Amanhã';
    if (s === L.somaDias(h, -1)) return 'Ontem';
    var d = L.doTexto(s);
    var base = SEMANA_CURTA[d.getDay()] + ', ' + L.formata(s).slice(0, 5);
    return d.getFullYear() !== L.doTexto(h).getFullYear() ? base + '/' + d.getFullYear() : base;
  }

  // ---------- menu ----------
  function desenhaMenu() {
    var c = L.contagens(dados.tarefas, dados.listas, hojeTxt());
    var nav = $('visoes'); nav.textContent = '';
    VISOES.forEach(function (v) {
      var qtd = c[v.id];
      var alerta = v.id === 'hoje' && c.atrasadas > 0;
      nav.appendChild(el('button', { type: 'button', class: 'item' + (estado.visao === v.id ? ' ativo' : ''), onclick: function () { mudaVisao(v.id); } }, [
        el('span', { class: 'ic', text: v.ic, 'aria-hidden': 'true' }), el('span', { class: 'nome', text: v.nome }),
        qtd ? el('span', { class: 'qtd' + (alerta ? ' alerta' : ''), text: String(qtd) }) : null
      ]));
    });
    var nl = $('listas'); nl.textContent = '';
    dados.listas.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }).forEach(function (l) {
      var id = 'lista:' + l.id, qtd = c[id];
      nl.appendChild(el('button', { type: 'button', class: 'item' + (estado.visao === id ? ' ativo' : ''), onclick: function () { mudaVisao(id); } }, [
        el('span', { class: 'bolinha', style: 'background:' + l.cor }), el('span', { class: 'nome', text: l.nome }),
        qtd ? el('span', { class: 'qtd', text: String(qtd) }) : null
      ]));
    });
    var ult = null; try { ult = localStorage.getItem(CHAVE_BACKUP); } catch (e) { }
    var info = $('info-backup');
    var dias = ult ? Math.floor((Date.now() - new Date(ult).getTime()) / 86400000) : null;
    info.textContent = ult ? 'Último backup: ' + L.formata(L.hoje(new Date(ult))) : 'Você ainda não salvou um backup.';
    info.className = 'info-backup' + ((dados.tarefas.length && (dias == null || dias >= 7)) ? ' atencao' : '');
  }

  function preencheSelectListas(sel, valor, comVazio) {
    sel.textContent = '';
    if (comVazio) sel.appendChild(el('option', { value: '', text: 'Sem lista' }));
    dados.listas.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }).forEach(function (l) {
      sel.appendChild(el('option', { value: l.id, text: l.nome }));
    });
    sel.value = valor || '';
  }

  // ---------- principal ----------
  function desenha() {
    desenhaMenu();
    var v = VISOES.filter(function (x) { return x.id === estado.visao; })[0];
    var ehLista = estado.visao.indexOf('lista:') === 0;
    var l = ehLista ? lista(estado.visao.slice(6)) : null;
    if (ehLista && !l) { estado.visao = 'hoje'; return desenha(); }
    $('titulo-visao').textContent = l ? l.nome : v.nome;
    $('subtitulo-visao').textContent = l ? 'Tarefas deste cliente ou lista' :
      (estado.visao === 'hoje' ? capitaliza(dataLonga(hojeTxt())) : v.sub);
    $('acoes-lista').hidden = !l;

    // barra de adicionar
    var form = $('form-adicionar');
    form.hidden = estado.visao === 'concluidas';
    var selLista = $('nova-lista-sel');
    preencheSelectListas(selLista, l ? l.id : selLista.value, true);
    selLista.hidden = !!l || dados.listas.length === 0;
    var dataNova = $('nova-data');
    if (!dataNova.dataset.mexida) {
      dataNova.value = estado.visao === 'hoje' ? hojeTxt() : (estado.visao === 'calendario' && estado.diaEscolhido ? estado.diaEscolhido : '');
    }

    var cont = $('conteudo'); cont.textContent = '';
    if (estado.visao === 'calendario') desenhaCalendario(cont);
    else desenhaLista(cont);
    desenhaDetalhe();
  }

  function capitaliza(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function dataLonga(s) {
    var d = L.doTexto(s);
    var nomes = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    return nomes[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()];
  }

  function linhaTarefa(t, opcoes) {
    opcoes = opcoes || {};
    var h = hojeTxt();
    var meta = [];
    if (t.listaId && lista(t.listaId) && estado.visao !== 'lista:' + t.listaId) {
      var li = lista(t.listaId);
      meta.push(el('span', null, [el('span', { class: 'bolinha', style: 'background:' + li.cor + ';display:inline-block;margin:0 4px 0 0' }), li.nome]));
    }
    if (opcoes.prevista) meta.push(el('span', { text: 'Repetição prevista' }));
    if (t.data && !opcoes.semData) {
      var cls = !t.concluida && L.compara(t.data, h) < 0 ? 'atrasada' : (t.data === h ? 'hoje' : '');
      meta.push(el('span', { class: cls, text: (cls === 'atrasada' ? 'Atrasada, ' : '') + dataAmigavel(t.data) }));
    }
    if (t.repeticao && t.repeticao.tipo !== 'nenhuma') meta.push(el('span', { text: '↻ ' + L.NOMES_REPETICAO[t.repeticao.tipo] }));
    if (t.notas) meta.push(el('span', { text: '✎ Notas' }));
    if (t.concluida && t.concluidaEm) meta.push(el('span', { text: 'Concluída em ' + L.formata(L.hoje(new Date(t.concluidaEm))) }));

    var linha = el('div', {
      class: 'tarefa' + (t.concluida ? ' concluida' : '') + (estado.aberta === t.id ? ' selecionada' : ''),
      role: 'button', tabindex: '0', 'aria-label': 'Abrir ' + t.titulo,
      onclick: function () { abre(t.id); },
      onkeydown: function (e) { if (e.key === 'Enter' && e.target === linha) abre(t.id); }
    }, [
      el('button', {
        type: 'button', class: 'circulo' + (t.concluida ? ' feito' : ''), disabled: opcoes.prevista,
        'aria-label': t.concluida ? 'Reabrir tarefa' : 'Concluir tarefa',
        onclick: function (e) { e.stopPropagation(); alternaConcluida(t.id); }
      }),
      el('div', { class: 'texto' }, [el('div', { class: 'titulo', text: t.titulo }), meta.length ? el('div', { class: 'meta' }, meta) : null]),
      el('button', {
        type: 'button', class: 'estrela' + (t.importante ? ' ligada' : ''), 'aria-label': t.importante ? 'Tirar de importante' : 'Marcar como importante',
        'aria-pressed': t.importante ? 'true' : 'false', text: t.importante ? '★' : '☆',
        onclick: function (e) { e.stopPropagation(); alternaImportante(t.id); }
      })
    ]);
    return linha;
  }

  function desenhaLista(cont) {
    var h = hojeTxt();
    var tarefas = L.filtra(dados.tarefas, estado.visao, h);
    if (!tarefas.length) {
      var msgs = {
        hoje: ['Nada para hoje', 'Adicione uma tarefa acima, ou veja o Calendário.'],
        importante: ['Nenhuma tarefa importante', 'Toque na estrela de uma tarefa para trazê-la para cá.'],
        planejado: ['Nenhuma tarefa com data', 'Tarefas com data aparecem aqui, separadas por quando vencem.'],
        todas: ['Nenhuma tarefa pendente', 'Comece criando uma lista por cliente, ou use "Criar rotina modelo de BPO" no menu.'],
        concluidas: ['Nada concluído ainda', 'Quando você concluir uma tarefa, ela fica guardada aqui.']
      };
      var m = msgs[estado.visao] || ['Esta lista está vazia', 'Adicione a primeira tarefa deste cliente acima.'];
      cont.appendChild(el('div', { class: 'vazio' }, [el('b', { text: m[0] }), m[1]]));
      return;
    }
    if (estado.visao === 'planejado' || estado.visao === 'hoje') {
      var grupos = {}, ordem = [];
      tarefas.forEach(function (t) {
        var g = L.grupoDaData(t.data, h);
        if (!grupos[g]) { grupos[g] = []; ordem.push(g); }
        grupos[g].push(t);
      });
      ordem.forEach(function (g) {
        var sec = el('div', { class: 'grupo' + (g === 'Atrasadas' ? ' atrasadas' : '') }, [el('h2', { text: g + ' (' + grupos[g].length + ')' })]);
        grupos[g].forEach(function (t) { sec.appendChild(linhaTarefa(t)); });
        cont.appendChild(sec);
      });
    } else {
      var sec = el('div', { class: 'grupo' });
      tarefas.forEach(function (t) { sec.appendChild(linhaTarefa(t)); });
      cont.appendChild(sec);
    }
  }

  // ---------- calendário ----------
  function desenhaCalendario(cont) {
    var h = hojeTxt(), dh = L.doTexto(h);
    if (estado.ano == null) { estado.ano = dh.getFullYear(); estado.mes = dh.getMonth(); }
    if (!estado.diaEscolhido) estado.diaEscolhido = h;
    var semanas = L.gradeDoMes(estado.ano, estado.mes);
    var de = semanas[0][0].data, ate = semanas[semanas.length - 1][6].data;
    var porDia = L.itensDoCalendario(dados.tarefas, de, ate, estado.mostrarConcluidas);

    var chk = el('input', { type: 'checkbox', id: 'cal-concluidas', onchange: function (e) { estado.mostrarConcluidas = e.target.checked; desenha(); } });
    chk.checked = estado.mostrarConcluidas;
    cont.appendChild(el('div', { class: 'cal-topo' }, [
      el('button', { type: 'button', class: 'btn-icone', 'aria-label': 'Mês anterior', text: '‹', onclick: function () { mudaMes(-1); } }),
      el('h2', { text: capitaliza(MESES[estado.mes]) + ' de ' + estado.ano }),
      el('button', { type: 'button', class: 'btn-icone', 'aria-label': 'Próximo mês', text: '›', onclick: function () { mudaMes(1); } }),
      el('button', { type: 'button', class: 'btn-leve', text: 'Hoje', onclick: function () { estado.ano = dh.getFullYear(); estado.mes = dh.getMonth(); estado.diaEscolhido = h; limpaDataNova(); desenha(); } }),
      el('label', null, [chk, 'Mostrar concluídas'])
    ]));

    var grade = el('div', { class: 'cal-grade', role: 'grid', 'aria-label': 'Calendário de ' + MESES[estado.mes] });
    SEMANA_CURTA.forEach(function (s) { grade.appendChild(el('div', { class: 'cal-semana', role: 'columnheader', text: s })); });
    semanas.forEach(function (sem) {
      sem.forEach(function (d) {
        var itens = porDia[d.data] || [];
        var atrasado = itens.some(function (i) { return !i.prevista && !i.tarefa.concluida && L.compara(d.data, h) < 0; });
        var cel = el('div', {
          class: 'cal-dia' + (d.doMes ? '' : ' fora') + (d.data === h ? ' hoje' : '') + (d.data === estado.diaEscolhido ? ' escolhido' : ''),
          role: 'gridcell', tabindex: '0', 'aria-label': L.formata(d.data) + ', ' + itens.length + ' tarefa(s)',
          onclick: function () { escolheDia(d.data); },
          onkeydown: function (e) { if (e.key === 'Enter') escolheDia(d.data); }
        }, [el('span', { class: 'num', text: String(d.dia) })]);
        itens.slice(0, 3).forEach(function (i) {
          var t = i.tarefa;
          var classes = 'chip' + (i.prevista ? ' prevista' : '') + (t.concluida ? ' concluida' : '') + (t.importante ? ' importante' : '') +
            (!i.prevista && !t.concluida && L.compara(d.data, h) < 0 ? ' atrasada' : '');
          var li = t.listaId ? lista(t.listaId) : null;
          cel.appendChild(el('span', {
            class: classes, title: t.titulo + (li ? ' (' + li.nome + ')' : '') + (i.prevista ? ', repetição prevista' : ''),
            style: li && !i.prevista ? 'border-left-color:' + li.cor : null, text: t.titulo,
            onclick: function (e) { e.stopPropagation(); estado.diaEscolhido = d.data; abre(t.id); }
          }));
        });
        if (itens.length > 3) cel.appendChild(el('span', { class: 'mais-itens', text: '+' + (itens.length - 3) + ' mais' }));
        if (itens.length) cel.appendChild(el('span', { class: 'ponto-qtd' + (atrasado ? ' atrasada' : ''), text: String(itens.length) }));
        grade.appendChild(cel);
      });
    });
    cont.appendChild(grade);
    cont.appendChild(el('div', { class: 'legenda' }, [
      el('span', null, [el('i'), 'Tarefa']), el('span', null, [el('i', { class: 'a' }), 'Atrasada']),
      el('span', null, [el('i', { class: 'p' }), 'Repetição prevista (aparece de verdade quando a anterior for concluída)'])
    ]));

    // tarefas do dia escolhido
    var dia = estado.diaEscolhido;
    var itensDia = L.itensDoCalendario(dados.tarefas, dia, dia, true)[dia] || [];
    var painel = el('div', { class: 'dia-painel' }, [
      el('h3', { text: capitaliza(dataLonga(dia)) + (dia === h ? ' (hoje)' : '') }),
      el('p', { class: 'dica', text: itensDia.length ? 'Toque numa tarefa para ver os detalhes. Para incluir neste dia, use a barra "Adicionar" acima.' : 'Nenhuma tarefa neste dia. Use a barra "Adicionar" acima, a data já está escolhida.' })
    ]);
    itensDia.forEach(function (i) { painel.appendChild(linhaTarefa(i.tarefa, { prevista: i.prevista, semData: true })); });
    cont.appendChild(painel);
  }

  function mudaMes(n) {
    var m = estado.mes + n, a = estado.ano;
    if (m < 0) { m = 11; a--; } else if (m > 11) { m = 0; a++; }
    estado.mes = m; estado.ano = a;
    var dh = L.doTexto(hojeTxt());
    estado.diaEscolhido = (a === dh.getFullYear() && m === dh.getMonth()) ? hojeTxt() : L.paraTexto(new Date(a, m, 1));
    limpaDataNova(); desenha();
  }
  function escolheDia(s) {
    estado.diaEscolhido = s;
    var d = L.doTexto(s);
    if (d.getMonth() !== estado.mes) { estado.mes = d.getMonth(); estado.ano = d.getFullYear(); }
    limpaDataNova(); desenha();
  }
  function limpaDataNova() { delete $('nova-data').dataset.mexida; }

  // ---------- ações ----------
  function mudaVisao(v) {
    estado.visao = v; estado.aberta = null; limpaDataNova();
    if (v === 'calendario') { estado.ano = null; estado.diaEscolhido = hojeTxt(); }
    fechaMenu(); desenha();
    try { history.replaceState(null, '', v.indexOf('lista:') === 0 ? '#lista-' + v.slice(6) : '#' + v); } catch (e) { }
    window.scrollTo(0, 0);
  }
  function visaoDoEndereco() {
    var h = (location.hash || '').slice(1);
    if (VISOES.some(function (v) { return v.id === h; })) return h;
    if (h.indexOf('lista-') === 0 && lista(h.slice(6))) return 'lista:' + h.slice(6);
    return 'hoje';
  }

  function adiciona(e) {
    e.preventDefault();
    var titulo = $('nova-titulo').value.trim();
    if (!titulo) { $('nova-titulo').focus(); return; }
    var listaId = estado.visao.indexOf('lista:') === 0 ? estado.visao.slice(6) : ($('nova-lista-sel').value || null);
    var t = L.criaTarefa({ titulo: titulo, data: $('nova-data').value || null, listaId: listaId, importante: estado.visao === 'importante' });
    dados.tarefas.push(t);
    $('nova-titulo').value = '';
    var mostra = L.filtra(dados.tarefas, estado.visao, hojeTxt()).indexOf(t) >= 0 || estado.visao === 'calendario';
    mudou(mostra ? null : 'Tarefa criada' + (t.data ? ' para ' + L.formata(t.data) : '') + '. Ela aparece em ' + (t.data ? 'Planejado e no Calendário.' : 'Todas.'));
    $('nova-titulo').focus();
  }

  function alternaConcluida(id) {
    var t = tarefa(id); if (!t) return;
    var antes = fotografia();
    if (t.concluida) { L.reabre(t); mudou('Tarefa reaberta.', antes); return; }
    var prox = L.conclui(t);
    if (prox) dados.tarefas.push(prox);
    if (estado.aberta === id) estado.aberta = prox ? prox.id : null;
    mudou(prox ? 'Concluída. A próxima ficou para ' + L.formata(prox.data) + '.' : 'Tarefa concluída.', antes);
  }

  function alternaImportante(id) {
    var t = tarefa(id); if (!t) return;
    t.importante = !t.importante; mudou();
  }

  function abre(id) { estado.aberta = id; desenha(); var c = $('det-titulo'); if (window.innerWidth > 900) c.focus(); }
  function fecha() { estado.aberta = null; desenha(); }

  function desenhaDetalhe() {
    var t = estado.aberta ? tarefa(estado.aberta) : null;
    var painel = $('detalhe'), veu = $('veu-detalhe');
    if (!t) { painel.hidden = true; veu.classList.remove('ativo'); return; }
    painel.hidden = false;
    if (window.innerWidth <= 900) veu.classList.add('ativo');
    var circ = $('det-concluir');
    circ.className = 'circulo' + (t.concluida ? ' feito' : '');
    circ.setAttribute('aria-label', t.concluida ? 'Reabrir tarefa' : 'Concluir tarefa');
    if (document.activeElement !== $('det-titulo')) $('det-titulo').value = t.titulo;
    var est = $('det-importante');
    est.textContent = t.importante ? '★' : '☆'; est.className = 'estrela' + (t.importante ? ' ligada' : '');
    $('det-data').value = t.data || '';
    var rep = $('det-repeticao');
    if (!rep.options.length) L.TIPOS.forEach(function (k) { rep.appendChild(el('option', { value: k, text: L.NOMES_REPETICAO[k] })); });
    rep.value = (t.repeticao && t.repeticao.tipo) || 'nenhuma';
    rep.disabled = !t.data || t.concluida;
    var dica = '';
    if (!t.data) dica = 'Escolha uma data para poder repetir.';
    else if (t.concluida) dica = 'Tarefa concluída. Reabra para mudar a repetição.';
    else if (t.repeticao.tipo === 'mensal') dica = 'Todo dia ' + t.repeticao.diaMes + '. Em meses mais curtos, cai no último dia do mês.';
    else if (t.repeticao.tipo === 'dias_uteis') dica = 'De segunda a sexta. Feriados não são pulados.';
    else if (t.repeticao.tipo !== 'nenhuma') dica = 'Ao concluir, a próxima é criada sozinha.';
    $('det-dica-repeticao').textContent = dica;
    preencheSelectListas($('det-lista'), t.listaId, true);
    if (document.activeElement !== $('det-notas')) $('det-notas').value = t.notas;
    $('det-info').textContent = 'Criada em ' + L.formata(L.hoje(new Date(t.criadaEm))) +
      (t.concluida && t.concluidaEm ? '. Concluída em ' + L.formata(L.hoje(new Date(t.concluidaEm))) + '.' : '.');
  }

  function editaAberta(fn) {
    var t = estado.aberta ? tarefa(estado.aberta) : null;
    if (!t) return;
    fn(t); salva(); desenha();
  }

  // ---------- listas ----------
  function novaLista() {
    var nome = window.prompt('Nome do cliente ou da lista:');
    if (nome == null) return;
    nome = nome.trim().slice(0, 60);
    if (!nome) return;
    var l = { id: 'l' + L.novoId(), nome: nome, cor: CORES[dados.listas.length % CORES.length] };
    dados.listas.push(l);
    salva(); mudaVisao('lista:' + l.id);
  }
  function renomeiaLista() {
    var l = lista(estado.visao.slice(6)); if (!l) return;
    var nome = window.prompt('Novo nome:', l.nome);
    if (nome == null || !nome.trim()) return;
    l.nome = nome.trim().slice(0, 60); mudou();
  }
  function excluiLista() {
    var l = lista(estado.visao.slice(6)); if (!l) return;
    var qtd = dados.tarefas.filter(function (t) { return t.listaId === l.id; }).length;
    if (!window.confirm('Excluir a lista "' + l.nome + '"' + (qtd ? ' e as ' + qtd + ' tarefa(s) dela' : '') + '?')) return;
    var antes = fotografia();
    dados.tarefas = dados.tarefas.filter(function (t) { return t.listaId !== l.id; });
    dados.listas = dados.listas.filter(function (x) { return x.id !== l.id; });
    estado.visao = 'hoje'; estado.aberta = null;
    mudou('Lista excluída.', antes);
  }

  function rotinaModelo() {
    var nome = window.prompt('Para qual cliente é a rotina? Vou criar uma lista com 7 tarefas que se repetem (conciliação, contas a pagar, cobrança, documentos, fechamento, contabilidade e relatório). Depois é só ajustar.', 'Cliente Modelo');
    if (nome == null || !nome.trim()) return;
    var antes = fotografia();
    var l = { id: 'l' + L.novoId(), nome: nome.trim().slice(0, 60), cor: CORES[dados.listas.length % CORES.length] };
    dados.listas.push(l);
    L.rotinaModelo(l.id, hojeTxt()).forEach(function (t) { dados.tarefas.push(t); });
    estado.visao = 'lista:' + l.id; estado.aberta = null; fechaMenu();
    mudou('Rotina criada para ' + l.nome + '.', antes);
  }

  // ---------- backup ----------
  function baixa(nome, conteudo, tipo) {
    var blob = new Blob([conteudo], { type: tipo });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: nome });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function salvaBackup() {
    baixa('backup-tarefas-' + hojeTxt() + '.json', JSON.stringify(dados, null, 1), 'application/json');
    try { localStorage.setItem(CHAVE_BACKUP, new Date().toISOString()); } catch (e) { }
    desenhaMenu();
    avisa('Backup salvo na pasta de Downloads. Guarde num lugar seguro.');
  }
  function restauraBackup(arquivo) {
    var leitor = new FileReader();
    leitor.onload = function () {
      try {
        var novos = L.validaDados(JSON.parse(leitor.result));
        if (!window.confirm('Restaurar este backup com ' + novos.tarefas.length + ' tarefa(s) e ' + novos.listas.length + ' lista(s)? O que está na tela agora será substituído.')) return;
        var antes = fotografia();
        dados = novos; estado.aberta = null; estado.visao = 'hoje';
        mudou('Backup restaurado.', antes);
      } catch (e) {
        window.alert(e instanceof SyntaxError ? 'Este arquivo não é um backup do Gestor de Tarefas.' : e.message);
      }
    };
    leitor.readAsText(arquivo);
  }

  // ---------- menu no celular ----------
  function abreMenu() { $('menu').classList.add('aberto'); $('veu-menu').classList.add('ativo'); }
  function fechaMenu() { $('menu').classList.remove('aberto'); $('veu-menu').classList.remove('ativo'); }

  // ---------- ligar tudo ----------
  function liga() {
    $('form-adicionar').addEventListener('submit', adiciona);
    $('nova-data').addEventListener('change', function () { this.dataset.mexida = '1'; });
    $('nova-lista').addEventListener('click', novaLista);
    $('renomear-lista').addEventListener('click', renomeiaLista);
    $('excluir-lista').addEventListener('click', excluiLista);
    $('rotina-modelo').addEventListener('click', rotinaModelo);
    $('salvar-backup').addEventListener('click', salvaBackup);
    $('restaurar-backup').addEventListener('click', function () { $('arquivo-backup').click(); });
    $('arquivo-backup').addEventListener('change', function () { if (this.files[0]) restauraBackup(this.files[0]); this.value = ''; });
    $('exportar-excel').addEventListener('click', function () { baixa('tarefas-' + hojeTxt() + '.csv', L.paraCSV(dados), 'text/csv;charset=utf-8'); });
    $('abrir-menu').addEventListener('click', abreMenu);
    $('veu-menu').addEventListener('click', fechaMenu);
    $('veu-detalhe').addEventListener('click', fecha);
    $('det-fechar').addEventListener('click', fecha);
    $('det-concluir').addEventListener('click', function () { if (estado.aberta) alternaConcluida(estado.aberta); });
    $('det-importante').addEventListener('click', function () { if (estado.aberta) alternaImportante(estado.aberta); });
    $('det-titulo').addEventListener('change', function () {
      var v = this.value.trim();
      editaAberta(function (t) { if (v) t.titulo = v.slice(0, 200); });
    });
    $('det-titulo').addEventListener('keydown', function (e) { if (e.key === 'Enter') this.blur(); });
    $('det-data').addEventListener('change', function () {
      var v = this.value;
      editaAberta(function (t) {
        t.data = v && L.doTexto(v) ? v : null;
        t.repeticao = t.data ? L.normalizaRepeticao({ tipo: t.repeticao.tipo }, t.data) : { tipo: 'nenhuma' };
      });
    });
    $('det-repeticao').addEventListener('change', function () {
      var v = this.value;
      editaAberta(function (t) { if (t.data) t.repeticao = L.normalizaRepeticao({ tipo: v }, t.data); });
    });
    $('det-lista').addEventListener('change', function () {
      var v = this.value;
      editaAberta(function (t) { t.listaId = v || null; });
    });
    $('det-notas').addEventListener('input', function () {
      var t = estado.aberta ? tarefa(estado.aberta) : null;
      if (t) { t.notas = this.value; salva(); }
    });
    $('det-notas').addEventListener('change', function () { desenha(); });
    $('det-excluir').addEventListener('click', function () {
      var t = estado.aberta ? tarefa(estado.aberta) : null; if (!t) return;
      var antes = fotografia();
      dados.tarefas = dados.tarefas.filter(function (x) { return x.id !== t.id; });
      estado.aberta = null;
      mudou('Tarefa excluída.', antes);
    });
    $('aviso-desfazer').addEventListener('click', function () {
      if (!desfazer) return;
      dados = L.validaDados(JSON.parse(desfazer)); desfazer = null; estado.aberta = null;
      $('aviso').hidden = true; salva(); desenha();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (estado.aberta) fecha(); fechaMenu(); } });
    // outra aba mudou os dados
    window.addEventListener('storage', function (e) { if (e.key === CHAVE) { carrega(); desenha(); } });
    // virou o dia com a página aberta
    var diaAtual = hojeTxt();
    setInterval(function () { if (hojeTxt() !== diaAtual) { diaAtual = hojeTxt(); desenha(); } }, 60000);
    window.addEventListener('resize', function () { if (estado.aberta) desenhaDetalhe(); });
  }

  carrega();
  liga();
  estado.visao = visaoDoEndereco();
  if (estado.visao === 'calendario') estado.diaEscolhido = hojeTxt();
  desenha();
  window.addEventListener('hashchange', function () { var v = visaoDoEndereco(); if (v !== estado.visao) mudaVisao(v); });
  window.GestorTarefas = { dados: function () { return dados; } }; // para conferência
})();
