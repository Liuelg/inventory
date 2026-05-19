import { useState } from "react";
import { authClient } from "../lib/auth-client";


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await authClient.signIn.email({
      email,
      password,
      callbackURL: "/dashboard"
    });
  };

  return (
    <form onSubmit={handleSignIn}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Sign In</button>
    </form>
  );
}