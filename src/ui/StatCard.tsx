// src/ui/StatCard.tsx
export default function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center bg-gray-50 rounded-lg py-3 px-2">
      <div className="text-base font-bold text-gray-800">{value}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
