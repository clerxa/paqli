interface MetricCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
}

export function MetricCard({ label, value, delta }: MetricCardProps) {
  return (
    <div
      className="rounded-[10px] px-4 py-[14px]"
      style={{ background: "#F0EBE8" }}
    >
      <div className="text-[11px] text-grey font-medium uppercase tracking-wider">
        {label}
      </div>
      <div
        className="font-display mt-1 text-aubergine"
        style={{ fontSize: 28, lineHeight: 1.1 }}
      >
        {value}
      </div>
      {delta && (
        <div
          className="text-[11px] mt-1"
          style={{ color: delta.positive ? "#3B6D11" : "#9B97A0" }}
        >
          {delta.value}
        </div>
      )}
    </div>
  );
}
