import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";

function Login({ setIsLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsLoggedIn(true); // User berhasil login
    } catch (error) {
      setErrorMessage("Gagal login: " + error.message);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-[var(--glass)] backdrop-blur-[6px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="login-email" className="text-sm">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pixel-frame bg-transparent px-3 py-2 text-[var(--foreground)] focus:border-[var(--aksen-amber)]"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="login-password" className="text-sm">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pixel-frame bg-transparent px-3 py-2 text-[var(--foreground)] focus:border-[var(--aksen-amber)]"
            required
          />
        </div>
        <button
          type="submit"
          className="pixel-btn pixel-btn--primary w-full mt-2"
        >
          Login
        </button>
      </form>
      {errorMessage && (
        <div className="text-red-400 text-xs mt-3 text-center">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

export default Login;
