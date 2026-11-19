/* Marcas de visita, guardadas no aparelho. Sem armazenamento, o app segue como se fosse a primeira vez. */

const ONBOARDING = 'lombada-boas-vindas';
const OPENED = 'lombada-aberto';

/** O onboarding já foi visto ou pulado. */
export function onboardingSeen(): boolean {
  try {
    return localStorage.getItem(ONBOARDING) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingSeen() {
  try {
    localStorage.setItem(ONBOARDING, '1');
  } catch {
    // Sem armazenamento: o onboarding volta na próxima visita.
  }
}

/** Primeira abertura nesta sessão do navegador (a entrada "Acender" só acontece aqui; revisão D5). */
export function firstOpenOfSession(): boolean {
  try {
    const first = !sessionStorage.getItem(OPENED);
    sessionStorage.setItem(OPENED, '1');
    return first;
  } catch {
    return true;
  }
}
