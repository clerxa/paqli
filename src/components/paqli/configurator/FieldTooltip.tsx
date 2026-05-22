import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";

/**
 * Petite icône (i) à côté d'un label : explication courte au clic.
 */
export function FieldTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center text-grey hover:text-aubergine align-middle"
          aria-label="Aide"
        >
          <HelpCircle size={12} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="text-[12px] max-w-xs leading-relaxed">
        {children}
      </PopoverContent>
    </Popover>
  );
}
