const STEPS = [
  "Connect your wallet with email or social login.",
  "Get a little G$ — claim or receive from a friend.",
  "Enter one daily market with a simple yes/no pick.",
  "Wait for the result — we explain what happened in plain English.",
  "Claim any quest rewards and invite a friend.",
];

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-lg p-4 space-y-4">
      <h1 className="text-2xl font-bold">Learn to Predict</h1>
      <p className="text-muted-foreground">A short path from zero to your first resolved market.</p>
      <ol className="list-decimal list-inside space-y-2 text-sm">
        {STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
