import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, Sparkles, Send, Loader2 } from "lucide-react";
import { REGIME_KNOWLEDGE, FAQ, GLOSSARY } from "@/lib/vega/knowledge";
import { askEquityCoachFn } from "@/lib/equityCoach.functions";
import { toast } from "sonner";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export function EquityKnowledgePanel({
  packageContext,
  trigger,
}: {
  packageContext?: string;
  trigger?: React.ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[12px] text-aubergine hover:text-aubergine-dark underline"
          >
            <BookOpen size={14} />
            Comprendre l'equity
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-aubergine">
            Comprendre l'equity
          </SheetTitle>
          <p className="text-[12px] text-grey">
            Fiches régimes, FAQ, glossaire et assistant IA pour répondre aux
            candidats.
          </p>
        </SheetHeader>

        <Tabs defaultValue="regimes" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="regimes">Régimes</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="glossaire">Glossaire</TabsTrigger>
            <TabsTrigger value="coach">
              <Sparkles size={12} className="mr-1" />
              Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="regimes" className="space-y-4 mt-4">
            {Object.values(REGIME_KNOWLEDGE).map((r) => (
              <div
                key={r.regime}
                className="rounded-lg border border-[rgba(45,38,64,0.08)] p-4 bg-white"
              >
                <h3 className="text-[14px] font-medium text-aubergine">{r.titre}</h3>
                <p className="text-[12px] text-grey mt-1">
                  <strong>Concerne :</strong> {r.qui}
                </p>
                <p className="text-[12px] text-grey mt-2">
                  <strong>Fiscalité :</strong> {r.fiscalite}
                </p>
                <p
                  className="text-[12px] mt-2 px-2 py-1.5 rounded"
                  style={{ background: "#F0EBE8", color: "#3D3554" }}
                >
                  💡 {r.exemple}
                </p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="faq" className="space-y-3 mt-4">
            {FAQ.map((f, i) => (
              <details
                key={i}
                className="rounded-lg border border-[rgba(45,38,64,0.08)] bg-white"
              >
                <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium text-aubergine">
                  {f.question}
                </summary>
                <p className="px-4 pb-3 text-[12px] text-grey">{f.answer}</p>
              </details>
            ))}
          </TabsContent>

          <TabsContent value="glossaire" className="mt-4">
            <dl className="space-y-3">
              {GLOSSARY.map((g) => (
                <div
                  key={g.term}
                  className="rounded border border-[rgba(45,38,64,0.06)] p-3 bg-white"
                >
                  <dt className="text-[13px] font-medium text-aubergine">
                    {g.term}
                  </dt>
                  <dd className="text-[12px] text-grey mt-1">{g.definition}</dd>
                </div>
              ))}
            </dl>
          </TabsContent>

          <TabsContent value="coach" className="mt-4">
            <EquityCoachChat packageContext={packageContext} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function EquityCoachChat({ packageContext }: { packageContext?: string }) {
  const ask = useServerFn(askEquityCoachFn);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Bonjour 👋 Posez-moi une question sur l'equity : régimes fiscaux, TMI, BSPCE vs RSU, vesting, comment expliquer telle ou telle règle à un candidat…",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const SUGGESTIONS = [
    "Différence entre AGA post-2018 et RSU non qualifiée ?",
    "Comment expliquer le seuil 300 k€ simplement ?",
    "Mon candidat a un TMI de 41 %, PFU ou barème ?",
    "Pourquoi le PV de cession est en PFU systématique ?",
  ];

  const send = async (q: string) => {
    if (!q.trim() || loading) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: q.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { answer } = await ask({
        data: {
          question: q.trim(),
          packageContext,
          history: messages
            .filter((_, i) => i > 0) // exclut le bonjour initial
            .map((m) => ({ role: m.role, content: m.content })),
        },
      });
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch (e) {
      console.error(e);
      toast.error("L'assistant est indisponible. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-[12.5px] rounded-lg px-3 py-2 max-w-[90%] whitespace-pre-wrap ${
              m.role === "assistant"
                ? "bg-[#F0EBE8] text-aubergine"
                : "ml-auto bg-aubergine text-lin"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="text-[12px] text-grey flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" />
            L'assistant réfléchit…
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-[11px] text-grey">Suggestions :</div>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={loading}
              className="block w-full text-left text-[12px] text-aubergine px-2 py-1.5 rounded hover:bg-[#F0EBE8] border border-[rgba(45,38,64,0.08)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pose ta question equity…"
          className="flex-1 text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3 py-2 rounded-md bg-aubergine text-lin text-[12px] disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </form>

      <p className="text-[10px] text-grey mt-2 italic">
        L'assistant donne des informations indicatives, pas de conseil financier
        formel. La fiscalité réelle dépend de la situation personnelle.
      </p>
    </div>
  );
}
