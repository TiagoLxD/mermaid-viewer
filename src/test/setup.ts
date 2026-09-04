/* Configuração global para todos os testes Vitest.
 * Declara o ambiente como "act-aware" para o React 19 não emitir
 * o warning "The current testing environment is not configured to support act(...)". */
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
