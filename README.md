# Gestor de Tarefas do BPO

Um gestor de tarefas simples, no estilo do Microsoft To Do, feito para a rotina do BPO Financeiro: uma lista por cliente, tarefas que se repetem sozinhas e o calendário do mês inteiro.

**Para usar, é só abrir:** https://claudiabernardo-sketch.github.io/gestor-tarefas-bpo/

Não precisa instalar nada nem criar conta. Funciona no computador e no celular.

## O que ele faz

- **Hoje, Importante, Planejado, Todas e Concluídas**, como no To Do.
- **Uma lista por cliente** (ou por assunto), cada uma com a sua cor.
- **Tarefas que se repetem**: todo dia, dias úteis, toda semana, todo mês ou todo ano. Ao concluir, a próxima é criada sozinha. "Todo dia 31" cai no último dia dos meses mais curtos e volta ao 31 depois.
- **Calendário do mês**, com as tarefas de cada dia e as próximas repetições previstas.
- **Rotina modelo de BPO**: cria, para um cliente, 7 tarefas que se repetem (conciliação, contas a pagar, cobrança, documentos, fechamento, contabilidade e relatório). Depois é só ajustar.
- **Desfazer** logo depois de concluir, excluir ou restaurar.
- **Backup** em arquivo e **exportação para Excel**.

## Onde ficam os seus dados

**Só no navegador do seu computador.** Nada vai para um servidor, nem para a Cláudia, nem para o GitHub. Por isso:

- Em outro computador, ou em outro navegador, a lista começa vazia. Use **Salvar backup** e **Restaurar backup** para levar as tarefas.
- Se você limpar os dados do navegador, as tarefas somem. **Salve um backup toda semana** (o menu avisa quando faz mais de 7 dias).
- No modo anônimo nada fica guardado; o app avisa.

## Usar sem internet (opcional)

Peça ao Claude (aba Code) ou ao ChatGPT (modo Work), numa pasta vazia:

```
Baixe https://github.com/claudiabernardo-sketch/gestor-tarefas-bpo para esta pasta e abra o index.html no navegador
```

Atenção: a versão aberta pelo arquivo guarda as tarefas separada da versão do link. Escolha uma e use sempre a mesma.

## Para quem quer conferir o código

- `logica.js`: datas, repetição, filtros e backup, sem tela.
- `app.js`: a tela.
- `testes/testar_logica.js`: 70 testes da lógica. Rode com `node testes/testar_logica.js`.

---

Feito por Cláudia Bernardo para o BPO Financeiro. Gratuito, licença MIT, distribuído sem garantia.
