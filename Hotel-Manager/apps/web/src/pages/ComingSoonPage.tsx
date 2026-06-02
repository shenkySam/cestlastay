interface Props {
  title: string;
  phase: number;
  description?: string;
}

export default function ComingSoonPage({ title, phase, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
      <p className="text-gray-500 mt-2 text-sm max-w-sm">
        {description ?? `This section will be built in Phase ${phase}.`}
      </p>
      <span className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Coming in Phase {phase}
      </span>
    </div>
  );
}
