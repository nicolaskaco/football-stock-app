import { Stethoscope } from 'lucide-react';

const getColor = (hasta) => {
  if (!hasta) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hastaDate = new Date(hasta + 'T00:00:00');
  const diffDays = Math.floor((hastaDate - today) / 86_400_000);
  if (diffDays < 0) return 'text-red-500';
  if (diffDays <= 30) return 'text-orange-400';
  return 'text-green-500';
};

export function FichaMedicaIcon({ hasta }) {
  const color = getColor(hasta);
  if (!color) return null;
  const [y, m, d] = hasta.split('-');
  const label = `Ficha médica hasta ${d}/${m}/${y}`;
  return (
    <span title={label} className="inline-flex">
      <Stethoscope className={`w-3.5 h-3.5 ${color}`} />
    </span>
  );
}
