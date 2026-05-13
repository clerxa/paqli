import { cn } from "@/lib/utils";

export function Chip({
  selected,
  disabled,
  onClick,
  children,
  className,
}: {
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "text-[12px] px-3 py-1.5 rounded-full border transition-colors",
        selected
          ? "bg-aubergine text-lin border-aubergine"
          : "bg-white text-aubergine-light border-[rgba(45,38,64,0.15)] hover:border-aubergine",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  suffix,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  suffix?: string;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="text-[12px] text-aubergine-light font-medium">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <div className="relative mt-1">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={placeholder}
          className="w-full text-[13px] px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-grey">
            {suffix}
          </span>
        )}
      </div>
      {hint && <span className="text-[11px] text-grey mt-1 block">{hint}</span>}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  maxLength = 120,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[12px] text-aubergine-light font-medium">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white"
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 500,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[12px] text-aubergine-light font-medium">
        {label}
      </span>
      <textarea
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white resize-none"
      />
    </label>
  );
}

export function EduBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[12px] rounded-md px-3 py-2.5 leading-relaxed"
      style={{ background: "#F0EBE8", color: "#3D3554" }}
    >
      <span className="mr-2">💡</span>
      {children}
    </div>
  );
}

export function WarnBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[12px] rounded-md px-3 py-2.5 leading-relaxed"
      style={{ background: "#FCEEE6", color: "#7A3F0E" }}
    >
      <span className="mr-2">⚠️</span>
      {children}
    </div>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-grey mt-1">{children}</div>;
}
