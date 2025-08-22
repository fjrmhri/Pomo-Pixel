import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { db, auth } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";

function Register({ setIsLoggedIn }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMessage("Password tidak cocok!");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      await updateProfile(user, { displayName: name });
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        totalTime: 0,
        timeStudied: 0,
        timeOnBreak: 0,
      });
      setIsLoggedIn(true); // Successfully logged in
    } catch (error) {
      setErrorMessage("Terjadi kesalahan: " + error.message);
    }
  };

  return (
    <div className="pixel-card w-full max-w-md mx-auto p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="register-name" className="text-sm">
            Nama
          </label>
          <input
            id="register-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pixel-frame bg-transparent px-3 py-2 text-[var(--foreground)] focus:border-[var(--aksen-amber)]"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="register-email" className="text-sm">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pixel-frame bg-transparent px-3 py-2 text-[var(--foreground)] focus:border-[var(--aksen-amber)]"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="register-password" className="text-sm">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pixel-frame bg-transparent px-3 py-2 text-[var(--foreground)] focus:border-[var(--aksen-amber)]"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="register-confirm" className="text-sm">
            Confirm Password
          </label>
          <input
            id="register-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pixel-frame bg-transparent px-3 py-2 text-[var(--foreground)] focus:border-[var(--aksen-amber)]"
            required
          />
        </div>
        <button
          type="submit"
          className="pixel-btn pixel-btn--primary w-full mt-2"
        >
          Register
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

export default Register;
