import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import "../../styles/SettingsForm.css";

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
    <div className="Sf">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="Sf__group">
          <label htmlFor="login-email" className="Sf__label">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="Sf__number"
            required
          />
        </div>
        <div className="Sf__group">
          <label htmlFor="login-password" className="Sf__label">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="Sf__number"
            required
          />
        </div>
        <button
          type="submit"
          className="Sf__btn Sf__btn--primary w-full mt-2"
        >
          Login
        </button>
      </form>
      {errorMessage && <div className="Sf__error">{errorMessage}</div>}
    </div>
  );
}

export default Login;
