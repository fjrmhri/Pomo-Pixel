import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { db, auth } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import "../../styles/SettingsForm.css";

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
    <div className="Sf">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="Sf__group">
          <label htmlFor="register-name" className="Sf__label">
            Nama
          </label>
          <input
            id="register-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="Sf__number"
            required
          />
        </div>
        <div className="Sf__group">
          <label htmlFor="register-email" className="Sf__label">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="Sf__number"
            required
          />
        </div>
        <div className="Sf__group">
          <label htmlFor="register-password" className="Sf__label">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="Sf__number"
            required
          />
        </div>
        <div className="Sf__group">
          <label htmlFor="register-confirm" className="Sf__label">
            Confirm Password
          </label>
          <input
            id="register-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="Sf__number"
            required
          />
        </div>
        <button
          type="submit"
          className="Sf__btn Sf__btn--primary w-full mt-2"
        >
          Register
        </button>
      </form>
      {errorMessage && <div className="Sf__error">{errorMessage}</div>}
    </div>
  );
}

export default Register;
