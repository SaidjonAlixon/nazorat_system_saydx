import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok) {
        setError(data.message || "Login yoki parol noto'g'ri");
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Server bilan bog'lanishda xato");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm pt-16">
        <img
          src="/logo.png"
          alt="SAYD.X"
          className="w-48 h-48 sm:w-56 sm:h-56 mx-auto mb-6 rounded-2xl object-contain"
        />
        <p className="text-muted-foreground text-center text-sm mb-6">Tizimga kirish</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">Login</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoComplete="username"
              className="glass-input text-white h-12"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">Parol</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="glass-input text-white h-12"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
          >
            {loading ? "Kirilmoqda..." : "Kirish"}
          </Button>
        </form>
      </div>
    </div>
  );
}
