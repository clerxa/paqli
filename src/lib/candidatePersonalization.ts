/**
 * Helpers de personnalisation pour la page candidate /p/$token.
 * Adapte salutations, placeholders et messages selon le contexte de visite.
 */

export function getFirstName(candidateName: string | null | undefined): string | null {
  if (!candidateName) return null;
  const first = candidateName.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : null;
}

export interface Greeting {
  headline: string;
  subline: string;
}

export function buildGreeting(
  candidateName: string | null,
  openedAt: string | null,
  returnVisits: number,
  offerStatus: string,
  orgName: string,
): Greeting {
  const firstName = getFirstName(candidateName);
  const isReturn = !!openedAt && (returnVisits ?? 0) > 0;
  const hour = new Date().getHours();
  const timeGreeting = hour < 18 ? "Bonjour" : "Bonsoir";

  if (offerStatus === "accepted") {
    return firstName
      ? {
          headline: `Bienvenue dans l'équipe, ${firstName} ! 🎉`,
          subline: "Votre acceptation a bien été enregistrée.",
        }
      : {
          headline: "Bienvenue dans l'équipe ! 🎉",
          subline: "Votre acceptation a bien été enregistrée.",
        };
  }

  if (isReturn && offerStatus === "pending") {
    return firstName
      ? {
          headline: `Content de vous revoir, ${firstName}.`,
          subline: "Votre simulation est toujours disponible.",
        }
      : {
          headline: "Content de vous revoir.",
          subline: "Votre simulation est toujours disponible.",
        };
  }

  if (firstName) {
    return {
      headline: `${timeGreeting} ${firstName},`,
      subline: `${orgName} vous a préparé cette simulation.`,
    };
  }

  return {
    headline: `${timeGreeting},`,
    subline: "Cette page a été préparée pour vous.",
  };
}

export function buildAssistantPlaceholder(
  firstName: string | null,
  hasSimulated: boolean,
  returnVisits: number,
): string {
  if (hasSimulated && returnVisits > 0) {
    return "Vous avez des questions sur votre simulation ?";
  }
  if (firstName) {
    return `${firstName}, avez-vous des questions sur ce package ?`;
  }
  return "Une question sur ce package ou sur le poste ?";
}

export function buildAssistantWelcomeMessage(
  firstName: string | null,
  orgName: string,
  hasEquity: boolean,
): string {
  const name = firstName ? ` ${firstName}` : "";
  if (hasEquity) {
    return (
      `Bonjour${name} ! Je suis là pour vous aider à comprendre ` +
      `votre package chez ${orgName}, notamment les dispositifs d'equity ` +
      `(BSPCE, scénarios de valorisation) et les avantages fiscaux. ` +
      `Posez-moi vos questions en langage simple.`
    );
  }
  return (
    `Bonjour${name} ! Je suis là pour vous aider à comprendre ` +
    `votre package chez ${orgName}. ` +
    `Des questions sur la rémunération, les avantages ou le poste ?`
  );
}
