import Link from "next/link";

export default function Home() {
  return (
    <div className="p-2">
      <header className="flex text-2xl">
        <h1 className="flex-1">AETHER AI</h1>
        <Link href="/dashboard" className="text-white">Dashboard</Link>
      </header>
      <main>
        <div className="flex">
          <div className="m-56">
            <p className="text-white">Powered by Anthropic LLM</p>
          </div>
          <div className="m-56">
            <p className="text-white">Integrates IBM WxFlows</p>
          </div>
        </div>
      </main>
    </div>
  );
}
