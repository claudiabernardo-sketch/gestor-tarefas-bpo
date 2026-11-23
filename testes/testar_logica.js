// Testes da lógica do Gestor de Tarefas. Rode com: node testes/testar_logica.js
var L = require('../logica.js');
var falhas = 0, total = 0;
function igual(obtido, esperado, nome) {
  total++;
  var a = JSON.stringify(obtido), b = JSON.stringify(esperado);
  if (a !== b) { falhas++; console.log('FALHOU: ' + nome + '\n  esperado ' + b + '\n  obtido   ' + a); }
}

// datas
igual(L.doTexto('2026-02-30'), null, 'data inválida 30/02');
igual(L.doTexto('abc'), null, 'texto qualquer');
igual(L.paraTexto(L.doTexto('2026-11-23')), '2026-11-23', 'ida e volta');
igual(L.somaDias('2026-12-31', 1), '2027-01-01', 'virada de ano');
igual(L.somaDias('2028-02-28', 1), '2028-02-29', 'ano bissexto');
igual(L.formata('2026-01-05'), '05/01/2026', 'formato brasileiro');
igual(L.hoje(new Date(2026, 10, 23, 23, 59)), '2026-11-23', 'hoje às 23h59');
igual(L.diaDaSemana('2026-11-23'), 1, '23/11/2026 é segunda');

// repetição
igual(L.proximaData('2026-11-23', { tipo: 'diaria' }), '2026-11-24', 'diária');
igual(L.proximaData('2026-11-27', { tipo: 'dias_uteis' }), '2026-11-30', 'dia útil: sexta vai para segunda');
igual(L.proximaData('2026-11-28', { tipo: 'dias_uteis' }), '2026-11-30', 'dia útil: sábado vai para segunda');
igual(L.proximaData('2026-11-23', { tipo: 'semanal' }), '2026-11-30', 'semanal');
igual(L.proximaData('2026-12-28', { tipo: 'semanal' }), '2027-01-04', 'semanal na virada do ano');
igual(L.proximaData('2026-11-05', { tipo: 'mensal', diaMes: 5 }), '2026-12-05', 'mensal dia 5');
igual(L.proximaData('2026-12-05', { tipo: 'mensal', diaMes: 5 }), '2027-01-05', 'mensal na virada do ano');
igual(L.proximaData('2027-01-31', { tipo: 'mensal', diaMes: 31 }), '2027-02-28', 'dia 31 em fevereiro cai no 28');
igual(L.proximaData('2027-02-28', { tipo: 'mensal', diaMes: 31 }), '2027-03-31', 'depois de fevereiro volta ao 31');
igual(L.proximaData('2028-01-30', { tipo: 'mensal', diaMes: 30 }), '2028-02-29', 'dia 30 em fevereiro bissexto');
igual(L.proximaData('2028-02-29', { tipo: 'anual', diaMes: 29, mes0: 1 }), '2029-02-28', 'anual 29/02 em ano comum');
igual(L.proximaData('2029-02-28', { tipo: 'anual', diaMes: 29, mes0: 1 }), '2030-02-28', 'anual segue no 28');
igual(L.proximaData('2026-11-23', { tipo: 'nenhuma' }), null, 'não repete');
igual(L.normalizaRepeticao({ tipo: 'mensal' }, '2026-01-31'), { tipo: 'mensal', diaMes: 31 }, 'guarda o dia 31');
igual(L.normalizaRepeticao({ tipo: 'xyz' }, '2026-01-31'), { tipo: 'nenhuma' }, 'tipo desconhecido vira nenhuma');

// ocorrências no mês
var t = L.criaTarefa({ titulo: 'Fechamento', data: '2026-11-05', repeticao: { tipo: 'mensal' } });
igual(L.ocorrencias(t, '2026-11-01', '2027-02-28'), ['2026-11-05', '2026-12-05', '2027-01-05', '2027-02-05'], 'mensal em 4 meses');
var u = L.criaTarefa({ titulo: 'Conciliação', data: '2026-11-27', repeticao: { tipo: 'dias_uteis' } });
igual(L.ocorrencias(u, '2026-11-27', '2026-12-02'), ['2026-11-27', '2026-11-30', '2026-12-01', '2026-12-02'], 'dias úteis pulam o fim de semana');
igual(L.ocorrencias(L.criaTarefa({ titulo: 'x', data: '2026-11-10' }), '2026-11-01', '2026-11-30'), ['2026-11-10'], 'sem repetição aparece uma vez');
igual(L.ocorrencias(L.criaTarefa({ titulo: 'x' }), '2026-11-01', '2026-11-30'), [], 'sem data não aparece');

// concluir tarefa que repete cria a próxima
var r = L.criaTarefa({ titulo: 'Relatório', data: '2027-01-31', repeticao: { tipo: 'mensal' }, importante: true, notas: 'n' });
var prox = L.conclui(r);
igual(r.concluida, true, 'concluída');
igual(prox.data, '2027-02-28', 'próxima no fim de fevereiro');
igual(prox.repeticao, { tipo: 'mensal', diaMes: 31 }, 'próxima continua lembrando do dia 31');
igual([prox.importante, prox.notas, prox.concluida], [true, 'n', false], 'próxima copia importante e notas, pendente');
igual(L.conclui(prox).data, '2027-03-31', 'e depois volta ao 31');
igual(r.repeticao.tipo, 'nenhuma', 'a concluída não gera previsões no calendário');
igual(L.conclui(L.criaTarefa({ titulo: 'avulsa', data: '2026-11-23' })), null, 'avulsa não cria próxima');

// filtros
var hojeTxt = '2026-11-23';
var lista = { id: 'c1', nome: 'Padaria' };
var ts = [
  L.criaTarefa({ titulo: 'atrasada', data: '2026-11-20' }),
  L.criaTarefa({ titulo: 'hoje', data: '2026-11-23', listaId: 'c1' }),
  L.criaTarefa({ titulo: 'amanhã', data: '2026-11-24', importante: true }),
  L.criaTarefa({ titulo: 'sem data' })
];
var feita = L.criaTarefa({ titulo: 'feita', data: '2026-11-22' }); L.conclui(feita); ts.push(feita);
function titulos(a) { return a.map(function (x) { return x.titulo; }); }
igual(titulos(L.filtra(ts, 'hoje', hojeTxt)), ['atrasada', 'hoje'], 'Hoje mostra atrasadas e de hoje');
igual(titulos(L.filtra(ts, 'importante', hojeTxt)), ['amanhã'], 'Importante');
igual(titulos(L.filtra(ts, 'planejado', hojeTxt)), ['atrasada', 'hoje', 'amanhã'], 'Planejado só com data');
igual(titulos(L.filtra(ts, 'todas', hojeTxt)), ['atrasada', 'hoje', 'amanhã', 'sem data'], 'Todas, sem data por último');
igual(titulos(L.filtra(ts, 'lista:c1', hojeTxt)), ['hoje'], 'lista do cliente');
igual(titulos(L.filtra(ts, 'concluidas', hojeTxt)), ['feita'], 'Concluídas');
igual(L.grupoDaData('2026-11-20', hojeTxt), 'Atrasadas', 'grupo atrasadas');
igual(L.grupoDaData('2026-11-24', hojeTxt), 'Amanhã', 'grupo amanhã');
igual(L.grupoDaData('2026-11-30', hojeTxt), 'Próximos 7 dias', 'grupo 7 dias');
igual(L.grupoDaData('2026-12-15', hojeTxt), 'Mais adiante', 'grupo adiante');
var c = L.contagens(ts, [lista], hojeTxt);
igual([c.hoje, c.importante, c.planejado, c.todas, c.atrasadas, c['lista:c1']], [2, 1, 3, 4, 1, 1], 'contagens do menu');

// calendário
var g = L.gradeDoMes(2026, 10); // novembro de 2026 começa num domingo
igual(g[0][0], { data: '2026-11-01', doMes: true, dia: 1 }, 'novembro/2026 começa no domingo');
igual(g.length, 5, 'novembro/2026 tem 5 semanas');
igual(g[g.length - 1][6].data, '2026-12-05', 'grade termina no sábado');
var g2 = L.gradeDoMes(2027, 1); // fevereiro de 2027
igual(g2[0][0].data, '2027-01-31', 'fevereiro/2027 começa com 31/01 na grade');
g2.forEach(function (s, i) { igual(s.length, 7, 'semana ' + i + ' com 7 dias'); });
var itens = L.itensDoCalendario([t, u, feita], '2026-11-01', '2026-12-05', true);
igual(itens['2026-11-05'].map(function (i) { return i.prevista; }), [false], 'tarefa real no dia 05');
igual(itens['2026-12-05'].map(function (i) { return i.prevista; }), [true], 'repetição prevista em 05/12');
igual(itens['2026-11-22'].length, 1, 'concluída aparece se pedir');
igual(L.itensDoCalendario([feita], '2026-11-01', '2026-11-30', false)['2026-11-22'], undefined, 'concluída some se não pedir');
igual(itens['2026-11-28'], undefined, 'conciliação não aparece no sábado');

// backup
var dados = { versao: 1, listas: [lista], tarefas: ts };
var volta = L.validaDados(JSON.parse(JSON.stringify(dados)));
igual(volta.tarefas.length, 5, 'backup volta inteiro');
igual(L.validaDados({ listas: [], tarefas: [{ id: 'a', titulo: 'x', listaId: 'sumiu', data: '2026-02-31', criadaEm: 'z' }] }).tarefas[0],
  { id: 'a', titulo: 'x', listaId: null, data: null, importante: false, repeticao: { tipo: 'nenhuma' }, notas: '', concluida: false, concluidaEm: null, criadaEm: 'z' },
  'backup conserta lista que sumiu e data inválida');
var erro = ''; try { L.validaDados({ coisa: 1 }); } catch (e) { erro = e.message; }
igual(erro, 'Este arquivo não é um backup do Gestor de Tarefas.', 'arquivo errado dá mensagem clara');
var csv = L.paraCSV({ listas: [lista], tarefas: [L.criaTarefa({ titulo: 'Pagar; "luz"', data: '2026-11-23', listaId: 'c1' })] });
igual(csv.charCodeAt(0), 0xFEFF, 'CSV com BOM para o Excel');
igual(csv.split('\r\n')[1].split(';').slice(0, 1)[0], '"Pagar', 'título com ; vai entre aspas');
igual(csv.indexOf('"Pagar; ""luz"""') > 0, true, 'aspas dobradas no CSV');

// rotina modelo
var modelo = L.rotinaModelo('c1', '2026-11-28'); // sábado
igual(modelo.length, 7, 'rotina modelo com 7 tarefas');
igual(modelo[0].data, '2026-11-30', 'conciliação começa no próximo dia útil');
igual(modelo[3].data, '2026-12-01', 'pedir documentos no dia 1 do mês seguinte');
igual(modelo[4].data, '2026-12-05', 'fechamento no próximo dia 5');
igual(modelo.every(function (m) { return m.listaId === 'c1'; }), true, 'todas na lista do cliente');

console.log(falhas ? '\n' + falhas + ' de ' + total + ' testes falharam' : 'ok, ' + total + ' testes passaram');
process.exit(falhas ? 1 : 0);
