interface Opt {
  value: string;
  label: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[12px] text-aubergine-light font-medium">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-[13px] mt-1 px-3 py-2 rounded-md border border-[rgba(45,38,64,0.15)] focus:outline-none focus:border-aubergine bg-white"
      >
        <option value="">{placeholder ?? "— Sélectionner —"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div>
        <div className="text-[13px] text-aubergine font-medium">{label}</div>
        {hint && <div className="text-[11px] text-grey mt-0.5">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="relative inline-flex items-center rounded-full transition-colors shrink-0"
        style={{
          width: 36,
          height: 20,
          background: value ? "#2D2640" : "#D4CFC9",
        }}
      >
        <span
          className="inline-block rounded-full bg-white transition-transform"
          style={{
            width: 16,
            height: 16,
            transform: value ? "translateX(18px)" : "translateX(2px)",
          }}
        />
      </button>
    </div>
  );
}
